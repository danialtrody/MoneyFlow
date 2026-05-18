function fmt(n) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function CustomBarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0f1729] border border-white/10 rounded-xl px-3 py-2.5 shadow-xl text-[12px]">
      <p className="text-slate-400 mb-1.5 font-medium">{label}</p>
      {payload.map((e) => (
        <p key={e.dataKey} style={{ color: e.color }} className="font-semibold">
          {e.name}: {fmt(e.value)}
        </p>
      ))}
    </div>
  )
}

export function CustomAreaTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const income = payload.find((p) => p.dataKey === 'cumIncome')
  const expense = payload.find((p) => p.dataKey === 'cumExpense')
  const net = (income?.value ?? 0) - (expense?.value ?? 0)
  return (
    <div className="bg-[#0f1729] border border-white/10 rounded-xl px-3 py-2.5 shadow-xl text-[12px]">
      <p className="text-slate-400 mb-1.5 font-medium">{label}</p>
      {income && <p className="text-emerald-400 font-semibold">Income: {fmt(income.value)}</p>}
      {expense && <p className="text-red-400 font-semibold">Expenses: {fmt(expense.value)}</p>}
      <p className={`mt-1 font-semibold ${net >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>
        Net: {fmt(net)}
      </p>
    </div>
  )
}
