import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { AuthProvider } from './auth.jsx'
import { SiteSettingsProvider } from './siteSettings.jsx'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <SiteSettingsProvider>
        <App />
      </SiteSettingsProvider>
    </AuthProvider>
  </StrictMode>,
)
