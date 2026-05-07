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
