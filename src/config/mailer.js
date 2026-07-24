import nodemailer from 'nodemailer'
import dns from 'dns'

let transporterPromise = null

// nodemailer resuelve IPv4 e IPv6 en paralelo y elige una dirección al azar
// entre ambas (ignora la opción `family`). En redes donde el IPv6 no es
// enrutable de verdad, eso hace que la conexión falle de forma intermitente
// con ENETUNREACH. Para evitarlo, resolvemos nosotros mismos una IP IPv4 y
// la usamos como host, preservando el hostname original para el SNI/TLS.
const resolveIPv4 = async (hostname) => {
  try {
    const [address] = await dns.promises.resolve4(hostname)
    return address
  } catch {
    return null
  }
}

const buildTransporter = async () => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    const host = process.env.SMTP_HOST
    const ipv4Host = await resolveIPv4(host)

    return nodemailer.createTransport({
      host: ipv4Host || host,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      tls: { servername: host },
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  }

  // Sin credenciales SMTP en .env: usar una cuenta de prueba de Ethereal
  // para que el envío funcione localmente sin configuración adicional.
  const testAccount = await nodemailer.createTestAccount()
  console.log(`[mailer] Usando cuenta de prueba Ethereal: ${testAccount.user}`)

  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  })
}

export const getTransporter = () => {
  if (!transporterPromise) {
    transporterPromise = buildTransporter()
  }
  return transporterPromise
}
