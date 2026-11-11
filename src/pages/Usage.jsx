import { useEffect, useState } from 'react'
import { api } from '../api.js'

const LANGUAGES = { en: 'English', hi: 'Hindi', hinglish: 'Hinglish' }
const label = (key) => (key[0].toUpperCase() + key.slice(1)).replaceAll('_', ' ')

function Bars({ title, counts, names = {} }) {
  const rows = Object.entries(counts).sort((a, b) => b[1] - a[1])
  const max = Math.max(1, ...rows.map(([, n]) => n))
  return (
    <div className="mt-5">
      <h3 className="text-sm font-medium">{title}</h3>
      {rows.length === 0 && <p className="mt-1 text-sm text-muted">No questions yet.</p>}
      <ul className="mt-2 space-y-2">
        {rows.map(([key, n]) => (
          <li key={key} className="text-sm">
            <div className="flex justify-between">
              <span>{names[key] ?? label(key)}</span>
              <span className="tabular-nums text-muted">{n}</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-fill">
              <div className="h-2 rounded-full bg-accent" style={{ width: `${(n / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function Usage() {
  const [data, setData] = useState(null) // GET /api/usage; keys appear only when > 0
  const [error, setError] = useState('')

  useEffect(() => {
    api('/api/usage', { auth: true }).then(setData, (err) => setError(err.message))
  }, [])

  const s = data?.by_status ?? {}
  const cards = [
    ['Total', data?.total_questions ?? 0],
    ['Answered', s.answered ?? 0],
    ['No answer', s.no_answer ?? 0],
    ['AI busy', s.passages_only ?? 0], // the contract has no "needs more info" count
  ]

  return (
    <div className="panel p-5 sm:p-6">
      {error && <p role="alert" className="mt-3 rounded-lg bg-bad/10 px-3 py-2.5 text-sm text-bad">{error}</p>}
      {!data ? (
        !error && <p className="text-sm text-muted">Loading…</p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {cards.map(([name, n]) => (
              <div key={name} className="rounded-xl bg-fill px-3 py-2.5">
                <dt className="text-xs text-muted">{name}</dt>
                <dd className="font-display text-2xl font-semibold tabular-nums">{n}</dd>
              </div>
            ))}
          </dl>
          <Bars title="By question type" counts={data.by_question_type} />
          <Bars title="By language" counts={data.by_language} names={LANGUAGES} />
        </>
      )}
    </div>
  )
}
