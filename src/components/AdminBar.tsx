import { useState } from 'react'

export default function AdminBar({
  isAdmin,
  onLogin,
  onLogout,
  error,
}: {
  isAdmin: boolean
  onLogin: (password: string) => void
  onLogout: () => void
  error: string | null
}) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!password) return
    onLogin(password)
    setPassword('')
  }

  return (
    <div className="border-b border-slate-200 bg-white px-4 py-1.5">
      <div className="mx-auto flex max-w-4xl items-center justify-end gap-2 text-sm">
        {isAdmin ? (
          <>
            <span className="flex items-center gap-1 text-xs font-medium text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" /> Admin
            </span>
            <button onClick={onLogout} className="text-xs text-slate-500 hover:text-slate-700">
              Log out
            </button>
          </>
        ) : open ? (
          <form onSubmit={submit} className="flex items-center gap-2">
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin password"
              className="rounded-md border border-slate-300 px-2 py-1 text-xs"
            />
            <button type="submit" className="rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white">
              Log in
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                setPassword('')
              }}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Cancel
            </button>
          </form>
        ) : (
          <button onClick={() => setOpen(true)} className="text-xs text-slate-500 hover:text-slate-700">
            Admin Login
          </button>
        )}
      </div>
      {error && <p className="mx-auto max-w-4xl text-right text-xs text-red-500">{error}</p>}
    </div>
  )
}
