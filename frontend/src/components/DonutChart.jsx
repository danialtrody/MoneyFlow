import { useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'

function fmt(n) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function DonutChart({ items, total }) {
  const [activeIndex, setActiveIndex] = useState(null)

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start">
      {/* Donut */}
      <div className="relative flex-shrink-0 w-full sm:w-[200px] h-[220px]">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={items}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius={62}
              outerRadius={90}
              paddingAngle={2}
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
                className="text-[10px] font-semibold text-center leading-tight max-w-[100px] line-clamp-2"
                style={{ color: items[activeIndex].color }}
              >
                {items[activeIndex].name}
              </span>
              <span className="text-white text-[15px] font-bold tabular-nums mt-0.5">
                ${fmt(items[activeIndex].value)}
              </span>
              <span className="text-slate-400 text-[10px]">
                {items[activeIndex].pct.toFixed(1)}%
              </span>
            </>
          ) : (
            <>
              <span className="text-slate-400 text-[10px] uppercase tracking-wide">Total</span>
              <span className="text-white text-[16px] font-bold tabular-nums">${fmt(total)}</span>
            </>
          )}
        </div>
      </div>

      {/* Ranked list */}
      <div className="flex-1 overflow-y-auto max-h-[180px] sm:max-h-[220px] space-y-1 pr-1">
        {items.map((item, i) => (
          <div
            key={item.name}
            className={`flex items-center gap-2 py-1 rounded-lg px-1 transition-colors ${activeIndex === i ? 'bg-white/6' : ''}`}
          >
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-slate-300 text-[11px] flex-1 truncate min-w-0">{item.name}</span>
            <span className="text-white text-[11px] font-medium tabular-nums flex-shrink-0">${fmt(item.value)}</span>
            <div className="hidden sm:block w-12 bg-white/8 rounded-full h-1 flex-shrink-0">
              <div
                className="h-1 rounded-full"
                style={{ width: `${item.pct}%`, backgroundColor: item.color }}
              />
            </div>
            <span className="hidden sm:block text-slate-500 text-[10px] w-7 text-right flex-shrink-0">{item.pct.toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
