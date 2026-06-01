import { create } from 'zustand'
import { applyTheme, getSavedTheme } from '../theme/themes'

const useThemeStore = create((set) => ({
  theme: getSavedTheme(),

  toggleTheme: () => set((state) => {
    const newTheme = state.theme === 'multicolor' ? 'warm' : 'multicolor'
    applyTheme(newTheme)
    return { theme: newTheme }
  }),

  initTheme: () => set((state) => {
    applyTheme(state.theme)
    return state
  })
}))

export default useThemeStore