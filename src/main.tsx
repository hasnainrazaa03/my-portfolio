import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { initSentry } from './config/sentry'

// Registers a lightweight error buffer now and loads the SDK itself on idle,
// after first paint. An error thrown during the first mount — the class of
// failure that once blanked this site — is still captured; it is reported a
// moment later instead of costing every visitor 28 KB before the first pixel.
initSentry()

// DEV-ONLY: validate all site content against its schema so a malformed edit
// to constants.js surfaces immediately in the console. Guarded by
// import.meta.env.DEV — this code (and the zod import) is stripped from the
// production bundle by Vite's tree-shaking, so it adds zero runtime cost.
if (import.meta.env.DEV) {
  import('./data/contentSchema')
    .then(({ collectContentErrors }) => {
      const errors = collectContentErrors()
      if (errors.length > 0) {
        console.error(
          `[content] ${errors.length} invalid content entr${errors.length > 1 ? 'ies' : 'y'} in constants.js:\n` +
            errors.map((e) => `  • ${e}`).join('\n'),
        )
      }
    })
    .catch((err) => console.error('[content] schema validation failed to run:', err))

  import('./config/env')
    .then(({ warnMissingEnv }) => warnMissingEnv())
    .catch((err) => console.error('[env] env check failed to run:', err))
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
