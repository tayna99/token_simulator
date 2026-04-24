import { useState, useCallback } from 'react'

export interface Toast {
  id: string
  message: string
}

export function useToast() {
  const [toast, setToast] = useState<Toast | null>(null)

  const show = useCallback((message: string, durationMs = 3000) => {
    const id = Date.now().toString()
    setToast({ id, message })

    const timer = setTimeout(() => {
      setToast(null)
    }, durationMs)

    return () => clearTimeout(timer)
  }, [])

  const hide = useCallback(() => {
    setToast(null)
  }, [])

  return { toast, show, hide }
}
