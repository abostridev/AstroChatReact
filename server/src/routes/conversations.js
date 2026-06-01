import express from 'express'
import prisma from '../config/db.js'
import authMiddleware from '../middleware/auth.js'

const router = express.Router()

router.use(authMiddleware)

// ─── CREER OU RECUPERER UNE CONVERSATION 1-A-1 ─────────────────
// POST /api/conversations
router.post('/', async (req, res) => {
  try {
    const { targetUserId } = req.body
    const currentUserId = req.user.userId

    if (!targetUserId) {
      return res.status(400).json({ message: 'targetUserId requis' })
    }

    if (targetUserId === currentUserId) {
      return res.status(400).json({ message: 'Vous ne pouvez pas vous ecrire a vous-meme' })
    }

    // Verifie que l'utilisateur cible existe
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, pseudo: true, avatar: true, isOnline: true }
    })

    if (!targetUser) {
      return res.status(404).json({ message: 'Utilisateur non trouve' })
    }

    // Cherche une conversation existante entre les deux users
    // On trie les IDs pour avoir toujours le meme ordre
    const user1Id = currentUserId < targetUserId ? currentUserId : targetUserId
    const user2Id = currentUserId < targetUserId ? targetUserId : currentUserId

    let conversation = await prisma.conversation.findUnique({
      where: { user1Id_user2Id: { user1Id, user2Id } },
      include: {
        user1: { select: { id: true, pseudo: true, avatar: true, isOnline: true } },
        user2: { select: { id: true, pseudo: true, avatar: true, isOnline: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1 // dernier message uniquement pour la preview
        }
      }
    })

    // Si elle n'existe pas on la cree
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: { user1Id, user2Id },
        include: {
          user1: { select: { id: true, pseudo: true, avatar: true, isOnline: true } },
          user2: { select: { id: true, pseudo: true, avatar: true, isOnline: true } },
          messages: true
        }
      })
    }

    res.json({ conversation })

  } catch (error) {
    console.error('Erreur create conversation:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── LISTE DE TOUTES MES CONVERSATIONS ─────────────────────────
// GET /api/conversations
router.get('/', async (req, res) => {
  try {
    const currentUserId = req.user.userId

    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { user1Id: currentUserId },
          { user2Id: currentUserId }
        ]
      },
      include: {
        user1: { select: { id: true, pseudo: true, avatar: true, isOnline: true } },
        user2: { select: { id: true, pseudo: true, avatar: true, isOnline: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { updatedAt: 'desc' }
    })

    // Compte les messages non lus pour chaque conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await prisma.message.count({
          where: {
            conversationId: conv.id,
            isRead: false,
            senderId: { not: currentUserId }
          }
        })
        return { ...conv, unreadCount }
      })
    )

    res.json({ conversations: conversationsWithUnread })

  } catch (error) {
    console.error('Erreur get conversations:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── MESSAGES D'UNE CONVERSATION ───────────────────────────────
// GET /api/conversations/:id/messages
router.get('/:id/messages', async (req, res) => {
  try {
    const { id } = req.params
    const currentUserId = req.user.userId
    const { page = 1, limit = 50 } = req.query

    // Verifie que l'user fait partie de cette conversation
    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        OR: [
          { user1Id: currentUserId },
          { user2Id: currentUserId }
        ]
      }
    })

    if (!conversation) {
      return res.status(403).json({ message: 'Acces refuse' })
    }

    const messages = await prisma.message.findMany({
      where: { conversationId: id },
      include: {
        sender: { select: { id: true, pseudo: true, avatar: true } },
        reactions: true
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: Number(limit)
    })

    // Marque les messages comme lus
    await prisma.message.updateMany({
      where: {
        conversationId: id,
        isRead: false,
        senderId: { not: currentUserId }
      },
      data: { isRead: true }
    })

    // On retourne les messages dans l'ordre chronologique
    res.json({ messages: messages.reverse() })

  } catch (error) {
    console.error('Erreur get messages:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── ENVOYER UN MESSAGE ─────────────────────────────────────────
// POST /api/conversations/:id/messages
router.post('/:id/messages', async (req, res) => {
  try {
    const { id } = req.params
    const currentUserId = req.user.userId
    const { content, type = 'TEXT', fileUrl, fileName } = req.body

    if (!content && !fileUrl) {
      return res.status(400).json({ message: 'Contenu ou fichier requis' })
    }

    // Verifie que l'user fait partie de la conversation
    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        OR: [
          { user1Id: currentUserId },
          { user2Id: currentUserId }
        ]
      }
    })

    if (!conversation) {
      return res.status(403).json({ message: 'Acces refuse' })
    }

    const message = await prisma.message.create({
      data: {
        content,
        type,
        fileUrl,
        fileName,
        senderId: currentUserId,
        conversationId: id
      },
      include: {
        sender: { select: { id: true, pseudo: true, avatar: true } },
        reactions: true
      }
    })

    // Met a jour updatedAt de la conversation
    await prisma.conversation.update({
      where: { id },
      data: { updatedAt: new Date() }
    })

    res.status(201).json({ message })

  } catch (error) {
    console.error('Erreur send message:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

export default router