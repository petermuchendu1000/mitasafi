# KLING AI — Complete Reference Guide

> **Created:** 2026-03-10
> **Purpose:** Everything you need to know to use Kling AI for image generation in MitaSafi (or any project). Includes API setup, authentication, keys, endpoints, supported parameters, the full image pipeline script, and prompt engineering patterns.

---

## TABLE OF CONTENTS

1. [What Is Kling AI](#1-what-is-kling-ai)
2. [API Credentials](#2-api-credentials)
3. [Authentication — JWT Token Generation](#3-authentication--jwt-token-generation)
4. [API Endpoints](#4-api-endpoints)
5. [Supported Models & Parameters](#5-supported-models--parameters)
6. [Aspect Ratios](#6-aspect-ratios)
7. [API Flow — Step by Step](#7-api-flow--step-by-step)
8. [Code Examples](#8-code-examples)
9. [Image Pipeline Script](#9-image-pipeline-script)
10. [Prompt Engineering Patterns](#10-prompt-engineering-patterns)
11. [Negative Prompts](#11-negative-prompts)
12. [Rate Limits & Polling](#12-rate-limits--polling)
13. [Pricing & Costs](#13-pricing--costs)
14. [Environment Setup](#14-environment-setup)
15. [Troubleshooting](#15-troubleshooting)

---

## 1. WHAT IS KLING AI

Kling AI is an image (and video) generation API by Kuaishou. It supports high-quality photo-realistic image generation with a variety of aspect ratios. The API is task-based: you submit a generation request, receive a `task_id`, then poll until the image is ready.

- **Provider:** Kuaishou Technology
- **API Region Used:** Singapore (`api-singapore.klingai.com`)
- **Model Used:** `kling-v2-1`
- **Output:** JPEG/PNG image URLs (temporary, must be downloaded)
- **Use Case in MitaSafi:** Generating all landing page images, category images, avatars, how-it-works illustrations, and provider CTAs

---

## 2. API CREDENTIALS

### Keys (from MitaSafi `.env.local`)

```env
# KLING AI (Image Generation)
KLING_ACCESS_KEY=AhpgDBPfATAHHpfDhMPgDByfe9PNHPDb
KLING_SECRET_KEY=PayHGBCbCEePk3H9DbRTDMFJeAKmHafE
```

### Where to Get Keys

1. Sign up at [https://klingai.com](https://klingai.com)
2. Navigate to the API section / developer console
3. Create an API application
4. You'll receive an **Access Key** (public) and **Secret Key** (private)
5. The Access Key is used as the JWT `iss` (issuer) claim
6. The Secret Key is used to sign the JWT with HS256

### Environment Variables

| Variable | Description |
|----------|-------------|
| `KLING_ACCESS_KEY` | Public access key — used as JWT issuer (`iss`) |
| `KLING_SECRET_KEY` | Secret key — used to HS256-sign the JWT |

---

## 3. AUTHENTICATION — JWT TOKEN GENERATION

Kling uses **JWT (JSON Web Token)** authentication. You generate a short-lived JWT signed with your secret key and pass it as a Bearer token.

### JWT Payload Structure

```json
{
  "iss": "<KLING_ACCESS_KEY>",
  "exp": <now + 1800>,
  "nbf": <now - 5>,
  "iat": <now>
}
```

### JWT Header

```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

### JavaScript Implementation

```javascript
import jwt from "jsonwebtoken";

function generateKlingToken() {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: process.env.KLING_ACCESS_KEY,
    exp: now + 1800, // 30 minutes
    nbf: now - 5,
    iat: now,
  };
  return jwt.sign(payload, process.env.KLING_SECRET_KEY, {
    algorithm: "HS256",
    header: { alg: "HS256", typ: "JWT" },
  });
}
```

### Python Implementation

```python
import jwt
import time

def generate_kling_token():
    now = int(time.time())
    payload = {
        "iss": KLING_ACCESS_KEY,
        "exp": now + 1800,
        "nbf": now - 5,
        "iat": now,
    }
    return jwt.encode(payload, KLING_SECRET_KEY, algorithm="HS256")
```

### Key Points

- Token is valid for **30 minutes** (`exp: now + 1800`)
- `nbf` (not before) is set to `now - 5` to handle minor clock skew
- Generate a **fresh token per request** (or cache for up to ~25 min)
- Pass as: `Authorization: Bearer <token>`

---

## 4. API ENDPOINTS

### Base URL

```
https://api-singapore.klingai.com
```

### Image Generation Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/v1/images/generations` | Create an image generation task |
| `GET` | `/v1/images/generations/{task_id}` | Poll task status and get result |
| `GET` | `/v1/images/generations?pageNum=1&pageSize=10` | List recent generation tasks |

### Request Headers (All Endpoints)

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

---

## 5. SUPPORTED MODELS & PARAMETERS

### Model

| Model Name | Description |
|------------|-------------|
| `kling-v2-1` | Latest image generation model (used in MitaSafi pipeline) |

### Create Task — Request Body

```json
{
  "model_name": "kling-v2-1",
  "prompt": "A professional photo of...",
  "negative_prompt": "blurry, low quality, distorted",
  "n": 1,
  "aspect_ratio": "16:9"
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `model_name` | string | Yes | Model to use (e.g., `"kling-v2-1"`) |
| `prompt` | string | Yes | Text description of the desired image |
| `negative_prompt` | string | No | What to avoid in the image |
| `n` | integer | No | Number of images to generate (default: 1) |
| `aspect_ratio` | string | Yes | Aspect ratio (see section 6) |

### Create Task — Response

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "task_id": "abc123..."
  }
}
```

### Poll Task — Response (Success)

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "task_id": "abc123...",
    "task_status": "succeed",
    "task_result": {
      "images": [
        {
          "url": "https://..."
        }
      ]
    }
  }
}
```

### Task Statuses

| Status | Meaning |
|--------|---------|
| `submitted` | Task received, queued for processing |
| `processing` | Image generation in progress |
| `succeed` | Complete — image URL available in `task_result.images[0].url` |
| `failed` | Generation failed — see `task_status_msg` for reason |

---

## 6. ASPECT RATIOS

Kling supports these aspect ratios:

| Aspect Ratio | Decimal Value | Best For |
|--------------|---------------|----------|
| `1:1` | 1.0 | Avatars, profile photos, icons |
| `16:9` | 1.78 | Hero banners, wide images |
| `9:16` | 0.56 | Mobile/vertical images, stories |
| `4:3` | 1.33 | Standard photos, category cards |
| `3:4` | 0.75 | Portrait photos |
| `3:2` | 1.5 | Standard landscape photos |
| `2:3` | 0.67 | Portrait/vertical photos |
| `21:9` | 2.33 | Ultra-wide banners |

### Auto-Mapping Function (from pixel dimensions to Kling ratio)

```javascript
function getKlingAspectRatio(width, height) {
  const ratio = width / height;
  const options = [
    { label: "1:1", value: 1 },
    { label: "16:9", value: 16 / 9 },
    { label: "9:16", value: 9 / 16 },
    { label: "4:3", value: 4 / 3 },
    { label: "3:4", value: 3 / 4 },
    { label: "3:2", value: 3 / 2 },
    { label: "2:3", value: 2 / 3 },
    { label: "21:9", value: 21 / 9 },
  ];

  let best = options[0];
  let bestDiff = Math.abs(ratio - options[0].value);
  for (const opt of options) {
    const diff = Math.abs(ratio - opt.value);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = opt;
    }
  }
  return best.label;
}
```

---

## 7. API FLOW — STEP BY STEP

```
1. Generate JWT token (HS256, 30-min expiry)
         │
         ▼
2. POST /v1/images/generations
   Body: { model_name, prompt, negative_prompt, n, aspect_ratio }
         │
         ▼
3. Receive task_id from response
         │
         ▼
4. Poll GET /v1/images/generations/{task_id}
   Every 5 seconds, up to 3-minute timeout
         │
         ▼
5. When task_status === "succeed":
   Download image from task_result.images[0].url
         │
         ▼
6. Process image (resize, optimize, upload to storage)
```

**Important:** The image URL returned by Kling is **temporary**. Download it immediately and store it in your own storage (e.g., Supabase Storage, S3).

---

## 8. CODE EXAMPLES

### Minimal Node.js Example

```javascript
import jwt from "jsonwebtoken";

const KLING_ACCESS_KEY = "AhpgDBPfATAHHpfDhMPgDByfe9PNHPDb";
const KLING_SECRET_KEY = "PayHGBCbCEePk3H9DbRTDMFJeAKmHafE";
const KLING_API_BASE = "https://api-singapore.klingai.com";

function generateToken() {
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    { iss: KLING_ACCESS_KEY, exp: now + 1800, nbf: now - 5, iat: now },
    KLING_SECRET_KEY,
    { algorithm: "HS256", header: { alg: "HS256", typ: "JWT" } }
  );
}

async function klingFetch(method, path, body = null) {
  const token = generateToken();
  const res = await fetch(`${KLING_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (json.code !== 0) throw new Error(`Kling error: ${json.message}`);
  return json.data;
}

async function generateImage(prompt, aspectRatio = "16:9") {
  // 1. Create task
  const { task_id } = await klingFetch("POST", "/v1/images/generations", {
    model_name: "kling-v2-1",
    prompt,
    negative_prompt: "blurry, low quality, distorted, text, watermark",
    n: 1,
    aspect_ratio: aspectRatio,
  });

  console.log(`Task created: ${task_id}`);

  // 2. Poll until done
  while (true) {
    const data = await klingFetch("GET", `/v1/images/generations/${task_id}`);

    if (data.task_status === "succeed") {
      return data.task_result.images[0].url;
    }
    if (data.task_status === "failed") {
      throw new Error(`Task failed: ${data.task_status_msg}`);
    }

    await new Promise((r) => setTimeout(r, 5000)); // wait 5s
  }
}

// Usage
const imageUrl = await generateImage(
  "A modern office building at sunset, warm golden light",
  "16:9"
);
console.log("Image URL:", imageUrl);
// IMPORTANT: Download this URL immediately — it's temporary!
```

### Downloading the Image

```javascript
import { writeFileSync } from "fs";

async function downloadImage(url, outputPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const arrayBuf = await res.arrayBuffer();
  writeFileSync(outputPath, Buffer.from(arrayBuf));
}

// After getting the URL from generateImage():
await downloadImage(imageUrl, "./output.jpg");
```

---

## 9. IMAGE PIPELINE SCRIPT

MitaSafi uses a comprehensive image generation pipeline at:

```
scripts/generate-services-images.mjs
```

### What It Does (6 Phases)

| Phase | Description |
|-------|-------------|
| **Phase 1** | Generate images via Kling AI API (`kling-v2-1`) |
| **Phase 2** | Optimize with `sharp` (resize, compress, progressive JPEG) |
| **Phase 3** | Generate base64 blur placeholders for above-the-fold images |
| **Phase 4** | Upload all optimized images to Supabase Storage |
| **Phase 5** | Verify every public URL returns HTTP 200 |
| **Phase 6** | Write `src/components/services-landing/images.ts` constants file |

### Running the Pipeline

```bash
# Prerequisites
npm install --save-dev jsonwebtoken sharp @supabase/supabase-js

# Run
node scripts/generate-services-images.mjs
```

### Required Environment Variables

```env
KLING_ACCESS_KEY=AhpgDBPfATAHHpfDhMPgDByfe9PNHPDb
KLING_SECRET_KEY=PayHGBCbCEePk3H9DbRTDMFJeAKmHafE
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
```

### Images Generated (33 total)

| Category | Count | IDs |
|----------|-------|-----|
| Hero | 1 | `hero-bg` |
| Service Categories | 12 | `plumbing`, `electrical`, `water-gas-delivery`, `cleaning`, `laundry`, `pest-control`, `carpentry`, `painting`, `moving-relocation`, `internet-networking`, `gardening-landscaping`, `more-services` |
| How It Works | 3 | `search`, `compare`, `book` |
| Why MitaSafi | 6 | `verified`, `pricing`, `payment`, `reviews`, `emergency`, `neighborhood` |
| Provider CTA | 1 | `provider-cta` |
| Avatars | 10 | `grace`, `david`, `wanjiku`, `james`, `aisha`, `brian`, `peter`, `mary`, `samuel`, `hannah` |

### Features

- **Skip existing:** Already-generated images (>1KB) are skipped on re-run
- **Retry logic:** Up to 2 retries per image on failure
- **Blur placeholders:** Generates tiny base64 blur data for above-the-fold images (`hero-bg`, `plumbing`, `electrical`, `water-gas-delivery`, `cleaning`)
- **TypeScript output:** Writes a typed constants file with all image URLs and blur data

---

## 10. PROMPT ENGINEERING PATTERNS

### What Works Well with Kling

1. **Be extremely specific about ethnicity/skin tone** — Kling defaults to lighter skin tones otherwise
   ```
   "Black African Kenyan woman with dark brown skin"
   ```

2. **Describe clothing colors precisely** — Use hex-adjacent descriptions
   ```
   "wearing a teal branded polo shirt with orange logo embroidery"
   ```

3. **Set the scene geographically** — Name specific neighborhoods
   ```
   "modern Nairobi apartment in Kilimani"
   "Nairobi residential street in Lavington"
   ```

4. **Specify photography style** — Tells the model what "look" to target
   ```
   "professional service photography, warm tones"
   "professional corporate portrait photography, sharp focus on face"
   "commercial aerial drone photography"
   ```

5. **Describe expressions explicitly**
   ```
   "confident focused expression"
   "warm approachable smile showing teeth"
   "genuine wide radiant smile"
   ```

6. **Include brand colors in every prompt**
   ```
   "teal (#0D9488) and orange (#F97316) accents"
   ```

### Prompt Template — Service Category Image

```
"[Ethnicity] [gender] [profession] with [skin tone], wearing [branded clothing description], 
[performing specific action] in a [modern location description], 
[additional scene details], [lighting description], 
professional service photography, [quality modifiers]"
```

### Prompt Template — Avatar/Headshot

```
"Professional headshot portrait of a [description] Black African Kenyan [man/woman] 
with rich dark brown skin in [age range], [hair description], [expression], 
wearing [clothing], soft [tone] bokeh background, studio lighting, 
professional corporate portrait photography, sharp focus on face"
```

---

## 11. NEGATIVE PROMPTS

### Standard Fragments

```javascript
// Base (always include)
const NEG_BASE = "text, watermark, logo, blurry, low quality, distorted, cartoon, anime, illustration, painting, drawing, sketch";

// When generating people — prevents wrong ethnicity
const NEG_NO_WHITE = "white person, caucasian, light skin, pale skin, European, Asian, Indian, mixed race";

// Combined for people images
const NEG_PEOPLE = `${NEG_BASE}, ${NEG_NO_WHITE}`;
```

### Category-Specific Negatives

| Category | Additional Negatives |
|----------|---------------------|
| Plumbing | `messy, dirty, old kitchen, rusty pipes, broken fixtures, dingy lighting, unprofessional` |
| Electrical | `sparks, danger, messy wiring, exposed live wires, old house, dark room, unprofessional` |
| Cleaning | `messy, cluttered, dirty apartment, cheap cleaning products, dark room, unprofessional` |
| Moving | `broken furniture, dropped items, damaged goods, old truck, rusty vehicle, chaotic` |
| Avatars | `full body, weird eyes, deformed face, uncanny valley, washed out skin` |
| Aerial/Neighborhood | `slum, poverty, dirty roads, informal settlement, ugly buildings, barren, grey overcast, depressing` |

### Key Insight

**Always include ethnicity negatives** when generating images of people for the Kenyan market. Without `NEG_NO_WHITE`, Kling will frequently generate lighter-skinned or non-African subjects.

---

## 12. RATE LIMITS & POLLING

### Polling Configuration

| Setting | Value | Notes |
|---------|-------|-------|
| Poll interval | 5,000 ms (5 seconds) | Don't poll faster — wastes API calls |
| Poll timeout | 180,000 ms (3 minutes) | Most images complete in 30-90 seconds |
| Max retries | 2 | Per image, on failure |
| Delay between requests | 1,000 ms (1 second) | Between creating new tasks |
| Delay between retries | 3,000 ms (3 seconds) | Before retrying a failed task |

### Tips

- Image generation typically takes **15-60 seconds**
- If polling times out at 3 minutes, the task may still complete — you can re-fetch later
- Add a delay between creation requests to avoid rate limiting
- The script is idempotent — re-run to pick up any failed images

---

## 13. PRICING & COSTS

- Kling AI charges per image generation
- Exact pricing depends on your plan/tier (check your Kling dashboard)
- The MitaSafi pipeline generates **33 images** — a single run is relatively cheap
- Failed tasks that are retried count as additional API calls
- Budget estimate for 33 images: ~$1-5 depending on your plan

---

## 14. ENVIRONMENT SETUP

### Step-by-Step Setup for a New Project

1. **Install dependencies:**
   ```bash
   npm install --save-dev jsonwebtoken sharp
   ```

2. **Add to `.env.local`:**
   ```env
   KLING_ACCESS_KEY=AhpgDBPfATAHHpfDhMPgDByfe9PNHPDb
   KLING_SECRET_KEY=PayHGBCbCEePk3H9DbRTDMFJeAKmHafE
   ```

3. **Test authentication:**
   ```javascript
   // Quick auth test
   const token = generateKlingToken();
   const res = await fetch(
     "https://api-singapore.klingai.com/v1/images/generations?pageNum=1&pageSize=1",
     { headers: { Authorization: `Bearer ${token}` } }
   );
   const json = await res.json();
   console.log(json.code === 0 ? "Auth OK" : "Auth FAILED");
   ```

4. **Generate your first image:**
   ```javascript
   const url = await generateImage("A beautiful sunny day in Nairobi", "16:9");
   await downloadImage(url, "./test-output.jpg");
   ```

### File Structure (MitaSafi pattern)

```
project/
├── .env.local                             # Keys here
├── scripts/
│   └── generate-services-images.mjs       # Pipeline script
├── public/
│   └── images/
│       └── services-landing/              # Raw downloads
│           ├── optimized/                 # Resized/compressed
│           ├── hero-bg.jpg
│           ├── categories/
│           │   ├── plumbing.jpg
│           │   └── ...
│           └── avatars/
│               ├── grace.jpg
│               └── ...
└── src/
    └── components/
        └── services-landing/
            └── images.ts                  # Generated constants
```

---

## 15. TROUBLESHOOTING

### Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `Missing KLING_ACCESS_KEY or KLING_SECRET_KEY` | Keys not in `.env.local` | Add them to `.env.local` |
| `Kling API auth failed` | Invalid keys or expired JWT | Regenerate token, verify keys |
| `Kling API returned non-JSON` | Network issue or API down | Retry after a moment |
| `Task timed out after 180s` | Slow generation or overloaded API | Re-run script (it skips completed images) |
| `Task failed: unknown reason` | Prompt triggered content filter or API error | Simplify prompt, remove potentially flagged content |
| `jsonwebtoken not installed` | Missing dependency | `npm install --save-dev jsonwebtoken` |
| `sharp not installed` | Missing dependency | `npm install --save-dev sharp` |
| Wrong ethnicity in output | Missing negative prompt for ethnicity | Add `NEG_NO_WHITE` negative prompt |
| Image URL returns 404 | URL expired (temporary) | Re-generate — always download immediately |

### Verifying Auth Manually

```bash
# Generate and decode a JWT to verify structure (use jwt.io or cli)
node -e "
const jwt = require('jsonwebtoken');
const now = Math.floor(Date.now()/1000);
const token = jwt.sign(
  {iss:'AhpgDBPfATAHHpfDhMPgDByfe9PNHPDb', exp:now+1800, nbf:now-5, iat:now},
  'PayHGBCbCEePk3H9DbRTDMFJeAKmHafE',
  {algorithm:'HS256', header:{alg:'HS256',typ:'JWT'}}
);
console.log(token);
"
```

---

## QUICK REFERENCE CARD

```
API Base:       https://api-singapore.klingai.com
Model:          kling-v2-1
Auth:           JWT (HS256) — Bearer token
Access Key:     AhpgDBPfATAHHpfDhMPgDByfe9PNHPDb
Secret Key:     PayHGBCbCEePk3H9DbRTDMFJeAKmHafE
Create Task:    POST /v1/images/generations
Poll Task:      GET  /v1/images/generations/{task_id}
List Tasks:     GET  /v1/images/generations?pageNum=1&pageSize=10
Aspect Ratios:  1:1, 16:9, 9:16, 4:3, 3:4, 3:2, 2:3, 21:9
Poll Interval:  5 seconds
Timeout:        3 minutes
Dependencies:   jsonwebtoken, sharp (optional, for optimization)
```
