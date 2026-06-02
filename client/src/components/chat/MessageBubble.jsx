import React, { useState } from 'react'
import Avatar from '../ui/Avatar'
import { Play, Check, CheckCheck } from 'lucide-react'

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥']

const MessageBubble = ({ message, isOwn, showAvatar, onReact }) => {
    const [showReactions, setShowReactions] = useState(false)

    const isText = message.type === 'TEXT'
    const isImage = message.type === 'IMAGE'
    const isAudio = message.type === 'AUDIO'
    const isVideo = message.type === 'VIDEO'

    const formatTime = (date) => {
        return new Date(date).toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    // Groupe les reactions par emoji
    const groupedReactions = message.reactions?.reduce((acc, r) => {
        acc[r.emoji] = (acc[r.emoji] || 0) + 1
        return acc
    }, {})

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isOwn ? 'flex-end' : 'flex-start',
                marginBottom: '4px',
                animation: 'fadeIn 0.2s ease'
            }}
            onMouseEnter={() => setShowReactions(true)}
            onMouseLeave={() => setShowReactions(false)}
        >
            <div style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: '6px',
                flexDirection: isOwn ? 'row-reverse' : 'row',
                maxWidth: '78%'
            }}>
                {/* Avatar — visible seulement pour les messages recus en groupe */}
                {showAvatar && !isOwn && (
                    <Avatar user={message.sender} size={24} />
                )}

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
                    {/* Nom expediteur en groupe */}
                    {showAvatar && !isOwn && (
                        <span style={{
                            fontSize: '10px',
                            color: 'var(--accent)',
                            marginBottom: '2px',
                            paddingLeft: '4px'
                        }}>
                            {message.sender?.pseudo}
                        </span>
                    )}

                    {/* Bulle */}
                    <div style={{ position: 'relative' }}>
                        <div style={{
                            background: isOwn ? 'var(--bubble-s)' : 'var(--bubble-r)',
                            color: isOwn ? 'var(--bubble-s-text)' : 'var(--text)',
                            borderRadius: isOwn ? '14px 2px 14px 14px' : '2px 14px 14px 14px',
                            padding: isImage ? '4px' : '8px 11px',
                            border: isOwn ? 'none' : '1px solid var(--border)',
                            maxWidth: '100%'
                        }}>

                            {/* Fleche de bulle */}
                            {isOwn && (
                                <span style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    color: message.isRead ? 'var(--accent)' : 'inherit'
                                }}>
                                    {message.isRead
                                        ? <CheckCheck size={12} />
                                        : <Check size={12} />
                                    }
                                </span>
                            )}

                            {/* Contenu selon le type */}
                            {isText && (
                                <span style={{ fontSize: '13px', lineHeight: 1.4, wordBreak: 'break-word' }}>
                                    {message.content}
                                </span>
                            )}

                            {isImage && (
                                <img
                                    src={message.fileUrl}
                                    alt="image"
                                    style={{
                                        maxWidth: '220px',
                                        maxHeight: '220px',
                                        borderRadius: '10px',
                                        display: 'block',
                                        objectFit: 'cover'
                                    }}
                                />
                            )}

                            {isAudio && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '160px' }}>
                                    <button
                                        style={{
                                            width: '28px',
                                            height: '28px',
                                            borderRadius: '50%',
                                            background: isOwn ? 'rgba(0,0,0,0.2)' : 'var(--accent)',
                                            border: 'none',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                            color: isOwn ? 'var(--bubble-s-text)' : 'var(--bg0)'
                                        }}
                                        onClick={() => {
                                            const audio = new Audio(message.fileUrl)
                                            audio.play()
                                        }}
                                    >
                                        <Play size={12} />
                                    </button>
                                    <div style={{
                                        flex: 1,
                                        height: '3px',
                                        background: isOwn ? 'rgba(0,0,0,0.2)' : 'var(--bg3)',
                                        borderRadius: '2px'
                                    }} />
                                    <span style={{ fontSize: '11px', opacity: 0.7 }}>
                                        {message.fileName || 'Note vocale'}
                                    </span>
                                </div>
                            )}

                            {isVideo && (
                                <video
                                    src={message.fileUrl}
                                    controls
                                    style={{
                                        maxWidth: '220px',
                                        borderRadius: '10px',
                                        display: 'block'
                                    }}
                                />
                            )}

                            {/* Heure */}
                            <div style={{
                                fontSize: '9px',
                                opacity: 0.6,
                                textAlign: 'right',
                                marginTop: isText ? '3px' : '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'flex-end',
                                gap: '3px'
                            }}>
                                {formatTime(message.createdAt)}
                                {isOwn && (
                                    <span style={{ fontSize: '10px' }}>
                                        {message.isRead ? '✓✓' : '✓'}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Picker de reactions au survol */}
                        {showReactions && (
                            <div style={{
                                position: 'absolute',
                                [isOwn ? 'left' : 'right']: '0',
                                top: '-36px',
                                background: 'var(--bg2)',
                                border: '1px solid var(--border)',
                                borderRadius: '20px',
                                padding: '4px 8px',
                                display: 'flex',
                                gap: '4px',
                                zIndex: 10,
                                whiteSpace: 'nowrap'
                            }}>
                                {EMOJIS.map(emoji => (
                                    <button
                                        key={emoji}
                                        onClick={() => onReact(message.id, emoji)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            fontSize: '16px',
                                            padding: '2px',
                                            borderRadius: '4px',
                                            transition: 'transform 0.1s'
                                        }}
                                        onMouseEnter={e => e.target.style.transform = 'scale(1.3)'}
                                        onMouseLeave={e => e.target.style.transform = 'scale(1)'}
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Reactions */}
                    {groupedReactions && Object.keys(groupedReactions).length > 0 && (
                        <div style={{
                            display: 'flex',
                            gap: '3px',
                            marginTop: '3px',
                            flexWrap: 'wrap'
                        }}>
                            {Object.entries(groupedReactions).map(([emoji, count]) => (
                                <button
                                    key={emoji}
                                    onClick={() => onReact(message.id, emoji)}
                                    style={{
                                        background: 'var(--bg3)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '10px',
                                        padding: '2px 6px',
                                        fontSize: '11px',
                                        cursor: 'pointer',
                                        fontFamily: 'inherit',
                                        color: 'var(--text2)'
                                    }}
                                >
                                    {emoji} {count}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default MessageBubble