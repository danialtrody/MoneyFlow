import { useEffect, useState } from 'react'

function App() {
  const [status, setStatus] = useState('Checking...')

  useEffect(() => {
    fetch('http://localhost:8000/health-db')
      .then(res => res.json())
      .then(data => setStatus(data.status))
      .catch(() => setStatus('Could not reach backend'))
  }, [])

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <p>{status}</p>
    </div>
  )
}

export default App
