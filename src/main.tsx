import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import DeletePage from './pages/DeletePage.tsx'
import PrivacyPage from './pages/PrivacyPage.tsx'
import TermsPage from './pages/TermsPage.tsx'
import LedgerPage from './pages/LedgerPage.tsx'

/* Standalone paper pages, routed on pathname. vercel.json already rewrites every
   non-/api path to index.html, so these URLs reach the SPA and are matched here.
   Routing at the entry point rather than inside App keeps App's session
   bootstrap off these pages — /delete in particular must not mint an identity
   just so there is one to delete. */
function rootFor(pathname: string) {
  switch (pathname.replace(/\/+$/, '') || '/') {
    case '/delete':
      return <DeletePage />
    case '/privacy':
      return <PrivacyPage />
    case '/terms':
      return <TermsPage />
    case '/ledger':
      return <LedgerPage />
    default:
      return <App />
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {rootFor(window.location.pathname)}
  </StrictMode>,
)
