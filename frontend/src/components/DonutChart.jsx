import { useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'

function fmt(n) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function DonutChart({ items, total, currency = '' }) {
  const [activeIndex, setActiveIndex] = useState(null)

  return (
    <div className="flex flex-col gap-4">
      {/* Donut */}
      <div className="relative mx-auto w-[200px] h-[220px]" onMouseLeave={() => setActiveIndex(null)}>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={items}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius={62}
              outerRadius={90}
              paddingAngle={items.length > 12 ? 0 : 2}
              strokeWidth={0}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {items.map((entry, i) => (
                <Cell
                  key={entry.name}
                  fill={entry.color}
                  opacity={activeIndex === null || activeIndex === i ? 1 : 0.35}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-3">
          {activeIndex !== null ? (
            <>
              <span
                className="text-[10px] font-semibold text-center leading-tight max-w-[130px] line-clamp-2"
                style={{ color: items[activeIndex].color }}
              >
                {items[activeIndex].name}
              </span>
              <span className="text-white text-[15px] font-bold tabular-nums mt-0.5">
                {fmt(items[activeIndex].value)}{currency ? ` ${currency}` : ''}
              </span>
              <span className="text-slate-400 text-[10px]">
                {items[activeIndex].pct.toFixed(1)}%
              </span>
            </>
          ) : (
            <>
              <span className="text-slate-400 text-[10px] uppercase tracking-wide">Total</span>
              <span className="text-white text-[16px] font-bold tabular-nums">{fmt(total)}{currency ? ` ${currency}` : ''}</span>
            </>
          )}
        </div>
      </div>

      {/* Ranked list */}
      <div className="relative overflow-hidden" style={{ height: '260px' }}>
        <div className="category-list overflow-y-scroll h-full space-y-1 pr-1">
        {items.map((item, i) => (
          <div
            key={item.name}
            className={`flex items-center gap-2 py-1 rounded-lg px-1 transition-colors ${activeIndex === i ? 'bg-white/6' : ''}`}
          >
            <span className="text-slate-500 text-[10px] w-7 flex-shrink-0">{item.pct.toFixed(0)}%</span>
            <span className="text-white text-[11px] font-medium tabular-nums flex-shrink-0">{fmt(item.value)}{currency ? ` ${currency}` : ''}</span>
            <span className="text-slate-300 text-[11px] flex-1 min-w-0 text-right leading-snug">{item.name}</span>
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
          </div>
        ))}
        </div>
        {/* Fade hint — indicates more rows below */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#0f1423]/90 to-transparent" />
      </div>
    </div>
  )
}
