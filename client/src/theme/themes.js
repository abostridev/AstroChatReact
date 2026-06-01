// Les deux themes d'AstroChat
// Chaque valeur est utilisee comme variable CSS dans toute l'app

export const themes = {
  // Theme par defaut — multicolore dark
  multicolor: {
    name: 'multicolor',
    colors: {
      bg0: '#0a0a0a',
      bg1: '#0d0d0d',
      bg2: '#141414',
      bg3: '#1a1a1a',
      accent: '#00e5ff',
      accentRgb: '0, 229, 255',
      accent2: '#ff3cac',
      accent3: '#00ff88',
      accent4: '#ffe600',
      text: '#e2e8f0',
      textSecondary: '#888888',
      textTertiary: '#444444',
      bubbleReceived: '#1a1a2e',
      bubbleSent: '#00e5ff',
      bubbleSentText: '#000000',
      border: '#1e1e1e',
      inputBg: '#141414',
      avatarColors: [
        { bg: '#0d1a2e', color: '#00e5ff', border: '#00e5ff33' },
        { bg: '#1a0d1a', color: '#ff3cac', border: '#ff3cac33' },
        { bg: '#1a1a0d', color: '#ffe600', border: '#ffe60033' },
        { bg: '#0d1a14', color: '#00ff88', border: '#00ff8833' }
      ]
    }
  },

  // Theme terre chaude
  warm: {
    name: 'warm',
    colors: {
      bg0: '#1c1a14',
      bg1: '#242018',
      bg2: '#2e2a1e',
      bg3: '#38321f',
      accent: '#c8a84b',
      accentRgb: '200, 168, 75',
      accent2: '#8fad6a',
      accent3: '#4a7c59',
      accent4: '#d4956a',
      text: '#e8dfc0',
      textSecondary: '#8a7f60',
      textTertiary: '#4a4430',
      bubbleReceived: '#2a2618',
      bubbleSent: '#3a5c3a',
      bubbleSentText: '#d4f0d4',
      border: '#35301e',
      inputBg: '#2e2a1e',
      avatarColors: [
        { bg: '#3d3010', color: '#c8a84b', border: '#c8a84b33' },
        { bg: '#1e3325', color: '#8fad6a', border: '#8fad6a33' },
        { bg: '#2e2010', color: '#d4956a', border: '#d4956a33' },
        { bg: '#1a2e28', color: '#5dcaa5', border: '#5dcaa533' }
      ]
    }
  }
}

// Applique le theme en injectant des variables CSS sur :root
export const applyTheme = (theme) => {
  const root = document.documentElement
  const colors = themes[theme].colors

  root.style.setProperty('--bg0', colors.bg0)
  root.style.setProperty('--bg1', colors.bg1)
  root.style.setProperty('--bg2', colors.bg2)
  root.style.setProperty('--bg3', colors.bg3)
  root.style.setProperty('--accent', colors.accent)
  root.style.setProperty('--accent-rgb', colors.accentRgb)
  root.style.setProperty('--accent2', colors.accent2)
  root.style.setProperty('--accent3', colors.accent3)
  root.style.setProperty('--accent4', colors.accent4)
  root.style.setProperty('--text', colors.text)
  root.style.setProperty('--text2', colors.textSecondary)
  root.style.setProperty('--text3', colors.textTertiary)
  root.style.setProperty('--bubble-r', colors.bubbleReceived)
  root.style.setProperty('--bubble-s', colors.bubbleSent)
  root.style.setProperty('--bubble-s-text', colors.bubbleSentText)
  root.style.setProperty('--border', colors.border)
  root.style.setProperty('--input-bg', colors.inputBg)

  // Sauvegarde le theme choisi dans localStorage
  localStorage.setItem('astrochat_theme', theme)
}

// Recupere le theme sauvegarde ou utilise multicolor par defaut
export const getSavedTheme = () => {
  return localStorage.getItem('astrochat_theme') || 'multicolor'
}