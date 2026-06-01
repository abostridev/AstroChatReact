import api from './axios'

export const getConversations = async () => {
  const response = await api.get('/conversations')
  return response.data
}

export const createConversation = async (targetUserId) => {
  const response = await api.post('/conversations', { targetUserId })
  return response.data
}

export const getMessages = async (conversationId, page = 1) => {
  const response = await api.get(`/conversations/${conversationId}/messages?page=${page}`)
  return response.data
}

export const sendMessage = async (conversationId, data) => {
  const response = await api.post(`/conversations/${conversationId}/messages`, data)
  return response.data
}