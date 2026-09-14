# Security Policy

## Supported versions

Only the latest deployed version on `https://hasnainrazaa.vercel.app` is supported.

## Reporting a vulnerability

If you believe you have found a security vulnerability:

1. **Do not open a public GitHub issue.**
2. Email the maintainer (contact details on the live site's Contact section, or via GitHub: [@hasnainrazaa03](https://github.com/hasnainrazaa03)).
3. Please include:
   - A clear description of the issue
   - Steps to reproduce (proof-of-concept where applicable)
   - The affected endpoint or component
   - Your contact details for follow-up

You should receive an acknowledgement within 7 days.

## Scope

In scope:
- `/api/chat` and `/api/fit` — prompt injection bypass, rate-limit bypass, provider leak, error oracle, an invented claim reaching the page
- `/api/analytics` — auth bypass, IP-hash reversal, IDOR
- `/api/github` and `/api/csp-report` — abuse as a proxy or amplifier
- The service worker — serving stale or cross-origin content
- Client bundle — XSS, CSP bypass, sensitive data exposure
- Build artifacts shipped to production

Out of scope:
- Vulnerabilities in third-party services (Vercel, Supabase, Upstash, Sentry, EmailJS, Anthropic, Google Gemini, Hugging Face, GitHub) — please report to those vendors directly.
- DoS via volumetric attack against shared infrastructure.
- Self-XSS or social-engineering of the maintainer.

## Defensive posture (snapshot)

- Per-IP rate limiting on the model-backed endpoints (`/api/chat`, `/api/fit`), durable across instances; `/api/analytics` requires a token compared in constant time.
- CORS allow-list restricted to the production origin, this project's own preview deployments, and localhost outside production.
- Production headers: HSTS, `X-Frame-Options: DENY`, `Permissions-Policy`, `Referrer-Policy`, and an enforcing CSP with no `'unsafe-inline'` scripts.
- IP addresses are SHA-256 hashed with a per-deploy salt before storage; raw IPs are never persisted.
- LLM provider, system prompt, and persona are server-controlled; the client cannot inject context.

## Hall of fame

Credible disclosures will be credited here with the reporter's permission.
