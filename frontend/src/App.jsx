import { useEffect, useState } from 'react'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import { getMe } from './services/authService'

function App() {
  const [page, setPage] = useState('login')
  const [user, setUser] = useState(null)
  const [checkingAuth, setCheckingAuth] = useState(true)

  useEffect(() => {
    getMe()
      .then((userData) => { if (userData) setUser(userData) })
      .catch(() => {})
      .finally(() => setCheckingAuth(false))
  }, [])

  useEffect(() => {
    function handleAuthExpired() {
      setUser(null)
      setPage('login')
    }
    window.addEventListener('auth:expired', handleAuthExpired)
    return () => window.removeEventListener('auth:expired', handleAuthExpired)
  }, [])

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#020817] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (user) {
    return <DashboardPage user={user} onLogout={() => setUser(null)} />
  }

  if (page === 'register') {
    return <RegisterPage onNavigateToLogin={() => setPage('login')} />
  }

  return (
    <LoginPage
      onNavigateToRegister={() => setPage('register')}
      onLoginSuccess={(userData) => setUser(userData)}
    />
  )
}

export default App
