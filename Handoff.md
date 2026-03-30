# Manuals.ai — Claude Code Handoff Document

## What This App Is
An AI-powered product guide web app. Users type a product name or paste a shop URL (or take a photo) and get an instant structured guide with 5 sections: Setup, Daily Use, Tips & Tricks, Troubleshooting, Maintenance. Built as a mobile-first web app deployed on Vercel.

---

## Current Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite), single file `src/App.jsx` |
| Hosting | Vercel (free tier) |
| AI | Anthropic Claude API — `claude-sonnet-4-20250514` |
| API Proxy | Vercel Serverless Function — `api/chat.js` |
| URL Scraping | allorigins.win (CORS proxy, free) |
| Storage | localStorage (on-device, no backend yet) |
| Affiliate | Amazon Associates (tag placeholder in code) |

---

## Project Structure

```
manuals-ai/
├── api/
│   └── chat.js          # Vercel serverless proxy → Anthropic API
├── src/
│   └── App.jsx          # Entire React app (single file, 527 lines)
├── public/
├── index.html
├── package.json
└── vite.config.js
```

---

## Environment Variables

```
ANTHROPIC_API_KEY=sk-ant-...   # Set in Vercel dashboard → Settings → Environment Variables
```

---

## api/chat.js (complete file)

```javascript
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: "Proxy error: " + error.message });
  }
}
```

---

## App.jsx — Key Architecture

### State & Screens
The app has 4 screens managed by a single `screen` state variable:
- `home` — search bar, camera button, quick hints
- `loading` — animated loading screen (2-phase for URLs)
- `guide` — product emoji, name, tagline, Amazon link, 5 section cards
- `section` — individual section with numbered steps

### Core API Functions

**`fetchUrlContent(url)`**
- Fetches via `https://api.allorigins.win/get?url=...`
- Strips scripts/styles/HTML, returns first 3000 chars

**`fetchProductGuide(input)`**
- Detects URL vs text input
- If URL: fetches page content first
- Calls `/api/chat` with structured prompt
- Returns JSON: `{ productName, productEmoji, tagline, sections[] }`

**`identifyProductFromImage(base64Image, mediaType)`**
- Sends image to Claude Vision via `/api/chat`
- Returns product name string

### Affiliate Link
```javascript
const AFFILIATE_TAG = "YOUR-TAG-20"; // ← replace with Amazon Associates tag
function getAmazonUrl(productName) {
  const query = encodeURIComponent(productName);
  return `https://www.amazon.com/s?k=${query}&tag=${AFFILIATE_TAG}`;
}
```

### Section Metadata
```javascript
const SECTION_META = {
  "Setup":           { icon: "🔧", color: "#f97316" },
  "Daily Use":       { icon: "⚡", color: "#3b82f6" },
  "Tips & Tricks":   { icon: "💡", color: "#eab308" },
  "Troubleshooting": { icon: "🛠️", color: "#a855f7" },
  "Maintenance":     { icon: "🔄", color: "#22c55e" },
};
```

### localStorage
```javascript
const STORAGE_KEY = "manuals-ai_products";
// Products stored as array: [{ id, productName, productEmoji, tagline, sections[], addedAt }]
```

---

## Design System (Parchment Theme)

```
Background:     #F5F0E8  (warm parchment)
Cards:          #FFFDF7  (slightly warmer white)
Drawer bg:      #EDE8DC / #E8E2D4
Borders:        #D4CBB8 / #E4DDD0 / #C4B49A
Text primary:   #2C2416  (near-black warm brown)
Text body:      #3D2B1F
Text muted:     #6B5B45
Text caption:   #9C8B74
Accent:         #8B4513  (saddle brown)
Accent hover:   #6B3410
Accent light:   #F0E6D3
Nav backdrop:   rgba(245,240,232,0.92)
Font:           Georgia serif (headings), system-ui (body)
```

---

## Claude API Prompt Structure

```
You are a helpful product guide assistant. Input: "{input}"
{optional scraped page content}

Return ONLY valid JSON (no markdown, no preamble):
{
  "productName": "exact product name and model",
  "productEmoji": "single emoji",
  "tagline": "one-line description",
  "sections": [
    { "title": "Setup", "steps": ["step1","step2","step3","step4"] },
    { "title": "Daily Use", "steps": ["..."] },
    { "title": "Tips & Tricks", "steps": ["..."] },
    { "title": "Troubleshooting", "steps": ["..."] },
    { "title": "Maintenance", "steps": ["..."] }
  ]
}
```

Model: `claude-sonnet-4-20250514`, max_tokens: 2000

---

## What's Working Right Now
- ✅ Product search by name
- ✅ URL scraping + guide generation
- ✅ Camera scan → Claude Vision → product identification → guide
- ✅ 5-section guide display
- ✅ Save/delete products in localStorage
- ✅ Slide-out drawer (My Products)
- ✅ Mobile-friendly layout (search bar stacks on mobile)
- ✅ Amazon affiliate link on every guide page
- ✅ Deployed on Vercel, working on mobile Safari
- ✅ Anthropic API proxy (no CORS issues)

---

## Planned Next Features (Priority Order)

### 1. Analytics
Add Microsoft Clarity or PostHog to understand user behaviour — where they drop off, whether they click Amazon links, whether they return.

```html
<!-- Add to index.html <head> -->
<!-- PostHog or Clarity snippet here -->
```

### 2. PWA / Add to Home Screen
Make the app installable as a PWA with proper icons and full-screen mode.

Add to `index.html`:
```html
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Manuals.ai">
<link rel="manifest" href="/manifest.json">
```

Create `public/manifest.json`:
```json
{
  "name": "Manuals.ai",
  "short_name": "Manuals",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#F5F0E8",
  "theme_color": "#8B4513",
  "icons": [...]
}
```

### 3. User Login (Supabase)
- Sign up / sign in with email or Google
- Sync saved products across devices
- Required before subscriptions make sense
- Supabase free tier is sufficient for early stage

### 4. Rate Limiting (Free Tier)
Before going public, cap unauthenticated users to 3-5 guides/day to protect API costs. Can be done via Vercel KV (Redis) in `api/chat.js`.

### 5. Guide Caching
Cache generated guides by product name to avoid re-calling Claude for the same product. Saves ~80% API costs at scale. Use Vercel KV or Supabase.

### 6. Stripe Subscriptions (Web)
- Free: 5 guides/day, save up to 10 products
- Pro ($2.99/month or $24.99/year): unlimited guides, unlimited saves, offline, PDF export
- Use Stripe Checkout + webhooks to set user.isPro in Supabase

### 7. RevenueCat + In-App Purchase (Mobile)
When moving to React Native, use RevenueCat to unify Apple IAP + Google Play billing.

### 8. React Native Migration
- All API logic (`fetchProductGuide`, `identifyProductFromImage`) stays identical
- UI components need to be rewritten using React Native primitives
- localStorage → AsyncStorage
- Target: Expo managed workflow for easiest build/deploy

---

## Business Model

### Freemium Tiers
| Tier | Price | Features |
|---|---|---|
| Free | $0 | 5 guides/day, save 10 products, camera scan |
| Pro | $2.99/mo or $24.99/yr | Unlimited everything, offline, PDF export |
| Teams | $6.99/seat/mo | Shared library, admin dashboard, API access |

### Revenue Streams
1. Pro subscriptions (primary)
2. Amazon affiliate commissions (passive, already wired in)
3. Brand partnerships — verified official guides
4. White label widget for e-commerce stores ($49–99/month per merchant)

### Cost Structure
- Claude API: ~$0.01–0.015 per guide generated
- App Store: $99/year (Apple), $25 one-time (Google)
- Vercel: free tier sufficient until significant scale
- Apple/Google take 30% of all in-app purchases (drops to 15% after year 1)

---

## Known Issues / Gotchas

1. **allorigins.win reliability** — free public CORS proxy, can be slow or down. For production, replace with Firecrawl or ScrapingBee.

2. **No rate limiting** — currently anyone can hammer the API. Add rate limiting before sharing publicly.

3. **Single App.jsx file** — intentional for MVP simplicity. Split into components before React Native migration.

4. **Amazon affiliate tag not set** — `AFFILIATE_TAG = "YOUR-TAG-20"` is a placeholder. Replace with real tag from Amazon Associates.

5. **No error boundary** — if Claude returns malformed JSON, the app shows a generic error. Could be more graceful.

6. **Camera on desktop** — opens file picker instead of camera, which is correct behaviour. Works as intended.

---

## Deployment

- **Repo**: GitHub → `prasoonmishra1989/manuals-ai`
- **Hosting**: Vercel (auto-deploys on push to `main`)
- **URL**: your Vercel project URL
- **Env var**: `ANTHROPIC_API_KEY` set in Vercel dashboard

```bash
# Deploy a change
git add .
git commit -m "your message"
git push
# Vercel auto-deploys in ~30 seconds
```

---

## Key Decisions Made

| Decision | Reason |
|---|---|
| Web-first, not React Native | Validate idea before investing in native app |
| Vercel serverless proxy | No backend needed, free, handles CORS |
| Single App.jsx | MVP simplicity, easy to hand off |
| localStorage only | No backend/auth needed for MVP |
| allorigins.win | Free CORS proxy, good enough for MVP |
| Parchment theme | Fits the "manual / reference document" concept |
| $2.99/mo Pro price | Low enough for impulse buy, covers costs |
| Claude Sonnet | Best balance of quality and cost for guide generation |
