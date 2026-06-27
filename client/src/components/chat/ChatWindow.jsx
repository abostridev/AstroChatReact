import React, { useEffect, useRef, useState } from 'react'
import Avatar from '../ui/Avatar'
import MessageBubble from './MessageBubble'
import MessageInput from './MessageInput'
import Spinner from '../ui/Spinner'
import { getMessages } from '../../api/conversations'
import { getGroupMessages } from '../../api/groups'
import useChatStore from '../../store/chatStore'
import useAuthStore from '../../store/authStore'
import { Phone, Video, ArrowLeft } from 'lucide-react'
import { showMessageNotification } from '../../utils/notifications'

const ChatWindow = ({ socket, onStartCall, onBack, isMobile,replaceOptimisticMessage }) => {
  const { user } = useAuthStore()
  const {
    activeConversation,
    activeGroup,
    messages,
    messagesCache,
    setMessages,
    addMessage,
    isLoadingMessages,
    setLoadingMessages,
    updateMessageReactions,
    markMessagesAsRead,
    updateConversationLastMessage,
    updateGroupLastMessage
  } = useChatStore()

  const messagesEndRef = useRef(null)
  const [typingUsers, setTypingUsers] = useState([])
  const typingTimeoutRef = useRef(null)

  const isGroup = !!activeGroup
  const active = activeGroup || activeConversation

  const otherUser = !isGroup && activeConversation
    ? (activeConversation.user1Id === user.id
      ? activeConversation.user2
      : activeConversation.user1)
    : null

  // Scroll vers le bas quand nouveaux messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Charge les messages quand on change de conversation
  useEffect(() => {
    if (!active) return

    const cache = messagesCache || {}
    const hasCached = cache[active.id] && cache[active.id].length > 0

    // Rejoint la room Socket.io
    if (socket) {
      if (isGroup) {
        socket.emit('join:group', active.id)
      } else {
        socket.emit('join:conversation', active.id)
      }
    }

    // Si on a deja les messages en cache on ne recharge pas
    if (hasCached) {
      if (socket) {
        socket.emit('messages:read', {
          conversationId: isGroup ? undefined : active.id,
          groupId: isGroup ? active.id : undefined
        })
      }
      return
    }

    const loadMessages = async () => {
      setLoadingMessages(true)
      try {
        const data = isGroup
          ? await getGroupMessages(active.id)
          : await getMessages(active.id)
        setMessages(data.messages)

        if (socket) {
          socket.emit('messages:read', {
            conversationId: isGroup ? undefined : active.id,
            groupId: isGroup ? active.id : undefined
          })
        }
      } catch (error) {
        console.error('Erreur chargement messages:', error)
      } finally {
        setLoadingMessages(false)
      }
    }

    loadMessages()
  }, [active?.id])

  // Ecoute les evenements Socket.io
  useEffect(() => {
  if (!socket || !active) return

  const handleNewMessage = (message) => {
  console.log('message recu:', message.senderId, 'user:', user.id, 'egal:', message.senderId === user.id)
  if (message.senderId === user.id) {
    console.log('remplacement optimiste...')
    replaceOptimisticMessage(message)
  } else {
    addMessage(message)
    showMessageNotification(message.sender?.pseudo, message)
  }
}
  const handleMessagesRead = ({ conversationId, groupId, readBy }) => {
    if (readBy !== user.id) {
      // L'autre a lu nos messages — met a jour les ticks en temps reel
      markMessagesAsRead(conversationId, groupId)
    }
  }

  const handleTypingStart = ({ userId }) => {
    if (userId !== user.id) {
      setTypingUsers(prev => [...new Set([...prev, userId])])
    }
  }

  const handleTypingStop = ({ userId }) => {
    setTypingUsers(prev => prev.filter(id => id !== userId))
  }

  const handleReactionUpdated = ({ messageId, reactions }) => {
    updateMessageReactions(messageId, reactions)
  }

  if (isGroup) {
    socket.on('group:message:received', handleNewMessage)
  } else {
    socket.on('message:received', handleNewMessage)
  }

  socket.on('messages:read', handleMessagesRead)
  socket.on('typing:start', handleTypingStart)
  socket.on('typing:stop', handleTypingStop)
  socket.on('reaction:updated', handleReactionUpdated)

  return () => {
    socket.off('message:received', handleNewMessage)
    socket.off('group:message:received', handleNewMessage)
    socket.off('messages:read', handleMessagesRead)
    socket.off('typing:start', handleTypingStart)
    socket.off('typing:stop', handleTypingStop)
    socket.off('reaction:updated', handleReactionUpdated)
  }
}, [socket, active?.id])


  const handleSend = (messageData) => {
    if (!socket || !active) return

    // Message optimiste — affiche immediatement avec statut pending
    const tempId = `temp_${Date.now()}`
    const optimisticMessage = {
      id: tempId,
      ...messageData,
      senderId: user.id,
      sender: user,
      createdAt: new Date().toISOString(),
      isRead: false,
      pending: true,
      reactions: [],
      conversationId: isGroup ? undefined : active.id,
      groupId: isGroup ? active.id : undefined
    }

    // Ajoute immediatement dans la liste
    addMessage(optimisticMessage)

    if (isGroup) {
      socket.emit('group:message:send', {
        groupId: active.id,
        ...messageData
      })
    } else {
      socket.emit('message:send', {
        conversationId: active.id,
        ...messageData
      })
    }
  }

  const handleTyping = () => {
    if (!socket || !active) return

    socket.emit('typing:start', {
      conversationId: isGroup ? undefined : active.id,
      groupId: isGroup ? active.id : undefined
    })

    clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing:stop', {
        conversationId: isGroup ? undefined : active.id,
        groupId: isGroup ? active.id : undefined
      })
    }, 2000)
  }

  const handleReact = (messageId, emoji) => {
    if (!socket || !active) return
    socket.emit('reaction:add', {
      messageId,
      emoji,
      conversationId: isGroup ? undefined : active.id,
      groupId: isGroup ? active.id : undefined
    })
  }

  if (!active) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg0)',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{
          width: '70px',
          height: '70px',
          borderRadius: '20px',
          background: 'var(--bg2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '28px',
          fontWeight: 500,
          color: 'var(--text3)'
        }}>
          AC
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--text2)', fontSize: '15px', fontWeight: 500 }}>
            AstroChat
          </p>
          <p style={{ color: 'var(--text3)', fontSize: '13px', marginTop: '4px' }}>
            Selectionne une conversation pour commencer
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg0)',
      height: '100%',
      overflow: 'hidden'
    }}>

      {/* Header */}
      <div style={{
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        background: 'var(--bg1)',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0
      }}>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text2)',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '8px',
              flexShrink: 0
            }}
          >
            <ArrowLeft size={20} />
          </button>
        )}

        <Avatar
          user={isGroup
            ? { name: active.name, avatar: active.avatar }
            : otherUser
          }
          size={36}
          isGroup={isGroup}
          showOnline={!isGroup}
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div translate="no" style={{
            fontSize: '14px',
            fontWeight: 500,
            color: 'var(--text)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {isGroup ? active.name : otherUser?.pseudo}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text2)' }}>
            {isGroup
              ? `${active.members?.length || 0} membres`
              : otherUser?.isOnline ? 'En ligne' : 'Hors ligne'
            }
          </div>
        </div>

        <button
          onClick={() => onStartCall('audio')}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--accent)',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0
          }}
        >
          <Phone size={18} />
        </button>
        <button
          onClick={() => onStartCall('video')}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--accent)',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0
          }}
        >
          <Video size={18} />
        </button>
      </div>

      {/* Zone messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '10px 8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '1px'
      }}>
        {isLoadingMessages ? (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flex: 1,
            padding: '40px'
          }}>
            <Spinner />
          </div>
        ) : messages.length === 0 ? (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flex: 1,
            padding: '40px'
          }}>
            <p style={{ color: 'var(--text3)', fontSize: '13px' }}>
              Aucun message — dis bonjour !
            </p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwn={msg.senderId === user.id}
              showAvatar={
                isGroup &&
                msg.senderId !== user.id &&
                msg.senderId !== messages[index - 1]?.senderId
              }
              onReact={handleReact}
            />
          ))
        )}

        {/* Indicateur typing */}
        {typingUsers.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 8px'
          }}>
            <div style={{
              background: 'var(--bubble-r)',
              border: '1px solid var(--border)',
              borderRadius: '10px 10px 10px 0',
              padding: '8px 12px',
              display: 'flex',
              gap: '4px',
              alignItems: 'center'
            }}>
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: 'var(--text2)',
                    animation: `pulse 1.2s ${i * 0.2}s infinite`
                  }}
                />
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <MessageInput onSend={handleSend} onTyping={handleTyping} />
    </div>
  )
}

export default ChatWindow