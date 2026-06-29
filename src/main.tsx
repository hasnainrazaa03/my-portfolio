import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

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
