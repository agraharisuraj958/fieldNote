# Fieldnote Pharmacy

A small, fictional pharmacy operations app built for the Pharmacy Management System assessment. Fieldnote uses React, Express, and PostgreSQL. Its interface uses Manrope with olive, ivory, and white tones.

Created by Suraj Agrahari. The public interface also links back to the [project repository](https://github.com/agraharisuraj958/fieldNote).

## Quick start

Requirements: Node.js 20+, npm, and PostgreSQL 14+.

```sh
cp .env.example .env
# Create the database named fieldnote_pharmacy, then edit DATABASE_URL in .env
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Open http://127.0.0.1:5173. The API listens on port 4000 and Vite proxies `/api` requests to it.

## Deploy to Vercel

The frontend is built as a Vite static site and `api/[...path].js` exposes the Express API as a Vercel Function. The deployed app needs a hosted PostgreSQL database; it cannot use the PostgreSQL instance on your computer.

1. Import `https://github.com/agraharisuraj958/fieldNote` into your Vercel account and keep the project root at the repository root. Vercel should detect Vite and use `npm run build` with `dist` as the output directory.
2. Add a PostgreSQL database from Vercel Marketplace (Neon or Supabase), then add `DATABASE_URL` and `JWT_SECRET` to the Vercel project for Production and Preview. Use the provider's pooled connection string with SSL enabled for `DATABASE_URL`; generate a unique secret, for example with `openssl rand -base64 48`.
3. Install the Vercel CLI and link this checkout to the Vercel project: `npx vercel link`.
4. Initialize the hosted database once with the Production variables: `npx vercel env run -e production -- npm run db:migrate`, then `npx vercel env run -e production -- npm run db:seed`. Trigger a Production deployment with `npx vercel --prod` (or push a new commit after the environment variables are set).
5. Open the deployment URL and check `/api/health`. Sign in with the demo administrator credentials shown above. The seed data is fictional and shared by everyone using the public demo, so changes made by visitors affect that shared demo database.

Do not commit `.env.production.local` or any database credentials. For a public demo, use only fictional data and rotate the seeded demo passwords before exposing the app if you do not want visitors to have administrator access.

Demo accounts share the password `FieldnoteDemo26!`:

| Role | Email |
| --- | --- |
| Administrator | `admin@fieldnote.demo` |
| Pharmacist | `pharmacist@fieldnote.demo` |
| Cashier | `cashier@fieldnote.demo` |

These are fictional credentials for a local assessment demo. Change the JWT secret and demo passwords before any shared deployment. Do not use real patient, prescription, or payment data.

## What works

- Sign-in with signed JWT sessions and server-side role checks on write and report routes.
- Dashboard with daily sales, stock valuation, weekly activity, and low-stock / near-expiry alerts.
- Search the product catalogue and batch inventory; add and edit products, and add or edit supplier contacts.
- Receive multi-line purchase batches from a supplier; each receipt updates batch stock, purchase history, movements, and audit log. Already-expired batches cannot be received.
- Create a multi-line sale from one checkout. The server locks available batches, allocates earliest-expiring unexpired stock first, saves sale lines and invoice details, and records stock movements in one transaction. An idempotency key protects a retried sale request.
- Expired stock is omitted from sale allocation; insufficient stock returns a conflict and does not commit partial deductions.
- Return sale quantities with a required reason. Returned quantities are capped at the original sold amount. Restocking and its movement are recorded atomically.
- Stock valuation and near-expiry reports, plus a stock movement audit view.
- Repeatable schema migration and idempotent demo seed. Seed batches and opening movements are inserted once, with three sample invoices and one purchase receipt for dashboard and report review.

## Architecture

The UI is a React single-page app in `src/`. Express routes and role middleware are in `server/src/index.js`. Transaction boundaries live in `server/src/db.js`; FEFO and total calculations are pure rules in `server/src/rules.js`. PostgreSQL DDL is in `server/migrations/001_initial.sql`.

```mermaid
erDiagram
  USERS ||--o{ SALES : creates
  USERS ||--o{ STOCK_MOVEMENTS : records
  USERS ||--o{ AUDIT_LOG : acts
  SUPPLIERS ||--o{ PRODUCTS : supplies
  PRODUCTS ||--o{ BATCHES : has
  PRODUCTS ||--o{ SALE_ITEMS : sold_as
  BATCHES ||--o{ SALE_ITEMS : deducted_from
  BATCHES ||--o{ STOCK_MOVEMENTS : tracks
  SUPPLIERS ||--o{ PURCHASES : receives_from
  PURCHASES ||--|{ PURCHASE_ITEMS : contains
  BATCHES ||--o{ PURCHASE_ITEMS : received_as
  SALES ||--|{ SALE_ITEMS : contains
  SALES ||--o{ RETURNS : returned_against
  SALE_ITEMS ||--o{ RETURNS : returned_line
```

The database enforces foreign keys, nonnegative batch quantities, positive transaction quantities, unique SKUs, batch numbers per product, invoice references, and sale idempotency keys. The sale path uses row locks and a single transaction so concurrent checkouts cannot silently oversell a batch.

## API

All routes are prefixed with `/api`. Protected routes use `Authorization: Bearer <token>`. Errors use `{ "error": { "message": "..." } }`.

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/auth/login` | Public | Validate credentials and issue an 8-hour token |
| GET | `/auth/me` | Signed in | Current session |
| GET | `/dashboard` | Signed in | Daily summary, chart, alerts, recent sales |
| GET/POST | `/products` | Signed in / admin or pharmacist | Search catalogue / create product |
| PATCH | `/products/:id` | Admin or pharmacist | Update product details and active state |
| GET | `/inventory?q=` | Signed in | Batch-level stock search |
| GET | `/suppliers` | Admin or pharmacist | Supplier list |
| POST | `/suppliers` | Administrator | Add a supplier |
| PATCH | `/suppliers/:id` | Administrator | Update supplier contacts |
| GET/POST | `/purchases` | Admin or pharmacist | Purchase history / receive batches with audit movements |
| POST | `/sales` | Team roles | Create itemized FEFO sale; requires unique idempotency key |
| GET | `/sales/:id` | Signed in | Printable invoice data |
| POST | `/returns` | Admin or pharmacist | Reasoned return; optionally restock |
| POST | `/adjustments` | Admin or pharmacist | Reasoned stock correction |
| GET | `/reports/stock` | Admin or pharmacist | Reconciled stock quantity and valuation by product |
| GET | `/reports/expiry` | Admin or pharmacist | Batches expiring within 90 days |
| GET | `/reports/sales?from=&to=` | Admin or pharmacist | Date-range revenue, tax, daily totals, and best sellers |
| GET | `/movements` | Admin or pharmacist | Recent stock movement audit |

OpenAPI 3.1 details are in [docs/openapi.yaml](docs/openapi.yaml), and the relationship diagram is also in [docs/schema.md](docs/schema.md). The short technical report is in [docs/technical-report.md](docs/technical-report.md).

## Tests

```sh
npm test
```

Unit tests cover FEFO ordering, PostgreSQL date parsing, expired-only / insufficient inventory, invalid quantities, and tax totals. The HTTP/PostgreSQL integration test verifies multi-line deductions, purchase receipt and audit, return restocking, stock reconciliation, and rejection of expired sale and purchase batches. Run it against a disposable PostgreSQL database that has been migrated and seeded:

```sh
DATABASE_URL=postgres://postgres:postgres@localhost:5432/fieldnote_pharmacy_test npm run db:migrate
DATABASE_URL=postgres://postgres:postgres@localhost:5432/fieldnote_pharmacy_test npm run db:seed
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/fieldnote_pharmacy_test npm test
```

The integration case creates uniquely named fictional rows, records test sales and receipts, then checks return reconciliation and reports. Use a throwaway database for it.

## Known limitations

- No hosted demo is configured; the assessment brief permits a local-only demo.
- Authentication is suitable for a local demo, but production use needs HTTPS, rate limiting, secret rotation, password reset, CSRF review for cookie sessions, and account-management screens.
- Tax is calculated per line from the product's configured percentage. Refund payment processing and accounting exports are out of scope.
- Fictional product names are not medical recommendations. No patient records or clinical decision support are included.

## Assessment walkthrough outline

1. Sign in as the demo pharmacist and show the daily dashboard and alerts.
2. Open batch inventory and explain why each expiry date is tracked separately.
3. Complete a sale for a product with more than one unexpired batch; show invoice details and the movement log.
4. Try a quantity larger than available stock or an expired-only batch and show the conflict response.
5. Record a reasoned adjustment or return, then show the updated stock report and audit entry.

The repository contains a walkthrough outline, not a recorded video. A reviewer can run the steps locally using the setup above. Candidate-specific fields in the assessment form must be supplied by the candidate.
