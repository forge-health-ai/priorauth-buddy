import { supabase } from './supabase';

/**
 * Anonymous outcome tracking.
 * Stores ONLY: insurer name, procedure type, outcome, appeal strategy used.
 * NO user ID, NO names, NO PHI. Just patterns that help everyone fight better.
 */
export interface AnonymousOutcome {
  insurer_name: string;
  procedure_type: string;      // imaging, surgery, specialty_med, etc.
  procedure_category: string;  // broad category like "MRI", "knee surgery"
  outcome: 'won' | 'lost' | 'pending';
  appeal_count: number;        // how many appeals were filed
  used_peer_review: boolean;
  used_doi_complaint: boolean;
  days_to_resolution: number | null;
}

/**
 * Submit an anonymous outcome. User opts in via case detail.
 * This data has NO link back to any user.
 */
export async function submitAnonymousOutcome(outcome: AnonymousOutcome): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('anonymous_outcomes')
      .insert({
        insurer_name: outcome.insurer_name,
        procedure_type: outcome.procedure_type,
        procedure_category: outcome.procedure_category,
        outcome: outcome.outcome,
        appeal_count: outcome.appeal_count,
        used_peer_review: outcome.used_peer_review,
        used_doi_complaint: outcome.used_doi_complaint,
        days_to_resolution: outcome.days_to_resolution,
      });

    if (error) {
      console.error('Outcome tracking error:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Outcome tracking error:', error);
    return false;
  }
}

/**
 * Get aggregate win rates for an insurer + procedure type.
 * Returns anonymized community intelligence.
 */
export async function getWinRate(insurerName: string, procedureType?: string): Promise<{ winRate: number; totalCases: number } | null> {
  try {
    const query = supabase
      .from('anonymous_outcomes')
      .select('outcome')
      .eq('insurer_name', insurerName);

    if (procedureType) {
      query.eq('procedure_type', procedureType);
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) return null;

    const won = data.filter(d => d.outcome === 'won').length;
    return {
      winRate: Math.round((won / data.length) * 100),
      totalCases: data.length,
    };
  } catch {
    return null;
  }
}
