# 🍳 RasoiSaathi — Complete Product Idea, Vision & Solution Blueprint

> **"Her hands cook. We run the business."**  
> A voice-first, multilingual AI business companion built for women running home-based tiffin (meal delivery) services across India.

---

## 1. Executive Summary

Every morning across Indian cities, millions of women wake up at 5:30–6:30 AM to cook 20 to 80 home-cooked tiffins for students, bachelors, and working professionals. While their hands are covered in dough, oil, or spices, their WhatsApp overflows with customer updates—cancellations, skips, extra rotis, dietary switches, and payment screenshots—often in languages they cannot read.

**RasoiSaathi** sits beside the cook in her kitchen like a smart, trustworthy helper who speaks her mother tongue and understands every language her customers speak. Instead of forcing her to wash her hands, unlock her phone, read 40+ chats, and do mental arithmetic over three hot burners, RasoiSaathi lets her run her entire business by **speaking and listening**—in Hindi, Hinglish, English, Kannada, Tamil, Telugu, or Marathi.

---

## 2. The Problem We Are Solving

Home-based tiffin cooks do not suffer from a cooking bottleneck—they suffer from an **operations, mental-load, and language bottleneck**.

### 2.1 Three Everyday Pain Points

1. **Morning Order Chaos & Food Waste**
   - Between 6:00 AM and 8:30 AM, customers drop casual WhatsApp messages across individual chats and groups: *"Aunty aaj skip kardo"*, *"Please cancel tomorrow, office party"*, *"2 extra roti bhejna"*.
   - Because the cook's hands are wet or flour-covered and her eyes are on the stove, she misses updates or miscounts. Cooking even 3–4 extra unclaimed tiffins wastes hundreds of rupees in ingredients and fuel every morning.

2. **Month-End Payment Leakage**
   - Most tiffin services track monthly ₹2,500–₹3,500 subscriptions in memory or scattered UPI screenshots buried inside WhatsApp chats.
   - At month-end, tracking who paid, who paid partially, and who is overdue becomes awkward and error-prone. Missing even 2–3 payments per month drains **15–20% of a cook's monthly income**.

3. **The Language Wall & Growth Ceiling**
   - In cosmopolitan cities like Bengaluru, Pune, Hyderabad, Chennai, or Mumbai, a local cook speaking Kannada, Marathi, Tamil, or Telugu serves migrant students and IT professionals texting in Hindi, Hinglish, or English.
   - Misreading one English message means wasted food; avoiding out-of-state customers means turning away revenue.
   - Consequently, most home cooks hit a **hard ceiling at 25–30 customers**—not because their kitchen is full, but because managing any more in their head breaks down.

### 2.2 Market Scale & Grounded Facts

- **7.9 crore unincorporated enterprises** exist in India, with **27% owned by women**, and **over 60% of informal manufacturing (including food preparation) led by women** (*MoSPI ASUSE 2025 Survey*).
- Roughly **5 to 10 million women** run home-based food and tiffin services across Tier 1–3 Indian cities, within a home-cooked/tiffin meal market estimated at **₹15,000–₹20,000 crore**.
- **78.2 million tonnes of household food waste** occurs annually in India—second highest globally (*UNEP Food Waste Index 2024*). Smarter daily tallying directly prevents avoidable overcooking.
- Micro enterprises face **payment delays 3× worse than larger businesses**, with over **₹7 lakh crore** locked in delayed receivables nationwide (*GAME & FISME Delayed Payments Report*).

---

## 3. Target Users & Personas

### 3.1 Primary User — The Home Tiffin Entrepreneur (*"Sunita Didi" / "Lakshmi Akka"*)
- **Demographics:** Woman aged 28–55, cooking 20–80 tiffins/day from her home kitchen on a mid-range Android smartphone (Chrome browser).
- **Communication Style:** Speaks fluently in her regional mother tongue (Hindi, Kannada, Tamil, Telugu, Marathi, etc.), naturally mixing English keywords like *"cancel"*, *"skip"*, *"extra"*, *"pause"*, *"Jain"*, and *"payment"*.
- **Environment:** Noisy kitchen (pressure cookers, mixer-grinders, sizzling tadka, exhaust fan), messy/wet hands, bright or uneven kitchen lighting, variable mobile connectivity.
- **Tech Comfort:** Uses WhatsApp voice notes and calls daily, avoids typing or navigating complex multi-screen enterprise apps.

### 3.2 Secondary Users — Tiffin Subscribers
- **Demographics:** College students, PG residents, bachelors, and working professionals aged 20–40.
- **Communication Style:** Text or send voice notes on WhatsApp in English, Hindi, Hinglish, Kannada, Tamil, or Telugu with quick last-minute meal changes and UPI payments.

---

## 4. Why Voice-First Is Mandatory (Not Optional)

A traditional dashboard-first SaaS app fails in a home kitchen for six concrete reasons:

1. **Occupied Hands:** Dough, oil, water, and spices are on her hands for 4–5 consecutive morning hours.
2. **Divided Eyes:** Eyes stay on boiling milk, dal, and hot rotis—not tiny spreadsheets.
3. **Speed Under Pressure:** Speaking *"Aaj kitne tiffin banane hain?"* takes 2 seconds; opening an app, counting active rows, and subtracting skips takes minutes.
4. **Natural Behavior:** She already coordinates with family, delivery helpers, and callers entirely by voice.
5. **Cross-Language Comprehension:** Even if she cannot read an English or Telugu script message, she can *hear* a crisp voice announcement translated into her mother tongue.
6. **Zero Learning Curve:** No forms to memorize—just ask or command naturally.

---

## 5. How We Imagined the Solution Working (End-to-End Lifecycle)

We designed RasoiSaathi around a full day-to-month workflow in a kitchen:

### Step 1: Zero-Friction Start & Multilingual Onboarding
- The cook opens RasoiSaathi on her phone (or installs it as a PWA on her home screen).
- She chooses her preferred language (`hi`, `en`, `kn`, `ta`, `te`, `mr`). Every label, tally card, voice response, and spoken confirmation adapts to her chosen language.
- A pre-seeded kitchen profile (or her own customer list added by voice or tap) is immediately ready—no intimidating login walls or mandatory API keys blocking first-time use.

### Step 2: The Morning Prep Brief (Daily Order Tally)
- At 6:30 AM while starting breakfast/lunch prep, she taps the floating mic button and asks:  
  **"Aaj kitne tiffin banane hain?"** *(or "How many tiffins today?" / "Aaj kitne Jain tiffin hain?")*
- RasoiSaathi checks active subscribers, filters out customers marked `paused` or `cancelled`, subtracts today's `skipped` or day-cancelled entries, counts `extra` requests, groups by dietary preference (`Regular`, `Jain`, `Less-oil`, `No-onion-garlic`), and **speaks the complete plan aloud**:  
  > *"Aaj total 8 tiffin banane hain: 4 regular, 2 Jain, 1 less-oil, 1 no-onion-garlic. 1 skip aur 1 paused hai. Extra order: Pooja (2 extra roti)."*
- If everyone cancels on a holiday, it cheers her up: *"Aaj chutti hai didi! Koi tiffin nahi banana hai."*

### Step 3: Live Customer Changes by Voice
- While stirring sabzi, a customer calls to say he is out of town or wants extra food. She tells RasoiSaathi without stopping work:
  - *"Amit aaj skip kardo"* → Marks Amit skipped for today and recalculates tally.
  - *"Meena ko 3 din ke liye pause kardo"* → Sets Meena `paused` with an automatic `pauseUntil` date.
  - *"Meena ko resume kardo"* → Reactivates Meena immediately and clears any skip for today.
  - *"Pooja ko 2 extra roti add kardo"* → Logs extra items onto Pooja's `DailyOrder` so they are read aloud in the tally.
  - *"Rajesh ka khana Jain kardo"* → Updates dietary preference immediately.
  - *"Naya customer jodo, naam Vikram, Jain khana, monthly 3000"* → Creates customer + initial month payment record.
- **Ambiguity Safety:** If she has two customers named "Rajesh", RasoiSaathi never guesses blindly. It replies with phone last-4-digit chips (`Rajesh Kumar (0001)`) so she can tap or say the last 4 digits.

### Step 4: The Multilingual WhatsApp Inbox Bridge
- Customer messages arrive in any language (simulated in the prototype inbox, ready for WhatsApp Business webhook integration in production):
  - **Sarah (English):** *"Please skip tomorrow, I have an office party"*
  - **Pooja (Telugu):** *"Rendi extra roti pack cheyyandi"*
  - **Amit (Hindi):** *"Aunty aaj skip kardo, office mein party hai"*
- When processed:
  1. RasoiSaathi detects the intent (`skip`, `cancel`, `pause`, `resume`, `extra`, `diet_change`, `payment`, `greeting`).
  2. Translates foreign-language customer texts into the cook's language so she understands what was asked.
  3. Automatically executes the database update (updating today/tomorrow's tally).
  4. Generates a polite, warm **auto-reply in the customer's own language** (e.g., *"Theek hai! Aaj ka tiffin band kar diya. 🙏"* or *"Noted your extra tiffin request! 🍱"*).

### Step 5: Month-End Payment Tracking & Recovery
- At month-end, instead of digging through screenshots, she asks:  
  **"Kisne payment nahi kiya?"** *(or checks the Payments tab)*.
- RasoiSaathi speaks the exact total pending and lists the customers and amounts owed.
- With one tap (or voice command), she marks cash/UPI receipts as **Paid** (or records partial payments) and generates polite multilingual reminder previews.

### Step 6: One-Voice Menu Broadcast
- Every evening she thinks of tomorrow's menu, taps the mic on the **Menu** screen, and dictates:  
  *"Dal tadka, jeera rice, aloo sabzi, salad, papad"* (+ one-tap **Jain Note** toggle: *"Jain version: without onion-garlic, with extra paneer"*).
- RasoiSaathi detects every unique language across her active subscribers and creates ready-to-share **WhatsApp preview bubbles** in Hindi, English, Kannada, Tamil, Telugu, and Marathi, with one-tap **Copy** and **Mark Sent** history tracking.

---

## 6. Feature Breakdown: Current Prototype vs. Full Product Vision

### 6.1 Core Features (Built & Working in Prototype)

| ID | Feature | What It Does Today |
|----|---------|--------------------|
| **F1** | **Voice-First Dashboard** | Live daily tiffin tally card with dietary breakdown, spoken readout button, pending payment & unread message summary cards, recent updates feed, quick-action shortcuts, and an always-reachable floating mic button. |
| **F2** | **Voice Conversation Console** | Continuous conversational UI (`/voice`) with live waveform animation, elapsed listening timer, interim transcripts, quick suggestion chips, disambiguation chips for duplicate names, text input fallback, and hands-free TTS voice replies. |
| **F3** | **Customer & Subscription Manager** | Full CRUD (`/customers` & `/customers/[id]`): search/filter (`Active`, `Paused`, `Cancelled`), add/edit dietary preferences (`Regular`, `Jain`, `Less-oil`, `No-onion-garlic`), pause/resume/cancel actions, monthly pricing, and automatic tally recalculation. |
| **F4** | **Daily Order Tally Engine** | Real-time calculation (`src/lib/tally.ts`) accounting for active status, `pauseUntil` windows, daily skips/cancellations, tomorrow lookups, and extra item requests. |
| **F5** | **Monthly Payment Tracker** | Collected vs. pending overview (`/payments`), per-customer month status (`Paid`, `Pending`, `Partial`), one-tap "Mark Paid", voice query support (`"Kisne payment nahi kiya?"`), and spoken summary readout. |
| **F6** | **Multilingual WhatsApp Inbox & Simulator** | Interactive inbox (`/messages`) with message simulation (`senderName`, `text`, `language`), one-tap `⚡ Process` AI pipeline, intent tagging, translation box, DB auto-updates, suggested auto-replies, and collapsible processed cards. |
| **F7** | **Voice Menu Broadcast** | Dictate or type tomorrow's menu (`/menu`), toggle Jain adaptation note, auto-translate into every active customer's language with copyable WhatsApp bubbles, and track past broadcasts (`Draft` / `Sent`). |
| **F8** | **Zero-Key Three-Tier AI + PWA** | Works out-of-the-box via Docker with no secret keys, offers Gemini Cloud AI, in-browser Local AI (`@runanywhere/web`), or instant Basic Mode, supports 5 full UI locales (`hi`, `en`, `kn`, `ta`, `te` + `mr` voice/translation), demo data reset, and JSON export. |

### 6.2 Planned Extension Roadmap (Post-Hackathon / Finale Version)

| Extension | How We Imagine It Working in Production |
|-----------|------------------------------------------|
| **WhatsApp Business API Webhook (Gupshup / WATI)** | Replace the simulated inbox with real two-way WhatsApp messaging, incoming voice-note audio transcription, and automated delivery of confirmations, reminders, and daily menus. |
| **Wake-Word & Hands-Free Loop** | Always-on lightweight wake-word detection (*"RasoiSaathi"*) paired with kitchen noise suppression so the cook never needs to touch the mic button mid-cooking. |
| **Real UPI Deep Links & Payment Verification** | Attach clickable `upi://pay?...` payment links inside automated WhatsApp reminders and match incoming payment confirmations/screenshots to clear dues automatically. |
| **Smart Ingredient & Prep Estimator** | Convert tomorrow's final tally + menu into exact kitchen quantities (e.g., *"26 tiffins = 3.5 kg atta, 1.5 kg toor dal, 500g paneer"*), reducing over-buying and prep guesswork. |
| **Delivery Route & Dabba Return Tracker** | Group customers by building/PG/office tower for delivery boys and track empty steel dabba boxes awaiting return. |
| **Customer Self-Serve Mini-Link** | Optional lightweight web link per customer to tap "Skip tomorrow" or pay dues without needing a message thread. |
| **Voice-Guided First-Run Onboarding** | Step-by-step conversational wizard that walks a first-time cook through naming her first 5 customers and default pricing completely by voice. |

---

## 7. Architecture & The Three-Tier AI Fallback Strategy

### 7.1 Technical Stack
- **Frontend & Backend:** Next.js 14 (App Router, `output: 'standalone'`), TypeScript, Tailwind CSS, SWR, Lucide Icons.
- **Database:** SQLite via Prisma ORM (`Cook`, `Customer`, `DailyOrder`, `Payment`, `Message`, `MenuBroadcast`) — single-container, zero external DB setup, seamlessly migratable to PostgreSQL later.
- **Voice I/O:** Browser-native Web Speech API (`SpeechRecognition` + `speechSynthesis`) tuned for `hi-IN`, `en-IN`, `kn-IN`, `ta-IN`, `te-IN`, and `mr-IN`.
- **Packaging:** Multi-stage `node:22-alpine` Docker container + `docker-compose.yml` with persistent SQLite volume and auto-migration/seeding entrypoint.

### 7.2 Three-Tier AI System (Designed So Evaluators & Cooks Are Never Blocked)

A major design constraint was ensuring the app starts cleanly from a public GitHub clone **with zero API keys**, while still showcasing real AI capabilities:

```text
App Starts
  │
  ├── Gemini API Key Configured? (Server .env OR User Settings in localStorage)
  │     └── YES ──▶ Tier 1: Gemini Cloud AI
  │                 Best accuracy for Hinglish/regional code-switching, nuanced
  │                 entity extraction, natural spoken replies, & full translation.
  │
  └── NO Key Configured ──▶ Friendly Setup Modal Offers Choice:
        │
        ├── Option A ──▶ Tier 2: Local AI (@runanywhere/web + LlamaCPP WASM/WebGPU)
        │                Downloads SmolLM2-360M-Instruct GGUF into browser OPFS once.
        │                Runs 100% on-device via WebGPU/WASM — private & offline.
        │
        ├── Option B ──▶ Enter Free Google AI Studio Gemini Key (saved locally)
        │
        └── Option C ──▶ Tier 3: Basic Mode (Rule-Based Keyword Engine)
                         Instant Hinglish/English regex & entity parser, full CRUD,
                         action execution, and safe canned multilingual replies.
```

To support RunAnywhere's `SharedArrayBuffer` WASM runtime cleanly across browsers, Next.js serves `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: credentialless` headers along with bundled runtime WASM assets under `/wasm/`.

---

## 8. Edge Cases & Kitchen Reliability Design

| Scenario | Planned & Implemented Solution |
|----------|--------------------------------|
| **Duplicate customer names** | Matches narrow automatically if the user includes the last 4 phone digits (e.g., *"Rajesh 0001"*); otherwise RasoiSaathi returns disambiguation chips and speaks *"Rajesh kaunsa?"* instead of modifying the wrong person. |
| **Kitchen background noise / low confidence** | Voice hook tracks recognition confidence, cancels stale recognition listeners safely on restart, and prompts gently when speech isn't heard after a 6.5s silence timeout. |
| **Browser without Web Speech API (e.g. Firefox)** | Displays a clear non-blocking hint recommending Chrome/Edge while keeping the full text command bar and tap UI operational. |
| **Code-switching (Hinglish & mixed sentences)** | Both Gemini prompts and Tier-3 fallback rules extract intents across mixed phrasing (*"Pooja ko 2 extra roti"*, *"Amit aaj skip kardo"*, *"Cancel Priya tomorrow"*). |
| **Holiday / zero active tiffins** | Tally detects `0` active tiffins cleanly and announces a cheerful holiday message rather than an awkward empty state. |
| **Paused duration across days** | Customers marked `paused` carry a `pauseUntil` timestamp evaluated dynamically during tally computation; `resume` clears both `pauseUntil` and same-day skips. |
| **Already-paid or invalid payloads** | API routes validate dates, amounts, and duplicate-paid states cleanly with descriptive status codes and non-destructive error banners. |
| **Missing Gemini key on translation/menu** | Never crashes: menu previews append `(Original - translate with Gemini API)` and inbox auto-replies fall back to localized intent templates. |

---

## 9. UI/UX Philosophy: Built for 6:30 AM Kitchens

- **Mobile-First Frame:** Engineered for **360px smartphone viewports** with zero horizontal scroll; desktop evaluators automatically see a centered **phone-frame simulation** so mobile ergonomics are immediately clear.
- **Saffron & Violet Visual System:** Warm off-white background (`#FFF7ED`), energetic saffron highlights (`#F97316`), interactive violet controls (`#7C3AED`), and universal semantic badges (green = active/paid, yellow = paused, red = pending/cancel, blue/teal = AI info/reply).
- **Kitchen Ergonomics:**
  - Minimum **48×48px** buttons and inputs for wet or flour-dusted hands.
  - Prominent **floating bottom-center microphone button** reachable with one thumb on every primary screen.
  - **PWA ready** (`public/manifest.json` + standalone display mode) so cooks can pin RasoiSaathi to their Android home screen like a native app.

---

## 10. Success Metrics, Impact Targets & Key Risks

### 10.1 How We Measure Success
1. **Food Waste Reduction:** **≥ 30% drop** in daily wasted/overcooked tiffins per cook within the first month via accurate morning tallies.
2. **Payment Recovery:** Measurable drop in unpaid/overdue monthly balances within **two billing cycles** using clear pending tracking and automated reminders.
3. **Business Growth:** Help home cooks break past the mental ceiling—scaling average active subscribers from **~25 to 40+ within three months** by removing the language and admin barrier.

### 10.2 Main Risk & Mitigation
- **Risk — First-Time App Onboarding Friction:** Many home cooks are unfamiliar with installing or setting up productivity apps, even voice-first ones, and could drop off before experiencing value.
- **Mitigation:** Pre-populated visual clarity, minimal taps (5 bottom tabs + 1 big mic), native-language UI, guided voice prompts, and community-led word-of-mouth onboarding through Self-Help Groups (SHGs) and neighborhood peers.
- **Dependency Risk Mitigation:** Cloud LLM dependency (`Gemini API`) is cushioned by on-device Local AI (`RunAnywhere`) and deterministic keyword fallbacks; browser STT dependency degrades gracefully to typed commands and future server-side/Sarvam AI speech models.
