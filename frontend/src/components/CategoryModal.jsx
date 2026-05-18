import { useEffect } from 'react'
import { CloseIcon } from './Icons'
import { fmtCurrency } from '../services/formatUtils'

export default function CategoryModal({ category, currency, onClose }) {
  useEffect(() => {
    if (!category) return
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [category, onClose])

  if (!category) return null

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
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: category.color }}
          />
          <span className="text-white text-[15px] font-semibold flex-1 min-w-0 leading-snug" dir="auto">
            {category.name}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-slate-500 hover:text-slate-300 transition-colors duration-150 flex-shrink-0"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Total */}
        <div className="px-5 py-3 flex-shrink-0">
          <span className="text-slate-400 text-[12px]">Total </span>
          <span className="text-white text-[13px] font-bold tabular-nums">
            {fmtCurrency(category.total, currency)}
          </span>
          <span className="text-slate-500 text-[11px] ml-2">
            · {category.transactions.length} transaction{category.transactions.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Transaction list */}
        <div className="category-list overflow-y-auto flex-1 px-2 pb-4">
          {category.transactions.length === 0 ? (
            <p className="text-slate-600 text-[12px] text-center py-8">No transactions</p>
          ) : (
            category.transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.04] transition-colors"
              >
                <span className="text-slate-500 text-[11px] tabular-nums flex-shrink-0 w-[52px]">
                  {new Date(tx.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                <span className="text-slate-300 text-[12px] flex-1 min-w-0 line-clamp-2 leading-snug" dir="auto">
                  {tx.description || tx.category_name}
                </span>
                <span className="text-white text-[12px] font-semibold tabular-nums flex-shrink-0">
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
