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
import { logout as logoutApi } from '../api/auth'
import { searchUsers } from '../api/users'
import { createConversation } from '../api/conversations'
import { createGroup } from '../api/groups'
import { Plus, MessageSquare, Users, LogOut, Sun, Moon } from 'lucide-react'

const ChatPage = () => {
    const { user, logout } = useAuthStore()
    const { theme, toggleTheme } = useThemeStore()
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
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState([])
    const [groupName, setGroupName] = useState('')
    const [selectedUsers, setSelectedUsers] = useState([])
    const [searching, setSearching] = useState(false)

    // Sur mobile on affiche soit la liste soit le chat
    const hasActiveChat = activeConversation || activeGroup
    const showList = isMobile ? !hasActiveChat : true
    const showChat = isMobile ? hasActiveChat : true

    // Largeur de la sidebar
    const sidebarWidth = isMobile ? '100%' : isTablet ? '280px' : '320px'

    useEffect(() => {
        const token = localStorage.getItem('astrochat_access_token')
        const s = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
            auth: { token }
        })
        s.on('connect', () => console.log('Socket connecte'))
        s.on('connect_error', (err) => console.error('Socket erreur:', err.message))
        setSocket(s)
        return () => s.disconnect()
    }, [])

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
    }

    const handleSelectGroup = (group) => {
        setActiveGroup(group)
    }

    const handleBack = () => {
        setActiveConversation(null)
        setActiveGroup(null)
    }

    const handleStartConversation = async (targetUser) => {
        try {
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

    const handleLogout = async () => {
        try { await logoutApi() } catch (e) { }
        localStorage.removeItem('astrochat_access_token')
        logout()
    }

    const handleStartCall = (callType) => {
        console.log('Appel', callType)
    }

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            background: 'var(--bg0)',
            overflow: 'hidden',
            position: 'relative'
        }}>

            {/* SIDEBAR — liste des conversations */}
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
                    background: 'var(--bg0)'
                }}>

                    {/* Header sidebar */}
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                                onClick={toggleTheme}
                                style={{
                                    background: 'var(--bg2)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '8px',
                                    padding: '6px',
                                    cursor: 'pointer',
                                    color: 'var(--text2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                                title={theme === 'multicolor' ? 'Theme chaud' : 'Theme neon'}
                            >
                                {theme === 'multicolor'
                                    ? <Sun size={16} />
                                    : <Moon size={16} />
                                }
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
                                    justifyContent: 'center',
                                    borderRadius: '8px'
                                }}
                                title="Nouvelle conversation"
                            >
                                <Plus size={22} />
                            </button>
                            <Avatar user={user} size={30} />
                        </div>
                    </div>

                    {/* Liste */}
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                        <ConversationList
                            onSelectConversation={handleSelectConversation}
                            onSelectGroup={handleSelectGroup}
                        />
                    </div>

                    {/* Footer */}
                    <div style={{
                        padding: '10px 16px',
                        borderTop: '1px solid var(--border)',
                        background: 'var(--bg1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexShrink: 0
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Avatar user={user} size={28} />
                            <span style={{ fontSize: '12px', color: 'var(--text2)' }}>
                                @{user?.pseudo}
                            </span>
                        </div>
                        <button
                            onClick={handleLogout}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--text3)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontFamily: 'inherit',
                                fontSize: '12px',
                                padding: '4px'
                            }}
                        >
                            <LogOut size={14} />
                            Deconnexion
                        </button>
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
                            <Avatar user={u} size={36} showOnline />
                            <div>
                                <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>
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
                            <span style={{ fontSize: '13px', color: 'var(--text)' }}>
                                @{u.pseudo}
                            </span>
                            {selectedUsers.find(s => s.id === u.id) && (
                                <span style={{ marginLeft: 'auto', color: 'var(--accent)', fontSize: '12px' }}>
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
                                    @{u.pseudo}
                                    <button
                                        onClick={() => setSelectedUsers(selectedUsers.filter(s => s.id !== u.id))}
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