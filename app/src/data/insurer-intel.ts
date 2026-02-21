export interface InsurerIntel {
  name: string;
  denialRate: string;
  avgAppealTime: string;
  appealWindowDays: number; // Standard internal appeal window in days
  commonDenials: string[];
  bestStrategy: string;
  phoneHours: string;
  escalationTip: string;
  proTip: string;
}

/** Default appeal window when insurer is unknown */
export const DEFAULT_APPEAL_WINDOW_DAYS = 30;

export const INSURER_INTEL: Record<string, InsurerIntel> = {
  'UnitedHealthcare': {
    name: 'UnitedHealthcare',
    denialRate: '32%',
    avgAppealTime: '30-45 days',
    appealWindowDays: 180,
    commonDenials: ['Medical necessity', 'Out of network', 'Prior auth not obtained'],
    bestStrategy: 'Always request peer-to-peer review immediately. UHC responds faster to physician-to-physician contact.',
    phoneHours: 'Mon-Fri 8am-8pm EST',
    escalationTip: 'Ask for the Clinical Appeals department directly.',
    proTip: 'UHC must respond to urgent requests within 72 hours per federal regulation.',
  },
  'Anthem / Elevance': {
    name: 'Anthem / Elevance',
    denialRate: '28%',
    avgAppealTime: '45-60 days',
    appealWindowDays: 180,
    commonDenials: ['Experimental treatment', 'Missing prior auth', 'In-network provider issues'],
    bestStrategy: 'Submit appeals through their online portal for faster tracking. Include all medical records upfront.',
    phoneHours: 'Mon-Fri 7am-7pm EST',
    escalationTip: 'Request a case manager assignment for complex cases.',
    proTip: 'Anthem has state-specific appeal rules. Check your state\'s Department of Insurance website for exact timelines.',
  },
  'Cigna': {
    name: 'Cigna',
    denialRate: '25%',
    avgAppealTime: '30-60 days',
    appealWindowDays: 180,
    commonDenials: ['Out of network', 'Step therapy not followed', 'Medical necessity documentation'],
    bestStrategy: 'Leverage their Patient Assurance Program. Cigna often reverses denials with adequate documentation.',
    phoneHours: 'Mon-Fri 8am-10pm EST, Sat 9am-5pm EST',
    escalationTip: 'Ask for a Medical Director callback if initial appeal is denied.',
    proTip: 'Cigna allows expedited appeals for urgent care situations. Mention specific symptoms requiring urgent treatment.',
  },
  'Aetna / CVS Health': {
    name: 'Aetna / CVS Health',
    denialRate: '26%',
    avgAppealTime: '30-45 days',
    appealWindowDays: 180,
    commonDenials: ['Pre-authorization missing', 'Out of network', 'Clinical criteria not met'],
    bestStrategy: 'Use their Clinical Policy Bulletins to reference specific criteria you meet in your appeal.',
    phoneHours: 'Mon-Fri 8am-6pm EST',
    escalationTip: 'Reference the specific Clinical Policy Bulletin number that supports your case.',
    proTip: 'Aetna\'s Expedited Complaint Process can fast-track urgent appeals. Emphasize time-sensitive medical needs.',
  },
  'Humana': {
    name: 'Humana',
    denialRate: '29%',
    avgAppealTime: '30-60 days',
    appealWindowDays: 60,
    commonDenials: ['Medicare Advantage coverage gaps', 'Prior authorization', 'Step therapy requirements'],
    bestStrategy: 'For Medicare Advantage, reference CMS guidelines. Humana must follow Medicare coverage rules.',
    phoneHours: 'Mon-Fri 8am-8pm EST',
    escalationTip: 'Request a reconsideration from the Medicare Appeals department.',
    proTip: 'Humana\'s concurrent review process allows real-time authorization during hospital stays. Ask about this option.',
  },
  'Blue Cross Blue Shield': {
    name: 'Blue Cross Blue Shield',
    denialRate: '24%',
    avgAppealTime: '30-45 days',
    appealWindowDays: 180,
    commonDenials: ['Plan-specific exclusions', 'Out of state coverage', 'Medical necessity'],
    bestStrategy: 'BCBS plans are state-specific. Know your state\'s external review laws and appeal timelines.',
    phoneHours: 'Varies by state plan, typically Mon-Fri 8am-6pm',
    escalationTip: 'Contact your state\'s BCBS association if local appeals fail.',
    proTip: 'Blue Card program covers out-of-state emergencies. Always appeal if emergency care was denied as out-of-network.',
  },
  'Kaiser Permanente': {
    name: 'Kaiser Permanente',
    denialRate: '18%',
    avgAppealTime: '15-30 days',
    appealWindowDays: 180,
    commonDenials: ['Out of network referrals', 'Non-Kaiser facility care', 'Experimental treatment'],
    bestStrategy: 'Kaiser\'s integrated system means appeals often succeed with internal physician advocacy.',
    phoneHours: '24/7 for urgent care, Mon-Fri 8am-5pm for appeals',
    escalationTip: 'Request a Member Services manager if your physician supports the treatment.',
    proTip: 'Kaiser has strict formulary rules but excellent internal appeal success rates. Work with your Kaiser doctor first.',
  },
  'Molina Healthcare': {
    name: 'Molina Healthcare',
    denialRate: '31%',
    avgAppealTime: '45-60 days',
    appealWindowDays: 60,
    commonDenials: ['State Medicaid plan limits', 'Provider network issues', 'Medical necessity'],
    bestStrategy: 'As a Medicaid-focused insurer, Molina responds well to state Medicaid office inquiries.',
    phoneHours: 'Mon-Fri 7am-7pm EST',
    escalationTip: 'Contact your state Medicaid ombudsman for unresolved denials.',
    proTip: 'Medicaid Managed Care plans like Molina must provide care coordination. Request a case manager assignment.',
  },
  'Centene': {
    name: 'Centene',
    denialRate: '34%',
    avgAppealTime: '45-60 days',
    appealWindowDays: 60,
    commonDenials: ['State plan variations', 'Network adequacy', 'Prior authorization'],
    bestStrategy: 'Centene operates under different names in each state. Know your specific state plan\'s appeal process.',
    phoneHours: 'Varies by state, typically Mon-Fri 8am-5pm',
    escalationTip: 'File a network adequacy complaint if no in-network providers are available.',
    proTip: 'Centene\'s Ambetter plans have specific Essential Health Benefits rules. Reference your state\'s EHB benchmark plan.',
  },
  'Medicare Advantage': {
    name: 'Medicare Advantage',
    denialRate: '19%',
    avgAppealTime: '60-90 days',
    appealWindowDays: 60,
    commonDenials: ['Not medically necessary', 'Medicare coverage gaps', 'Step therapy'],
    bestStrategy: 'Know your Medicare rights. You can appeal to Medicare directly after plan-level appeals are exhausted.',
    phoneHours: '1-800-MEDICARE available 24/7',
    escalationTip: 'Request an Independent Review Entity (IRE) review after the plan\'s second level appeal.',
    proTip: 'Medicare Advantage plans must cover anything Original Medicare covers. Reference CMS National Coverage Determinations.',
  },
  'Medicaid': {
    name: 'Medicaid',
    denialRate: '22%',
    avgAppealTime: '45-90 days',
    appealWindowDays: 90,
    commonDenials: ['State program limits', 'Income/asset verification', 'Medical necessity'],
    bestStrategy: 'Each state administers Medicaid differently. Contact your state Medicaid office for appeal assistance.',
    phoneHours: 'State-specific, typically business hours',
    escalationTip: 'Request a fair hearing through your state\'s administrative hearing process.',
    proTip: 'Medicaid managed care organizations must provide appeal rights notices in your preferred language. Request translation if needed.',
  },
  'Other': {
    name: 'Other',
    denialRate: '30% (avg)',
    avgAppealTime: '30-60 days',
    appealWindowDays: 30,
    commonDenials: ['Medical necessity', 'Out of network', 'Prior authorization required'],
    bestStrategy: 'Always request the specific clinical criteria used for denial. Insurers must provide this upon request.',
    phoneHours: 'Check your insurance card',
    escalationTip: 'Contact your state Department of Insurance for guidance on external appeals.',
    proTip: 'All ACA-compliant plans must provide internal and external appeal rights. You typically have 180 days to appeal.',
  },
};

/**
 * Calculate estimated appeal deadline from denial date + insurer's standard window.
 * Returns ISO date string.
 */
export function estimateAppealDeadline(insurerName: string, denialDate: Date): { deadline: Date; windowDays: number; isEstimate: boolean } {
  const intel = getInsurerIntel(insurerName);
  const windowDays = intel?.appealWindowDays || DEFAULT_APPEAL_WINDOW_DAYS;
  const deadline = new Date(denialDate);
  deadline.setDate(deadline.getDate() + windowDays);
  return { deadline, windowDays, isEstimate: true };
}

export function getInsurerIntel(insurerName: string): InsurerIntel | null {
  // Try exact match first
  if (INSURER_INTEL[insurerName]) {
    return INSURER_INTEL[insurerName];
  }
  
  // Try partial match
  const normalized = insurerName.toLowerCase();
  for (const [key, value] of Object.entries(INSURER_INTEL)) {
    if (normalized.includes(key.toLowerCase()) || key.toLowerCase().includes(normalized)) {
      return value;
    }
  }
  
  return null;
}
