# M-Pesa Configuration Guide (SI-4)

> Complete setup instructions for integrating Safaricom's M-Pesa Daraja API with MitaSafi.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Sandbox Setup](#2-sandbox-setup)
3. [Environment Variables](#3-environment-variables)
4. [Callback URL Setup](#4-callback-url-setup)
5. [Health Check Verification](#5-health-check-verification)
6. [Testing with Sandbox](#6-testing-with-sandbox)
7. [Production Go-Live](#7-production-go-live)
8. [Architecture Overview](#8-architecture-overview)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Prerequisites

- A Safaricom Developer account: https://developer.safaricom.co.ke
- A deployed Vercel instance (for callback URL), **OR** a tunnel service for local testing (e.g., ngrok)
- Access to the `.env.local` file in the project root

---

## 2. Sandbox Setup

### Step 1: Register on Safaricom Developer Portal

1. Go to https://developer.safaricom.co.ke
2. Sign up or log in
3. Go to **My Apps** → **Add a New App**
4. Select **Lipa Na M-Pesa Sandbox**
5. Note down your **Consumer Key** and **Consumer Secret**

### Step 2: Get Sandbox Test Credentials

Safaricom provides well-known sandbox credentials:

| Credential | Sandbox Value |
|------------|---------------|
| **Shortcode** | `174379` |
| **Passkey** | `bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919` |
| **Test Phone** | `254708374149` (will receive STK push in sandbox simulator) |

The **Consumer Key** and **Consumer Secret** are unique to your app — get them from the Daraja dashboard.

---

## 3. Environment Variables

Add these to your `.env.local` file:

```bash
# M-Pesa environment: "sandbox" or "production"
MPESA_ENVIRONMENT=sandbox

# From your Daraja app dashboard
MPESA_CONSUMER_KEY=<your-consumer-key>
MPESA_CONSUMER_SECRET=<your-consumer-secret>

# Sandbox test passkey (replace with production passkey when going live)
MPESA_PASSKEY=bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919

# Sandbox shortcode (replace with your real business shortcode for production)
MPESA_SHORTCODE=174379

# HTTPS callback URL — must be publicly accessible
MPESA_CALLBACK_URL=https://your-app.vercel.app/api/payments/mpesa/callback
```

### On Vercel

1. Go to **Project Settings** → **Environment Variables**
2. Add each variable above for the appropriate environments:
   - **Preview**: sandbox credentials
   - **Production**: production credentials (after Go-Live approval)
3. Redeploy after adding variables

---

## 4. Callback URL Setup

Safaricom sends payment confirmation/failure notifications to the callback URL via POST.

### Requirements

- **Must be HTTPS** (Safaricom rejects HTTP)
- **Must be publicly accessible** (no localhost, no VPN-gated)
- **Must return HTTP 200** within ~30 seconds
- **Must be the exact URL** registered in your STK Push request

### For Vercel Deployments

```
MPESA_CALLBACK_URL=https://your-project.vercel.app/api/payments/mpesa/callback
```

### For Local Development

Use [ngrok](https://ngrok.com) to expose your local server:

```bash
# Terminal 1: Start Next.js
pnpm dev

# Terminal 2: Expose port 3000
ngrok http 3000
```

ngrok gives you a URL like `https://a1b2c3d4.ngrok.io`. Set:

```bash
MPESA_CALLBACK_URL=https://a1b2c3d4.ngrok.io/api/payments/mpesa/callback
```

> **Note**: ngrok URLs change on restart. Update `.env.local` each time.

---

## 5. Health Check Verification

After configuring env vars, verify with the health check endpoint:

### Local (sandbox)

```bash
curl http://localhost:3000/api/payments/mpesa/health | jq .
```

### Production (requires service role key)

```bash
curl -H "Authorization: Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY" \
  https://your-app.vercel.app/api/payments/mpesa/health | jq .
```

### Expected healthy response

```json
{
  "configured": true,
  "environment": "sandbox",
  "baseUrl": "https://sandbox.safaricom.co.ke",
  "shortcode": "174379",
  "callbackUrl": "https://your-app.vercel.app/api/payments/mpesa/callback",
  "tokenAcquirable": true,
  "tokenError": null,
  "credentials": {
    "consumerKey": "set",
    "consumerSecret": "set",
    "passkey": "set",
    "shortcode": "set",
    "callbackUrl": "set",
    "environment": "sandbox"
  },
  "timestamp": "2026-03-03T12:00:00.000Z"
}
```

If `tokenAcquirable` is `false`, check `tokenError` for the specific failure reason.

---

## 6. Testing with Sandbox

### Step 1: Verify Configuration

Run the health check (see above). Ensure `configured: true` and `tokenAcquirable: true`.

### Step 2: Use the Sandbox Simulator

1. Go to https://developer.safaricom.co.ke/APIs/MpesaExpressSimulate
2. Select **Lipa Na M-Pesa**
3. Use test phone number: `254708374149`
4. The sandbox will simulate the STK push flow

### Step 3: Test End-to-End via the App

1. Create a booking and get it to `customer_confirmed` status
2. Navigate to `/dashboard/bookings/[id]/payment`
3. Enter test phone: `0708374149`
4. Click "Pay KES X via M-Pesa"
5. The sandbox will simulate the STK push → callback flow

### Expected Test Results

| Step | What happens |
|------|-------------|
| Initiate | `booking_payments` row created with status `pending` |
| STK Push | Sandbox returns success + CheckoutRequestID |
| Callback | Safaricom sends POST to your callback URL |
| Confirmation | Payment status → `completed`, booking → `resolved` |
| Wallet | Provider `wallet_balance` increases by provider_amount |

---

## 7. Production Go-Live

### Step 1: Apply for Production Credentials

1. On the Daraja portal, go to **Go Live**
2. Submit your app for review
3. Safaricom typically takes **1-2 weeks** to approve
4. You'll receive production **Consumer Key**, **Consumer Secret**, **Passkey**, and **Shortcode**

### Step 2: Update Environment Variables

```bash
MPESA_ENVIRONMENT=production
MPESA_CONSUMER_KEY=<production-key>
MPESA_CONSUMER_SECRET=<production-secret>
MPESA_PASSKEY=<production-passkey>
MPESA_SHORTCODE=<your-business-shortcode>
MPESA_CALLBACK_URL=https://mitasafi.co.ke/api/payments/mpesa/callback
```

### Step 3: Verify Production Config

```bash
curl -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  https://mitasafi.co.ke/api/payments/mpesa/health
```

Ensure `environment: "production"` and `tokenAcquirable: true`.

### Step 4: Test with Real Money

Initiate a small payment (KES 1) to verify the full flow works with real M-Pesa.

---

## 8. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│ Client (PaymentForm.tsx)                                            │
│  ├─ POST /api/payments/mpesa/initiate  (initiate STK Push)         │
│  └─ GET  /api/payments/mpesa/query     (poll status every 3s)      │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ API Routes                                                          │
│  ├─ initiate/route.ts   → Zod validation → initiatePayment()       │
│  ├─ query/route.ts      → Auth check → getPaymentStatus()          │
│  ├─ callback/route.ts   → IP whitelist → processPaymentCallback()  │
│  └─ health/route.ts     → checkMpesaHealth()                       │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Server Actions (src/lib/services/payments.ts)                       │
│  ├─ initiatePayment()          — Create row + STK Push              │
│  ├─ processPaymentCallback()   — Confirm/fail + wallet + notify     │
│  ├─ getPaymentStatus()         — Read payment row                   │
│  └─ pollPaymentStatus()        — Optionally query Daraja            │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Payment Libraries (src/lib/payments/)                               │
│  ├─ mpesa-config.ts  — Validated config, IP whitelist, health check │
│  ├─ mpesa.ts         — Daraja API client (OAuth, STK, Query, Parse) │
│  ├─ commission.ts    — Fee calculation (10%, min 50, max 5000 KES)  │
│  └─ refunds.ts       — Refund computation                          │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Database (Supabase)                                                 │
│  ├─ booking_payments    — Payment transaction records               │
│  ├─ provider_payouts    — Payout disbursements                      │
│  └─ service_providers   — wallet_balance + total_earnings           │
└─────────────────────────────────────────────────────────────────────┘
```

### Payment Flow

```
Customer clicks "Pay" → POST /api/payments/mpesa/initiate
  → booking_payments row (status=pending)
  → STK Push to Safaricom → Phone receives M-Pesa prompt
  → Customer enters PIN on phone

Safaricom calls back → POST /api/payments/mpesa/callback
  → IP validation → Parse callback
  → On success: payment=completed, booking=resolved, wallet credited
  → On failure: payment=failed, booking=payment_failed

Client polls every 3s → GET /api/payments/mpesa/query
  → Returns current payment status from DB
  → Every 5th poll also queries Daraja directly
  → Terminal status reached → UI refreshes
```

### Security Model

| Layer | Description |
|-------|-------------|
| **IP Whitelist** | Production callbacks validated against Safaricom IP ranges |
| **CheckoutRequestID Match** | Callbacks must reference a known pending payment |
| **Idempotency** | Double-processing prevented by status check before update |
| **Body Size Limit** | Rejects payloads > 10KB |
| **Auth on Initiate** | Customer must be signed in + own the booking |
| **Auth on Query** | Caller must be payer or provider |
| **Health Check Auth** | Production requires service role key |

---

## 9. Troubleshooting

### Health check shows `tokenAcquirable: false`

| Error | Cause | Fix |
|-------|-------|-----|
| `HTTP 401` | Invalid consumer key/secret | Verify credentials in Daraja dashboard |
| `HTTP 400: Bad Request` | Malformed credentials | Check for extra whitespace in env vars |
| `Network error` | DNS/firewall issue | Verify server can reach `sandbox.safaricom.co.ke` |
| `access_token missing` | Daraja response format changed | Check Safaricom API status page |

### STK Push fails after initiation

| Error | Cause | Fix |
|-------|-------|-----|
| `Invalid phone number` | Format not 254XXXXXXXXX | Use `07XX`, `+254XX`, or `254XX` format |
| `Amount exceeds limit` | > KES 150,000 | Split into multiple payments |
| `Request cancelled by user` | Customer dismissed M-Pesa prompt | Customer can retry |
| `Insufficient funds` | Balance too low | Customer needs to top up |
| `Transaction timed out` | No PIN entry within ~60s | Customer can retry |

### Callback not received

| Symptom | Cause | Fix |
|---------|-------|-----|
| Payment stuck in `pending` | Callback URL unreachable | Check URL is HTTPS + publicly accessible |
| 404 on callback | Wrong URL path | Must be `/api/payments/mpesa/callback` exactly |
| Callback received but payment not updated | `CheckoutRequestID` mismatch | Check logs for the request ID |
| Callback IP rejected | IP not in whitelist | In sandbox, this shouldn't happen; in production, verify Safaricom IPs |

### Local development with ngrok

```bash
# Start ngrok
ngrok http 3000

# Copy the HTTPS URL and set in .env.local:
# MPESA_CALLBACK_URL=https://xxxx.ngrok.io/api/payments/mpesa/callback

# Restart dev server to pick up new env var
pnpm dev
```

---

## File Reference

| File | Purpose |
|------|---------|
| `src/lib/payments/mpesa-config.ts` | Configuration validation, IP whitelist, health check |
| `src/lib/payments/mpesa.ts` | Daraja API client |
| `src/lib/payments/commission.ts` | Commission calculation |
| `src/lib/payments/refunds.ts` | Refund calculation |
| `src/lib/payments/index.ts` | Barrel exports |
| `src/lib/services/payments.ts` | Payment server actions (orchestrator) |
| `src/app/api/payments/mpesa/initiate/route.ts` | STK Push initiation endpoint |
| `src/app/api/payments/mpesa/callback/route.ts` | Safaricom callback receiver |
| `src/app/api/payments/mpesa/query/route.ts` | Payment status query endpoint |
| `src/app/api/payments/mpesa/health/route.ts` | Configuration health check |
| `src/types/payments.ts` | TypeScript type definitions |
| `supabase/migrations/20260305000000_m6_payment_tables.sql` | Database schema |
| `.env.example` | Environment variable template |
