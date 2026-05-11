import { useEffect, useRef, useState } from 'react'
import { CloseIcon, TrendUpIcon } from '../components/Icons'
import Toast from '../components/Toast'
import { useToast } from '../hooks/useToast'
import { createAccount, deleteAccount, getAccounts } from '../services/accountService'
import { logout } from '../services/authService'

const TYPE_LABELS = {
  bank: 'Bank',
  cash: 'Cash',
  credit_card: 'Credit Card',
  savings: 'Savings',
}

const TYPE_COLORS = {
  bank: 'from-blue-500/20 to-blue-600/10 border-blue-500/20',
  cash: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/20',
  credit_card: 'from-violet-500/20 to-violet-600/10 border-violet-500/20',
  savings: 'from-amber-500/20 to-amber-600/10 border-amber-500/20',
}

const TYPE_BADGE = {
  bank: 'bg-blue-500/15 text-blue-300',
  cash: 'bg-emerald-500/15 text-emerald-300',
  credit_card: 'bg-violet-500/15 text-violet-300',
  savings: 'bg-amber-500/15 text-amber-300',
}

const inputClass =
  'w-full bg-white/4 border border-white/8 rounded-xl px-4 py-3 text-white text-[14px] placeholder:text-slate-600 outline-none transition-all duration-200 focus:border-blue-500/50 focus:bg-white/[0.07]'

const EMPTY_FORM = { name: '', type: 'bank', balance: '0.00', currency: 'USD' }

export default function DashboardPage({ user, onLogout }) {
  const [accounts, setAccounts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState(null)
  const pendingDeleteTimerRef = useRef(null)
  const { toasts, addToast, removeToast } = useToast()

  useEffect(() => {
    getAccounts()
      .then(setAccounts)
      .catch(() => addToast('error', 'Failed to load accounts.'))
      .finally(() => setIsLoading(false))
  }, [addToast])

  useEffect(() => {
    return () => clearTimeout(pendingDeleteTimerRef.current)
  }, [])

  async function handleLogout() {
    await logout().catch(() => {})
    onLogout()
  }

  function handleFormChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleBalanceKeyDown(e) {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
    e.preventDefault()
    const delta = e.shiftKey ? 0.1 : 1
    const current = parseFloat(form.balance) || 0
    const next = e.key === 'ArrowUp' ? current + delta : current - delta
    setForm((prev) => ({ ...prev, balance: Math.max(0, parseFloat(next.toFixed(2))).toString() }))
  }

  async function handleAddAccount(e) {
    e.preventDefault()
    if (!form.name.trim()) {
      addToast('error', 'Account name is required.')
      return
    }
    setIsSubmitting(true)
    try {
      const account = await createAccount({
        name: form.name.trim(),
        type: form.type,
        balance: parseFloat(form.balance) || 0,
        currency: form.currency.trim() || 'USD',
      })
      setAccounts((prev) => [...prev, account])
      setForm(EMPTY_FORM)
      setShowForm(false)
      addToast('success', `"${account.name}" added.`)
    } catch (err) {
      addToast('error', err.message || 'Failed to add account.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(account) {
    if (pendingDeleteId !== account.id) {
      setPendingDeleteId(account.id)
      clearTimeout(pendingDeleteTimerRef.current)
      pendingDeleteTimerRef.current = setTimeout(() => setPendingDeleteId(null), 3000)
      return
    }
    clearTimeout(pendingDeleteTimerRef.current)
    setPendingDeleteId(null)
    try {
      await deleteAccount(account.id)
      setAccounts((prev) => prev.filter((a) => a.id !== account.id))
      addToast('success', `"${account.name}" deleted.`)
    } catch (err) {
      addToast('error', err.message || 'Failed to delete account.')
    }
  }

  return (
    <div className="min-h-screen bg-[#020817] relative overflow-hidden">

      {/* Ambient orbs */}
      <div
        className="absolute -top-32 -right-32 w-160 h-160 rounded-full bg-blue-600/10 blur-[130px] pointer-events-none"
        style={{ animation: 'floatSlow 14s ease-in-out infinite' }}
      />
      <div
        className="absolute -bottom-40 -left-40 w-180 h-180 rounded-full bg-violet-600/8 blur-[150px] pointer-events-none"
        style={{ animation: 'floatSlow 18s ease-in-out infinite reverse' }}
      />

      {/* Dot grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.08]"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(148,163,184,0.5) 1px, transparent 1px)',
          backgroundSize: '38px 38px',
        }}
      />

      {/* Top bar */}
      <header className="relative border-b border-white/6 bg-white/[0.02] backdrop-blur-xl px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-linear-to-br from-blue-500/15 to-violet-500/15 border border-white/10">
              <TrendUpIcon />
            </div>
            <span className="text-white font-bold text-[17px] tracking-tight">MoneyFlow</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-slate-400 text-[13px] hidden sm:block">{user?.email}</span>
            <button
              type="button"
              onClick={handleLogout}
              className="text-[13px] font-medium text-slate-300 hover:text-white border border-white/8 hover:border-white/[0.14] hover:bg-white/3 px-4 py-1.5 rounded-lg transition-all duration-200"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative max-w-5xl mx-auto px-6 py-10">

        {/* Section header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white text-[20px] font-semibold tracking-tight">Accounts</h2>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="bg-linear-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white text-[13.5px] font-semibold px-4 py-2 rounded-xl transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_6px_20px_-4px_rgba(99,102,241,0.4)]"
          >
            {showForm ? 'Cancel' : '+ Add Account'}
          </button>
        </div>

        {/* Add account form */}
        {showForm && (
          <div
            className="mb-6 bg-white/[0.03] border border-white/8 rounded-2xl p-6"
            style={{ animation: 'fadeInUp 0.3s cubic-bezier(0.22,1,0.36,1) both' }}
          >
            <h3 className="text-white text-[15px] font-semibold mb-5">New account</h3>
            <form onSubmit={handleAddAccount} noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div className="space-y-1.5">
                  <label htmlFor="account-name" className="block text-[12px] font-medium text-slate-400 tracking-wide">Name</label>
                  <input
                    id="account-name"
                    name="name"
                    value={form.name}
                    onChange={handleFormChange}
                    placeholder="e.g. Main Bank"
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="account-type" className="block text-[12px] font-medium text-slate-400 tracking-wide">Type</label>
                  <select
                    id="account-type"
                    name="type"
                    value={form.type}
                    onChange={handleFormChange}
                    className={inputClass}
                  >
                    <option value="bank">Bank</option>
                    <option value="cash">Cash</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="savings">Savings</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="account-balance" className="block text-[12px] font-medium text-slate-400 tracking-wide">Balance</label>
                  <input
                    id="account-balance"
                    name="balance"
                    type="number"
                    step="any"
                    min="0"
                    value={form.balance}
                    onChange={handleFormChange}
                    onKeyDown={handleBalanceKeyDown}
                    placeholder="0.00"
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="account-currency" className="block text-[12px] font-medium text-slate-400 tracking-wide">Currency</label>
                  <input
                    id="account-currency"
                    name="currency"
                    value={form.currency}
                    onChange={handleFormChange}
                    placeholder="USD"
                    maxLength={10}
                    className={inputClass}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-linear-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white text-[13.5px] font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Saving…' : 'Save account'}
              </button>
            </form>
          </div>
        )}

        {/* Account cards */}
        {isLoading ? (
          <div className="text-slate-500 text-[14px] text-center py-20">Loading…</div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-400 text-[15px] mb-1">No accounts yet.</p>
            <p className="text-slate-600 text-[13px]">Add your first account to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((account) => (
              <div
                key={account.id}
                className={`relative bg-linear-to-br ${TYPE_COLORS[account.type] ?? 'from-slate-500/20 to-slate-600/10 border-slate-500/20'} border rounded-2xl p-5 backdrop-blur-sm`}
                style={{ animation: 'fadeInUp 0.4s cubic-bezier(0.22,1,0.36,1) both' }}
              >
                <div className="flex items-start justify-between mb-4">
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${TYPE_BADGE[account.type] ?? 'bg-slate-500/15 text-slate-300'}`}>
                    {TYPE_LABELS[account.type] ?? 'Account'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDelete(account)}
                    aria-label={pendingDeleteId === account.id ? 'Confirm delete' : 'Delete account'}
                    className={`transition-colors duration-150 -mt-0.5 ${
                      pendingDeleteId === account.id
                        ? 'text-red-400 text-[11px] font-semibold'
                        : 'text-slate-600 hover:text-red-400'
                    }`}
                  >
                    {pendingDeleteId === account.id ? 'Delete?' : <CloseIcon />}
                  </button>
                </div>
                <p className="text-white font-semibold text-[16px] mb-1 truncate">{account.name}</p>
                <p className="text-slate-300 text-[22px] font-bold tracking-tight">
                  {parseFloat(account.balance).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  <span className="text-slate-500 text-[13px] font-normal ml-1.5">{account.currency}</span>
                </p>
              </div>
            ))}
          </div>
        )}
      </main>

      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  )
}
