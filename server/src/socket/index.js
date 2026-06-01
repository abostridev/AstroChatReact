import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import prisma from '../config/db.js'

// Stocke les users connectes en memoire
// { userId: socketId }
const connectedUsers = new Map()

export const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      credentials: true
    }
  })

  // ─── MIDDLEWARE AUTH SOCKET ───────────────────────────────────
  // Verifie le token JWT avant chaque connexion socket
  io.use((socket, next) => {
    const token = socket.handshake.auth.token

    if (!token) {
      return next(new Error('Token manquant'))
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      socket.userId = decoded.userId
      next()
    } catch (error) {
      next(new Error('Token invalide'))
    }
  })

  // ─── CONNEXION ────────────────────────────────────────────────
  io.on('connection', async (socket) => {
    const userId = socket.userId
    console.log(`User connecte : ${userId}`)

    // Enregistre la connexion
    connectedUsers.set(userId, socket.id)

    // Met a jour le statut en ligne en DB
    await prisma.user.update({
      where: { id: userId },
      data: { isOnline: true }
    })

    // Informe tous les autres users que cet user est en ligne
    socket.broadcast.emit('user:online', { userId })

    // ─── REJOINDRE LES ROOMS ──────────────────────────────────
    // Chaque conversation et groupe est une "room" Socket.io
    // Une room = un canal prive ou seuls les membres recoivent les messages

    socket.on('join:conversation', (conversationId) => {
      socket.join(`conversation:${conversationId}`)
    })

    socket.on('join:group', (groupId) => {
      socket.join(`group:${groupId}`)
    })

    // ─── ENVOI DE MESSAGE 1-A-1 ───────────────────────────────
    socket.on('message:send', async (data) => {
      try {
        const { conversationId, content, type, fileUrl, fileName } = data

        // Verifie que l'user fait partie de la conversation
        const conversation = await prisma.conversation.findFirst({
          where: {
            id: conversationId,
            OR: [
              { user1Id: userId },
              { user2Id: userId }
            ]
          }
        })

        if (!conversation) return

        // Sauvegarde le message en DB
        const message = await prisma.message.create({
          data: {
            content,
            type: type || 'TEXT',
            fileUrl,
            fileName,
            senderId: userId,
            conversationId
          },
          include: {
            sender: { select: { id: true, pseudo: true, avatar: true } },
            reactions: true
          }
        })

        // Met a jour updatedAt de la conversation
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() }
        })

        // Envoie le message a tous les membres de la room
        io.to(`conversation:${conversationId}`).emit('message:received', message)

      } catch (error) {
        console.error('Erreur message:send:', error)
        socket.emit('error', { message: 'Erreur envoi message' })
      }
    })

    // ─── ENVOI DE MESSAGE DE GROUPE ───────────────────────────
    socket.on('group:message:send', async (data) => {
      try {
        const { groupId, content, type, fileUrl, fileName } = data

        // Verifie que l'user est membre du groupe
        const member = await prisma.groupMember.findUnique({
          where: { userId_groupId: { userId, groupId } }
        })

        if (!member) return

        const message = await prisma.message.create({
          data: {
            content,
            type: type || 'TEXT',
            fileUrl,
            fileName,
            senderId: userId,
            groupId
          },
          include: {
            sender: { select: { id: true, pseudo: true, avatar: true } },
            reactions: true
          }
        })

        await prisma.group.update({
          where: { id: groupId },
          data: { updatedAt: new Date() }
        })

        // Envoie a tous les membres du groupe
        io.to(`group:${groupId}`).emit('group:message:received', message)

      } catch (error) {
        console.error('Erreur group:message:send:', error)
        socket.emit('error', { message: 'Erreur envoi message groupe' })
      }
    })

    // ─── INDICATEUR EN TRAIN D'ECRIRE ─────────────────────────
    socket.on('typing:start', ({ conversationId, groupId }) => {
      if (conversationId) {
        socket.to(`conversation:${conversationId}`).emit('typing:start', { userId })
      }
      if (groupId) {
        socket.to(`group:${groupId}`).emit('typing:start', { userId })
      }
    })

    socket.on('typing:stop', ({ conversationId, groupId }) => {
      if (conversationId) {
        socket.to(`conversation:${conversationId}`).emit('typing:stop', { userId })
      }
      if (groupId) {
        socket.to(`group:${groupId}`).emit('typing:stop', { userId })
      }
    })

    // ─── REACTIONS ────────────────────────────────────────────
    socket.on('reaction:add', async ({ messageId, emoji, conversationId, groupId }) => {
      try {
        // Verifie si la reaction existe deja
        const existing = await prisma.reaction.findUnique({
          where: { userId_messageId_emoji: { userId, messageId, emoji } }
        })

        if (existing) {
          // Si elle existe on la supprime (toggle)
          await prisma.reaction.delete({
            where: { userId_messageId_emoji: { userId, messageId, emoji } }
          })
        } else {
          await prisma.reaction.create({
            data: { userId, messageId, emoji }
          })
        }

        // Recupere toutes les reactions du message
        const reactions = await prisma.reaction.findMany({
          where: { messageId }
        })

        // Notifie la room
        const room = conversationId
          ? `conversation:${conversationId}`
          : `group:${groupId}`

        io.to(room).emit('reaction:updated', { messageId, reactions })

      } catch (error) {
        console.error('Erreur reaction:add:', error)
      }
    })

    // ─── DECONNEXION ──────────────────────────────────────────
    socket.on('disconnect', async () => {
      console.log(`User deconnecte : ${userId}`)

      connectedUsers.delete(userId)

      await prisma.user.update({
        where: { id: userId },
        data: { isOnline: false, lastSeen: new Date() }
      })

      socket.broadcast.emit('user:offline', { userId, lastSeen: new Date() })
    })
  })

  return io
}

// Utilitaire pour savoir si un user est connecte
export const isUserOnline = (userId) => connectedUsers.has(userId)

// Utilitaire pour envoyer un evenement a un user specifique
export const emitToUser = (io, userId, event, data) => {
  const socketId = connectedUsers.get(userId)
  if (socketId) {
    io.to(socketId).emit(event, data)
  }
}