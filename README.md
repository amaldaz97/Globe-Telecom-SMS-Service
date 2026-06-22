# Globe M360 SMS Service

A production-ready Node.js (TypeScript) REST API that integrates with **Globe M360 API v3.6.1** for outbound SMS, delivery reports (DLR), and mobile-originated (MO) inbound messages.

---

## Important Notice — Sender ID Not Provisioned

> **The SMS API will not work as expected until a valid Globe-provisioned Sender ID (`shortcode_mask`) is mapped to this integration.**

At present, the `M360_SENDER_ID` configured for this service is **not linked to the M360 `app_key`** in use. M360 will reject broadcast requests with an error such as:

```
The shortcode_mask is not provisioned.
```

This does **not** indicate a code defect — the integration layer is functioning correctly. SMS delivery will succeed only after Globe provisions and maps a Sender ID to your account. See [Obtaining Your M360 Sender ID](#obtaining-your-m360-sender-id) and [docs/GLOBE_SENDER_ID.md](docs/GLOBE_SENDER_ID.md) for resolution steps.

---

## Table of Contents

1. [Globe M360 API Reference](#1-globe-m360-api-reference)
   - [Overview](#overview)
   - [Authentication Model](#authentication-model)
   - [Broadcast SMS API (Outbound)](#broadcast-sms-api-outbound)
   - [DLR Webhook (Delivery Reports)](#dlr-webhook-delivery-reports)
   - [MO Webhook (Inbound SMS)](#mo-webhook-inbound-sms)
   - [M360 HTTP Error Codes](#m360-http-error-codes)
   - [End-to-End SMS Flow](#end-to-end-sms-flow)
2. [This Service — Implementation & API Reference](#2-this-service--implementation--api-reference)
   - [What Has Been Built](#what-has-been-built)
   - [Architecture](#architecture)
   - [How This Service Integrates with M360](#how-this-service-integrates-with-m360)
   - [Service API Reference](#service-api-reference)
   - [Environment Configuration](#environment-configuration)
   - [Quick Start](#quick-start)
   - [Project Structure](#project-structure)
   - [Testing](#testing)
   - [Docker](#docker)
   - [Troubleshooting](#troubleshooting)
3. [Postman Collection](#postman-collection)
4. [License](#license)

---

## 1. Globe M360 API Reference

This section documents the **Globe Telecom M360 HTTP SMS API (v3.6.1)** as used by this project. M360 is Globe Business's multichannel messaging platform. Official developer resources are available via the [M360 portal](https://www.m360.com.ph/) and [Globe Business SMS API](https://www.globe.com.ph/business/sme/solutions/sms-api.html).

### Overview

| Item | Detail |
|------|--------|
| **Provider** | Globe Telecom — M360 |
| **API Version** | v3.6.1 |
| **Protocol** | REST over HTTPS |
| **Content Type** | `application/json` |
| **Primary Use** | Send SMS to Philippine mobile numbers (MSISDN) |
| **Callback Model** | M360 pushes DLR and MO events to your registered webhook URLs |

M360 does **not** use OAuth, Bearer tokens, or session-based authentication. Credentials are sent in the JSON request body on every broadcast call.

### Authentication Model

Each outbound SMS request must include:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `app_key` | string | Yes | Application key from the M360 / Globe Business portal |
| `app_secret` | string | Yes | Application secret paired with `app_key` |
| `shortcode_mask` | string | Yes | Globe-provisioned Sender ID (alphanumeric mask or numeric shortcode) linked to `app_key` |

> The `shortcode_mask` must be **active, approved, and mapped** to your `app_key`. Unprovisioned values cause immediate rejection.

### Broadcast SMS API (Outbound)

Sends a single SMS message to one recipient per request.

| Item | Value |
|------|-------|
| **Endpoint** | `POST https://api.m360.com.ph/v3/api/broadcast` |
| **Method** | `POST` |
| **Content-Type** | `application/json` |

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `app_key` | string | Yes | M360 application key |
| `app_secret` | string | Yes | M360 application secret |
| `msisdn` | string | Yes | Recipient mobile number in `639XXXXXXXXX` format |
| `content` | string | Yes | SMS message body (standard GSM: up to 160 characters) |
| `shortcode_mask` | string | Yes | Provisioned Sender ID for this `app_key` |
| `rcvd_transid` | string | Yes | Client-generated unique transaction ID (used for DLR correlation) |
| `is_intl` | boolean | Yes | `false` for Philippine domestic numbers |

#### Example Request

```json
{
  "app_key": "<M360_APP_KEY>",
  "app_secret": "<M360_APP_SECRET>",
  "msisdn": "639272400575",
  "content": "Hello Customer",
  "shortcode_mask": "<PROVISIONED_SENDER_ID>",
  "rcvd_transid": "550e8400-e29b-41d4-a716-446655440000",
  "is_intl": false
}
```

#### Example Success Response

```json
{
  "messageId": "M3600503CF798D16B4623014558612961",
  "code": 201,
  "telco_id": 1,
  "timestamp": "2026-06-16T00:00:00Z"
}
```

#### cURL — Direct M360 Broadcast Request

```bash
curl -X POST "https://api.m360.com.ph/v3/api/broadcast" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "app_key": "YOUR_M360_APP_KEY",
    "app_secret": "YOUR_M360_APP_SECRET",
    "msisdn": "639272400575",
    "content": "Hello from Sun Mobility",
    "shortcode_mask": "YOUR_PROVISIONED_SENDER_ID",
    "rcvd_transid": "550e8400-e29b-41d4-a716-446655440000",
    "is_intl": false
  }'
```

> Replace `YOUR_M360_APP_KEY`, `YOUR_M360_APP_SECRET`, and `YOUR_PROVISIONED_SENDER_ID` with values from the M360 portal. This call will fail until the Sender ID is provisioned and mapped.

### DLR Webhook (Delivery Reports)

After an SMS is submitted, M360 sends **Delivery Report (DLR)** callbacks to a URL you register in the M360 portal. M360 calls your endpoint via **HTTP GET** with query parameters.

| Item | Value |
|------|-------|
| **Direction** | M360 → Your server |
| **Method** | `GET` |
| **Purpose** | Notify delivery status of a previously sent message |

#### Query Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `transid` | Yes | M360 transaction ID |
| `msisdn` | Yes | Recipient mobile number |
| `status_code` | Yes | Numeric delivery status code |
| `timestamp` | Yes | Event timestamp |
| `rcvd_transid` | No | Client transaction ID sent during broadcast (`rcvd_transid`) |
| `msgcount` | No | Number of message parts |
| `telco_id` | No | Telco identifier |

#### DLR Status Code Mapping

| `status_code` | Status | Meaning |
|---------------|--------|---------|
| `8` | ACKNOWLEDGED | Message accepted by the network |
| `16` | REJECTED | Message rejected |
| `1` | DELIVERED | Successfully delivered to handset |
| `2` | UNDELIVERED | Could not be delivered |
| `34` | EXPIRED | Message expired before delivery |

#### Example DLR Callback URL

```
GET https://your-server.example.com/webhooks/dlr?transid=T001&msisdn=639272400575&status_code=1&timestamp=2026-06-16T00:00:00Z&rcvd_transid=550e8400-e29b-41d4-a716-446655440000&msgcount=1&telco_id=1
```

Your server should respond with HTTP `200` to acknowledge receipt.

### MO Webhook (Inbound SMS)

When a subscriber replies to your Sender ID or shortcode, M360 forwards the **Mobile Originated (MO)** message to your registered webhook URL via **HTTP GET**.

| Item | Value |
|------|-------|
| **Direction** | M360 → Your server |
| **Method** | `GET` |
| **Purpose** | Deliver inbound SMS from subscribers |

#### Query Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `transid` | Yes | M360 transaction ID |
| `msisdn` | Yes | Sender mobile number |
| `message` | Yes | Inbound message text |
| `timestamp` | Yes | Event timestamp |
| `from` | Yes | Sender address |
| `msgcount` | No | Number of message parts |
| `telco_id` | No | Telco identifier |

#### Example MO Callback URL

```
GET https://your-server.example.com/webhooks/mo?transid=MO001&msisdn=639272400575&message=STOP&timestamp=2026-06-16T00:00:00Z&from=639272400575&msgcount=1&telco_id=1
```

Your server should respond with HTTP `200` to acknowledge receipt.

### M360 HTTP Error Codes

| HTTP Status | Meaning | Typical Cause |
|-------------|---------|---------------|
| `400` | Bad Request | Malformed or invalid request payload |
| `401` | Unauthorized | App not enabled for the broadcast API |
| `403` | Forbidden | Access denied for this operation |
| `404` | Not Found | Invalid `app_key` / `app_secret` |
| `410` | Gone | SMS credits consumed — account needs top-up |

### End-to-End SMS Flow

```
┌─────────────┐     POST /api/sms/send      ┌──────────────────┐     POST /v3/api/broadcast     ┌─────────────┐
│   Client    │ ──────────────────────────► │  This Service    │ ─────────────────────────────► │  Globe M360 │
│  (Your App) │                             │  (Integration)   │                                │     API     │
└─────────────┘                             └──────────────────┘                                └──────┬──────┘
                                                                                                     │
                        ┌────────────────────────────────────────────────────────────────────────────┘
                        │
                        ▼
              ┌──────────────────┐     GET /webhooks/dlr     ┌──────────────────┐
              │  Globe M360      │ ────────────────────────► │  This Service    │
              │  (DLR callback)  │     GET /webhooks/mo      │  (Webhook store) │
              └──────────────────┘ ────────────────────────► └──────────────────┘
```

1. Your application calls this service to send SMS.
2. This service calls M360's broadcast API once per recipient, injecting credentials and Sender ID server-side.
3. M360 returns a `messageId` per successful submission.
4. M360 later pushes DLR status updates and MO replies to the webhook endpoints exposed by this service.

---

## 2. This Service — Implementation & API Reference

### What Has Been Built

This repository implements a complete integration layer on top of Globe M360 v3.6.1:

| Capability | Description |
|------------|-------------|
| **Outbound SMS** | Single and bulk SMS via one endpoint (`POST /api/sms/send`) |
| **M360 Client** | Axios-based HTTP client for the M360 broadcast API with timeout, error mapping, and structured logging |
| **Credential Security** | `app_key`, `app_secret`, and `shortcode_mask` are read from server environment — never accepted from API clients |
| **Philippine Number Handling** | Accepts multiple input formats; normalizes to `639XXXXXXXXX` before calling M360 |
| **Partial Failure Support** | Bulk sends use `Promise.allSettled` — one recipient failure does not block others |
| **Transaction IDs** | Generates a unique `rcvd_transid` (UUID) per recipient for DLR correlation |
| **DLR Webhook** | `GET /webhooks/dlr` — validates, maps status codes, and stores delivery events |
| **MO Webhook** | `GET /webhooks/mo` — validates and stores inbound SMS events |
| **Input Validation** | Zod schemas for SMS payloads and webhook query parameters |
| **Error Handling** | Maps M360 errors to actionable messages (e.g. unprovisioned Sender ID, credits consumed) |
| **Sender ID Guardrails** | Startup validation warns (dev) or fails (production) on placeholder Sender IDs |
| **Observability** | Pino structured logging with request ID and per-recipient transaction ID |
| **Health Check** | `GET /health` for load balancers and Docker |
| **Unit Tests** | Vitest coverage for services, client, phone utils, and error mapping |
| **Docker** | Multi-stage build, non-root user, built-in health check |
| **Postman Collection** | Ready-to-import collection for manual testing |

> **Webhook storage:** DLR and MO events are persisted in-memory and are lost on service restart. The `WebhookRepository` interface is designed to allow a future swap to Redis, PostgreSQL, or another persistent store.

### Architecture

```
src/
├── app.ts                          # Express app factory
├── server.ts                       # HTTP server, graceful shutdown
├── routes/
│   ├── sms.routes.ts               # POST /api/sms/send
│   └── webhook.routes.ts           # GET /webhooks/dlr, /webhooks/mo
├── controllers/
│   ├── sms.controller.ts           # Request validation, response formatting
│   ├── dlr.controller.ts
│   └── mo.controller.ts
├── services/
│   ├── sms.service.ts              # Bulk send orchestration
│   ├── dlr.service.ts              # DLR event processing
│   └── mo.service.ts               # MO event processing
├── clients/
│   └── m360.client.ts              # M360 broadcast HTTP client
├── repositories/
│   ├── webhook.repository.ts       # Repository interface
│   └── in-memory-webhook.repository.ts
├── middleware/
│   ├── error.middleware.ts         # Global error handler
│   └── request-id.middleware.ts    # X-Request-Id propagation
├── config/
│   ├── env.ts                      # Zod-validated environment
│   └── validate-sender.ts          # Sender ID placeholder check
├── types/
│   ├── sms.types.ts
│   └── webhook.types.ts
└── utils/
    ├── phone.ts                    # Normalize & validate PH numbers
    ├── validation.ts               # Zod schemas
    ├── errors.ts                   # Typed application errors
    ├── m360-errors.ts              # M360 error message mapping
    ├── logger.ts                   # Pino logger
    └── transaction.ts              # UUID transaction ID generator
```

### How This Service Integrates with M360

For each recipient in a send request, the service:

1. Normalizes the mobile number to `639XXXXXXXXX`.
2. Generates a unique `transactionId` (sent to M360 as `rcvd_transid`).
3. Calls `POST https://api.m360.com.ph/v3/api/broadcast` with server-side credentials and `M360_SENDER_ID`.
4. Returns per-recipient `SUCCESS` or `FAILED` status with `messageId` or error detail.
5. Awaits DLR/MO callbacks from M360 on the registered webhook URLs.

### Service API Reference

**Base URL (local development):** `http://localhost:3000`

#### Health Check

Verifies the service is running. Used by Docker and load balancers.

| Item | Value |
|------|-------|
| **Endpoint** | `GET /health` |
| **Auth** | None |

**Response `200`:**

```json
{ "status": "ok" }
```

**cURL:**

```bash
curl -X GET "http://localhost:3000/health"
```

---

#### Send SMS

Send a single or bulk SMS. The service handles M360 communication internally.

| Item | Value |
|------|-------|
| **Endpoint** | `POST /api/sms/send` |
| **Content-Type** | `application/json` |
| **Auth** | None (credentials injected server-side) |

**Request Headers:**

| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | `application/json` |
| `X-Request-Id` | No | Correlation ID for logging and tracing |

**Request Body:**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `mobileNumbers` | string[] | Yes | At least one valid Philippine mobile number |
| `message` | string | Yes | 1–160 characters |

**Accepted mobile number formats** (normalized internally to `639XXXXXXXXX`):

- `639272400575`
- `09272400575`
- `9272400575`
- `+639272400575`

**Success Response `200`:**

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
    },
    {
      "mobileNumber": "639181234568",
      "status": "SUCCESS",
      "transactionId": "550e8400-e29b-41d4-a716-446655440001",
      "messageId": "M3600503CF798D16B4623014558612962",
      "telcoId": 1,
      "timestamp": "2026-06-16T00:00:00Z"
    }
  ]
}
```

**Partial Failure Response `200`** (`success: false` when any recipient fails):

```json
{
  "success": false,
  "summary": { "total": 2, "successful": 1, "failed": 1 },
  "results": [
    {
      "mobileNumber": "639171234567",
      "status": "SUCCESS",
      "transactionId": "550e8400-e29b-41d4-a716-446655440000",
      "messageId": "M3600503CF798D16B4623014558612961",
      "telcoId": 1,
      "timestamp": "2026-06-16T00:00:00Z"
    },
    {
      "mobileNumber": "639191234569",
      "status": "FAILED",
      "transactionId": "550e8400-e29b-41d4-a716-446655440001",
      "error": "Sender ID not provisioned — set M360_SENDER_ID in server config to your Globe-provisioned shortcode_mask (from M360 portal or account manager)"
    }
  ]
}
```

**Validation Error Response `400`:**

```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "mobileNumbers": ["At least one mobile number is required"],
    "message": ["Message is required"]
  }
}
```

**cURL — Send Single SMS:**

```bash
curl -X POST "http://localhost:3000/api/sms/send" \
  -H "Content-Type: application/json" \
  -H "X-Request-Id: my-correlation-id-001" \
  -d '{
    "mobileNumbers": ["639171234567"],
    "message": "Hello from Sun Mobility"
  }'
```

**cURL — Send Bulk SMS:**

```bash
curl -X POST "http://localhost:3000/api/sms/send" \
  -H "Content-Type: application/json" \
  -H "X-Request-Id: my-correlation-id-002" \
  -d '{
    "mobileNumbers": [
      "639171234567",
      "639181234568",
      "639191234569"
    ],
    "message": "Hello from Sun Mobility"
  }'
```

---

#### DLR Webhook

Receives delivery report callbacks from M360. Register this URL in the M360 portal.

| Item | Value |
|------|-------|
| **Endpoint** | `GET /webhooks/dlr` |
| **Called By** | Globe M360 (outbound callback) |

**Query Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `transid` | Yes | M360 transaction ID |
| `msisdn` | Yes | Recipient mobile number |
| `status_code` | Yes | Delivery status code (see [DLR Status Code Mapping](#dlr-status-code-mapping)) |
| `timestamp` | Yes | Event timestamp |
| `rcvd_transid` | No | Client transaction ID from the original send |
| `msgcount` | No | Message part count |
| `telco_id` | No | Telco identifier |

**Response `200`:**

```json
{ "success": true }
```

**cURL:**

```bash
curl -X GET "http://localhost:3000/webhooks/dlr?transid=T001&msisdn=639272400575&status_code=1&timestamp=2026-06-16T00:00:00Z&rcvd_transid=550e8400-e29b-41d4-a716-446655440000&msgcount=1&telco_id=1"
```

---

#### MO Webhook

Receives inbound SMS from subscribers. Register this URL in the M360 portal.

| Item | Value |
|------|-------|
| **Endpoint** | `GET /webhooks/mo` |
| **Called By** | Globe M360 (outbound callback) |

**Query Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `transid` | Yes | M360 transaction ID |
| `msisdn` | Yes | Sender mobile number |
| `message` | Yes | Inbound message text |
| `timestamp` | Yes | Event timestamp |
| `from` | Yes | Sender address |
| `msgcount` | No | Message part count |
| `telco_id` | No | Telco identifier |

**Response `200`:**

```json
{ "success": true }
```

**cURL:**

```bash
curl -X GET "http://localhost:3000/webhooks/mo?transid=MO001&msisdn=639272400575&message=STOP&timestamp=2026-06-16T00:00:00Z&from=639272400575&msgcount=1&telco_id=1"
```

---

### Environment Configuration

Copy the example file and fill in your M360 credentials:

```bash
cp .env.example .env
```

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `M360_APP_KEY` | Yes | — | M360 application key from Globe Business portal |
| `M360_APP_SECRET` | Yes | — | M360 application secret |
| `M360_SMS_URL` | No | `https://api.m360.com.ph/v3/api/broadcast` | M360 broadcast endpoint |
| `M360_SENDER_ID` | Yes | — | Globe-provisioned `shortcode_mask` linked to `app_key` |
| `PORT` | No | `3000` | HTTP server port |
| `NODE_ENV` | No | `development` | `development`, `production`, or `test` |
| `LOG_LEVEL` | No | `info` | Pino log level |
| `REQUEST_TIMEOUT_MS` | No | `30000` | Axios timeout for M360 API calls (ms) |

### Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your M360 credentials and provisioned Sender ID

# 3. Run
npm run dev                  # Development (hot reload)
npm run build && npm start   # Production
npm test                     # Unit tests
```

### Project Structure

See [Architecture](#architecture) for the full directory layout.

### Testing

```bash
npm test
```

Test suites cover SMS service (bulk send, partial failures), M360 client, DLR/MO webhook processing, phone normalization, and M360 error mapping.

### Docker

```bash
docker build -t globe-m360-sms-service .
docker run -p 3000:3000 --env-file .env globe-m360-sms-service
```

The container runs as a non-root user and includes a health check against `GET /health`.

### Troubleshooting

#### Obtaining Your M360 Sender ID

> **Current status:** The Sender ID is not yet mapped to this integration. SMS sends will fail until Globe provisions and links a `shortcode_mask` to your `app_key`.

**What the error means**

Your API integration is working. M360 rejected the request because `M360_SENDER_ID` in `.env` is not registered on your Globe Business account for the `app_key` you are using.

**Where to get the correct value**

1. Log in to the **Globe M360 / Globe Business portal**
2. Open your **App** or **API** settings (the app matching your `M360_APP_KEY`)
3. Find **Sender ID**, **Masking name**, or **shortcode_mask**
4. Confirm status is **active / approved**
5. Copy the value **exactly** (case-sensitive, no spaces)

If you cannot find it, contact your **Globe Business account manager** or M360 support.

**Questions to ask Globe / M360 support**

1. What is the **provisioned `shortcode_mask`** for our account?
2. Is it **linked to our `app_key`**?
3. Is the sender ID **approved for broadcast SMS**?
4. Do we need an **alphanumeric mask** or a **numeric shortcode**?
5. Is our **SMS credit balance** sufficient?

**After you receive the Sender ID**

1. Edit `.env`:
   ```env
   M360_SENDER_ID=YOUR_PROVISIONED_VALUE
   ```
2. Restart the server:
   ```bash
   npm run build && npm start
   ```
3. Retry `POST /api/sms/send`

**Common Sender ID formats**

- Alphanumeric brand mask: `SUNMOBILITY`, `SUNMOB`
- Numeric shortcode (per your contract): varies by account

The value must match what Globe provisioned — not a test or placeholder name.

For the full guide, see [docs/GLOBE_SENDER_ID.md](docs/GLOBE_SENDER_ID.md).

#### Other M360 Errors

| Error | HTTP | Likely Cause |
|-------|------|--------------|
| `Credits Consumed` | 410 | Top up M360 SMS credits |
| `Invalid app_key/app_secret` | 404 | Wrong credentials in `.env` |
| `Unauthorized` | 401 | App not enabled for broadcast API |
| `Bad Request` | 400 | Malformed request payload |
| `Forbidden` | 403 | Access denied for this operation |

#### Startup Behaviour

- **Development:** Logs a warning if `M360_SENDER_ID` looks like a placeholder (`TEST`, `TEST_SENDER`, etc.)
- **Production:** Fails fast on startup if a placeholder Sender ID is detected

---

## Postman Collection

Import the ready-to-use collection for manual API testing:

[`postman/Globe-M360-SMS-Service.postman_collection.json`](postman/Globe-M360-SMS-Service.postman_collection.json)

Set the `baseUrl` variable to `http://localhost:3000` (or your deployed host).

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 18+ |
| Language | TypeScript 5.7 |
| Framework | Express.js 4 |
| HTTP Client | Axios |
| Validation | Zod |
| Logging | Pino + pino-http |
| Testing | Vitest |
| Container | Docker (Node 20 Alpine) |

---

## License

UNLICENSED — private use.
