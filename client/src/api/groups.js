import api from './axios'

export const getGroups = async () => {
  const response = await api.get('/groups')
  return response.data
}

export const createGroup = async (name, memberIds) => {
  const response = await api.post('/groups', { name, memberIds })
  return response.data
}

export const getGroupMessages = async (groupId, page = 1) => {
  const response = await api.get(`/groups/${groupId}/messages?page=${page}`)
  return response.data
}

export const sendGroupMessage = async (groupId, data) => {
  const response = await api.post(`/groups/${groupId}/messages`, data)
  return response.data
}

export const addGroupMember = async (groupId, userId) => {
  const response = await api.post(`/groups/${groupId}/members`, { userId })
  return response.data
}