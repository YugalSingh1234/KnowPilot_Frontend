// Pure helpers (no React) so `npm test` can run them under plain Node.

const rupees = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

/** 650000 -> "₹6,50,000" */
export const inr = (amount) => rupees.format(amount)

/** ISO timestamp -> "08/11/2026" in the viewer's timezone. */
export function ddmmyyyy(iso) {
  // The backend sends microseconds; trim to milliseconds so every browser parses it the same way.
  const date = new Date(iso.replace(/(\.\d{3})\d+/, '$1'))
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** 182344 -> "0.17" */
export const mb = (bytes) => (bytes / 1024 / 1024).toFixed(2)

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Mirrors the backend's register/login rules. Returns {field: message}; empty means valid. */
export function validateAuth({ org_name = '', email = '', password = '' }, mode) {
  const errors = {}
  if (mode === 'register') {
    const name = org_name.trim()
    if (name.length < 2 || name.length > 100) errors.org_name = 'Enter your organization’s name (2–100 characters).'
  }
  if (!EMAIL.test(email.trim())) errors.email = 'Enter a valid email address.'
  if (mode === 'login') {
    if (!password) errors.password = 'Enter your password.'
  } else if (password.length < 8) {
    errors.password = 'Use at least 8 characters.'
  } else if (new TextEncoder().encode(password).length > 72) {
    errors.password = 'This password is too long. Use up to 72 characters.'
  }
  return errors
}

/** Quick checks before uploading; the server re-checks everything. Returns an error or null. */
export function checkPdf(file, maxMb) {
  if (!file.name.toLowerCase().endsWith('.pdf')) return 'Only PDF files are allowed.'
  if (file.size > maxMb * 1024 * 1024) {
    return `File is ${(file.size / 1024 / 1024).toFixed(1)} MB; the limit is ${maxMb} MB.`
  }
  return null
}

// Onboarding checklist flags (Overview). Browser-only: the API has no field for them.
export const markStep = (step) => {
  try {
    localStorage.setItem(`kp_step_${step}`, '1')
  } catch {
    // storage blocked: the step just stays unticked
  }
}

export const stepDone = (step) => {
  try {
    return localStorage.getItem(`kp_step_${step}`) === '1'
  } catch {
    return false
  }
}
