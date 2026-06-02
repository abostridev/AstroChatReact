import React from 'react'
import useThemeStore from '../../store/themeStore'
import { themes } from '../../theme/themes'
import { Users } from 'lucide-react'

const getColorIndex = (str) => {
    if (!str) return 0
    let sum = 0
    for (let i = 0; i < str.length; i++) sum += str.charCodeAt(i)
    return sum % 4
}

const getInitials = (pseudo, name) => {
    const str = pseudo || name || '?'
    return str.substring(0, 2).toUpperCase()
}

const Avatar = ({ user, size = 40, isGroup = false, onClick, showOnline = false }) => {
    const { theme } = useThemeStore()
    const themeColors = themes[theme].colors
    const colorIndex = getColorIndex(user?.pseudo || user?.name)
    const avatarColor = themeColors.avatarColors[colorIndex]
    const borderRadius = isGroup ? `${size * 0.25}px` : '50%'
    const fontSize = size * 0.32
    const initials = getInitials(user?.pseudo, user?.name)


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
                        border: `1.5px solid ${avatarColor.border}`,
                        display: 'block'
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
                        overflow: 'hidden',
                        fontSize: 0
                    }}
                >
                    {isGroup ? (
                        <Users
                            size={size * 0.45}
                            color={avatarColor.color}
                            strokeWidth={1.5}
                        />
                    ) : (
                        <span
                            translate="no"
                            style={{
                                color: avatarColor.color,
                                fontSize: `${fontSize}px`,
                                fontWeight: 600,
                                lineHeight: '1',
                                userSelect: 'none',
                                letterSpacing: '-0.5px',
                                display: 'block',
                                textAlign: 'center',
                                whiteSpace: 'nowrap',
                                maxWidth: '100%',
                                overflow: 'hidden'
                            }}
                        >
                            {initials}
                        </span>
                    )}
                </div>
            )}

            {showOnline && user?.isOnline && (
                <div style={{
                    position: 'absolute',
                    bottom: '1px',
                    right: '1px',
                    width: `${Math.max(size * 0.22, 8)}px`,
                    height: `${Math.max(size * 0.22, 8)}px`,
                    borderRadius: '50%',
                    background: 'var(--accent3)',
                    border: `2px solid var(--bg0)`
                }} />
            )}
        </div>
    )
}

export default Avatar