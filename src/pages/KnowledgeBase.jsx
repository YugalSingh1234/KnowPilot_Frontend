import { useEffect, useRef, useState } from 'react'
import { api } from '../api.js'
import { checkPdf, ddmmyyyy, mb } from '../utils.js'

const STATUS = {
  ready: ['Ready', 'bg-ok/10 text-ok'],
  processing: ['Processing', 'bg-warn/10 text-warn'],
  failed: ['Failed', 'bg-bad/10 text-bad'],
}

function StatusBadge({ status }) {
  const [label, tone] = STATUS[status] ?? [status, 'bg-fill text-muted']
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {label}
    </span>
  )
}

function UploadIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
      strokeLinecap="round" strokeLinejoin="round" className="size-7 text-accent-ink">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M12 18v-6M9.5 14.5 12 12l2.5 2.5" />
    </svg>
  )
}

export default function KnowledgeBase() {
  const [data, setData] = useState(null) // GET /api/documents: {documents, limits}
  const [unavailable, setUnavailable] = useState(false)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(null) // filename being processed
  const [dragging, setDragging] = useState(false)
  const [doomed, setDoomed] = useState(null) // document waiting for delete confirmation
  const [deleting, setDeleting] = useState(false)
  const [reloads, setReloads] = useState(0)
  const dialog = useRef(null)

  useEffect(() => {
    api('/api/documents', { auth: true }).then(setData, (err) => {
      if (err.status === 404 || err.status === 405) setUnavailable(true) // API not shipped yet
      else setError(err.message)
    })
  }, [reloads])
  const load = () => setReloads((n) => n + 1)

  async function upload(files) {
    if (!files.length || uploading) return
    setError('')
    if (files.length > 1) return setError('Upload one PDF at a time.')
    const problem = checkPdf(files[0], data.limits.max_mb)
    if (problem) return setError(problem)

    const form = new FormData()
    form.append('file', files[0])
    setUploading(files[0].name)
    try {
      await api('/api/documents', { method: 'POST', body: form, auth: true })
    } catch (err) {
      setError(err.message)
    }
    setUploading(null)
    load() // also picks up a document the server kept as "failed"
  }

  function askDelete(doc) {
    setDoomed(doc)
    dialog.current.showModal()
  }

  async function confirmDelete() {
    setDeleting(true)
    setError('')
    try {
      await api(`/api/documents/${doomed.id}`, { method: 'DELETE', auth: true })
    } catch (err) {
      setError(err.message)
    }
    setDeleting(false)
    dialog.current.close()
    load()
  }

  const limits = data?.limits
  const docs = data?.documents ?? []

  if (unavailable) {
    return (
      <div className="panel p-5 sm:p-6">
        <h2 className="font-display text-lg font-semibold">Knowledge base</h2>
        <p className="mt-1.5 text-sm text-muted">Coming soon</p>
      </div>
    )
  }

  return (
    <div className="panel p-5 sm:p-6">
      <h2 className="font-display text-lg font-semibold">Knowledge base</h2>
      {limits && (
        <p className="mt-1 text-sm text-pretty text-muted">
          {limits.used_documents} / {limits.max_documents} documents · max {limits.max_pages} pages ·{' '}
          {limits.max_mb} MB per PDF
        </p>
      )}

      {data && (
        <label
          onDragOver={(e) => {
            e.preventDefault()
            if (!uploading) setDragging(true)
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false)
          }}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            upload([...e.dataTransfer.files])
          }}
          className={`mt-5 flex flex-col items-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent-ink ${
            uploading
              ? 'cursor-progress border-line bg-fill'
              : dragging
                ? 'cursor-copy border-accent-ink bg-accent/5'
                : 'cursor-pointer border-line hover:border-accent-ink/60'
          }`}
        >
          <input
            type="file"
            accept=".pdf,application/pdf"
            className="sr-only"
            disabled={Boolean(uploading)}
            onChange={(e) => {
              const files = [...e.target.files]
              e.target.value = '' // lets the same file be picked again after an error
              upload(files)
            }}
          />
          {uploading ? (
            <span role="status" className="flex flex-col items-center">
              <span aria-hidden className="size-7 rounded-full border-2 border-accent-ink border-t-transparent motion-safe:animate-spin" />
              <span className="mt-3 font-semibold">Processing…</span>
              <span className="mt-1 text-sm text-muted wrap-anywhere">
                Reading and indexing {uploading}. This can take up to a minute.
              </span>
            </span>
          ) : (
            <>
              <UploadIcon />
              <span className="mt-3 font-semibold">
                Drop a PDF here or <span className="text-accent-ink underline underline-offset-2">choose a file</span>
              </span>
              <span className="mt-1 text-sm text-muted">Text-based PDFs only. Scanned images can’t be read.</span>
            </>
          )}
        </label>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-bad/10 px-3 py-2.5 text-sm text-bad">
          {error}
        </p>
      )}

      {!data ? (
        !error && <p className="mt-5 text-sm text-muted">Loading documents…</p>
      ) : docs.length === 0 ? (
        <p className="mt-5 text-sm text-muted">
          No documents yet. Upload a prospectus, fee structure or policy to start answering questions.
        </p>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-muted">
                <th scope="col" className="py-2 pr-3 font-medium">File</th>
                <th scope="col" className="hidden px-3 py-2 text-right font-medium sm:table-cell">Pages</th>
                <th scope="col" className="hidden px-3 py-2 text-right font-medium sm:table-cell">Size</th>
                <th scope="col" className="hidden px-3 py-2 text-right font-medium sm:table-cell">Chunks</th>
                <th scope="col" className="hidden px-3 py-2 font-medium sm:table-cell">Status</th>
                <th scope="col" className="hidden px-3 py-2 font-medium sm:table-cell">Uploaded</th>
                <th scope="col" className="py-2 pl-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id} className="border-b border-line last:border-0">
                  <td className="py-3 pr-3">
                    <div className="font-medium wrap-anywhere">{d.filename}</div>
                    {/* Phones: the other columns are hidden, so their values sit under the name. */}
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted sm:hidden">
                      <StatusBadge status={d.status} />
                      <span>
                        {d.page_count} pages · {mb(d.size_bytes)} MB · {d.chunk_count} chunks · {ddmmyyyy(d.created_at)}
                      </span>
                    </div>
                  </td>
                  <td className="hidden px-3 py-3 text-right tabular-nums sm:table-cell">{d.page_count}</td>
                  <td className="hidden px-3 py-3 text-right whitespace-nowrap tabular-nums sm:table-cell">
                    {mb(d.size_bytes)} MB
                  </td>
                  <td className="hidden px-3 py-3 text-right tabular-nums sm:table-cell">{d.chunk_count}</td>
                  <td className="hidden px-3 py-3 sm:table-cell">
                    <StatusBadge status={d.status} />
                  </td>
                  <td className="hidden px-3 py-3 tabular-nums sm:table-cell">{ddmmyyyy(d.created_at)}</td>
                  <td className="py-3 pl-3 text-right">
                    <button
                      type="button"
                      onClick={() => askDelete(d)}
                      className="rounded-md px-2.5 py-1.5 text-sm font-medium text-bad hover:bg-bad/10"
                    >
                      Delete<span className="sr-only"> {d.filename}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {docs.some((d) => d.status === 'failed') && (
        <p className="mt-3 text-sm text-muted">
          Failed documents still count toward your limit. Delete them, then upload again.
        </p>
      )}

      <dialog
        ref={dialog}
        onClose={() => setDoomed(null)}
        aria-labelledby="delete-title"
        className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-line bg-surface p-6 text-ink backdrop:bg-black/50"
      >
        <h2 id="delete-title" className="font-display text-lg font-semibold">Delete this document?</h2>
        <p className="mt-2 text-sm text-muted wrap-anywhere">
          <span className="font-medium text-ink">{doomed?.filename}</span> will be removed and the assistant will
          stop using it. This can’t be undone.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn btn-quiet" disabled={deleting} onClick={() => dialog.current.close()}>
            Cancel
          </button>
          <button type="button" className="btn btn-danger" disabled={deleting} onClick={confirmDelete}>
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </dialog>
    </div>
  )
}
