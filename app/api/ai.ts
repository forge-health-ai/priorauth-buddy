// Vercel Serverless API Route for PriorAuth Buddy AI Proxy
// Handles Anthropic API calls server-side to protect API keys

import { IncomingMessage, ServerResponse } from 'http';

// Rate limiting (simple in-memory, resets on cold start)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 20; // requests per minute per user
const RATE_WINDOW = 60 * 1000; // 1 minute

// Anthropic configuration
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const MODEL = 'claude-3-haiku-20240307';

interface AppealInput {
  procedureName: string;
  procedureCode?: string;
  insurerName: string;
  denialReason: string;
  providerName?: string;
  patientContext?: string;
  state?: string;
}

interface CoachMessage {
  role: 'user' | 'coach';
  content: string;
  coachFeedback?: string;
}

// System prompts (same as client-side)
const SYSTEM_PROMPTS: Record<string, string> = {
  generateAppeal: `You are a medical appeal letter expert. Generate a professional, persuasive appeal letter for a patient whose prior authorization or insurance claim was denied.

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
- Output the letter text only, no commentary`,

  generateComplaint: `You are an expert at writing formal insurance complaints to state Departments of Insurance. Be factual, concise and professional. Do NOT use em-dashes or Oxford commas.`,

  getCoachResponse: `You are a training partner helping someone practice calling their insurance company about a prior authorization. Play the role of an insurance representative. Be realistic but not hostile. After each user response, briefly stay in character, then add a [COACH] section with feedback on their tone, assertiveness, and what to try next. If you know specific things about this insurer's patterns, weave that into your coaching. Keep responses under 150 words.`,

  analyzeDenial: `You are an expert at analyzing insurance denial letters. Extract key information and provide actionable appeal strategies. Be concise and specific.`,
};

// Simple rate limiter
function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(userId);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

// Parse JSON body from request
function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

// Set CORS headers
function setCorsHeaders(res: ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// Validate Supabase JWT token
async function validateAuthToken(token: string): Promise<{ valid: boolean; userId?: string }> {
  try {
    const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
    
    const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
      },
    });

    if (!response.ok) {
      return { valid: false };
    }

    const user = await response.json();
    return { valid: true, userId: user.id };
  } catch (error) {
    console.error('Auth validation error:', error);
    return { valid: false };
  }
}

// Call Anthropic API
async function callAnthropic(systemPrompt: string, userPrompt: string, maxTokens: number) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error: ${response.status} ${errorText}`);
  }

  return await response.json();
}

// Calculate cost based on Haiku pricing: $0.25/M input, $1.25/M output
function calculateCost(inputTokens: number, outputTokens: number): number {
  return (inputTokens * 0.00000025) + (outputTokens * 0.00000125);
}

// Generate appeal letter prompt
function generateAppealPrompt(input: AppealInput, insurerContext: string): string {
  return `Generate an appeal letter for:
- Procedure: ${input.procedureName}${input.procedureCode ? ` (CPT ${input.procedureCode})` : ''}
- Insurance Company: ${input.insurerName}
- Denial Reason: ${input.denialReason}
${input.providerName ? `- Treating Provider: ${input.providerName}` : ''}
${input.patientContext ? `- Additional Context: ${input.patientContext}` : ''}
${input.state ? `- Patient State: ${input.state}` : ''}
${insurerContext}

Write the appeal letter now. Use [PATIENT NAME], [PATIENT ADDRESS], [DATE] as placeholders.`;
}

// Generate DOI complaint prompt
function generateComplaintPrompt(input: {
  procedureName: string;
  insurerName: string;
  denialReason: string;
  denialDate?: string;
  state: string;
  patientContext?: string;
}): string {
  return `Generate a formal complaint letter to the ${input.state} Department of Insurance regarding:
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
}

// Generate coach prompt
function generateCoachPrompt(
  scenario: string,
  history: CoachMessage[],
  userMessage: string,
  isEnding: boolean
): string {
  return `SCENARIO: ${scenario}

CONVERSATION HISTORY:
${history.map(m => `${m.role === 'user' ? 'User' : 'Insurance Rep'}: ${m.content}`).join('\n\n')}

User: ${userMessage}

${isEnding ? 'This is the final exchange. Provide a closing response and then a final [COACH] section with overall confidence score (0-100) and 3-5 personalized tips.' : 'Respond as the insurance representative, then provide [COACH] feedback.'}`;
}

// Generate denial analysis prompt
function generateDenialPrompt(denialText: string, insurerName?: string): string {
  return `Analyze this insurance denial letter${insurerName ? ` from ${insurerName}` : ''}:

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
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  // Set CORS headers
  setCorsHeaders(res);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  // Only accept POST
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  // Check API key is configured
  if (!ANTHROPIC_API_KEY) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'AI service not configured' }));
    return;
  }

  // Validate auth token
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.statusCode = 401;
    res.end(JSON.stringify({ error: 'Authorization required' }));
    return;
  }

  const token = authHeader.slice(7);
  const { valid, userId } = await validateAuthToken(token);

  if (!valid || !userId) {
    res.statusCode = 401;
    res.end(JSON.stringify({ error: 'Invalid or expired token' }));
    return;
  }

  // Check rate limit
  if (!checkRateLimit(userId)) {
    res.statusCode = 429;
    res.end(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }));
    return;
  }

  try {
    const { action, payload } = await parseBody(req);

    if (!action || !payload) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'Missing action or payload' }));
      return;
    }

    let result: any;

    switch (action) {
      case 'generateAppeal': {
        const input = payload as AppealInput;
        const insurerContext = payload.insurerContext || '';
        const userPrompt = generateAppealPrompt(input, insurerContext);
        
        const data = await callAnthropic(SYSTEM_PROMPTS.generateAppeal, userPrompt, 1500);
        const letter = data.content?.[0]?.text || '';
        const inputTokens = data.usage?.input_tokens || 0;
        const outputTokens = data.usage?.output_tokens || 0;

        result = {
          letter,
          model: MODEL,
          inputTokens,
          outputTokens,
          costUsd: calculateCost(inputTokens, outputTokens),
        };
        break;
      }

      case 'generateComplaint': {
        const input = payload as {
          procedureName: string;
          insurerName: string;
          denialReason: string;
          denialDate?: string;
          state: string;
          patientContext?: string;
        };
        const userPrompt = generateComplaintPrompt(input);

        const data = await callAnthropic(SYSTEM_PROMPTS.generateComplaint, userPrompt, 1000);
        const complaint = data.content?.[0]?.text || '';
        const inputTokens = data.usage?.input_tokens || 0;
        const outputTokens = data.usage?.output_tokens || 0;

        result = {
          complaint,
          costUsd: calculateCost(inputTokens, outputTokens),
        };
        break;
      }

      case 'getCoachResponse': {
        const { scenario, history, userMessage, exchangeCount } = payload as {
          scenario: string;
          history: CoachMessage[];
          userMessage: string;
          exchangeCount: number;
        };
        const isEnding = exchangeCount >= 7;
        const userPrompt = generateCoachPrompt(scenario, history, userMessage, isEnding);

        const data = await callAnthropic(SYSTEM_PROMPTS.getCoachResponse, userPrompt, 500);
        const fullText = data.content?.[0]?.text || '';
        const inputTokens = data.usage?.input_tokens || 0;
        const outputTokens = data.usage?.output_tokens || 0;

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

        result = {
          repResponse,
          feedback,
          mood,
          costUsd: calculateCost(inputTokens, outputTokens),
        };
        break;
      }

      case 'analyzeDenial': {
        const { denialText, insurerName } = payload as {
          denialText: string;
          insurerName?: string;
        };
        const userPrompt = generateDenialPrompt(denialText, insurerName);

        const data = await callAnthropic(SYSTEM_PROMPTS.analyzeDenial, userPrompt, 800);
        const text = data.content?.[0]?.text || '';
        const inputTokens = data.usage?.input_tokens || 0;
        const outputTokens = data.usage?.output_tokens || 0;

        // Parse the response
        const denialReason = text.match(/DENIAL REASON:\s*([\s\S]*?)(?=\n\n|CLINICAL CRITERIA)/i)?.[1]?.trim() || 'Not specified';
        const clinicalCriteria = text.match(/CLINICAL CRITERIA CITED:\s*([\s\S]*?)(?=\n\n|REGULATORY TIMELINE)/i)?.[1]?.trim() || 'Not specified';
        const timeline = text.match(/REGULATORY TIMELINE:\s*([\s\S]*?)(?=\n\n|APPEAL ANGLES)/i)?.[1]?.trim() || 'Standard 180-day appeal window applies';

        const appealAnglesMatch = text.match(/APPEAL ANGLES:\s*([\s\S]*?)(?=\n\n|RECOMMENDED NEXT STEPS)/i)?.[1];
        const appealAngles = appealAnglesMatch
          ? appealAnglesMatch.split('\n').filter(l => l.match(/^\d+\./)).map(l => l.replace(/^\d+\.\s*/, '').trim()).slice(0, 3)
          : ['Request specific clinical criteria', 'Gather supporting documentation', 'Request peer-to-peer review'];

        const nextSteps = text.match(/RECOMMENDED NEXT STEPS:\s*([\s\S]*?)$/i)?.[1]?.trim() || 'Contact your insurer to request appeal instructions.';

        result = {
          denialReason,
          clinicalCriteria,
          timeline,
          appealAngles,
          nextSteps,
          costUsd: calculateCost(inputTokens, outputTokens),
        };
        break;
      }

      default:
        res.statusCode = 400;
        res.end(JSON.stringify({ error: `Unknown action: ${action}` }));
        return;
    }

    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(JSON.stringify(result));

  } catch (error: any) {
    console.error('AI proxy error:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: error.message || 'Internal server error' }));
  }
}
