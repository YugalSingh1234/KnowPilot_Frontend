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

const BENEFITS = [
  ['M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M12 18v-6M9.5 14.5 12 12l2.5 2.5', 'Upload up to 10 PDFs: policies, fees, prospectus'],
  ['M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z', 'Visitors ask in English, Hindi or Hinglish'],
  ['M9 12l2 2 4-4M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z', 'Every answer cites the file and page'],
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
    <main className="grid min-h-dvh lg:grid-cols-2">
      <title>{`${copy.title} · KnowPilot`}</title>
      <aside className="brand-panel flex flex-col justify-center px-6 py-8 text-white sm:px-12 lg:px-16">
        <div className="flex items-center gap-2.5">
          <img src="/favicon.svg" alt="" className="size-9 rounded-lg bg-white p-1" />
          <span className="font-display text-2xl font-bold tracking-tight">KnowPilot</span>
        </div>
        <p className="mt-6 max-w-md font-display text-3xl leading-tight font-semibold text-balance sm:text-4xl">
          Turn your PDFs into an AI assistant
        </p>
        <ul className="mt-8 hidden space-y-4 text-white/85 sm:block">
          {BENEFITS.map(([d, text]) => (
            <li key={text} className="flex items-start gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/10">
                <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
                  strokeLinecap="round" strokeLinejoin="round" className="size-4.5"><path d={d} /></svg>
              </span>
              <span className="pt-1.5">{text}</span>
            </li>
          ))}
        </ul>
      </aside>

      <div className="flex flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
        <form onSubmit={onSubmit} noValidate className="panel space-y-5 p-6 shadow-sm sm:p-8">
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

        {mode === 'login' && (
          <div className="mt-5 rounded-2xl border border-dashed border-line p-4">
            <p className="text-sm font-semibold">Demo accounts (MVP)</p>
            <div className="mt-3 grid gap-2">
              {DEMOS.map(([name, email]) => (
                <button key={email} type="button" disabled={busy} onClick={() => tryDemo({ email, password: 'Demo@12345' })}
                  className="btn h-auto min-h-11 flex-col items-start gap-0 border border-line bg-surface py-2 text-left hover:enabled:border-accent-ink/60">
                  <span>{name}</span>
                  <span className="text-xs font-normal text-muted">{email}</span>
                </button>
              ))}
            </div>
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
