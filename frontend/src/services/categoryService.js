import { handleResponse } from './apiUtils'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export async function getCategories(type) {
  const url = type
    ? `${BASE_URL}/categories?type=${encodeURIComponent(type)}`
    : `${BASE_URL}/categories`
  const res = await fetch(url, { credentials: 'include' })
  return handleResponse(res)
}

export async function createCategory(data) {
  const res = await fetch(`${BASE_URL}/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  return handleResponse(res)
}

export async function updateCategory(id, data) {
  const res = await fetch(`${BASE_URL}/categories/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  return handleResponse(res)
}

export async function deleteCategory(id) {
  const res = await fetch(`${BASE_URL}/categories/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  if (res.status === 204) return
  return handleResponse(res)
}
