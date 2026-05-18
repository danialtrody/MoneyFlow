import { useEffect } from 'react'
import { CloseIcon } from './Icons'
import { fmtCurrency } from '../services/formatUtils'

export default function TransactionsModal({ title, subtitle, accentColor, transactions, currency, loading, onClose }) {
  useEffect(() => {
    if (!title) return
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [title, onClose])

  if (!title) return null

  const income = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + parseFloat(t.amount), 0)
  const expense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount), 0)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-[#0f1423] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[80vh]"
        style={{ animation: 'fadeInUp 0.2s cubic-bezier(0.22,1,0.36,1) both' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 px-5 pt-5 pb-4 border-b border-white/8 flex-shrink-0">
          {accentColor && (
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: accentColor }} />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-white text-[15px] font-semibold leading-snug" dir="auto">{title}</p>
            {subtitle && <p className="text-slate-500 text-[11px] mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-slate-500 hover:text-slate-300 transition-colors duration-150 flex-shrink-0"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Stats row */}
        {(income > 0 || expense > 0) && (
          <div className="flex gap-3 px-5 py-3 border-b border-white/6 flex-shrink-0">
            {income > 0 && (
              <div>
                <p className="text-slate-500 text-[10px] uppercase tracking-wide">Income</p>
                <p className="text-emerald-400 text-[12px] font-semibold tabular-nums">{fmtCurrency(income, currency)}</p>
              </div>
            )}
            {expense > 0 && (
              <div>
                <p className="text-slate-500 text-[10px] uppercase tracking-wide">Expenses</p>
                <p className="text-red-400 text-[12px] font-semibold tabular-nums">{fmtCurrency(expense, currency)}</p>
              </div>
            )}
            <div className="ml-auto">
              <p className="text-slate-500 text-[10px] uppercase tracking-wide">Transactions</p>
              <p className="text-white text-[12px] font-semibold">{transactions.length}</p>
            </div>
          </div>
        )}

        {/* List */}
        <div className="category-list overflow-y-auto flex-1 px-2 pb-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            </div>
          ) : transactions.length === 0 ? (
            <p className="text-slate-600 text-[12px] text-center py-8">No transactions</p>
          ) : transactions.length === 1 ? (
            <div className="px-5 py-4 flex flex-col gap-4">
              {/* Amount */}
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${transactions[0].type === 'income' ? 'bg-emerald-500' : transactions[0].type === 'expense' ? 'bg-red-500' : 'bg-slate-500'}`} />
                <span className={`text-[28px] font-bold tabular-nums ${transactions[0].type === 'income' ? 'text-emerald-400' : transactions[0].type === 'expense' ? 'text-red-400' : 'text-slate-400'}`}>
                  {transactions[0].type === 'income' ? '+' : transactions[0].type === 'expense' ? '−' : ''}
                  {fmtCurrency(parseFloat(transactions[0].amount), currency)}
                </span>
              </div>
              {/* Details grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/4 rounded-xl p-3">
                  <p className="text-slate-500 text-[10px] uppercase tracking-wide mb-1">Type</p>
                  <p className="text-white text-[13px] font-medium capitalize">{transactions[0].type}</p>
                </div>
                <div className="bg-white/4 rounded-xl p-3">
                  <p className="text-slate-500 text-[10px] uppercase tracking-wide mb-1">Category</p>
                  <p className="text-white text-[13px] font-medium">{transactions[0].category_name}</p>
                </div>
              </div>
              {/* Description */}
              {transactions[0].description && (
                <div className="bg-white/4 rounded-xl p-3">
                  <p className="text-slate-500 text-[10px] uppercase tracking-wide mb-1">Description</p>
                  <p className="text-slate-200 text-[13px] leading-relaxed break-words" dir="auto">{transactions[0].description}</p>
                </div>
              )}
            </div>
          ) : (
            transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.04] transition-colors"
              >
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${tx.type === 'income' ? 'bg-emerald-500' : tx.type === 'expense' ? 'bg-red-500' : 'bg-slate-500'}`} />
                <span className="text-slate-500 text-[11px] tabular-nums flex-shrink-0 w-[52px]">
                  {new Date(tx.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                <span className="text-slate-300 text-[12px] flex-1 min-w-0 leading-snug break-words" dir="auto">
                  {tx.description || tx.category_name}
                </span>
                <span className={`text-[12px] font-semibold tabular-nums flex-shrink-0 ${tx.type === 'income' ? 'text-emerald-400' : tx.type === 'expense' ? 'text-red-400' : 'text-slate-400'}`}>
                  {tx.type === 'income' ? '+' : tx.type === 'expense' ? '−' : ''}
                  {fmtCurrency(parseFloat(tx.amount), currency)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
