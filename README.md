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

**The Solution — Multi-Provider Vercel Proxy with Hardened Server**

- Requests are routed through **Vercel Serverless Functions**, fully hiding credentials
- **Server-controlled provider chain** (client cannot override provider or model).
  `LLM_CHAIN` defines an ordered fallback list; each provider is tried in turn and
  the first success wins. Default `anthropic,gemini,huggingface`:
  - **Anthropic Claude** (`ANTHROPIC_MODEL`, default `claude-sonnet-5`) — primary
  - **Google Gemini Flash** (`GEMINI_MODEL`, default `gemini-2.5-flash`) — free-tier fallback
  - **HuggingFace Inference** (`HF_MODEL`, default Llama 3 8B) — last resort
  - Providers with no API key configured are skipped, so a deploy that sets only
    `GEMINI_API_KEY` runs Gemini-first with zero code changes
  - If every provider fails, the client falls back to canned local responses
- **Conversation memory** — the last 10 turns are sent and re-validated server-side,
  so follow-up questions resolve against context
- **Per-IP rate limiting** — durable across serverless instances via Upstash Redis, falling back to a per-instance limiter if Redis is unreachable (10/min on `/api/chat`, 3 per 10 min on `/api/fit`). `/api/analytics` is not rate limited; it is admin-only behind a timing-safe token check
- **Input Sanitization & Prompt-Injection Defense**:
  - Unicode normalization (NFKC), zero-width character stripping, control-char removal
  - Suspicious-pattern detection (ignore/forget/jailbreak/reveal-prompt variants)
  - 500-char input cap and unbroken-token obfuscation detection
  - User text wrapped in `<<USER>>…<<END_USER>>` delimiters before reaching the model
- **Server-built system prompt** — the client cannot inject `context` or override the persona
- **Curated career knowledge** — the system prompt is built from `constants.ts` plus a claim-checked corpus derived from private master documents, including what must never be claimed
- **Local Q&A search**:
  - TF-IDF matching over ~140 curated and generated answers (`jarvisQnA.json` + `qnaBank.generated.ts`)
  - Search locally, or escalate to the live model in one click

Result: **when every provider is down, the chat still answers from the local bank** rather than showing an error.

---

### 2. The Hero: Flow Around an Airfoil, and a Network That Learns It

The hero used to be a wireframe icosahedron with rings — a 127 KB three.js chunk that said "tech" and nothing else.

Nothing in it runs until the visitor presses **Start**: the card first shows a still preview behind a soft blur with three lines of instructions, so a visitor who only wants to read the page pays nothing for particles, training or the solver.

**The Idea**  
One interaction that tells the whole story: *move the airfoil, generate physics, watch AI learn.* The picture is potential flow around a Joukowski airfoil (`src/utils/potentialFlow.ts`), drawn live from its closed form; dragging pitches it, the streamlines follow, and Kutta–Joukowski gives the lift. Beside it a six-unit neural network learns α → lift from that physics by gradient descent, in the visitor's browser. It is labelled an **ideal-flow model** on screen and is not a CFD result.

**The story, as shown**  
A heading says what to do ("Teach a neural network to predict lift · Drag the airfoil to change its angle"). Two cards give the two answers — Physics: lift and angle; AI prediction: lift and error — and a small chart shows the model's line moving onto the physics' line. Training runs in three visible phases: samples appear and leave the trailing edge for the network, then *Learning…* one gradient step per frame (about ten seconds), then *Model trained ✓* with one gentle pulse. Retrain starts over from a new seed. At the top of the range the physics card says a real wing would be near stall, which the ideal model does not know. A one-line disclosure answers the question a technical visitor will ask — why a network for a relationship this simple — with the honest reason: it is simple enough to train live, and aerospace surrogate models use the same idea for simulations that take hours. The whole card fits one laptop viewport under the navigation.

**How**
- **Closed-form physics, tested against theory** — far field is the freestream, the surface is a streamline, the trailing edge is finite (Kutta), lift slope ≈ 2π; a sign slip fails a test
- **Canvas 2D, 12 KB** — particles are advected in the ζ-plane (where the airfoil is a circle they cannot enter) and only their drawn position is mapped; streaks are coloured by speed
- **Mount gating, not CSS hiding** — the full experiment mounts at desktop widths only; phones mount the compact version, which never creates a canvas or a Worker
- **Degrades to the same picture** — under `prefers-reduced-motion`, Save-Data, or with no 2D context, a static SVG of the same streamlines is drawn instead, inside a local error boundary so nothing can blank the page
- **Keyboard and touch** — the picture is an ARIA slider for the angle of attack (drag, arrow keys, Home/End); phones get a simplified version with a range input and the two answers, no diagram or chart
- **The network** — `src/utils/surrogate.ts` is plain arrays, no dependency, deterministic from a seed; every edge in the diagram is a weight and every hidden node lights with its activation for the chosen angle. Tests assert convergence from every seed it can start from
- **Still modes show the finished state** — under `prefers-reduced-motion`, Save-Data, or with no 2D context, the model is trained synchronously and the visitor sees the trained result with a slider, not a spinner

**Viscous flow — the physics the ideal model cannot see**  
A segmented control switches the same card to a D2Q9 lattice-Boltzmann solver (`src/lab/flow`: BGK collision, half-way bounce-back, momentum-exchange forces, a Smagorinsky sub-grid model for the turbulent settings) around a NACA 4412 — the section from the CFD study on this site — on a 256×104 lattice in a Web Worker, painted as vorticity. Reynolds number (20–5000) and angle are set by slider, number or drag; separation and vortex shedding appear on screen, and drag is reported beside lift. The network now learns from *measurements*: once the solver has held an angle for 800 steps, that angle's lift becomes a training point, so the model's curve is built from what the solver actually produced, and the ideal curve stays on the chart as a faint reference — the gap past 12° is the stall. If a setting diverges the solver restarts itself and says which knob to turn. Frames are transferred buffers, not copies; the Worker stops when the tab is hidden or the card leaves the viewport; the solver has its own unit tests (equilibrium, uniform stream, cylinder drag, shedding at Re 160, camber lift, LES effect).

---

### 3. Live GitHub Activity

**The Problem**
Calling the GitHub API from the browser spends a 60-requests-per-hour anonymous quota shared by every visitor behind the same network, and fails loudly when it runs out.

**The Solution**
- **Cached proxy** — `/api/github` fetches events server-side (with `GITHUB_TOKEN` when set), caches them, and serves the last good copy if GitHub is unavailable. It also returns the repositories pushed in the last 30 days with their commits, because public event payloads no longer carry commit messages — so "Recent Commits" shows real commit lines with links, not "pushed to main"
- **Contribution calendar** — the last year via `react-github-calendar`, coloured in the site's teal ramp for both themes; blocks are sized to the card so the year fits without horizontal scrolling, and when it cannot fit the strip opens at the most recent weeks
- **Live chat answers** — a question about recent work ("what is he building this week?") makes the chat fetch the public repositories pushed in the last 14 days and their commits from the last 7 (`api/_lib/githubActivity.ts`), passed to the model as delimited data in the visitor's turn so the cached system prompt never changes. The events feed is not used for this: GitHub's public event payloads no longer carry commit messages

---

## 🤖 AI Chat Assistant

The chat system speaks in **first-person as Hasnain** — not a generic bot.

- **Provider chain** — Anthropic Claude (primary), Google Gemini, then Hugging Face, first success wins
- **Streaming** — replies stream over SSE, capped at three sentences as they arrive, so nothing painted is ever taken back
- **Source chips** — each answer links to the page sections backing it, and to a project's case study (in a new tab, so the conversation survives) when the answer names one; derived server-side, so the model never emits a URL it could invent
- **Live GitHub answers** — questions about recent work are answered from GitHub fetched at question time (cached 10 minutes; says so plainly when GitHub is unreachable)
- **Job-description hand-off** — a pasted posting is not sent to the model; the chat offers to compare it on `/fit`, which opens pre-filled
- **Server-side persona** — system prompt is hardcoded server-side; clients cannot inject context
- **Persona switcher** — server-side allow-list (`default` / `recruiter` / `aerospace` / `startup`) with a UI dropdown in the chatbot header
- **Voice input** — mic button (Web Speech API) with inline error surfacing for `not-allowed` / `no-speech` / `audio-capture` / `network`
- **Voice replies (TTS)** — opt-in speaker toggle reads assistant messages aloud via `SpeechSynthesis`
- **Semantic Q&A search** — TF-IDF + bigram + cosine ranking over `jarvisQnA.json` with keyboard navigation
- **Conversational memory** — the last 10 turns are sent with each request and re-validated server-side (held in component state, not persisted)
- **Demo Mode** — Plays a canned conversation showcasing chat capabilities
- **Reactor Core Launcher** — Icon-only floating button with microprocessor (CPU) icon, pulsing neon ring, and unread badge
- **Security** — NFKC normalization, prompt-injection detection, per-IP rate limiting, CORS allow-list
- **Accessibility** — `role="dialog"`, focus trap, Escape-to-close, focus restoration, `aria-live` transcript region

---

## 🚀 Feature Overview

### 🌌 Immersive Hero Section
- **Live aerospace × AI experiment** — drag an airfoil in ideal flow, or switch to viscous flow: a D2Q9 lattice-Boltzmann solver in a Web Worker (`src/lab/flow`) with a Smagorinsky turbulence model, Reynolds-number and angle controls, separation and vortex shedding on screen, and a small neural network that learns the lift curve from whichever physics is running — in viscous mode from the lift the solver measures at each angle you hold. Gated behind a Start button: nothing runs until asked
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
- **9 Projects** — AI/ML, Full-Stack Web, and Aerospace categories with thumbnail cards
- **Case studies** — `/projects/<slug>` pages with their own heads, social cards and schema.org JSON-LD (`SoftwareSourceCode` or `CreativeWork`, plus breadcrumbs)
- **How it works** — runtime diagrams for Vimaan, Manzil Recipe Vault and Orbit Expense Tracker, each authored from the project's code or master document
- **Lift-curve explorer** — the NACA 4412 study carries an interactive thin-airfoil-theory plot, labelled as a textbook model rather than the study's CFD results
- **Filter Tabs** — Category-based filtering with `useMemo` optimization
- **Modal View** — Image carousel, full description, tech stack badges, GitHub/demo links
- **Focus Trap** — Keyboard-accessible modal with escape-to-close

### 📊 Live Data Feeds
- **GitHub Integration** — Real-time commit and contribution data
- **Visitor insights** — `/insights` (noindex, token-gated) charts what visitors ask, aggregated server-side with emails and phone numbers redacted

### ⚡ Technical Polish
- **ErrorBoundary** — Graceful error handling with user-friendly fallback UI
- **Scroll-to-Top Rocket** — Appears dynamically after scrolling
- **Contact System** — Serverless form using EmailJS with validation
- **Cursor Thruster Glow** — Soft radial light follows the pointer on desktop; auto-disables on touch + reduced-motion
- **Konami Easter Egg** — ↑↑↓↓←→←→BA unlocks a cockpit overlay
- **Now Snapshot** — Live status block on the About section sourced from `constants.NOW`
- **Print-to-PDF Resume** — Standalone `/resume` route, print-optimised, with a **plain-text (ATS) view** at `?view=ats`: one column, standard section names, full profile URLs as text, complete tech stacks. Both views render from one data module so they cannot disagree
- **How it works** — case studies can carry a runtime diagram (`architecture` in constants.ts): execution contexts as lanes, labelled arrows, and each guard's condition and outcome. Vimaan's is authored from its master document
- **Career arc** — every role and degree since 2018 on one to-scale time axis, coloured by field, with hover/focus details and a table view; dates parse strictly from the same `period` strings the rest of the site renders
- **Installable, and works offline** — web manifest, maskable icons and launcher shortcuts; a generated service worker precaches the shell and runtime-caches the rest, so a previously visited page (chat Q&A included) still opens with no network
- **Compare a role** — `/fit` takes a pasted job description and returns what the record supports, what it doesn't, and a link to the work behind each claim. Every match is validated server-side against a fixed list of real projects and roles, so an invented citation cannot reach the page
- **Social cards** — each project's own artwork is its `og:image` when it crops to 1.91:1; the three whose artwork is the wrong shape get a generated 1200×630 card (`npm run og:build`, committed, `og:check` gates freshness in CI)
- **Per-route heads** — the build writes one `dist/<route>.html` per stand-alone route (`scripts/routeHeads.js`, from `src/utils/routeMeta.ts`) so `/resume`, `/privacy` and every `/projects/<slug>` ship their own title, description, social tags and canonical link; Vercel serves them extensionless via `cleanUrls`
- **Real 404s** — every real route is a file in the build; anything else (a mistyped path, a stale project slug) is served from `dist/404.html` — a build-time copy of `index.html` — with a 404 status, and the app renders its own not-found page in the same shell
- **Typography** — Inter, self-hosted as one variable woff2 (weights 400–700, latin subset, 24 KB via `scripts/buildInterSubset.sh`). It had been declared in the Tailwind config since the start but never actually loaded, so the site rendered in each platform's generic sans-serif. Not preloaded: that cost 300 ms of LCP on a client-rendered page, and `font-display: swap` already keeps it off the rendering path
- **Theme Engine** — Persisted Dark / Light + High-Contrast variant:
  - *Deep Space* 🌑
  - *Clean Slate* ☀️
  - *High Contrast* ⚫ (a11y toggle in nav, persisted)

### ♿️ Accessibility
- Skip-to-content link, visible `:focus-visible` rings on all interactive surfaces
- Real focus trap + focus restoration on the chatbot and project modal
- Global `useReducedMotion` hook — single source of truth for `prefers-reduced-motion`
- High-contrast theme variant via `useHighContrast` (initialised from `prefers-contrast: more`)
- `eslint-plugin-jsx-a11y` enforced in CI

### 🏆 Achievements
- Content-driven badges wall sourced from `constants.ACHIEVEMENTS`

### 🧪 Testing
- **Vitest** — ~1,050 unit and component tests across ~100 files, with coverage thresholds enforced in CI
- **Playwright** — 46 end-to-end specs against the built site locally; against production (`E2E_BASE_URL`) they add API checks and run daily from `.github/workflows/production.yml`, which opens a `production-health` issue on failure and closes it on recovery
- **Content gates** — the content schema, résumé-PDF parity, claim integrity (phrasings the evidence cannot support), sitemap, social-card and app-icon freshness

### 🛡️ Supply-chain & CI
- GitHub Actions on Node 22 (`actions/checkout@v7`, `setup-node@v7`): lint, typecheck (client and API), tests with coverage, build, and an initial-payload bundle budget
- Lighthouse CI on pushes to main and on PRs — four routes; accessibility, best practices and SEO gate, performance warns (config in `lighthouserc.json`)
- Dependency gate that fails only on production-reachable advisories, plus an OSV scanner job
- Dependabot weekly, grouped; ESLint 10 held until `eslint-plugin-jsx-a11y` supports it

---

## 💻 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite 7, Tailwind CSS 3 |
| Animations | Framer Motion, CSS keyframes |
| AI chat | Anthropic Claude (primary), Google Gemini, Hugging Face — server-side chain |
| Backend | Vercel serverless functions (Node, ESM) |
| Data | Supabase (analytics), Upstash Redis (rate limits) |
| Observability | Sentry (client and server), Vercel Analytics |
| Testing | Vitest 5, Testing Library, Playwright, Lighthouse CI |
| Services | EmailJS, GitHub API |

---

## 🏁 Getting Started

### 1. Clone & Install
```bash
git clone https://github.com/hasnainrazaa03/my-portfolio.git
cd my-portfolio
npm install
```

### ⚠️ Serverless imports must carry `.js` extensions

Vercel transpiles each `api/*.ts` handler to `.js` **individually** rather than
bundling it. `package.json` declares `"type": "module"`, so that output is ESM —
and **Node ESM does not resolve extensionless relative specifiers**.

```ts
import { applyCors } from './_lib/cors';      // ❌ FUNCTION_INVOCATION_FAILED at module load
import { applyCors } from './_lib/cors.js';   // ✅
```

TypeScript maps `'./_lib/cors.js'` back to the `.ts` source, so the extension
costs nothing at authoring time. `src/__tests__/apiEsmImports.test.js` enforces
this — it exists because getting it wrong took **every** API endpoint down
silently for an extended period (the client falls back to canned responses, so
the UI looked healthy while the API was dead). Note that local `esbuild`
bundling passes either way, so it is *not* a valid check for this.

### Chat provider models

Model IDs rot. Two defaults were already dead when this was last audited:
`gemini-2.5-flash` returned *"no longer available to new users"* and
`meta-llama/Meta-Llama-3-8B-Instruct` was *"not supported by any provider you
have"*. Current defaults are `gemini-flash-latest` (a tracking alias, so it
can't rot the same way) and `meta-llama/Llama-3.1-8B-Instruct`.

To see what a key can actually call:

```bash
curl -H "x-goog-api-key: $GEMINI_API_KEY" https://generativelanguage.googleapis.com/v1beta/models
curl -H "Authorization: Bearer $HUGGINGFACE_API_KEY" https://router.huggingface.co/v1/models
```

Also note current Gemini models spend **thinking tokens from `maxOutputTokens`**
(observed: 380 thinking + 51 answer), and `thinkingConfig.thinkingBudget: 0` is
not honoured on `gemini-flash-latest`. Hence the generous 1024 budget — at 320
replies came back cut mid-word.

### Asset pipeline (images)

Every raster image in `public/` ships in two forms: the original `.png`/`.jpg`
and a generated `.webp` sibling. `LazyImage` wraps local rasters in a
`<picture>` and offers the `.webp` first — about an 80% byte saving
(11.7 MB → 1.06 MB across the site).

**If you add an image to `public/`, generate its sibling**, or `LazyImage` will
select a `<source>` that 404s and the browser will render it broken (a failed
`<source>` does *not* fall back to the `<img>`):

```bash
# Resize to a 1600px max dimension, then emit the webp sibling
sips -Z 1600 public/NewImage.png --out public/NewImage.png
cwebp -q 82 -metadata none public/NewImage.png -o public/NewImage.webp
```

Remote/CDN image URLs are left alone — no sibling is assumed for those.

### 2. Environment Setup

Create a `.env.local` file in the root directory:

```bash
# AI Chat — at least one provider key required. Unconfigured providers are
# skipped, so you only need keys for the ones you actually want in the chain.
LLM_CHAIN="anthropic,gemini,huggingface"           # ordered fallback list

ANTHROPIC_API_KEY="sk-ant-..."                     # primary
ANTHROPIC_MODEL="claude-sonnet-5"                  # or claude-haiku-4-5 (~3x cheaper)

GEMINI_API_KEY="your_gemini_key"                   # free-tier fallback
GEMINI_MODEL="gemini-2.5-flash"

HUGGINGFACE_API_KEY="hf_your_token"                # last-resort fallback
HF_MODEL="meta-llama/Meta-Llama-3-8B-Instruct"

LLM_TIMEOUT_MS="8000"                              # per-provider budget

# CORS: extra allowed origins (comma-separated). Previews are trusted only when
# their host starts with VERCEL_PREVIEW_PREFIX; localhost only outside production.
ALLOWED_ORIGIN="https://your-domain.vercel.app"
VERCEL_PREVIEW_PREFIX="my-portfolio"

# Rate limiting (optional overrides)
CHAT_RATE_LIMIT_MAX="10"
CHAT_RATE_LIMIT_WINDOW_MS="60000"
FIT_RATE_LIMIT_MAX="3"
FIT_RATE_LIMIT_WINDOW_MS="600000"
FIT_PROVIDER_TIMEOUT_MS="18000"                    # /api/fit sends a large prompt

# Durable rate limiting across instances (either naming works)
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."

# GitHub activity proxy (optional token raises the API quota)
GITHUB_TOKEN="ghp_..."
GITHUB_USERNAME="hasnainrazaa03"

# Contact Form (EmailJS)
VITE_EMAILJS_SERVICE_ID="your_service_id"
VITE_EMAILJS_TEMPLATE_ID="your_template_id"
VITE_EMAILJS_PUBLIC_KEY="your_public_key"

# Analytics (Supabase)
SUPABASE_URL="your_supabase_url"
SUPABASE_SERVICE_KEY="your_service_key"
ANALYTICS_SECRET_TOKEN="your_admin_token"          # unlocks the private /insights page
ANALYTICS_IP_SALT="long_random_string"             # required for hashed-IP analytics

# Error tracking
SENTRY_DSN="https://...ingest.sentry.io/..."       # server
VITE_SENTRY_DSN="https://...ingest.sentry.io/..."  # client; loads only on first error

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
npm run lint && npm run typecheck
npx vitest run                     # unit + component tests
npm run build && npx playwright test          # E2E against the local build
E2E_BASE_URL=https://hasnainrazaa.vercel.app npx playwright test   # against production
```

---

## 📁 Project Structure

```
my-portfolio/
├── api/                        # Vercel serverless functions (TypeScript, ESM)
│   ├── chat.ts                 # Streaming chat over the provider chain
│   ├── fit.ts                  # Job-description comparison
│   ├── analytics.ts            # Admin-only analytics read
│   ├── github.ts               # Cached GitHub activity proxy
│   ├── csp-report.ts · health.ts
│   └── _lib/                   # llm, rateLimit, cors, sanitize, history, sentry, fitAnalysis…
├── e2e/                        # Playwright specs
├── public/                     # Images (+ .webp siblings), fonts, app icons, social cards
├── scripts/                    # Build-time generators and CI checks
│   ├── routeHeads.js           # One HTML file per route, each with its own <head>
│   ├── spaNotFound.js          # 404.html with a not-found head
│   ├── serviceWorker.js        # Generated offline worker
│   ├── buildOgCards.js · buildAppIcons.js · buildSitemap.js
│   └── checkBundleSize.js · checkDeps.js · buildCareerKnowledge.js
├── src/
│   ├── components/             # Sections, chat/, resume/, case-study pages, charts
│   ├── lab/flow/               # Lattice-Boltzmann solver + NACA rasteriser + its Web Worker
│   ├── hooks/ · services/ · utils/ · context/
│   ├── data/                   # Content schema, claim rules, generated knowledge + Q&A
│   ├── __tests__/              # Vitest suites
│   ├── constants.ts            # All site content — the single source of truth
│   └── App.tsx                 # Pathname routing, no router dependency
├── lighthouserc.json · vercel.json · vite.config.js
```

---

## 🛰️ Design Philosophy

This portfolio is built like a **mission control dashboard**:
- Motion-driven, not decorative
- Visuals that say something: the hero draws the physics behind the aerospace background
- Every animation communicates state, intent, or hierarchy

It's designed to feel less like a website — and more like **a system**.

---

## 🔐 Security & Privacy

**Server-side defenses**
- Per-IP rate limiting, durable across instances: `/api/chat` 10/min, `/api/fit` 3 per 10 min; `/api/analytics` is admin-only behind a timing-safe token check
- CORS allow-list: the production origin, previews of THIS project only (`VERCEL_PREVIEW_PREFIX`), and localhost outside production
- Production headers (see [vercel.json](vercel.json)): HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Permissions-Policy`, `Referrer-Policy`, and an **enforcing** Content-Security-Policy with no `'unsafe-inline'` scripts — the two inline scripts are allowed by pinned hashes, which a test recomputes
- Violations report to `/api/csp-report`
- All API responses carry a `requestId` for correlation; upstream errors are never leaked to clients
- Honeypot field + time-gate on the contact form to deter bots

**Prompt-injection defense**
- System prompt is hardcoded server-side — clients cannot inject `context`
- Client `provider` hint is ignored — provider is selected by env only
- Chat text is NFKC-normalized, stripped of zero-width / control chars, and capped at 500 chars; pasted job descriptions on `/fit` are delimited and neutralised instead of pattern-matched, because a real posting for an AI role says "system prompt"
- Suspicious patterns (`ignore previous`, `jailbreak`, `reveal prompt`, …) are detected and refused
- User text is wrapped in `<<USER>>…<<END_USER>>` delimiters before reaching the model

**Privacy posture**
- Analytics never store raw `User-Agent` or `Referer`
- IPs are hashed server-side with SHA-256 + a per-deploy salt (`ANALYTICS_IP_SALT`)
- Visitor insights live on a private, noindex page (`/insights`) that shows nothing without `ANALYTICS_SECRET_TOKEN`; the API sends aggregates, never raw rows or hashed IPs, and redacts contact details visitors typed
- The browser writes no analytics: `/api/chat` records each exchange server-side, so there is no client credential to steal

**Reporting**
Found a vulnerability? See [SECURITY.md](SECURITY.md) (or `.well-known/security.txt`).

---

## 📜 Changelog

### 2026-08 → 2026-09 — Production hardening and features

**Found only in production, then guarded:** `/resume`, `/privacy` and case studies 404'd with no SPA fallback; every serverless function failed to load (extensionless ESM imports); the declared font, Inter, never loaded; a Vercel deploy was silently skipped; the Lighthouse gate had never passed.

**Built:** streaming chat with source chips and curated career knowledge; project case studies with per-route heads, generated social cards and a real 404; ATS résumé view; job-description comparison (`/fit`); installable offline support; the career arc chart; Vimaan's runtime diagram.

**Also built:** the hero flow picture (with a viscous lattice-Boltzmann mode) with a live-trained surrogate network (three.js removed, 127 KB → 16 KB); a daily production health check with deploy-freshness; chunk-load recovery so one unfetchable section cannot take the page down; zero npm advisories (`@vercel/node` replaced by local types); private visitor insights; live GitHub answers and case-study links in the chat; "How it works" diagrams for Manzil and Orbit; the NACA 4412 lift-curve explorer; JSON-LD per case study.

**Corrected claims:** Orbit's (then USC Ledger) "atomic transactions", "P2034 write-conflict resolution" and a race-preventing "reconciliation engine" (none exist in its code) and a dead demo link; Manzil described as "collaborative" (recipes are owner-only). Earlier: a "10x throughput" figure the evidence could not support, Vimaan's "inter-process communication" (a thread and a queue in one process) and INT8 presented as a speed gain (it was for memory). `claimRules.ts` now fails CI if any return.

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
- Vite `manualChunks` splits `framer-motion`, `@supabase/supabase-js`, and `react-github-calendar` into separate cacheable chunks
- The hero flow picture respects `prefers-reduced-motion`, pauses rAF when offscreen via `IntersectionObserver`, and caps DPR at 1.5
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

