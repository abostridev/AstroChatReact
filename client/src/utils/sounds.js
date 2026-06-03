// Génère les sons d'appel via Web Audio API
// Pas besoin de fichiers audio externes

// Tonalité appelant — bip répété
export const createRingbackTone = () => {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  let intervalId = null
  let isPlaying = false

  const playBeep = () => {
    const oscillator = audioCtx.createOscillator()
    const gainNode = audioCtx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioCtx.destination)

    oscillator.frequency.setValueAtTime(440, audioCtx.currentTime)
    oscillator.type = 'sine'

    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8)

    oscillator.start(audioCtx.currentTime)
    oscillator.stop(audioCtx.currentTime + 0.8)
  }

  return {
    start: () => {
      if (isPlaying) return
      isPlaying = true
      playBeep()
      intervalId = setInterval(playBeep, 3000)
    },
    stop: () => {
      isPlaying = false
      if (intervalId) {
        clearInterval(intervalId)
        intervalId = null
      }
      audioCtx.close()
    }
  }
}

// Sonnerie appel entrant — son plus urgent
export const createRingtone = () => {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  let intervalId = null
  let isPlaying = false

  const playRing = () => {
    const notes = [523, 659, 784]  // Do, Mi, Sol
    notes.forEach((freq, i) => {
      const oscillator = audioCtx.createOscillator()
      const gainNode = audioCtx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioCtx.destination)

      oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime + i * 0.15)
      oscillator.type = 'sine'

      gainNode.gain.setValueAtTime(0, audioCtx.currentTime + i * 0.15)
      gainNode.gain.linearRampToValueAtTime(0.4, audioCtx.currentTime + i * 0.15 + 0.05)
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + i * 0.15 + 0.3)

      oscillator.start(audioCtx.currentTime + i * 0.15)
      oscillator.stop(audioCtx.currentTime + i * 0.15 + 0.3)
    })
  }

  return {
    start: () => {
      if (isPlaying) return
      isPlaying = true
      playRing()
      intervalId = setInterval(playRing, 2000)
    },
    stop: () => {
      isPlaying = false
      if (intervalId) {
        clearInterval(intervalId)
        intervalId = null
      }
      audioCtx.close()
    }
  }
}

// Son de connexion etablie
export const playConnectedSound = () => {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  const oscillator = audioCtx.createOscillator()
  const gainNode = audioCtx.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(audioCtx.destination)

  oscillator.frequency.setValueAtTime(880, audioCtx.currentTime)
  oscillator.frequency.setValueAtTime(1100, audioCtx.currentTime + 0.1)
  oscillator.type = 'sine'

  gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3)

  oscillator.start(audioCtx.currentTime)
  oscillator.stop(audioCtx.currentTime + 0.3)

  setTimeout(() => audioCtx.close(), 500)
}

// Son de fin d'appel
export const playEndCallSound = () => {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  const oscillator = audioCtx.createOscillator()
  const gainNode = audioCtx.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(audioCtx.destination)

  oscillator.frequency.setValueAtTime(440, audioCtx.currentTime)
  oscillator.frequency.linearRampToValueAtTime(200, audioCtx.currentTime + 0.4)
  oscillator.type = 'sine'

  gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4)

  oscillator.start(audioCtx.currentTime)
  oscillator.stop(audioCtx.currentTime + 0.4)

  setTimeout(() => audioCtx.close(), 600)
}