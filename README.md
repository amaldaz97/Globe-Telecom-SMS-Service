# Globe M360 SMS Service

Production-ready Node.js (TypeScript) REST API for sending SMS messages via Globe M360 API v3.6.1.

## Features

- Single and bulk SMS through one endpoint (`POST /api/sms/send`)
- Direct credential authentication per M360 broadcast request (no token flow)
- Per-recipient delivery submission status with partial failure support
- DLR and MO webhook endpoints with in-memory event storage
- Zod input validation
- Structured logging with Pino (request ID, transaction ID)
- Unit-testable services with Vitest
- Docker-ready with health checks

## Tech Stack

- Node.js 18+
- TypeScript
- Express.js
- Axios
- Zod
- Pino
- Vitest

## Project Structure

```
src/
├── app.ts
├── server.ts
├── routes/
│   ├── sms.routes.ts
│   └── webhook.routes.ts
├── controllers/
│   ├── sms.controller.ts
│   ├── dlr.controller.ts
│   └── mo.controller.ts
├── services/
│   ├── sms.service.ts
│   ├── dlr.service.ts
│   └── mo.service.ts
├── repositories/
│   ├── webhook.repository.ts
│   └── in-memory-webhook.repository.ts
├── clients/
│   └── m360.client.ts
├── middleware/
│   ├── error.middleware.ts
│   └── request-id.middleware.ts
├── config/
│   └── env.ts
├── types/
│   ├── sms.types.ts
│   └── webhook.types.ts
└── utils/
```

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `M360_APP_KEY` | M360 application key |
| `M360_APP_SECRET` | M360 application secret |
| `M360_SMS_URL` | M360 broadcast endpoint (default: `https://api.m360.com.ph/v3/api/broadcast`) |
| `M360_SENDER_ID` | Sender ID / shortcode mask (injected server-side, not accepted from clients) |
| `PORT` | HTTP port (default: 3000) |
| `NODE_ENV` | `development` or `production` |
| `LOG_LEVEL` | Pino log level (default: `info`) |
| `REQUEST_TIMEOUT_MS` | Axios timeout for M360 calls (default: 30000) |

### 3. Run

```bash
npm run dev    # development
npm run build && npm start   # production
npm test       # unit tests
```

## Authentication (M360 v3.6.1)

M360 does **not** use OAuth tokens or Bearer headers. Every SMS request includes credentials in the JSON body:

```json
{
  "app_key": "<M360_APP_KEY>",
  "app_secret": "<M360_APP_SECRET>",
  "msisdn": "639272400575",
  "content": "Hello Customer",
  "shortcode_mask": "<M360_SENDER_ID>",
  "rcvd_transid": "<uuid>",
  "is_intl": false
}
```

The backend generates `rcvd_transid` per recipient using `crypto.randomUUID()`.

## API

### Health Check

```
GET /health
```

### Send SMS

```
POST /api/sms/send
Content-Type: application/json
X-Request-Id: optional-correlation-id
```

**Request:**

```json
{
  "mobileNumbers": ["639171234567", "639181234568"],
  "message": "Hello Customer"
}
```

**Accepted mobile formats** (normalized to `639…` internally):

- `639272400575`
- `09272400575`
- `9272400575`
- `+639272400575`

**Success response (200):**

```json
{
  "success": true,
  "summary": { "total": 2, "successful": 2, "failed": 0 },
  "results": [
    {
      "mobileNumber": "639171234567",
      "status": "SUCCESS",
      "transactionId": "550e8400-e29b-41d4-a716-446655440000",
      "messageId": "M3600503CF798D16B4623014558612961",
      "telcoId": 1,
      "timestamp": "2026-06-16T00:00:00Z"
    }
  ]
}
```

**Partial failure (200, `success: false`):**

```json
{
  "mobileNumber": "639191234569",
  "status": "FAILED",
  "transactionId": "550e8400-e29b-41d4-a716-446655440001",
  "error": "Credits Consumed"
}
```

### DLR Webhook

```
GET /webhooks/dlr
```

| Query Param | Description |
|-------------|-------------|
| `transid` | M360 transaction ID |
| `msisdn` | Recipient mobile number |
| `status_code` | Delivery status code |
| `timestamp` | Event timestamp |
| `rcvd_transid` | Client transaction ID (optional) |
| `msgcount` | Message count (optional) |
| `telco_id` | Telco ID (optional) |

**Status code mapping:**

| status_code | Status |
|-------------|--------|
| 8 | ACKNOWLEDGED |
| 16 | REJECTED |
| 1 | DELIVERED |
| 2 | UNDELIVERED |
| 34 | EXPIRED |

Returns `200 { "success": true }` after storing the event.

### MO Webhook

```
GET /webhooks/mo
```

| Query Param | Description |
|-------------|-------------|
| `transid` | M360 transaction ID |
| `msisdn` | Sender mobile number |
| `message` | Inbound message text |
| `timestamp` | Event timestamp |
| `from` | Sender address |
| `msgcount` | Message count (optional) |
| `telco_id` | Telco ID (optional) |

Returns `200 { "success": true }` after storing the event.

> **Note:** Webhook events are stored in-memory and are lost on service restart. The repository interface allows swapping to a persistent store later.

## M360 Error Handling

Per-recipient errors from M360 (batch continues):

| HTTP | Meaning |
|------|---------|
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Invalid app_key/app_secret |
| 410 | Credits Consumed |

## Troubleshooting

### `shortcode_mask is not provisioned`

**Cause:** `M360_SENDER_ID` in `.env` is not a sender ID provisioned on your Globe M360 account.

**Fix:**

1. Obtain your provisioned `shortcode_mask` from the M360 portal or account manager — see [docs/GLOBE_SENDER_ID.md](docs/GLOBE_SENDER_ID.md)
2. Set it in `.env`:
   ```env
   M360_SENDER_ID=YOUR_PROVISIONED_SHORTCODE_MASK
   ```
3. Restart the server (`npm run dev` or `npm run build && npm start`)

**API response** (after code update) returns a clearer message:

```json
{
  "status": "FAILED",
  "error": "Sender ID not provisioned — set M360_SENDER_ID in server config to your Globe-provisioned shortcode_mask (from M360 portal or account manager)"
}
```

The service logs a **startup warning** in development if `M360_SENDER_ID` looks like a placeholder (`TEST`, `TEST_SENDER`, etc.). In production, startup fails fast instead.

### Other M360 errors

| Error | Likely cause |
|-------|----------------|
| `Credits Consumed` (410) | Top up M360 SMS credits |
| `Invalid app_key/app_secret` (404) | Wrong credentials in `.env` |
| `Unauthorized` (401) | App not enabled for broadcast API |

## Docker

```bash
docker build -t globe-m360-sms-service .
docker run -p 3000:3000 --env-file .env globe-m360-sms-service
```

## Postman

Import [`postman/Globe-M360-SMS-Service.postman_collection.json`](postman/Globe-M360-SMS-Service.postman_collection.json).

## License

UNLICENSED — private use.
