import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: {
      name: 'admin',
      description: 'Administrador del sistema con acceso total',
    },
  })

  const passwordHash = await bcrypt.hash('Admin@123', 10)

  await prisma.user.upsert({
    where: { email: 'admin@sistema.com' },
    update: {},
    create: {
      name: 'Admin',
      lastName: 'Sistema',
      email: 'admin@sistema.com',
      passwordHash,
      roleId: adminRole.id,
    },
  })

  console.log('Seed completado')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
