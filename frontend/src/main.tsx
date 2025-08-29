import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import './i18n.ts';
import { initBrowserCompatibility } from './utils/browserCompatibility'

// Initialize browser compatibility
initBrowserCompatibility()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
