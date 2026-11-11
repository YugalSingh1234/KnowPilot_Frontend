import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { api, setToken } from '../api.js'
import { validateAuth } from '../utils.js'

const COPY = {
  login: {
    title: 'Log in',
    action: 'Log in',
    busy: 'Logging in…',
    switch: ['New to KnowPilot?', 'Create an account', '/register'],
  },
  register: {
    title: 'Create an account',
    action: 'Create account',
    busy: 'Creating account…',
    switch: ['Already have an account?', 'Log in', '/login'],
  },
}

const DEMOS = [
  ['Navodaya Institute', 'admin@navodaya.test'],
  ['Navyug Infotech', 'hr@navyug.test'],
]

function Field({ label, name, error, ...props }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input
        name={name}
        className="input mt-1.5"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
        {...props}
      />
      {error && (
        <span id={`${name}-error`} className="mt-1.5 block text-sm text-bad">
          {error}
        </span>
      )}
    </label>
  )
}

export default function AuthPage({ mode }) {
  const copy = COPY[mode]
  const navigate = useNavigate()
  const [values, setValues] = useState({ org_name: '', email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false) // validate as you type only after the first try
  const [serverError, setServerError] = useState('')
  const [busy, setBusy] = useState(false)

  function onChange(e) {
    const next = { ...values, [e.target.name]: e.target.value }
    setValues(next)
    if (submitted) setErrors(validateAuth(next, mode))
  }

  async function submit(values) {
    const found = validateAuth(values, mode)
    setErrors(found)
    setSubmitted(true)
    setServerError('')
    if (Object.keys(found).length) return

    const email = values.email.trim()
    const body =
      mode === 'register'
        ? { org_name: values.org_name.trim(), email, password: values.password }
        : { email, password: values.password }
    setBusy(true)
    try {
      const data = await api(`/api/auth/${mode}`, { method: 'POST', body })
      setToken(data.access_token)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setServerError(err.message)
      setBusy(false)
    }
  }

  function onSubmit(e) {
    e.preventDefault()
    submit(values)
  }

  function tryDemo(account) {
    const next = { org_name: '', ...account }
    setValues(next)
    submit(next)
  }

  return (
    <main className="min-h-dvh bg-surface">
      <title>{`${copy.title} · KnowPilot`}</title>
      <div className="flex flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <img src="/favicon.svg" alt="" className="mx-auto size-10" />
          <h1 className="mt-4 font-display text-3xl font-semibold">{copy.title}</h1>
          <p className="mt-1 text-muted">Turn your PDFs into an AI assistant</p>
        </div>
        <form onSubmit={onSubmit} noValidate className="space-y-5">
          {mode === 'register' && (
            <Field
              label="Organization name"
              name="org_name"
              autoComplete="organization"
              placeholder="Sunrise College"
              value={values.org_name}
              onChange={onChange}
              error={errors.org_name}
            />
          )}
          <Field
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={values.email}
            onChange={onChange}
            error={errors.email}
          />
          <Field
            label="Password"
            name="password"
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={values.password}
            onChange={onChange}
            error={errors.password}
          />
          {serverError && (
            <p role="alert" className="alert">
              {serverError}
            </p>
          )}
          <button type="submit" className="btn btn-primary h-12 w-full" disabled={busy}>
            {busy ? copy.busy : copy.action}
          </button>
        </form>

        {mode === 'login' && (
          <div className="mt-8 border-t border-line pt-6">
            <p className="text-sm font-semibold">For reviewers</p>
            <p className="mt-1 text-sm text-muted">
              Sample organizations with documents already uploaded. One click signs you in, no password needed.
            </p>
            <ul className="mt-3 divide-y divide-line border-y border-line">
              {DEMOS.map(([name, email]) => (
                <li key={email}>
                  <button type="button" disabled={busy} onClick={() => tryDemo({ email, password: 'Demo@12345' })}
                    className="flex min-h-14 w-full items-center justify-between gap-3 py-2 text-left disabled:opacity-60">
                    <span>
                      <span className="block font-medium">{name}</span>
                      <span className="block text-xs text-muted">{email}</span>
                    </span>
                    <span className="text-sm text-accent-ink">{busy ? 'Signing in…' : 'Sign in ›'}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-muted">
          {copy.switch[0]}{' '}
          <Link to={copy.switch[2]} className="font-semibold text-accent-ink hover:underline">
            {copy.switch[1]}
          </Link>
        </p>
        </div>
      </div>
    </main>
  )
}
