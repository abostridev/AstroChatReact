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

  const groupedReactions = message.reactions?.reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1
    return acc
  }, {})

  // Couleurs de la fleche selon le theme
  const bubbleBg = isOwn ? 'var(--bubble-s)' : 'var(--bubble-r)'
  const bubbleBorder = 'var(--border)'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isOwn ? 'flex-end' : 'flex-start',
        marginBottom: '2px',
        paddingLeft: isOwn ? '60px' : '0',
        paddingRight: isOwn ? '0' : '60px',
        animation: 'fadeIn 0.15s ease'
      }}
      onMouseEnter={() => setShowReactions(true)}
      onMouseLeave={() => setShowReactions(false)}
    >
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: '4px',
        flexDirection: isOwn ? 'row-reverse' : 'row'
      }}>

        {showAvatar && !isOwn && (
          <Avatar user={message.sender} size={20} />
        )}

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: isOwn ? 'flex-end' : 'flex-start'
        }}>

          {showAvatar && !isOwn && (
            <span translate="no" style={{
              fontSize: '11px',
              color: 'var(--accent)',
              marginBottom: '2px',
              paddingLeft: '12px'
            }}>
              {message.sender?.pseudo}
            </span>
          )}

          <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start' }}>

            {/* Fleche gauche — messages recus */}
            {!isOwn && (
              <div style={{
                width: '8px',
                height: '13px',
                flexShrink: 0,
                marginTop: '0px',
                overflow: 'hidden',
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute',
                  right: '0',
                  top: '0',
                  width: '16px',
                  height: '16px',
                  background: bubbleBg,
                  border: `1px solid ${bubbleBorder}`,
                  borderRadius: '0 0 0 12px',
                  transform: 'rotate(0deg)'
                }} />
                <div style={{
                  position: 'absolute',
                  right: '0',
                  top: '0',
                  width: '8px',
                  height: '13px',
                  background: 'var(--bg0)'
                }} />
              </div>
            )}

            {/* Bulle principale */}
            <div style={{
              background: bubbleBg,
              color: isOwn ? 'var(--bubble-s-text)' : 'var(--text)',
              borderRadius: isOwn
                ? '10px 10px 0 10px'
                : '10px 10px 10px 0',
              padding: isImage || isVideo ? '3px' : '6px 9px',
              border: isOwn ? 'none' : `1px solid ${bubbleBorder}`,
              fontSize: '14px',
              lineHeight: '1.4',
              wordBreak: 'break-word',
              maxWidth: '100%',
              position: 'relative'
            }}>

              {isText && (
                <div>
                  <span translate="no" style={{ display: 'block', marginBottom: '2px' }}>
                    {message.content}
                  </span>
                  {/* Heure + ticks sous le texte a droite */}
                  {/* Heure + ticks */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '3px',
                    fontSize: '11px',
                    opacity: 0.6,
                    marginTop: '1px'
                  }}>
                    {formatTime(message.createdAt)}
                    {isOwn && (
                      <span style={{ display: 'flex', alignItems: 'center', opacity: 1 }}>
                        {message.pending ? (
                          // Icone horloge — message en cours d'envoi
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12,6 12,12 16,14" />
                          </svg>
                        ) : message.isRead ? (
                          <CheckCheck size={13} color="var(--accent)" strokeWidth={2.5} />
                        ) : (
                          <Check size={13} strokeWidth={2.5} />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {isImage && (
                <div>
                  <img
                    src={message.fileUrl}
                    alt="image"
                    style={{
                      maxWidth: '220px',
                      maxHeight: '220px',
                      borderRadius: '8px',
                      display: 'block',
                      objectFit: 'cover'
                    }}
                  />
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '3px',
                    fontSize: '11px',
                    opacity: 0.6,
                    marginTop: '4px',
                    paddingBottom: '2px'
                  }}>
                    {formatTime(message.createdAt)}
                    {isOwn && (
                      <span style={{ display: 'flex', alignItems: 'center' }}>
                        {message.isRead ? (
                          <CheckCheck size={13} color="var(--accent)" strokeWidth={2.5} />
                        ) : (
                          <Check size={13} strokeWidth={2.5} />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {isAudio && (
                <div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    minWidth: '160px'
                  }}>
                    <button
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '50%',
                        background: isOwn ? 'rgba(0,0,0,0.15)' : 'var(--accent)',
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
                      <Play size={13} />
                    </button>
                    <div style={{
                      flex: 1,
                      height: '3px',
                      background: isOwn ? 'rgba(0,0,0,0.2)' : 'var(--bg3)',
                      borderRadius: '2px'
                    }} />
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '3px',
                    fontSize: '11px',
                    opacity: 0.6,
                    marginTop: '4px'
                  }}>
                    {formatTime(message.createdAt)}
                    {isOwn && (
                      <span style={{ display: 'flex', alignItems: 'center' }}>
                        {message.isRead ? (
                          <CheckCheck size={13} color="var(--accent)" strokeWidth={2.5} />
                        ) : (
                          <Check size={13} strokeWidth={2.5} />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {isVideo && (
                <div>
                  <video
                    src={message.fileUrl}
                    controls
                    style={{
                      maxWidth: '220px',
                      borderRadius: '8px',
                      display: 'block'
                    }}
                  />
                  <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '3px',
                    fontSize: '11px',
                    opacity: 0.6,
                    marginTop: '4px'
                  }}>
                    {formatTime(message.createdAt)}
                    {isOwn && (
                      <span style={{ display: 'flex', alignItems: 'center' }}>
                        {message.isRead ? (
                          <CheckCheck size={13} color="var(--accent)" strokeWidth={2.5} />
                        ) : (
                          <Check size={13} strokeWidth={2.5} />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Picker reactions au survol */}
              {showReactions && (
                <div style={{
                  position: 'absolute',
                  [isOwn ? 'left' : 'right']: '0',
                  top: '-36px',
                  background: 'var(--bg1)',
                  border: '1px solid var(--border)',
                  borderRadius: '20px',
                  padding: '4px 8px',
                  display: 'flex',
                  gap: '2px',
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
                        padding: '2px 3px',
                        borderRadius: '4px',
                        transition: 'transform 0.1s',
                        lineHeight: 1
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

            {/* Fleche droite — messages envoyes */}
            {isOwn && (
              <div style={{
                width: '8px',
                height: '13px',
                flexShrink: 0,
                marginTop: '0px',
                overflow: 'hidden',
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute',
                  left: '0',
                  top: '0',
                  width: '16px',
                  height: '16px',
                  background: 'var(--bubble-s)',
                  borderRadius: '0 0 12px 0'
                }} />
                <div style={{
                  position: 'absolute',
                  left: '0',
                  top: '0',
                  width: '8px',
                  height: '13px',
                  background: 'var(--bg0)'
                }} />
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
                    background: 'var(--bg2)',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    padding: '2px 7px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    color: 'var(--text2)',
                    lineHeight: 1.4
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