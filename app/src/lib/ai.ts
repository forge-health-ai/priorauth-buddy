// AI features via server-side proxy
// Protects API keys from client-side exposure (App Store requirement)

import { INSURER_INTEL } from '../data/insurer-intel';
import { supabase } from './supabase';

// Get the current user's auth token
async function getAuthToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Authentication required. Please sign in.');
  }
  return session.access_token;
}

// API base URL — relative on web (Vercel), absolute on native
import { Platform } from 'react-native';
const API_BASE = Platform.OS === 'web' ? '' : 'https://priorauth-buddy.vercel.app';

// Call the AI proxy API
async function callAiproxy(action: string, payload: any): Promise<any> {
  const token = await getAuthToken();
  
  const response = await fetch(`${API_BASE}/api/ai`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ action, payload }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    if (response.status === 401) {
      throw new Error('Your session has expired. Please sign in again.');
    }
    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again in a moment.');
    }
    throw new Error(errorData.error || `AI service error: ${response.status}`);
  }

  return await response.json();
}

interface AppealInput {
  procedureName: string;
  procedureCode?: string;
  insurerName: string;
  denialReason: string;
  providerName?: string;
  patientContext?: string;
  state?: string;
}

interface AppealResult {
  letter: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export async function generateAppealLetter(input: AppealInput): Promise<AppealResult> {
  // Get insurer-specific intelligence
  const intel = INSURER_INTEL[input.insurerName];
  const insurerContext = intel ? `

INSURER INTELLIGENCE (use this to tailor the letter):
- ${input.insurerName} has a ${intel.denialRate} denial rate
- Common denial patterns: ${intel.commonDenials.join(', ')}
- What works against them: ${intel.bestStrategy}
- Escalation approach: ${intel.escalationTip}
- Key leverage: ${intel.proTip}
- Average appeal timeline: ${intel.avgAppealTime}

Use this intelligence to craft language specifically calibrated for ${input.insurerName}. Reference their known criteria and review processes. Include escalation language that this insurer responds to.` : '';

  return await callAiproxy('generateAppeal', {
    ...input,
    insurerContext,
  });
}

// DOI Complaint generator
export async function generateDOIComplaint(input: {
  procedureName: string;
  insurerName: string;
  denialReason: string;
  denialDate?: string;
  state: string;
  patientContext?: string;
}): Promise<{ complaint: string; costUsd: number }> {
  return await callAiproxy('generateComplaint', input);
}

// ===== AI CALL COACH =====

export interface CoachMessage {
  role: 'user' | 'coach' | 'tip';
  content: string;
  coachFeedback?: string;
}

export interface CoachResponse {
  repResponse: string;
  feedback: string;
  mood: 'happy' | 'thinking' | 'celebrating';
  costUsd: number;
}

export async function getCoachResponse(
  scenario: string,
  history: CoachMessage[],
  userMessage: string,
  exchangeCount: number
): Promise<CoachResponse> {
  return await callAiproxy('getCoachResponse', {
    scenario,
    history,
    userMessage,
    exchangeCount,
  });
}

// ===== AI DENIAL ANALYZER =====

export interface DenialAnalysis {
  denialReason: string;
  clinicalCriteria: string;
  timeline: string;
  appealAngles: string[];
  nextSteps: string;
  costUsd: number;
}

export async function analyzeDenialLetter(
  denialText: string,
  insurerName?: string
): Promise<DenialAnalysis> {
  return await callAiproxy('analyzeDenial', {
    denialText,
    insurerName,
  });
}
