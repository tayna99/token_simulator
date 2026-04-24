import type { Toast } from '../../hooks/useToast'

interface Props {
  toast: Toast | null
  onClose: () => void
}

export function Toast({ toast, onClose }: Props) {
  if (!toast) return null

  return (
    <div
      className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg text-sm animate-pulse"
      role="alert"
    >
      {toast.message}
      <button
        onClick={onClose}
        className="ml-4 text-white hover:text-green-100 font-bold"
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  )
}
