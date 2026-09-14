# Contributing

Thanks for your interest in this project. This is primarily a personal portfolio, but bug reports, accessibility findings, and security disclosures are welcome.

## Ground rules

- **Be respectful.** Follow the spirit of the [Contributor Covenant](https://www.contributor-covenant.org/).
- **One concern per PR.** Smaller PRs ship faster.
- **No drive-by refactors.** Refactor-only PRs need to motivate why.

## Development setup

```bash
git clone https://github.com/hasnainrazaa03/my-portfolio.git
cd my-portfolio
npm install                  # no --legacy-peer-deps: peer conflicts are fixed, not overridden
cp .env.example .env.local   # then fill in keys; see README.md
vercel dev                   # frontend + serverless functions
# or
npm run dev                  # frontend only (chat / analytics will be offline)
```

## Before opening a PR

```bash
npm run lint && npm run typecheck      # ESLint, and tsc for both client and api/
npx vitest run                         # unit + component tests
npm run build && npm run check:bundle  # build, then the initial-payload budget
npx playwright test                    # E2E against the built site
npm run sitemap:check && npm run og:check && npm run icons:check
```

## What this project will not accept

- Removal of CSP, rate limiting, or input sanitization
- Content in `src/constants.ts` that the claim rules reject — every figure there traces to evidence
- Re-introduction of client-side context injection into the chat system prompt
- Logging of raw IPs, User-Agent strings, or referrers
- Dependencies that ship analytics or trackers
- Heavyweight UI frameworks (this is intentionally a small React + Vite app)

## Reporting security issues

**Do not open public issues for security vulnerabilities.** See [SECURITY.md](SECURITY.md).

## Style

- TypeScript, ES modules, modern React (hooks only — no class components). Relative imports under `api/` must end in `.js` — see the README.
- Tailwind utilities first; bespoke CSS only when utilities don't compose cleanly.
- Keep new files small (< 300 lines). Extract helpers into `src/services/` or `api/_lib/`.
- Tests live next to the suite they exercise in `src/__tests__/`.
