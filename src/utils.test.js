import assert from 'node:assert/strict'
import { test } from 'node:test'
import { checkPdf, ddmmyyyy, inr, mb, validateAuth } from './utils.js'

process.env.TZ = 'Asia/Kolkata' // users are in India; also makes the date checks deterministic

test('Indian formats', () => {
  assert.equal(inr(650000), '₹6,50,000')
  assert.equal(inr(12500000), '₹1,25,00,000')
  assert.equal(ddmmyyyy('2026-11-08T09:03:28.504000+00:00'), '08/11/2026')
  assert.equal(ddmmyyyy('2026-11-08T20:00:00+00:00'), '09/11/2026') // 01:30 IST next day
  assert.equal(mb(182344), '0.17')
})

test('register validation mirrors the backend', () => {
  const ok = { org_name: 'Sunrise College', email: 'admin@sunrise.edu', password: 'min8chars' }
  assert.deepEqual(validateAuth(ok, 'register'), {})
  assert.ok(validateAuth({ ...ok, org_name: ' a ' }, 'register').org_name)
  assert.ok(validateAuth({ ...ok, email: 'admin@sunrise' }, 'register').email)
  assert.ok(validateAuth({ ...ok, password: 'short' }, 'register').password)
  assert.ok(validateAuth({ ...ok, password: 'अ'.repeat(25) }, 'register').password) // 75 bytes
  assert.deepEqual(validateAuth({ email: 'a@b.co', password: 'x' }, 'login'), {})
  assert.ok(validateAuth({ email: 'a@b.co', password: '' }, 'login').password)
})

test('client-side PDF checks', () => {
  assert.equal(checkPdf({ name: 'notes.docx', size: 10 }, 10), 'Only PDF files are allowed.')
  assert.equal(checkPdf({ name: 'Big.PDF', size: 13002342 }, 10), 'File is 12.4 MB; the limit is 10 MB.')
  assert.equal(checkPdf({ name: 'Policy.pdf', size: 182344 }, 10), null)
})
