import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { authClient } from '@/lib/auth-client'
import { useAction } from '@/lib/actions'
import { useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/login')({ component: LoginPage })

function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [ready, setReady] = useState(false)
  useState(() => { if (typeof window !== 'undefined') setTimeout(() => setReady(true), 0) })
  const login = useAction(() => authClient.signIn.email({ email, password }), { onSuccess: () => navigate({ to: '/' }) })
  return (
    <main className="mx-auto w-full max-w-md px-4 pt-10">
      <h1 className="font-display text-3xl font-bold text-ink-950">Welcome back to <span className="text-brand-600">Puppibet</span></h1>
      <p className="mt-1 text-sm text-neutral-500">Sign in to bet, top up and cash out.</p>
      <form onSubmit={(e) => { e.preventDefault(); login.run() }} className="mt-4 space-y-3 rounded-3xl border border-neutral-200 bg-white p-5">
        <fieldset disabled={!login.ready} className="space-y-3">
          <div><label htmlFor="email" className="text-sm font-semibold">Email</label><input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2.5" /></div>
          <div><label htmlFor="password" className="text-sm font-semibold">Password</label><input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2.5" /></div>
          <button type="submit" disabled={login.pending || !ready} className="w-full rounded-xl bg-ink-950 py-3 font-bold text-white hover:bg-ink-900">{login.pending ? 'Signing in…' : 'Sign in'}</button>
        </fieldset>
        {login.error && <p role="alert" className="text-sm text-red-600">{login.error}</p>}
        <p className="text-center text-sm text-neutral-500">New to Puppibet? <a href="/signup" className="font-semibold text-brand-700 underline">Create account</a></p>
      </form>
    </main>
  )
}
