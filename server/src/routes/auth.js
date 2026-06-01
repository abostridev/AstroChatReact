import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '../config/db.js'
import authMiddleware from '../middleware/auth.js'

const router = express.Router()

const generateAccessToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '15m' })
}

const generateRefreshToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' })
}

// INSCRIPTION
router.post('/register', async (req, res) => {
  try {
    const { email, pseudo, password } = req.body

    if (!email || !pseudo || !password) {
      return res.status(400).json({ message: 'Tous les champs sont requis' })
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Le mot de passe doit faire au moins 6 caractères' })
    }

    const existingEmail = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })
    if (existingEmail) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé' })
    }

    const existingPseudo = await prisma.user.findUnique({
      where: { pseudo: pseudo.toLowerCase() }
    })
    if (existingPseudo) {
      return res.status(400).json({ message: 'Ce pseudo est déjà pris' })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        pseudo: pseudo.toLowerCase(),
        password: hashedPassword
      }
    })

    const accessToken = generateAccessToken(user.id)
    const refreshToken = generateRefreshToken(user.id)

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    await prisma.refreshToken.create({
      data: { token: refreshToken, userId: user.id, expiresAt }
    })

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    res.status(201).json({
      message: 'Compte créé avec succès',
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        pseudo: user.pseudo,
        avatar: user.avatar
      }
    })

  } catch (error) {
    console.error('Erreur register:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// CONNEXION
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: 'Email et mot de passe requis' })
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (!user) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' })
    }

    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' })
    }

    const accessToken = generateAccessToken(user.id)
    const refreshToken = generateRefreshToken(user.id)

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    await prisma.refreshToken.create({
      data: { token: refreshToken, userId: user.id, expiresAt }
    })

    await prisma.user.update({
      where: { id: user.id },
      data: { isOnline: true }
    })

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    res.json({
      message: 'Connexion réussie',
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        pseudo: user.pseudo,
        avatar: user.avatar,
        isOnline: true
      }
    })

  } catch (error) {
    console.error('Erreur login:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// REFRESH TOKEN
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken

    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token manquant' })
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken }
    })

    if (!storedToken || storedToken.expiresAt < new Date()) {
      return res.status(401).json({ message: 'Session expirée, reconnectez-vous' })
    }

    const newAccessToken = generateAccessToken(decoded.userId)

    res.json({ accessToken: newAccessToken })

  } catch (error) {
    return res.status(401).json({ message: 'Session expirée, reconnectez-vous' })
  }
})

// DÉCONNEXION
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken

    if (refreshToken) {
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken }
      })
    }

    await prisma.user.update({
      where: { id: req.user.userId },
      data: { isOnline: false, lastSeen: new Date() }
    })

    res.clearCookie('refreshToken')
    res.json({ message: 'Déconnexion réussie' })

  } catch (error) {
    console.error('Erreur logout:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// MON PROFIL
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        pseudo: true,
        avatar: true,
        isOnline: true,
        createdAt: true
      }
    })

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' })
    }

    res.json({ user })

  } catch (error) {
    console.error('Erreur me:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

export default router