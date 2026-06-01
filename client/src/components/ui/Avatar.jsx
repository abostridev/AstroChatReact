import React from 'react'
import useThemeStore from '../../store/themeStore'
import { themes } from '../../theme/themes'

// Genere un index de couleur stable a partir du pseudo
const getColorIndex = (pseudo) => {
  if (!pseudo) return 0
  let sum = 0
  for (let i = 0; i < pseudo.length; i++) {
    sum += pseudo.charCodeAt(i)
  }
  return sum % 4
}

const Avatar = ({
  user,
  size = 40,
  isGroup = false,
  onClick,
  showOnline = false
}) => {
  const { theme } = useThemeStore()
  const themeColors = themes[theme].colors
  const colorIndex = getColorIndex(user?.pseudo || user?.name)
  const avatarColor = themeColors.avatarColors[colorIndex]

  const initials = isGroup
    ? (user?.name || 'G').substring(0, 2).toUpperCase()
    : (user?.pseudo || '?').substring(0, 2).toUpperCase()

  const borderRadius = isGroup ? `${size * 0.25}px` : '50%'

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        width: `${size}px`,
        height: `${size}px`,
        flexShrink: 0,
        cursor: onClick ? 'pointer' : 'default'
      }}
    >
      {user?.avatar ? (
        <img
          src={user.avatar}
          alt={user.pseudo || user.name}
          style={{
            width: '100%',
            height: '100%',
            borderRadius,
            objectFit: 'cover',
            border: `1.5px solid ${avatarColor.border}`
          }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius,
            background: avatarColor.bg,
            border: `1.5px solid ${avatarColor.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: avatarColor.color,
            fontSize: `${size * 0.35}px`,
            fontWeight: 500
          }}
        >
          {initials}
        </div>
      )}

      {/* Indicateur en ligne */}
      {showOnline && user?.isOnline && (
        <div style={{
          position: 'absolute',
          bottom: '1px',
          right: '1px',
          width: `${size * 0.25}px`,
          height: `${size * 0.25}px`,
          borderRadius: '50%',
          background: 'var(--accent3)',
          border: `2px solid var(--bg0)`
        }} />
      )}
    </div>
  )
}

export default Avatar