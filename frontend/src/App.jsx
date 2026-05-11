import { useState } from 'react'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'

function App() {
  const [page, setPage] = useState('login')
  const [user, setUser] = useState(null)

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
