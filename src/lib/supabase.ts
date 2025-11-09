import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create client only if environment variables are available
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export function getUserId(): string {
  let userId = localStorage.getItem('grok-user-id');

  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem('grok-user-id', userId);
    console.log('Generated new user ID:', userId);
  } else {
    console.log('Using existing user ID:', userId);
  }

  return userId;
}
