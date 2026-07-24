import nodemailer from 'nodemailer'
import { getTransporter } from '../config/mailer.js'

export const sendPasswordResetEmail = async (email, resetLink) => {
  const transporter = await getTransporter()

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || '"ERP Textil" <no-reply@erp-textil.local>',
    to: email,
    subject: 'Recuperación de contraseña',
    html: `
      <p>Recibimos una solicitud para restablecer tu contraseña.</p>
      <p>Haz clic en el siguiente enlace para continuar (válido por 60 minutos):</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p>Si tú no solicitaste este cambio, puedes ignorar este correo.</p>
    `,
  })

  const previewUrl = nodemailer.getTestMessageUrl(info)
  if (previewUrl) {
    console.log(`[email] Vista previa del correo (Ethereal): ${previewUrl}`)
  }

  return info
}
