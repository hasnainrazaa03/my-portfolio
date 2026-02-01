# 🚀 Hasnain Raza Portfolio v2.0

**The immersive digital mission control for an Aerospace‑turned‑AI Engineer.**

Most portfolios are static digital business cards—flat, text‑heavy, and uninspired. This portfolio is different. It is an **engineered, interactive experience** designed to bridge the physical mechanics of **Aerospace Engineering** with the digital intelligence of **Artificial Intelligence**.

This site transforms a traditional resume into a **living, breathing application**.

---

## 🧠 Why This Exists

As a graduate student in the **Scientists & Engineers program at USC**, my background isn’t linear. I operate at the intersection of:

- **Complex Transitions** — Moving from Computational Fluid Dynamics (CFD) to Deep Learning
- **Dual Expertise** — Balancing physical engineering intuition with software architecture
- **Technical Depth** — A need to *show*, not just *tell*, my ability to build complex systems

This portfolio is intentionally **opinionated, high‑performance, and immersive**, engineered to reflect a core duality:

> **Cosmos (Aerospace) × Code (AI)**

---

## 🛠️ Engineering Challenges (and Solutions)

### 1. The **"Jarvis" Contextual AI Engine**

Embedding an LLM into a static portfolio often introduces serious issues.

**The Problems**
- Exposed API keys when calling models directly from the browser
- CORS failures with Hugging Face endpoints
- Cold‑start latency and unreliable availability

**The Solution — Hybrid Vercel Proxy Architecture**

- Requests are routed through **Vercel Serverless Functions**, fully hiding credentials
- **Smart Fallback System**:
  - Attempts high‑fidelity models first (Qwen / Mistral)
  - Gracefully degrades to TinyLlama or a local keyword‑matching heuristic if rate‑limited
- **Context Injection (RAG‑Lite)**:
  - Entire portfolio content is injected into the system prompt at runtime
  - Enables accurate, non‑hallucinatory answers about projects, skills, and experience

Result: **Jarvis works 100% of the time—even if external APIs fail.**

---

### 2. High‑Performance 3D Visualization

3D web experiences are notorious for destroying mobile performance and Lighthouse scores.

**The Problem**  
Rendering complex Three.js scenes on low‑power devices causes lag, layout thrashing, and battery drain.

**The Solution**
- **Conditional Rendering** — 3D Orbital Engine is gated to desktop viewports (`hidden md:block`)
- **Lazy Loading** — Heavy `Hero3D` component loaded via `React.lazy` and `Suspense`
- **Raycasting Optimization** — Scene rotates only during active mouse interaction using normalized coordinates

Result: **Near‑instant First Contentful Paint (FCP)** with zero mobile performance penalties.

---

### 3. Responsive GitHub Heatmap

Standard GitHub contribution graphs are fixed‑width and break mobile layouts.

**The Problem**  
`react-github-calendar` overflows horizontally on phones, harming UX.

**The Solution — Custom Data Transformation Layer**

- **Desktop** — Full 365‑day contribution history
- **Mobile** — Automatically sliced to the last 5 months
- **Thematic Integration** — Custom color map enforces the site’s **Teal (#2DD4BF)** palette

---

## 🤖 "Jarvis" AI Assistant Capabilities

Powered by **Hugging Face Inference**, Jarvis acts as a contextual tour guide.

- **Context Awareness** — Knows every project, skill, and role defined in `constants.js`
- **Reactor Core UI** — Pulsing, animated activation button inspired by an AI / CPU core
- **Fail‑Safe Architecture** — Fully operational even during API outages

---

## 🚀 Feature Overview

### 🌌 Immersive Hero Section
- **3D Tech Core** — Rotating Icosahedron with orbital rings and particle fields (Three.js)
- **Interactive Tilt** — Mouse‑driven parallax response
- **Resume Engine** — One‑click resume download with instant visual feedback

### 🔭 Dynamic Navigation
- **Rocket Scroll** — Scroll progress bar where a rocket physically flies across the screen
- **Animated Exhaust** — CSS‑based fire effects
- **Glassmorphism UI** — `backdrop-blur-md` components supporting Dark & Light modes

### 📊 Live Data Feeds
- **GitHub Integration** — Real‑time commit and contribution data
- **Animated Stats** — Count‑up metrics triggered on scroll using Framer Motion

### ⚡ Technical Polish
- **Scroll‑to‑Top Rocket** — Appears dynamically after scrolling
- **Contact System** — Serverless form using EmailJS
- **Theme Engine** — Persisted Dark / Light modes:
  - *Deep Space* 🌑
  - *Clean Slate* ☀️

---

## 💻 Tech Stack

| Layer | Technology |
|------|------------|
| Frontend | React, Vite, Tailwind CSS |
| Animations | Framer Motion, CSS Keyframes |
| 3D Engine | Three.js (WebGL) |
| AI / ML | Hugging Face Inference API (Mistral, Qwen) |
| Backend | Vercel Serverless Functions (Node.js) |
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

Create a `.env` file in the root directory:

```bash
# AI Chatbot
HUGGINGFACE_API_KEY="hf_your_token"

# Contact Form
VITE_EMAILJS_SERVICE_ID="your_service_id"
VITE_EMAILJS_TEMPLATE_ID="your_template_id"
VITE_EMAILJS_PUBLIC_KEY="your_public_key"
```

### 3. Run Locally

Using **Vercel CLI** (recommended — runs frontend + serverless API):
```bash
vercel dev
```

Frontend‑only mode:
```bash
npm run dev
```

---

## 🛰️ Design Philosophy

This portfolio is built like a **mission control dashboard**:
- Motion‑driven, not decorative
- 3D used only where it adds meaning
- Every animation communicates state, intent, or hierarchy

It’s designed to feel less like a website—and more like **a system**.

---

## 🧑‍🚀 Author

**Hasnain Raza**  
Aerospace Engineer → AI Engineer  
USC • Los Angeles

---

*Built to explore the space between physics and intelligence.*

