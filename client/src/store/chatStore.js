import { create } from 'zustand'

const useChatStore = create((set, get) => ({
  conversations: [],
  groups: [],
  activeConversation: null,
  activeGroup: null,
  messages: [],
  messagesCache: {},
  isLoadingMessages: false,

  setConversations: (conversations) => set({ conversations }),
  setGroups: (groups) => set({ groups }),

  setActiveConversation: (conversation) => {
    const cache = get().messagesCache
    set({
      activeConversation: conversation,
      activeGroup: null,
      messages: conversation ? (cache[conversation.id] || []) : []
    })
  },

  setActiveGroup: (group) => {
    const cache = get().messagesCache
    set({
      activeGroup: group,
      activeConversation: null,
      messages: group ? (cache[group.id] || []) : []
    })
  },

  setMessages: (messages) => {
    const state = get()
    const activeId = state.activeConversation?.id || state.activeGroup?.id
    if (!activeId) return
    set({
      messages,
      messagesCache: {
        ...state.messagesCache,
        [activeId]: messages
      }
    })
  },

  addMessage: (message) => set((state) => {
    const activeId = state.activeConversation?.id || state.activeGroup?.id
    const newMessages = [...state.messages, message]
    const newCache = { ...state.messagesCache }

    // Met a jour le cache de la conversation concernee
    const convId = message.conversationId || message.groupId
    if (convId) {
      newCache[convId] = activeId === convId
        ? newMessages
        : [...(newCache[convId] || []), message]
    }

    return {
      messages: activeId === convId ? newMessages : state.messages,
      messagesCache: newCache
    }
  }),

  updateMessageReactions: (messageId, reactions) => set((state) => ({
    messages: state.messages.map(msg =>
      msg.id === messageId ? { ...msg, reactions } : msg
    )
  })),

  updateConversationLastMessage: (conversationId, message) => set((state) => {
    const activeId = state.activeConversation?.id
    const isActive = activeId === conversationId
    const isOwn = message.senderId === state.activeConversation?.user1Id ||
      message.senderId === state.activeConversation?.user2Id

    return {
      conversations: state.conversations
        .map(conv =>
          conv.id === conversationId
            ? {
              ...conv,
              messages: [message],
              updatedAt: message.createdAt,
              // Badge uniquement si conv pas active et message d'un autre
              unreadCount: isActive
                ? 0
                : (conv.unreadCount || 0) + 1
            }
            : conv
        )
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    }
  }),

  updateGroupLastMessage: (groupId, message) => set((state) => {
    const activeId = state.activeGroup?.id
    const isActive = activeId === groupId

    return {
      groups: state.groups
        .map(group =>
          group.id === groupId
            ? {
              ...group,
              messages: [message],
              updatedAt: message.createdAt,
              unreadCount: isActive
                ? 0
                : (group.unreadCount || 0) + 1
            }
            : group
        )
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    }
  }),

  replaceOptimisticMessage: (realMessage) => set((state) => {
    const activeId = state.activeConversation?.id || state.activeGroup?.id

    // Remplace le premier message pending de cet expediteur
    let replaced = false
    const newMessages = state.messages.map(msg => {
      if (!replaced && msg.pending && msg.senderId === realMessage.senderId) {
        replaced = true
        return { ...realMessage, pending: false }
      }
      return msg
    })

    return {
      messages: newMessages,
      messagesCache: {
        ...state.messagesCache,
        [activeId]: newMessages
      }
    }
  }),

  markMessagesAsRead: (conversationId, groupId) => set((state) => {
    const targetId = conversationId || groupId
    return {
      messages: state.messages.map(msg => ({ ...msg, isRead: true })),
      conversations: state.conversations.map(conv =>
        conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
      ),
      groups: state.groups.map(group =>
        group.id === groupId ? { ...group, unreadCount: 0 } : group
      ),
      messagesCache: {
        ...state.messagesCache,
        [targetId]: (state.messagesCache[targetId] || []).map(msg => ({ ...msg, isRead: true }))
      }
    }
  }),

  setLoadingMessages: (isLoadingMessages) => set({ isLoadingMessages }),

  clearChat: () => set({
    activeConversation: null,
    activeGroup: null,
    messages: []
  })
}))

export default useChatStore