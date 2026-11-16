import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { authClient } from '@/lib/auth-client'
import { useAction } from '@/lib/actions'

export const Route = createFileRoute('/signup')({ component: SignupPage })

function SignupPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const signup = useAction(() => authClient.signUp.email({ name, email, password }), { onSuccess: () => navigate({ to: '/' }) })
  return (
    <main className="mx-auto w-full max-w-md px-4 pt-10">
      <h1 className="font-display text-3xl font-bold text-ink-950">Join <span className="text-brand-600">Puppibet</span></h1>
      <p className="mt-1 text-sm text-neutral-500">One account for sports, live, jackpot and Aviator.</p>
      <form onSubmit={(e) => { e.preventDefault(); signup.run() }} className="mt-4 space-y-3 rounded-3xl border border-neutral-200 bg-white p-5">
        <fieldset disabled={!signup.ready} className="space-y-3">
          <div><label htmlFor="name" className="text-sm font-semibold">Display name</label><input id="name" required value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2.5" /></div>
          <div><label htmlFor="email" className="text-sm font-semibold">Email</label><input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2.5" /></div>
          <div><label htmlFor="password" className="text-sm font-semibold">Password (8+ characters)</label><input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2.5" /></div>
          <button type="submit" disabled={signup.pending} className="w-full rounded-xl bg-brand-400 py-3 font-bold text-ink-950 hover:bg-brand-300">{signup.pending ? 'Creating…' : 'Create account'}</button>
        </fieldset>
        {signup.error && <p role="alert" className="text-sm text-red-600">{signup.error}</p>}
        <p className="text-center text-sm text-neutral-500">Have an account? <a href="/login" className="font-semibold text-brand-700 underline">Sign in</a></p>
      </form>
    </main>
  )
}
