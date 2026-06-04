import React, { useState, useRef } from 'react'
import { X, Camera, LogOut } from 'lucide-react'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import useAuthStore from '../store/authStore'
import useThemeStore from '../store/themeStore'
import { updateProfile, uploadAvatar } from '../api/users'
import { logout as logoutApi } from '../api/auth'
import { themes } from '../theme/themes'

const ProfilePage = ({ onClose }) => {
  const { user, updateUser, logout } = useAuthStore()
  const { theme, toggleTheme, initTheme } = useThemeStore()

  const [pseudo, setPseudo] = useState(user?.pseudo || '')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const fileInputRef = useRef(null)

  const handleUpdatePseudo = async () => {
    if (!pseudo.trim() || pseudo === user?.pseudo) return
    setLoading(true)
    setError('')
    try {
      const data = await updateProfile({ pseudo })
      updateUser(data.user)
      setSuccess('Pseudo mis a jour !')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur mise a jour')
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const data = await uploadAvatar(file)
      updateUser({ avatar: data.user.avatar })
      setSuccess('Photo mise a jour !')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('Erreur upload photo')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleLogout = async () => {
    try { await logoutApi() } catch (e) {}
    localStorage.removeItem('astrochat_access_token')
    logout()
  }

  // Selectionne un theme specifique
  const selectTheme = (themeName) => {
    const { applyTheme } = require('../theme/themes')
    localStorage.setItem('astrochat_theme', themeName)
    import('../theme/themes').then(({ applyTheme }) => {
      applyTheme(themeName)
    })
    initTheme()
  }

  const themeOptions = [
    { key: 'multicolor', label: 'Multicolore', color: '#00e5ff', textColor: '#000' },
    { key: 'warm', label: 'Terre chaude', color: '#c8a84b', textColor: '#1c1a14' },
    { key: 'light', label: 'Lumiere', color: '#0077cc', textColor: '#fff' }
  ]

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '16px'
    }}>
      <div style={{
        background: 'var(--bg1)',
        border: '1px solid var(--border)',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '380px',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>

        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text)' }}>
            Mon profil
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text2)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '4px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Avatar */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <div style={{ position: 'relative' }}>
              <Avatar user={user} size={80} />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={{
                  position: 'absolute',
                  bottom: '0',
                  right: '0',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  border: '2px solid var(--bg1)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Camera size={13} color={theme === 'light' ? '#fff' : '#000'} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAvatarChange}
              />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div translate="no" style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text)' }}>
                @{user?.pseudo}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '2px' }}>
                {user?.email}
              </div>
            </div>
          </div>

          {/* Modifier pseudo */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text2)' }}>
              Modifier le pseudo
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Input
                placeholder="Nouveau pseudo"
                value={pseudo}
                onChange={(e) => setPseudo(e.target.value)}
              />
              <Button
                onClick={handleUpdatePseudo}
                loading={loading}
                disabled={!pseudo.trim() || pseudo === user?.pseudo}
                size="sm"
              >
                OK
              </Button>
            </div>
          </div>

          {/* Messages feedback */}
          {error && (
            <div style={{
              background: '#ff3c3c22',
              border: '1px solid #ff3c3c44',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '12px',
              color: '#ff6b6b'
            }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{
              background: '#00ff8822',
              border: '1px solid #00ff8844',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '12px',
              color: 'var(--accent3)'
            }}>
              {success}
            </div>
          )}

          {/* Choix du theme */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text2)' }}>
              Theme
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              {themeOptions.map(t => (
                <button
                  key={t.key}
                  onClick={() => {
                    localStorage.setItem('astrochat_theme', t.key)
                    import('../theme/themes').then(({ applyTheme }) => {
                      applyTheme(t.key)
                    })
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 6px',
                    background: t.color,
                    color: t.textColor,
                    border: theme === t.key
                      ? `3px solid var(--text)`
                      : '3px solid transparent',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: 500,
                    fontFamily: 'inherit',
                    transition: 'all 0.15s'
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Infos compte */}
          <div style={{
            background: 'var(--bg2)',
            borderRadius: '12px',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: 'var(--text2)' }}>Email</span>
              <span translate="no" style={{ fontSize: '12px', color: 'var(--text)' }}>{user?.email}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: 'var(--text2)' }}>Membre depuis</span>
              <span style={{ fontSize: '12px', color: 'var(--text)' }}>
                {user?.createdAt
                  ? new Date(user.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
                  : 'Recemment'
                }
              </span>
            </div>
          </div>

          {/* Deconnexion */}
          <Button
            variant="danger"
            fullWidth
            onClick={handleLogout}
          >
            <LogOut size={14} />
            Se deconnecter
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage