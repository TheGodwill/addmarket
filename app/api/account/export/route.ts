import { type NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db/client'
import { profiles, verificationRequests, consents, accountDeletionRequests } from '@/db/schema'

export async function GET(_request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const [profileRows, verificationRows, consentRows, deletionRows] = await Promise.all([
    db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1),
    db.select().from(verificationRequests).where(eq(verificationRequests.userId, user.id)),
    db.select().from(consents).where(eq(consents.userId, user.id)),
    db.select().from(accountDeletionRequests).where(eq(accountDeletionRequests.userId, user.id)),
  ])

  const profile = profileRows.at(0)
  const profileForExport = profile
    ? {
        ...profile,
        // Encrypted fields — raw value not exported (contact DPO for access)
        phoneEncrypted: profile.phoneEncrypted ? '[CHIFFRÉ — contactez dpo@addmarket.fr]' : null,
        membershipCardHash: profile.membershipCardHash ? '[HACHÉ — non exportable]' : null,
      }
    : null

  const exportData = {
    exported_at: new Date().toISOString(),
    rgpd_notice:
      'Export généré conformément au RGPD art. 20 (droit à la portabilité). ' +
      'Pour toute question : dpo@addmarket.fr',
    account: {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
    },
    profile: profileForExport,
    verification_requests: verificationRows.map((r) => ({
      ...r,
      // Photo storage paths — files already deleted per RGPD after processing
      cardPhotoStoragePath: r.cardPhotoStoragePath ? '[SUPPRIMÉ APRÈS TRAITEMENT]' : null,
      cardPhotoBackStoragePath: r.cardPhotoBackStoragePath ? '[SUPPRIMÉ APRÈS TRAITEMENT]' : null,
      cardNumberHash: r.cardNumberHash ? '[HACHÉ — non exportable]' : null,
    })),
    consents: consentRows,
    deletion_requests: deletionRows.map((d) => ({
      ...d,
      cancelToken: '[MASQUÉ]',
    })),
  }

  const filename = `addmarket-export-${new Date().toISOString().split('T')[0]}.json`

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
