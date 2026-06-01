import { create } from 'zustand'

// Zustand est plus simple que Redux
// On definit l'etat et les actions dans le meme endroit

const useAuthStore = create((set) => ({
  // Etat initial
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,

  // Actions
  setUser: (user) => set({ user, isAuthenticated: true }),

  setAccessToken: (token) => set({ accessToken: token }),

  login: (user, token) => set({
    user,
    accessToken: token,
    isAuthenticated: true,
    isLoading: false
  }),

  logout: () => set({
    user: null,
    accessToken: null,
    isAuthenticated: false,
    isLoading: false
  }),

  updateUser: (userData) => set((state) => ({
    user: { ...state.user, ...userData }
  })),

  setLoading: (isLoading) => set({ isLoading })
}))

export default useAuthStore