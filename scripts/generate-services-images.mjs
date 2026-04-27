#!/usr/bin/env node

/**
 * SLP-2 Image Pipeline — Kling AI + Supabase Storage
 *
 * Phases:
 *   1. Generate images via Kling AI API (kling-v2-1)
 *   2. Optimize with sharp (resize, compress)
 *   3. Generate blur placeholders for above-the-fold images
 *   4. Upload all images to Supabase Storage
 *   5. Verify every public URL returns 200
 *   6. Write src/components/services-landing/images.ts
 *
 * Usage:
 *   node scripts/generate-services-images.mjs
 *
 * Requires:
 *   - .env.local with KLING_ACCESS_KEY, KLING_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY
 *   - npm packages: sharp, jsonwebtoken, dotenv, @supabase/supabase-js
 */

import { createReadStream, readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync } from "fs";
import { resolve, join, basename, extname } from "path";
import { fileURLToPath } from "url";
import { Buffer } from "buffer";

// ---------------------------------------------------------------------------
// ENV
// ---------------------------------------------------------------------------

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "..");

// Load .env.local
const envPath = join(ROOT, ".env.local");
if (existsSync(envPath)) {
  const lines = readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

const KLING_ACCESS_KEY = process.env.KLING_ACCESS_KEY;
const KLING_SECRET_KEY = process.env.KLING_SECRET_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!KLING_ACCESS_KEY || !KLING_SECRET_KEY) {
  console.error("❌ Missing KLING_ACCESS_KEY or KLING_SECRET_KEY in .env.local");
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------------------------

const LOCAL_DIR = join(ROOT, "public", "images", "services-landing");
const OPTIMIZED_DIR = join(LOCAL_DIR, "optimized");
const STORAGE_BUCKET = "landing-images";
const STORAGE_PREFIX = "services";
const KLING_API_BASE = "https://api-singapore.klingai.com";
const KLING_MODEL = "kling-v2-1";
const POLL_INTERVAL_MS = 5_000;
const POLL_TIMEOUT_MS = 180_000; // 3 minutes per image
const MAX_RETRIES = 2;

// ---------------------------------------------------------------------------
// KLING AUTH — JWT
// ---------------------------------------------------------------------------

let jwt;
try {
  jwt = (await import("jsonwebtoken")).default;
} catch {
  console.error("❌ jsonwebtoken not installed. Run: npm install --save-dev jsonwebtoken");
  process.exit(1);
}

function generateKlingToken() {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: KLING_ACCESS_KEY,
    exp: now + 1800, // 30 min
    nbf: now - 5,
    iat: now,
  };
  return jwt.sign(payload, KLING_SECRET_KEY, {
    algorithm: "HS256",
    header: { alg: "HS256", typ: "JWT" },
  });
}

// ---------------------------------------------------------------------------
// KLING API HELPERS
// ---------------------------------------------------------------------------

async function klingFetch(method, path, body = null) {
  const token = generateKlingToken();
  const url = `${KLING_API_BASE}${path}`;

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  const text = await res.text();

  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Kling API returned non-JSON (${res.status}): ${text.slice(0, 500)}`);
  }

  if (json.code !== 0) {
    throw new Error(`Kling API error: code=${json.code} message="${json.message}"`);
  }

  return json.data;
}

async function klingCreateTask(prompt, negativePrompt, aspectRatio) {
  const body = {
    model_name: KLING_MODEL,
    prompt,
    negative_prompt: negativePrompt || "",
    n: 1,
    aspect_ratio: aspectRatio,
  };

  const data = await klingFetch("POST", "/v1/images/generations", body);
  return data.task_id;
}

async function klingPollTask(taskId) {
  const start = Date.now();

  while (Date.now() - start < POLL_TIMEOUT_MS) {
    const data = await klingFetch("GET", `/v1/images/generations/${taskId}`);

    if (data.task_status === "succeed") {
      if (data.task_result?.images?.[0]?.url) {
        return data.task_result.images[0].url;
      }
      throw new Error(`Task ${taskId} succeeded but no image URL in response`);
    }

    if (data.task_status === "failed") {
      throw new Error(
        `Task ${taskId} failed: ${data.task_status_msg || "unknown reason"}`
      );
    }

    // Still submitted/processing — wait
    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(`Task ${taskId} timed out after ${POLL_TIMEOUT_MS / 1000}s`);
}

async function downloadImage(url, outputPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${url}`);
  const arrayBuf = await res.arrayBuffer();
  writeFileSync(outputPath, Buffer.from(arrayBuf));
}

// ---------------------------------------------------------------------------
// ASPECT RATIO MAPPING
// ---------------------------------------------------------------------------

/**
 * Maps pixel dimensions to the closest Kling-supported aspect ratio.
 * Kling supports: 1:1, 16:9, 9:16, 4:3, 3:4, 3:2, 2:3, 21:9
 */
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

// ---------------------------------------------------------------------------
// IMAGE SPECIFICATIONS (33 images)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// SHARED NEGATIVE PROMPT FRAGMENTS
// ---------------------------------------------------------------------------
const NEG_BASE = "text, watermark, logo, blurry, low quality, distorted, cartoon, anime, illustration, painting, drawing, sketch";
const NEG_NO_WHITE = "white person, caucasian, light skin, pale skin, European, Asian, Indian, mixed race";
const NEG_PEOPLE = `${NEG_BASE}, ${NEG_NO_WHITE}`;

const IMAGE_SPECS = [
  // ==================== HERO ====================
  {
    id: "hero-bg",
    subdir: "",
    width: 1920,
    height: 1080,
    prompt:
      "Upscale modern Nairobi residential neighborhood in Kilimani at golden hour, contemporary apartment buildings with lush green compound gardens and bougainvillea, a teal-branded professional service van with orange accent stripe parked on a clean tarmac road, Black African Kenyan residents visible in the background walking along tree-lined sidewalks, warm golden sunlight casting long shadows, Nairobi skyline visible in the distance, professional real estate commercial photography, ultra sharp 8K detail, vibrant warm tones with teal and orange color accents throughout",
    negativePrompt:
      `${NEG_PEOPLE}, rural, slum, poverty, dirt road, unpaved, Western architecture, European buildings`,
  },

  // ==================== CATEGORIES (12) ====================
  {
    id: "plumbing",
    subdir: "categories",
    width: 600,
    height: 400,
    prompt:
      "Black African Kenyan male plumber with dark brown skin, wearing a clean teal-colored branded polo shirt with orange logo embroidery, crouched under a modern white kitchen sink tightening pipe fittings with a wrench, bright contemporary Nairobi apartment kitchen with granite countertops and stainless steel fixtures, professional tools organized in an open teal toolbox beside him, confident focused expression, natural window light illuminating the scene, professional service photography, crisp sharp focus, warm ambient tones",
    negativePrompt:
      `${NEG_PEOPLE}, messy, dirty, old kitchen, rusty pipes, broken fixtures, dingy lighting, unprofessional`,
  },
  {
    id: "electrical",
    subdir: "categories",
    width: 600,
    height: 400,
    prompt:
      "Black African Kenyan male electrician with dark brown skin, wearing safety goggles and teal-colored work shirt, carefully installing a modern LED ceiling light panel in a contemporary Nairobi apartment living room, professional blue insulated gloves on hands, clean white painted walls, modern furniture visible in background, wire stripper and voltage tester on a clean drop cloth below, focused professional expression, warm ambient lighting from adjacent room, professional service photography, sharp detail",
    negativePrompt:
      `${NEG_PEOPLE}, sparks, danger, messy wiring, exposed live wires, old house, dark room, unprofessional`,
  },
  {
    id: "water-gas-delivery",
    subdir: "categories",
    width: 600,
    height: 400,
    prompt:
      "Clean teal-branded water delivery truck with orange stripe pulling up to a modern Nairobi apartment gate in Westlands, Black African Kenyan delivery man with dark brown skin in teal uniform carrying a blue 20-liter water dispenser bottle on his shoulder, apartment askari opening the gate, bright sunny Nairobi morning, well-maintained compound with flowering hedge, professional commercial photography, clean composition, vivid colors",
    negativePrompt:
      `${NEG_PEOPLE}, dirty truck, old vehicle, rusty, slum, unpaved road, dusty, dingy`,
  },
  {
    id: "cleaning",
    subdir: "categories",
    width: 600,
    height: 400,
    prompt:
      "Two Black African Kenyan women cleaners with dark brown skin, wearing matching teal aprons over white shirts with small orange logo badge, professionally deep cleaning a modern bright Nairobi apartment living room, one wiping glass coffee table with microfiber cloth while the other vacuums a light-colored rug, organized cleaning caddy with color-coded supplies, sparkling clean surfaces, large windows letting in abundant natural light, contemporary furniture, professional service photography, warm tones",
    negativePrompt:
      `${NEG_PEOPLE}, messy, cluttered, dirty apartment, cheap cleaning products, dark room, unprofessional`,
  },
  {
    id: "laundry",
    subdir: "categories",
    width: 600,
    height: 400,
    prompt:
      "Black African Kenyan woman laundry professional with dark brown skin, wearing a clean teal branded uniform, expertly folding crisp white towels on a clean stainless steel counter in a modern laundry facility, neatly organized shelves behind her with precisely folded garments sorted by color, modern commercial washing machines visible in background, bright well-lit interior with warm tones, steam press machine nearby, professional service photography, sharp focus on hands folding fabric",
    negativePrompt:
      `${NEG_PEOPLE}, dirty clothes, stained fabric, messy piles, cramped space, dim lighting, unprofessional`,
  },
  {
    id: "pest-control",
    subdir: "categories",
    width: 600,
    height: 400,
    prompt:
      "Black African Kenyan male pest control technician with dark brown skin, wearing a white protective coverall suit with teal safety gloves and teal-branded respirator mask pushed up on forehead, holding a professional sprayer wand, standing in a spotless modern Nairobi kitchen inspecting along the baseboards methodically, organized equipment bag with orange accents on the counter, calm professional demeanor, bright clean interior, professional service photography, sharp detail",
    negativePrompt:
      `${NEG_PEOPLE}, visible insects, pests, cockroaches, rats, scary, dark room, dirty kitchen, hazmat panic`,
  },
  {
    id: "carpentry",
    subdir: "categories",
    width: 600,
    height: 400,
    prompt:
      "Skilled Black African Kenyan master carpenter with dark brown skin, wearing a teal work apron over a simple shirt, carefully hand-sanding a beautiful mahogany wardrobe door in a well-organized Nairobi workshop, wood shavings curling on the workbench, professional chisels and planes arranged neatly on a wall-mounted tool rack, rich warm wood tones, golden afternoon light streaming through a window, detailed craftsmanship visible in wood grain, professional artisan photography, sharp focus",
    negativePrompt:
      `${NEG_PEOPLE}, messy workshop, dangerous tools, power tool accident, dark room, cheap furniture, MDF`,
  },
  {
    id: "painting",
    subdir: "categories",
    width: 600,
    height: 400,
    prompt:
      "Black African Kenyan male professional painter with dark brown skin, wearing clean white painter overalls with a teal cap, using a premium roller to apply a fresh coat of warm teal-tinted paint to a feature wall in a modern Nairobi apartment living room, painter's tape perfectly masking the trim, clean canvas drop cloths protecting hardwood floors, orange-labeled premium paint buckets nearby, smooth even coverage visible on the wall, bright airy room with natural light, professional service photography",
    negativePrompt:
      `${NEG_PEOPLE}, paint spills, messy splatter, cheap paint, old room, peeling walls, unprofessional, ladder accident`,
  },
  {
    id: "moving-relocation",
    subdir: "categories",
    width: 600,
    height: 400,
    prompt:
      "Team of three Black African Kenyan male movers with dark brown skin, wearing matching teal polo shirts with orange company lettering, carefully loading a neatly wrapped sofa into a clean white moving truck with teal side branding, one mover carrying a labeled cardboard box, another guiding the sofa with moving blankets, modern Nairobi residential street in Lavington with a gate and trees, bright sunny day, organized professional workflow, commercial photography, warm natural lighting",
    negativePrompt:
      `${NEG_PEOPLE}, broken furniture, dropped items, damaged goods, old truck, rusty vehicle, chaotic, unprofessional`,
  },
  {
    id: "internet-networking",
    subdir: "categories",
    width: 600,
    height: 400,
    prompt:
      "Black African Kenyan male IT technician with dark brown skin, wearing a smart teal branded polo shirt, professionally mounting a sleek modern white WiFi mesh router on a wall shelf in a contemporary Nairobi home office, laptop open on the desk showing network configuration dashboard, ethernet cables neatly organized with cable ties, clean minimalist desk setup with monitor, bright well-lit modern interior, professional service photography, sharp focus on technician's expert hands",
    negativePrompt:
      `${NEG_PEOPLE}, tangled wires, messy cables, old equipment, cluttered desk, server room, dark, unprofessional`,
  },
  {
    id: "gardening-landscaping",
    subdir: "categories",
    width: 600,
    height: 400,
    prompt:
      "Black African Kenyan female professional gardener with dark brown skin, wearing a teal sun hat and orange gardening gloves, kneeling to trim a flowering tropical hedge with sharp shears in the lush compound garden of a modern Nairobi residential estate in Karen, colorful bougainvillea and hibiscus blooms, perfectly manicured green lawn, stone pathway visible, golden afternoon sunlight filtering through trees, professional service photography, vibrant vivid colors, sharp focus",
    negativePrompt:
      `${NEG_PEOPLE}, dead plants, dry garden, barren, brown grass, weeds, neglected, overgrown, dark, dull colors`,
  },
  {
    id: "more-services",
    subdir: "categories",
    width: 600,
    height: 400,
    prompt:
      "Clean four-quadrant split composition showing diverse home services in Nairobi: top-left Black African Kenyan technician installing an AC unit on a white wall, top-right Black African Kenyan woman tiling a modern bathroom floor, bottom-left Black African Kenyan man repairing a refrigerator in a kitchen, bottom-right Black African Kenyan fumigation worker in protective gear treating an office space, all workers with dark brown skin wearing teal branded clothing, each quadrant sharp and well-lit, modern interiors, professional service photography grid layout",
    negativePrompt:
      `${NEG_PEOPLE}, messy, cluttered, crowded, unclear composition, overlapping images, dark, blurry, chaotic`,
  },

  // ==================== HOW IT WORKS (3) ====================
  {
    id: "search",
    subdir: "how-it-works",
    width: 800,
    height: 600,
    prompt:
      "Close-up of dark brown skinned Black African Kenyan woman's hands holding a modern smartphone, the phone screen displays a clean teal and white service marketplace search interface with a prominent search bar at top reading 'What service do you need?', below it a grid of service category cards with small photos (plumbing, cleaning, electrical, painting), teal header bar at the top of the app screen, comfortable modern Nairobi living room with cream sofa blurred in background, shallow depth of field focusing on the phone screen, warm natural window light, professional product lifestyle photography, ultra-sharp screen detail",
    negativePrompt:
      `${NEG_PEOPLE}, old phone, cracked screen, blurry screen, unreadable UI, stock phone mockup, dark room, generic app, blue interface`,
  },
  {
    id: "compare",
    subdir: "how-it-works",
    width: 800,
    height: 600,
    prompt:
      "Black African Kenyan young professional woman with dark brown skin sitting at a modern light wood desk, looking at a laptop screen showing a clean teal and white service provider comparison page with two provider profile cards side by side displaying star ratings in orange, prices in KES, verified badges in green, and customer review snippets, she has a thoughtful choosing expression with one hand on chin, bright modern Nairobi apartment home office with plant and bookshelf, natural daylight from window, professional lifestyle photography, sharp focus on both the person and the screen content",
    negativePrompt:
      `${NEG_PEOPLE}, messy desk, cluttered, dark room, sad expression, old computer, generic website, blue theme, confusing UI`,
  },
  {
    id: "book",
    subdir: "how-it-works",
    width: 800,
    height: 600,
    prompt:
      "Close-up of a smiling Black African Kenyan man with dark brown skin tapping a large orange 'Confirm Booking' button on his smartphone screen, the phone displays a clean booking confirmation interface with teal header, showing service details (Plumbing - Tap Repair), provider name and photo, date/time slot, price in KES, and M-Pesa payment option with green Safaricom logo, the man's face visible in upper portion showing a satisfied smile, warm bright Nairobi apartment kitchen background blurred, natural lighting, professional lifestyle product photography, ultra-sharp detail on the phone screen",
    negativePrompt:
      `${NEG_PEOPLE}, error screen, red warning, failed payment, cracked phone, dark room, worried expression, old phone, generic app UI`,
  },

  // ==================== WHY MITASAFI (6) ====================
  {
    id: "verified",
    subdir: "why-mitasafi",
    width: 600,
    height: 400,
    prompt:
      "Black African Kenyan male service provider with dark brown skin, wearing a clean teal branded uniform shirt, proudly holding up a laminated verification ID badge with his photo and a green 'Verified' hologram stamp, standing in a modern Nairobi office reception with a clean white wall behind him, his smartphone in the other hand showing a provider verification complete screen with green checkmark and teal accents, trustworthy confident warm smile, bright professional lighting, portrait photography with soft bokeh background",
    negativePrompt:
      `${NEG_PEOPLE}, suspicious, shady, dark room, fake ID, blurry badge, unprofessional, scammer`,
  },
  {
    id: "pricing",
    subdir: "why-mitasafi",
    width: 600,
    height: 400,
    prompt:
      "Black African Kenyan woman homeowner with dark brown skin, sitting on a modern sofa in a bright Nairobi living room, holding a tablet that displays a clean transparent pricing breakdown interface with teal header bar and the heading 'Service Quote', itemized list showing specific line items like 'Labour - KES 2,500', 'Parts - KES 800', 'Total: KES 3,300' in clear typography, a green 'No Hidden Fees' badge, orange 'Accept Quote' button at bottom, she looks pleased and reassured studying the screen, warm afternoon light, professional lifestyle photography",
    negativePrompt:
      `${NEG_PEOPLE}, confusing numbers, cluttered UI, worried expression, hidden charges, dark room, old tablet, blurry screen`,
  },
  {
    id: "payment",
    subdir: "why-mitasafi",
    width: 600,
    height: 400,
    prompt:
      "Close-up of dark brown skinned Black African Kenyan hands holding a smartphone showing an M-Pesa payment confirmation screen with green Safaricom brand colors, the screen displays 'Payment Held in Escrow' with a teal shield icon, amount 'KES 3,300' in bold, provider name, and a message 'Released after you confirm completion', modern bright clean Nairobi kitchen counter in blurred background, shallow depth of field, the scene conveys trust and financial security, professional product photography, ultra-sharp screen detail",
    negativePrompt:
      `${NEG_PEOPLE}, error message, failed payment, declined, red warning, cracked phone, dark setting, worried, old phone`,
  },
  {
    id: "reviews",
    subdir: "why-mitasafi",
    width: 600,
    height: 400,
    prompt:
      "Joyful Black African Kenyan woman homeowner with dark brown skin and natural hair, sitting in her freshly cleaned sparkling Nairobi living room, happily typing a 5-star review on her smartphone, the phone screen shows a review form with 5 orange filled stars, a text field with her typed feedback, and teal UI accents, the living room behind her is pristine and well-organized confirming the great service she received, genuine wide radiant smile, warm golden afternoon light streaming through curtains, professional lifestyle photography",
    negativePrompt:
      `${NEG_PEOPLE}, sad, angry, negative review, one star, messy room, disappointed, dark room, unflattering angle`,
  },
  {
    id: "emergency",
    subdir: "why-mitasafi",
    width: 600,
    height: 400,
    prompt:
      "Black African Kenyan male emergency plumber with dark brown skin, arriving at a customer's apartment door at night wearing a teal branded uniform with reflective orange safety stripes, carrying a professional tool kit and work flashlight, a relieved Black African Kenyan woman homeowner with dark brown skin in casual home clothes opening the door gratefully, modern Nairobi apartment building corridor with warm overhead corridor lighting, the scene conveys rapid professional response and relief, nighttime but well-lit, professional service photography, warm tones despite night setting",
    negativePrompt:
      `${NEG_PEOPLE}, panic, flood damage, disaster scene, broken door, unsafe, dark scary hallway, threatening, daytime`,
  },
  {
    id: "neighborhood",
    subdir: "why-mitasafi",
    width: 600,
    height: 400,
    prompt:
      "Beautiful aerial photography of the Kilimani-Westlands neighborhood of Nairobi from moderate height, showing modern apartment complexes with green compound gardens, clean tarmac roads with roundabouts, a teal-branded MitaSafi service van driving along Ngong Road, scattered jacaranda trees with purple blooms, the Nairobi skyline with recognizable KCB tower and KICC in the background, golden hour warm light, small teal location pin markers digitally overlaid on different neighborhoods, professional commercial aerial drone photography, ultra-sharp vivid detail",
    negativePrompt:
      `${NEG_BASE}, slum, poverty, dirty roads, informal settlement, ugly buildings, barren, grey overcast, depressing`,
  },

  // ==================== PROVIDER CTA (1) ====================
  {
    id: "provider-cta",
    subdir: "",
    width: 1200,
    height: 600,
    prompt:
      "Group of five proud Black African Kenyan service professionals with dark brown skin standing together in a confident line, from left: female cleaner in teal apron over white, male plumber with teal polo and wrench, female electrician with safety vest and orange hard hat, male carpenter with teal apron holding a spirit level, male IT technician with teal branded polo holding a small router, all smiling warmly and confidently at camera, modern Nairobi skyline with KICC and high-rises in the golden hour background, teal and orange branded elements in their clothing, professional commercial group portrait photography, warm golden backlight, sharp focus, inspiring composition",
    negativePrompt:
      `${NEG_PEOPLE}, sad, unprofessional, messy uniforms, grey sky, dark, studio backdrop, fake background, stiff poses`,
  },

  // ==================== AVATARS (10) ====================
  {
    id: "grace",
    subdir: "avatars",
    width: 200,
    height: 200,
    prompt:
      "Professional headshot portrait of a friendly Black African Kenyan woman with rich dark brown skin in her mid-30s, warm approachable smile showing teeth, modern short natural hair, small gold earrings, wearing a teal blouse, soft teal-tinted bokeh background, studio ring light creating catchlight in her dark brown eyes, professional corporate portrait photography, sharp focus on face, skin texture visible",
    negativePrompt:
      `${NEG_PEOPLE}, full body, weird eyes, deformed face, uncanny valley, washed out skin, grey background`,
  },
  {
    id: "david",
    subdir: "avatars",
    width: 200,
    height: 200,
    prompt:
      "Professional headshot portrait of a confident Black African Kenyan man with rich dark brown skin in his late 30s, neatly trimmed short beard, warm genuine smile, wearing a crisp white collared shirt under a teal blazer, soft warm-toned bokeh background, studio lighting with subtle rim light, professional corporate portrait photography, sharp focus on face, strong jawline",
    negativePrompt:
      `${NEG_PEOPLE}, full body, weird eyes, deformed face, uncanny valley, washed out skin, unkempt`,
  },
  {
    id: "wanjiku",
    subdir: "avatars",
    width: 200,
    height: 200,
    prompt:
      "Professional headshot portrait of a cheerful Black African Kikuyu Kenyan woman with rich dark brown skin in her early 40s, elegant gold dangle earrings, warm genuine motherly smile, neatly styled braided updo hairstyle, wearing orange blouse, soft neutral warm bokeh background, professional studio lighting, corporate LinkedIn-quality portrait photography, sharp focus on face, kind expressive eyes",
    negativePrompt:
      `${NEG_PEOPLE}, full body, weird eyes, deformed face, uncanny valley, washed out skin, dull expression`,
  },
  {
    id: "james",
    subdir: "avatars",
    width: 200,
    height: 200,
    prompt:
      "Professional headshot portrait of a young Black African Kenyan professional man with rich dark brown skin in his mid-20s, clean-shaven smooth face, bright friendly energetic smile, short modern fade haircut, wearing a smart teal polo shirt, soft neutral warm bokeh background, studio lighting, professional corporate portrait photography, sharp focus on face, youthful confident expression",
    negativePrompt:
      `${NEG_PEOPLE}, full body, weird eyes, deformed face, uncanny valley, washed out, old looking`,
  },
  {
    id: "aisha",
    subdir: "avatars",
    width: 200,
    height: 200,
    prompt:
      "Professional headshot portrait of a beautiful Black African Kenyan-Somali woman with dark brown skin in her late 20s, elegant teal silk hijab perfectly draped, warm confident radiant smile, subtle gold stud earring visible, natural minimal makeup, soft warm-toned bokeh background, studio lighting with catch light, professional corporate portrait photography, sharp focus on face, graceful feminine features",
    negativePrompt:
      `${NEG_PEOPLE}, full body, weird eyes, deformed face, uncanny valley, washed out skin, loose hijab, unflattering angle`,
  },
  {
    id: "brian",
    subdir: "avatars",
    width: 200,
    height: 200,
    prompt:
      "Professional headshot portrait of a trustworthy Black African Kenyan man with rich dark brown skin in his mid-40s, modern rectangular glasses frames, warm approachable smile, short cropped hair with slight greying at temples, wearing a smart casual button-down shirt in warm grey, soft neutral warm bokeh background, studio lighting, professional corporate portrait photography, sharp focus on face, wise reliable expression",
    negativePrompt:
      `${NEG_PEOPLE}, full body, weird eyes, deformed face, uncanny valley, washed out skin, cheap glasses`,
  },
  {
    id: "peter",
    subdir: "avatars",
    width: 200,
    height: 200,
    prompt:
      "Professional headshot portrait of a kind distinguished Black African Kenyan man with rich dark brown skin in his early 50s, distinguished salt-and-pepper very short hair and stubble, warm wise fatherly smile, wearing a neat teal collared shirt, soft neutral warm bokeh background, studio lighting, professional corporate portrait photography, sharp focus on face, dignified experienced expression, well-defined cheekbones",
    negativePrompt:
      `${NEG_PEOPLE}, full body, weird eyes, deformed face, uncanny valley, washed out skin, too old, unkempt`,
  },
  {
    id: "mary",
    subdir: "avatars",
    width: 200,
    height: 200,
    prompt:
      "Professional headshot portrait of a radiant Black African Kenyan woman with rich dark brown skin in her early 30s, beautiful long box braids pulled to one side, bright genuine joyful smile, wearing a vibrant orange blouse that complements her skin, small hoop earrings, soft warm-toned bokeh background, studio lighting, professional corporate portrait photography, sharp focus on face, expressive bright eyes",
    negativePrompt:
      `${NEG_PEOPLE}, full body, weird eyes, deformed face, uncanny valley, washed out skin, dull colors, unflattering`,
  },
  {
    id: "samuel",
    subdir: "avatars",
    width: 200,
    height: 200,
    prompt:
      "Professional headshot portrait of a dependable Black African Kenyan man with rich dark brown skin in his late 30s, short natural hair, calm confident composed expression with a subtle warm smile, strong shoulders in a crisp white dress shirt, soft neutral warm bokeh background, studio lighting with rim light defining jaw, professional corporate portrait photography, sharp focus on face, trustworthy steady gaze",
    negativePrompt:
      `${NEG_PEOPLE}, full body, weird eyes, deformed face, uncanny valley, washed out skin, too serious, unfriendly`,
  },
  {
    id: "hannah",
    subdir: "avatars",
    width: 200,
    height: 200,
    prompt:
      "Professional headshot portrait of a joyful Black African Kenyan woman with rich dark brown skin in her mid-40s, beautiful natural TWA (teeny weeny afro) hairstyle, wide warm genuine smile showing happiness, wearing a modern teal and white patterned blouse, small gold stud earrings, soft neutral warm bokeh background, studio lighting, professional corporate portrait photography, sharp focus on face, vibrant warm personality radiating",
    negativePrompt:
      `${NEG_PEOPLE}, full body, weird eyes, deformed face, uncanny valley, washed out skin, dull expression, sad, grey`,
  },
];

// ---------------------------------------------------------------------------
// BLUR PLACEHOLDER TARGETS (above-the-fold images for LCP)
// ---------------------------------------------------------------------------

const BLUR_TARGETS = ["hero-bg", "plumbing", "electrical", "water-gas-delivery", "cleaning"];

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
}

function hr(label) {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`  ${label}`);
  console.log(`${"=".repeat(70)}\n`);
}

function localPath(spec) {
  const dir = spec.subdir ? join(LOCAL_DIR, spec.subdir) : LOCAL_DIR;
  return join(dir, `${spec.id}.jpg`);
}

function optimizedPath(spec) {
  const dir = spec.subdir ? join(OPTIMIZED_DIR, spec.subdir) : OPTIMIZED_DIR;
  return join(dir, `${spec.id}.jpg`);
}

function storagePath(spec) {
  return spec.subdir
    ? `${STORAGE_PREFIX}/${spec.subdir}/${spec.id}.jpg`
    : `${STORAGE_PREFIX}/${spec.id}.jpg`;
}

// Map spec ID to images.ts camelCase key
function toCamelKey(spec) {
  const MAP = {
    "hero-bg": "servicesHeroBg",
    plumbing: "catPlumbing",
    electrical: "catElectrical",
    "water-gas-delivery": "catWaterGas",
    cleaning: "catCleaning",
    laundry: "catLaundry",
    "pest-control": "catPestControl",
    carpentry: "catCarpentry",
    painting: "catPainting",
    "moving-relocation": "catMoving",
    "internet-networking": "catInternet",
    "gardening-landscaping": "catGardening",
    "more-services": "catMore",
    search: "howitSearch",
    compare: "howitCompare",
    book: "howitBook",
    verified: "whyVerified",
    pricing: "whyPricing",
    payment: "whyPayment",
    reviews: "whyReviews",
    emergency: "whyEmergency",
    neighborhood: "whyNeighborhood",
    "provider-cta": "providerCta",
    grace: "avatarGrace",
    david: "avatarDavid",
    wanjiku: "avatarWanjiku",
    james: "avatarJames",
    aisha: "avatarAisha",
    brian: "avatarBrian",
    peter: "avatarPeter",
    mary: "avatarMary",
    samuel: "avatarSamuel",
    hannah: "avatarHannah",
  };
  return MAP[spec.id] || spec.id;
}

// ---------------------------------------------------------------------------
// PHASE 1: Generate with Kling AI
// ---------------------------------------------------------------------------

async function phase1_generate() {
  hr("PHASE 1 — Generate Images (Kling AI)");

  ensureDir(LOCAL_DIR);
  for (const spec of IMAGE_SPECS) {
    if (spec.subdir) ensureDir(join(LOCAL_DIR, spec.subdir));
  }

  // Pre-flight: verify auth
  console.log("  Verifying Kling AI authentication...");
  try {
    await klingFetch("GET", "/v1/images/generations?pageNum=1&pageSize=1");
    console.log("  ✅ Kling AI auth OK\n");
  } catch (err) {
    console.error(`  ❌ Kling AI auth failed: ${err.message}`);
    process.exit(1);
  }

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const spec of IMAGE_SPECS) {
    const outPath = localPath(spec);

    // Skip if already generated
    if (existsSync(outPath)) {
      const stat = readFileSync(outPath);
      if (stat.length > 1024) {
        console.log(`  ⏭  ${spec.id} (already exists, ${(stat.length / 1024).toFixed(0)}KB)`);
        skipped++;
        continue;
      }
    }

    const aspectRatio = getKlingAspectRatio(spec.width, spec.height);
    console.log(`  🎨 Generating: ${spec.id} (${aspectRatio})...`);

    let success = false;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`     Retry ${attempt}/${MAX_RETRIES}...`);
          await sleep(3000);
        }

        const taskId = await klingCreateTask(spec.prompt, spec.negativePrompt, aspectRatio);
        console.log(`     Task created: ${taskId}`);

        const imageUrl = await klingPollTask(taskId);
        console.log(`     ✅ Image ready, downloading...`);

        await downloadImage(imageUrl, outPath);

        const size = readFileSync(outPath).length;
        console.log(`     ✅ ${spec.id} saved (${(size / 1024).toFixed(0)}KB)`);
        generated++;
        success = true;
        break;
      } catch (err) {
        console.error(`     ❌ Attempt ${attempt + 1} error: ${err.message}`);
      }
    }

    if (!success) {
      console.error(`  ❌ FAILED after ${MAX_RETRIES + 1} attempts: ${spec.id}`);
      failed++;
    }

    // Small delay between requests to be gentle on API
    await sleep(1000);
  }

  console.log(`\n  Summary: ${generated} generated, ${skipped} skipped, ${failed} failed`);
  if (failed > 0) {
    console.warn(`  ⚠️  ${failed} images failed. Re-run the script to retry them.`);
  }
}

// ---------------------------------------------------------------------------
// PHASE 2: Optimize with Sharp
// ---------------------------------------------------------------------------

async function phase2_optimize() {
  hr("PHASE 2 — Optimize Images (Sharp)");

  let sharp;
  try {
    sharp = (await import("sharp")).default;
  } catch {
    console.error("❌ sharp not installed. Run: npm install --save-dev sharp");
    process.exit(1);
  }

  ensureDir(OPTIMIZED_DIR);
  for (const spec of IMAGE_SPECS) {
    if (spec.subdir) ensureDir(join(OPTIMIZED_DIR, spec.subdir));
  }

  for (const spec of IMAGE_SPECS) {
    const src = localPath(spec);
    const dest = optimizedPath(spec);

    if (!existsSync(src)) {
      console.warn(`  ⚠️  Missing source: ${spec.id} — skipping`);
      continue;
    }

    // Read into buffer first (avoids Windows file-locking with sharp)
    const buf = readFileSync(src);
    const quality = spec.width <= 200 ? 80 : 85;

    await sharp(buf)
      .resize(spec.width, spec.height, { fit: "cover" })
      .jpeg({ quality, progressive: true, mozjpeg: true })
      .toFile(dest);

    const origSize = buf.length;
    const optSize = readFileSync(dest).length;
    const pct = ((1 - optSize / origSize) * 100).toFixed(0);

    console.log(
      `  ✅ ${spec.id}: ${(origSize / 1024).toFixed(0)}KB → ${(optSize / 1024).toFixed(0)}KB (${pct}% smaller)`
    );
  }
}

// ---------------------------------------------------------------------------
// PHASE 3: Blur Placeholders
// ---------------------------------------------------------------------------

async function phase3_blur() {
  hr("PHASE 3 — Blur Placeholders");

  let sharp;
  try {
    sharp = (await import("sharp")).default;
  } catch {
    console.error("❌ sharp not installed");
    process.exit(1);
  }

  const blurData = {};

  for (const id of BLUR_TARGETS) {
    const spec = IMAGE_SPECS.find((s) => s.id === id);
    if (!spec) {
      console.warn(`  ⚠️  Blur target "${id}" not in IMAGE_SPECS`);
      continue;
    }

    const src = optimizedPath(spec);
    if (!existsSync(src)) {
      console.warn(`  ⚠️  Missing optimized: ${id} — skipping blur`);
      continue;
    }

    const buf = readFileSync(src);

    const tinyBuf = await sharp(buf)
      .resize(20, 15, { fit: "cover" })
      .jpeg({ quality: 40 })
      .toBuffer();

    const base64 = `data:image/jpeg;base64,${tinyBuf.toString("base64")}`;
    blurData[toCamelKey(spec)] = base64;
    console.log(`  ✅ ${id}: ${base64.length} chars`);
  }

  return blurData;
}

// ---------------------------------------------------------------------------
// PHASE 4: Upload to Supabase Storage
// ---------------------------------------------------------------------------

async function phase4_upload() {
  hr("PHASE 4 — Upload to Supabase Storage");

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  let uploaded = 0;
  let errors = 0;

  for (const spec of IMAGE_SPECS) {
    const src = optimizedPath(spec);
    if (!existsSync(src)) {
      console.warn(`  ⚠️  Missing optimized: ${spec.id} — skipping upload`);
      continue;
    }

    const buf = readFileSync(src);
    const spath = storagePath(spec);

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(spath, buf, {
        contentType: "image/jpeg",
        upsert: true,
        cacheControl: "public, max-age=31536000, immutable",
      });

    if (error) {
      console.error(`  ❌ Upload failed: ${spec.id} — ${error.message}`);
      errors++;
    } else {
      console.log(`  ✅ ${spath}`);
      uploaded++;
    }
  }

  console.log(`\n  Uploaded: ${uploaded}/${IMAGE_SPECS.length}`);
  if (errors > 0) {
    console.warn(`  ⚠️  ${errors} upload errors`);
  }
}

// ---------------------------------------------------------------------------
// PHASE 5: Verify Public URLs
// ---------------------------------------------------------------------------

async function phase5_verify() {
  hr("PHASE 5 — Verify Public URLs");

  const base = `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}`;

  let ok = 0;
  let fail = 0;

  for (const spec of IMAGE_SPECS) {
    const url = `${base}/${storagePath(spec)}`;
    try {
      const res = await fetch(url, { method: "HEAD" });
      if (res.ok) {
        console.log(`  ✅ ${res.status} ${spec.id}`);
        ok++;
      } else {
        console.error(`  ❌ ${res.status} ${spec.id}`);
        fail++;
      }
    } catch (err) {
      console.error(`  ❌ ${spec.id}: ${err.message}`);
      fail++;
    }
  }

  console.log(`\n  Verified: ${ok}/${IMAGE_SPECS.length} OK`);
  if (fail > 0) {
    console.error(`  ❌ ${fail} failed verifications`);
  }
}

// ---------------------------------------------------------------------------
// PHASE 6: Write images.ts Constants
// ---------------------------------------------------------------------------

function phase6_constants(blurData) {
  hr("PHASE 6 — Write images.ts Constants");

  const outFile = join(
    ROOT,
    "src",
    "components",
    "services-landing",
    "images.ts"
  );

  // Build URL entries
  const urlEntries = IMAGE_SPECS.map((spec) => {
    const key = toCamelKey(spec);
    const comment =
      spec.subdir === ""
        ? `// ${spec.id}`
        : `// ${spec.subdir}/${spec.id}`;

    const subdirPart = spec.subdir ? `/${spec.subdir}` : "";
    return `  ${key}: \`\${STORAGE_BASE}${subdirPart}/${spec.id}.jpg\`,`;
  });

  // Group by section with blank lines
  const sections = [];
  let prevSubdir = null;
  for (const spec of IMAGE_SPECS) {
    const key = toCamelKey(spec);
    const subdirPart = spec.subdir ? `/${spec.subdir}` : "";
    const line = `  ${key}: \`\${STORAGE_BASE}${subdirPart}/${spec.id}.jpg\`,`;

    if (prevSubdir !== null && prevSubdir !== spec.subdir) {
      sections.push(""); // blank line between groups
    }
    sections.push(line);
    prevSubdir = spec.subdir;
  }

  // Build blur entries
  const blurEntries = Object.entries(blurData || {}).map(
    ([key, val]) => `  ${key}: "${val}",`
  );

  const content = `/**
 * Services Landing Page — Image Constants
 *
 * Single source of truth for all image URLs used on the "/services" landing page.
 * Generated by scripts/generate-services-images.mjs (SLP-2).
 *
 * Every component imports from this file — image URLs NEVER appear in components.
 *
 * @see SERVICES_LANDING_PAGE_SPECIFICATION.md §6 for image specifications
 */

// =============================================================================
// SUPABASE STORAGE BASE
// =============================================================================

const STORAGE_BASE =
  "https://syoolvgoaqnckgmngvse.supabase.co/storage/v1/object/public/landing-images/services";

// =============================================================================
// IMAGE URLS
// =============================================================================

/**
 * All services landing page image URLs.
 * Keys use camelCase versions of the image IDs from the specification.
 */
export const SERVICES_IMAGES = {
${sections.join("\n")}
} as const;

/** Type for any valid services image key */
export type ServicesImageKey = keyof typeof SERVICES_IMAGES;

// =============================================================================
// BLUR PLACEHOLDERS
// =============================================================================

/**
 * Base64-encoded blur placeholders for above-the-fold images.
 * Used with Next.js Image component: placeholder="blur" blurDataURL={...}
 *
 * Includes: hero + first 4 category images (plumbing, electrical, water-gas, cleaning)
 */
export const SERVICES_BLUR_DATA: Partial<Record<ServicesImageKey, string>> = {
${blurEntries.join("\n")}
} as const;

// =============================================================================
// HELPER
// =============================================================================

/**
 * Get the blur data URL for an image, if available.
 * Returns undefined if no blur placeholder exists for that image.
 */
export function getBlurDataURL(key: ServicesImageKey): string | undefined {
  return SERVICES_BLUR_DATA[key];
}
`;

  writeFileSync(outFile, content, "utf8");
  console.log(`  ✅ Written: ${outFile}`);
  console.log(`     ${IMAGE_SPECS.length} image URLs`);
  console.log(`     ${Object.keys(blurData || {}).length} blur placeholders`);
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

async function main() {
  console.log("\n🚀 MitaSafi Services Image Pipeline — Kling AI + Supabase\n");
  console.log(`  Model: ${KLING_MODEL}`);
  console.log(`  Images: ${IMAGE_SPECS.length}`);
  console.log(`  Bucket: ${STORAGE_BUCKET}/${STORAGE_PREFIX}`);

  const start = Date.now();

  await phase1_generate();
  await phase2_optimize();
  const blurData = await phase3_blur();
  await phase4_upload();
  await phase5_verify();
  phase6_constants(blurData);

  const elapsed = ((Date.now() - start) / 1000).toFixed(0);
  hr("DONE");
  console.log(`  Total time: ${elapsed}s`);
  console.log(`  Next: npx tsc --noEmit to verify TypeScript compiles\n`);
}

main().catch((err) => {
  console.error("\n💀 Fatal error:", err);
  process.exit(1);
});
