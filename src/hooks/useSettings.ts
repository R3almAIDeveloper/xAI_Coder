// src/hooks/useSettings.ts
import { create } from 'zustand'
import { supabase } from '../lib/supabase'

interface Settings {
  apiKey: string
  baseUrl: string
  model: string
  logoUrl: string
}

interface SettingsStore {
  settings: Settings
  isLoading: boolean
  isInitialized: boolean
  setSettings: (updates: Partial<Settings>) => Promise<void>
  loadSettings: () => Promise<void>
}

// Fallback defaults — uses your real xAI key if nothing saved yet
const DEFAULT_SETTINGS: Settings = {
  apiKey: import.meta.env.VITE_XAI_API_KEY || '',
  baseUrl: import.meta.env.VITE_XAI_BASE_URL || 'https://api.x.ai',
  model: 'auto',
  logoUrl: '',
}

export const useSettings = create<SettingsStore>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  isLoading: true,
  isInitialized: false,

  // Save to Supabase + update local state
  setSettings: async (updates) => {
    const updated = { ...get().settings, ...updates }
    set({ settings: updated })

    try {
      await supabase
        .from('settings')
        .upsert(
          { id: 'global', ...updated },
          { onConflict: 'id' }
        )
    } catch (error) {
      console.error('Failed to save settings to Supabase:', error)
      // Still keep local update — UX first
    }
  },

  // Load from Supabase (only once)
  loadSettings: async () => {
    const state = get()
    if (state.isInitialized) return

    set({ isLoading: true })

    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('id', 'global')
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned → normal for first-time users
        throw error
      }

      const loaded = data || DEFAULT_SETTINGS

      set({
        settings: loaded,
        isLoading: false,
        isInitialized: true,
      })
    } catch (err) {
      console.error('Failed to load settings, using defaults:', err)
      set({
        settings: DEFAULT_SETTINGS,
        isLoading: false,
        isInitialized: true,
      })
    }
  },
}))

// Auto-load on app start (safe to call multiple times)
useSettings.getState().loadSettings()