/* eslint-disable no-console */
/**
 * Seed catalogue — 10 vendeurs fictifs + 30 listings variés
 * Usage : pnpm db:seed-catalog
 *
 * Pré-requis : pnpm db:seed (pour avoir des users + profiles vérifiés)
 */
import { createClient } from '@supabase/supabase-js'
import { db } from './client'
import { sellerProfiles, listings, sellerReviews, categories, profiles } from './schema'
import { eq, and } from 'drizzle-orm'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('[seed-catalog] NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis')
  process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function createVerifiedUser(
  email: string,
  displayName: string,
  city: string,
  region: string,
): Promise<string> {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: 'Addmarket#2026!',
    email_confirm: true,
    user_metadata: { display_name: displayName },
  })

  if (error) {
    if (error.message.includes('already been registered')) {
      const { data: list } = await supabaseAdmin.auth.admin.listUsers()
      const existing = list.users.find((u) => u.email === email)
      if (existing) return existing.id
    }
    throw new Error(`[seed-catalog] Impossible de créer ${email}: ${error.message}`)
  }
  if (!data.user) throw new Error(`[seed-catalog] Aucun user pour ${email}`)

  const userId = data.user.id

  // Créer/mettre à jour le profil avec statut vérifié
  await db
    .insert(profiles)
    .values({
      id: userId,
      displayName,
      city,
      region,
      membershipStatus: 'verified',
      verifiedAt: new Date(),
      onboardingCompletedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: profiles.id,
      set: {
        membershipStatus: 'verified',
        verifiedAt: new Date(),
        onboardingCompletedAt: new Date(),
      },
    })

  return userId
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

async function main() {
  console.log('[seed-catalog] Début du seed catalogue…')

  // Récupère les IDs de catégories
  const cats = await db.select({ id: categories.id, slug: categories.slug }).from(categories)
  const catBySlug = Object.fromEntries(cats.map((c) => [c.slug, c.id]))

  // -----------------------------------------------------------------------
  // 10 vendeurs fictifs
  // -----------------------------------------------------------------------
  const vendorData = [
    {
      email: 'traiteur.marie@addmarket-seed.fr',
      displayName: 'Marie Kouassi',
      city: 'Paris',
      region: 'Île-de-France',
      businessName: 'Saveurs du Bénin — Traiteur Marie',
      categorySlug: 'restauration-traiteur',
      serviceCities: ['Paris', 'Vincennes', 'Saint-Mandé'],
      description:
        'Traiteur spécialisé dans la cuisine béninoise authentique. Buffets, baptêmes, mariages et repas communautaires. Livraison à domicile sur Paris et banlieue est.',
    },
    {
      email: 'mode.fatou@addmarket-seed.fr',
      displayName: 'Fatou Diallo',
      city: 'Lyon',
      region: 'Auvergne-Rhône-Alpes',
      businessName: 'Boubous & Wax Fatou',
      categorySlug: 'vetements-femme',
      serviceCities: ['Lyon', 'Villeurbanne', 'Vénissieux'],
      description:
        'Créatrice de mode africaine contemporaine. Confection sur mesure de boubous, robes wax, tenues de cérémonie. Tissus importés directement du Sénégal et du Mali.',
    },
    {
      email: 'coiffure.aminata@addmarket-seed.fr',
      displayName: 'Aminata Traoré',
      city: 'Marseille',
      region: "Provence-Alpes-Côte d'Azur",
      businessName: 'Salon Aminata — Coiffure Afro',
      categorySlug: 'coiffure',
      serviceCities: ['Marseille'],
      description:
        "Salon de coiffure afro-caribéen. Tresses, vanilles, tissages, soins capillaires naturels. Sur rendez-vous uniquement. 15 ans d'expérience.",
    },
    {
      email: 'btp.joseph@addmarket-seed.fr',
      displayName: 'Joseph Mensah',
      city: 'Bordeaux',
      region: 'Nouvelle-Aquitaine',
      businessName: 'Mensah Rénovation',
      categorySlug: 'maconnerie',
      serviceCities: ['Bordeaux', 'Mérignac', 'Pessac', 'Talence'],
      description:
        "Artisan maçon avec 20 ans d'expérience. Rénovation intérieure, extension, isolation, carrelage. Devis gratuit. Travail soigné et dans les délais.",
    },
    {
      email: 'naturo.grace@addmarket-seed.fr',
      displayName: 'Grace Attiogbe',
      city: 'Nantes',
      region: 'Pays de la Loire',
      businessName: 'Grâce Naturopathie & Bien-être',
      categorySlug: 'naturopathie',
      serviceCities: ['Nantes', 'Saint-Herblain', 'Rezé'],
      description:
        'Naturopathe certifiée. Consultations en cabinet ou à domicile. Bilan de vitalité, alimentation vivante, gestion du stress. Accompagnement personnalisé.',
    },
    {
      email: 'formation.samuel@addmarket-seed.fr',
      displayName: 'Samuel Adigbli',
      city: 'Strasbourg',
      region: 'Grand Est',
      businessName: 'EduSam — Formations & Langues',
      categorySlug: 'langues',
      serviceCities: ['Strasbourg', 'Schiltigheim', 'Illkirch-Graffenstaden'],
      description:
        "Professeur de langues certifié. Cours d'anglais, espagnol, et éwé. Soutien scolaire toutes matières collège/lycée. Cours en présentiel ou visioconférence.",
    },
    {
      email: 'event.rebecca@addmarket-seed.fr',
      displayName: 'Rebecca Soglo',
      city: 'Toulouse',
      region: 'Occitanie',
      businessName: 'Rebecca Events — Événements ADD',
      categorySlug: 'evenementiel',
      serviceCities: ['Toulouse', 'Blagnac', 'Colomiers'],
      description:
        "Organisation d'événements communautaires et chrétiens. Baptêmes, mariages, conférences, cultes spéciaux. Décoration, traiteur, sonorisation. Tout-en-un.",
    },
    {
      email: 'transport.david@addmarket-seed.fr',
      displayName: 'David Koffi',
      city: 'Lille',
      region: 'Hauts-de-France',
      businessName: 'Koffi Transport — Déménagement & Livraison',
      categorySlug: 'transport-logistique',
      serviceCities: ['Lille', 'Roubaix', 'Tourcoing', "Villeneuve-d'Ascq"],
      description:
        'Déménagement petits volumes, livraison de meubles, transport de marchandises. Véhicule utilitaire disponible 7j/7. Tarifs compétitifs pour la communauté ADD.',
    },
    {
      email: 'compta.esther@addmarket-seed.fr',
      displayName: 'Esther Houessou',
      city: 'Nice',
      region: "Provence-Alpes-Côte d'Azur",
      businessName: 'Esther Expertise Comptable',
      categorySlug: 'professions-liberales',
      serviceCities: ['Nice', 'Antibes', 'Cannes'],
      description:
        "Expert-comptable indépendante. Création d'entreprise, comptabilité, déclarations fiscales, bilan annuel. Tarif préférentiel pour membres ADD. Cabinet ou téléconsultation.",
    },
    {
      email: 'maraicher.paul@addmarket-seed.fr',
      displayName: 'Paul Adjovi',
      city: 'Rennes',
      region: 'Bretagne',
      businessName: 'Jardin Paul — Maraîchage Bio',
      categorySlug: 'maraichage',
      serviceCities: ['Rennes', 'Cesson-Sévigné', 'Saint-Jacques-de-la-Lande'],
      description:
        'Maraîcher bio engagé. Paniers de légumes frais de saison, livraison hebdomadaire. Légumes africains disponibles : gombo, feuilles de manioc, aubergines africaines.',
    },
  ] as const

  // -----------------------------------------------------------------------
  // Création des users + seller_profiles
  // -----------------------------------------------------------------------
  const sellerIds: string[] = []

  for (const vendor of vendorData) {
    console.log(`[seed-catalog] Création vendeur : ${vendor.businessName}`)
    const userId = await createVerifiedUser(
      vendor.email,
      vendor.displayName,
      vendor.city,
      vendor.region,
    )

    // Vérifier si le seller_profile existe déjà
    const existing = await db
      .select({ id: sellerProfiles.id })
      .from(sellerProfiles)
      .where(eq(sellerProfiles.userId, userId))
      .limit(1)

    let sellerId: string

    const existingRow = existing.at(0)
    if (existingRow) {
      sellerId = existingRow.id
    } else {
      const [inserted] = await db
        .insert(sellerProfiles)
        .values({
          userId,
          businessName: vendor.businessName,
          description: vendor.description,
          categoryId: catBySlug[vendor.categorySlug] ?? null,
          serviceCities: [...vendor.serviceCities],
          serviceAreaKm: 30,
          isActive: true,
        })
        .returning({ id: sellerProfiles.id })

      if (!inserted)
        throw new Error(`[seed-catalog] Insertion seller_profile échouée pour ${vendor.email}`)
      sellerId = inserted.id
    }

    sellerIds.push(sellerId)
  }

  // -----------------------------------------------------------------------
  // 30 listings (3 par vendeur)
  // -----------------------------------------------------------------------
  const listingsData = [
    // Vendeur 0 — Traiteur Marie
    {
      sellerIndex: 0,
      title: "Buffet africain complet — jusqu'à 50 personnes",
      description:
        "Buffet traditionnel béninois pour vos événements : attiéké, riz jollof, poulet yassa, légumes sautés, desserts. Service complet inclus. Commande minimum 48h à l'avance.",
      priceCents: 180000,
      tags: ['traiteur', 'buffet', 'africain', 'événement', 'baptême'],
    },
    {
      sellerIndex: 0,
      title: 'Repas dominical livré à domicile (2-4 personnes)',
      description:
        'Commandez votre repas du dimanche ! Plat principal + accompagnement + sauce. Menu change chaque semaine. Livraison Paris 75, 77, 93, 94.',
      priceCents: 3500,
      tags: ['livraison', 'repas', 'domicile', 'africain', 'hebdomadaire'],
    },
    {
      sellerIndex: 0,
      title: 'Cours de cuisine béninoise — atelier 3h',
      description:
        'Apprenez à cuisiner les spécialités du Bénin en 3h. Maximum 6 participants. Ingrédients fournis. Attestation remise. Parfait pour les curieux et passionnés.',
      priceCents: 4500,
      tags: ['cours', 'cuisine', 'atelier', 'béninois', 'formation'],
    },
    // Vendeur 1 — Mode Fatou
    {
      sellerIndex: 1,
      title: 'Boubou de cérémonie sur mesure — femme',
      description:
        'Confection de boubou de cérémonie sur mesure. Tissus wax de qualité supérieure, broderies artisanales. Délai de livraison : 3 semaines. Essayage inclus à Lyon.',
      priceCents: 25000,
      tags: ['boubou', 'cérémonie', 'sur mesure', 'wax', 'femme'],
    },
    {
      sellerIndex: 1,
      title: 'Ensemble bazin riche — homme',
      description:
        'Ensemble complet bazin riche brodé pour cérémonies. Grand boubou + pantalon + calot. Plusieurs coloris disponibles. Tailles S à XXXL.',
      priceCents: 18000,
      tags: ['bazin', 'homme', 'cérémonie', 'africain', 'brodé'],
    },
    {
      sellerIndex: 1,
      title: 'Retouche et réparation vêtements',
      description:
        'Service de retouche rapide : ourlet, ceinture, fermeture éclair, élargissement. Délai 48-72h. Prix selon complexité. Devis gratuit.',
      isQuoteOnly: true,
      tags: ['retouche', 'couture', 'réparation', 'rapide'],
    },
    // Vendeur 2 — Coiffure Aminata
    {
      sellerIndex: 2,
      title: 'Tresses africaines — box braids',
      description:
        'Tresses box braids longues ou courtes. Pose cheveux naturels ou rajouts. Durée : 3-5h selon longueur. Produits de soin inclus. Sur rendez-vous.',
      priceCents: 8000,
      tags: ['tresses', 'box braids', 'coiffure', 'afro', 'rajouts'],
    },
    {
      sellerIndex: 2,
      title: 'Tissage brésilien ou indien',
      description:
        'Pose de tissage sur filets. Cheveux brésiliens ou indiens de qualité disponibles ou apportez les vôtres. Lissage inclus. Résultat naturel garanti.',
      priceCents: 12000,
      tags: ['tissage', 'brésilien', 'indien', 'coiffure', 'lissage'],
    },
    {
      sellerIndex: 2,
      title: 'Soin capillaire deep conditioning',
      description:
        "Soin profond pour cheveux abîmés, secs ou cassants. Bain d'huile, masque protéiné, séchage. Résultats visibles dès la 1ère séance. Conseils personnalisés.",
      priceCents: 3500,
      tags: ['soin', 'capillaire', 'hydratation', 'cheveux naturels'],
    },
    // Vendeur 3 — Mensah Rénovation
    {
      sellerIndex: 3,
      title: 'Rénovation salle de bain complète',
      description:
        'Rénovation complète : démolition, carrelage, plomberie, peinture, installation sanitaires. Matériaux inclus sur devis. Garantie décennale. Devis gratuit sous 48h.',
      isQuoteOnly: true,
      tags: ['rénovation', 'salle de bain', 'carrelage', 'plomberie', 'BTP'],
    },
    {
      sellerIndex: 3,
      title: 'Peinture intérieure — appartement',
      description:
        'Peinture intérieure complète : préparation murs, enduit, 2 couches peinture. Prix au m² selon surface et complexité. Matériaux fournis. Travail propre et rapide.',
      priceCents: 2500,
      tags: ['peinture', 'intérieur', 'appartement', 'décoration'],
    },
    {
      sellerIndex: 3,
      title: 'Carrelage sol et mur — pose',
      description:
        'Pose de carrelage sol et mur. Préparation support incluse. Fourniture des joints et colle. Carreaux non fournis (conseil sur choix possible). Devis selon surface.',
      isQuoteOnly: true,
      tags: ['carrelage', 'pose', 'sol', 'mur', 'rénovation'],
    },
    // Vendeur 4 — Grace Naturopathie
    {
      sellerIndex: 4,
      title: 'Bilan naturopathique complet (1h30)',
      description:
        'Première consultation complète : analyse de vitalité, questionnaire santé, iridologie de base. Plan de soin personnalisé remis à la fin. En cabinet à Nantes ou visio.',
      priceCents: 9000,
      tags: ['naturopathie', 'bilan', 'santé naturelle', 'consultation'],
    },
    {
      sellerIndex: 4,
      title: 'Programme détox 21 jours',
      description:
        'Programme complet de détoxification : guide alimentaire, plantes conseillées, recettes, suivi hebdomadaire. Format numérique + 3 consultations de suivi incluses.',
      priceCents: 19000,
      tags: ['détox', 'programme', 'santé', 'alimentation', 'bien-être'],
    },
    {
      sellerIndex: 4,
      title: 'Atelier gestion du stress — groupe',
      description:
        'Atelier collectif de 2h (max 8 personnes) : techniques respiratoires, méditation chrétienne, EFT. Tarif réduit pour membres ADD. Prochaines dates sur demande.',
      priceCents: 2500,
      tags: ['stress', 'atelier', 'groupe', 'méditation', 'bien-être'],
    },
    // Vendeur 5 — EduSam Formations
    {
      sellerIndex: 5,
      title: "Cours d'anglais — tous niveaux (mensuel)",
      description:
        "Cours d'anglais individuels ou en petit groupe (max 4). Progression garantie ou remboursé. Méthode communicative. Préparation TOEIC/IELTS disponible. Abonnement mensuel.",
      priceCents: 18000,
      tags: ['anglais', 'cours', 'langues', 'formation', 'TOEIC'],
    },
    {
      sellerIndex: 5,
      title: 'Soutien scolaire collège — mathématiques',
      description:
        'Cours particuliers de maths collège (6e à 3e). Suivi de programme scolaire, préparation brevet. 1h ou 2h par séance. À domicile sur Strasbourg ou visio.',
      priceCents: 2500,
      tags: ['mathématiques', 'collège', 'soutien scolaire', 'cours particuliers'],
    },
    {
      sellerIndex: 5,
      title: "Cours d'éwé pour débutants (8 semaines)",
      description:
        "Initiation à la langue éwé (Togo, Bénin, Ghana). 8 séances d'1h en visioconférence. Support de cours fourni. Idéal pour la diaspora souhaitant retrouver ses racines.",
      priceCents: 16000,
      tags: ['éwé', 'langue', 'Afrique', 'débutant', 'en ligne'],
    },
    // Vendeur 6 — Rebecca Events
    {
      sellerIndex: 6,
      title: 'Organisation baptême chrétien complet',
      description:
        'Package baptême tout compris : salle, décoration, traiteur partenaire, sono, photo/vidéo. De 30 à 200 invités. Devis personnalisé selon vos souhaits et budget.',
      isQuoteOnly: true,
      tags: ['baptême', 'organisation', 'chrétien', 'événement', 'complet'],
    },
    {
      sellerIndex: 6,
      title: 'Location matériel sono et éclairage',
      description:
        'Location sono professionnelle : enceintes, micro, table de mixage, lumières LED. Livraison et installation sur Toulouse et agglomération. Technicien disponible si besoin.',
      priceCents: 35000,
      tags: ['location', 'sono', 'éclairage', 'événement', 'matériel'],
    },
    {
      sellerIndex: 6,
      title: 'Animation DJ gospel & louange',
      description:
        'DJ spécialisé musique chrétienne, gospel, louange contemporaine. Playlist personnalisable. Disponible pour cultes, conférences, baptêmes. Prix selon durée et déplacement.',
      priceCents: 45000,
      tags: ['DJ', 'gospel', 'louange', 'animation', 'chrétien'],
    },
    // Vendeur 7 — Koffi Transport
    {
      sellerIndex: 7,
      title: 'Déménagement petits volumes — studio/F2',
      description:
        'Déménagement studio ou F2 sur Lille et agglomération. Camionnette 12m³. Chargement, transport, déchargement. Emballage possible en option. Tarif fixe, pas de surprise.',
      priceCents: 25000,
      tags: ['déménagement', 'transport', 'studio', 'Lille', 'petit volume'],
    },
    {
      sellerIndex: 7,
      title: 'Livraison de meubles et électroménager',
      description:
        'Livraison et montage de meubles IKEA et autres. Récupération en magasin ou point relais. Montage à domicile proposé. Disponible 7j/7 sur Lille métropole.',
      priceCents: 8000,
      tags: ['livraison', 'meubles', 'IKEA', 'montage', 'domicile'],
    },
    {
      sellerIndex: 7,
      title: 'Transport aéroport Lille-Lesquin',
      description:
        "Navette aéroport Lille-Lesquin. Ponctualité garantie. Véhicule propre et climatisé. Suivi des vols en temps réel. Réservation minimum 24h à l'avance.",
      priceCents: 4500,
      tags: ['aéroport', 'navette', 'transport', 'ponctualité', 'Lille'],
    },
    // Vendeur 8 — Esther Comptable
    {
      sellerIndex: 8,
      title: 'Création micro-entreprise — accompagnement complet',
      description:
        'Immatriculation, choix du statut, déclarations URSSAF, TVA, ouverture compte professionnel. Accompagnement de A à Z. Tarif préférentiel membres ADD. 3h de suivi incluses.',
      priceCents: 45000,
      tags: ['micro-entreprise', 'création', 'comptabilité', 'juridique', 'accompagnement'],
    },
    {
      sellerIndex: 8,
      title: 'Déclaration impôts — particuliers',
      description:
        'Remplissage déclaration de revenus : revenus locatifs, revenus étrangers, déductions spéciales. Envoi sécurisé. Délai : 5 jours ouvrés. Corrections incluses si besoin.',
      priceCents: 12000,
      tags: ['impôts', 'déclaration', 'fiscal', 'particulier', 'revenus'],
    },
    {
      sellerIndex: 8,
      title: 'Comptabilité mensuelle TPE/auto-entrepreneur',
      description:
        'Tenue de comptabilité mensuelle : saisie, lettrage, rapprochement bancaire, bilan trimestriel. Accès à un espace client sécurisé. Abonnement mensuel sans engagement.',
      priceCents: 15000,
      tags: ['comptabilité', 'mensuelle', 'auto-entrepreneur', 'TPE', 'abonnement'],
    },
    // Vendeur 9 — Paul Maraîcher
    {
      sellerIndex: 9,
      title: 'Panier légumes frais — formule hebdomadaire',
      description:
        'Panier de légumes frais de saison, cultivés en agriculture biologique. 5-7 variétés selon récolte. Livraison le jeudi sur Rennes et environs. Sans engagement, résiliable à tout moment.',
      priceCents: 2200,
      tags: ['légumes', 'bio', 'panier', 'hebdomadaire', 'local'],
    },
    {
      sellerIndex: 9,
      title: 'Gombo frais — vente directe',
      description:
        'Gombo frais cultivé sans pesticides. Récolte hebdomadaire. Vente au kg. Disponible mai à octobre. Commande par message, retrait à la ferme ou livraison groupée.',
      priceCents: 350,
      tags: ['gombo', 'africain', 'légumes', 'frais', 'sans pesticides'],
    },
    {
      sellerIndex: 9,
      title: 'Feuilles de manioc fraîches',
      description:
        "Feuilles de manioc fraîches, disponibles toute l'année en serre chauffée. Préparées et nettoyées sur demande. Vente par botte. Idéales pour les plats traditionnels.",
      priceCents: 500,
      tags: ['manioc', 'feuilles', 'africain', 'frais', 'traditionnel'],
    },
  ]

  // -----------------------------------------------------------------------
  // Insertion des listings
  // -----------------------------------------------------------------------
  const insertedListingIds: string[] = []

  for (const listing of listingsData) {
    const sellerId = sellerIds[listing.sellerIndex]
    if (!sellerId) continue

    const slug = slugify(listing.title)

    const existingListing = await db
      .select({ id: listings.id })
      .from(listings)
      .where(and(eq(listings.sellerId, sellerId), eq(listings.slug, slug)))
      .limit(1)

    const existingListingRow = existingListing.at(0)
    if (existingListingRow) {
      insertedListingIds.push(existingListingRow.id)
      continue
    }

    const isQuoteOnly = 'isQuoteOnly' in listing && listing.isQuoteOnly === true
    const [inserted] = await db
      .insert(listings)
      .values({
        sellerId,
        title: listing.title,
        slug,
        description: listing.description,
        priceCents: isQuoteOnly ? null : (listing.priceCents ?? null),
        isQuoteOnly,
        status: 'active',
        publishedAt: new Date(),
        tags: listing.tags as string[],
      })
      .returning({ id: listings.id })

    if (inserted) insertedListingIds.push(inserted.id)
  }

  console.log(`[seed-catalog] ${insertedListingIds.length} listings créés`)

  // -----------------------------------------------------------------------
  // Quelques avis (reviews) sur les premiers vendeurs
  // -----------------------------------------------------------------------
  const reviewerIds = sellerIds.slice(5, 8) // vendeurs 5,6,7 comme reviewers
  const reviewedSellerIds = sellerIds.slice(0, 3) // sur vendeurs 0,1,2

  for (let i = 0; i < reviewedSellerIds.length; i++) {
    const reviewerId = reviewerIds[i]
    const sellerId = reviewedSellerIds[i]
    if (!reviewerId || !sellerId) continue

    // Récupère l'ID de profil du reviewer (= userId du seller)
    const reviewerProfile = await db
      .select({ userId: sellerProfiles.userId })
      .from(sellerProfiles)
      .where(eq(sellerProfiles.id, reviewerId))
      .limit(1)

    const reviewerUserId = reviewerProfile.at(0)?.userId
    if (!reviewerUserId) continue

    await db
      .insert(sellerReviews)
      .values({
        sellerId,
        reviewerId: reviewerUserId,
        rating: 4 + (i % 2),
        comment: [
          'Excellent service, très professionnel. Je recommande vivement à toute la communauté ADD !',
          'Produits de grande qualité, livraison rapide. Très satisfaite de ma commande.',
          'Prestation irréprochable. Ponctuel, sérieux, et tarifs honnêtes. À recommander.',
        ][i],
        status: 'published',
      })
      .onConflictDoNothing()
  }

  console.log('[seed-catalog] Seed catalogue terminé avec succès !')
  console.log(`  - ${vendorData.length} vendeurs`)
  console.log(`  - ${insertedListingIds.length} listings`)
  console.log('  - Quelques avis publiés')
  console.log('')
  console.log('Pour visualiser : pnpm drizzle-kit studio')
}

main().catch((err) => {
  console.error('[seed-catalog] Erreur :', err)
  process.exit(1)
})
