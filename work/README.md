# Friends Included Ltd finance system

Production-oriented Next.js App Router implementation for Supabase-backed finance capture, manager approvals, Telegram intake, and Google Sheets synchronization.

## Run locally

1. Copy `.env.example` to `.env.local` and fill it with deployment secrets. Do not commit `.env.local`.
2. Run `schema.sql` in the Supabase SQL editor.
3. Install dependencies with `pnpm install` (or `npm install`).
4. Start with `pnpm dev`.

## Integrations

- Telegram webhook: deploy `POST /api/telegram/webhook` and configure Telegram with `setWebhook`. Messages use `S01 <amount> <Project A|Project B> <description>` for sales and `E01 ...` for expenses.
- Google Sheets: create `Sales` and `Expenses` tabs with columns `Reference, Created at, Employee, Project, Amount, Description, Status, Commission`; call `POST /api/sync` or pass `{ "reference": "..." }` to sync one record. Sync is idempotent by reference.
- Supabase is the source of truth. Server routes use the service role key and browser requests are server-mediated.

## Security notes

The credentials included in the request are intentionally not written to the repository. Rotate the Telegram token and Google service-account private key if they were ever exposed outside a trusted secret manager. Add authentication in front of the demo role selector before production use; the API still validates manager mutations server-side.

## Verification

`tests/calculations.test.ts` covers commission-pool cent balancing and the requested €2,400 and €3,930 company-result scenarios without hardcoding those values into application logic.
