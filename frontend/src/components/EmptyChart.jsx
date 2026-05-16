export default function EmptyChart({ className = 'h-[280px]' }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <p className="text-slate-600 text-[13px]">No transactions in this period</p>
    </div>
  )
}
