// src/components/SettingsPage.tsx
import React, { useState, useRef } from 'react';
import { Upload, X, Check, Loader2, Save } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export const SettingsPage = () => {
  const navigate = useNavigate();
  const { settings, isLoading: storeLoading } = useSettings();

  const [isSaving, setIsSaving] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [localApiKey, setLocalApiKey] = useState(settings.apiKey);
  const [localBaseUrl, setLocalBaseUrl] = useState(settings.baseUrl);
  const [localModel, setLocalModel] = useState(settings.model);
  const [localLogoUrl, setLocalLogoUrl] = useState(settings.logoUrl);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await useSettings.getState().setSettings({
        apiKey: localApiKey.trim(),
        baseUrl: localBaseUrl.trim(),
        model: localModel,
        logoUrl: localLogoUrl,
      });
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (err) {
      alert('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    if (!file) return;
    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
      const fileName = `logo-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(fileName, file, {
          upsert: true,
          contentType: file.type || 'image/png',
          cacheControl: '3600',
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        // Better error message for common issues
        if (uploadError.message.includes('row-level security policy')) {
          alert('Upload failed: Row Level Security policy blocks uploads. Go to Supabase Dashboard → Authentication → Policies → Add policy for INSERT on storage.objects allowing anon to logos bucket.');
        } else {
          alert(`Upload failed: ${uploadError.message}`);
        }
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('logos')
        .getPublicUrl(fileName);

      // Cache-bust for fresh preview
      setLocalLogoUrl(`${data.publicUrl}?t=${Date.now()}`);
    } catch (err: any) {
      console.error('Logo upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const removeLogo = () => {
    setLocalLogoUrl('');
  };

  if (storeLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50">
      <div className="max-w-4xl mx-auto p-6 pt-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Settings
          </h1>
          <button
            onClick={() => navigate(-1)}
            className="p-3 hover:bg-white/80 rounded-xl transition-all shadow-lg"
          >
            <X size={24} />
          </button>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Left Column */}
          <div className="space-y-8">
            {/* API Key */}
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-8 shadow-xl border border-white/50">
              <h2 className="text-2xl font-bold mb-6 text-gray-800">xAI API Key</h2>
              <input
                type="password"
                value={localApiKey}
                onChange={(e) => setLocalApiKey(e.target.value)}
                placeholder="xai-..."
                className="w-full px-5 py-4 text-lg border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all"
              />
              <p className="text-sm text-gray-500 mt-3">
                Your key is stored securely and never leaves your device.
              </p>
            </div>

            {/* Base URL */}
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-8 shadow-xl border border-white/50">
              <h2 className="text-2xl font-bold mb-6 text-gray-800">API Base URL</h2>
              <input
                type="text"
                value={localBaseUrl}
                onChange={(e) => setLocalBaseUrl(e.target.value)}
                placeholder="https://api.x.ai"
                className="w-full px-5 py-4 text-lg border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all"
              />
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* Model Selection */}
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-8 shadow-xl border border-white/50">
              <h2 className="text-2xl font-bold mb-6 text-gray-800">Model</h2>
              <select
                value={localModel}
                onChange={(e) => setLocalModel(e.target.value)}
                className="w-full px-5 py-4 text-lg border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
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
            </div>

            {/* Logo Upload */}
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-8 shadow-xl border border-white/50">
              <h2 className="text-2xl font-bold mb-6 text-gray-800">Custom Logo</h2>
              
              {localLogoUrl ? (
                <div className="flex items-center gap-4 mb-6">
                  <img src={localLogoUrl} alt="Logo" className="w-24 h-24 rounded-xl shadow-lg object-cover" />
                  <button
                    onClick={removeLogo}
                    className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
                  <div className="bg-gray-100 w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <Upload size={32} className="text-gray-400" />
                  </div>
                  <p className="text-gray-600 mb-4">Upload a logo (PNG, JPG, SVG)</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:scale-105 transition-all disabled:opacity-50"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="inline mr-2 animate-spin" size={20} />
                        Uploading...
                      </>
                    ) : (
                      'Choose Image'
                    )}
                  </button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])}
                className="hidden"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="text-center mt-12">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-12 py-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xl font-bold rounded-2xl shadow-2xl hover:scale-105 transition-all disabled:opacity-70 flex items-center gap-4 mx-auto"
          >
            {isSaving ? (
              <>
                <Loader2 className="animate-spin" size={28} />
                Saving...
              </>
            ) : (
              <>
                <Save size={28} />
                Save All Settings
              </>
            )}
          </button>

          {uploadSuccess && (
            <div className="mt-6 inline-flex items-center gap-3 bg-green-100 text-green-800 px-8 py-4 rounded-full text-lg font-medium">
              <Check size={24} />
              Settings saved successfully!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};