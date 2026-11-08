# KnowPilot Frontend

Multi-tenant AI Knowledge & Decision Assistant for Indian organizations (colleges, companies).
This repo is the FRONTEND only. The backend (FastAPI) is `../KnowPilot_Backend` and runs at
http://localhost:8000.

## Product
Organizations register, upload up to 10 PDFs (max 20 pages, 10 MB each) and get a public
assistant link `/a/{assistant_token}` plus an iframe embed code. Visitors ask questions without
logging in, in English, Hindi or Hinglish; answers cite "File.pdf — Page 4", and eligibility
questions show a condition-by-condition decision.

## Stack
React 19 + Vite 8, JavaScript (no TypeScript). Tailwind CSS v4 via `@tailwindcss/vite` (no
tailwind.config.js; tokens live in `src/index.css`). react-router 7, declarative
`BrowserRouter`/`Routes`, imported from `react-router`. Oxlint. Deployed on Vercel.

## Layout
- `src/main.jsx`: routes `/login`, `/register`, `/dashboard` (needs a token), `/a/:token` (public)
- `src/api.js`: the only place that calls the backend
- `src/utils.js`: Indian formats, form validation, client-side PDF checks (tested by `src/utils.test.js`)
- `src/pages/`: `Auth.jsx` (login + register), `Dashboard.jsx`, `KnowledgeBase.jsx`
- `src/chat/`: public chat page; `askApi.js` holds `USE_MOCK` and the canned replies

## API rules
- Base URL comes from `VITE_API_URL` (`.env`, untracked; copy `.env.example`). Never hardcode it.
- Exact shapes live in `../KnowPilot_Backend/docs/API_CONTRACT.md`. Never invent fields. Until an
  endpoint is in the contract, keep its mock or placeholder.
- Errors are `{"error": {"code", "message"}}`; `api()` throws `Error(message)` with `.status` and
  `.code`. Show server messages as-is.
- Admin calls pass `{ auth: true }`: the JWT from localStorage is attached, and a 401 clears it and
  goes to /login. Public calls (login, register, ask) never send it.
- There is no logout endpoint: logging out deletes the stored token.

## Design rules
- Mobile-first: everything must work at 360px and inside a 380px iframe (the `/a/` page).
- Light and dark mode follow the OS. Use the semantic tokens (`paper surface ink muted line fill
  accent accent-ink ok warn bad`), never raw palette colors, so both modes stay correct.
- Brand "KnowPilot", accent deep indigo. Headings use `font-display` (Anek Latin); body text stays
  on the system font so Devanagari renders natively.
- Indian formats: money `inr()` → ₹6,50,000; dates `ddmmyyyy()` → DD/MM/YYYY.
- Inputs are 16px (no iOS zoom); touch targets 44px; visible focus; respect reduced motion.

## Commands
- `npm run dev`: http://localhost:5173 (strict port: the backend CORS allows only this origin)
- `npm run build`, `npm run lint`, `npm test` (node:test, no framework)

## Deploy
`vercel.json` rewrites every route to `index.html`. `/a/*` sends `frame-ancestors *` (embeddable);
all other routes send `frame-ancestors 'none'`. Set `VITE_API_URL` in the Vercel project.

## Hard rules
- Only touch the files the current task needs.
- When the backend contract changes, update the matching code here; don't guess ahead of it.
