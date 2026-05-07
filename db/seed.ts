/* eslint-disable no-console */
/**
 * Seed de développement — 3 églises, 1 référent, 1 admin_local, 5 membres
 * Usage : pnpm db:seed
 *
 * ATTENTION : ce script utilise la service_role_key et crée de vrais users Supabase.
 * Ne jamais exécuter en production.
 */
import { createClient } from '@supabase/supabase-js'
import { db } from './client'
import { churches, churchReferents, verificationRequests } from './schema'
import { hashCardNumber } from '../lib/crypto'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('[seed] NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis')
  process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function createUser(email: string, displayName: string): Promise<string> {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: 'Addmarket#2026!',
    email_confirm: true,
    user_metadata: { display_name: displayName },
  })
  if (error) {
    // User peut déjà exister si le seed a été relancé
    if (error.message.includes('already been registered')) {
      const { data: list } = await supabaseAdmin.auth.admin.listUsers()
      const existing = list.users.find((u) => u.email === email)
      if (existing) return existing.id
    }
    throw new Error(`[seed] Impossible de créer ${email}: ${error.message}`)
  }
  if (!data.user) throw new Error(`[seed] Aucun user retourné pour ${email}`)
  return data.user.id
}

async function main() {
  console.log('[seed] Début du seed…')

  // 1. Créer les 3 églises
  console.log('[seed] Création des églises…')
  const [church1, church2, church3] = await db
    .insert(churches)
    .values([
      {
        name: 'Assemblée de Dieu de Paris Centre',
        city: 'Paris',
        region: 'Île-de-France',
        address: '12 rue de la Paix, 75002 Paris',
        pastor: 'Jean Dupont',
        isActive: true,
      },
      {
        name: 'Assemblée de Dieu de Lyon Croix-Rousse',
        city: 'Lyon',
        region: 'Auvergne-Rhône-Alpes',
        address: '8 montée de la Boucle, 69004 Lyon',
        pastor: 'Marie Martin',
        isActive: true,
      },
      {
        name: 'Assemblée de Dieu de Bordeaux Rive Droite',
        city: 'Bordeaux',
        region: 'Nouvelle-Aquitaine',
        address: '45 avenue Thiers, 33100 Bordeaux',
        pastor: 'Pierre Bernard',
        isActive: false,
      },
    ])
    .returning()

  if (!church1 || !church2 || !church3) throw new Error('[seed] Échec insertion églises')
  console.log(`[seed] Églises créées : ${church1.id}, ${church2.id}, ${church3.id}`)

  // 2. Créer les utilisateurs auth
  console.log('[seed] Création des utilisateurs…')
  const referentId = await createUser('referent.paris@addmarket.test', 'Sophie Référente')
  const adminLocalId = await createUser('admin.lyon@addmarket.test', 'Thomas AdminLocal')
  const member1Id = await createUser('member1@addmarket.test', 'Alice Vérifiée')
  const member2Id = await createUser('member2@addmarket.test', 'Bob En Attente')
  const member3Id = await createUser('member3@addmarket.test', 'Claire Expirée')
  const member4Id = await createUser('member4@addmarket.test', 'David Rejeté')
  const member5Id = await createUser('member5@addmarket.test', 'Emma Suspendue')
  console.log('[seed] Utilisateurs créés')

  // 3. Mettre à jour les profils via service role (le trigger a créé les lignes de base)
  console.log('[seed] Mise à jour des profils…')
  const cardHash1 = await hashCardNumber('ADD-PARIS-2024-001')
  const cardHash3 = await hashCardNumber('ADD-PARIS-2024-003')

  // Supabase admin client to update profiles (bypasses RLS)
  await supabaseAdmin.from('profiles').upsert([
    {
      id: referentId,
      display_name: 'Sophie Référente',
      city: 'Paris',
      region: 'Île-de-France',
      church_id: church1.id,
      membership_status: 'verified',
      membership_card_hash: cardHash1,
      verified_at: new Date('2024-01-15').toISOString(),
      verified_by: referentId,
      expires_at: new Date('2026-01-15').toISOString(),
    },
    {
      id: adminLocalId,
      display_name: 'Thomas AdminLocal',
      city: 'Lyon',
      region: 'Auvergne-Rhône-Alpes',
      church_id: church2.id,
      membership_status: 'verified',
      membership_card_hash: await hashCardNumber('ADD-LYON-2024-001'),
      verified_at: new Date('2024-02-01').toISOString(),
      verified_by: adminLocalId,
      expires_at: new Date('2026-02-01').toISOString(),
    },
    {
      id: member1Id,
      display_name: 'Alice Vérifiée',
      city: 'Paris',
      region: 'Île-de-France',
      church_id: church1.id,
      membership_status: 'verified',
      membership_card_hash: await hashCardNumber('ADD-PARIS-2024-002'),
      verified_at: new Date('2024-03-10').toISOString(),
      verified_by: referentId,
      expires_at: new Date('2026-03-10').toISOString(),
    },
    {
      id: member2Id,
      display_name: 'Bob En Attente',
      city: 'Paris',
      region: 'Île-de-France',
      church_id: church1.id,
      membership_status: 'pending',
    },
    {
      id: member3Id,
      display_name: 'Claire Expirée',
      city: 'Lyon',
      region: 'Auvergne-Rhône-Alpes',
      church_id: church2.id,
      membership_status: 'expired',
      membership_card_hash: cardHash3,
      verified_at: new Date('2023-01-01').toISOString(),
      verified_by: adminLocalId,
      expires_at: new Date('2025-01-01').toISOString(),
    },
    {
      id: member4Id,
      display_name: 'David Rejeté',
      city: 'Lyon',
      region: 'Auvergne-Rhône-Alpes',
      church_id: church2.id,
      membership_status: 'rejected',
    },
    {
      id: member5Id,
      display_name: 'Emma Suspendue',
      city: 'Bordeaux',
      region: 'Nouvelle-Aquitaine',
      church_id: church3.id,
      membership_status: 'suspended',
    },
  ])
  console.log('[seed] Profils mis à jour')

  // 4. Assigner les rôles référent / admin_local
  console.log('[seed] Assignation des rôles…')
  await db.insert(churchReferents).values([
    {
      churchId: church1.id,
      userId: referentId,
      role: 'referent',
      grantedBy: referentId,
    },
    {
      churchId: church2.id,
      userId: adminLocalId,
      role: 'admin_local',
      grantedBy: adminLocalId,
    },
  ])
  console.log('[seed] Rôles assignés')

  // 5. Créer des demandes de vérification
  console.log('[seed] Création des demandes de vérification…')
  await db.insert(verificationRequests).values([
    {
      userId: member2Id,
      churchId: church1.id,
      cardPhotoStoragePath: 'card-photos/seed/member2-card.jpg',
      status: 'pending',
    },
    {
      userId: member4Id,
      churchId: church2.id,
      status: 'rejected',
      processedAt: new Date('2024-04-01'),
      processedBy: adminLocalId,
      rejectionReason: 'Photo de carte illisible',
    },
  ])
  console.log('[seed] Demandes de vérification créées')

  console.log('[seed] ✅ Seed terminé avec succès !')
  console.log('[seed] Comptes de test (mot de passe : Addmarket#2026!) :')
  console.log('  referent.paris@addmarket.test — référent Paris')
  console.log('  admin.lyon@addmarket.test    — admin_local Lyon')
  console.log('  member1@addmarket.test       — membre vérifié')
  console.log('  member2@addmarket.test       — membre en attente')
  console.log('  member3@addmarket.test       — membre expiré')
  console.log('  member4@addmarket.test       — membre rejeté')
  console.log('  member5@addmarket.test       — membre suspendu')
}

main().catch((err: unknown) => {
  console.error('[seed] Erreur :', err)
  process.exit(1)
})
