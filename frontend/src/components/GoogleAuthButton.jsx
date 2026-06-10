import { useState } from 'react'
import { useGoogleLogin } from '@react-oauth/google'
import { GoogleIcon } from './Icons'

export default function GoogleAuthButton({ onSuccess, onError, className = '' }) {
  const [isLoading, setIsLoading] = useState(false)

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsLoading(true)
      try {
        await onSuccess(tokenResponse.access_token)
      } finally {
        setIsLoading(false)
      }
    },
    onError: () => onError?.(),
  })

  return (
    <button
      type="button"
      onClick={() => googleLogin()}
      disabled={isLoading}
      className={`flex items-center justify-center gap-3 w-full border border-white/8 hover:border-white/[0.14] hover:bg-white/3 text-slate-300 hover:text-white text-[14px] font-medium py-3.5 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {isLoading ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Signing in…
        </span>
      ) : (
        <>
          <GoogleIcon />
          Continue with Google
        </>
      )}
    </button>
  )
}
