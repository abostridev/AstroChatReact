import api from './axios'

export const register = async (email, pseudo, password) => {
  const response = await api.post('/auth/register', { email, pseudo, password })
  return response.data
}

export const login = async (email, password) => {
  const response = await api.post('/auth/login', { email, password })
  return response.data
}

export const logout = async () => {
  const response = await api.post('/auth/logout')
  return response.data
}

export const getMe = async () => {
  const response = await api.get('/auth/me')
  return response.data
}

export const refreshToken = async () => {
  const response = await api.post('/auth/refresh')
  return response.data
}