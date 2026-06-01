import api from './axios'

export const uploadFile = async (file) => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await api.post('/upload/message', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return response.data
}

export const uploadAudio = async (blob) => {
  const formData = new FormData()
  formData.append('audio', blob, 'voice_message.webm')
  const response = await api.post('/upload/audio', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return response.data
}