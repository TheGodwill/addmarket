import 'server-only'
import { Resend } from 'resend'
import { logger } from './logger'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM = 'ADDMarket <noreply@addmarket.fr>'

interface SendOptions {
  to: string
  subject: string
  html: string
}

async function send(options: SendOptions): Promise<void> {
  if (!resend) {
    logger.warn(
      { to: options.to, subject: options.subject },
      '[email] RESEND_API_KEY absent — email non envoyé',
    )
    return
  }
  const { error } = await resend.emails.send({ from: FROM, ...options })
  if (error) logger.error({ error }, '[email] Échec envoi')
}

function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ADDMarket</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
<tr><td style="background:#1d4ed8;padding:24px 32px">
  <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700">ADDMarket</h1>
  <p style="margin:4px 0 0;color:#bfdbfe;font-size:13px">Communauté des Assemblées de Dieu</p>
</td></tr>
<tr><td style="padding:32px">
  ${content}
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0">
  <p style="color:#6b7280;font-size:12px;margin:0">
    Cet email a été envoyé par ADDMarket. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer ce message.
  </p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`
}

function ctaButton(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:600;font-size:15px;margin:24px 0">${label}</a>`
}

export async function sendConfirmationEmail(to: string, confirmUrl: string): Promise<void> {
  await send({
    to,
    subject: 'Confirmez votre adresse email — ADDMarket',
    html: baseTemplate(`
      <h2 style="color:#111827;font-size:22px;margin:0 0 16px">Bienvenue sur ADDMarket</h2>
      <p style="color:#374151;line-height:1.7">
        Merci de vous être inscrit. Pour activer votre compte et accéder à la marketplace,
        veuillez confirmer votre adresse email en cliquant sur le bouton ci-dessous.
      </p>
      ${ctaButton(confirmUrl, 'Confirmer mon email')}
      <p style="color:#6b7280;font-size:13px">Ce lien est valable 24 heures.</p>
    `),
  })
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  await send({
    to,
    subject: 'Réinitialisation de votre mot de passe — ADDMarket',
    html: baseTemplate(`
      <h2 style="color:#111827;font-size:22px;margin:0 0 16px">Réinitialisation du mot de passe</h2>
      <p style="color:#374151;line-height:1.7">
        Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton
        ci-dessous pour choisir un nouveau mot de passe.
      </p>
      ${ctaButton(resetUrl, 'Réinitialiser mon mot de passe')}
      <p style="color:#6b7280;font-size:13px">Ce lien est valable 1 heure. Si vous n'avez pas fait cette demande, ignorez cet email.</p>
    `),
  })
}

export async function sendNewDeviceEmail(to: string, ip: string, userAgent: string): Promise<void> {
  await send({
    to,
    subject: 'Nouvelle connexion détectée — ADDMarket',
    html: baseTemplate(`
      <h2 style="color:#111827;font-size:22px;margin:0 0 16px">Nouvelle connexion sur votre compte</h2>
      <p style="color:#374151;line-height:1.7">
        Une connexion à votre compte ADDMarket a été détectée depuis un nouvel appareil ou navigateur.
      </p>
      <table style="border:1px solid #e5e7eb;border-radius:6px;width:100%;border-collapse:collapse;margin:16px 0">
        <tr style="background:#f9fafb">
          <td style="padding:10px 16px;color:#6b7280;font-size:13px;font-weight:600">Adresse IP</td>
          <td style="padding:10px 16px;color:#111827;font-size:13px">${ip}</td>
        </tr>
        <tr>
          <td style="padding:10px 16px;color:#6b7280;font-size:13px;font-weight:600">Navigateur</td>
          <td style="padding:10px 16px;color:#111827;font-size:13px">${userAgent.slice(0, 80)}</td>
        </tr>
      </table>
      <p style="color:#374151;line-height:1.7">
        Si cette connexion vient de vous, aucune action n'est nécessaire.<br>
        Dans le cas contraire, changez immédiatement votre mot de passe.
      </p>
    `),
  })
}

export async function sendMfaDisabledEmail(to: string): Promise<void> {
  await send({
    to,
    subject: 'Double authentification désactivée — ADDMarket',
    html: baseTemplate(`
      <h2 style="color:#111827;font-size:22px;margin:0 0 16px">MFA désactivée sur votre compte</h2>
      <p style="color:#374151;line-height:1.7">
        La double authentification (MFA) a été désactivée sur votre compte ADDMarket.
      </p>
      <p style="color:#374151;line-height:1.7">
        Si vous n'êtes pas à l'origine de cette action, connectez-vous immédiatement et réactivez la MFA.
      </p>
    `),
  })
}

export async function sendVerificationSubmittedEmail(
  to: string,
  displayName: string,
): Promise<void> {
  await send({
    to,
    subject: 'Demande de vérification reçue — ADDMarket',
    html: baseTemplate(`
      <h2 style="color:#111827;font-size:22px;margin:0 0 16px">Demande reçue, ${displayName}</h2>
      <p style="color:#374151;line-height:1.7">
        Votre demande de vérification a bien été reçue. Le référent de votre église va l'examiner
        dans les plus brefs délais (généralement sous 72h).
      </p>
      <p style="color:#374151;line-height:1.7">
        Vous recevrez un email dès qu'une décision aura été prise.
      </p>
    `),
  })
}

export async function sendReferentNotificationEmail(
  to: string,
  memberName: string,
  churchName: string,
): Promise<void> {
  await send({
    to,
    subject: `Nouvelle demande de vérification — ${memberName}`,
    html: baseTemplate(`
      <h2 style="color:#111827;font-size:22px;margin:0 0 16px">Nouvelle demande à traiter</h2>
      <p style="color:#374151;line-height:1.7">
        <strong>${memberName}</strong> a soumis une demande de vérification pour l'église
        <strong>${churchName}</strong>.
      </p>
      <p style="color:#374151;line-height:1.7">
        Connectez-vous à ADDMarket pour consulter la demande et prendre une décision.
      </p>
      ${ctaButton(`${process.env.NEXT_PUBLIC_APP_URL ?? ''}/referent/verifications`, 'Voir les demandes')}
    `),
  })
}

export async function sendVerificationApprovedEmail(
  to: string,
  displayName: string,
  expiresAt: Date,
): Promise<void> {
  const expiry = expiresAt.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  await send({
    to,
    subject: 'Vérification approuvée — ADDMarket',
    html: baseTemplate(`
      <h2 style="color:#111827;font-size:22px;margin:0 0 16px">Félicitations, ${displayName} !</h2>
      <p style="color:#374151;line-height:1.7">
        Votre demande de vérification a été <strong style="color:#16a34a">approuvée</strong>.
        Vous êtes maintenant membre vérifié d'ADDMarket.
      </p>
      <p style="color:#374151;line-height:1.7">
        Votre adhésion est valable jusqu'au <strong>${expiry}</strong>.<br>
        Un rappel vous sera envoyé 30 jours avant l'expiration.
      </p>
      ${ctaButton(`${process.env.NEXT_PUBLIC_APP_URL ?? ''}/`, 'Accéder à la marketplace')}
    `),
  })
}

export async function sendVerificationRejectedEmail(
  to: string,
  displayName: string,
  reasonLabel: string,
  reasonFree: string | null,
): Promise<void> {
  await send({
    to,
    subject: 'Demande de vérification refusée — ADDMarket',
    html: baseTemplate(`
      <h2 style="color:#111827;font-size:22px;margin:0 0 16px">Demande refusée</h2>
      <p style="color:#374151;line-height:1.7">
        Bonjour ${displayName}, votre demande de vérification a malheureusement été
        <strong style="color:#dc2626">refusée</strong>.
      </p>
      <table style="border:1px solid #fecaca;border-radius:6px;width:100%;border-collapse:collapse;margin:16px 0;background:#fef2f2">
        <tr>
          <td style="padding:12px 16px;color:#374151;font-size:14px">
            <strong>Motif :</strong> ${reasonLabel}${reasonFree ? `<br><em>${reasonFree}</em>` : ''}
          </td>
        </tr>
      </table>
      <p style="color:#374151;line-height:1.7">
        Vous pouvez soumettre une nouvelle demande après 24 heures en corrigeant les points signalés.
      </p>
    `),
  })
}

export async function sendRenewalReminderEmail(
  to: string,
  displayName: string,
  expiresAt: Date,
  daysLeft: number,
): Promise<void> {
  const expiry = expiresAt.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  await send({
    to,
    subject: `Votre adhésion expire dans ${daysLeft} jours — ADDMarket`,
    html: baseTemplate(`
      <h2 style="color:#111827;font-size:22px;margin:0 0 16px">Renouvellement à prévoir</h2>
      <p style="color:#374151;line-height:1.7">
        Bonjour ${displayName}, votre adhésion ADDMarket expire le <strong>${expiry}</strong>
        (dans <strong>${daysLeft} jours</strong>).
      </p>
      <p style="color:#374151;line-height:1.7">
        Pour maintenir votre accès à la marketplace, soumettez dès maintenant votre demande de renouvellement.
      </p>
      ${ctaButton(`${process.env.NEXT_PUBLIC_APP_URL ?? ''}/onboarding`, 'Renouveler mon adhésion')}
    `),
  })
}

const ROLE_LABELS_FR: Record<string, string> = {
  member: 'Membre',
  referent: 'Référent paroisse',
  admin_local: 'Administrateur local',
  admin_national: 'Administrateur national',
  support: 'Support',
}

export async function sendRoleChangeEmail(
  to: string,
  displayName: string,
  newRole: string,
  action: 'promoted' | 'revoked',
): Promise<void> {
  const roleLabel = ROLE_LABELS_FR[newRole] ?? newRole
  const isPromotion = action === 'promoted'
  await send({
    to,
    subject: isPromotion
      ? `Rôle attribué : ${roleLabel} — ADDMarket`
      : 'Révocation de rôle — ADDMarket',
    html: baseTemplate(`
      <h2 style="color:#111827;font-size:22px;margin:0 0 16px">
        ${isPromotion ? 'Nouveau rôle attribué' : 'Révocation de rôle'}
      </h2>
      <p style="color:#374151;line-height:1.7">Bonjour ${displayName},</p>
      ${
        isPromotion
          ? `<p style="color:#374151;line-height:1.7">
               Le rôle <strong>${roleLabel}</strong> vous a été attribué sur ADDMarket.
               Vous pouvez désormais accéder aux fonctionnalités associées à ce rôle.
             </p>
             ${ctaButton(`${process.env.NEXT_PUBLIC_APP_URL ?? ''}/`, 'Accéder à ADDMarket')}`
          : `<p style="color:#374151;line-height:1.7">
               Votre rôle sur ADDMarket a été révoqué. Vous avez été rétabli en tant que membre standard.
             </p>
             <p style="color:#374151;line-height:1.7">
               Si vous pensez qu'il s'agit d'une erreur, contactez l'administrateur.
             </p>`
      }
    `),
  })
}

export async function sendMfaOtpEmail(to: string, code: string): Promise<void> {
  await send({
    to,
    subject: `${code} — Code de vérification ADDMarket`,
    html: baseTemplate(`
      <h2 style="color:#111827;font-size:22px;margin:0 0 16px">Code de vérification</h2>
      <p style="color:#374151;line-height:1.7">
        Voici votre code de connexion ADDMarket. Il est valable <strong>10 minutes</strong>.
      </p>
      <div style="text-align:center;margin:32px 0">
        <span style="display:inline-block;background:#f3f4f6;border-radius:8px;padding:16px 32px;
                     font-family:monospace;font-size:36px;font-weight:700;letter-spacing:0.3em;
                     color:#111827">${code}</span>
      </div>
      <p style="color:#6b7280;font-size:13px;line-height:1.7">
        Si vous n'avez pas demandé ce code, ignorez cet email.<br>
        Ne partagez jamais ce code avec quelqu'un d'autre.
      </p>
    `),
  })
}
