import api from './axios'

export const searchUsers = async (pseudo) => {
  const response = await api.get(`/users/search?pseudo=${pseudo}`)
  return response.data
}

export const getUserByPseudo = async (pseudo) => {
  const response = await api.get(`/users/${pseudo}`)
  return response.data
}

export const updateProfile = async (data) => {
  const response = await api.put('/users/profile/update', data)
  return response.data
}

export const uploadAvatar = async (file) => {
  const formData = new FormData()
  formData.append('avatar', file)
  const response = await api.post('/users/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return response.data
}