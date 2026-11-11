import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router'
import { ask, getInfo } from './askApi.js'

const MARKS = {
  TRUE: ['✓', 'Met', 'bg-ok/15 text-ok'],
  FALSE: ['✗', 'Not met', 'bg-bad/15 text-bad'],
  UNKNOWN: ['?', 'Unknown', 'bg-warn/15 text-warn'],
}
const OUTCOMES = {
  ELIGIBLE: ['Eligible', 'text-ok'],
  NOT_ELIGIBLE: ['Not eligible', 'text-bad'],
  NEEDS_MORE_INFO: ['More details needed', 'text-warn'],
}
const KINDS = { system1: 'System 1', llm: 'LLM', retrieval: 'Retrieval', fallback: 'Fallback' }
const RETRYABLE = [0, 429, 503] // network, rate limit, AI/database busy

// Numbers like 650000 -> 6,50,000; strings pass through.
const show = (v) => (typeof v === 'number' ? v.toLocaleString('en-IN') : v)

const cite = (ref) => `${ref.filename} — Page ${ref.page}`

// "answerability_gate" -> "Answerability gate"
const stepName = (id) => (id[0].toUpperCase() + id.slice(1)).replaceAll('_', ' ')

// **bold** only. Text stays React children, so React escapes it: no HTML from the answer is ever parsed.
const inline = (line) => line.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? <strong key={i}>{part}</strong> : part))

// Answer text: "- " / "• " / "* " bullet runs become a list; other lines keep their line breaks.
function Markdown({ text }) {
  const blocks = []
  for (const line of text.split('\n')) {
    const item = line.match(/^\s*(?:[-•*])\s+(.*)/)
    const last = blocks.at(-1)
    if (item) {
      if (last?.list) last.lines.push(item[1])
      else blocks.push({ list: true, lines: [item[1]] })
    } else if (line.trim()) {
      if (last && !last.list && !last.gap) last.lines.push(line)
      else blocks.push({ list: false, lines: [line] })
    } else if (last) last.gap = true // blank line ends the paragraph
  }
  return blocks.map((b, i) =>
    b.list ? (
      <ul key={i} className="list-disc space-y-1 pl-5">
        {b.lines.map((l, j) => <li key={j}>{inline(l)}</li>)}
      </ul>
    ) : (
      <p key={i}>
        {b.lines.map((l, j) => (
          <span key={j}>
            {j > 0 && <br />}
            {inline(l)}
          </span>
        ))}
      </p>
    ),
  )
}

function Chevron() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" className="size-3.5 shrink-0 transition-transform group-open:rotate-90">
      <path d="m6 4 4 4-4 4" />
    </svg>
  )
}

function References({ refs }) {
  return (
    <div className="text-sm">
      <p className="text-xs font-medium text-muted">Sources</p>
      <div className="mt-1 divide-y divide-line">
        {refs.map((ref, i) => (
          <details key={i} className="group">
            <summary className="flex min-h-9 cursor-pointer list-none items-center gap-1.5 text-accent-ink">
              <Chevron />
              <span className="wrap-anywhere">{cite(ref)}</span>
            </summary>
            <p className="pb-2 pl-5 leading-relaxed text-muted">{ref.snippet}</p>
          </details>
        ))}
      </div>
    </div>
  )
}

function Verdict({ decision }) {
  const [label, tone] = OUTCOMES[decision.outcome] ?? [decision.outcome, 'text-ink']
  const met = decision.booleans.filter((b) => b.result === 'TRUE').length
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
      <span className={`font-display text-xl font-bold ${tone}`}>{label}</span>
      <span className="text-sm text-muted">
        {met} of {decision.booleans.length} conditions met
        {decision.score != null && ` · score ${decision.score}/100`}
      </span>
    </div>
  )
}

function HowDecided({ decision }) {
  return (
    <details className="group text-sm">
      <summary className="flex min-h-9 cursor-pointer list-none items-center gap-1.5 font-medium text-accent-ink">
        <Chevron />
        How this was decided
      </summary>
      <ul className="mt-2 divide-y divide-line">
        {decision.booleans.map((b, i) => {
          const [mark, meaning, tone] = MARKS[b.result] ?? ['?', b.result, 'bg-fill']
          return (
            <li key={i} className="flex gap-3 py-3">
              <span aria-hidden className={`grid size-6 shrink-0 place-items-center rounded-full font-bold ${tone}`}>{mark}</span>
              <div className="min-w-0">
                <p className="font-medium">
                  <span className="sr-only">{meaning}: </span>
                  {b.label}
                </p>
                <p className="mt-0.5 flex flex-wrap gap-x-3 text-muted">
                  <span>Yours: <span className="text-ink">{show(b.user_value) ?? 'not given'}</span></span>
                  <span>Required: <span className="text-ink">{show(b.required_value)}</span></span>
                </p>
                <p className="mt-0.5 text-xs text-muted wrap-anywhere">{cite(b.source)}</p>
              </div>
            </li>
          )
        })}
      </ul>
    </details>
  )
}

// Developer diagnostics: only shown with ?debug=1
function Steps({ trace }) {
  return (
    <details className="group text-xs text-muted">
      <summary className="flex min-h-9 cursor-pointer list-none items-center gap-1.5 font-medium">
        <Chevron />
        Processing steps
      </summary>
      <ol className="space-y-1 pb-2">
        {trace.map((t, i) => (
          <li key={i}>
            <div className="flex items-center gap-3">
              <span className="flex-1 text-ink wrap-anywhere">{stepName(t.step)}</span>
              <span className="rounded bg-fill px-1.5 py-0.5">{KINDS[t.kind] ?? t.kind}</span>
              <span className="w-16 text-right tabular-nums">{t.ms < 10 ? t.ms.toFixed(1) : Math.round(t.ms)} ms</span>
            </div>
            {t.summary && <p className="mt-0.5 wrap-anywhere">{t.summary}</p>}
          </li>
        ))}
      </ol>
    </details>
  )
}

function AssistantMessage({ reply, debug }) {
  const { decision } = reply
  const noAnswer = reply.status === 'no_answer'
  return (
    <div className="space-y-3">
      {decision && <Verdict decision={decision} />}
      {reply.status === 'passages_only' && <p className="text-sm font-medium text-warn">AI busy, showing relevant passages</p>}
      <div lang={reply.language === 'hi' ? 'hi' : 'en'} className={`space-y-2 leading-relaxed ${noAnswer ? 'text-muted' : ''}`}>
        <Markdown text={reply.answer} />
      </div>
      {decision?.missing_facts.length > 0 && (
        <div className="text-sm">
          <p className="font-medium">To decide, I also need:</p>
          <ul className="mt-1 list-disc pl-5 text-muted">
            {decision.missing_facts.map((fact, i) => <li key={i}>{fact}</li>)}
          </ul>
        </div>
      )}
      {decision && <HowDecided decision={decision} />}
      {reply.references.length > 0 && <References refs={reply.references} />}
      {debug && reply.trace?.length > 0 && <Steps trace={reply.trace} />}
    </div>
  )
}

function Typing() {
  return (
    <div className="flex w-fit items-center gap-1 py-3">
      <span className="sr-only">Finding an answer…</span>
      {[0, 200, 400].map((delay) => (
        <span key={delay} aria-hidden className="size-1.5 rounded-full bg-muted motion-safe:animate-blink"
          style={{ animationDelay: `${delay}ms` }} />
      ))}
    </div>
  )
}

export default function ChatPage() {
  const { token } = useParams()
  const debug = useSearchParams()[0].get('debug') === '1'
  const [messages, setMessages] = useState([]) // {role: 'user' | 'error', text} or {role: 'assistant', reply}
  const [input, setInput] = useState('')
  const [waiting, setWaiting] = useState(false)
  const [info, setInfo] = useState(null) // {org_name, suggested_questions}
  const [inactive, setInactive] = useState(false)
  const log = useRef(null)

  useEffect(() => {
    getInfo(token).then(setInfo, (err) => {
      if (err.status === 404) setInactive(true)
      else setInfo({ org_name: '', suggested_questions: [] }) // still let them ask
    })
  }, [token])

  useEffect(() => {
    if (!log.current) return
    // Scroll only the conversation, never the page around an embed.
    log.current.scrollTop = log.current.scrollHeight
  }, [messages, waiting])

  // retry: re-ask after an error without repeating the user's bubble
  async function send(text, retry = false) {
    const question = text.trim()
    if (!question || waiting) return
    setMessages((m) => (retry ? m.slice(0, -1) : [...m, { role: 'user', text: question }]))
    if (!retry) setInput('')
    setWaiting(true)
    try {
      const reply = await ask(token, question)
      setMessages((m) => [...m, { role: 'assistant', reply }])
    } catch (err) {
      if (err.status === 404) setInactive(true)
      const retryWith = RETRYABLE.includes(err.status) ? question : null
      setMessages((m) => [...m, { role: 'error', text: err.message, retryWith }])
    }
    setWaiting(false)
  }

  if (inactive) {
    return (
      <main className="grid min-h-dvh place-items-center bg-surface px-6 text-center">
        <title>Assistant · KnowPilot</title>
        <div>
          <h1 className="font-display text-xl font-semibold">This assistant isn’t available</h1>
          <p className="mt-1 text-muted">The link may have been regenerated. Ask the organization for the new one.</p>
        </div>
      </main>
    )
  }

  const orgName = info?.org_name ?? ''
  const suggestions = info?.suggested_questions ?? []
  const empty = messages.length === 0

  return (
    <div className="mx-auto flex h-dvh max-w-2xl flex-col bg-surface">
      <title>{orgName || 'Assistant'}</title>
      <header className="border-b border-line px-4 py-3">
        <h1 className="truncate font-display text-base font-semibold">{orgName || 'Assistant'}</h1>
      </header>

      <div ref={log} role="log" aria-label="Conversation" tabIndex={-1}
        className="flex-1 overflow-y-auto outline-none motion-safe:scroll-smooth">
        <div className="space-y-5 px-4 py-5">
          {empty && (
            <div className="pt-6 pb-2">
              <h2 className="font-display text-3xl font-semibold text-balance">
                {orgName ? `Ask ${orgName} anything` : 'Ask a question'}
              </h2>
              <p className="mt-2 text-muted">English, Hindi or Hinglish</p>
              {suggestions.length > 0 && (
                <ul className="mt-6 divide-y divide-line border-y border-line">
                  {suggestions.map((q) => (
                    <li key={q}>
                      <button type="button" disabled={waiting} onClick={() => send(q)}
                        className="flex min-h-11 w-full items-center justify-between gap-3 py-2.5 text-left hover:enabled:text-accent-ink">
                        <span>{q}</span>
                        <svg aria-hidden viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"
                          strokeLinecap="round" strokeLinejoin="round" className="size-4 shrink-0 text-muted"><path d="m6 4 4 4-4 4" /></svg>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {messages.map((m, i) =>
            m.role === 'user' ? (
              <p key={i} className="ml-auto w-fit max-w-[85%] rounded-2xl bg-accent px-4 py-2.5 whitespace-pre-line text-white wrap-anywhere">
                {m.text}
              </p>
            ) : m.role === 'assistant' ? (
              <AssistantMessage key={i} reply={m.reply} debug={debug} />
            ) : (
              <div key={i} className="flex flex-wrap items-center gap-x-3 text-sm text-bad">
                <span>{m.text}</span>
                {m.retryWith && i === messages.length - 1 && (
                  <button type="button" disabled={waiting} onClick={() => send(m.retryWith, true)}
                    className="min-h-11 font-semibold underline underline-offset-2">Retry</button>
                )}
              </div>
            ),
          )}
          {waiting && <Typing />}
        </div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(input) }} className="px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {!empty && suggestions.length > 0 && (
          <div className="-mx-4 mb-2 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
            {suggestions.map((q) => (
              <button key={q} type="button" disabled={waiting} onClick={() => send(q)}
                className="min-h-11 shrink-0 rounded-full bg-fill px-4 text-sm whitespace-nowrap hover:enabled:text-accent-ink disabled:opacity-60">
                {q}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-1 rounded-full bg-fill py-1 pr-1 pl-4">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question"
            aria-label="Your question"
            enterKeyHint="send"
            autoComplete="off"
            maxLength={1000}
            className="h-11 min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-muted"
          />
          <button type="submit" aria-label="Send" disabled={!input.trim() || waiting}
            className="btn btn-primary size-11 shrink-0 rounded-full p-0 disabled:bg-line disabled:text-muted disabled:opacity-100">
            <svg aria-hidden viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" className="size-5"><path d="M10 16V4M5 9l5-5 5 5" /></svg>
          </button>
        </div>
        <p className="mt-2 text-center text-xs text-muted">Answers come only from this organization’s documents · Powered by KnowPilot</p>
      </form>
    </div>
  )
}
