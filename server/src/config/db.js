import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const connectDB = async () => {
  try {
    await prisma.$connect()
    console.log('PostgreSQL connecté via Prisma (Neon)')
  } catch (error) {
    console.error(' Erreur de connexion DB :', error.message)
    process.exit(1)
  }
}

export default prisma