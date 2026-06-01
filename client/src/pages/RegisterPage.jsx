import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register as registerApi } from '../api/auth'
import useAuthStore from '../store/authStore'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'

const RegisterPage = () => {
  const navigate = useNavigate()
  const { login } = useAuthStore()

  const [form, setForm] = useState({ email: '', pseudo: '', password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setErrors({ ...errors, [e.target.name]: '' })
  }

  const validate = () => {
    const newErrors = {}
    if (!form.email) newErrors.email = 'Email requis'
    if (!form.pseudo) newErrors.pseudo = 'Pseudo requis'
    if (form.pseudo && form.pseudo.length < 3) newErrors.pseudo = 'Minimum 3 caracteres'
    if (!form.password) newErrors.password = 'Mot de passe requis'
    if (form.password && form.password.length < 6) newErrors.password = 'Minimum 6 caracteres'
    if (form.password !== form.confirm) newErrors.confirm = 'Les mots de passe ne correspondent pas'
    return newErrors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const newErrors = validate()
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setLoading(true)
    try {
      const data = await registerApi(form.email, form.pseudo, form.password)
      localStorage.setItem('astrochat_access_token', data.accessToken)
      login(data.user, data.accessToken)
      navigate('/')
    } catch (err) {
      setErrors({ global: err.response?.data?.message || 'Erreur inscription' })
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
            fontSize: '24px',
            color: 'var(--bg0)',
            fontWeight: 500
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
            Cree ton compte gratuitement
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
            error={errors.email}
          />
          <Input
            label="Pseudo"
            type="text"
            name="pseudo"
            placeholder="ton_pseudo"
            value={form.pseudo}
            onChange={handleChange}
            error={errors.pseudo}
          />
          <Input
            label="Mot de passe"
            type="password"
            name="password"
            placeholder="••••••••"
            value={form.password}
            onChange={handleChange}
            error={errors.password}
          />
          <Input
            label="Confirmer le mot de passe"
            type="password"
            name="confirm"
            placeholder="••••••••"
            value={form.confirm}
            onChange={handleChange}
            error={errors.confirm}
          />

          {errors.global && (
            <div style={{
              background: '#ff3c3c22',
              border: '1px solid #ff3c3c44',
              borderRadius: '8px',
              padding: '10px 12px',
              fontSize: '13px',
              color: '#ff6b6b'
            }}>
              {errors.global}
            </div>
          )}

          <Button
            type="submit"
            fullWidth
            loading={loading}
            size="lg"
            style={{ marginTop: '4px' }}
          >
            Creer mon compte
          </Button>
        </form>

        <p style={{
          textAlign: 'center',
          marginTop: '20px',
          fontSize: '13px',
          color: 'var(--text2)'
        }}>
          Deja un compte ?{' '}
          <Link
            to="/login"
            style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}
          >
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}

export default RegisterPage