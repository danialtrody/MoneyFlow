import { handleResponse } from './apiUtils'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export async function importTransactions(accountId, file) {
  const formData = new FormData()
  formData.append('file', file)
  const response = await fetch(
    `${BASE_URL}/import/transactions?account_id=${accountId}`,
    { method: 'POST', credentials: 'include', body: formData },
  )
  return handleResponse(response)
}
