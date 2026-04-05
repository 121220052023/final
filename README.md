# Ocean of Movies

React + Vite movie discovery app with Firebase auth, browsing pages, and an AI movie assistant.

## Local development

1. Install dependencies:

```bash
npm install
```

2. Create a local env file from `.env.example`.

3. Start the app:

```bash
npm run dev
```

## Production deployment

This project is prepared for Vercel:

- static frontend output from `vite build`
- SPA route rewrites through `vercel.json`
- server-side AI proxy at `/api/ai`

### Required Vercel environment variables

- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL`

### Optional local-only variables

- `VITE_OPENROUTER_API_KEY`
- `VITE_OPENROUTER_MODEL`

Use the `VITE_` variables only for local development. Do not expose production AI keys in the browser.
