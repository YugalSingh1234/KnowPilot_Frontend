import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { markStep, stepDone } from '../utils.js'

const quiet = () => {} // api() already handles 401; a missing number just shows "–"

export default function Overview({ go }) {
  const [docs, setDocs] = useState(null)
  const [assistant, setAssistant] = useState(null)
  const [usage, setUsage] = useState(null)
  const [opened, setOpened] = useState(() => stepDone('opened'))

  useEffect(() => {
    api('/api/documents', { auth: true }).then(setDocs, quiet)
    api('/api/assistant', { auth: true }).then(setAssistant, quiet)
    api('/api/usage', { auth: true }).then(setUsage, quiet)
  }, [])

  const list = docs?.documents ?? []
  const ready = list.filter((d) => d.status === 'ready').length
  const answered = usage?.by_status?.answered ?? 0
  const total = usage?.total_questions ?? 0

  const steps = [
    {
      title: 'Upload PDFs',
      text: 'Add your prospectus, fee structure or HR policies.',
      done: ready > 0,
      action: <button type="button" className="btn btn-primary" onClick={() => go('kb')}>Upload PDFs</button>,
    },
    {
      title: 'Open your assistant link',
      text: 'Try a few questions the way a visitor would.',
      done: opened,
      action: (
        <a
          href={assistant?.assistant_url}
          target="_blank"
          rel="noreferrer"
          aria-disabled={!assistant}
          onClick={() => {
            markStep('opened')
            setOpened(true)
          }}
          className="btn btn-primary aria-disabled:pointer-events-none aria-disabled:opacity-60"
        >
          Open assistant
        </a>
      ),
    },
    {
      title: 'Embed it on your website',
      text: 'Copy the iframe code into any page.',
      done: stepDone('embedded'),
      action: <button type="button" className="btn btn-primary" onClick={() => go('assistant')}>Get embed code</button>,
    },
  ]
  const doneCount = steps.filter((s) => s.done).length

  const stats = [
    ['Documents ready', docs ? `${ready} / ${docs.limits.max_documents}` : '–'],
    ['Questions asked', usage ? total : '–'],
    ['Answered', usage ? (total ? `${Math.round((answered / total) * 100)}%` : '0%') : '–'],
  ]

  return (
    <div className="space-y-6">
      <section className="panel p-5 sm:p-6">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">Get started</h2>
          <span className="text-sm text-muted tabular-nums">{doneCount} of 3 done</span>
        </div>
        <ol className="mt-4 divide-y divide-line">
          {steps.map((s, i) => (
            <li key={s.title} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
              <span
                className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold ${
                  s.done ? 'bg-ok/15 text-ok' : 'border-2 border-line text-muted'
                }`}
              >
                {s.done ? '✓' : i + 1}
                <span className="sr-only">{s.done ? ' (done)' : ''}</span>
              </span>
              <div className="min-w-0 flex-1">
                <p className={`font-semibold ${s.done ? 'text-muted line-through decoration-1' : ''}`}>{s.title}</p>
                <p className="text-sm text-muted">{s.text}</p>
              </div>
              <div className="shrink-0">{s.action}</div>
            </li>
          ))}
        </ol>
      </section>

      <dl className="grid gap-3 sm:grid-cols-3">
        {stats.map(([name, value]) => (
          <div key={name} className="panel px-5 py-4">
            <dt className="text-sm text-muted">{name}</dt>
            <dd className="mt-1 font-display text-3xl font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
