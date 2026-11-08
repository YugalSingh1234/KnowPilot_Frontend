import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { api, clearToken, getToken } from '../api.js'
import KnowledgeBase from './KnowledgeBase.jsx'

const TABS = [
  ['kb', 'Knowledge base'],
  ['assistant', 'Assistant'],
  ['usage', 'Usage'],
]

function Placeholder({ title, children }) {
  return (
    <div className="panel p-5 sm:p-6">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <p className="mt-1.5 text-sm text-muted">{children}</p>
    </div>
  )
}

// Protected route: no token means /login. An expired token is caught by api() on its first 401.
export default function Dashboard() {
  return getToken() ? <DashboardPage /> : <Navigate to="/login" replace />
}

function DashboardPage() {
  const navigate = useNavigate()
  const [org, setOrg] = useState(null)
  const [tab, setTab] = useState('kb')

  useEffect(() => {
    // api() handles a 401; for any other failure the header just goes without the name.
    api('/api/auth/me', { auth: true }).then(setOrg, () => {})
  }, [])

  function logOut() {
    clearToken() // there is no logout endpoint
    navigate('/login', { replace: true })
  }

  // Phones show one section at a time; from lg up all three sit in a grid.
  const shown = (id) => (tab === id ? '' : 'hidden lg:block')

  return (
    <div className="min-h-dvh">
      <title>Dashboard · KnowPilot</title>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <img src="/favicon.svg" alt="" className="size-7" />
          <span className="hidden font-display text-lg font-bold tracking-tight sm:inline">KnowPilot</span>
          <span aria-hidden className="hidden text-muted/50 sm:inline">/</span>
          <span className="min-w-0 truncate font-medium">{org?.name}</span>
          <button type="button" onClick={logOut} className="btn btn-quiet -mr-2 ml-auto shrink-0">
            Log out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5 sm:py-8">
        <nav aria-label="Dashboard sections" className="mb-5 flex rounded-xl bg-fill p-1 lg:hidden">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={tab === id}
              onClick={() => setTab(id)}
              className="h-10 flex-auto rounded-lg px-3 text-sm font-medium whitespace-nowrap text-muted aria-pressed:bg-surface aria-pressed:text-ink aria-pressed:shadow-sm"
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
          <section className={`lg:col-span-2 ${shown('kb')}`}>
            <KnowledgeBase />
          </section>
          <div className="flex flex-col gap-6">
            <section className={shown('assistant')}>
              <Placeholder title="Assistant">Assistant link and embed code coming soon</Placeholder>
            </section>
            <section className={shown('usage')}>
              <Placeholder title="Usage">Usage stats coming soon</Placeholder>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
