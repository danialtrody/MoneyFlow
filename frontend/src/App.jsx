import { useState } from 'react'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'

function App() {
  const [page, setPage] = useState('login')
  const [authed, setAuthed] = useState(false)

  if (authed) {
    return (
      <div className="min-h-screen bg-[#020817] flex items-center justify-center">
        <p className="text-slate-400 text-sm">Dashboard coming soon.</p>
      </div>
    )
  }

  if (page === 'register') {
    return <RegisterPage onNavigateToLogin={() => setPage('login')} />
  }

  return (
    <LoginPage
      onNavigateToRegister={() => setPage('register')}
      onLoginSuccess={() => setAuthed(true)}
    />
  )
}

export default App
