export async function handleResponse(response) {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const detail = Array.isArray(data.detail)
      ? data.detail.map((e) => (typeof e === 'object' ? e.msg : e)).join(' ')
      : data.detail || 'Something went wrong.'
    throw new Error(detail)
  }
  return data
}
