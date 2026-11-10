# Fieldnote Pharmacy — Technical Report

## Project summary

Fieldnote is a local-first pharmacy operations MVP for fictional demo data. The core design goal is to make stock traceable at batch level: each batch retains its own expiry date, cost, selling price, and on-hand balance. The interface uses a restrained olive and ivory palette with Manrope typography and responsive layouts for counter and stock-room use.

## Architecture

The project is a modular monolith. React renders the staff workspace. Express handles authentication, server-side role checks, validation, and business workflows. PostgreSQL stores users, products, suppliers, batches, purchases, sales, returns, movements, and audit events. FEFO allocation and tax totals are separate pure functions, making key rules easy to explain and unit test.

## Data integrity and safety

- A checkout locks eligible batch rows, allocates unexpired stock by earliest expiry, inserts invoice lines and signed stock movements, and decrements balances in a single transaction.
- A failure at any point rolls back all deductions. Quantity constraints and explicit available-stock checks prevent negative stock.
- A sale request includes an idempotency key. Replaying a completed request returns its original sale.
- Returns require a reason and cannot exceed the quantity remaining on the original sale line. Restock decisions create matching movements.
- Adjustments require a nonzero signed quantity and reason. Both changes and material actions are audited with an actor.
- Server middleware checks roles for writes and sensitive reports. UI visibility is a convenience; it is not used as authorization.
- The app contains fictional product names only and provides no clinical recommendations.

## Trade-offs and follow-up work

The staff UI supports multi-item sales, supplier contact maintenance, purchase receiving, and stock, expiry, and sales reports. Authentication uses bearer JWTs for a local assessment demo; a production service would need hardened session management, rate limiting, password recovery, secret rotation, and operational monitoring. No hosted demo or recorded walkthrough is included.

## Verification

The production frontend bundle builds with `npm run build`. Unit tests cover FEFO, expired/insufficient inventory, invalid quantities, and tax totals. The PostgreSQL HTTP integration test covers multi-line batch deductions, purchase receiving, returns, stock reconciliation, and expired stock conflicts. The complete suite was run against an isolated, disposable PostgreSQL database.
