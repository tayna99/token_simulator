# Legacy API Surface

The production frontend uses Next.js App Router route handlers under `app/api/**`.

Files in this `api/**` tree are kept only as the legacy Vite/Vercel-function compatibility
baseline while `legacy:vite:*` remains a regression gate. Do not add production demo tenant,
Supabase Auth membership, RAG, Watchtower, decision, report, retention, or connector behavior
here unless the same contract already exists in `app/api/**`.

Production routes must not import demo fixture fallbacks, memory fallback adapters, or request-body
fixtures as production data. Supabase-backed rows are the only production demo source of truth.
