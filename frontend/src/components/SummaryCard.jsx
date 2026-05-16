export default function SummaryCard({ label, value, sub, accentColor }) {
  return (
    <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-5 relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ backgroundColor: accentColor }} />
      <div className="pl-1">
        <p className="text-slate-400 text-[11px] font-medium tracking-wide uppercase mb-1">{label}</p>
        <p className="text-white text-[22px] font-bold tabular-nums leading-tight">{value}</p>
        {sub && <p className="text-slate-500 text-[11px] mt-1">{sub}</p>}
      </div>
    </div>
  )
}
