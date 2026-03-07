import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ytbofxezthnfgtmxksht.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0Ym9meGV6dGhuZmd0bXhrc2h0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NjIyMTQsImV4cCI6MjA4ODIzODIxNH0.rmQfbcDfAeXd2oW7_mJQ2ki2FRf7YzKgJN4aX6w7Hew';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});