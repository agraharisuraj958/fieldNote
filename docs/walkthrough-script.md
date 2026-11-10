# 3–5 minute assessment walkthrough script

Use the local demo at `http://127.0.0.1:5173` and sign in as `admin@fieldnote.demo` with the demo password in the README. All records are fictional. Keep the video between three and five minutes.

| Time | Show | Suggested narration |
| --- | --- | --- |
| 0:00–0:25 | Overview dashboard | “This is Fieldnote, a local-first pharmacy management system. It tracks stock by product batch and expiry date. The dashboard surfaces daily activity and items needing attention.” |
| 0:25–0:55 | Products and supplier list | “Products keep their SKU, category, supplier, tax rate, and reorder level. Supplier contacts are maintained separately so purchase receipts can refer to a vendor.” |
| 0:55–1:35 | Purchases → Receive stock | “A purchase receipt can include multiple products. Each line captures a batch number, expiry, quantity, cost, and sale price. Receiving the purchase creates stock and an audit movement together.” |
| 1:35–2:25 | Sales → New sale | “Checkout accepts multiple products. The server locks batches and allocates the earliest unexpired stock first. It calculates configured tax, saves invoice lines, and records stock movements in one transaction.” |
| 2:25–2:55 | Printable invoice | “The completed sale returns an itemized customer copy with subtotal, tax, and total. The receipt can be printed from this screen.” |
| 2:55–3:35 | Reports → Stock valuation, then Expiry watch | “The stock report shows opening quantity plus purchases, sales, returns, and adjustments beside current on-hand quantity. The expiry report lists batches inside the 90-day window.” |
| 3:35–4:15 | Reports → Sales summary, then Activity log | “The date-range report summarizes revenue, tax, daily activity, and best sellers. The movement log provides a trace for each stock change.” |
| 4:15–4:45 | Optional conflict | “Expired-only batches are rejected at checkout. The integration test also verifies that the failed sale leaves the batch unchanged.” |

Before recording, select a clean browser window, make sure PostgreSQL is running, and avoid showing local environment files or system notifications. The project includes this script; it does not include a recorded video file.
