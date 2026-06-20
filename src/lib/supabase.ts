import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Client-side Supabase client (uses anon key - respects RLS)
export function getSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials not configured. Using local storage fallback.');
    return null;
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}

// Server-side Supabase admin client (uses service role key - bypasses RLS)
export function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Check if Supabase Storage is configured
export function isStorageConfigured(): boolean {
  return !!(supabaseUrl && supabaseServiceKey);
}

// Storage bucket name
export const STORAGE_BUCKET = 'notes-uploads';
