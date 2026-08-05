/**
 * Envío de correo transaccional a través de la API HTTP de Brevo.
 *
 * Variables requeridas:
 *   BREVO_API_KEY  Clave de API de Brevo.
 *   FRONTEND_URL   Origen del cliente Angular, ej. "https://erp-textil-front.vercel.app".
 */

/** Minutos de validez del enlace (debe coincidir con el TTL del token en auth.service). */
const RESET_LINK_TTL_MINUTES = 60

const BREVO_SEND_URL = 'https://api.brevo.com/v3/smtp/email'

const getApiKey = () => {
  const key = process.env.BREVO_API_KEY
  if (!key) throw new Error('Falta la variable de entorno BREVO_API_KEY')
  return key
}

/** Quita la barra final para no generar URLs con doble slash. */
const getFrontendUrl = () => {
  const url = process.env.FRONTEND_URL
  if (!url) throw new Error('Falta la variable de entorno FRONTEND_URL')
  return url.replace(/\/+$/, '')
}

const buildHtml = (resetUrl) => `
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Recuperación de contraseña</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f1f5f9; font-family:Arial, Helvetica, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9; padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background-color:#ffffff; border-radius:16px; border:1px solid #e2e8f0; overflow:hidden;">
            <tr>
              <td style="background-color:#2563eb; padding:24px 32px;">
                <h1 style="margin:0; font-size:20px; font-weight:bold; color:#ffffff; letter-spacing:-0.3px;">PantSys</h1>
                <p style="margin:4px 0 0; font-size:13px; color:#dbeafe;">Sistema de gestión textil</p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h2 style="margin:0 0 16px; font-size:19px; color:#1e293b;">Recuperación de contraseña</h2>
                <p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:#475569;">
                  Recibimos una solicitud para restablecer la contraseña de tu cuenta. Pulsa el botón para crear una nueva contraseña.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
                  <tr>
                    <td align="center" style="border-radius:10px; background-color:#2563eb;">
                      <a href="${resetUrl}" style="display:inline-block; padding:13px 28px; font-size:15px; font-weight:bold; color:#ffffff; text-decoration:none; border-radius:10px;">
                        Restablecer contraseña
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 8px; font-size:13px; line-height:1.6; color:#64748b;">
                  El enlace caduca en ${RESET_LINK_TTL_MINUTES} minutos y solo puede usarse una vez.
                </p>
                <p style="margin:0 0 24px; font-size:13px; line-height:1.6; color:#64748b;">
                  Si el botón no funciona, copia y pega esta dirección en tu navegador:<br />
                  <span style="color:#2563eb; word-break:break-all;">${resetUrl}</span>
                </p>
                <hr style="border:none; border-top:1px solid #e2e8f0; margin:0 0 20px;" />
                <p style="margin:0; font-size:13px; line-height:1.6; color:#94a3b8;">
                  Si tú no solicitaste este cambio puedes ignorar este correo: tu contraseña actual seguirá siendo válida.
                </p>
              </td>
            </tr>
            <tr>
              <td style="background-color:#f8fafc; padding:18px 32px; border-top:1px solid #e2e8f0;">
                <p style="margin:0; font-size:12px; color:#94a3b8;">Este es un correo automático, por favor no respondas a este mensaje.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`

const buildText = (resetUrl) =>
  [
    'PantSys · Recuperación de contraseña',
    '',
    'Recibimos una solicitud para restablecer la contraseña de tu cuenta.',
    `Abre el siguiente enlace para crear una nueva contraseña (caduca en ${RESET_LINK_TTL_MINUTES} minutos):`,
    '',
    resetUrl,
    '',
    'Si tú no solicitaste este cambio puedes ignorar este correo.',
  ].join('\n')

export const sendPasswordResetEmail = async (toEmail, resetToken) => {
  if (!toEmail || !resetToken) {
    throw new Error('sendPasswordResetEmail requiere el correo y el token')
  }

  const resetUrl = `${getFrontendUrl()}/auth/reset-password?token=${encodeURIComponent(resetToken)}`

  const response = await fetch(BREVO_SEND_URL, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': getApiKey(),
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: 'PantSys ERP', email: 'onboarding@brevo.com' },
      to: [{ email: toEmail }],
      subject: 'Recuperación de Contraseña - PantSys',
      htmlContent: buildHtml(resetUrl),
      textContent: buildText(resetUrl),
    }),
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    const failure = new Error(errorBody.message ?? `Brevo respondió con ${response.status}`)
    failure.name = 'BrevoError'
    failure.statusCode = response.status
    throw failure
  }

  const data = await response.json()
  return { id: data.messageId }
}
