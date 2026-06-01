import React, { useState } from 'react'

const Input = ({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  icon,
  ...props
}) => {
  const [focused, setFocused] = useState(false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
      {label && (
        <label style={{ fontSize: '12px', color: 'var(--text2)', fontWeight: 500 }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {icon && (
          <span style={{
            position: 'absolute',
            left: '12px',
            color: focused ? 'var(--accent)' : 'var(--text3)',
            fontSize: '16px',
            transition: 'color 0.15s'
          }}>
            {icon}
          </span>
        )}
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%',
            background: 'var(--bg2)',
            border: `1px solid ${error ? '#ff3c3c' : focused ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: '10px',
            padding: icon ? '10px 12px 10px 38px' : '10px 12px',
            fontSize: '14px',
            color: 'var(--text)',
            fontFamily: 'inherit',
            outline: 'none',
            transition: 'border-color 0.15s'
          }}
          {...props}
        />
      </div>
      {error && (
        <span style={{ fontSize: '11px', color: '#ff3c3c' }}>{error}</span>
      )}
    </div>
  )
}

export default Input