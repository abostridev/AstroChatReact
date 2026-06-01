import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login as loginApi } from '../api/auth'
import useAuthStore from '../store/authStore'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'

const LoginPage = () => {
  const navigate = useNavigate()
  const { login } = useAuthStore()

  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const data = await loginApi(form.email, form.password)
      localStorage.setItem('astrochat_access_token', data.accessToken)
      login(data.user, data.accessToken)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg0)',
      padding: '16px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '380px',
        background: 'var(--bg1)',
        border: '1px solid var(--border)',
        borderRadius: '20px',
        padding: '32px 28px'
      }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '52px',
            height: '52px',
            background: 'var(--accent)',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
            fontSize: '24px'
          }}>
            AC
          </div>
          <h1 style={{
            fontSize: '22px',
            fontWeight: 500,
            color: 'var(--text)',
            letterSpacing: '-0.3px'
          }}>
            Astro<span style={{ color: 'var(--accent)' }}>Chat</span>
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text2)', marginTop: '4px' }}>
            Content de te revoir
          </p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Input
            label="Email"
            type="email"
            name="email"
            placeholder="toi@exemple.com"
            value={form.email}
            onChange={handleChange}
            required
          />
          <Input
            label="Mot de passe"
            type="password"
            name="password"
            placeholder="••••••••"
            value={form.password}
            onChange={handleChange}
            required
          />

          {error && (
            <div style={{
              background: '#ff3c3c22',
              border: '1px solid #ff3c3c44',
              borderRadius: '8px',
              padding: '10px 12px',
              fontSize: '13px',
              color: '#ff6b6b'
            }}>
              {error}
            </div>
          )}

          <Button
            type="submit"
            fullWidth
            loading={loading}
            size="lg"
            style={{ marginTop: '4px' }}
          >
            Se connecter
          </Button>
        </form>

        {/* Lien inscription */}
        <p style={{
          textAlign: 'center',
          marginTop: '20px',
          fontSize: '13px',
          color: 'var(--text2)'
        }}>
          Pas encore de compte ?{' '}
          <Link
            to="/register"
            style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}
          >
            S'inscrire
          </Link>
        </p>
      </div>
    </div>
  )
}

export default LoginPage