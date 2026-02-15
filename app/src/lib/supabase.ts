import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// These will be set via env or config
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Types
export interface Case {
  id: string;
  user_id: string;
  procedure_name: string;
  procedure_code?: string;
  insurer_id?: number;
  insurer_name?: string;
  policy_number?: string;
  reference_number?: string;
  provider_name?: string;
  status: 'pending' | 'approved' | 'denied' | 'appealing' | 'appeal_won' | 'appeal_denied' | 'escalated' | 'complaint_filed';
  denial_reason?: string;
  denial_date?: string;
  appeal_deadline?: string;
  submitted_date?: string;
  urgency: 'normal' | 'urgent' | 'emergency';
  notes?: string;
  fight_score: number;
  created_at: string;
  updated_at: string;
}

export interface Insurer {
  id: number;
  name: string;
  denial_rate_pct?: number;
  avg_appeal_days?: number;
  doi_complaint_url?: string;
}

export interface Appeal {
  id: string;
  case_id: string;
  user_id: string;
  letter_text: string;
  letter_html?: string;
  model_used: string;
  created_at: string;
}

export interface CallLog {
  id: string;
  case_id: string;
  user_id: string;
  rep_name?: string;
  rep_id?: string;
  call_date: string;
  duration_minutes?: number;
  outcome?: string;
  notes?: string;
  promises: Array<{ promise: string; deadline?: string }>;
  created_at: string;
}
