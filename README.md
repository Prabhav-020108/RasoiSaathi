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
  1. **Tier 1 — Gemini API**: Configure `GEMINI_API_KEY` (via `.env` or Settings) for cloud NLP & translation.
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
```
