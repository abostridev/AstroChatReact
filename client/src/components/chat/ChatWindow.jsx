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

const ChatWindow = ({ socket, onStartCall, onBack, isMobile }) => {
    const { user } = useAuthStore()
    const {
        activeConversation,
        activeGroup,
        messages,
        setMessages,
        addMessage,
        isLoadingMessages,
        setLoadingMessages,
        updateMessageReactions,
        markMessagesAsRead
    } = useChatStore()

    const messagesEndRef = useRef(null)
    const [typingUsers, setTypingUsers] = useState([])
    const typingTimeoutRef = useRef(null)

    const isGroup = !!activeGroup
    const active = activeGroup || activeConversation

    // Scroll vers le bas quand nouveaux messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    // Charge les messages quand on change de conversation
    useEffect(() => {
        if (!active) return

        const loadMessages = async () => {
            setLoadingMessages(true)
            try {
                const data = isGroup
                    ? await getGroupMessages(active.id)
                    : await getMessages(active.id)
                setMessages(data.messages)

                // Signale que l'user a lu les messages
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

        // Rejoint la room Socket.io
        if (socket) {
            if (isGroup) {
                socket.emit('join:group', active.id)
            } else {
                socket.emit('join:conversation', active.id)
            }
        }
    }, [active?.id])

    // Ecoute les evenements Socket.io
    useEffect(() => {
        if (!socket || !active) return

        // Quand l'autre user lit les messages — met a jour les ticks
        const handleMessagesRead = ({ conversationId, groupId, readBy }) => {
            if (readBy !== user.id) {
                markMessagesAsRead(conversationId, groupId)
            }
        }

        socket.on('messages:read', handleMessagesRead)

        const handleNewMessage = (message) => {
            addMessage(message)
            // Notifie si le message vient de quelqu'un d'autre
            if (message.senderId !== user.id) {
                showMessageNotification(
                    message.sender?.pseudo,
                    message
                )
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

        socket.on('typing:start', handleTypingStart)
        socket.on('typing:stop', handleTypingStop)
        socket.on('reaction:updated', handleReactionUpdated)

        return () => {
            socket.off('message:received', handleNewMessage)
            socket.off('group:message:received', handleNewMessage)
            socket.off('typing:start', handleTypingStart)
            socket.off('typing:stop', handleTypingStop)
            socket.off('reaction:updated', handleReactionUpdated)
            socket.off('messages:read', handleMessagesRead)
        }
    }, [socket, active?.id])

    const handleSend = (messageData) => {
        if (!socket || !active) return

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

    // Infos de l'interlocuteur
    const otherUser = !isGroup && activeConversation
        ? (activeConversation.user1Id === user.id
            ? activeConversation.user2
            : activeConversation.user1)
        : null

    if (!active) {
        return (
            <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg0)',
                flexDirection: 'column',
                gap: '12px'
            }}>
                <div style={{
                    fontSize: '40px',
                    opacity: 0.2
                }}>
                    AC
                </div>
                <p style={{ color: 'var(--text3)', fontSize: '14px' }}>
                    Selectionne une conversation
                </p>
            </div>
        )
    }

    return (
        <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--bg0)',
            height: '100%'
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
                {/* Bouton retour mobile */}
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
                            justifyContent: 'center',
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
                    <div style={{
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
                            ? `${active.members?.length} membres`
                            : otherUser?.isOnline ? 'En ligne' : 'Hors ligne'
                        }
                    </div>
                </div>

                <button
                    onClick={() => {
                        console.log('Bouton telephone clique')
                        onStartCall('audio')
                    }}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--accent)',
                        cursor: 'pointer',
                        padding: '6px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                    }}
                >
                    <Phone size={18} />
                </button>
                <button
                    onClick={() => {
                        console.log('Bouton video clique')
                        onStartCall('video')
                    }}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--accent)',
                        cursor: 'pointer',
                        padding: '6px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                    }}
                >
                    <Video size={18} />
                </button>

            </div>

            {/* Messages */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px'
            }}>
                {isLoadingMessages ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                        <Spinner />
                    </div>
                ) : (
                    messages.map((msg, index) => (
                        <MessageBubble
                            key={msg.id}
                            message={msg}
                            isOwn={msg.senderId === user.id}
                            showAvatar={isGroup && msg.senderId !== messages[index - 1]?.senderId}
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
                        padding: '4px 0'
                    }}>
                        <div style={{
                            background: 'var(--bubble-r)',
                            border: '1px solid var(--border)',
                            borderRadius: '12px',
                            padding: '8px 12px',
                            display: 'flex',
                            gap: '3px',
                            alignItems: 'center'
                        }}>
                            {[0, 1, 2].map(i => (
                                <div
                                    key={i}
                                    style={{
                                        width: '5px',
                                        height: '5px',
                                        borderRadius: '50%',
                                        background: 'var(--text2)',
                                        animation: `pulse 1s ${i * 0.2}s infinite`
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