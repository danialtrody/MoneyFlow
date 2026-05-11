import { handleResponse } from './apiUtils'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export async function getTransactions(accountId) {
  const response = await fetch(`${BASE_URL}/transactions?account_id=${accountId}`, { credentials: 'include' })
  return handleResponse(response)
}

export async function createTransaction(data) {
  const response = await fetch(`${BASE_URL}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  return handleResponse(response)
}

export async function deleteTransaction(id) {
  const response = await fetch(`${BASE_URL}/transactions/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  if (response.status === 204) return
  return handleResponse(response)
}
