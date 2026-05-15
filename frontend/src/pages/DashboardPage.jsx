import { useEffect, useRef, useState } from 'react'
import { ChevronDownIcon, CloseIcon, TrashIcon, TrendUpIcon } from '../components/Icons'
import Toast from '../components/Toast'
import { useToast } from '../hooks/useToast'
import { createAccount, deleteAccount, getAccounts } from '../services/accountService'
import { logout } from '../services/authService'
import { createCategory, deleteCategory, getCategories } from '../services/categoryService'
import {
  createTransaction,
  deleteTransaction,
  getTransactions,
} from '../services/transactionService'

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

const EMPTY_ACCOUNT_FORM = { name: '', type: 'bank', balance: '0.00', currency: 'USD' }

const today = () => new Date().toISOString().split('T')[0]
const emptyTxForm = () => ({ type: 'income', amount: '', category_id: '', description: '', date: today() })

export default function DashboardPage({ user, onLogout }) {
  const [accounts, setAccounts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_ACCOUNT_FORM)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState(null)
  const pendingDeleteTimerRef = useRef(null)

  const [selectedAccountId, setSelectedAccountId] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loadingTx, setLoadingTx] = useState(false)
  const [showAddTx, setShowAddTx] = useState(false)
  const [txForm, setTxForm] = useState(emptyTxForm)
  const [isSubmittingTx, setIsSubmittingTx] = useState(false)
  const [pendingDeleteTxId, setPendingDeleteTxId] = useState(null)
  const pendingDeleteTxTimerRef = useRef(null)
  const selectedAccountIdRef = useRef(null)
  const [categories, setCategories] = useState([])
  const categoriesLoadedRef = useRef(false)
  const [showNewCat, setShowNewCat] = useState(false)
  const [newCatForm, setNewCatForm] = useState({ name: '' })
  const [isSubmittingCat, setIsSubmittingCat] = useState(false)
  const [pendingDeleteCatId, setPendingDeleteCatId] = useState(null)
  const pendingDeleteCatTimerRef = useRef(null)
  const [showCatDropdown, setShowCatDropdown] = useState(false)
  const catDropdownRef = useRef(null)

  const { toasts, addToast, removeToast } = useToast()

  useEffect(() => {
    getAccounts()
      .then(setAccounts)
      .catch(() => addToast('error', 'Failed to load accounts.'))
      .finally(() => setIsLoading(false))
  }, [addToast])

  useEffect(() => {
    return () => {
      clearTimeout(pendingDeleteTimerRef.current)
      clearTimeout(pendingDeleteTxTimerRef.current)
      clearTimeout(pendingDeleteCatTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!showCatDropdown) return
    function handleClickOutside(e) {
      if (catDropdownRef.current && !catDropdownRef.current.contains(e.target)) {
        setShowCatDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showCatDropdown])

  useEffect(() => {
    selectedAccountIdRef.current = selectedAccountId
  }, [selectedAccountId])

  useEffect(() => {
    if (selectedAccountId === null) {
      setTransactions([])
      return
    }
    setLoadingTx(true)
    getTransactions(selectedAccountId)
      .then(setTransactions)
      .catch(() => addToast('error', 'Failed to load transactions.'))
      .finally(() => setLoadingTx(false))
  }, [selectedAccountId, addToast])

  useEffect(() => {
    if (!showAddTx || categoriesLoadedRef.current) return
    getCategories()
      .then((data) => {
        categoriesLoadedRef.current = true
        setCategories(data)
      })
      .catch(() => addToast('error', 'Failed to load categories.'))
  }, [showAddTx, addToast])

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) ?? null

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
      setForm(EMPTY_ACCOUNT_FORM)
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
    if (selectedAccountId === account.id) {
      setSelectedAccountId(null)
    }
    try {
      await deleteAccount(account.id)
      setAccounts((prev) => prev.filter((a) => a.id !== account.id))
      addToast('success', `"${account.name}" deleted.`)
    } catch (err) {
      addToast('error', err.message || 'Failed to delete account.')
    }
  }

  function handleSelectAccount(account) {
    setSelectedAccountId((prev) => (prev === account.id ? null : account.id))
    setShowAddTx(false)
    setTxForm(emptyTxForm())
    setPendingDeleteTxId(null)
  }

  function handleTxFormChange(e) {
    const { name, value } = e.target
    setTxForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'type' ? { category_id: '' } : {}),
    }))
    if (name === 'type') {
      setShowNewCat(false)
      setNewCatForm({ name: '' })
      setPendingDeleteCatId(null)
      setShowCatDropdown(false)
    }
  }

  async function handleAddCategory() {
    if (!newCatForm.name.trim()) {
      addToast('error', 'Category name is required.')
      return
    }
    setIsSubmittingCat(true)
    try {
      const cat = await createCategory({
        name: newCatForm.name.trim(),
        type: txForm.type,
      })
      setCategories((prev) => [...prev, cat])
      setTxForm((prev) => ({ ...prev, category_id: String(cat.id) }))
      setNewCatForm({ name: '' })
      setShowNewCat(false)
      addToast('success', `Category "${cat.name}" created.`)
    } catch (err) {
      addToast('error', err.message || 'Failed to create category.')
    } finally {
      setIsSubmittingCat(false)
    }
  }

  async function handleDeleteCategory(cat) {
    if (pendingDeleteCatId !== cat.id) {
      setPendingDeleteCatId(cat.id)
      clearTimeout(pendingDeleteCatTimerRef.current)
      pendingDeleteCatTimerRef.current = setTimeout(() => setPendingDeleteCatId(null), 3000)
      return
    }
    clearTimeout(pendingDeleteCatTimerRef.current)
    setPendingDeleteCatId(null)
    try {
      await deleteCategory(cat.id)
      setCategories((prev) => prev.filter((c) => c.id !== cat.id))
      if (txForm.category_id === String(cat.id)) {
        setTxForm((prev) => ({ ...prev, category_id: '' }))
      }
      addToast('success', `Category "${cat.name}" deleted.`)
    } catch (err) {
      addToast('error', err.message || 'Failed to delete category.')
    }
  }

  async function handleAddTransaction(e) {
    e.preventDefault()
    if (!txForm.category_id) {
      addToast('error', 'Category is required.')
      return
    }
    if (!txForm.amount || parseFloat(txForm.amount) <= 0) {
      addToast('error', 'Amount must be greater than 0.')
      return
    }
    const accountId = selectedAccountId
    setIsSubmittingTx(true)
    try {
      await createTransaction({
        account_id: accountId,
        type: txForm.type,
        amount: parseFloat(txForm.amount),
        category_id: parseInt(txForm.category_id, 10),
        description: txForm.description.trim() || null,
        date: txForm.date || today(),
      })
      const [updatedAccounts, updatedTxs] = await Promise.all([
        getAccounts(),
        getTransactions(accountId),
      ])
      setAccounts(updatedAccounts)
      if (selectedAccountIdRef.current === accountId) {
        setTransactions(updatedTxs)
      }
      setTxForm(emptyTxForm())
      setShowAddTx(false)
      addToast('success', 'Transaction added.')
    } catch (err) {
      addToast('error', err.message || 'Failed to add transaction.')
    } finally {
      setIsSubmittingTx(false)
    }
  }

  function handleToggleAddTx() {
    setShowAddTx((v) => !v)
    setTxForm(emptyTxForm())
    setShowNewCat(false)
    setNewCatForm({ name: '' })
    setPendingDeleteCatId(null)
    setShowCatDropdown(false)
  }

  function handleCancelNewCat() {
    setShowNewCat(false)
    setNewCatForm({ name: '' })
  }

  async function handleDeleteTransaction(tx) {
    if (pendingDeleteTxId !== tx.id) {
      setPendingDeleteTxId(tx.id)
      clearTimeout(pendingDeleteTxTimerRef.current)
      pendingDeleteTxTimerRef.current = setTimeout(() => setPendingDeleteTxId(null), 3000)
      return
    }
    clearTimeout(pendingDeleteTxTimerRef.current)
    setPendingDeleteTxId(null)
    const accountId = selectedAccountId
    try {
      await deleteTransaction(tx.id)
      const [updatedAccounts, updatedTxs] = await Promise.all([
        getAccounts(),
        getTransactions(accountId),
      ])
      setAccounts(updatedAccounts)
      if (selectedAccountIdRef.current === accountId) {
        setTransactions(updatedTxs)
      }
      addToast('success', 'Transaction deleted.')
    } catch (err) {
      addToast('error', err.message || 'Failed to delete transaction.')
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
                role="button"
                tabIndex={0}
                onClick={() => handleSelectAccount(account)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelectAccount(account) } }}
                className={`relative bg-linear-to-br ${TYPE_COLORS[account.type] ?? 'from-slate-500/20 to-slate-600/10 border-slate-500/20'} border rounded-2xl p-5 backdrop-blur-sm cursor-pointer transition-all duration-200 hover:scale-[1.01] ${
                  selectedAccountId === account.id ? 'ring-2 ring-blue-500/50' : ''
                }`}
                style={{ animation: 'fadeInUp 0.4s cubic-bezier(0.22,1,0.36,1) both' }}
              >
                <div className="flex items-start justify-between mb-4">
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${TYPE_BADGE[account.type] ?? 'bg-slate-500/15 text-slate-300'}`}>
                    {TYPE_LABELS[account.type] ?? 'Account'}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDelete(account) }}
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

        {/* Transactions panel */}
        {selectedAccount && (
          <div
            className="mt-8 bg-white/[0.02] border border-white/8 rounded-2xl overflow-hidden"
            style={{ animation: 'fadeInUp 0.3s cubic-bezier(0.22,1,0.36,1) both' }}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/6">
              <h3 className="text-white text-[15px] font-semibold">
                {selectedAccount.name}
                <span className="text-slate-500 font-normal ml-2 text-[13px]">transactions</span>
              </h3>
              <button
                type="button"
                onClick={handleToggleAddTx}
                className="bg-linear-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white text-[12.5px] font-semibold px-3.5 py-1.5 rounded-lg transition-all duration-200"
              >
                {showAddTx ? 'Cancel' : '+ Add Transaction'}
              </button>
            </div>

            {/* Add transaction form */}
            {showAddTx && (
              <div className="px-6 py-5 border-b border-white/6">
                <form onSubmit={handleAddTransaction} noValidate>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    <div className="space-y-1.5">
                      <label htmlFor="tx-type" className="block text-[12px] font-medium text-slate-400 tracking-wide">Type</label>
                      <select id="tx-type" name="type" value={txForm.type} onChange={handleTxFormChange} className={inputClass}>
                        <option value="income">Income</option>
                        <option value="expense">Expense</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="tx-amount" className="block text-[12px] font-medium text-slate-400 tracking-wide">Amount</label>
                      <input
                        id="tx-amount"
                        name="amount"
                        type="number"
                        step="any"
                        min="0.01"
                        value={txForm.amount}
                        onChange={handleTxFormChange}
                        placeholder="0.00"
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="tx-category" className="block text-[12px] font-medium text-slate-400 tracking-wide">Category</label>
                      <div className="relative" ref={catDropdownRef}>
                        <button
                          id="tx-category"
                          type="button"
                          onClick={() => setShowCatDropdown((v) => !v)}
                          className={`${inputClass} flex items-center justify-between`}
                        >
                          <span className={txForm.category_id ? 'text-white' : 'text-slate-600'}>
                            {txForm.category_id
                              ? (categories.find((c) => String(c.id) === txForm.category_id)?.name ?? 'Select category…')
                              : 'Select category…'}
                          </span>
                          <ChevronDownIcon />
                        </button>
                        {showCatDropdown && (
                          <div className="absolute z-20 w-full mt-1 bg-[#0c1628] border border-white/10 rounded-xl overflow-hidden shadow-2xl max-h-52 overflow-y-auto">
                            <button
                              type="button"
                              onClick={() => { setTxForm((p) => ({ ...p, category_id: '' })); setShowCatDropdown(false) }}
                              className="w-full text-left px-4 py-2.5 text-[13px] text-slate-500 hover:bg-white/4"
                            >
                              Select category…
                            </button>
                            {categories.filter((c) => c.type === txForm.type).map((cat) => (
                              <div
                                key={cat.id}
                                className="flex items-center border-t border-white/4 hover:bg-white/4"
                              >
                                <button
                                  type="button"
                                  onClick={() => { setTxForm((p) => ({ ...p, category_id: String(cat.id) })); setShowCatDropdown(false) }}
                                  className="flex-1 text-left px-4 py-2.5 text-[13px] text-white"
                                >
                                  {cat.name}
                                </button>
                                {cat.user_id != null && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteCategory(cat)}
                                    aria-label={pendingDeleteCatId === cat.id ? 'Confirm delete' : 'Delete category'}
                                    className={`px-3 py-2.5 text-[11px] font-semibold transition-colors flex-shrink-0 ${
                                      pendingDeleteCatId === cat.id ? 'text-red-400' : 'text-slate-600 hover:text-red-400'
                                    }`}
                                  >
                                    {pendingDeleteCatId === cat.id ? 'Delete?' : '×'}
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      {!showNewCat ? (
                        <button
                          type="button"
                          onClick={() => setShowNewCat(true)}
                          className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors mt-1"
                        >
                          + New category
                        </button>
                      ) : (
                        <div className="mt-2 flex flex-wrap gap-2 items-center">
                          <input
                            aria-label="New category name"
                            value={newCatForm.name}
                            onChange={(e) => setNewCatForm((p) => ({ ...p, name: e.target.value }))}
                            placeholder="Category name"
                            maxLength={100}
                            className="flex-1 bg-white/4 border border-white/8 rounded-lg px-3 py-2 text-white text-[13px] placeholder:text-slate-600 outline-none focus:border-blue-500/50"
                          />
                          <button
                            type="button"
                            onClick={handleAddCategory}
                            disabled={isSubmittingCat}
                            className="text-[12px] font-semibold text-white bg-blue-600 hover:bg-blue-500 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {isSubmittingCat ? '…' : 'Add'}
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelNewCat}
                            className="text-[12px] text-slate-500 hover:text-slate-300 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="tx-description" className="block text-[12px] font-medium text-slate-400 tracking-wide">Description (optional)</label>
                      <input
                        id="tx-description"
                        name="description"
                        value={txForm.description}
                        onChange={handleTxFormChange}
                        placeholder="Optional note"
                        maxLength={500}
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="tx-date" className="block text-[12px] font-medium text-slate-400 tracking-wide">Date</label>
                      <input
                        id="tx-date"
                        name="date"
                        type="date"
                        value={txForm.date}
                        onChange={handleTxFormChange}
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmittingTx}
                    className="bg-linear-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white text-[13px] font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmittingTx ? 'Saving…' : 'Save transaction'}
                  </button>
                </form>
              </div>
            )}

            {/* Transaction list */}
            {loadingTx ? (
              <div className="text-slate-500 text-[13px] text-center py-12">Loading…</div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-500 text-[13px]">No transactions yet for this account.</p>
              </div>
            ) : (
              <ul>
                {transactions.map((tx) => (
                  <li
                    key={tx.id}
                    className="flex items-center justify-between px-6 py-3.5 border-b border-white/4 last:border-0 hover:bg-white/[0.02] transition-colors duration-150"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div
                        className={`w-1.5 h-8 rounded-full flex-shrink-0 ${
                          tx.type === 'income' ? 'bg-emerald-500' : 'bg-red-500'
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="text-white text-[13.5px] font-medium truncate">{tx.category_name}</p>
                        {tx.description && (
                          <p className="text-slate-500 text-[12px] truncate">{tx.description}</p>
                        )}
                        <p className="text-slate-600 text-[11px]">{tx.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                      <span
                        className={`text-[15px] font-bold tracking-tight ${
                          tx.type === 'income' ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {tx.type === 'income' ? '+' : '−'}
                        {parseFloat(tx.amount).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                        <span className="text-slate-500 text-[11px] font-normal ml-1">{selectedAccount.currency}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteTransaction(tx)}
                        aria-label={pendingDeleteTxId === tx.id ? 'Confirm delete' : 'Delete transaction'}
                        className={`transition-colors duration-150 ${
                          pendingDeleteTxId === tx.id
                            ? 'text-red-400 text-[11px] font-semibold'
                            : 'text-slate-700 hover:text-red-400'
                        }`}
                      >
                        {pendingDeleteTxId === tx.id ? 'Delete?' : <TrashIcon />}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </main>

      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  )
}
