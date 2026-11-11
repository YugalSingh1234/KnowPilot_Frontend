import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router'
import { ask, getInfo } from './askApi.js'

const MARKS = {
  TRUE: ['✓', 'Met', 'bg-ok/15 text-ok'],
  FALSE: ['✗', 'Not met', 'bg-bad/15 text-bad'],
  UNKNOWN: ['?', 'Unknown', 'bg-warn/15 text-warn'],
}
const OUTCOMES = {
  ELIGIBLE: ['Eligible', 'border-ok bg-ok/10 text-ok'],
  NOT_ELIGIBLE: ['Not eligible', 'border-bad bg-bad/10 text-bad'],
  NEEDS_MORE_INFO: ['More details needed', 'border-warn bg-warn/10 text-warn'],
}
const KINDS = { system1: 'System 1', llm: 'LLM', retrieval: 'Retrieval', fallback: 'Fallback' }
const RETRYABLE = [0, 429, 503] // network, rate limit, AI/database busy

// Numbers like 650000 -> 6,50,000; strings pass through.
const show = (v) => (typeof v === 'number' ? v.toLocaleString('en-IN') : v)

const cite = (ref) => `${ref.filename} — Page ${ref.page}`

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
    <div className="flex flex-wrap gap-2">
      {refs.map((ref, i) => (
        <details key={i} className="group rounded-2xl border border-line bg-surface text-sm open:w-full">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-2xl px-3 py-1.5 font-medium text-accent-ink">
            <Chevron />
            <span className="wrap-anywhere">{cite(ref)}</span>
          </summary>
          <p className="border-t border-line px-3 py-2.5 leading-relaxed text-muted">{ref.snippet}</p>
        </details>
      ))}
    </div>
  )
}

function Verdict({ decision }) {
  const [label, tone] = OUTCOMES[decision.outcome] ?? [decision.outcome, 'border-line bg-fill']
  const met = decision.booleans.filter((b) => b.result === 'TRUE').length
  return (
    <div className={`flex flex-wrap items-baseline gap-x-3 gap-y-1 border-l-4 px-4 py-3 ${tone}`}>
      <span className="font-display text-xl font-bold leading-none">{label}</span>
      <span className="text-sm">
        {met} of {decision.booleans.length} conditions met
        {decision.score != null && ` · score ${decision.score}/100`}
      </span>
    </div>
  )
}

function HowDecided({ decision }) {
  return (
    <details className="group border-t border-line">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 px-4 py-3 text-sm font-semibold text-accent-ink">
        <Chevron />
        How this was decided
      </summary>
      <div className="space-y-4 px-4 pb-4 text-sm">
        <p className="text-muted">Each condition comes from the documents and is checked by code, not by the AI.</p>
        <ul className="space-y-3.5">
          {decision.booleans.map((b, i) => {
            const [mark, meaning, tone] = MARKS[b.result] ?? ['?', b.result, 'bg-fill']
            return (
              <li key={i} className="flex gap-3">
                <span aria-hidden className={`grid size-6 shrink-0 place-items-center rounded-full font-bold ${tone}`}>
                  {mark}
                </span>
                <div className="min-w-0">
                  <p className="font-medium">
                    <span className="sr-only">{meaning}: </span>
                    {b.label}
                  </p>
                  <p className="mt-0.5 flex flex-wrap gap-x-3 text-muted">
                    <span>
                      Yours: <span className="text-ink">{show(b.user_value) ?? 'not given'}</span>
                    </span>
                    <span>
                      Required: <span className="text-ink">{show(b.required_value)}</span>
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted wrap-anywhere">{cite(b.source)}</p>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </details>
  )
}

function Steps({ trace }) {
  return (
    <details className="group border-t border-line">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 px-4 py-2.5 text-xs font-medium text-muted">
        <Chevron />
        Processing steps
      </summary>
      <ol className="space-y-1 px-4 pb-3 text-xs text-muted">
        {trace.map((t, i) => (
          <li key={i} className="flex items-center gap-3">
            <span className="flex-1 wrap-anywhere">{t.step}</span>
            <span className="rounded bg-fill px-1.5 py-0.5">{KINDS[t.kind] ?? t.kind}</span>
            <span className="w-16 text-right tabular-nums">{Math.round(t.ms)} ms</span>
          </li>
        ))}
      </ol>
    </details>
  )
}

function AssistantMessage({ reply }) {
  const { decision } = reply
  const noAnswer = reply.status === 'no_answer'
  return (
    <div className="max-w-[92%] space-y-2">
      <div
        className={`overflow-hidden rounded-2xl rounded-tl-md border bg-surface ${noAnswer ? 'border-dashed border-muted/50' : 'border-line'}`}
      >
        {decision && <Verdict decision={decision} />}
        {noAnswer && (
          <span className="mx-4 mt-3 inline-block rounded-full bg-fill px-2.5 py-0.5 text-xs font-medium text-muted">
            Not in documents
          </span>
        )}
        {reply.status === 'passages_only' && (
          <p className="border-l-4 border-warn bg-warn/10 px-4 py-2 text-sm font-medium text-warn">
            AI busy, showing relevant passages
          </p>
        )}
        <p
          lang={reply.language === 'hi' ? 'hi' : 'en'}
          className={`px-4 py-3 leading-relaxed whitespace-pre-line ${noAnswer ? 'text-muted' : ''}`}
        >
          {reply.answer}
        </p>
        {decision?.missing_facts.length > 0 && (
          <div className="px-4 pb-3 text-sm">
            <p className="font-medium">To decide, I also need:</p>
            <ul className="mt-1 list-disc pl-5 text-muted">
              {decision.missing_facts.map((fact, i) => (
                <li key={i}>{fact}</li>
              ))}
            </ul>
          </div>
        )}
        {decision && <HowDecided decision={decision} />}
        {reply.trace?.length > 0 && <Steps trace={reply.trace} />}
      </div>
      {reply.references.length > 0 && <References refs={reply.references} />}
    </div>
  )
}

function Typing() {
  return (
    <div className="flex w-fit items-center gap-1 rounded-2xl rounded-tl-md border border-line bg-surface px-4 py-4">
      <span className="sr-only">Finding an answer…</span>
      {[0, 200, 400].map((delay) => (
        <span
          key={delay}
          aria-hidden
          className="size-1.5 rounded-full bg-muted motion-safe:animate-blink"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  )
}

export default function ChatPage() {
  const { token } = useParams()
  const [messages, setMessages] = useState([]) // {role: 'user' | 'error', text} or {role: 'assistant', reply}
  const [input, setInput] = useState('')
  const [waiting, setWaiting] = useState(false)
  const [info, setInfo] = useState(null) // {org_name, suggested_questions}
  const [inactive, setInactive] = useState(false)
  const [faq, setFaq] = useState(false) // header FAQ button re-opens the welcome panel
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
  }, [messages, waiting, faq])

  // retry: re-ask after an error without repeating the user's bubble
  async function send(text, retry = false) {
    const question = text.trim()
    if (!question || waiting) return
    setFaq(false)
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
      <main className="grid min-h-dvh place-items-center px-4 text-center">
        <title>Assistant · KnowPilot</title>
        <p className="text-muted">This assistant link is not active</p>
      </main>
    )
  }

  const orgName = info?.org_name ?? ''
  const suggestions = info?.suggested_questions ?? []

  const welcome = (messages.length === 0 || faq) && (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <div className="text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-accent/10 text-accent-ink">
          <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
            strokeLinecap="round" strokeLinejoin="round" className="size-6">
            <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
          </svg>
        </span>
        <h2 className="mt-3 font-display text-xl font-semibold">{orgName || 'Welcome'}</h2>
        <p className="mt-1 text-muted">Ask me about this organization’s policies</p>
        <p className="mt-1 text-xs text-muted">English, Hindi or Hinglish</p>
      </div>
      {suggestions.length > 0 && (
        <>
          <h3 className="mt-6 text-sm font-semibold">Frequently asked questions</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {suggestions.map((q) => (
              <button
                key={q}
                type="button"
                disabled={waiting}
                onClick={() => {
                  send(q)
                  log.current.focus() // the card disappears; keep focus off <body> without popping the keyboard
                }}
                className="min-h-11 rounded-xl border border-line bg-paper px-3.5 py-2.5 text-left text-sm transition-colors hover:enabled:border-accent-ink/60 hover:enabled:bg-accent/5"
              >
                {q}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )

  return (
    <div className="chat-bg flex h-dvh flex-col sm:p-4">
      <title>{`${orgName} Assistant`.trim()}</title>
      <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col overflow-hidden bg-paper sm:rounded-2xl sm:border sm:border-line sm:shadow-lg">
      <header className="border-b border-line bg-surface">
        <div className="flex items-start gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
          <h1 className="font-display text-lg font-semibold leading-tight">{orgName} Assistant</h1>
          <p className="mt-1 flex gap-1.5 text-xs leading-snug text-muted">
            <svg aria-hidden viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="mt-px size-3.5 shrink-0">
              <rect x="3" y="7" width="10" height="7" rx="1.5" />
              <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
            </svg>
            <span>Answers come only from this organization’s documents. Details you type are not stored.</span>
          </p>
          </div>
          {messages.length > 0 && suggestions.length > 0 && (
            <button type="button" aria-pressed={faq} onClick={() => setFaq((f) => !f)}
              className="btn btn-quiet h-9 shrink-0 border border-line px-3 aria-pressed:bg-fill">
              FAQ
            </button>
          )}
        </div>
      </header>

      <div
        ref={log}
        role="log"
        aria-label="Conversation"
        tabIndex={-1}
        className="flex-1 overflow-y-auto outline-none motion-safe:scroll-smooth"
      >
        <div className="space-y-4 px-4 py-5">
          {messages.map((m, i) =>
            m.role === 'user' ? (
              <p key={i} className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-tr-md bg-accent px-4 py-2.5 whitespace-pre-line text-white wrap-anywhere">
                {m.text}
              </p>
            ) : m.role === 'assistant' ? (
              <AssistantMessage key={i} reply={m.reply} />
            ) : (
              <div key={i} className="flex w-fit max-w-[92%] flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl rounded-tl-md bg-bad/10 px-4 py-2.5 text-sm text-bad">
                <span>{m.text}</span>
                {m.retryWith && i === messages.length - 1 && (
                  <button type="button" disabled={waiting} onClick={() => send(m.retryWith, true)}
                    className="rounded-md border border-bad/40 px-2.5 py-1 font-medium hover:bg-bad/10">
                    Retry
                  </button>
                )}
              </div>
            ),
          )}
          {waiting && <Typing />}
          {welcome}
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          send(input)
        }}
        className="border-t border-line bg-surface"
      >
        <div className="flex gap-2 px-4 pt-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question"
            aria-label="Your question"
            enterKeyHint="send"
            autoComplete="off"
            maxLength={1000}
            className="input flex-1 rounded-full px-4"
          />
          <button
            type="submit"
            aria-label="Send"
            disabled={!input.trim() || waiting}
            className="btn btn-primary size-11 shrink-0 rounded-full p-0"
          >
            <svg aria-hidden viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" className="size-5">
              <path d="M10 16V4M5 9l5-5 5 5" />
            </svg>
          </button>
        </div>
        <p className="py-2 text-center text-[11px] text-muted">Powered by KnowPilot</p>
      </form>
      </div>
    </div>
  )
}
