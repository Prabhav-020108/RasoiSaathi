# 🍳 RasoiSaathi

**Voice-first AI business manager for home-based tiffin services in India.**

RasoiSaathi lets home cooks manage daily order tallies, customer subscriptions, dietary preferences, monthly payments, WhatsApp updates, and menu broadcasts — designed **mobile-first** as an installable PWA (with a centered phone-frame preview on desktop).

---

## ✨ Key Features

- **Voice-First Kitchen Companion**: Prominent floating mic button, conversational UI, and multilingual support (`Hindi`, `English`, `Kannada`, `Tamil`, `Telugu`, `Marathi`).
- **Real-Time Daily Tally**: Auto-calculates today's tiffins with dietary breakdown (`Regular`, `Jain`, `Less-oil`, `No-onion-garlic`), skips, pauses, and extra requests.
- **Customer & Subscription CRUD**: Search, filter, add, edit, pause/resume, and cancel customer subscriptions.
- **Payment Tracker**: Track collected vs. pending monthly payments and mark paid with one tap.
- **Three-Tier AI Fallback (No Secret Key Required)**:
  1. **Tier 1 — Gemini API**: Configure `GEMINI_API_KEY` on the server (local `.env` or hosting environment) for cloud NLP & translation.
  2. **Tier 2 — Local AI (RunAnywhere)**: Optional on-device browser inference.
  3. **Tier 3 — Basic Mode**: Rule-based keyword matching + full local SQLite CRUD with zero external API keys.

---

## 🚀 Quick Start with Docker (Recommended)

Runs out of the box with pre-seeded demo data (1 cook, 10 customers, payments, and 5 sample WhatsApp messages) — **no API keys required**.

```bash
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

To optionally enable Gemini AI:
```bash
GEMINI_API_KEY=your_key_here docker compose up --build
```

---

## 🛠️ Local Development

Use Node.js 22 (matching Docker and `.nvmrc`).

```bash
# 1. Install dependencies
npm install

# 2. Copy environment template (optional GEMINI_API_KEY)
cp .env.example .env

# 3. Initialize SQLite database & seed demo data
npx prisma generate
npx prisma db push
npx prisma db seed

# 4. Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Verification Commands

```bash
npm run typecheck
npm run lint
npm test
npm run build
node scripts/e2e-verify.mjs --no-cloud
npm run test:browser
node scripts/verify-docker.mjs
```

## Voice controls and AI configuration

For hands-free mobile use, tap **Start Kitchen Mode** once and keep the app visible. Say **RasoiSaathi**, then say the command after the listening cue. You can also say the name and command together. Say **stop kitchen mode** to end the session. The phone needs a secure origin, microphone permission and speech support. See the [kitchen roadmap and phone rehearsal](KITCHEN-ROADMAP.md).

New simulated messages are announced during a pause. The cook can approve the proposed update, defer it, or dictate a reply. The inbox keeps the original text and presents the cook-language translation when available. Replies and menu approval use simulated delivery.

Press **M** from any main screen to open the voice console and start listening, or tap the floating mic. On the voice screen, **M** starts/stops listening; **Escape** cancels listening and speech. The shortcut is ignored while typing or using a dialog. Allow microphone access in Chrome/Edge on localhost or HTTPS.

Final speech is transcribed, processed, applied to SQLite, reflected in the dashboard, and answered aloud. Try:

- `Aaj kitne tiffin banane hain?`
- `Skip Priya today` / `Meena ko resume kardo`
- `Pooja ko 2 extra roti`
- `Priya ka payment aa gaya` (records the full monthly payment)
- `Kal ka menu: dal tadka, rice, roti` (saves tomorrow's menu draft)

Ambiguous names require a candidate selection or the last four phone digits. Unfinished or failed recognition does not execute commands. Browser speech recognition may require internet; voice quality and available TTS languages depend on the browser/device. This prototype uses tap/M activation, with always-on wake-word detection deferred.

Gemini activates automatically when the server key is configured, even if Basic Mode was selected earlier. No key is entered or stored in the app; legacy browser-stored keys are removed. Without a server key, the app displays its unavailable status and supports Basic Mode or optional Local AI. WhatsApp sending remains simulated.

## Browser regression tests

```bash
npm run build
npm run test:browser
```

Install Chromium for Playwright once if needed: `npx playwright install chromium`. Tests run at 360×740 against a separate `prisma/browser-test.db`, with no Gemini key. They inject speech events and TTS to verify browser controls and actual database changes; live microphone accuracy still needs manual testing.

The API verification uses `prisma/api-test.db`. To opt into one live Gemini voice request using only seeded demo data and the local server key, run `node scripts/e2e-verify.mjs --cloud`.

Docker verification creates its own Compose project on port 3012 and removes only that project's test containers and volume afterward. It checks no-key startup, seeding, voice updates, menu saving, and persistence after restart.
