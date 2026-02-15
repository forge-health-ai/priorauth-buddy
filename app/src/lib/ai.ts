// AI features via Claude Haiku
// Cost: ~$0.002 per call

import { INSURER_INTEL } from '../data/insurer-intel';

const ANTHROPIC_API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || '';
const MODEL = 'claude-3-5-haiku-20241022';

function checkApiKey() {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('AI features require an API key. Please contact support.');
  }
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

const SYSTEM_PROMPT = `You are a medical appeal letter expert. Generate a professional, persuasive appeal letter for a patient whose prior authorization or insurance claim was denied.

Rules:
- Use formal but empathetic tone
- Reference specific medical necessity arguments
- Cite relevant regulations (ERISA, state insurance laws, ACA Section 1557)
- Include proper formatting: date, addresses, reference numbers, subject line
- Reference the specific denial reason and counter it directly
- Mention the patient's right to external review
- Keep under 800 words
- Do NOT use em-dashes
- Do NOT use Oxford commas
- Output the letter text only, no commentary`;

export async function generateAppealLetter(input: AppealInput): Promise<AppealResult> {
  checkApiKey();
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

  const userPrompt = `Generate an appeal letter for:
- Procedure: ${input.procedureName}${input.procedureCode ? ` (CPT ${input.procedureCode})` : ''}
- Insurance Company: ${input.insurerName}
- Denial Reason: ${input.denialReason}
${input.providerName ? `- Treating Provider: ${input.providerName}` : ''}
${input.patientContext ? `- Additional Context: ${input.patientContext}` : ''}
${input.state ? `- Patient State: ${input.state}` : ''}
${insurerContext}

Write the appeal letter now. Use [PATIENT NAME], [PATIENT ADDRESS], [DATE] as placeholders.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error: ${response.status} ${err}`);
  }

  const data = await response.json();
  const letter = data.content?.[0]?.text || '';
  const inputTokens = data.usage?.input_tokens || 0;
  const outputTokens = data.usage?.output_tokens || 0;
  
  // Haiku pricing: $0.25/M input, $1.25/M output
  const costUsd = (inputTokens * 0.00000025) + (outputTokens * 0.00000125);

  return {
    letter,
    model: MODEL,
    inputTokens,
    outputTokens,
    costUsd,
  };
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
  checkApiKey();
  const userPrompt = `Generate a formal complaint letter to the ${input.state} Department of Insurance regarding:
- Insurance Company: ${input.insurerName}
- Denied Procedure: ${input.procedureName}
- Denial Reason: ${input.denialReason}
${input.denialDate ? `- Date of Denial: ${input.denialDate}` : ''}
${input.patientContext ? `- Context: ${input.patientContext}` : ''}

Write a concise complaint (under 500 words) that:
1. States the facts clearly
2. Explains why the denial appears improper
3. Requests investigation and intervention
4. References the patient's right to file with the state DOI
Use [PATIENT NAME], [ADDRESS], [POLICY NUMBER] as placeholders.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1000,
      system: 'You are an expert at writing formal insurance complaints to state Departments of Insurance. Be factual, concise and professional. Do NOT use em-dashes or Oxford commas.',
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  const complaint = data.content?.[0]?.text || '';
  const costUsd = ((data.usage?.input_tokens || 0) * 0.00000025) + ((data.usage?.output_tokens || 0) * 0.00000125);

  return { complaint, costUsd };
}

// ===== AI CALL COACH =====

export interface CoachMessage {
  role: 'user' | 'coach';
  content: string;
  coachFeedback?: string;
}

export interface CoachResponse {
  repResponse: string;
  feedback: string;
  mood: 'happy' | 'thinking' | 'celebrating';
  costUsd: number;
}

const COACH_SYSTEM_PROMPT = `You are a training partner helping someone practice calling their insurance company about a prior authorization. Play the role of an insurance representative. Be realistic but not hostile. After each user response, briefly stay in character, then add a [COACH] section with feedback on their tone, assertiveness, and what to try next. If you know specific things about this insurer's patterns, weave that into your coaching. Keep responses under 150 words.`;

export async function getCoachResponse(
  scenario: string,
  history: CoachMessage[],
  userMessage: string,
  exchangeCount: number
): Promise<CoachResponse> {
  const isEnding = exchangeCount >= 7;
  
  const userPrompt = `SCENARIO: ${scenario}

CONVERSATION HISTORY:
${history.map(m => `${m.role === 'user' ? 'User' : 'Insurance Rep'}: ${m.content}`).join('\n\n')}

User: ${userMessage}

${isEnding ? 'This is the final exchange. Provide a closing response and then a final [COACH] section with overall confidence score (0-100) and 3-5 personalized tips.' : 'Respond as the insurance representative, then provide [COACH] feedback.'}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 500,
      system: COACH_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  const fullText = data.content?.[0]?.text || '';
  
  // Parse the response to separate rep response and coach feedback
  const coachMatch = fullText.match(/\[COACH\]([\s\S]*)$/i);
  const repResponse = coachMatch 
    ? fullText.substring(0, fullText.indexOf('[COACH]')).trim()
    : fullText.trim();
  const feedback = coachMatch ? coachMatch[1].trim() : '';
  
  // Determine mood based on feedback
  let mood: 'happy' | 'thinking' | 'celebrating' = 'happy';
  const feedbackLower = feedback.toLowerCase();
  if (feedbackLower.includes('excellent') || feedbackLower.includes('great job') || feedbackLower.includes('nailed') || feedbackLower.includes('perfect')) {
    mood = 'celebrating';
  } else if (feedbackLower.includes('try') || feedbackLower.includes('could') || feedbackLower.includes('consider') || feedbackLower.includes('improve')) {
    mood = 'thinking';
  }
  
  const inputTokens = data.usage?.input_tokens || 0;
  const outputTokens = data.usage?.output_tokens || 0;
  const costUsd = (inputTokens * 0.00000025) + (outputTokens * 0.00000125);

  return { repResponse, feedback, mood, costUsd };
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
  const userPrompt = `Analyze this insurance denial letter${insurerName ? ` from ${insurerName}` : ''}:

"""${denialText}"""

Extract and format your response exactly as follows:

DENIAL REASON: [specific reason given]

CLINICAL CRITERIA CITED: [criteria or guidelines referenced]

REGULATORY TIMELINE: [appeal deadlines and regulatory requirements]

APPEAL ANGLES:
1. [first angle]
2. [second angle]
3. [third angle]

RECOMMENDED NEXT STEPS: [specific actionable steps]

Be specific and actionable. Do NOT use em-dashes.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 800,
      system: 'You are an expert at analyzing insurance denial letters. Extract key information and provide actionable appeal strategies. Be concise and specific.',
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || '';
  
  // Parse the response
  const denialReason = text.match(/DENIAL REASON:\s*([\s\S]*?)(?=\n\n|CLINICAL CRITERIA)/i)?.[1]?.trim() || 'Not specified';
  const clinicalCriteria = text.match(/CLINICAL CRITERIA CITED:\s*([\s\S]*?)(?=\n\n|REGULATORY TIMELINE)/i)?.[1]?.trim() || 'Not specified';
  const timeline = text.match(/REGULATORY TIMELINE:\s*([\s\S]*?)(?=\n\n|APPEAL ANGLES)/i)?.[1]?.trim() || 'Standard 180-day appeal window applies';
  
  const appealAnglesMatch = text.match(/APPEAL ANGLES:\s*([\s\S]*?)(?=\n\n|RECOMMENDED NEXT STEPS)/i)?.[1];
  const appealAngles = appealAnglesMatch
    ? appealAnglesMatch.split('\n').filter(l => l.match(/^\d+\./)).map(l => l.replace(/^\d+\.\s*/, '').trim()).slice(0, 3)
    : ['Request specific clinical criteria', 'Gather supporting documentation', 'Request peer-to-peer review'];
  
  const nextSteps = text.match(/RECOMMENDED NEXT STEPS:\s*([\s\S]*?)$/i)?.[1]?.trim() || 'Contact your insurer to request appeal instructions.';
  
  const inputTokens = data.usage?.input_tokens || 0;
  const outputTokens = data.usage?.output_tokens || 0;
  const costUsd = (inputTokens * 0.00000025) + (outputTokens * 0.00000125);

  return { denialReason, clinicalCriteria, timeline, appealAngles, nextSteps, costUsd };
}
