# Paytota Payments (Collections + Disbursements)

This project integrates Paytota for:

- **Collections** (customer payments) via `Purchase`
- **Disbursements** (vendor payouts) via `Payout`

The upstream API and callback rules are captured in `additems.txt`.

## Environment variables

Required:

- `PAYTOTA_SECRET_KEY`: used as `Authorization: Bearer <secret>`
- `PAYTOTA_BRAND_ID`: the Paytota brand UUID for your company
- `PAYTOTA_WEBHOOK_PUBLIC_KEY`: RSA public key used to verify callbacks (`X-Signature`)

Optional:

- `PAYTOTA_BASE_URL` (default `https://gate.paytota.com`)
- `PAYTOTA_PAYMENT_METHOD_WHITELIST` (comma-separated), only when intentionally restricting methods
- `PAYTOTA_SKIP_CAPTURE` (`true/false`), only for hold/capture flows
- `PAYTOTA_MIN_PURCHASE_UGX` (default `500`; set `0` to disable app-side minimum check)

## Collections (Purchase)

### Initiate (Step 1)

- Server route: `POST /api/paytota/checkout` (product checkout)
- Server route: `POST /api/paytota/service-payment` (service checkout)
- Upstream: `POST {PAYTOTA_BASE_URL}/api/v1/purchases/`

Both initiation routes store a row in `paytota_transactions` with:

- `transaction_type=collection`
- `direction=inbound`
- `provider_reference=<paytota purchase id>`

### Execute (Step 2, server-to-server)

If you want to trigger the Mobile Money STK prompt from your backend (instead of redirecting to Paytota checkout):

- Server route: `POST /api/paytota/purchase-execute`
- Body:

```json
{ "purchaseId": "<paytota purchase id>" }
```

Upstream call (per `additems.txt`):

- `POST {PAYTOTA_BASE_URL}/p/{id}/` with multipart form data:
  - `s2s=true`
  - `pm=paytota_proxy`

Status updates arrive asynchronously on the webhook.

## Disbursements (Payout)

Admin executes a payout from:

- `PATCH /api/admin/payments` with `{ disbursementId, status: "processing" }`

Upstream calls:

1. Initiate: `POST {PAYTOTA_BASE_URL}/api/v1/payouts/`
2. Execute: `POST {execution_url}` with `{"payout_type":"mobile"}` or bank payload (see `additems.txt`)

The app logs the outbound transaction to `paytota_transactions.admin_disbursement_id` and finalizes status on webhook.

## Webhooks

Route:

- `POST /api/paytota/webhook`

Security:

- Validates `X-Signature` (or `Signature`) using `PAYTOTA_WEBHOOK_PUBLIC_KEY`
- If signature verification fails, responds `401`

Finalization:

- `purchase.*` updates the related `checkout_sessions` / `service_payments`
- `payout.*` updates the related `admin_disbursements` (and `service_provider_payouts` when applicable)

