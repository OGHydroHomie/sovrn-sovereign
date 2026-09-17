import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import DeletePage from './pages/DeletePage.tsx'
import PrivacyPage from './pages/PrivacyPage.tsx'
import TermsPage from './pages/TermsPage.tsx'
import LedgerPage from './pages/LedgerPage.tsx'
import SavedBlueprintPage from './pages/SavedBlueprintPage.tsx'
import AboutPage from './pages/AboutPage.tsx'
import MapPage from './pages/MapPage.tsx'
import MarketingPage from './pages/MarketingPage.tsx'

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
    case '/blueprint':
      return <SavedBlueprintPage />
    case '/about':
      return <AboutPage />
    case '/map':
      return <MapPage />
    /* The door, the threshold and the quiz. They lived at the root until the
       marketing site took it; every link that mattered — the magic link and the
       6am email — points at /ledger and is unaffected. */
    case '/begin':
      return <App />
    case '/':
      return <MarketingPage />
    /* Anything else is an old or mistyped path. The front page is the honest
       place to land: a stranger sees what this is, and somebody with a reading
       is offered their Ledger on it. */
    default:
      return <MarketingPage />
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {rootFor(window.location.pathname)}
  </StrictMode>,
)
