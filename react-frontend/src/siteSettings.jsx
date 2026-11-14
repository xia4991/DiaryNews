/* eslint-disable react-refresh/only-export-components */

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { api } from './api'
import { useAuth } from './auth'

// Mirrors backend/storage/site_settings.py SITE_SETTING_DEFAULTS. Used until the
// fetch resolves (and if it fails), so hidden-by-default things stay hidden.
const DEFAULT_SETTINGS = {
  view_counts_public: false,
}

const SiteSettingsContext = createContext(null)

export function SiteSettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)

  useEffect(() => {
    api.getSiteSettings()
      .then(data => setSettings({ ...DEFAULT_SETTINGS, ...data }))
      .catch(() => {})
  }, [])

  const updateSettings = useCallback(async (changes) => {
    const data = await api.updateSiteSettings(changes)
    setSettings({ ...DEFAULT_SETTINGS, ...data })
    return data
  }, [])

  const value = useMemo(() => ({ settings, updateSettings }), [settings, updateSettings])

  return (
    <SiteSettingsContext.Provider value={value}>
      {children}
    </SiteSettingsContext.Provider>
  )
}

export function useSiteSettings() {
  const ctx = useContext(SiteSettingsContext)
  if (!ctx) throw new Error('useSiteSettings must be used within SiteSettingsProvider')
  return ctx
}

// Article view counts ("N 次阅读") are admin-only unless the admin flips them public.
export function useShowViewCounts() {
  const { user } = useAuth()
  const { settings } = useSiteSettings()
  return Boolean(user?.is_admin || settings.view_counts_public)
}
