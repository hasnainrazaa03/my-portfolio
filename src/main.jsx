import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'  // ✅ ADD THIS
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>  {/* ✅ ADD THIS */}
      <App />
    </HelmetProvider>  {/* ✅ ADD THIS */}
  </StrictMode>,
)
