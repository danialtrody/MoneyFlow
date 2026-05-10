import { SuccessIcon, ErrorIcon, CloseIcon } from './Icons'

const TOAST_CONFIG = {
  success: {
    accent: 'bg-green-500',
    iconBg: 'bg-green-500/10',
    iconColor: 'text-green-400',
    titleColor: 'text-green-400',
    border: 'border-green-500/20',
    title: 'Success',
  },
  error: {
    accent: 'bg-red-500',
    iconBg: 'bg-red-500/10',
    iconColor: 'text-red-400',
    titleColor: 'text-red-400',
    border: 'border-red-500/20',
    title: 'Error',
  },
}

function ToastItem({ toast, onRemove }) {
  const c = TOAST_CONFIG[toast.type] || TOAST_CONFIG.error

  return (
    <div
      className={`relative flex items-start gap-3 w-85 bg-white/4 backdrop-blur-2xl border ${c.border} rounded-2xl px-4 py-3.5 shadow-[0_24px_64px_-8px_rgba(0,0,0,0.65)] pointer-events-auto overflow-hidden`}
      style={{ animation: 'toastIn 0.4s cubic-bezier(0.22,1,0.36,1) both' }}
      role="alert"
    >
      {/* Left accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-0.75 ${c.accent}`} />

      {/* Icon */}
      <div className={`flex items-center justify-center w-8 h-8 rounded-xl shrink-0 ml-1 ${c.iconBg} ${c.iconColor}`}>
        {toast.type === 'success' ? <SuccessIcon /> : <ErrorIcon />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <p className={`text-[12.5px] font-semibold mb-0.5 ${c.titleColor}`}>{c.title}</p>
        <p className="text-[12.5px] text-slate-300 leading-snug wrap-break-word">{toast.message}</p>
      </div>

      {/* Dismiss */}
      <button
        type="button"
        onClick={() => onRemove(toast.id)}
        aria-label="Dismiss notification"
        className="text-slate-500 hover:text-slate-300 transition-colors duration-150 shrink-0 mt-0.5"
      >
        <CloseIcon />
      </button>
    </div>
  )
}

export default function Toast({ toasts, removeToast }) {
  if (!toasts.length) return null

  return (
    <div
      className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 pointer-events-none"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  )
}
