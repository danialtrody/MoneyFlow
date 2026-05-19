export default function WelcomeBanner({ user }) {
  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const date = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="pt-8 sm:pt-10 pb-6">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-white text-[22px] sm:text-[26px] font-bold tracking-tight">
          {greeting},{' '}
          <span className="bg-linear-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
            {user?.full_name || user?.email}
          </span>
        </h1>
        <p className="text-slate-500 text-[13px] hidden sm:block flex-shrink-0">{date}</p>
      </div>
    </div>
  )
}
