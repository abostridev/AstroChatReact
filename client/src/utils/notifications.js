// Gere les notifications du navigateur

// Demande la permission de notifier
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) return false

  if (Notification.permission === 'granted') return true

  const permission = await Notification.requestPermission()
  return permission === 'granted'
}

// Envoie une notification d'appel entrant
export const showCallNotification = (callerName, callType, onAccept, onReject) => {
  if (Notification.permission !== 'granted') return

  const notification = new Notification('AstroChat — Appel entrant', {
    body: `${callerName} vous appelle (${callType === 'video' ? 'video' : 'audio'})`,
    icon: '/vite.svg',
    requireInteraction: true,  // reste visible jusqu'a interaction
    tag: 'incoming-call'       // remplace la notif precedente si elle existe
  })

  notification.onclick = () => {
    window.focus()
    notification.close()
    onAccept()
  }

  // Ferme automatiquement apres 30 secondes
  setTimeout(() => notification.close(), 30000)

  return notification
}

// Envoie une notification de message
export const showMessageNotification = (senderName, message, onClick) => {
  if (Notification.permission !== 'granted') return
  if (document.hasFocus()) return  // pas de notif si l'app est au premier plan

  const body = message.type === 'TEXT'
    ? message.content
    : message.type === 'IMAGE' ? 'Photo'
    : message.type === 'AUDIO' ? 'Note vocale'
    : message.type === 'VIDEO' ? 'Video'
    : 'Fichier'

  const notification = new Notification(`AstroChat — ${senderName}`, {
    body,
    icon: '/vite.svg',
    tag: `message-${senderName}`
  })

  notification.onclick = () => {
    window.focus()
    notification.close()
    onClick?.()
  }

  setTimeout(() => notification.close(), 5000)
}