import express from 'express'
import prisma from '../config/db.js'
import authMiddleware from '../middleware/auth.js'

const router = express.Router()

router.use(authMiddleware)

// ─── CREER UN GROUPE ────────────────────────────────────────────
// POST /api/groups
router.post('/', async (req, res) => {
  try {
    const { name, memberIds } = req.body
    const currentUserId = req.user.userId

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ message: 'Nom du groupe requis (min 2 caracteres)' })
    }

    if (!memberIds || memberIds.length < 1) {
      return res.status(400).json({ message: 'Au moins un membre requis' })
    }

    // Cree le groupe avec le createur comme ADMIN
    const group = await prisma.group.create({
      data: {
        name: name.trim(),
        createdById: currentUserId,
        members: {
          create: [
            { userId: currentUserId, role: 'ADMIN' },
            ...memberIds.map(id => ({ userId: id, role: 'MEMBER' }))
          ]
        }
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, pseudo: true, avatar: true, isOnline: true } }
          }
        }
      }
    })

    res.status(201).json({ group })

  } catch (error) {
    console.error('Erreur create group:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── MES GROUPES ────────────────────────────────────────────────
// GET /api/groups
router.get('/', async (req, res) => {
  try {
    const currentUserId = req.user.userId

    const groups = await prisma.group.findMany({
      where: {
        members: { some: { userId: currentUserId } }
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, pseudo: true, avatar: true, isOnline: true } }
          }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: { select: { id: true, pseudo: true } }
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    })

    // Compte les messages non lus
    const groupsWithUnread = await Promise.all(
      groups.map(async (group) => {
        const unreadCount = await prisma.message.count({
          where: {
            groupId: group.id,
            isRead: false,
            senderId: { not: currentUserId }
          }
        })
        return { ...group, unreadCount }
      })
    )

    res.json({ groups: groupsWithUnread })

  } catch (error) {
    console.error('Erreur get groups:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── MESSAGES D'UN GROUPE ───────────────────────────────────────
// GET /api/groups/:id/messages
router.get('/:id/messages', async (req, res) => {
  try {
    const { id } = req.params
    const currentUserId = req.user.userId
    const { page = 1, limit = 50 } = req.query

    // Verifie que l'user est membre du groupe
    const member = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: currentUserId, groupId: id } }
    })

    if (!member) {
      return res.status(403).json({ message: 'Acces refuse' })
    }

    const messages = await prisma.message.findMany({
      where: { groupId: id },
      include: {
        sender: { select: { id: true, pseudo: true, avatar: true } },
        reactions: true
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: Number(limit)
    })

    await prisma.message.updateMany({
      where: {
        groupId: id,
        isRead: false,
        senderId: { not: currentUserId }
      },
      data: { isRead: true }
    })

    res.json({ messages: messages.reverse() })

  } catch (error) {
    console.error('Erreur get group messages:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── ENVOYER UN MESSAGE DANS UN GROUPE ─────────────────────────
// POST /api/groups/:id/messages
router.post('/:id/messages', async (req, res) => {
  try {
    const { id } = req.params
    const currentUserId = req.user.userId
    const { content, type = 'TEXT', fileUrl, fileName } = req.body

    if (!content && !fileUrl) {
      return res.status(400).json({ message: 'Contenu ou fichier requis' })
    }

    const member = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: currentUserId, groupId: id } }
    })

    if (!member) {
      return res.status(403).json({ message: 'Acces refuse' })
    }

    const message = await prisma.message.create({
      data: {
        content,
        type,
        fileUrl,
        fileName,
        senderId: currentUserId,
        groupId: id
      },
      include: {
        sender: { select: { id: true, pseudo: true, avatar: true } },
        reactions: true
      }
    })

    await prisma.group.update({
      where: { id },
      data: { updatedAt: new Date() }
    })

    res.status(201).json({ message })

  } catch (error) {
    console.error('Erreur send group message:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── AJOUTER UN MEMBRE ──────────────────────────────────────────
// POST /api/groups/:id/members
router.post('/:id/members', async (req, res) => {
  try {
    const { id } = req.params
    const { userId } = req.body
    const currentUserId = req.user.userId

    // Seul un admin peut ajouter des membres
    const currentMember = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: currentUserId, groupId: id } }
    })

    if (!currentMember || currentMember.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Seul un admin peut ajouter des membres' })
    }

    const newMember = await prisma.groupMember.create({
      data: { userId, groupId: id },
      include: {
        user: { select: { id: true, pseudo: true, avatar: true } }
      }
    })

    res.status(201).json({ member: newMember })

  } catch (error) {
    console.error('Erreur add member:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

export default router