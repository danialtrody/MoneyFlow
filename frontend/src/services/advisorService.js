const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export async function streamChat(message, periodDays, history) {
  const res = await fetch(`${BASE_URL}/ai/chat`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, period_days: periodDays, history }),
  })
  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent('auth:expired'))
    throw new Error('Session expired')
  }
  if (!res.ok) throw new Error('Request failed')
  return res.body.getReader()
}
