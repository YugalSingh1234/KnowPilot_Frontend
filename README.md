# KnowPilot Frontend

React + Vite + Tailwind frontend for KnowPilot, a multi-tenant AI knowledge & decision assistant
for Indian organizations. Backend: `KnowPilot_Backend` (FastAPI).

## Run

```
npm install
copy .env.example .env      # VITE_API_URL=http://localhost:8000
npm run dev                 # http://localhost:5173
```

`npm run build` · `npm run lint` · `npm test`

## Routes

- `/register`, `/login`: organization admin auth
- `/dashboard`: knowledge base (PDF upload and list); assistant and usage are placeholders
- `/a/<assistant_token>`: public chat page, embeddable in an iframe. Uses mock answers for now
  (`USE_MOCK` in `src/chat/askApi.js`)
