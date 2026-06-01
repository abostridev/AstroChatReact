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

    // ─── WEBRTC SIGNALING 1-A-1 ───────────────────────────────

    // User A initie un appel vers User B
    socket.on('call:initiate', async ({ targetUserId, conversationId, callType }) => {
      try {
        // callType = 'audio' ou 'video'
        const caller = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, pseudo: true, avatar: true }
        })

        // Envoie la notification d'appel entrant a User B
        const targetSocketId = connectedUsers.get(targetUserId)
        if (targetSocketId) {
          io.to(targetSocketId).emit('call:incoming', {
            callerId: userId,
            caller,
            conversationId,
            callType
          })
        } else {
          // User B est hors ligne
          socket.emit('call:unavailable', { targetUserId })
        }
      } catch (error) {
        console.error('Erreur call:initiate:', error)
      }
    })

    // User B accepte l'appel
    socket.on('call:accept', ({ callerId, conversationId }) => {
      const callerSocketId = connectedUsers.get(callerId)
      if (callerSocketId) {
        io.to(callerSocketId).emit('call:accepted', { 
          accepterId: userId,
          conversationId 
        })
      }
    })

    // User B refuse l'appel
    socket.on('call:reject', ({ callerId, conversationId }) => {
      const callerSocketId = connectedUsers.get(callerId)
      if (callerSocketId) {
        io.to(callerSocketId).emit('call:rejected', { 
          rejecterId: userId,
          conversationId 
        })
      }
    })

    // Fin d'appel
    socket.on('call:end', ({ targetUserId, conversationId }) => {
      const targetSocketId = connectedUsers.get(targetUserId)
      if (targetSocketId) {
        io.to(targetSocketId).emit('call:ended', { 
          endedBy: userId,
          conversationId 
        })
      }
    })

    // ─── WEBRTC SIGNALING ECHANGE ──────────────────────────────
    // Ces trois evenements sont le coeur de WebRTC
    // Ils transmettent les informations de connexion entre les deux users

    // Offre SDP — User A envoie sa configuration de connexion
    socket.on('webrtc:offer', ({ targetUserId, offer, conversationId }) => {
      const targetSocketId = connectedUsers.get(targetUserId)
      if (targetSocketId) {
        io.to(targetSocketId).emit('webrtc:offer', {
          offer,
          callerId: userId,
          conversationId
        })
      }
    })

    // Reponse SDP — User B repond avec sa configuration
    socket.on('webrtc:answer', ({ targetUserId, answer, conversationId }) => {
      const targetSocketId = connectedUsers.get(targetUserId)
      if (targetSocketId) {
        io.to(targetSocketId).emit('webrtc:answer', {
          answer,
          answererId: userId,
          conversationId
        })
      }
    })

    // ICE Candidates — echange des adresses reseau pour etablir la connexion
    socket.on('webrtc:ice-candidate', ({ targetUserId, candidate, conversationId }) => {
      const targetSocketId = connectedUsers.get(targetUserId)
      if (targetSocketId) {
        io.to(targetSocketId).emit('webrtc:ice-candidate', {
          candidate,
          fromUserId: userId,
          conversationId
        })
      }
    })

    // ─── WEBRTC SIGNALING GROUPE ───────────────────────────────

    // Initie un appel de groupe
    socket.on('call:group:initiate', async ({ groupId, callType }) => {
      try {
        const caller = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, pseudo: true, avatar: true }
        })

        const group = await prisma.group.findUnique({
          where: { id: groupId },
          include: {
            members: {
              where: { userId: { not: userId } },
              select: { userId: true }
            }
          }
        })

        if (!group) return

        // Notifie chaque membre du groupe
        group.members.forEach(({ userId: memberId }) => {
          const memberSocketId = connectedUsers.get(memberId)
          if (memberSocketId) {
            io.to(memberSocketId).emit('call:group:incoming', {
              groupId,
              callerId: userId,
              caller,
              callType
            })
          }
        })
      } catch (error) {
        console.error('Erreur call:group:initiate:', error)
      }
    })

    // Rejoindre un appel de groupe
    socket.on('call:group:join', ({ groupId }) => {
      socket.join(`call:${groupId}`)
      // Informe les autres membres qu'un nouveau participant a rejoint
      socket.to(`call:${groupId}`).emit('call:group:user:joined', { userId })
    })

    // Quitter un appel de groupe
    socket.on('call:group:leave', ({ groupId }) => {
      socket.leave(`call:${groupId}`)
      socket.to(`call:${groupId}`).emit('call:group:user:left', { userId })
    })

    // Offre SDP pour appel de groupe
    socket.on('webrtc:group:offer', ({ targetUserId, offer, groupId }) => {
      const targetSocketId = connectedUsers.get(targetUserId)
      if (targetSocketId) {
        io.to(targetSocketId).emit('webrtc:group:offer', {
          offer,
          callerId: userId,
          groupId
        })
      }
    })

    // Reponse SDP pour appel de groupe
    socket.on('webrtc:group:answer', ({ targetUserId, answer, groupId }) => {
      const targetSocketId = connectedUsers.get(targetUserId)
      if (targetSocketId) {
        io.to(targetSocketId).emit('webrtc:group:answer', {
          answer,
          answererId: userId,
          groupId
        })
      }
    })

    // ICE candidates pour appel de groupe
    socket.on('webrtc:group:ice-candidate', ({ targetUserId, candidate, groupId }) => {
      const targetSocketId = connectedUsers.get(targetUserId)
      if (targetSocketId) {
        io.to(targetSocketId).emit('webrtc:group:ice-candidate', {
          candidate,
          fromUserId: userId,
          groupId
        })
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