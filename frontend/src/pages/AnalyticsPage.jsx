import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useAuth } from '../context/AuthContext'
import { CustomAreaTooltip, CustomBarTooltip } from '../components/AnalyticsTooltips'
import CategoryModal from '../components/CategoryModal'
import DonutChart from '../components/DonutChart'
import TransactionsModal from '../components/TransactionsModal'
import EmptyChart from '../components/EmptyChart'
import { ArrowLeftIcon, TrendUpIcon } from '../components/Icons'
import SummaryCard from '../components/SummaryCard'
import { getAccounts } from '../services/accountService'
import { getAllTransactions } from '../services/transactionService'

const CHART_COLORS = [
  '#6EE7B7', '#F87171', '#60A5FA', '#C084FC',
  '#FBBF24', '#34D399', '#FB923C', '#A78BFA',
]

function barLabel(dateStr, useWeekly) {
  const d = new Date(dateStr + 'T00:00:00')
  if (useWeekly) {
    const jan4 = new Date(d.getFullYear(), 0, 4)
    const wk = Math.ceil(((d - jan4) / 86400000 + jan4.getDay() + 1) / 7)
    return `Wk ${wk}`
  }
  return d.toLocaleString('default', { month: 'short', year: '2-digit' })
}

const PERIODS = [
  { key: '7d', label: '7D' },
  { key: '30d', label: '30D' },
  { key: '3m', label: '3M' },
  { key: '6m', label: '6M' },
  { key: '1y', label: '1Y' },
  { key: '3y', label: '3Y' },
]

function fmtCurrency(amount, currency) {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parseFloat(amount))
  return currency ? `${formatted} ${currency}` : formatted
}

export default function AnalyticsPage() {
  const { user, logout: contextLogout } = useAuth()
  const navigate = useNavigate()
  const [period, setPeriod] = useState('30d')
  const [accountId, setAccountId] = useState('all')
  const [allTransactions, setAllTransactions] = useState([])
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [donutView, setDonutView] = useState('expense')
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedModal, setSelectedModal] = useState(null)

  useEffect(() => {
    Promise.all([getAllTransactions(), getAccounts()])
      .then(([txs, accs]) => { setAllTransactions(txs); setAccounts(accs) })
      .catch((err) => setError(err.message || 'Failed to load data.'))
      .finally(() => setLoading(false))
  }, [])

  function openDayModal(date) {
    const txs = filteredTransactions
      .filter((tx) => tx.date === date)
      .sort((a, b) => b.date.localeCompare(a.date))
    const formatted = new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    setSelectedModal({ title: formatted, subtitle: 'All transactions on this day', transactions: txs })
  }

  function handleTrendClick(data) {
    if (!data?.activePayload?.[0]?.payload?.date) return
    openDayModal(data.activePayload[0].payload.date)
  }

  function handleSummaryClick(type) {
    const txs = filteredTransactions
      .filter((tx) => tx.type === type)
      .sort((a, b) => b.date.localeCompare(a.date))
    const title = type === 'income' ? 'Total Income' : 'Total Expenses'
    setSelectedModal({ title, subtitle: `All ${type} transactions`, transactions: txs, accentColor: type === 'income' ? '#6EE7B7' : '#F87171' })
  }

  function handleBarClick(data) {
    if (!data?.activeLabel) return
    const label = data.activeLabel
    const useWeekly = period === '7d' || period === '30d'
    const txs = filteredTransactions
      .filter((tx) => tx.type !== 'transfer' && barLabel(tx.date, useWeekly) === label)
      .sort((a, b) => b.date.localeCompare(a.date))
    setSelectedModal({ title: label, subtitle: 'All transactions for this period', transactions: txs })
  }

  function handleCategoryClick(item) {
    const txs = filteredTransactions
      .filter((tx) => (tx.category_name || 'Uncategorized') === item.name && tx.type === donutView)
      .sort((a, b) => b.date.localeCompare(a.date))
    setSelectedCategory({ name: item.name, color: item.color, total: item.value, transactions: txs })
  }

  async function handleLogout() {
    await contextLogout()
    navigate('/login', { replace: true })
  }

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const filteredTransactions = useMemo(() => {
    const now = new Date()
    const cutoff = new Date(now)
    if (period === '7d')  cutoff.setDate(now.getDate() - 7)
    if (period === '30d') cutoff.setDate(now.getDate() - 30)
    if (period === '3m')  cutoff.setMonth(now.getMonth() - 3)
    if (period === '6m')  cutoff.setMonth(now.getMonth() - 6)
    if (period === '1y')  cutoff.setFullYear(now.getFullYear() - 1)
    if (period === '3y')  cutoff.setFullYear(now.getFullYear() - 3)
    const cutoffStr = cutoff.toISOString().split('T')[0]
    return allTransactions.filter((tx) => {
      const matchAccount = accountId === 'all' || String(tx.account_id) === String(accountId)
      return matchAccount && tx.date >= cutoffStr
    })
  }, [allTransactions, period, accountId])

  const summaryStats = useMemo(() => {
    let totalIncome = 0, totalExpenses = 0
    for (const tx of filteredTransactions) {
      const amt = parseFloat(tx.amount)
      if (tx.type === 'income') totalIncome += amt
      else if (tx.type === 'expense') totalExpenses += amt
    }
    const net = totalIncome - totalExpenses
    const savingsRate = totalIncome > 0 ? (net / totalIncome) * 100 : 0
    return { totalIncome, totalExpenses, net, savingsRate }
  }, [filteredTransactions])

  const dominantCurrency = useMemo(() => {
    if (accounts.length === 0) return 'ILS'
    const currencies = [...new Set(accounts.map((a) => a.currency))]
    return currencies.length === 1 ? currencies[0] : 'ILS'
  }, [accounts])

  const barChartData = useMemo(() => {
    const useWeekly = period === '7d' || period === '30d'
    const buckets = new Map()
    for (const tx of filteredTransactions) {
      if (tx.type === 'transfer') continue
      const d = new Date(tx.date + 'T00:00:00')
      const label = barLabel(tx.date, useWeekly)
      const key = useWeekly
        ? `${d.getFullYear()}-W${String(Math.ceil(((d - new Date(d.getFullYear(), 0, 4)) / 86400000 + new Date(d.getFullYear(), 0, 4).getDay() + 1) / 7)).padStart(2, '0')}`
        : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!buckets.has(key)) buckets.set(key, { label, income: 0, expense: 0 })
      const b = buckets.get(key)
      if (tx.type === 'income') b.income += parseFloat(tx.amount)
      else if (tx.type === 'expense') b.expense += parseFloat(tx.amount)
    }
    return [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => ({ ...v, income: +v.income.toFixed(2), expense: +v.expense.toFixed(2) }))
  }, [filteredTransactions, period])

  const donutData = useMemo(() => {
    const map = new Map()
    const relevant = filteredTransactions.filter((tx) => tx.type === donutView)
    const total = relevant.reduce((s, tx) => s + parseFloat(tx.amount), 0)
    for (const tx of relevant) {
      const key = tx.category_name || 'Uncategorized'
      if (!map.has(key)) map.set(key, { name: key, value: 0, count: 0 })
      const cat = map.get(key)
      cat.value += parseFloat(tx.amount)
      cat.count++
    }
    const items = [...map.values()]
      .sort((a, b) => b.value - a.value)
      .map((item, i) => ({
        ...item,
        value: +item.value.toFixed(2),
        color: CHART_COLORS[i % CHART_COLORS.length],
        pct: total > 0 ? (item.value / total) * 100 : 0,
      }))
    return { items, total: +total.toFixed(2) }
  }, [filteredTransactions, donutView])

  const extraStats = useMemo(() => {
    let largestExpense = 0, largestIncome = 0
    let expenseCount = 0, incomeCount = 0
    for (const tx of filteredTransactions) {
      const amt = parseFloat(tx.amount)
      if (tx.type === 'expense') { expenseCount++; if (amt > largestExpense) largestExpense = amt }
      else if (tx.type === 'income') { incomeCount++; if (amt > largestIncome) largestIncome = amt }
    }
    return { largestExpense, largestIncome, expenseCount, incomeCount }
  }, [filteredTransactions])

  const trendData = useMemo(() => {
    const sorted = [...filteredTransactions].sort((a, b) => a.date.localeCompare(b.date))
    let cumIncome = 0, cumExpense = 0
    const points = []
    const dailyExpense = new Map()
    for (const tx of sorted) {
      if (tx.type === 'transfer') continue
      const amt = parseFloat(tx.amount)
      if (tx.type === 'income') {
        cumIncome += amt
      } else if (tx.type === 'expense') {
        cumExpense += amt
        dailyExpense.set(tx.date, (dailyExpense.get(tx.date) || 0) + amt)
      }
      const last = points[points.length - 1]
      if (last?.date === tx.date) {
        last.cumIncome = +cumIncome.toFixed(2)
        last.cumExpense = +cumExpense.toFixed(2)
      } else {
        points.push({ date: tx.date, cumIncome: +cumIncome.toFixed(2), cumExpense: +cumExpense.toFixed(2) })
      }
    }
    let highestSpendDay = { date: null, amount: 0 }
    for (const [date, amount] of dailyExpense) {
      if (amount > highestSpendDay.amount) highestSpendDay = { date, amount: +amount.toFixed(2) }
    }
    const dayCount = Math.max(1, new Set(sorted.filter((t) => t.type !== 'transfer').map((t) => t.date)).size)
    const avgDailySpend = +(
      sorted.filter((t) => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount), 0) / dayCount
    ).toFixed(2)
    return { points, highestSpendDay, avgDailySpend, txCount: filteredTransactions.filter((t) => t.type !== 'transfer').length }
  }, [filteredTransactions])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020817] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#020817] flex flex-col items-center justify-center gap-4">
        <p className="text-red-400 text-[14px]">{error}</p>
        <button type="button" onClick={() => navigate('/dashboard')} className="text-blue-400 hover:text-blue-300 text-[13px]">
          Back to Dashboard
        </button>
      </div>
    )
  }

  const { totalIncome, totalExpenses, net, savingsRate } = summaryStats

  return (
    <div className="min-h-screen bg-[#020817] relative overflow-hidden">
      {/* Ambient orbs */}
      <div
        className="absolute -top-32 -right-32 w-[640px] h-[640px] rounded-full bg-blue-600/10 blur-[130px] pointer-events-none"
        style={{ animation: 'floatSlow 14s ease-in-out infinite' }}
      />
      <div
        className="absolute -bottom-40 -left-40 w-[720px] h-[720px] rounded-full bg-violet-600/8 blur-[150px] pointer-events-none"
        style={{ animation: 'floatSlow 18s ease-in-out infinite reverse' }}
      />
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.08]"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(148,163,184,0.5) 1px, transparent 1px)',
          backgroundSize: '38px 38px',
        }}
      />

      {/* Header */}
      <header className="relative border-b border-white/6 bg-white/[0.02] backdrop-blur-xl px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-linear-to-br from-blue-500/15 to-violet-500/15 border border-white/10">
              <TrendUpIcon />
            </div>
            <span className="text-white font-bold text-[17px] tracking-tight">MoneyFlow</span>
            <span className="text-slate-600 text-[14px] mx-1 hidden sm:inline">/</span>
            <span className="text-slate-400 text-[14px] hidden sm:inline">Analytics</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-slate-400 text-[13px] hidden sm:block">{user?.email}</span>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-1.5 text-[13px] font-medium text-slate-300 hover:text-white border border-white/8 hover:border-white/[0.14] hover:bg-white/3 px-2.5 sm:px-4 py-1.5 rounded-lg transition-all duration-200"
            >
              <ArrowLeftIcon />
              <span className="hidden sm:inline">Dashboard</span>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="text-[13px] font-medium text-slate-300 hover:text-white border border-white/8 hover:border-white/[0.14] hover:bg-white/3 px-2.5 sm:px-4 py-1.5 rounded-lg transition-all duration-200"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main
        className="relative max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8"
        style={{ animation: 'fadeInUp 0.35s cubic-bezier(0.22,1,0.36,1) both' }}
      >
        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h2 className="text-white text-[20px] font-semibold tracking-tight">Financial Analytics</h2>
            <p className="text-slate-500 text-[13px] mt-0.5">Insights from your transactions</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Period selector */}
            <div className="flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1 flex-shrink-0">
              {PERIODS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPeriod(key)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-200 ${
                    period === key
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {/* Account filter */}
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-slate-300 text-[13px] outline-none focus:border-blue-500/50 transition-colors cursor-pointer"
            >
              <option value="all">All Accounts</option>
              {accounts.map((a) => (
                <option key={a.id} value={String(a.id)}>{a.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <button type="button" className="text-left cursor-pointer hover:scale-[1.02] transition-transform duration-200" onClick={() => handleSummaryClick('income')}>
            <SummaryCard
              label="Total Income"
              value={fmtCurrency(totalIncome, dominantCurrency)}
              accentColor="#6EE7B7"
            />
          </button>
          <button type="button" className="text-left cursor-pointer hover:scale-[1.02] transition-transform duration-200" onClick={() => handleSummaryClick('expense')}>
            <SummaryCard
              label="Total Expenses"
              value={fmtCurrency(totalExpenses, dominantCurrency)}
              accentColor="#F87171"
            />
          </button>
          <SummaryCard
            label="Net Savings"
            value={
              <span className={net < 0 ? 'text-red-400' : undefined}>
                {net < 0 ? '-' : ''}{fmtCurrency(Math.abs(net), dominantCurrency)}
              </span>
            }
            accentColor="#60A5FA"
          />
          <SummaryCard
            label="Savings Rate"
            value={`${savingsRate.toFixed(1)}%`}
            sub={totalIncome === 0 ? 'No income recorded' : undefined}
            accentColor="#C084FC"
          />
        </div>

        {/* Chart 1: Income vs Expenses */}
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 mb-6">
          <h3 className="text-white text-[15px] font-semibold mb-5">Income vs Expenses</h3>
          {barChartData.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barChartData} barCategoryGap="30%" barGap={4} onClick={handleBarClick} style={{ cursor: 'pointer' }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
                  width={45}
                />
                <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Legend
                  wrapperStyle={{ fontSize: '12px', color: '#94a3b8', paddingTop: '12px' }}
                  iconType="circle"
                  iconSize={8}
                />
                <Bar dataKey="income" name="Income" fill="#6EE7B7" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="expense" name="Expenses" fill="#F87171" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Charts 2 & 3 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Chart 2: Spending by Category */}
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white text-[15px] font-semibold">
                {donutView === 'expense' ? 'Spending' : 'Income'} by Category
              </h3>
              <div className="flex gap-1 bg-white/5 border border-white/10 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setDonutView('expense')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all duration-200 ${
                    donutView === 'expense'
                      ? 'bg-red-500/20 text-red-300'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Expenses
                </button>
                <button
                  type="button"
                  onClick={() => setDonutView('income')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all duration-200 ${
                    donutView === 'income'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Income
                </button>
              </div>
            </div>
            {donutData.items.length === 0 ? (
              <EmptyChart className="h-[220px]" />
            ) : (
              <DonutChart items={donutData.items} total={donutData.total} currency={dominantCurrency} onCategoryClick={handleCategoryClick} />
            )}
          </div>

          {/* Chart 3: Cash Flow Trend */}
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6">
            <h3 className="text-white text-[15px] font-semibold mb-4">Cash Flow Trend</h3>
            {trendData.points.length === 0 ? (
              <EmptyChart className="h-[220px]" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={trendData.points} margin={{ top: 5, right: 5, left: 0, bottom: 0 }} onClick={handleTrendClick} style={{ cursor: 'pointer' }}>
                  <defs>
                    <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6EE7B7" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6EE7B7" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gradExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F87171" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#F87171" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                    tickFormatter={(d) => d.slice(5)}
                  />
                  <YAxis
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
                    width={40}
                  />
                  <Tooltip content={<CustomAreaTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="cumIncome"
                    name="Cumulative Income"
                    stroke="#6EE7B7"
                    strokeWidth={2}
                    fill="url(#gradIncome)"
                    dot={false}
                    activeDot={{ r: 4, fill: '#6EE7B7' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="cumExpense"
                    name="Cumulative Expenses"
                    stroke="#F87171"
                    strokeWidth={2}
                    fill="url(#gradExpense)"
                    dot={false}
                    activeDot={{ r: 4, fill: '#F87171' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
            {/* Stat tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
              <div
                className={`bg-white/4 rounded-xl p-3 ${trendData.highestSpendDay.date ? 'cursor-pointer hover:bg-white/[0.08] transition-colors' : ''}`}
                onClick={trendData.highestSpendDay.date ? () => openDayModal(trendData.highestSpendDay.date) : undefined}
              >
                <p className="text-slate-500 text-[10px] uppercase tracking-wide leading-tight mb-1">
                  Highest Spend Day
                </p>
                {trendData.highestSpendDay.date ? (
                  <>
                    <p className="text-white text-[12px] font-semibold">{trendData.highestSpendDay.date.slice(5)}</p>
                    <p className="text-red-400 text-[11px]">{fmtCurrency(trendData.highestSpendDay.amount, dominantCurrency)}</p>
                  </>
                ) : (
                  <p className="text-slate-600 text-[12px]">—</p>
                )}
              </div>
              <div className="bg-white/4 rounded-xl p-3">
                <p className="text-slate-500 text-[10px] uppercase tracking-wide leading-tight mb-1">
                  Avg Daily Spend
                </p>
                <p className="text-white text-[12px] font-semibold">{fmtCurrency(trendData.avgDailySpend, dominantCurrency)}</p>
              </div>
              <div className="bg-white/4 rounded-xl p-3 col-span-2 sm:col-span-1">
                <p className="text-slate-500 text-[10px] uppercase tracking-wide leading-tight mb-1">
                  Transactions
                </p>
                <p className="text-white text-[12px] font-semibold">{trendData.txCount}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
              <div className="bg-white/4 rounded-xl p-3">
                <p className="text-slate-500 text-[10px] uppercase tracking-wide leading-tight mb-1">
                  Largest Expense
                </p>
                <p className="text-red-400 text-[12px] font-semibold">
                  {extraStats.largestExpense > 0 ? fmtCurrency(extraStats.largestExpense, dominantCurrency) : '—'}
                </p>
              </div>
              <div className="bg-white/4 rounded-xl p-3">
                <p className="text-slate-500 text-[10px] uppercase tracking-wide leading-tight mb-1">
                  Largest Income
                </p>
                <p className="text-emerald-400 text-[12px] font-semibold">
                  {extraStats.largestIncome > 0 ? fmtCurrency(extraStats.largestIncome, dominantCurrency) : '—'}
                </p>
              </div>
              <div className="bg-white/4 rounded-xl p-3 col-span-2 sm:col-span-1">
                <p className="text-slate-500 text-[10px] uppercase tracking-wide leading-tight mb-1">
                  In / Out
                </p>
                <p className="text-white text-[12px] font-semibold">
                  <span className="text-emerald-400">{extraStats.incomeCount}</span>
                  <span className="text-slate-500 mx-1">/</span>
                  <span className="text-red-400">{extraStats.expenseCount}</span>
                </p>
              </div>
            </div>
          </div>

        </div>
      </main>

      <CategoryModal
        category={selectedCategory}
        currency={dominantCurrency}
        onClose={() => setSelectedCategory(null)}
      />

      <TransactionsModal
        title={selectedModal?.title ?? null}
        subtitle={selectedModal?.subtitle}
        accentColor={selectedModal?.accentColor}
        transactions={selectedModal?.transactions ?? []}
        currency={dominantCurrency}
        onClose={() => setSelectedModal(null)}
      />

    </div>
  )
}
