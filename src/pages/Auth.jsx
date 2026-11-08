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

  async function onSubmit(e) {
    e.preventDefault()
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

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <title>{`${copy.title} · KnowPilot`}</title>
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <div className="flex items-center gap-2.5">
            <img src="/favicon.svg" alt="" className="size-8" />
            <span className="font-display text-2xl font-bold tracking-tight">KnowPilot</span>
          </div>
          <p className="mt-2 text-sm text-muted">Answers from your own PDFs, with page references.</p>
        </div>

        <form onSubmit={onSubmit} noValidate className="panel space-y-5 p-6 sm:p-8">
          <h1 className="font-display text-xl font-semibold leading-snug">{copy.title}</h1>
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
            <p role="alert" className="rounded-lg bg-bad/10 px-3 py-2.5 text-sm text-bad">
              {serverError}
            </p>
          )}
          <button type="submit" className="btn btn-primary w-full" disabled={busy}>
            {busy ? copy.busy : copy.action}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          {copy.switch[0]}{' '}
          <Link to={copy.switch[2]} className="font-semibold text-accent-ink hover:underline">
            {copy.switch[1]}
          </Link>
        </p>
      </div>
    </main>
  )
}
