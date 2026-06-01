import React from 'react'

const Spinner = ({ size = 24, color = 'var(--accent)' }) => (
  <div style={{
    width: `${size}px`,
    height: `${size}px`,
    border: `2px solid var(--bg3)`,
    borderTop: `2px solid ${color}`,
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite'
  }}>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
)

export default Spinner