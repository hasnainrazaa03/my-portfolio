import type { ArchitectureDiagram } from '../types/content';

/**
 * architectures.ts — the "How it works" diagrams, keyed by project title.
 *
 * WHY NOT ON THE PROJECT ENTRIES IN constants.ts: constants.ts is imported by
 * the hero, so everything in it ships in the entry bundle every visitor
 * downloads before first paint. These diagrams are only drawn on case-study
 * pages, which are lazy. Three of them pushed the entry chunk over its
 * gzip budget; here they load with the page that uses them.
 *
 * Each diagram is authored from the project's code or master document, never
 * from memory. `architectureFlow.test.jsx` fails if a key stops matching a project
 * title, and the claim-integrity rules scan this file as well as constants.ts.
 */
export const ARCHITECTURES: Readonly<Record<string, ArchitectureDiagram>> = {
  // Authored from VIMAAN_MASTER.md section 3 ("End-to-End Architecture"),
  // runtime side. No latency figures anywhere: the microphone-to-command path
  // has never been measured end to end (see claimRules.ts).
  'Project Vimaan': {
    title: "One voice command, key press to read-back",
    summary: "Blocking audio work stays off the simulator's thread, and four guards stand between the model's output and the aircraft, each with its own way out.",
    lanes: [
      {
        label: "Worker thread",
        why: "Microphone capture and speech recognition both block; on the simulator's thread they would freeze the aircraft mid-flight.",
        stages: [
          { label: "Push-to-talk capture", detail: "Key-down starts one capture; a lock refuses a second", passes: "audio" },
          { label: "Mic health check + speech-to-text", passes: "transcript" },
        ],
      },
      {
        label: "X-Plane main thread",
        why: "A flight-loop callback drains the queue every 0.2 s, so every simulator call happens on the thread that owns the simulator.",
        stages: [
          { label: "Normalize aviation input", detail: "Five ordered passes", passes: "normalized text" },
          { label: "Joint DistilBERT", detail: "ONNX Runtime; knows nothing about X-Plane, safety or units", passes: "intent + slot logits" },
          { label: "Decode", detail: "Softmax confidence; BIO tags into a slot dictionary", passes: "intent, slots" },
          { label: "Correct + post-process", detail: "A spoken instance number overrides the model; range-aware slots", passes: "candidate command" },
          { label: "Confidence floor", exit: { when: "below 0.55", outcome: "\"Please repeat that\" — nothing sent" } },
          { label: "Actionable intent?", exit: { when: "chit-chat", outcome: "Acknowledged — no command" } },
          { label: "Safety interlocks", exit: { when: "risky", outcome: "Spoken warning; confirmation gate armed" } },
          { label: "Slot validation", exit: { when: "invalid value", outcome: "Rejected with a spoken error" }, passes: "validated command" },
          { label: "Command the simulator", detail: "xp.commandOnce / xp.setDataf", passes: "result" },
          { label: "Phonetic read-back", detail: "Spoken confirmation of what was done" },
        ],
      },
    ],
    handoffs: ["queue.Queue — the only thing the two threads share"],
    notes: [
      "The model consumes normalized text and returns logits. Everything domain-specific happens outside it, which is what makes the stack testable without a simulator.",
      "The plugin does simulator I/O and nothing else; every decision is a pure function. That is why 284 tests run in under 8 seconds with no simulator, microphone, GPU or network.",
    ],
  },
  // Authored from the repository's code (server/src/routes/import.ts,
  // lib/safeFetch.ts, lib/parseRecipe.ts, routes/upload.ts, routes/recipes.ts)
  // and MANZIL_RECIPE_VAULT_MASTER.md section 5. Import was chosen over a
  // plain create because it is the path with a real threat model.
  'Manzil Recipe Vault': {
    title: "One recipe import, pasted link to saved recipe",
    summary: "The server fetches a stranger's URL only after screening where it resolves, and the import only proposes: nothing is saved until the author reviews it and saves through the ordinary guarded path.",
    lanes: [
      {
        label: "Express API — import",
        why: "A server that fetches user-supplied URLs can be aimed at its own network, so every check runs before a byte is requested.",
        stages: [
          { label: "Rate limit", exit: { when: "over 20 per 15 min", outcome: "429" } },
          { label: "Verify Firebase ID token", detail: "firebase-admin verifyIdToken", exit: { when: "missing or invalid", outcome: "401" }, passes: "uid" },
          { label: "Strict schema", detail: "Unknown keys rejected; a bare domain gets https:// added", exit: { when: "invalid body", outcome: "400" }, passes: "url" },
          { label: "Resolve and screen addresses", detail: "http(s) only; every DNS answer checked, IPv4 and IPv6", exit: { when: "any address private", outcome: "400 blocked_address" } },
          { label: "Fetch, redirects by hand", detail: "Each hop re-screened; at most 3 redirects, 8 s, 2 MB, HTML only", exit: { when: "a limit is hit", outcome: "400 with a specific code" }, passes: "HTML" },
          { label: "Parse JSON-LD Recipe", detail: "Every field sanitized", exit: { when: "no recipe found", outcome: "422 — nothing saved" }, passes: "draft recipe" },
        ],
      },
      {
        label: "Browser — review",
        why: "The import fills the form and stops. The author edits, adds a photo and decides whether to save.",
        stages: [
          { label: "Pre-filled recipe form", passes: "image file" },
          { label: "Upload straight to Cloudinary", detail: "Signature from the API pins folder, formats and a 2000 px cap", passes: "image URL + recipe" },
        ],
      },
      {
        label: "Express API — save",
        why: "An imported recipe gets no shortcut: it passes the same guards as one typed by hand.",
        stages: [
          { label: "Rate limit + token", exit: { when: "over limit / no token", outcome: "429 / 401" } },
          { label: "Strict schema + sanitize", detail: "Rich text cleaned against a tag allowlist, no attributes", exit: { when: "invalid body", outcome: "400" }, passes: "clean recipe" },
          { label: "Write to MongoDB", detail: "Author and name taken from the token, never the body" },
        ],
      },
    ],
    handoffs: ["JSON draft — nothing written to the database yet", "POST /api/recipes with a Bearer token"],
    notes: [
      "The image bytes never pass through the API. The server signs where an upload may go and in what format; it does not inspect the file.",
      "Two bypasses were found while attacking the fetcher and fixed: bracketed IPv6 literals, and IPv4-mapped addresses like ::ffff:7f00:1, now compared as bits rather than text.",
    ],
  },
  // Authored from the repository's code (client/src/App.tsx,
  // hooks/useOfflineQueue.ts, services/api.ts, server/src/middleware/*,
  // routes/expenses.ts, prisma/schema.prisma) and
  // ORBIT_EXPENSE_TRACKER_MASTER.md. Earlier copy described conflict
  // handling the code does not have; see the Orbit rules in claimRules.ts.
  'Orbit Expense Tracker': {
    title: "One expense, form to database — with or without a connection",
    summary: "An expense recorded offline waits in the browser and replays later with an id the server remembers, so a retry can never save it twice; online or not, it reaches the database as integer cents.",
    lanes: [
      {
        label: "Browser",
        why: "Currency conversion and the offline queue live here, so an expense can be recorded with no connection at all.",
        stages: [
          { label: "Enter the expense", detail: "A foreign amount converts to USD with Frankfurter's rate, cached for an hour", passes: "USD + original amount, currency" },
          { label: "Online?", exit: { when: "offline", outcome: "Queued in IndexedDB with a client id; shown at once" } },
          { label: "Send with CSRF header", detail: "Session is an httpOnly cookie; a 403 refreshes the token and retries once", passes: "JSON + cookies" },
        ],
      },
      {
        label: "Express API",
        why: "Every write crosses the same middleware stack before a handler runs, and the handler still refuses bad values itself.",
        stages: [
          { label: "Rate limits", exit: { when: "over 180 per minute", outcome: "429" } },
          { label: "CSRF double-submit check", exit: { when: "cookie ≠ header", outcome: "403" } },
          { label: "JWT + token version", detail: "A password reset bumps the version and revokes old sessions", exit: { when: "expired or revoked", outcome: "401" }, passes: "userId" },
          { label: "Validate", detail: "Finite amount above zero, valid date, capped text", exit: { when: "invalid", outcome: "400" } },
          { label: "Household membership", exit: { when: "not an active member", outcome: "403" } },
          { label: "Seen this replay id?", exit: { when: "already saved", outcome: "200 with the existing row" }, passes: "amounts in integer cents" },
        ],
      },
      {
        label: "MongoDB via Prisma",
        why: "Money is stored as whole cents, so no floating-point value ever reaches a balance.",
        stages: [
          { label: "expense.create", detail: "USD cents plus the original amount and currency; the rate is not stored" },
        ],
      },
    ],
    handoffs: ["REST call to the API on Render", "Prisma client"],
    notes: [
      "On reconnect the queue replays one item at a time, oldest first. A permanent 4xx drops that item; a 5xx or 429 stops the flush and leaves the rest for next time.",
      "The replay check is a lookup, not a unique index, so two identical requests arriving at the same instant could both insert. The queue sends one item at a time, which stops a tab from racing itself, but not two tabs.",
    ],
  },
};
