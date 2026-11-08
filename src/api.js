const API_URL = import.meta.env.VITE_API_URL
const TOKEN_KEY = 'knowpilot_token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

const fail = (message, status, code) => Object.assign(new Error(message), { status, code })

/**
 * Calls the backend. Pass `auth: true` for admin routes: adds the JWT, and a 401 clears it and
 * goes to /login. Errors arrive as {"error": {"code", "message"}}; this throws an Error with that
 * message, plus `.status` and `.code`.
 */
export async function api(path, { method = 'GET', body, auth = false } = {}) {
  if (!API_URL) throw fail('VITE_API_URL is not set. Add it to .env and restart the dev server.', 0)
  const headers = {}
  if (auth) headers.Authorization = `Bearer ${getToken()}`
  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(body)
  }

  let res
  try {
    res = await fetch(API_URL + path, { method, headers, body })
  } catch {
    throw fail('Could not reach the server. Check your connection and try again.', 0)
  }
  if (res.status === 204) return null
  const data = await res.json().catch(() => null)
  if (res.ok) return data

  if (auth && res.status === 401) {
    clearToken()
    window.location.replace('/login')
  }
  throw fail(data?.error?.message || `Request failed (${res.status}).`, res.status, data?.error?.code)
}
