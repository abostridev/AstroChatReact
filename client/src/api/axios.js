import axios from 'axios'

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  withCredentials: true // envoie les cookies automatiquement (refresh token)
})

// Intercepteur de requete — ajoute le token a chaque requete
api.interceptors.request.use(
  (config) => {
    // On recupere le token depuis le store zustand
    // On importe dynamiquement pour eviter les imports circulaires
    const token = localStorage.getItem('astrochat_access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Intercepteur de reponse — gere le refresh token automatique
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Si le token est expire et qu'on n'a pas deja essaye de le rafraichir
    if (
      error.response?.status === 401 &&
      error.response?.data?.expired === true &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true

      try {
        // Appelle la route refresh — le cookie httpOnly est envoye automatiquement
        const response = await axios.post(
          `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/auth/refresh`,
          {},
          { withCredentials: true }
        )

        const { accessToken } = response.data

        // Sauvegarde le nouveau token
        localStorage.setItem('astrochat_access_token', accessToken)

        // Relance la requete originale avec le nouveau token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        return api(originalRequest)

      } catch (refreshError) {
        // Le refresh token est expire — on deconnecte l'user
        localStorage.removeItem('astrochat_access_token')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

export default api