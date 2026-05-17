import { BarChartIcon } from './Icons'

export default function EmptyChart({ className = 'h-[280px]' }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 ${className}`}>
      <span className="text-slate-700"><BarChartIcon /></span>
      <p className="text-slate-600 text-[13px]">No transactions in this period</p>
    </div>
  )
}
