# KnowPilot Frontend

React + Vite + Tailwind frontend for KnowPilot, a multi-tenant AI knowledge & decision assistant for
Indian organizations (colleges, companies).

Organizations register, upload PDFs (up to 10, max 20 pages / 10 MB each) and get a public assistant
link plus an iframe embed code. Visitors ask questions without logging in, in English, Hindi or
Hinglish. Answers cite sources ("File.pdf — Page 4"), and eligibility questions show a
condition-by-condition decision.

Backend (FastAPI): https://github.com/YugalSingh1234/KnowPilot_Backend

## Setup

```
npm install
copy .env.example .env      # macOS/Linux: cp .env.example .env
npm run dev                 # http://localhost:5173
```

`.env` needs one value, the backend base URL with no trailing slash:

```
VITE_API_URL=http://localhost:8000
```

Run the dev server on port 5173: the backend CORS allows only that origin. Start the backend first.

Other commands: `npm run build` · `npm run lint` · `npm test`

## Routes

- `/login`, `/register`: organization admin auth
- `/dashboard`: admin dashboard (overview, knowledge base, assistant, usage). Needs a login token
- `/a/<assistant_token>`: public chat page, embeddable in an iframe

## Deploy to Vercel

1. Push the repo to GitHub and import it at https://vercel.com/new (Vite preset is detected).
2. Add the environment variable `VITE_API_URL` set to your deployed backend URL.
3. Deploy. `vercel.json` rewrites every route to `index.html`, lets `/a/*` be embedded in any site,
   and blocks framing everywhere else.
4. Add the Vercel domain to the backend's CORS allowed origins.

CLI alternative: `vercel login`, then `vercel --prod`.
