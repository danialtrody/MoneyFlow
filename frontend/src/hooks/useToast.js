import { useState, useCallback, useRef, useEffect } from 'react'

export function useToast() {
  const [toasts, setToasts] = useState([])
  const timersRef = useRef({})

  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach(clearTimeout)
    }
  }, [])

  const removeToast = useCallback((id) => {
    clearTimeout(timersRef.current[id])
    delete timersRef.current[id]
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback((type, message) => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, type, message }])
    timersRef.current[id] = setTimeout(() => {
      delete timersRef.current[id]
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4500)
  }, [])

  return { toasts, addToast, removeToast }
}
