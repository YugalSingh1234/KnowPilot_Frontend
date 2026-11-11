import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router'
import { api, clearToken, getToken } from '../api.js'
import Assistant from './Assistant.jsx'
import KnowledgeBase from './KnowledgeBase.jsx'
import Overview from './Overview.jsx'
import Usage from './Usage.jsx'

// [id, label, page description, icon path]
const TABS = [
  ['overview', 'Overview', 'Your setup progress and a quick look at activity.', 'M4 13h6V4H4zM14 20h6v-9h-6zM14 4v3h6V4zM4 20h6v-3H4z'],
  ['kb', 'Documents', 'The PDFs your assistant answers from. Upload, check status or delete.', 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h4'],
  ['assistant', 'Assistant', 'Share the public link or embed the chat on your website.', 'M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z'],
  ['usage', 'Usage', 'What visitors ask, and how often they get an answer.', 'M4 20V10M10 20V4M16 20v-7M22 20H2'],
]
const PAGES = { overview: Overview, kb: KnowledgeBase, assistant: Assistant, usage: Usage }

function Icon({ d }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
      strokeLinecap="round" strokeLinejoin="round" className="size-5 shrink-0"><path d={d} /></svg>
  )
}

// Protected route: no token means /login. An expired token is caught by api() on its first 401.
export default function Dashboard() {
  return getToken() ? <DashboardPage /> : <Navigate to="/login" replace />
}

function DashboardPage() {
  const navigate = useNavigate()
  const [org, setOrg] = useState(null)
  const [params, setParams] = useSearchParams()
  const current = TABS.find((t) => t[0] === params.get('tab')) ?? TABS[0]
  const [tab, title, about] = current
  const Page = PAGES[tab]
  const go = (id) => {
    setParams(id === 'overview' ? {} : { tab: id })
    window.scrollTo(0, 0)
  }

  useEffect(() => {
    // api() handles a 401; for any other failure the header just goes without the name.
    api('/api/auth/me', { auth: true }).then(setOrg, () => {})
  }, [])

  function logOut() {
    clearToken() // there is no logout endpoint
    navigate('/login', { replace: true })
  }

  const navItem = (vertical) => ([id, label, , d]) => (
    <button
      key={id}
      type="button"
      aria-current={id === tab ? 'page' : undefined}
      onClick={() => go(id)}
      className={
        vertical
          ? 'flex h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted transition-colors hover:bg-fill hover:text-ink aria-[current=page]:bg-accent/10 aria-[current=page]:text-accent-ink'
          : 'flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-muted aria-[current=page]:text-accent-ink'
      }
    >
      <Icon d={d} />
      {label}
    </button>
  )

  return (
    <div className="min-h-dvh lg:flex">
      <title>{`${title} · KnowPilot`}</title>
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-surface p-4 lg:flex">
        <div className="flex items-center gap-2.5 px-2 py-1">
          <img src="/favicon.svg" alt="" className="size-7" />
          <span className="font-display text-lg font-bold tracking-tight">KnowPilot</span>
        </div>
        <nav aria-label="Dashboard" className="mt-6 space-y-1">{TABS.map(navItem(true))}</nav>
        <div className="mt-auto border-t border-line pt-4">
          <p className="truncate px-3 text-sm font-medium">{org?.name}</p>
          <button type="button" onClick={logOut} className="btn btn-quiet mt-1 w-full justify-start px-3 text-muted">
            Log out
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1 pb-16 lg:pb-0">
        <header className="border-b border-line bg-surface lg:hidden">
          <div className="flex h-14 items-center gap-3 px-4">
            <img src="/favicon.svg" alt="" className="size-7" />
            <span className="min-w-0 truncate font-medium">{org?.name ?? 'KnowPilot'}</span>
            <button type="button" onClick={logOut} className="btn btn-quiet -mr-2 ml-auto shrink-0">
              Log out
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:py-10">
          <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 mb-6 text-sm text-muted">{about}</p>
          <Page go={go} />
        </main>
      </div>

      <nav aria-label="Dashboard" className="fixed inset-x-0 bottom-0 z-10 flex border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden">
        {TABS.map(navItem(false))}
      </nav>
    </div>
  )
}
