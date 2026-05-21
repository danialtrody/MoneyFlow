import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { BarChartIcon, ChevronDownIcon, CloseIcon, MenuIcon, PencilIcon, ReceiptIcon, SearchIcon, SparklesIcon, TrashIcon, TrendUpIcon, WalletIcon } from '../components/Icons'
import EditProfileModal from '../components/EditProfileModal'
import Toast from '../components/Toast'
import TransactionsModal from '../components/TransactionsModal'
import WelcomeBanner from '../components/WelcomeBanner'
import { useToast } from '../hooks/useToast'
import { createAccount, deleteAccount, getAccounts, updateAccount } from '../services/accountService'
import { createCategory, deleteCategory, getCategories, updateCategory } from '../services/categoryService'
import { importTransactions } from '../services/importService'
import {
  clearTransactions,
  createTransaction,
  deleteTransaction,
  getTransactions,
  updateTransaction,
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

const compactInputClass =
  'w-full bg-white/4 border border-white/8 rounded-lg px-3 py-2 text-white text-[12px] placeholder:text-slate-600 outline-none transition-all duration-200 focus:border-blue-500/50'

const EMPTY_ACCOUNT_FORM = { name: '', type: 'bank', balance: '0.00', currency: 'ILS' }

const today = () => new Date().toISOString().split('T')[0]
const emptyTxForm = () => ({ type: 'income', amount: '', category_id: '', description: '', date: today() })

function fmtCurrency(amount, currency) {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parseFloat(amount))
  return currency ? `${formatted} ${currency}` : formatted
}

export default function DashboardPage() {
  const { user, logout: contextLogout } = useAuth()
  const navigate = useNavigate()
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
  const [renamingCatId, setRenamingCatId] = useState(null)
  const [renameCatName, setRenameCatName] = useState('')
  const [isRenamingCat, setIsRenamingCat] = useState(false)

  const [editingAccountId, setEditingAccountId] = useState(null)
  const [editAccountForm, setEditAccountForm] = useState({ name: '', type: 'bank', currency: 'ILS' })
  const [isSubmittingEditAccount, setIsSubmittingEditAccount] = useState(false)

  const [editingTxId, setEditingTxId] = useState(null)
  const [editTxForm, setEditTxForm] = useState({ type: 'income', amount: '', category_id: '', description: '', date: '' })
  const [isSubmittingEditTx, setIsSubmittingEditTx] = useState(false)
  const [selectedTx, setSelectedTx] = useState(null)

  const [txTypeFilter, setTxTypeFilter] = useState('all')
  const [txDateFrom, setTxDateFrom] = useState('')
  const [txDateTo, setTxDateTo] = useState('')
  const [txCategoryFilter, setTxCategoryFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)

  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const importFileRef = useRef(null)

  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [isClearingAll, setIsClearingAll] = useState(false)
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)

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
    if (selectedAccountId === null) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingTx(true)
    getTransactions(selectedAccountId)
      .then(setTransactions)
      .catch(() => addToast('error', 'Failed to load transactions.'))
      .finally(() => setLoadingTx(false))
  }, [selectedAccountId, addToast])

  useEffect(() => {
    if (categoriesLoadedRef.current) return
    getCategories()
      .then((data) => {
        categoriesLoadedRef.current = true
        setCategories(data)
      })
      .catch(() => addToast('error', 'Failed to load categories.'))
  }, [addToast])

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) ?? null

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchType = txTypeFilter === 'all' || tx.type === txTypeFilter
      const matchFrom = !txDateFrom || tx.date >= txDateFrom
      const matchTo   = !txDateTo   || tx.date <= txDateTo
      const matchCat  = txCategoryFilter === 'all' || String(tx.category_id) === txCategoryFilter
      return matchType && matchFrom && matchTo && matchCat
    })
  }, [transactions, txTypeFilter, txDateFrom, txDateTo, txCategoryFilter])

  const txSummary = useMemo(() => {
    let income = 0
    let expense = 0
    for (const tx of filteredTransactions) {
      const amt = parseFloat(tx.amount)
      if (tx.type === 'income') income += amt
      else if (tx.type === 'expense') expense += amt
    }
    return { income, expense, net: income - expense }
  }, [filteredTransactions])

  const portfolioStats = useMemo(() => {
    if (accounts.length === 0) return null
    const totalBalance = accounts.reduce((s, a) => s + parseFloat(a.balance), 0)
    const largest = accounts.reduce((max, a) => parseFloat(a.balance) > parseFloat(max.balance) ? a : max, accounts[0])
    const avgBalance = totalBalance / accounts.length
    const largestPct = totalBalance > 0 ? (parseFloat(largest.balance) / totalBalance) * 100 : 0
    const typeCounts = accounts.reduce((acc, a) => {
      const label = a.type === 'credit_card' ? 'credit' : a.type
      acc[label] = (acc[label] || 0) + 1
      return acc
    }, {})
    const typeBreakdown = Object.entries(typeCounts)
      .map(([t, n]) => `${n} ${t}`)
      .join(' · ')
    const currencies = [...new Set(accounts.map((a) => a.currency))]
    const currency = currencies.length === 1 ? currencies[0] : 'ILS'
    return { totalBalance, largest, count: accounts.length, avgBalance, largestPct, typeBreakdown, currency }
  }, [accounts])

  const groupedTransactions = useMemo(() => {
    const map = new Map()
    for (const tx of filteredTransactions) {
      if (!map.has(tx.date)) map.set(tx.date, [])
      map.get(tx.date).push(tx)
    }
    return [...map.entries()].sort(([a], [b]) => b.localeCompare(a))
  }, [filteredTransactions])

  async function handleLogout() {
    await contextLogout()
    navigate('/login', { replace: true })
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
    if (isSubmitting) return
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
        currency: form.currency.trim() || 'ILS',
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
      setTransactions([])
      setImportResult(null)
      setShowClearConfirm(false)
    }
    if (editingAccountId === account.id) {
      setEditingAccountId(null)
    }
    try {
      await deleteAccount(account.id)
      setAccounts((prev) => prev.filter((a) => a.id !== account.id))
      addToast('success', `"${account.name}" deleted.`)
    } catch (err) {
      addToast('error', err.message || 'Failed to delete account.')
    }
  }

  function handleStartEditAccount(account) {
    setEditingAccountId(account.id)
    setEditAccountForm({ name: account.name, type: account.type, currency: account.currency })
  }

  function handleCancelEditAccount() {
    setEditingAccountId(null)
  }

  function handleEditAccountFormChange(e) {
    setEditAccountForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSaveAccount(e) {
    e.preventDefault()
    if (isSubmittingEditAccount) return
    if (!editAccountForm.name.trim()) {
      addToast('error', 'Account name is required.')
      return
    }
    setIsSubmittingEditAccount(true)
    try {
      const updated = await updateAccount(editingAccountId, {
        name: editAccountForm.name.trim(),
        type: editAccountForm.type,
        currency: editAccountForm.currency.trim() || 'ILS',
      })
      setAccounts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
      setEditingAccountId(null)
      addToast('success', `"${updated.name}" updated.`)
    } catch (err) {
      addToast('error', err.message || 'Failed to update account.')
    } finally {
      setIsSubmittingEditAccount(false)
    }
  }

  function handleSelectAccount(account) {
    const newId = selectedAccountId === account.id ? null : account.id
    setSelectedAccountId(newId)
    setImportResult(null)
    setShowClearConfirm(false)
    if (newId === null) setTransactions([])
    setShowAddTx(false)
    setTxForm(emptyTxForm())
    setPendingDeleteTxId(null)
    setEditingTxId(null)
    setTxTypeFilter('all')
    setTxDateFrom('')
    setTxDateTo('')
    setTxCategoryFilter('all')
    setShowFilters(false)
  }

  const hasActiveFilters =
    txTypeFilter !== 'all' || txDateFrom !== '' || txDateTo !== '' || txCategoryFilter !== 'all'

  function clearFilters() {
    setTxTypeFilter('all')
    setTxDateFrom('')
    setTxDateTo('')
    setTxCategoryFilter('all')
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
    if (isSubmittingCat) return
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
    if (isSubmittingTx) return
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

  function handleStartRenameCategory(cat) {
    setRenamingCatId(cat.id)
    setRenameCatName(cat.name)
  }

  function handleCancelRenameCategory() {
    setRenamingCatId(null)
    setRenameCatName('')
  }

  async function handleSaveRenameCategory() {
    if (isRenamingCat) return
    if (!renameCatName.trim()) {
      addToast('error', 'Category name is required.')
      return
    }
    setIsRenamingCat(true)
    try {
      const updated = await updateCategory(renamingCatId, { name: renameCatName.trim() })
      setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
      setRenamingCatId(null)
      setRenameCatName('')
      addToast('success', `Category renamed to "${updated.name}".`)
    } catch (err) {
      addToast('error', err.message || 'Failed to rename category.')
    } finally {
      setIsRenamingCat(false)
    }
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

  function handleStartEditTx(tx) {
    setSelectedTx(null)
    setEditingTxId(tx.id)
    setEditTxForm({
      type: tx.type,
      amount: String(tx.amount),
      category_id: String(tx.category_id),
      description: tx.description ?? '',
      date: tx.date,
    })
  }

  function handleCancelEditTx() {
    setEditingTxId(null)
  }

  function handleEditTxFormChange(e) {
    const { name, value } = e.target
    setEditTxForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'type' ? { category_id: '' } : {}),
    }))
  }

  async function handleSaveTx(e) {
    e.preventDefault()
    if (isSubmittingEditTx) return
    if (!editTxForm.category_id) {
      addToast('error', 'Category is required.')
      return
    }
    if (!editTxForm.amount || parseFloat(editTxForm.amount) <= 0) {
      addToast('error', 'Amount must be greater than 0.')
      return
    }
    const accountId = selectedAccountId
    setIsSubmittingEditTx(true)
    try {
      await updateTransaction(editingTxId, {
        type: editTxForm.type,
        amount: parseFloat(editTxForm.amount),
        category_id: parseInt(editTxForm.category_id, 10),
        description: editTxForm.description.trim() || null,
        date: editTxForm.date,
      })
      const [updatedAccounts, updatedTxs] = await Promise.all([
        getAccounts(),
        getTransactions(accountId),
      ])
      setAccounts(updatedAccounts)
      if (selectedAccountIdRef.current === accountId) {
        setTransactions(updatedTxs)
      }
      setEditingTxId(null)
      addToast('success', 'Transaction updated.')
    } catch (err) {
      addToast('error', err.message || 'Failed to update transaction.')
    } finally {
      setIsSubmittingEditTx(false)
    }
  }

  async function handleConfirmClearAll() {
    setShowClearConfirm(false)
    setEditingTxId(null)
    setPendingDeleteTxId(null)
    const accountId = selectedAccountId
    setIsClearingAll(true)
    try {
      await clearTransactions(accountId)
      const updatedAccounts = await getAccounts()
      setAccounts(updatedAccounts)
      if (selectedAccountIdRef.current === accountId) setTransactions([])
      setImportResult(null)
      addToast('success', 'All transactions cleared.')
    } catch (err) {
      addToast('error', err.message || 'Failed to clear transactions.')
    } finally {
      setIsClearingAll(false)
    }
  }

  async function handleImportFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const accountId = selectedAccountId
    setIsImporting(true)
    setImportResult(null)
    try {
      const result = await importTransactions(accountId, file)
      setImportResult(result)
      const [updatedAccounts, updatedTxs, updatedCategories] = await Promise.all([
        getAccounts(),
        getTransactions(accountId),
        getCategories(),
      ])
      setAccounts(updatedAccounts)
      if (selectedAccountIdRef.current === accountId) setTransactions(updatedTxs)
      setCategories(updatedCategories)
      addToast('success', `Imported ${result.imported} transaction(s), ${result.skipped} skipped.`)
    } catch (err) {
      addToast('error', err.message || 'Import failed.')
    } finally {
      setIsImporting(false)
      if (importFileRef.current) importFileRef.current.value = ''
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
      <header className="relative border-b border-white/6 bg-white/[0.02] backdrop-blur-xl px-6">
        {/* Main row */}
        <div className="max-w-5xl mx-auto flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-linear-to-br from-blue-500/15 to-violet-500/15 border border-white/10">
              <TrendUpIcon />
            </div>
            <span className="text-white font-bold text-[17px] tracking-tight">MoneyFlow</span>
          </div>

          {/* Desktop actions */}
          <div className="hidden sm:flex items-center gap-3">
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
              onClick={() => navigate('/advisor')}
              className="flex items-center gap-1.5 text-[13px] font-medium text-slate-300 hover:text-white border border-white/8 hover:border-white/[0.14] hover:bg-white/3 px-4 py-1.5 rounded-lg transition-all duration-200"
            >
              <SparklesIcon />
              AI Advisor
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
                onClick={() => navigate('/analytics')}
                className="text-[13px] font-medium text-slate-300 hover:text-white border border-white/8 hover:border-white/[0.14] hover:bg-white/3 px-3 py-1.5 rounded-lg transition-all duration-200"
              >
                Analytics
              </button>
              <button
                type="button"
                onClick={() => navigate('/advisor')}
                className="text-[13px] font-medium text-slate-300 hover:text-white border border-white/8 hover:border-white/[0.14] hover:bg-white/3 px-3 py-1.5 rounded-lg transition-all duration-200"
              >
                AI Advisor
              </button>
              <button
                type="button"
                onClick={() => setShowMobileMenu((m) => !m)}
                className="text-slate-400 hover:text-white transition-colors duration-150 p-2 rounded-lg hover:bg-white/[0.04] outline-none"
                aria-label="Toggle menu"
              >
                {showMobileMenu ? <CloseIcon /> : <MenuIcon />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile collapsible menu */}
        {showMobileMenu && (
          <div
            className="sm:hidden border-t border-white/8 max-w-5xl mx-auto pb-3 pt-2"
            style={{ animation: 'slideDown 0.18s cubic-bezier(0.22,1,0.36,1) both' }}
          >
            {/* User info strip */}
            <div className="flex items-center gap-3 px-2 py-3 mb-1">
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-linear-to-br from-blue-500/30 to-violet-500/30 border border-white/10 text-white font-semibold text-[13px] flex-shrink-0">
                {(user?.full_name || user?.email || '?')[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-white text-[13px] font-medium truncate">{user?.full_name}</p>
                <p className="text-slate-500 text-[11px] truncate">{user?.email}</p>
              </div>
            </div>

            {/* Nav items */}
            <div className="space-y-0.5">
              <button
                type="button"
                onClick={() => { setShowEditProfile(true); setShowMobileMenu(false) }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] rounded-xl transition-all duration-150 group"
              >
                <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/[0.05] group-hover:bg-white/10 transition-colors duration-150">
                  <PencilIcon />
                </span>
                Edit Profile
              </button>

              <button
                type="button"
                onClick={() => { navigate('/analytics'); setShowMobileMenu(false) }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] rounded-xl transition-all duration-150 group"
              >
                <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/[0.05] group-hover:bg-white/10 transition-colors duration-150">
                  <BarChartIcon />
                </span>
                Analytics
              </button>

              <button
                type="button"
                onClick={() => { navigate('/advisor'); setShowMobileMenu(false) }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] rounded-xl transition-all duration-150 group"
              >
                <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/[0.05] group-hover:bg-white/10 transition-colors duration-150">
                  <SparklesIcon />
                </span>
                AI Advisor
              </button>
            </div>

            {/* Divider + Logout */}
            <div className="mt-2 pt-2 border-t border-white/6">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium text-red-400 hover:text-red-300 hover:bg-red-500/[0.08] rounded-xl transition-all duration-150 group"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="relative max-w-5xl mx-auto px-4 sm:px-6 pb-6 sm:pb-10">
        <WelcomeBanner user={user} />

        {/* Portfolio summary */}
        {!isLoading && portfolioStats && (
          <div className="mb-10">

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ backgroundColor: '#60A5FA' }} />
              <div className="pl-1">
                <p className="text-slate-400 text-[10.5px] font-medium tracking-wide uppercase mb-1">Total Balance</p>
                <p className="text-white text-[18px] font-bold tabular-nums leading-tight">
                  {fmtCurrency(portfolioStats.totalBalance, portfolioStats.currency)}
                </p>
                <p className="text-slate-500 text-[11px] mt-1">
                  avg {fmtCurrency(portfolioStats.avgBalance, portfolioStats.currency)} per account
                </p>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ backgroundColor: '#C084FC' }} />
              <div className="pl-1">
                <p className="text-slate-400 text-[10.5px] font-medium tracking-wide uppercase mb-1">Accounts</p>
                <p className="text-white text-[18px] font-bold tabular-nums leading-tight">{portfolioStats.count}</p>
                <p className="text-slate-500 text-[11px] mt-1">{portfolioStats.typeBreakdown}</p>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ backgroundColor: '#6EE7B7' }} />
              <div className="pl-1">
                <p className="text-slate-400 text-[10.5px] font-medium tracking-wide uppercase mb-1">Largest Account</p>
                <p className="text-white text-[18px] font-bold leading-tight truncate">{portfolioStats.largest.name}</p>
                <p className="text-slate-500 text-[11px] mt-1">{portfolioStats.largestPct.toFixed(0)}% of total balance</p>
              </div>
            </div>
          </div>
          </div>
        )}

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
                    placeholder="ILS"
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
          <div className="text-center py-20 flex flex-col items-center gap-3">
            <span className="text-slate-700"><WalletIcon /></span>
            <div>
              <p className="text-slate-400 text-[15px] mb-1">No accounts yet.</p>
              <p className="text-slate-600 text-[13px]">Add your first account to get started.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((account, index) => {
              const isEditing = editingAccountId === account.id
              return (
                <div
                  key={account.id}
                  role={isEditing ? undefined : 'button'}
                  tabIndex={isEditing ? undefined : 0}
                  onClick={isEditing ? undefined : () => handleSelectAccount(account)}
                  onKeyDown={isEditing ? undefined : (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelectAccount(account) } }}
                  className={`relative bg-linear-to-br ${TYPE_COLORS[account.type] ?? 'from-slate-500/20 to-slate-600/10 border-slate-500/20'} border rounded-2xl p-5 backdrop-blur-sm transition-all duration-200 ${
                    isEditing ? '' : 'cursor-pointer hover:scale-[1.01]'
                  } ${selectedAccountId === account.id ? 'ring-2 ring-blue-500/50' : ''}`}
                  style={{ animation: 'fadeInUp 0.4s cubic-bezier(0.22,1,0.36,1) both', animationDelay: `${index * 60}ms` }}
                >
                  {isEditing ? (
                    <form
                      onSubmit={handleSaveAccount}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <p className="text-white text-[12px] font-semibold mb-3">Edit account</p>
                      <div className="space-y-2 mb-3">
                        <input
                          aria-label="Account name"
                          name="name"
                          value={editAccountForm.name}
                          onChange={handleEditAccountFormChange}
                          placeholder="Account name"
                          maxLength={255}
                          className={compactInputClass}
                        />
                        <select
                          aria-label="Account type"
                          name="type"
                          value={editAccountForm.type}
                          onChange={handleEditAccountFormChange}
                          className={compactInputClass}
                        >
                          <option value="bank">Bank</option>
                          <option value="cash">Cash</option>
                          <option value="credit_card">Credit Card</option>
                          <option value="savings">Savings</option>
                        </select>
                        <input
                          aria-label="Currency"
                          name="currency"
                          value={editAccountForm.currency}
                          onChange={handleEditAccountFormChange}
                          placeholder="ILS"
                          maxLength={10}
                          className={compactInputClass}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={isSubmittingEditAccount}
                          className="text-[12px] font-semibold text-white bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {isSubmittingEditAccount ? '…' : 'Save'}
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEditAccount}
                          className="text-[12px] text-slate-400 hover:text-white px-2 py-1.5 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="flex items-start justify-between mb-4">
                        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${TYPE_BADGE[account.type] ?? 'bg-slate-500/15 text-slate-300'}`}>
                          {TYPE_LABELS[account.type] ?? 'Account'}
                        </span>
                        <div className="flex items-center gap-1.5 -mt-0.5">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleStartEditAccount(account) }}
                            aria-label="Edit account"
                            className="text-slate-600 hover:text-blue-400 transition-colors duration-150"
                          >
                            <PencilIcon />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleDelete(account) }}
                            aria-label={pendingDeleteId === account.id ? 'Confirm delete' : 'Delete account'}
                            className={`transition-colors duration-150 ${
                              pendingDeleteId === account.id
                                ? 'text-red-400 text-[11px] font-semibold'
                                : 'text-slate-600 hover:text-red-400'
                            }`}
                          >
                            {pendingDeleteId === account.id ? 'Delete?' : <CloseIcon />}
                          </button>
                        </div>
                      </div>
                      <p className="text-white font-semibold text-[16px] mb-1 truncate">{account.name}</p>
                      <p className="text-slate-300 text-[22px] font-bold tracking-tight">
                        {fmtCurrency(account.balance, account.currency)}
                      </p>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Transactions panel */}
        {selectedAccount && (
          <div
            className="mt-8 bg-white/[0.02] border border-white/8 rounded-2xl overflow-hidden"
            style={{ animation: 'fadeInUp 0.3s cubic-bezier(0.22,1,0.36,1) both' }}
          >
            {/* Panel header */}
            <div className="flex flex-col gap-3 px-4 sm:px-6 py-4 border-b border-white/6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <h3 className="text-white text-[15px] font-semibold">
                  {selectedAccount.name}
                  <span className="text-slate-500 font-normal ml-2 text-[13px]">transactions</span>
                </h3>
                <button
                  type="button"
                  onClick={handleToggleAddTx}
                  className="hidden sm:block bg-linear-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-all duration-200 flex-shrink-0"
                >
                  {showAddTx ? 'Cancel' : '+ Add Transaction'}
                </button>
              </div>
              <div className="grid grid-cols-4 gap-1.5 sm:flex sm:items-center sm:gap-2">
                <button
                  type="button"
                  onClick={handleToggleAddTx}
                  className="sm:hidden bg-linear-to-r from-blue-600 to-violet-600 text-white text-[11.5px] font-semibold px-2 py-1.5 rounded-lg transition-all duration-200"
                >
                  {showAddTx ? 'Cancel' : '+ Add'}
                </button>
                <input
                  ref={importFileRef}
                  type="file"
                  accept=".csv,.xls"
                  aria-hidden="true"
                  tabIndex={-1}
                  className="hidden"
                  onChange={handleImportFile}
                />
                <button
                  type="button"
                  onClick={() => setShowFilters((v) => !v)}
                  aria-label="Toggle filters"
                  className={`flex items-center justify-center gap-1 text-[11.5px] sm:text-[12.5px] font-semibold px-2 sm:px-3.5 py-1.5 rounded-lg border transition-all duration-200 ${
                    showFilters || hasActiveFilters
                      ? 'border-blue-500/50 text-blue-400 bg-blue-500/10'
                      : 'border-white/10 text-slate-300 hover:text-white hover:border-white/20'
                  }`}
                >
                  <SearchIcon />
                  <span className="hidden sm:inline">{hasActiveFilters ? 'Filtered' : 'Filter'}</span>
                  <span className="sm:hidden">{hasActiveFilters ? 'On' : 'Filter'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => importFileRef.current?.click()}
                  disabled={isImporting || isClearingAll}
                  className="text-[11.5px] sm:text-[12.5px] font-semibold px-2 sm:px-3.5 py-1.5 rounded-lg border border-white/10 text-slate-300 hover:text-white hover:border-white/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isImporting ? '…' : 'Import'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                  aria-label="Clear all transactions"
                  disabled={isClearingAll || isImporting || transactions.length === 0}
                  className="text-[11.5px] sm:text-[12.5px] font-semibold px-2 sm:px-3.5 py-1.5 rounded-lg border border-white/10 text-slate-300 hover:text-white hover:border-white/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isClearingAll ? '…' : <><span className="sm:hidden">Clear</span><span className="hidden sm:inline">Clear all</span></>}
                </button>
              </div>
            </div>

            {/* Import results panel */}
            {importResult && (
              <div className="px-6 py-4 border-b border-white/6 bg-white/[0.015]">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-4">
                    {importResult.imported > 0 ? (
                      <span className="text-emerald-400 text-[13px] font-medium">
                        ✓ {importResult.imported} imported
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[13px] font-medium">No new transactions</span>
                    )}
                    {importResult.skipped > 0 && (
                      <span className="text-slate-500 text-[13px]">{importResult.skipped} skipped</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setImportResult(null)}
                    aria-label="Dismiss import result"
                    className="text-slate-600 hover:text-slate-400 transition-colors"
                  >
                    <CloseIcon />
                  </button>
                </div>
                {importResult.errors.length > 0 && (
                  <div className="mt-2 space-y-0.5">
                    {importResult.errors.map((rowError) => (
                      <p key={rowError.row} className="text-red-400/70 text-[12px]">
                        Row {rowError.row}: {rowError.reason}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

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
                            {categories.filter((c) => c.type === txForm.type).map((cat) =>
                              renamingCatId === cat.id ? (
                                <div key={cat.id} className="flex items-center gap-2 border-t border-white/4 px-3 py-2">
                                  <input
                                    value={renameCatName}
                                    onChange={(e) => setRenameCatName(e.target.value)}
                                    maxLength={100}
                                    autoFocus
                                    onClick={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') { e.preventDefault(); handleSaveRenameCategory() }
                                      if (e.key === 'Escape') handleCancelRenameCategory()
                                    }}
                                    className="flex-1 bg-white/4 border border-white/8 rounded-lg px-2 py-1 text-white text-[12px] outline-none focus:border-blue-500/50 min-w-0"
                                  />
                                  <button
                                    type="button"
                                    onClick={handleSaveRenameCategory}
                                    disabled={isRenamingCat}
                                    className="text-[11px] text-blue-400 hover:text-blue-300 disabled:opacity-50 flex-shrink-0"
                                  >
                                    {isRenamingCat ? '…' : 'Save'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleCancelRenameCategory}
                                    className="text-[11px] text-slate-500 hover:text-slate-300 flex-shrink-0"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
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
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handleStartRenameCategory(cat)}
                                        aria-label="Rename category"
                                        className="px-2 py-2.5 text-slate-600 hover:text-blue-400 transition-colors flex-shrink-0"
                                      >
                                        <PencilIcon />
                                      </button>
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
                                    </>
                                  )}
                                </div>
                              )
                            )}
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
              <div className="text-center py-12 flex flex-col items-center gap-2">
                <span className="text-slate-700"><ReceiptIcon /></span>
                <p className="text-slate-500 text-[13px]">No transactions yet for this account.</p>
              </div>
            ) : (
              <>
                {/* Summary strip */}
                <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-5 gap-y-2 px-4 sm:px-6 py-3 border-b border-white/6 bg-white/[0.01]">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-[10.5px] font-semibold uppercase tracking-wider">Income</span>
                    <span className="text-emerald-400 text-[13px] font-semibold tabular-nums">
                      +{fmtCurrency(txSummary.income, selectedAccount?.currency)}
                    </span>
                  </div>
                  <div className="hidden sm:block w-px h-3 bg-white/10" />
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-[10.5px] font-semibold uppercase tracking-wider">Expenses</span>
                    <span className="text-red-400 text-[13px] font-semibold tabular-nums">
                      −{fmtCurrency(txSummary.expense, selectedAccount?.currency)}
                    </span>
                  </div>
                  <div className="hidden sm:block w-px h-3 bg-white/10" />
                  <div className="hidden sm:flex items-center gap-2">
                    <span className="text-slate-500 text-[10.5px] font-semibold uppercase tracking-wider">Net</span>
                    <span className={`text-[13px] font-semibold tabular-nums ${txSummary.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {txSummary.net >= 0 ? '+' : '−'}{fmtCurrency(Math.abs(txSummary.net), selectedAccount?.currency)}
                    </span>
                  </div>
                  <span className="ml-auto hidden sm:block text-slate-600 text-[11px]">
                    {hasActiveFilters
                      ? `${filteredTransactions.length} of ${transactions.length} transactions`
                      : `${transactions.length} transactions`}
                  </span>
                </div>

                {/* Filter bar */}
                {showFilters && (
                  <div className="border-b border-white/6 bg-white/[0.01]">

                    {/* ── Mobile layout ── */}
                    <div className="sm:hidden px-4 py-3 space-y-2">
                      <div className="flex w-full rounded-xl overflow-hidden border border-white/[0.08]">
                        {['all', 'income', 'expense', 'transfer'].map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setTxTypeFilter(t)}
                            className={`flex-1 px-3 py-2 text-[12px] font-medium transition-colors ${
                              txTypeFilter === t ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input type="date" value={txDateFrom} onChange={(e) => setTxDateFrom(e.target.value)} aria-label="From date"
                          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-white text-[13px] outline-none focus:border-blue-500/50 transition-all duration-200" />
                        <input type="date" value={txDateTo} onChange={(e) => setTxDateTo(e.target.value)} aria-label="To date"
                          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-white text-[13px] outline-none focus:border-blue-500/50 transition-all duration-200" />
                        <select value={txCategoryFilter} onChange={(e) => setTxCategoryFilter(e.target.value)}
                          className="col-span-2 w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[13px] text-white outline-none focus:border-blue-500/50 transition-all duration-200">
                          <option value="all">All categories</option>
                          {categories.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                        </select>
                        <button
                          type="button"
                          onClick={clearFilters}
                          disabled={!hasActiveFilters}
                          className="col-span-2 w-full text-[12px] font-medium px-3 py-2 rounded-xl border transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed border-white/8 hover:border-white/20 text-slate-400 hover:text-white"
                        >
                          Clear all filters
                        </button>
                      </div>
                    </div>

                    {/* ── Desktop layout ── */}
                    <div className="hidden sm:flex items-center gap-0 px-6 py-0 divide-x divide-white/[0.06]">
                      {/* Type toggle */}
                      <div className="flex items-center gap-1 px-4 py-3 flex-shrink-0">
                        {['all', 'income', 'expense', 'transfer'].map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setTxTypeFilter(t)}
                            className={`px-3 py-1 rounded-lg text-[12px] font-medium transition-all duration-150 ${
                              txTypeFilter === t
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                            }`}
                          >
                            {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
                          </button>
                        ))}
                      </div>
                      {/* Date range */}
                      <div className="flex items-center gap-2 px-4 py-3 flex-shrink-0">
                        <input
                          type="date"
                          value={txDateFrom}
                          onChange={(e) => setTxDateFrom(e.target.value)}
                          aria-label="From date"
                          className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-1 text-white text-[12px] outline-none focus:border-blue-500/50 transition-all duration-200"
                        />
                        <span className="text-slate-600 text-[11px]">—</span>
                        <input
                          type="date"
                          value={txDateTo}
                          onChange={(e) => setTxDateTo(e.target.value)}
                          aria-label="To date"
                          className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-1 text-white text-[12px] outline-none focus:border-blue-500/50 transition-all duration-200"
                        />
                      </div>
                      {/* Category */}
                      <div className="relative px-4 py-3 flex-shrink-0">
                        <select
                          value={txCategoryFilter}
                          onChange={(e) => setTxCategoryFilter(e.target.value)}
                          className="appearance-none bg-transparent text-[13px] text-white outline-none cursor-pointer pr-5 max-w-[130px] truncate"
                        >
                          <option value="all">Category</option>
                          {categories.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                        </select>
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                          <ChevronDownIcon />
                        </span>
                      </div>
                      {/* Clear */}
                      <div className="px-4 py-3 flex-shrink-0">
                        <button
                          type="button"
                          onClick={clearFilters}
                          disabled={!hasActiveFilters}
                          className={`text-[12px] font-semibold px-3 py-1 rounded-lg border transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed ${
                            hasActiveFilters
                              ? 'border-blue-500/40 text-blue-400 hover:bg-blue-500/10'
                              : 'border-white/8 text-slate-600'
                          }`}
                        >
                          Clear all
                        </button>
                      </div>
                    </div>

                  </div>
                )}

                {/* Grouped by date */}
                {filteredTransactions.length === 0 ? (
                  <div className="text-center py-12 flex flex-col items-center gap-2">
                    <span className="text-slate-700"><ReceiptIcon /></span>
                    <p className="text-slate-500 text-[13px]">No transactions match your filters.</p>
                  </div>
                ) : (
                <div className="category-list overflow-y-auto max-h-[540px]">
                {groupedTransactions.map(([date, txs]) => {
                  const dayNet = txs.reduce(
                    (sum, t) => sum + (t.type === 'income' ? parseFloat(t.amount) : t.type === 'expense' ? -parseFloat(t.amount) : 0),
                    0,
                  )
                  return (
                    <div key={date}>
                      {/* Date header */}
                      <div className="flex items-center gap-3 px-4 sm:px-6 py-2 border-b border-white/4 bg-white/[0.008]">
                        <span className="text-slate-400 text-[11.5px] font-semibold tracking-wide whitespace-nowrap">
                          {new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
                            weekday: 'short', month: 'short', day: 'numeric',
                          })}
                        </span>
                        <div className="flex-1 h-px bg-white/6" />
                        <span className={`text-[11px] font-semibold tabular-nums whitespace-nowrap ${dayNet >= 0 ? 'text-emerald-500/60' : 'text-red-500/60'}`}>
                          {dayNet >= 0 ? '+' : '−'}{Math.abs(dayNet).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>

                      <ul>
                        {txs.map((tx) => {
                          const isEditingTx = editingTxId === tx.id
                          return (
                            <li
                              key={tx.id}
                              className={`border-b border-white/4 last:border-0 transition-colors duration-150 ${
                                isEditingTx ? 'px-4 sm:px-6 py-4 bg-white/[0.02]' : 'px-4 sm:px-6 py-3.5 hover:bg-white/[0.02] group cursor-pointer'
                              }`}
                              onClick={isEditingTx ? undefined : () => setSelectedTx(tx)}
                            >
                              {isEditingTx ? (
                                <form onSubmit={handleSaveTx} noValidate>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-3">
                                    <div>
                                      <label htmlFor={`edit-tx-type-${tx.id}`} className="block text-[10px] text-slate-500 mb-1">Type</label>
                                      <select id={`edit-tx-type-${tx.id}`} name="type" value={editTxForm.type} onChange={handleEditTxFormChange} className={compactInputClass}>
                                        <option value="income">Income</option>
                                        <option value="expense">Expense</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label htmlFor={`edit-tx-amount-${tx.id}`} className="block text-[10px] text-slate-500 mb-1">Amount</label>
                                      <input
                                        id={`edit-tx-amount-${tx.id}`}
                                        name="amount"
                                        type="number"
                                        step="any"
                                        min="0.01"
                                        value={editTxForm.amount}
                                        onChange={handleEditTxFormChange}
                                        placeholder="0.00"
                                        className={compactInputClass}
                                      />
                                    </div>
                                    <div>
                                      <label htmlFor={`edit-tx-category-${tx.id}`} className="block text-[10px] text-slate-500 mb-1">Category</label>
                                      <select id={`edit-tx-category-${tx.id}`} name="category_id" value={editTxForm.category_id} onChange={handleEditTxFormChange} className={compactInputClass}>
                                        <option value="">Select…</option>
                                        {categories.filter((c) => c.type === editTxForm.type).map((c) => (
                                          <option key={c.id} value={String(c.id)}>{c.name}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <div>
                                      <label htmlFor={`edit-tx-description-${tx.id}`} className="block text-[10px] text-slate-500 mb-1">Description</label>
                                      <input
                                        id={`edit-tx-description-${tx.id}`}
                                        name="description"
                                        value={editTxForm.description}
                                        onChange={handleEditTxFormChange}
                                        placeholder="Optional"
                                        maxLength={500}
                                        className={compactInputClass}
                                      />
                                    </div>
                                    <div>
                                      <label htmlFor={`edit-tx-date-${tx.id}`} className="block text-[10px] text-slate-500 mb-1">Date</label>
                                      <input
                                        id={`edit-tx-date-${tx.id}`}
                                        name="date"
                                        type="date"
                                        value={editTxForm.date}
                                        onChange={handleEditTxFormChange}
                                        className={compactInputClass}
                                      />
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      type="submit"
                                      disabled={isSubmittingEditTx}
                                      className="text-[12px] font-semibold text-white bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                      {isSubmittingEditTx ? '…' : 'Save'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleCancelEditTx}
                                      className="text-[12px] text-slate-400 hover:text-white px-2 py-1.5 transition-colors"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </form>
                              ) : (
                                <div className="flex items-center justify-between gap-4">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${tx.type === 'income' ? 'bg-emerald-500' : tx.type === 'expense' ? 'bg-red-500' : 'bg-slate-500'}`} />
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <p className="text-white text-[13.5px] font-medium truncate">{tx.category_name}</p>
                                      </div>
                                      {tx.description && (
                                        <p className="text-slate-600 text-[11px] truncate mt-0.5">{tx.description}</p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className={`text-[14px] font-bold tabular-nums ${tx.type === 'income' ? 'text-emerald-400' : tx.type === 'expense' ? 'text-red-400' : 'text-slate-400'}`}>
                                      {tx.type === 'income' ? '+' : tx.type === 'expense' ? '−' : ''}
                                      {parseFloat(tx.amount).toLocaleString('en-US', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })}
                                      <span className="text-slate-500 text-[11px] font-normal ml-1">{selectedAccount.currency}</span>
                                    </span>
                                    <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-150" onClick={(e) => e.stopPropagation()}>
                                      <button
                                        type="button"
                                        onClick={() => handleStartEditTx(tx)}
                                        aria-label="Edit transaction"
                                        className="p-1.5 text-slate-600 hover:text-blue-400 rounded-lg hover:bg-white/4 transition-colors duration-150"
                                      >
                                        <PencilIcon />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteTransaction(tx)}
                                        aria-label={pendingDeleteTxId === tx.id ? 'Confirm delete' : 'Delete transaction'}
                                        className={`p-1.5 rounded-lg transition-colors duration-150 ${
                                          pendingDeleteTxId === tx.id
                                            ? 'text-red-400 text-[11px] font-semibold'
                                            : 'text-slate-600 hover:text-red-400 hover:bg-white/4'
                                        }`}
                                      >
                                        {pendingDeleteTxId === tx.id ? 'Delete?' : <TrashIcon />}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )
                })}
                </div>
                )}
              </>
            )}
          </div>
        )}
      </main>

      {/* Clear all confirmation modal */}
      {showClearConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowClearConfirm(false)}
        >
          <div
            className="bg-[#0c1628] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            style={{ animation: 'fadeInUp 0.2s cubic-bezier(0.22,1,0.36,1) both' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-white text-[16px] font-semibold mb-2">Clear all transactions?</h3>
            <p className="text-slate-400 text-[13px] mb-6">
              This will permanently delete all transactions for{' '}
              <span className="text-white font-medium">{selectedAccount?.name}</span> and reset its balance. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 text-[13px] font-semibold text-slate-300 hover:text-white border border-white/10 hover:border-white/20 px-4 py-2.5 rounded-xl transition-all duration-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClearAll}
                className="flex-1 text-[13px] font-semibold text-white bg-red-600 hover:bg-red-500 px-4 py-2.5 rounded-xl transition-all duration-200"
              >
                Clear all
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast toasts={toasts} removeToast={removeToast} />

      <TransactionsModal
        title={selectedTx ? (selectedTx.category_name) : null}
        subtitle={selectedTx ? new Date(selectedTx.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' }) : null}
        accentColor={selectedTx?.type === 'income' ? '#6EE7B7' : selectedTx?.type === 'expense' ? '#F87171' : '#94a3b8'}
        transactions={selectedTx ? [selectedTx] : []}
        currency={selectedAccount?.currency}
        onClose={() => setSelectedTx(null)}
      />

      {showEditProfile && (
        <EditProfileModal
          onClose={() => setShowEditProfile(false)}
          addToast={addToast}
        />
      )}
    </div>
  )
}
