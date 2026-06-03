import { create } from 'zustand'

const useChatStore = create((set) => ({
  // Liste de toutes les conversations et groupes melanges
  conversations: [],
  groups: [],
  activeConversation: null,
  activeGroup: null,
  messages: [],
  isLoadingMessages: false,

  setConversations: (conversations) => set({ conversations }),
  setGroups: (groups) => set({ groups }),

  setActiveConversation: (conversation) => set({
    activeConversation: conversation,
    activeGroup: null,
    messages: []
  }),

  setActiveGroup: (group) => set({
    activeGroup: group,
    activeConversation: null,
    messages: []
  }),

  setMessages: (messages) => set({ messages }),

  // Ajoute un nouveau message en temps reel
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message]
  })),

  // Met a jour les reactions d'un message
  updateMessageReactions: (messageId, reactions) => set((state) => ({
    messages: state.messages.map(msg =>
      msg.id === messageId ? { ...msg, reactions } : msg
    )
  })),

  // Marque tous les messages d'une conversation comme lus
markMessagesAsRead: (conversationId, groupId) => set((state) => ({
  messages: state.messages.map(msg => {
    if (conversationId && msg.conversationId === conversationId) {
      return { ...msg, isRead: true }
    }
    if (groupId && msg.groupId === groupId) {
      return { ...msg, isRead: true }
    }
    return msg
  })
})),

  // Met a jour le dernier message d'une conversation dans la liste
  updateConversationLastMessage: (conversationId, message) => set((state) => ({
    conversations: state.conversations.map(conv =>
      conv.id === conversationId
        ? { ...conv, messages: [message], updatedAt: message.createdAt }
        : conv
    )
  })),

  updateGroupLastMessage: (groupId, message) => set((state) => ({
    groups: state.groups.map(group =>
      group.id === groupId
        ? { ...group, messages: [message], updatedAt: message.createdAt }
        : group
    )
  })),

  setLoadingMessages: (isLoadingMessages) => set({ isLoadingMessages }),

  clearChat: () => set({
    activeConversation: null,
    activeGroup: null,
    messages: []
  })
}))

export default useChatStore