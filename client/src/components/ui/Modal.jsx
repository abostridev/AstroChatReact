import React, { useEffect } from 'react'

const Modal = ({ isOpen, onClose, title, children, width = '400px' }) => {
  // Ferme avec la touche Escape
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="fade-in"
        style={{
          background: 'var(--bg1)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          width,
          maxWidth: '100%',
          maxHeight: '90vh',
          overflow: 'auto'
        }}
      >
        {title && (
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text)' }}>
              {title}
            </span>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text2)',
                cursor: 'pointer',
                fontSize: '20px',
                lineHeight: 1,
                padding: '0 4px'
              }}
            >
              x
            </button>
          </div>
        )}
        <div style={{ padding: '20px' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

export default Modal