import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { register } from '../services/authService'
import { useToast } from '../hooks/useToast'
import Toast from '../components/Toast'
import { TrendUpIcon, EyeIcon, EyeOffIcon, ArrowLeftIcon } from '../components/Icons'

const inputClass =
  'w-full bg-white/4 border border-white/8 rounded-xl px-4 py-3.5 text-white text-[14.5px] placeholder:text-slate-600 outline-none transition-all duration-200 focus:border-blue-500/50 focus:bg-white/[0.07] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.09)]'

export default function RegisterPage() {
  const navigate = useNavigate()
  const timerRef = useRef(null)

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { toasts, addToast, removeToast } = useToast()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!fullName || !email || !password || !confirmPassword) {
      addToast('error', 'Please fill in all fields.')
      return
    }
    if (password.length < 8) {
      addToast('error', 'Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      addToast('error', 'Passwords do not match.')
      return
    }
    setIsLoading(true)
    try {
      await register(email, password, fullName)
      addToast('success', 'Account created! Please sign in.')
      timerRef.current = setTimeout(() => navigate('/login', { replace: true }), 1800)
    } catch (err) {
      addToast('error', err.message || 'Registration failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#020817] flex items-center justify-center p-4 relative overflow-hidden">

      {/* Ambient orbs */}
      <div
        className="absolute -top-32 -left-32 w-160 h-160 rounded-full bg-violet-600/10 blur-[130px] pointer-events-none"
        style={{ animation: 'floatSlow 16s ease-in-out infinite' }}
      />
      <div
        className="absolute -bottom-40 -right-40 w-180 h-180 rounded-full bg-blue-600/8 blur-[150px] pointer-events-none"
        style={{ animation: 'floatSlow 20s ease-in-out infinite reverse' }}
      />
      <div
        className="absolute top-1/4 right-1/4 w-95 h-95 rounded-full bg-cyan-500/5 blur-[100px] pointer-events-none"
        style={{ animation: 'floatSlow 24s ease-in-out infinite 3s' }}
      />

      {/* Dot grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.12]"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(148,163,184,0.5) 1px, transparent 1px)',
          backgroundSize: '38px 38px',
        }}
      />

      {/* Card */}
      <div
        className="relative w-full max-w-105"
        style={{ animation: 'fadeInUp 0.65s cubic-bezier(0.22, 1, 0.36, 1) both' }}
      >
        <div className="absolute inset-0 rounded-[28px] bg-linear-to-br from-violet-500/8 to-blue-500/8 blur-2xl scale-[1.06] pointer-events-none" />

        <div className="relative bg-white/2.5 backdrop-blur-2xl border border-white/8 rounded-[28px] p-7 sm:p-10 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.7)]">

          {/* Header */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="flex items-center justify-center w-14.5 h-14.5 rounded-2xl bg-linear-to-br from-violet-500/15 to-blue-500/15 border border-white/10 mb-5 shadow-[0_0_24px_rgba(139,92,246,0.12)]">
              <TrendUpIcon />
            </div>
            <h1 className="text-[26px] font-bold text-white tracking-tight mb-1.5">Create account</h1>
            <p className="text-slate-400 text-[14.5px] leading-relaxed">Start tracking your finances today</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">

            <div className="space-y-2">
              <label htmlFor="reg-name" className="block text-[12.5px] font-medium text-slate-300 tracking-wide">
                Full name
              </label>
              <input
                id="reg-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Alex Johnson"
                autoComplete="name"
                required
                className={inputClass}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="reg-email" className="block text-[12.5px] font-medium text-slate-300 tracking-wide">
                Email address
              </label>
              <input
                id="reg-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                className={inputClass}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="reg-password" className="block text-[12.5px] font-medium text-slate-300 tracking-wide">
                Password
              </label>
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                  required
                  className={`${inputClass} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors duration-150 p-0.5"
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="reg-confirm" className="block text-[12.5px] font-medium text-slate-300 tracking-wide">
                Confirm password
              </label>
              <div className="relative">
                <input
                  id="reg-confirm"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  required
                  className={`${inputClass} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors duration-150 p-0.5"
                >
                  {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 bg-linear-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white font-semibold text-[14.5px] py-3.5 rounded-xl transition-all duration-200 hover:scale-[1.015] hover:shadow-[0_8px_28px_-4px_rgba(139,92,246,0.45)] active:scale-[0.985] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating account…
                </span>
              ) : (
                'Create account'
              )}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-white/6" />
            <span className="text-[11px] text-slate-600 tracking-[0.12em] uppercase">Have an account?</span>
            <div className="flex-1 h-px bg-white/6" />
          </div>

          <button
            type="button"
            onClick={() => navigate('/login')}
            className="flex items-center justify-center gap-2 w-full border border-white/8 hover:border-white/[0.14] hover:bg-white/3 text-slate-300 hover:text-white text-[14px] font-medium py-3.5 rounded-xl transition-all duration-200"
          >
            <ArrowLeftIcon />
            Sign in instead
          </button>

          <p className="text-center text-[11px] text-slate-600 mt-6 leading-relaxed">
            By creating an account you agree to our{' '}
            <a href="#" className="text-slate-500 hover:text-slate-400 transition-colors underline underline-offset-2">Terms</a>{' '}
            and{' '}
            <a href="#" className="text-slate-500 hover:text-slate-400 transition-colors underline underline-offset-2">Privacy Policy</a>
          </p>
        </div>
      </div>

      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  )
}
