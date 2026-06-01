import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  log: ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
})

export const connectDB = async () => {
  let retries = 5
  while (retries > 0) {
    try {
      await prisma.$connect()
      console.log('PostgreSQL connecte via Prisma (Neon)')
      return
    } catch (error) {
      retries--
      console.log(`Connexion DB echouee, nouvelle tentative... (${retries} restantes)`)
      await new Promise(resolve => setTimeout(resolve, 3000))
    }
  }
  console.error('Impossible de se connecter a la DB apres 5 tentatives')
  process.exit(1)
}

// Gere la reconnexion automatique si Neon ferme la connexion
prisma.$on('error', async () => {
  console.log('Reconnexion a la DB...')
  await prisma.$connect()
})

export default prisma