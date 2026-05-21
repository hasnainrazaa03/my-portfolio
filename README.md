# 🚀 Hasnain Raza — Portfolio v2.0

**The immersive digital mission control for an Aerospace-turned-AI Engineer.**

Most portfolios are static digital business cards — flat, text-heavy, and uninspired. This portfolio is different. It is an **engineered, interactive experience** designed to bridge the physical mechanics of **Aerospace Engineering** with the digital intelligence of **Artificial Intelligence**.

This site transforms a traditional resume into a **living, breathing application**.

**Live:** [hasnainrazaa.vercel.app](https://hasnainrazaa.vercel.app)

---

## 🧠 Why This Exists

As a graduate student in the **Scientists & Engineers program at USC**, my background isn't linear. I operate at the intersection of:

- **Complex Transitions** — Moving from Computational Fluid Dynamics (CFD) to Deep Learning
- **Dual Expertise** — Balancing physical engineering intuition with software architecture
- **Technical Depth** — A need to *show*, not just *tell*, my ability to build complex systems

This portfolio is intentionally **opinionated, high-performance, and immersive**, engineered to reflect a core duality:

> **Cosmos (Aerospace) × Code (AI)**

---

## 🛠️ Engineering Challenges (and Solutions)

### 1. The Contextual AI Chat Engine

Embedding an LLM into a portfolio introduces security, reliability, and UX challenges.

**The Problems**
- Exposed API keys when calling models directly from the browser
- CORS failures and cold-start latency with hosted inference endpoints
- Generic chatbot responses that don't reflect real experience

**The Solution — Dual-Provider Vercel Proxy with Hardened Server**

- Requests are routed through **Vercel Serverless Functions**, fully hiding credentials
- **Server-controlled LLM provider selection** (client cannot override):
  - Default: **HuggingFace Inference (Llama 3 8B)** — free tier, generous limits
  - Optional: **Google Gemini 2.0 Flash** — enable via `LLM_PROVIDER=gemini`
- **Per-IP rate limiting** — fixed-window in-memory limiter (10/min on `/api/chat`, 30/min on `/api/analytics`)
- **Input Sanitization & Prompt-Injection Defense**:
  - Unicode normalization (NFKC), zero-width character stripping, control-char removal
  - Suspicious-pattern detection (ignore/forget/jailbreak/reveal-prompt variants)
  - 500-char input cap and unbroken-token obfuscation detection
  - User text wrapped in `<<USER>>…<<END_USER>>` delimiters before reaching the model
- **Server-built system prompt** — the client cannot inject `context` or override the persona
- **Local Q&A Fuzzy Search**:
  - Offline-first fuzzy matching against `jarvisQnA.json` (50+ curated Q&A pairs)
  - Users can search locally or escalate to the live LLM with one click

Result: **Chat works 100% of the time — even if all external APIs fail.**

---

### 2. High-Performance 3D Visualization

3D web experiences are notorious for destroying mobile performance and Lighthouse scores.

**The Problem**  
Rendering complex Three.js scenes on low-power devices causes lag, layout thrashing, and battery drain.

**The Solution**
- **Conditional Rendering** — 3D Orbital Engine is gated to desktop viewports (`hidden md:block`)
- **Lazy Loading** — Heavy `Hero3D` component loaded via `React.lazy` and `Suspense`
- **Raycasting Optimization** — Scene rotates only during active mouse interaction using normalized coordinates

Result: **Near-instant First Contentful Paint (FCP)** with zero mobile performance penalties.

---

### 3. Responsive GitHub Heatmap

Standard GitHub contribution graphs are fixed-width and break mobile layouts.

**The Problem**  
`react-github-calendar` overflows horizontally on phones, harming UX.

**The Solution — Custom Data Transformation Layer**

- **Desktop** — Full 365-day contribution history
- **Mobile** — Automatically sliced to the last 5 months
- **Thematic Integration** — Custom color map enforces the site's **Teal (#2DD4BF)** palette

---

## 🤖 AI Chat Assistant

The chat system speaks in **first-person as Hasnain** — not a generic bot.

- **Dual LLM Providers** — HuggingFace Llama 3 8B (default) + Gemini 2.0 Flash (optional)
- **Server-side persona** — system prompt is hardcoded server-side; clients cannot inject context
- **Fuzzy Q&A Search** — Local `jarvisQnA.json` with token-overlap scoring and keyboard navigation
- **Demo Mode** — Plays a canned conversation showcasing chat capabilities
- **Reactor Core Launcher** — Icon-only floating button with microprocessor (CPU) icon, pulsing neon ring, and unread badge
- **Security** — NFKC normalization, prompt-injection detection, per-IP rate limiting, CORS allow-list
- **Accessibility** — `role="dialog"`, focus trap, Escape-to-close, focus restoration, `aria-live` transcript region

---

## 🚀 Feature Overview

### 🌌 Immersive Hero Section
- **3D Tech Core** — Rotating Icosahedron with orbital rings and particle fields (Three.js)
- **Interactive Tilt** — Mouse-driven parallax response
- **Resume Engine** — One-click resume download with instant visual feedback

### 👤 About Section
- **Circular Avatar** — Responsive portrait with decorative gradient glow ring accent
- **Hover Interactions** — Lift + neon ring reveal on hover
- **Animated Stats** — Count-up metrics triggered on scroll using Framer Motion

### 🔭 Dynamic Navigation
- **Rocket Scroll** — Scroll progress bar where a rocket physically flies across the screen
- **Animated Exhaust** — CSS-based fire effects
- **Glassmorphism UI** — `backdrop-blur-md` components supporting Dark & Light modes

### 💼 Projects
- **8 Projects** — AI/ML, Full-Stack Web, and Aerospace categories with thumbnail cards
- **Filter Tabs** — Category-based filtering with `useMemo` optimization
- **Modal View** — Image carousel, full description, tech stack badges, GitHub/demo links
- **Focus Trap** — Keyboard-accessible modal with escape-to-close

### 📊 Live Data Feeds
- **GitHub Integration** — Real-time commit and contribution data
- **Analytics Vault** — Supabase-backed interaction logging with in-chat analytics viewer

### ⚡ Technical Polish
- **ErrorBoundary** — Graceful error handling with user-friendly fallback UI
- **Scroll-to-Top Rocket** — Appears dynamically after scrolling
- **Contact System** — Serverless form using EmailJS with validation
- **Theme Engine** — Persisted Dark / Light modes:
  - *Deep Space* 🌑
  - *Clean Slate* ☀️

### 🧪 Testing
- **Vitest** — 64 passing tests across 10 test suites
- Coverage: chat persona, Q&A search, project filters, demo mode, about image, input sanitizer, rate limiter, IP hasher, chat service contract

---

## 💻 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite 7, Tailwind CSS 3 |
| Animations | Framer Motion, CSS Keyframes |
| 3D Engine | Three.js (WebGL) |
| AI Chat | HuggingFace Llama 3 8B (default), Google Gemini 2.0 Flash (optional) |
| Backend | Vercel Serverless Functions (Node.js) |
| Database | Supabase (analytics) |
| Testing | Vitest |
| Services | EmailJS, GitHub API |

---

## 🏁 Getting Started

### 1. Clone & Install
```bash
git clone https://github.com/hasnainrazaa03/my-portfolio.git
cd my-portfolio
npm install
```

### 2. Environment Setup

Create a `.env.local` file in the root directory:

```bash
# AI Chat — at least one LLM provider required
HUGGINGFACE_API_KEY="hf_your_token"                # default provider
GEMINI_API_KEY="your_gemini_key"                   # optional, if LLM_PROVIDER=gemini
LLM_PROVIDER="huggingface"                         # 'huggingface' (default) or 'gemini'

# CORS allow-list (comma-separated). Vercel preview deploys & localhost are auto-allowed.
ALLOWED_ORIGIN="https://your-domain.vercel.app"

# Rate limiting (optional overrides)
CHAT_RATE_LIMIT_MAX="10"
CHAT_RATE_LIMIT_WINDOW_MS="60000"

# Contact Form (EmailJS)
VITE_EMAILJS_SERVICE_ID="your_service_id"
VITE_EMAILJS_TEMPLATE_ID="your_template_id"
VITE_EMAILJS_PUBLIC_KEY="your_public_key"

# Analytics (Supabase)
SUPABASE_URL="your_supabase_url"
SUPABASE_SERVICE_KEY="your_service_key"
ANALYTICS_SECRET_TOKEN="your_admin_token"          # for the in-chat analytics viewer
ANALYTICS_IP_SALT="long_random_string"             # required for hashed-IP analytics

# Build flags
VITE_ENABLE_ADMIN="false"                          # set 'true' to include the analytics viewer in the bundle
```

### 3. Run Locally

Using **Vercel CLI** (recommended — runs frontend + serverless API):
```bash
vercel dev
```

Frontend-only mode:
```bash
npm run dev
```

### 4. Run Tests
```bash
npm test
```

---

## 📁 Project Structure

```
my-portfolio/
├── api/                     # Vercel Serverless Functions
│   ├── chat.js              # Dual LLM proxy (Gemini + HuggingFace)
│   └── analytics.js         # Supabase analytics logger
├── public/                  # Static assets (images, resume, icons)
├── src/
│   ├── components/          # React components
│   │   ├── Hero.jsx         # 3D hero section
│   │   ├── About.jsx        # Bio + circular portrait
│   │   ├── Chatbot.jsx      # Chat panel + integrations
│   │   ├── ChatLauncher.jsx # Icon-only floating button
│   │   ├── ChatDemo.jsx     # Canned demo conversation
│   │   ├── QnASearch.jsx    # Fuzzy local Q&A search
│   │   ├── Projects.jsx     # Filterable project grid
│   │   ├── ProjectCard.jsx  # Thumbnail project cards
│   │   ├── ProjectModal.jsx # Full project detail modal
│   │   ├── Contact.jsx      # EmailJS contact form
│   │   └── ...
│   ├── data/
│   │   ├── jarvisQnA.json   # 50+ curated Q&A pairs
│   │   └── chatDemo.json    # Demo conversation script
│   ├── services/            # API service layers
│   ├── hooks/               # Custom React hooks
│   ├── __tests__/           # Vitest test suites
│   ├── constants.js         # All site content (single source of truth)
│   └── App.jsx              # Root component
├── tailwind.config.js       # Extended theme (neon, glass tokens)
└── vite.config.js
```

---

## 🛰️ Design Philosophy

This portfolio is built like a **mission control dashboard**:
- Motion-driven, not decorative
- 3D used only where it adds meaning
- Every animation communicates state, intent, or hierarchy

It's designed to feel less like a website — and more like **a system**.

---

## 🔐 Security & Privacy

**Server-side defenses**
- Per-IP fixed-window rate limiting on `/api/chat` (10/min) and `/api/analytics` (30/min)
- Strict CORS allow-list: production origin + `*.vercel.app` previews + localhost
- Production headers (see [vercel.json](vercel.json)): HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Permissions-Policy`, `Referrer-Policy`, and a Content-Security-Policy in **Report-Only** mode pending observation
- All API responses carry a `requestId` for correlation; upstream errors are never leaked to clients
- Honeypot field + time-gate on the contact form to deter bots

**Prompt-injection defense**
- System prompt is hardcoded server-side — clients cannot inject `context`
- Client `provider` hint is ignored — provider is selected by env only
- User text is NFKC-normalized, stripped of zero-width / control chars, and capped at 500 chars
- Suspicious patterns (`ignore previous`, `jailbreak`, `reveal prompt`, …) are detected and refused
- User text is wrapped in `<<USER>>…<<END_USER>>` delimiters before reaching the model

**Privacy posture**
- Analytics never store raw `User-Agent` or `Referer`
- IPs are hashed server-side with SHA-256 + a per-deploy salt (`ANALYTICS_IP_SALT`)
- Admin analytics viewer is gated behind a build flag (`VITE_ENABLE_ADMIN`) and a backend-validated password kept in `sessionStorage`

**Reporting**
Found a vulnerability? See [SECURITY.md](SECURITY.md) (or `.well-known/security.txt`).

---

## 📜 Changelog

### 2026-05 — Audit Remediation (v2.1)

**Security**
- Rebuilt `/api/chat` with rate limiting, strict input sanitization, server-controlled provider, delimited user message, and shared CORS allow-list
- Added production security headers + CSP (Report-Only) in `vercel.json`
- Replaced `prompt()`-based admin auth with an inline password form backed by server-side validation; moved token to `sessionStorage`
- Honeypot + speed-gate spam protection on the contact form

**Privacy**
- Stopped collecting raw User-Agent / Referer from the client
- IPs are now SHA-256 hashed with a per-deploy salt before any storage

**Performance**
- Vite `manualChunks` splits `three`, `framer-motion`, `@supabase/supabase-js`, and `react-github-calendar` into separate cacheable chunks
- `Hero3D` respects `prefers-reduced-motion`, pauses rAF when offscreen via `IntersectionObserver`, and caps DPR at 1.5
- `SpaceBackground` skips its rAF loop entirely under reduced-motion
- `useActiveSection` consolidated to a single module-level scroll listener shared by all consumers

**Accessibility**
- Removed the hostile `useContentProtection` hook (blocked Ctrl+C / right-click)
- Removed the auto-rotating Projects carousel (WCAG 2.2.2)
- `ProjectModal`: real Tab-cycle focus trap, `aria-labelledby`, focus restoration on close
- `Chatbot`: `role="dialog"`, `aria-labelledby`, Escape-to-close, focus restoration

**Reliability**
- All IDs migrated to `crypto.randomUUID()` (deprecated `String#substr` removed)

**Testing**
- Test count grew from 34 → **64** across 10 suites
- New suites: `sanitize`, `rateLimit`, `hashIp`, real `chatService` coverage (incl. SECURITY regression that asserts request body never contains `context` or `provider`)

**Docs**
- Engineering audit checklist moved to a local-only `AUDIT_CHECKLIST.md` (gitignored)

---

**Hasnain Raza**  
Aerospace Engineer → AI Engineer  
USC · Los Angeles

---

*Built to explore the space between physics and intelligence.*

