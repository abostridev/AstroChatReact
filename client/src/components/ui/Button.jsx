import React from 'react'

const variants = {
  primary: {
    background: 'var(--accent)',
    color: 'var(--bg0)',
    border: 'none'
  },
  secondary: {
    background: 'var(--bg2)',
    color: 'var(--text)',
    border: '1px solid var(--border)'
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text2)',
    border: 'none'
  },
  danger: {
    background: '#ff3c3c22',
    color: '#ff3c3c',
    border: '1px solid #ff3c3c44'
  }
}

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  onClick,
  style = {},
  ...props
}) => {
  const sizes = {
    sm: { padding: '6px 12px', fontSize: '12px', borderRadius: '8px' },
    md: { padding: '10px 18px', fontSize: '14px', borderRadius: '10px' },
    lg: { padding: '13px 24px', fontSize: '15px', borderRadius: '12px' }
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        ...variants[variant],
        ...sizes[size],
        width: fullWidth ? '100%' : 'auto',
        fontFamily: 'inherit',
        fontWeight: 500,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.15s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        ...style
      }}
      {...props}
    >
      {loading ? 'Chargement...' : children}
    </button>
  )
}

export default Button