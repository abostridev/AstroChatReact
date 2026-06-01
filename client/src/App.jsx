import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './store/authStore'
import useThemeStore from './store/themeStore'
import { getMe } from './api/auth'
import Spinner from './components/ui/Spinner'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'

const App = () => {
  const { isAuthenticated, isLoading, login, logout, setLoading } = useAuthStore()
  const { initTheme } = useThemeStore()

  useEffect(() => {
    initTheme()

    const checkAuth = async () => {
      const token = localStorage.getItem('astrochat_access_token')
      if (!token) {
        setLoading(false)
        return
      }

      try {
        const data = await getMe()
        login(data.user, token)
      } catch (error) {
        localStorage.removeItem('astrochat_access_token')
        logout()
      }
    }

    checkAuth()
  }, [])

  if (isLoading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg0)'
      }}>
        <Spinner size={40} />
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            isAuthenticated
              ? <Navigate to="/" replace />
              : <LoginPage />
          }
        />
        <Route
          path="/register"
          element={
            isAuthenticated
              ? <Navigate to="/" replace />
              : <RegisterPage />
          }
        />
        <Route
          path="/*"
          element={
            isAuthenticated
              ? <div style={{ color: 'var(--text)', padding: '20px' }}>Chat - bientot</div>
              : <Navigate to="/login" replace />
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App