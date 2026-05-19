import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { updateProfile } from '../services/authService'
import { CloseIcon } from './Icons'

export default function EditProfileModal({ onClose, addToast }) {
  const { user, setUser } = useAuth()
  const [fullName, setFullName] = useState(user?.full_name ?? '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!fullName.trim()) {
      setError('Full name is required.')
      return
    }

    if (newPassword) {
      if (newPassword.length < 8) {
        setError('New password must be at least 8 characters.')
        return
      }
      if (newPassword !== confirmPassword) {
        setError('New passwords do not match.')
        return
      }
    }

    const payload = { full_name: fullName.trim() }
    if (newPassword) {
      payload.current_password = currentPassword
      payload.new_password = newPassword
    }

    setSaving(true)
    try {
      const updated = await updateProfile(payload)
      setUser(updated)
      addToast('success', 'Profile updated successfully.')
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-white text-[13px] placeholder-slate-600 focus:outline-none focus:border-blue-500/60 focus:bg-white/[0.06] transition-colors duration-150'
  const labelClass = 'block text-slate-400 text-[11.5px] font-medium mb-1.5'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-[#0f1423] border border-white/10 rounded-2xl shadow-2xl"
        style={{ animation: 'fadeInUp 0.2s cubic-bezier(0.22,1,0.36,1) both' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/8">
          <div>
            <h2 className="text-white text-[15px] font-semibold">Edit Profile</h2>
            <p className="text-slate-500 text-[12px] mt-0.5">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-slate-500 hover:text-slate-300 transition-colors duration-150"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
          {/* Full name */}
          <div>
            <label htmlFor="ep-full-name" className={labelClass}>Full name</label>
            <input
              id="ep-full-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={inputClass}
              placeholder="Your name"
              maxLength={255}
            />
          </div>

          {/* Password section */}
          <div className="pt-1 border-t border-white/6">
            <p className="text-slate-500 text-[11.5px] mb-3 mt-2">
              Leave password fields blank to keep your current password.
            </p>
            <div className="space-y-3">
              <div>
                <label htmlFor="ep-current-password" className={labelClass}>Current password</label>
                <input
                  id="ep-current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className={inputClass}
                  placeholder="Required to change password"
                  autoComplete="current-password"
                />
              </div>
              <div>
                <label htmlFor="ep-new-password" className={labelClass}>New password</label>
                <input
                  id="ep-new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={inputClass}
                  placeholder="Min 8 characters"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label htmlFor="ep-confirm-password" className={labelClass}>Confirm new password</label>
                <input
                  id="ep-confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputClass}
                  placeholder="Repeat new password"
                  autoComplete="new-password"
                />
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-red-400 text-[12px] bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-[13px] text-slate-400 hover:text-slate-200 border border-white/8 hover:border-white/[0.14] rounded-lg transition-all duration-150"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 text-[13px] font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors duration-150"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
