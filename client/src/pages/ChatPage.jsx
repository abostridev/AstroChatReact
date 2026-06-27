import React, { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import useAuthStore from '../store/authStore'
import useThemeStore from '../store/themeStore'
import useChatStore from '../store/chatStore'
import useWindowSize from '../hooks/useWindowSize'
import ConversationList from '../components/chat/ConversationList'
import ChatWindow from '../components/chat/ChatWindow'
import Avatar from '../components/ui/Avatar'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import ProfilePage from '../pages/ProfilePage'
import CallScreen from '../components/call/CallScreen'
import { logout as logoutApi } from '../api/auth'
import { searchUsers } from '../api/users'
import { createConversation } from '../api/conversations'
import { createGroup } from '../api/groups'
import { Plus, LogOut, Search } from 'lucide-react'
import {
  requestNotificationPermission,
  showCallNotification
} from '../utils/notifications'

const ChatPage = () => {
  const { user, logout } = useAuthStore()
  const { theme } = useThemeStore()
  const {
    setActiveConversation,
    setActiveGroup,
    activeConversation,
    activeGroup,
    conversations,
    setConversations,
    groups,
    setGroups
  } = useChatStore()

  const { isMobile, isTablet } = useWindowSize()

  const [socket, setSocket] = useState(null)
  const [showNewChat, setShowNewChat] = useState(false)
  const [showNewGroup, setShowNewGroup] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchConv, setSearchConv] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [groupName, setGroupName] = useState('')
  const [selectedUsers, setSelectedUsers] = useState([])
  const [searching, setSearching] = useState(false)
  const [activeCall, setActiveCall] = useState(null)

  const hasActiveChat = activeConversation || activeGroup
  const showList = isMobile ? !hasActiveChat : true
  const showChat = isMobile ? !!hasActiveChat : true
  const sidebarWidth = isMobile ? '100%' : isTablet ? '280px' : '320px'

  useEffect(() => {
    const token = localStorage.getItem('astrochat_access_token')
    const s = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
      auth: { token }
    })

    s.on('connect', () => {
      console.log('Socket connecte')
      requestNotificationPermission()
    })

    s.on('connect', () => {
      console.log('Socket connecte')
      requestNotificationPermission()

      // Rejoindre toutes les conversations et groupes au demarrage
      // comme ca on recoit les messages meme sans ouvrir la conv
      const { conversations, groups } = useChatStore.getState()
      conversations.forEach(conv => {
        s.emit('join:conversation', conv.id)
      })
      groups.forEach(group => {
        s.emit('join:group', group.id)
      })
    })

    s.on('connect_error', (err) => {
      console.error('Socket erreur:', err.message)
    })

    s.on('call:incoming', ({ caller, callType }) => {
      showCallNotification(
        caller.pseudo,
        callType,
        () => setActiveCall({
          targetUser: caller,
          callType,
          isIncoming: true,
          isGroup: false,
          autoAccept: true
        }),
        () => s.emit('call:reject', { callerId: caller.id })
      )
      setActiveCall({
        targetUser: caller,
        callType,
        isIncoming: true,
        isGroup: false
      })
    })

    s.on('call:group:incoming', ({ groupId, caller, callType }) => {
      setActiveCall({
        targetUser: caller,
        callType,
        isIncoming: true,
        isGroup: true,
        groupName: groups.find(g => g.id === groupId)?.name || 'Groupe'
      })
    })

    setSocket(s)
    return () => s.disconnect()
  }, [])

  // Rejoindre les rooms de toutes les conversations chargees
  useEffect(() => {
    if (!socket || !socket.connected) return
    if (conversations.length === 0 && groups.length === 0) return

    conversations.forEach(conv => {
      socket.emit('join:conversation', conv.id)
    })
    groups.forEach(group => {
      socket.emit('join:group', group.id)
    })
  }, [socket, conversations.length, groups.length])

  // Listener global pour messages temps reel
  // Fonctionne meme si la conversation n'est pas active
  useEffect(() => {
    if (!socket) return

    const handleGlobalMessage = (message) => {
      const { activeConversation, activeGroup } = useChatStore.getState()

      // Met a jour la liste des conversations
      if (message.conversationId) {
        useChatStore.getState().updateConversationLastMessage(
          message.conversationId,
          message
        )
      }
      if (message.groupId) {
        useChatStore.getState().updateGroupLastMessage(
          message.groupId,
          message
        )
      }
    }

    const handleGlobalGroupMessage = (message) => {
      if (message.groupId) {
        useChatStore.getState().updateGroupLastMessage(
          message.groupId,
          message
        )
      }
    }

    socket.on('message:received', handleGlobalMessage)
    socket.on('group:message:received', handleGlobalGroupMessage)

    return () => {
      socket.off('message:received', handleGlobalMessage)
      socket.off('group:message:received', handleGlobalGroupMessage)
    }
  }, [socket])

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([])
      return
    }
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const data = await searchUsers(searchQuery)
        setSearchResults(data.users)
      } catch (error) {
        console.error('Erreur recherche:', error)
      } finally {
        setSearching(false)
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleSelectConversation = (conv) => {
    setActiveConversation(conv)
    // Remet le badge a zero immediatement
    useChatStore.getState().markMessagesAsRead(conv.id, undefined)
  }

  const handleSelectGroup = (group) => {
    setActiveGroup(group)
    // Remet le badge a zero immediatement
    useChatStore.getState().markMessagesAsRead(undefined, group.id)
  }


  const handleBack = () => {
    setActiveConversation(null)
    setActiveGroup(null)
  }

  const handleStartConversation = async (targetUser) => {
    try {
      // Verifie si une conversation existe deja
      const existing = conversations.find(c =>
        (c.user1Id === user.id && c.user2Id === targetUser.id) ||
        (c.user2Id === user.id && c.user1Id === targetUser.id)
      )

      if (existing) {
        setActiveConversation(existing)
        setShowNewChat(false)
        setSearchQuery('')
        setSearchResults([])
        return
      }

      const data = await createConversation(targetUser.id)
      setActiveConversation(data.conversation)
      setConversations([
        data.conversation,
        ...conversations.filter(c => c.id !== data.conversation.id)
      ])
      setShowNewChat(false)
      setSearchQuery('')
      setSearchResults([])
    } catch (error) {
      console.error('Erreur creation conversation:', error)
    }
  }

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedUsers.length === 0) return
    try {
      const data = await createGroup(groupName, selectedUsers.map(u => u.id))
      setActiveGroup(data.group)
      setGroups([data.group, ...groups])
      setShowNewGroup(false)
      setGroupName('')
      setSelectedUsers([])
    } catch (error) {
      console.error('Erreur creation groupe:', error)
    }
  }

  const handleStartCall = (callType) => {
    const active = activeConversation || activeGroup
    if (!active) return

    const isGroup = !!activeGroup
    const otherUser = !isGroup && activeConversation
      ? (activeConversation.user1Id === user.id
        ? activeConversation.user2
        : activeConversation.user1)
      : null

    setActiveCall({
      targetUser: otherUser,
      callType,
      isIncoming: false,
      isGroup,
      groupName: isGroup ? active.name : null
    })
  }

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      background: 'var(--bg0)',
      overflow: 'hidden',
      position: 'relative'
    }}>

      {/* SIDEBAR */}
      {showList && (
        <div style={{
          width: sidebarWidth,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          borderRight: isMobile ? 'none' : '1px solid var(--border)',
          position: isMobile ? 'absolute' : 'relative',
          inset: isMobile ? 0 : 'auto',
          zIndex: isMobile ? 10 : 'auto',
          background: 'var(--bg0)',
          height: '100%'
        }}>

          {/* Header */}
          <div style={{
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg1)',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0
          }}>
            <span style={{ fontSize: '18px', fontWeight: 500, color: 'var(--text)' }}>
              Astro<span style={{ color: 'var(--accent)' }}>Chat</span>
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                onClick={() => setShowSearch(!showSearch)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: showSearch ? 'var(--accent)' : 'var(--text2)',
                  cursor: 'pointer',
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: '8px'
                }}
              >
                <Search size={20} />
              </button>
              <button
                onClick={() => setShowNewChat(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text2)',
                  cursor: 'pointer',
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: '8px'
                }}
              >
                <Plus size={20} />
              </button>
              <Avatar
                user={user}
                size={30}
                onClick={() => setShowProfile(true)}
              />
            </div>
          </div>

          {/* Barre de recherche conversation */}
          {showSearch && (
            <div style={{
              padding: '8px 12px',
              background: 'var(--bg1)',
              borderBottom: '1px solid var(--border)',
              flexShrink: 0
            }}>
              <Input
                placeholder="Rechercher une conversation..."
                value={searchConv}
                onChange={(e) => setSearchConv(e.target.value)}
              />
            </div>
          )}

          {/* Liste */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <ConversationList
              onSelectConversation={handleSelectConversation}
              onSelectGroup={handleSelectGroup}
              searchFilter={searchConv}
            />
          </div>

          {/* Footer profil */}
          <div
            onClick={() => setShowProfile(true)}
            style={{
              padding: '10px 16px',
              borderTop: '1px solid var(--border)',
              background: 'var(--bg1)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'background 0.1s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--bg1)'}
          >
            <Avatar user={user} size={34} showOnline />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div translate="no" style={{
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--text)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                @{user?.pseudo}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text2)' }}>
                Voir le profil
              </div>
            </div>
            <LogOut
              size={16}
              color='var(--text3)'
              style={{ flexShrink: 0 }}
            />
          </div>
        </div>
      )}

      {/* ZONE DE CHAT */}
      {showChat && (
        <div style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          width: isMobile ? '100%' : 'auto'
        }}>
          <ChatWindow
            socket={socket}
            onStartCall={handleStartCall}
            onBack={isMobile ? handleBack : null}
            isMobile={isMobile}
          />
        </div>
      )}

      {/* Page profil */}
      {showProfile && (
        <ProfilePage onClose={() => setShowProfile(false)} />
      )}

      {/* Ecran d'appel */}
      {activeCall && (
        <CallScreen
          socket={socket}
          currentUser={user}
          targetUser={activeCall.targetUser}
          isGroup={activeCall.isGroup}
          groupName={activeCall.groupName}
          callType={activeCall.callType}
          isIncoming={activeCall.isIncoming}
          onEnd={() => setActiveCall(null)}
        />
      )}

      {/* Modal nouveau chat */}
      <Modal
        isOpen={showNewChat}
        onClose={() => {
          setShowNewChat(false)
          setSearchQuery('')
          setSearchResults([])
        }}
        title="Nouvelle conversation"
        width={isMobile ? '95vw' : '400px'}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Input
            placeholder="Chercher un pseudo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button
            onClick={() => { setShowNewChat(false); setShowNewGroup(true) }}
            style={{
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '10px 14px',
              cursor: 'pointer',
              color: 'var(--accent)',
              fontFamily: 'inherit',
              fontSize: '13px',
              textAlign: 'left'
            }}
          >
            + Creer un groupe
          </button>
          {searching && (
            <p style={{ fontSize: '12px', color: 'var(--text3)', textAlign: 'center' }}>
              Recherche...
            </p>
          )}
          {searchResults.map(u => (
            <div
              key={u.id}
              onClick={() => handleStartConversation(u)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px',
                borderRadius: '10px',
                cursor: 'pointer',
                background: 'var(--bg2)'
              }}
            >
              <Avatar user={u} size={38} showOnline />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div translate="no" style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'var(--text)'
                }}>
                  @{u.pseudo}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text2)' }}>
                  {u.isOnline ? 'En ligne' : 'Hors ligne'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* Modal nouveau groupe */}
      <Modal
        isOpen={showNewGroup}
        onClose={() => {
          setShowNewGroup(false)
          setGroupName('')
          setSelectedUsers([])
          setSearchQuery('')
          setSearchResults([])
        }}
        title="Nouveau groupe"
        width={isMobile ? '95vw' : '400px'}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Input
            label="Nom du groupe"
            placeholder="Ex: AfriFoods Team"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />
          <Input
            label="Ajouter des membres"
            placeholder="Chercher un pseudo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchResults.map(u => (
            <div
              key={u.id}
              onClick={() => {
                if (!selectedUsers.find(s => s.id === u.id)) {
                  setSelectedUsers([...selectedUsers, u])
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px',
                borderRadius: '10px',
                cursor: 'pointer',
                background: selectedUsers.find(s => s.id === u.id)
                  ? 'var(--bg3)'
                  : 'var(--bg2)'
              }}
            >
              <Avatar user={u} size={32} />
              <span translate="no" style={{ fontSize: '13px', color: 'var(--text)' }}>
                @{u.pseudo}
              </span>
              {selectedUsers.find(s => s.id === u.id) && (
                <span style={{ marginLeft: 'auto', color: 'var(--accent)', fontSize: '11px' }}>
                  Selectionne
                </span>
              )}
            </div>
          ))}
          {selectedUsers.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {selectedUsers.map(u => (
                <div
                  key={u.id}
                  style={{
                    background: 'var(--bg3)',
                    border: '1px solid var(--border)',
                    borderRadius: '20px',
                    padding: '3px 10px',
                    fontSize: '12px',
                    color: 'var(--accent)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <span translate="no">@{u.pseudo}</span>
                  <button
                    onClick={() => setSelectedUsers(
                      selectedUsers.filter(s => s.id !== u.id)
                    )}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text3)',
                      fontSize: '14px',
                      lineHeight: 1,
                      padding: 0
                    }}
                  >
                    x
                  </button>
                </div>
              ))}
            </div>
          )}
          <Button
            fullWidth
            onClick={handleCreateGroup}
            disabled={!groupName.trim() || selectedUsers.length === 0}
          >
            Creer le groupe ({selectedUsers.length} membre{selectedUsers.length > 1 ? 's' : ''})
          </Button>
        </div>
      </Modal>
    </div>
  )
}

export default ChatPage