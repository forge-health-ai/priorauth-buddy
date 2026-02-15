// Appeal letter generation via Claude Haiku
// Cost: ~$0.002 per letter

const ANTHROPIC_API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || '';

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
  const userPrompt = `Generate an appeal letter for:
- Procedure: ${input.procedureName}${input.procedureCode ? ` (CPT ${input.procedureCode})` : ''}
- Insurance Company: ${input.insurerName}
- Denial Reason: ${input.denialReason}
${input.providerName ? `- Treating Provider: ${input.providerName}` : ''}
${input.patientContext ? `- Additional Context: ${input.patientContext}` : ''}
${input.state ? `- Patient State: ${input.state}` : ''}

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
    model: 'claude-3-5-haiku-20241022',
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
      model: 'claude-3-5-haiku-20241022',
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
