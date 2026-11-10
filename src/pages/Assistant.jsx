import { useEffect, useRef, useState } from 'react'
import { api } from '../api.js'

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button type="button" onClick={copy} className="btn btn-quiet h-9 border border-line px-3">
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

export default function Assistant() {
  const [data, setData] = useState(null) // GET /api/assistant
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const dialog = useRef(null)

  useEffect(() => {
    api('/api/assistant', { auth: true }).then(setData, (err) => setError(err.message))
  }, [])

  async function regenerate() {
    setBusy(true)
    setError('')
    try {
      setData(await api('/api/assistant/regenerate', { method: 'POST', auth: true }))
    } catch (err) {
      setError(err.message)
    }
    setBusy(false)
    dialog.current.close()
  }

  return (
    <div className="panel p-5 sm:p-6">
      <h2 className="font-display text-lg font-semibold">Assistant</h2>
      {error && <p role="alert" className="mt-3 rounded-lg bg-bad/10 px-3 py-2.5 text-sm text-bad">{error}</p>}
      {!data ? (
        !error && <p className="mt-1.5 text-sm text-muted">Loading…</p>
      ) : (
        <>
          <p className="mt-4 text-sm font-medium">Public link</p>
          <p className="mt-1 rounded-lg bg-fill px-3 py-2 text-sm wrap-anywhere">{data.assistant_url}</p>
          <div className="mt-2 flex gap-2">
            <CopyButton text={data.assistant_url} />
            <a href={data.assistant_url} target="_blank" rel="noreferrer" className="btn btn-quiet h-9 border border-line px-3">
              Open
            </a>
          </div>

          <p className="mt-5 text-sm font-medium">Embed code</p>
          <pre className="mt-1 max-h-32 overflow-auto rounded-lg bg-fill px-3 py-2 text-xs whitespace-pre-wrap wrap-anywhere">
            {data.embed_code}
          </pre>
          <div className="mt-2">
            <CopyButton text={data.embed_code} />
          </div>

          <button type="button" onClick={() => dialog.current.showModal()} className="mt-5 text-sm font-medium text-bad hover:underline">
            Regenerate link
          </button>
        </>
      )}

      <dialog ref={dialog} aria-labelledby="regen-title"
        className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-line bg-surface p-6 text-ink backdrop:bg-black/50">
        <h2 id="regen-title" className="font-display text-lg font-semibold">Regenerate the link?</h2>
        <p className="mt-2 text-sm text-muted">
          The current link and every embed using it stop working immediately. You’ll need to share the new link
          and update the embed code on your website.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn btn-quiet" disabled={busy} onClick={() => dialog.current.close()}>
            Cancel
          </button>
          <button type="button" className="btn btn-danger" disabled={busy} onClick={regenerate}>
            {busy ? 'Regenerating…' : 'Regenerate'}
          </button>
        </div>
      </dialog>
    </div>
  )
}
