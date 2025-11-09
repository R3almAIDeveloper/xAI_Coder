import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Settings } from '../types';
import { localDb, LocalDatabase } from '../lib/localDb';
import { getUserId } from '../lib/supabase';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onSave: (settings: Settings) => void;
}

function ClearDataButton({ onDataCleared }: { onDataCleared?: () => void }) {
  const handleClearData = async () => {
    if (!confirm('Are you sure you want to clear all local data? This will remove all settings stored locally in your browser.')) {
      return;
    }

    try {
      // Clear IndexedDB
      if (LocalDatabase.isSupported()) {
        await localDb.clearAllData();
        console.log('IndexedDB cleared');
      }

      // Clear localStorage
      localStorage.removeItem('grok-chat-settings');
      localStorage.removeItem('grok-user-id');
      console.log('localStorage cleared');

      // Notify parent component
      if (onDataCleared) {
        onDataCleared();
      }

      alert('Local data cleared successfully. The page will reload.');
      window.location.reload();
    } catch (error) {
      console.error('Error clearing local data:', error);
      alert('Failed to clear some local data. Check console for details.');
    }
  };

  const getStorageInfo = async () => {
    if (!LocalDatabase.isSupported()) {
      return 'localStorage only';
    }

    try {
      const userId = getUserId();
      const messageCount = await localDb.getMessageCount(userId);
      return `${messageCount} messages stored`;
    } catch (error) {
      return 'IndexedDB + localStorage';
    }
  };

  const [storageInfo, setStorageInfo] = useState('Loading...');

  useEffect(() => {
    getStorageInfo().then(setStorageInfo);
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">{storageInfo}</span>
      </div>
      <button
        type="button"
        onClick={handleClearData}
        className="text-sm text-red-600 hover:text-red-700 underline"
      >
        Clear All Local Data
      </button>
    </div>
  );
}

export function SettingsModal({ isOpen, onClose, settings, onSave }: SettingsModalProps) {
  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newSettings = {
      apiKey: formData.get('apiKey') as string,
      baseUrl: formData.get('baseUrl') as string,
      model: formData.get('model') as string,
    };
    
    try {
      await onSave(newSettings);
      onClose();
    } catch (err) {
      console.error('Failed to save settings:', err);
      // Still close the modal since localStorage backup was saved
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close settings"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            <p className="font-medium mb-1">Get your xAI API key:</p>
            <a
              href="https://console.x.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-blue-600"
            >
              console.x.ai
            </a>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">Local Storage</p>
            </div>
            <p className="text-xs text-gray-600 mb-2">
              Settings and messages are stored locally in your browser and synced to the cloud when available.
            </p>
            <ClearDataButton />
          </div>

          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-2">
              API Key
            </label>
            <input
              type="password"
              id="apiKey"
              name="apiKey"
              defaultValue={settings.apiKey}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="Enter your xAI API key"
              required
            />
          </div>

          <div>
            <label htmlFor="baseUrl" className="block text-sm font-medium text-gray-700 mb-2">
              Base URL
            </label>
            <input
              type="text"
              id="baseUrl"
              name="baseUrl"
              defaultValue={settings.baseUrl}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="https://api.x.ai"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Default: https://api.x.ai</p>
          </div>

          <div>
            <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-2">
              Model
            </label>
            <select
              id="model"
              name="model"
              defaultValue={settings.model}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
              required
            >
              <option value="auto">Auto (Best Model)</option>
              <optgroup label="Grok 4">
                <option value="grok-4">Grok 4 (Latest)</option>
                <option value="grok-4-fast-reasoning">Grok 4 Fast (Reasoning)</option>
                <option value="grok-4-fast-non-reasoning">Grok 4 Fast (Non-Reasoning)</option>
              </optgroup>
              <optgroup label="Specialized">
                <option value="grok-code-fast-1">Grok Code Fast 1</option>
              </optgroup>
              <optgroup label="Grok 3">
                <option value="grok-3">Grok 3</option>
                <option value="grok-3-fast">Grok 3 Fast</option>
                <option value="grok-3-mini">Grok 3 Mini</option>
                <option value="grok-3-mini-fast">Grok 3 Mini Fast</option>
              </optgroup>
              <optgroup label="Grok 2">
                <option value="grok-2-latest">Grok 2 (Latest)</option>
                <option value="grok-2-1212">Grok 2 (December 2024)</option>
              </optgroup>
              <optgroup label="Legacy">
                <option value="grok-beta">Grok Beta</option>
              </optgroup>
            </select>
            <p className="text-xs text-gray-500 mt-1">Auto selects the best available model</p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}