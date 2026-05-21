import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { useAuth } from '../context/AuthContext'
import EditProfileModal from '../components/EditProfileModal'
import { ArrowLeftIcon, BarChartIcon, ClipboardCheckIcon, ClipboardIcon, CloseIcon, MenuIcon, PencilIcon, SparklesIcon, TrashIcon, TrendUpIcon } from '../components/Icons'
import Toast from '../components/Toast'
import { useToast } from '../hooks/useToast'
import { streamChat } from '../services/advisorService'

const PERIODS = [
  { key: 'all', label: 'All', days: null },
  { key: '7d', label: '7D', days: 7 },
  { key: '30d', label: '30D', days: 30 },
  { key: '3m', label: '3M', days: 90 },
  { key: '6m', label: '6M', days: 180 },
  { key: '1y', label: '1Y', days: 365 },
  { key: '3y', label: '3Y', days: 1095 },
]

const SUGGESTIONS = [
  'סכם את ההוצאות שלי בתקופה זו',
  'איפה אני יכול לחסוך?',
  'מה קטגוריית ההוצאה הגדולה ביותר שלי?',
  'איך ההכנסה שלי משתווה להוצאות?',
  'מה מצב הבריאות הפיננסית שלי?',
]

export default function AdvisorPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { toasts, addToast, removeToast } = useToast()

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState('all')
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [followUps, setFollowUps] = useState([])
  const [copiedId, setCopiedId] = useState(null)
  const msgCounterRef = useRef(0)

  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const readerRef = useRef(null)

  useEffect(() => () => { readerRef.current?.cancel() }, [])

  const periodDays = PERIODS.find((p) => p.key === selectedPeriod)?.days ?? null

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  function handlePeriodChange(key) {
    if (key === selectedPeriod) return
    setSelectedPeriod(key)
    setMessages([])
    setFollowUps([])
  }

  function handleClearChat() {
    setMessages([])
    setFollowUps([])
  }

  async function handleCopy(id, text) {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      addToast('error', 'Failed to copy to clipboard.')
    }
  }

  function getHistory() {
    return messages.map((m) => ({ role: m.role, content: m.content }))
  }

  async function sendMessage(text) {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const userMsg = { id: msgCounterRef.current++, role: 'user', content: trimmed }
    const aiMsg = { id: msgCounterRef.current++, role: 'model', content: '' }

    setMessages((prev) => [...prev, userMsg, aiMsg])
    setInput('')
    setLoading(true)

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      const reader = await streamChat(trimmed, periodDays, getHistory())
      readerRef.current = reader

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const token = JSON.parse(line.slice(6))
          if (token === '[DONE]') {
            setMessages((prev) => {
              const updated = [...prev]
              const last = updated[updated.length - 1]
              const followupMatch = last.content.match(/\nFOLLOWUPS: (.+)$/)
              if (followupMatch) {
                const questions = followupMatch[1].split(' | ').map(q => q.trim()).filter(Boolean)
                setFollowUps(questions)
                updated[updated.length - 1] = {
                  ...last,
                  content: last.content.replace(/\nFOLLOWUPS: .+$/, '').trim(),
                }
              }
              return updated
            })
            setLoading(false)
            return
          }
          if (typeof token === 'string' && token.startsWith('[ERROR]')) {
            addToast('error', token.replace('[ERROR] ', ''))
            setLoading(false)
            return
          }
          setMessages((prev) => {
            const updated = [...prev]
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              content: updated[updated.length - 1].content + token,
            }
            return updated
          })
        }
      }
    } catch {
      addToast('error', 'Failed to connect to the AI advisor.')
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    sendMessage(input)
  }

  function handleSuggestion(text) {
    sendMessage(text)
  }

  const periodLabel = PERIODS.find((p) => p.key === selectedPeriod)?.label ?? 'All'

  return (
    <div className="min-h-screen bg-[#020817] flex flex-col">
      {/* Header */}
      <header className="relative border-b border-white/6 bg-white/2 backdrop-blur-xl px-6 shrink-0">
        <div className="max-w-5xl mx-auto flex items-center justify-between py-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-linear-to-br from-blue-500/15 to-violet-500/15 border border-white/10">
              <TrendUpIcon />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-white font-bold text-[17px] tracking-tight">MoneyFlow</span>
              <span className="text-slate-600 text-[14px] hidden sm:inline">/</span>
              <span className="text-slate-400 text-[14px] hidden sm:inline">AI Advisor</span>
            </div>
          </div>

          {/* Desktop actions — right */}
          <div className="hidden sm:flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-1.5 text-[13px] font-medium text-slate-300 hover:text-white border border-white/8 hover:border-white/[0.14] hover:bg-white/3 px-4 py-1.5 rounded-lg transition-all duration-200"
            >
              <ArrowLeftIcon />
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => navigate('/analytics')}
              className="flex items-center gap-1.5 text-[13px] font-medium text-slate-300 hover:text-white border border-white/8 hover:border-white/[0.14] hover:bg-white/3 px-4 py-1.5 rounded-lg transition-all duration-200"
            >
              <BarChartIcon />
              Analytics
            </button>
            <button
              type="button"
              onClick={() => setShowEditProfile(true)}
              className="flex items-center gap-1.5 text-[13px] font-medium text-slate-300 hover:text-white border border-white/8 hover:border-white/[0.14] hover:bg-white/3 px-4 py-1.5 rounded-lg transition-all duration-200"
            >
              <PencilIcon />
              Edit Profile
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="text-[13px] font-medium text-slate-300 hover:text-white border border-white/8 hover:border-white/[0.14] hover:bg-white/3 px-4 py-1.5 rounded-lg transition-all duration-200"
            >
              Logout
            </button>
          </div>

          {/* Mobile quick actions + hamburger */}
          <div className="sm:hidden">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="text-[13px] font-medium text-slate-300 hover:text-white border border-white/8 hover:border-white/[0.14] hover:bg-white/3 px-3 py-1.5 rounded-lg transition-all duration-200"
              >
                Dashboard
              </button>
              <button
                type="button"
                onClick={() => setShowMobileMenu((m) => !m)}
                className="text-slate-400 hover:text-white transition-colors duration-150 p-2 rounded-lg hover:bg-white/4"
                aria-label="Toggle menu"
              >
                {showMobileMenu ? <CloseIcon /> : <MenuIcon />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {showMobileMenu && (
          <div
            className="sm:hidden border-t border-white/8 max-w-5xl mx-auto pb-3 pt-2"
            style={{ animation: 'slideDown 0.18s cubic-bezier(0.22,1,0.36,1) both' }}
          >
            <div className="flex items-center gap-3 px-1 py-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-300 text-[11px] font-bold">
                {user?.full_name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div>
                <p className="text-white text-[13px] font-medium">{user?.full_name}</p>
                <p className="text-slate-500 text-[11px]">{user?.email}</p>
              </div>
            </div>
            <div className="space-y-0.5">
              <button
                type="button"
                onClick={() => { setShowEditProfile(true); setShowMobileMenu(false) }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium text-slate-300 hover:text-white hover:bg-white/6 rounded-xl transition-all duration-150 group"
              >
                <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors duration-150"><PencilIcon /></span>
                Edit Profile
              </button>
              <button
                type="button"
                onClick={() => { navigate('/dashboard'); setShowMobileMenu(false) }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium text-slate-300 hover:text-white hover:bg-white/6 rounded-xl transition-all duration-150 group"
              >
                <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors duration-150"><ArrowLeftIcon /></span>
                Dashboard
              </button>
              <button
                type="button"
                onClick={() => { navigate('/analytics'); setShowMobileMenu(false) }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium text-slate-300 hover:text-white hover:bg-white/6 rounded-xl transition-all duration-150 group"
              >
                <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors duration-150"><BarChartIcon /></span>
                Analytics
              </button>
            </div>
            <div className="mt-2 pt-2 border-t border-white/6">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium text-red-400 hover:text-red-300 hover:bg-red-500/8 rounded-xl transition-all duration-150"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Period selector */}
      <div className="shrink-0 border-b border-white/6 py-3">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center gap-2">
          <span className="text-slate-500 text-[12px] mr-1">Period:</span>
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => handlePeriodChange(p.key)}
              className={`px-3 py-1 rounded-lg text-[12px] font-medium transition-all duration-150 ${
                selectedPeriod === p.key
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  : 'text-slate-400 hover:text-white border border-transparent hover:border-white/10 hover:bg-white/4'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto category-list py-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col gap-4">

          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-75 gap-6">
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-blue-500/20 to-violet-500/20 border border-white/10 flex items-center justify-center text-blue-300">
                  <SparklesIcon />
                </div>
                <div className="text-center">
                  <p className="text-white font-semibold text-[16px]">AI Financial Advisor</p>
                  <p className="text-slate-500 text-[13px] mt-1">
                    Ask anything about your finances — data from <span className="text-slate-400">{periodLabel}</span>
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 justify-center max-w-xl">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    dir="rtl"
                    onClick={() => handleSuggestion(s)}
                    className="text-[12px] text-slate-300 border border-white/10 hover:border-white/20 hover:bg-white/4 hover:text-white px-3 py-2 rounded-xl transition-all duration-150"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={msg.id} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'model' && (
                <div className="w-8 h-8 rounded-xl bg-linear-to-br from-blue-500/25 to-violet-500/25 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                  <SparklesIcon />
                </div>
              )}
              <div className="flex flex-col gap-1 max-w-[78%]">
                <div
                  className={`rounded-2xl px-4 py-3 text-[14px] leading-7 ${
                    msg.role === 'user'
                      ? 'bg-linear-to-br from-blue-600/30 to-violet-600/20 border border-blue-500/20 text-white'
                      : 'bg-white/4 border border-white/8 text-slate-100'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <span>{msg.content}</span>
                  ) : msg.content ? (
                    <div className="ai-prose">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    loading && i === messages.length - 1 ? (
                      <span className="flex gap-1 items-center h-5">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </span>
                    ) : null
                  )}
                </div>
                {msg.role === 'model' && msg.content && (
                  <button
                    type="button"
                    onClick={() => handleCopy(msg.id, msg.content)}
                    className="self-start flex items-center gap-1.5 text-[11px] text-slate-600 hover:text-slate-400 transition-colors duration-150 px-1"
                  >
                    {copiedId === msg.id ? <ClipboardCheckIcon /> : <ClipboardIcon />}
                    {copiedId === msg.id ? 'Copied!' : 'Copy'}
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Follow-up suggestions */}
          {followUps.length > 0 && !loading && (
            <div className="flex flex-wrap gap-2 pt-1">
              {followUps.map((q, i) => (
                <button
                  key={`fu-${i}`}
                  type="button"
                  onClick={() => { setFollowUps([]); sendMessage(q) }}
                  className="text-[12px] text-slate-300 border border-white/10 hover:border-white/20 hover:bg-white/4 hover:text-white px-3 py-2 rounded-xl transition-all duration-150"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input bar */}
      <div className="shrink-0 border-t border-white/6 bg-white/2 py-4">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col gap-2">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your finances…"
              disabled={loading}
              className="flex-1 bg-white/4 border border-white/8 rounded-xl px-4 py-3 text-white text-[14px] placeholder:text-slate-600 outline-none transition-all duration-200 focus:border-blue-500/50 focus:bg-white/7 disabled:opacity-50"
            />
            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleClearChat}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border border-white/8 hover:border-white/[0.14] hover:bg-white/3 text-slate-400 hover:text-white text-[13px] transition-all duration-200"
                title="Clear chat"
              >
                <TrashIcon />
              </button>
            )}
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600/80 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[13px] font-medium transition-all duration-200 border border-blue-500/30"
            >
              <SparklesIcon />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        </div>
      </div>

      {showEditProfile && (
        <EditProfileModal
          onClose={() => setShowEditProfile(false)}
          onSuccess={() => addToast('success', 'Profile updated')}
        />
      )}

      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  )
}
