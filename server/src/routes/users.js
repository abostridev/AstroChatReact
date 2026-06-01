import express from 'express'
import prisma from '../config/db.js'
import authMiddleware from '../middleware/auth.js'
import { uploadAvatar, uploadToCloudinary } from '../config/cloudinary.js'

const router = express.Router()

// Toutes les routes users necessitent d'etre connecte
router.use(authMiddleware)

// ─── RECHERCHE PAR PSEUDO ───────────────────────────────────────
// GET /api/users/search?pseudo=astro
router.get('/search', async (req, res) => {
  try {
    const { pseudo } = req.query

    if (!pseudo || pseudo.trim().length < 2) {
      return res.status(400).json({ message: 'Minimum 2 caracteres pour la recherche' })
    }

    const users = await prisma.user.findMany({
      where: {
        pseudo: {
          contains: pseudo.toLowerCase(),
          mode: 'insensitive' // recherche sans tenir compte des majuscules
        },
        // On exclut l'utilisateur connecte des resultats
        NOT: { id: req.user.userId }
      },
      select: {
        id: true,
        pseudo: true,
        avatar: true,
        isOnline: true,
        lastSeen: true
      },
      take: 20 // maximum 20 resultats
    })

    res.json({ users })

  } catch (error) {
    console.error('Erreur search:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── PROFIL D'UN UTILISATEUR ────────────────────────────────────
// GET /api/users/:pseudo
router.get('/:pseudo', async (req, res) => {
  try {
    const { pseudo } = req.params

    const user = await prisma.user.findUnique({
      where: { pseudo: pseudo.toLowerCase() },
      select: {
        id: true,
        pseudo: true,
        avatar: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true
      }
    })

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouve' })
    }

    res.json({ user })

  } catch (error) {
    console.error('Erreur get user:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── MODIFIER SON PROFIL ────────────────────────────────────────
// PUT /api/users/profile/update
router.put('/profile/update', async (req, res) => {
  try {
    const { pseudo } = req.body

    // Verifie que le nouveau pseudo n'est pas deja pris
    if (pseudo) {
      const existing = await prisma.user.findUnique({
        where: { pseudo: pseudo.toLowerCase() }
      })

      if (existing && existing.id !== req.user.userId) {
        return res.status(400).json({ message: 'Ce pseudo est deja pris' })
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.userId },
      data: {
        ...(pseudo && { pseudo: pseudo.toLowerCase() })
      },
      select: {
        id: true,
        email: true,
        pseudo: true,
        avatar: true,
        isOnline: true
      }
    })

    res.json({
      message: 'Profil mis a jour',
      user: updatedUser
    })

  } catch (error) {
    console.error('Erreur update profile:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── UPLOAD PHOTO DE PROFIL ─────────────────────────────────────
// POST /api/users/avatar
router.post('/avatar', uploadAvatar.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier envoye' })
    }

    // Upload vers Cloudinary depuis le buffer memoire
    const result = await uploadToCloudinary(req.file.buffer, {
      folder: 'astrochat/avatars',
      transformation: [{ width: 200, height: 200, crop: 'fill' }]
    })

    const updatedUser = await prisma.user.update({
      where: { id: req.user.userId },
      data: { avatar: result.secure_url },
      select: {
        id: true,
        email: true,
        pseudo: true,
        avatar: true
      }
    })

    res.json({
      message: 'Photo de profil mise a jour',
      user: updatedUser
    })

  } catch (error) {
    console.error('Erreur upload avatar:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

export default router