import { handleResponse } from './apiUtils'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export async function login(email, password) {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  })
  return handleResponse(response, { skipAuthRedirect: true })
}

export async function logout() {
  const response = await fetch(`${BASE_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  })
  return handleResponse(response)
}

export async function getMe() {
  const response = await fetch(`${BASE_URL}/auth/me`, { credentials: 'include' })
  if (response.status === 401) return null
  return handleResponse(response)
}

export async function register(email, password, fullName) {
  const response = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password, full_name: fullName }),
  })
  return handleResponse(response)
}
