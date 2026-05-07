// @vitest-environment node
/**
 * Tests d'intégration RLS — nécessite une vraie connexion Supabase.
 * Skippés automatiquement en CI (credentials placeholder).
 *
 * Pour exécuter localement : pnpm test tests/integration/rls.test.ts
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient } from '@supabase/supabase-js'

// Minimal Database type — les types complets seront générés via `supabase gen types` en session 7
interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string
          phone_encrypted: string | null
          membership_status: string
        }
        Insert: {
          id?: string
          display_name?: string
          phone_encrypted?: string | null
          membership_status?: string
        }
        Update: {
          display_name?: string
          phone_encrypted?: string | null
          membership_status?: string
        }
        Relationships: []
      }
      churches: {
        Row: { id: string; name: string; city: string; region: string }
        Insert: {
          name: string
          city: string
          region: string
          address?: string | null
          pastor?: string | null
          is_active?: boolean
        }
        Update: { name?: string; city?: string; region?: string }
        Relationships: []
      }
      verification_requests: {
        Row: { id: string; user_id: string; church_id: string; status: string }
        Insert: { user_id: string; church_id: string; status?: string }
        Update: {
          status?: string
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
        }
        Relationships: []
      }
      audit_log: {
        Row: { id: string; actor_id: string | null; action: string }
        Insert: { action: string; actor_id?: string | null }
        Update: Record<string, never>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

const isPlaceholder =
  !supabaseUrl ||
  !serviceRoleKey ||
  !anonKey ||
  serviceRoleKey.includes('placeholder') ||
  anonKey.includes('placeholder') ||
  supabaseUrl.includes('placeholder')

// Créer un client avec des valeurs fallback pour éviter que createClient() jette
// en dehors du describe.skipIf (qui ne stoppe pas l'exécution du module entier)
const adminClient = createClient<Database>(
  isPlaceholder ? 'https://placeholder.supabase.co' : supabaseUrl,
  isPlaceholder ? 'placeholder-key' : serviceRoleKey,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

let user1Id = ''
let user2Id = ''
let testChurchId = ''

async function signInAs(email: string): Promise<ReturnType<typeof createClient<Database>>> {
  const client = createClient<Database>(supabaseUrl, anonKey)
  await client.auth.signInWithPassword({ email, password: 'RlsTest#2026!' })
  return client
}

describe.skipIf(isPlaceholder)('RLS — isolation entre membres', () => {
  beforeAll(async () => {
    const { data: church } = await adminClient
      .from('churches')
      .insert({ name: 'Église Test RLS', city: 'Paris', region: 'Île-de-France' })
      .select('id')
      .single()
    testChurchId = (church as { id: string } | null)?.id ?? ''

    const { data: u1 } = await adminClient.auth.admin.createUser({
      email: 'rls-test-user1@addmarket.test',
      password: 'RlsTest#2026!',
      email_confirm: true,
      user_metadata: { display_name: 'RLS User 1' },
    })
    user1Id = u1.user?.id ?? ''

    const { data: u2 } = await adminClient.auth.admin.createUser({
      email: 'rls-test-user2@addmarket.test',
      password: 'RlsTest#2026!',
      email_confirm: true,
      user_metadata: { display_name: 'RLS User 2' },
    })
    user2Id = u2.user?.id ?? ''

    await adminClient
      .from('profiles')
      .update({ phone_encrypted: 'ENCRYPTED_PHONE_DATA' })
      .eq('id', user1Id)
  })

  afterAll(async () => {
    if (user1Id) await adminClient.auth.admin.deleteUser(user1Id)
    if (user2Id) await adminClient.auth.admin.deleteUser(user2Id)
    if (testChurchId) await adminClient.from('churches').delete().eq('id', testChurchId)
  })

  it('un membre peut lire son propre profil', async () => {
    const client = await signInAs('rls-test-user1@addmarket.test')
    const { data, error } = await client.from('profiles').select('*').eq('id', user1Id).single()
    expect(error).toBeNull()
    expect(data?.id).toBe(user1Id)
  })

  it("un membre peut voir le profil public d'un autre", async () => {
    const client = await signInAs('rls-test-user2@addmarket.test')
    const { data, error } = await client
      .from('profiles')
      .select('id, display_name, membership_status')
      .eq('id', user1Id)
      .single()
    expect(error).toBeNull()
    expect(data?.id).toBe(user1Id)
  })

  it("un membre ne peut pas modifier le profil d'un autre", async () => {
    const client = await signInAs('rls-test-user2@addmarket.test')
    await client.from('profiles').update({ display_name: 'Hacked' }).eq('id', user1Id)
    // Vérifier via admin que la valeur n'a pas changé
    const { data } = await adminClient
      .from('profiles')
      .select('display_name')
      .eq('id', user1Id)
      .single()
    expect((data as { display_name: string } | null)?.display_name).not.toBe('Hacked')
  })

  it("un membre ne peut pas soumettre une demande au nom d'un autre", async () => {
    const client = await signInAs('rls-test-user2@addmarket.test')
    const { error } = await client.from('verification_requests').insert({
      user_id: user1Id,
      church_id: testChurchId,
    })
    expect(error).not.toBeNull()
  })

  it('un membre peut soumettre sa propre demande de vérification', async () => {
    const client = await signInAs('rls-test-user2@addmarket.test')
    const { error } = await client.from('verification_requests').insert({
      user_id: user2Id,
      church_id: testChurchId,
    })
    expect(error).toBeNull()
    await adminClient.from('verification_requests').delete().eq('user_id', user2Id)
  })

  it('un membre ne peut pas insérer dans audit_log', async () => {
    const client = await signInAs('rls-test-user1@addmarket.test')
    const { error } = await client
      .from('audit_log')
      .insert({ action: 'fake.action', actor_id: user1Id })
    expect(error).not.toBeNull()
  })

  it('un membre ne peut pas lire audit_log', async () => {
    await adminClient.from('audit_log').insert({ action: 'test.rls', actor_id: user1Id })
    const client = await signInAs('rls-test-user1@addmarket.test')
    const { data } = await client.from('audit_log').select('*')
    expect(data).toHaveLength(0)
    await adminClient.from('audit_log').delete().eq('action', 'test.rls')
  })

  it('un utilisateur non authentifié ne peut rien lire', async () => {
    const anonClient = createClient<Database>(supabaseUrl, anonKey)
    const { data: profileData } = await anonClient.from('profiles').select('*')
    expect(profileData).toHaveLength(0)
    const { data: churchData } = await anonClient.from('churches').select('*')
    expect(churchData).toHaveLength(0)
  })
})
