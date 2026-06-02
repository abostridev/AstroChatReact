import React, { useEffect, useState } from 'react'
import Avatar from '../ui/Avatar'
import Spinner from '../ui/Spinner'
import { getConversations } from '../../api/conversations'
import { getGroups } from '../../api/groups'
import useChatStore from '../../store/chatStore'
import useAuthStore from '../../store/authStore'

// Formate la date du dernier message
const formatTime = (date) => {
  if (!date) return ''
  const d = new Date(date)
  const now = new Date()
  const diff = now - d

  if (diff < 24 * 60 * 60 * 1000) {
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  } else if (diff < 7 * 24 * 60 * 60 * 1000) {
    return d.toLocaleDateString('fr-FR', { weekday: 'short' })
  } else {
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
  }
}

const ConversationItem = ({ item, isActive, onClick, currentUserId }) => {
  const isGroup = item.type === 'group'

  // Pour une conv 1-a-1 on affiche l'autre user
  const otherUser = isGroup ? null : (
    item.user1Id === currentUserId ? item.user2 : item.user1
  )

  const displayName = isGroup ? item.name : otherUser?.pseudo
  const displayUser = isGroup ? { name: item.name, avatar: item.avatar } : otherUser

  const lastMessage = item.messages?.[0]
  const lastMessageText = lastMessage
    ? lastMessage.type === 'TEXT'
      ? lastMessage.content
      : lastMessage.type === 'IMAGE' ? 'Photo'
      : lastMessage.type === 'VIDEO' ? 'Video'
      : lastMessage.type === 'AUDIO' ? 'Note vocale'
      : 'Fichier'
    : 'Aucun message'

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 14px',
        cursor: 'pointer',
        background: isActive ? 'var(--bg3)' : 'transparent',
        borderBottom: '1px solid var(--border)',
        transition: 'background 0.1s'
      }}
      onMouseEnter={(e) => {
        if (!isActive) e.currentTarget.style.background = 'var(--bg2)'
      }}
      onMouseLeave={(e) => {
        if (!isActive) e.currentTarget.style.background = 'transparent'
      }}
    >
      <Avatar
        user={displayUser}
        size={44}
        isGroup={isGroup}
        showOnline={!isGroup}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '3px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{
              fontSize: '14px',
              fontWeight: 500,
              color: 'var(--text)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '140px'
            }}>
              {displayName}
            </span>
            {isGroup && (
              <span style={{
                fontSize: '9px',
                padding: '1px 5px',
                borderRadius: '5px',
                background: 'var(--bg3)',
                color: 'var(--accent2)',
                border: '1px solid var(--accent2)',
                opacity: 0.8,
                flexShrink: 0
              }}>
                groupe
              </span>
            )}
          </div>
          <span style={{ fontSize: '10px', color: 'var(--text3)', flexShrink: 0 }}>
            {formatTime(item.updatedAt)}
          </span>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span style={{
            fontSize: '12px',
            color: 'var(--text2)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '170px'
          }}>
            {isGroup && lastMessage
              ? `${lastMessage.sender?.pseudo}: ${lastMessageText}`
              : lastMessageText
            }
          </span>
          {item.unreadCount > 0 && (
            <div style={{
              background: 'var(--accent)',
              color: 'var(--bg0)',
              fontSize: '10px',
              borderRadius: '10px',
              padding: '2px 7px',
              fontWeight: 500,
              flexShrink: 0
            }}>
              {item.unreadCount}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const ConversationList = ({ onSelectConversation, onSelectGroup }) => {
  const { user } = useAuthStore()
  const {
    conversations, groups,
    setConversations, setGroups,
    activeConversation, activeGroup
  } = useChatStore()

  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [convData, groupData] = await Promise.all([
          getConversations(),
          getGroups()
        ])
        setConversations(convData.conversations)
        setGroups(groupData.groups)
      } catch (error) {
        console.error('Erreur chargement conversations:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Melange conversations et groupes tries par date
  const allItems = [
    ...conversations.map(c => ({ ...c, type: 'conversation' })),
    ...groups.map(g => ({ ...g, type: 'group' }))
  ].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))

  const filtered = filter === 'all'
    ? allItems
    : filter === 'groups'
    ? allItems.filter(i => i.type === 'group')
    : allItems.filter(i => i.type === 'conversation' && i.unreadCount > 0)

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--bg1)',
      borderRight: '1px solid var(--border)'
    }}>
      {/* Filtres WhatsApp style */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg1)'
      }}>
        {[
          { key: 'all', label: 'Tous' },
          { key: 'unread', label: 'Non lus' },
          { key: 'groups', label: 'Groupes' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            style={{
              flex: 1,
              padding: '10px 4px',
              fontSize: '12px',
              background: 'none',
              border: 'none',
              borderBottom: `2px solid ${filter === tab.key ? 'var(--accent)' : 'transparent'}`,
              color: filter === tab.key ? 'var(--accent)' : 'var(--text3)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontWeight: filter === tab.key ? 500 : 400,
              transition: 'all 0.15s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Liste */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '40px'
          }}>
            <Spinner />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            padding: '40px 20px',
            textAlign: 'center',
            color: 'var(--text3)',
            fontSize: '13px'
          }}>
            Aucune conversation
          </div>
        ) : (
          filtered.map(item => (
            <ConversationItem
              key={item.id}
              item={item}
              currentUserId={user?.id}
              isActive={
                item.type === 'conversation'
                  ? activeConversation?.id === item.id
                  : activeGroup?.id === item.id
              }
              onClick={() => {
                if (item.type === 'conversation') {
                  onSelectConversation(item)
                } else {
                  onSelectGroup(item)
                }
              }}
            />
          ))
        )}
      </div>
    </div>
  )
}

export default ConversationList