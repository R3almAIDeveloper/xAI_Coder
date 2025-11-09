import { useState, useEffect } from 'react';
import { Settings } from '../types';
import { supabase, getUserId, isSupabaseConfigured } from '../lib/supabase';
import { localDb, LocalDatabase } from '../lib/localDb';

const DEFAULT_SETTINGS: Settings = {
  apiKey: '',
  baseUrl: 'https://api.x.ai',
  model: 'auto',
};

// Local storage fallback key
const LOCAL_STORAGE_KEY = 'grok-chat-settings';
export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings from localStorage as fallback
  function loadLocalSettings(): Settings {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('Loaded settings from localStorage:', {
          hasApiKey: !!parsed.apiKey,
          baseUrl: parsed.baseUrl,
          model: parsed.model
        });
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch (err) {
      console.error('Failed to load settings from localStorage:', err);
    }
    return DEFAULT_SETTINGS;
  }

  // Save settings to localStorage as backup
  function saveLocalSettings(settings: Settings) {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(settings));
      console.log('Settings saved to localStorage');
    } catch (err) {
      console.error('Failed to save settings to localStorage:', err);
    }
  }

  // Save settings to IndexedDB
  async function saveLocalDbSettings(userId: string, settings: Settings) {
    if (!LocalDatabase.isSupported()) {
      console.log('IndexedDB not supported, skipping local database save');
      return;
    }

    try {
      await localDb.saveSettings(userId, {
        api_key: settings.apiKey,
        base_url: settings.baseUrl,
        model: settings.model,
      });
      console.log('Settings saved to IndexedDB');
    } catch (err) {
      console.error('Failed to save settings to IndexedDB:', err);
    }
  }

  // Load settings from IndexedDB
  async function loadLocalDbSettings(userId: string): Promise<Settings | null> {
    if (!LocalDatabase.isSupported()) {
      console.log('IndexedDB not supported, skipping local database load');
      return null;
    }

    try {
      const data = await localDb.loadSettings(userId);
      if (data) {
        return {
          apiKey: data.api_key,
          baseUrl: data.base_url,
          model: data.model,
        };
      }
      return null;
    } catch (err) {
      console.error('Failed to load settings from IndexedDB:', err);
      return null;
    }
  }
  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const userId = getUserId();
      console.log('Loading settings for user:', userId);

      // Load from multiple sources in priority order
      const localSettings = loadLocalSettings();
      const localDbSettings = await loadLocalDbSettings(userId);
      
      // Use the most recent/complete settings available
      let fallbackSettings = localSettings;
      if (localDbSettings && localDbSettings.apiKey) {
        fallbackSettings = localDbSettings;
        console.log('Using IndexedDB settings as fallback');
      }
      
      if (localSettings.apiKey) {
        setSettings(localSettings);
      }
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error loading settings:', error);
        // Use local storage fallback if database fails
        setSettings(fallbackSettings);
      } else if (data) {
        console.log('Settings loaded from database:', {
          hasApiKey: !!data.api_key,
          baseUrl: data.base_url,
          model: data.model
        });
        const dbSettings = {
          apiKey: data.api_key,
          baseUrl: data.base_url,
          model: data.model,
        };
        setSettings(dbSettings);
        // Sync to both local storage options
        saveLocalSettings(dbSettings);
        await saveLocalDbSettings(userId, dbSettings);
      } else {
        console.log('No settings found in database, using defaults');
        setSettings(fallbackSettings);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
      // Use local storage fallback if everything fails
      const localSettings = loadLocalSettings();
      const localDbSettings = await loadLocalDbSettings(getUserId());
      setSettings(localDbSettings && localDbSettings.apiKey ? localDbSettings : localSettings);
    } finally {
      setIsLoading(false);
    }
  }

  async function updateSettings(newSettings: Settings) {
    const userId = getUserId();
    
    // Always save to local storage first for immediate persistence
    saveLocalSettings(newSettings);
    await saveLocalDbSettings(userId, newSettings);
    setSettings(newSettings);

    // Only try database if Supabase is configured
    if (!isSupabaseConfigured || !supabase) {
      console.log('Supabase not configured, using localStorage only');
      return;
    }
    try {
      console.log('Saving settings to database for user:', userId);
      
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: userId,
          api_key: newSettings.apiKey,
          base_url: newSettings.baseUrl,
          model: newSettings.model,
        }, {
          onConflict: 'user_id',
        });

      if (error) {
        console.error('Error saving settings:', error);
        // Don't throw error - local storage backup is already saved
        console.log('Settings saved to local storage as fallback');
      } else {
        console.log('Settings successfully saved to database');
      }

      // If Supabase is not configured, use local storage options
      if (!isSupabaseConfigured || !supabase) {
        console.log('Supabase not configured, using local storage only');
        setSettings(fallbackSettings);
        setIsLoading(false);
        return;
      }

      // Only try database if Supabase is configured
      if (!isSupabaseConfigured || !supabase) {
        console.log('Supabase not configured, using localStorage only');
        setSettings(localSettings);
        setIsLoading(false);
        return;
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
      // Don't throw error - local storage backup is already saved
      console.log('Using local storage persistence as fallback');
    }
  }

  return { settings, setSettings: updateSettings, isLoading };
}
