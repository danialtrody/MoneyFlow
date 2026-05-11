import { handleResponse } from './apiUtils'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export async function getAccounts() {
  const response = await fetch(`${BASE_URL}/accounts`, {
    credentials: 'include',
  })
  return handleResponse(response)
}

export async function createAccount(data) {
  const response = await fetch(`${BASE_URL}/accounts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  return handleResponse(response)
}

export async function deleteAccount(id) {
  const response = await fetch(`${BASE_URL}/accounts/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  if (response.status === 204) return
  return handleResponse(response)
}
