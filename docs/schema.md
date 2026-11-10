# Data model

```mermaid
erDiagram
  USERS ||--o{ SALES : creates
  USERS ||--o{ PURCHASES : receives
  USERS ||--o{ STOCK_MOVEMENTS : records
  USERS ||--o{ RETURNS : processes
  USERS ||--o{ AUDIT_LOG : acts
  SUPPLIERS ||--o{ PRODUCTS : supplies
  SUPPLIERS ||--o{ PURCHASES : source
  PRODUCTS ||--o{ BATCHES : stocked_as
  PRODUCTS ||--o{ SALE_ITEMS : sold_as
  PRODUCTS ||--o{ STOCK_MOVEMENTS : tracked_for
  BATCHES ||--o{ PURCHASE_ITEMS : received_as
  BATCHES ||--o{ SALE_ITEMS : picked_from
  BATCHES ||--o{ STOCK_MOVEMENTS : changes
  PURCHASES ||--|{ PURCHASE_ITEMS : contains
  SALES ||--|{ SALE_ITEMS : contains
  SALES ||--o{ RETURNS : refunded
  SALE_ITEMS ||--o{ RETURNS : line_return
```

`batches.quantity` is the current on-hand balance. Every purchase, sale, return, opening balance, or adjustment writes a signed `stock_movements.quantity_delta` with a reason and actor. Sale and adjustment paths update the balance and movement in one database transaction. A stock reconciliation compares batch balance with the sum of movements from recorded opening stock onward.
