#!/usr/bin/env node

/**
 * Generate the two landing images that no other script covers.
 *
 * WHY THIS EXISTS
 *
 *   people/family-photo-1.jpg   CTASection.tsx:68 — home page CTA, desktop only
 *   people/movers-services.png  service-providers/page.tsx:353 and :570
 *
 * Every other image under `people/` came from Unsplash via
 * scripts/download-images.mjs and scripts/download-african-people.mjs, which
 * record the exact photo IDs. These two are in neither, and the Supabase
 * project that once served them has been deleted, so there is no source to
 * restore them from. They have to be made.
 *
 * Model, auth, polling, negative prompts and the aspect-ratio set are the same
 * as scripts/generate-services-images.mjs — this is that pipeline narrowed to
 * two images that live outside the `services/` prefix.
 *
 * Usage:
 *   KLING_ACCESS_KEY=… KLING_SECRET_KEY=… \
 *   NEXT_PUBLIC_SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… \
 *   node scripts/generate-missing-people-images.mjs
 *
 * Cost: 4 units per image, 8 in total, measured from the
 * `final_unit_deduction` field on this account's 194 historical tasks.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

const KLING_API_BASE = "https://api-singapore.klingai.com";
const KLING_MODEL = "kling-v2-1";
const POLL_INTERVAL_MS = 5_000;
const POLL_TIMEOUT_MS = 180_000;
const BUCKET = "landing-images";

const { KLING_ACCESS_KEY, KLING_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY } =
  process.env;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

for (const [k, v] of Object.entries({
  KLING_ACCESS_KEY,
  KLING_SECRET_KEY,
  NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
})) {
  if (!v) {
    console.error(`Missing ${k}`);
    process.exit(2);
  }
}

// Verbatim from scripts/generate-services-images.mjs:222-224, so these two
// images match the other 33 in subject and treatment.
const NEG_BASE =
  "text, watermark, logo, blurry, low quality, distorted, cartoon, anime, illustration, painting, drawing, sketch";
const NEG_NO_WHITE =
  "white person, caucasian, light skin, pale skin, European, Asian, Indian, mixed race";
const NEG_PEOPLE = `${NEG_BASE}, ${NEG_NO_WHITE}`;

const SPECS = [
  {
    key: "people/family-photo-1.jpg",
    // Rendered in `aspect-square max-w-md`, sizes 400px, on the dark teal CTA
    // panel beside "Ready to Find Your Next Home?".
    aspect: "1:1",
    width: 1200,
    height: 1200,
    format: "jpeg",
    contentType: "image/jpeg",
    prompt:
      "Happy Black African Kenyan family with dark brown skin in the bright living room of their new modern Nairobi apartment, a mother and father in their thirties and two young children, the father holding a set of house keys, all smiling warmly and genuinely at each other, a few unpacked moving boxes in the background, contemporary furnishings with warm teal and orange accent cushions, large windows with soft natural daylight and lush green foliage outside, candid warm family moment, professional lifestyle photography, shallow depth of field, sharp focus, warm inviting tones",
    negativePrompt: `${NEG_PEOPLE}, empty room, staged stock photo stiffness, cluttered, dark, cold lighting, poverty, slum`,
  },
  {
    key: "people/movers-services.png",
    // Used twice: an aspect-[2/1] card with a bottom gradient, and a full-width
    // banner under a 90% cta-600 wash with centred white text. 16:9 is the
    // nearest supported ratio to 2:1 and both uses are object-cover, so the
    // prompt asks for clear space in the upper half where the text lands.
    aspect: "16:9",
    width: 1920,
    height: 1080,
    format: "png",
    contentType: "image/png",
    prompt:
      "Team of four Black African Kenyan professional movers with dark brown skin wearing clean teal branded polo shirts with orange trim, carefully carrying a wrapped sofa and sealed cardboard boxes out of a teal moving truck with an orange stripe, parked outside a modern Nairobi apartment building with green compound landscaping, one mover holding a clipboard checking an inventory, confident competent expressions, bright midday sunlight, wide cinematic composition with clear space in the upper half of the frame, professional commercial photography, ultra sharp detail, warm teal and orange colour accents",
    negativePrompt: `${NEG_PEOPLE}, cluttered frame, busy background in the upper half, damaged furniture, messy, dark, night, rain`,
  },
];

function klingToken() {
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o) =>
    Buffer.from(JSON.stringify(o))
      .toString("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
  const header = b64({ alg: "HS256", typ: "JWT" });
  const payload = b64({
    iss: KLING_ACCESS_KEY,
    exp: now + 1800,
    nbf: now - 5,
    iat: now,
  });
  const sig = crypto
    .createHmac("sha256", KLING_SECRET_KEY)
    .update(`${header}.${payload}`)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `${header}.${payload}.${sig}`;
}

async function kling(method, endpoint, body) {
  const res = await fetch(KLING_API_BASE + endpoint, {
    method,
    headers: {
      Authorization: `Bearer ${klingToken()}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.code !== 0) {
    // 1102 is the one worth naming: the key is valid and the request is well
    // formed, the account simply has no units left.
    const hint =
      json.code === 1102 ? " — top up at klingai.com; 4 units per image" : "";
    throw new Error(
      `Kling ${method} ${endpoint} -> HTTP ${res.status} code=${json.code} ${json.message}${hint}`,
    );
  }
  return json.data;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function generate(spec) {
  const { task_id: taskId } = await kling("POST", "/v1/images/generations", {
    model_name: KLING_MODEL,
    prompt: spec.prompt,
    negative_prompt: spec.negativePrompt,
    n: 1,
    aspect_ratio: spec.aspect,
  });
  console.log(`  task ${taskId}`);

  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);
    const d = await kling("GET", `/v1/images/generations/${taskId}`);
    if (d.task_status === "succeed") return d.task_result.images[0].url;
    if (d.task_status === "failed")
      throw new Error(`task failed: ${d.task_status_msg}`);
    process.stdout.write(".");
  }
  throw new Error(`timed out after ${POLL_TIMEOUT_MS / 1000}s`);
}

async function upload(spec, buffer) {
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${spec.key}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": spec.contentType,
        "x-upsert": "true",
      },
      body: buffer,
    },
  );
  if (!res.ok)
    throw new Error(
      `upload ${spec.key} -> HTTP ${res.status} ${await res.text()}`,
    );
}

async function verify(spec) {
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${spec.key}`,
  );
  return res.status;
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "kling-"));
let failed = 0;

for (const spec of SPECS) {
  console.log(`\n=== ${spec.key} (${spec.aspect}) ===`);
  try {
    const url = await generate(spec);
    console.log(`\n  generated, downloading`);
    const raw = Buffer.from(await (await fetch(url)).arrayBuffer());
    const rawPath = path.join(tmp, "raw");
    fs.writeFileSync(rawPath, raw);

    let pipeline = sharp(rawPath).resize(spec.width, spec.height, {
      fit: "cover",
      position: "attention",
    });
    pipeline =
      spec.format === "png"
        ? pipeline.png({ compressionLevel: 9 })
        : pipeline.jpeg({ quality: 86, mozjpeg: true });
    const out = await pipeline.toBuffer();
    console.log(
      `  optimised ${spec.width}x${spec.height} ${Math.round(out.length / 1024)}KB`,
    );

    await upload(spec, out);
    const status = await verify(spec);
    console.log(`  uploaded, public URL -> HTTP ${status}`);
    if (status !== 200) failed++;
  } catch (err) {
    console.error(`  FAILED: ${err.message}`);
    failed++;
  }
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log(failed ? `\n${failed} image(s) failed` : "\nboth images published");
process.exit(failed ? 1 : 0);
