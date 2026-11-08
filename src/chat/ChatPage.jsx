import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router'
import { ask, ORG_NAME, SUGGESTIONS } from './askApi.js'

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
const KINDS = { system1: 'System 1', llm: 'LLM', retrieval: 'Retrieval', app: 'App' }

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
      </span>
    </div>
  )
}

function HowDecided({ decision, trace }) {
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
                      Yours: <span className="text-ink">{b.user_value ?? 'not given'}</span>
                    </span>
                    <span>
                      Required: <span className="text-ink">{b.required_value}</span>
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted wrap-anywhere">{cite(b.source)}</p>
                </div>
              </li>
            )
          })}
        </ul>
        {trace?.length > 0 && (
          <ol aria-label="Steps" className="space-y-1 border-t border-line pt-3 text-xs text-muted">
            {trace.map((t, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex-1">{t.step}</span>
                <span>{KINDS[t.kind] ?? t.kind}</span>
                <span className="w-16 text-right tabular-nums">{t.ms} ms</span>
              </li>
            ))}
          </ol>
        )}
      </div>
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
        {decision && <HowDecided decision={decision} trace={reply.trace} />}
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
  const log = useRef(null)

  useEffect(() => {
    // Scroll only the conversation, never the page around an embed.
    log.current.scrollTop = log.current.scrollHeight
  }, [messages, waiting])

  async function send(text) {
    const question = text.trim()
    if (!question || waiting) return
    setMessages((m) => [...m, { role: 'user', text: question }])
    setInput('')
    setWaiting(true)
    try {
      const reply = await ask(token, question)
      setMessages((m) => [...m, { role: 'assistant', reply }])
    } catch (err) {
      setMessages((m) => [...m, { role: 'error', text: err.message }])
    }
    setWaiting(false)
  }

  return (
    <div className="flex h-dvh flex-col">
      <title>{`${ORG_NAME} Assistant`}</title>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto max-w-2xl px-4 py-3">
          <h1 className="font-display text-lg font-semibold leading-tight">{ORG_NAME} Assistant</h1>
          <p className="mt-1 flex gap-1.5 text-xs leading-snug text-muted">
            <svg aria-hidden viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="mt-px size-3.5 shrink-0">
              <rect x="3" y="7" width="10" height="7" rx="1.5" />
              <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
            </svg>
            <span>Answers come only from this organization’s documents. Details you type are not stored.</span>
          </p>
        </div>
      </header>

      <div
        ref={log}
        role="log"
        aria-label="Conversation"
        tabIndex={-1}
        className="flex-1 overflow-y-auto outline-none motion-safe:scroll-smooth"
      >
        <div className="mx-auto max-w-2xl space-y-4 px-4 py-5">
          {messages.length === 0 && (
            <div className="py-4">
              <p className="text-muted">
                Ask about anything in {ORG_NAME}’s documents, in English, Hindi or Hinglish.
              </p>
              <div className="mt-4 flex flex-col items-start gap-2">
                {SUGGESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => {
                      send(q)
                      log.current.focus() // the chip disappears; keep focus off <body> without popping the keyboard
                    }}
                    className="rounded-2xl border border-line bg-surface px-3.5 py-2 text-left text-sm hover:border-accent-ink/60"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) =>
            m.role === 'user' ? (
              <p key={i} className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-tr-md bg-accent px-4 py-2.5 whitespace-pre-line text-white wrap-anywhere">
                {m.text}
              </p>
            ) : m.role === 'assistant' ? (
              <AssistantMessage key={i} reply={m.reply} />
            ) : (
              <p key={i} className="w-fit max-w-[92%] rounded-2xl rounded-tl-md bg-bad/10 px-4 py-2.5 text-sm text-bad">
                {m.text}
              </p>
            ),
          )}
          {waiting && <Typing />}
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          send(input)
        }}
        className="border-t border-line bg-surface"
      >
        <div className="mx-auto flex max-w-2xl gap-2 px-4 pt-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question"
            aria-label="Your question"
            enterKeyHint="send"
            autoComplete="off"
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
  )
}
