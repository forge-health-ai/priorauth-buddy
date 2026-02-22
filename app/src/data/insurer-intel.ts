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
  'Ambetter': {
    name: 'Ambetter',
    denialRate: '33%',
    avgAppealTime: '30-60 days',
    appealWindowDays: 60,
    commonDenials: ['Network restrictions', 'Prior authorization', 'Formulary exclusions'],
    bestStrategy: 'Ambetter is a Centene brand. Reference your state\'s ACA marketplace rules and Essential Health Benefits.',
    phoneHours: 'Mon-Fri 8am-5pm (varies by state)',
    escalationTip: 'File with your state marketplace if Ambetter denies a covered essential benefit.',
    proTip: 'Ambetter marketplace plans must cover all 10 ACA Essential Health Benefits. Push back if they deny something in those categories.',
  },
  'Amerigroup': {
    name: 'Amerigroup',
    denialRate: '30%',
    avgAppealTime: '30-45 days',
    appealWindowDays: 60,
    commonDenials: ['Medicaid coverage limits', 'Prior auth not obtained', 'Out of network'],
    bestStrategy: 'Amerigroup is Anthem\'s Medicaid arm. Use state Medicaid appeal rights which are often stronger than commercial plan rules.',
    phoneHours: 'Mon-Fri 8am-6pm EST',
    escalationTip: 'Request a state fair hearing if internal appeal fails. Medicaid members have this right.',
    proTip: 'Amerigroup must provide continuity of care during transitions. If they deny ongoing treatment, cite federal continuity rules.',
  },
  'CareSource': {
    name: 'CareSource',
    denialRate: '28%',
    avgAppealTime: '30-45 days',
    appealWindowDays: 60,
    commonDenials: ['Medicaid plan limits', 'Step therapy', 'Network adequacy'],
    bestStrategy: 'CareSource focuses on Medicaid/marketplace. Reference your state Medicaid handbook for covered services.',
    phoneHours: 'Mon-Fri 7am-7pm EST',
    escalationTip: 'Contact your state\'s Medicaid hotline for appeal assistance with CareSource denials.',
    proTip: 'CareSource has a dedicated Member Advocacy team. Ask for them by name when calling.',
  },
  'Geisinger': {
    name: 'Geisinger',
    denialRate: '20%',
    avgAppealTime: '15-30 days',
    appealWindowDays: 180,
    commonDenials: ['Out of network referrals', 'Medical necessity', 'Experimental treatment'],
    bestStrategy: 'Geisinger is an integrated system like Kaiser. Work with your Geisinger PCP to advocate internally first.',
    phoneHours: 'Mon-Fri 8am-5pm EST',
    escalationTip: 'Ask your Geisinger physician to contact the Medical Director directly for peer-to-peer.',
    proTip: 'Geisinger\'s integrated model means faster internal resolution. Physician advocacy is your strongest tool here.',
  },
  'Highmark': {
    name: 'Highmark',
    denialRate: '24%',
    avgAppealTime: '30-45 days',
    appealWindowDays: 180,
    commonDenials: ['Medical necessity', 'Out of network', 'Pre-certification required'],
    bestStrategy: 'Highmark is a BCBS affiliate. Use PA Act 68 external grievance rights if you\'re in Pennsylvania.',
    phoneHours: 'Mon-Fri 8am-8pm EST',
    escalationTip: 'Request a second-level clinical review if first appeal is denied.',
    proTip: 'Highmark\'s clinical policies are published online. Reference the specific policy number in your appeal.',
  },
  'Horizon BCBS': {
    name: 'Horizon BCBS',
    denialRate: '23%',
    avgAppealTime: '30-45 days',
    appealWindowDays: 180,
    commonDenials: ['Tier placement disputes', 'Medical necessity', 'Network issues'],
    bestStrategy: 'Horizon follows NJ regulations closely. Reference NJSA 26:2S for your appeal rights.',
    phoneHours: 'Mon-Fri 8am-6pm EST',
    escalationTip: 'File with NJ Dept. of Banking and Insurance if internal appeals fail.',
    proTip: 'NJ has strong consumer protections. Horizon must provide an Independent Utilization Review Organization upon request.',
  },
  'Independence Blue Cross': {
    name: 'Independence Blue Cross',
    denialRate: '25%',
    avgAppealTime: '30-45 days',
    appealWindowDays: 180,
    commonDenials: ['Medical necessity', 'Pre-authorization', 'Step therapy'],
    bestStrategy: 'IBX publishes medical policies online. Find the specific policy for your procedure and address each criterion in your appeal.',
    phoneHours: 'Mon-Fri 8am-6pm EST',
    escalationTip: 'Request external review through PA Insurance Department after exhausting internal appeals.',
    proTip: 'IBX has a Transition of Care program. If you\'re new to the plan, request continuation of ongoing treatment.',
  },
  'Medicare (Original)': {
    name: 'Medicare (Original)',
    denialRate: '15%',
    avgAppealTime: '60-90 days',
    appealWindowDays: 120,
    commonDenials: ['Not medically necessary', 'National Coverage Determination limits', 'Frequency limits'],
    bestStrategy: 'Reference specific CMS National and Local Coverage Determinations. Medicare appeals have 5 levels — use them all.',
    phoneHours: '1-800-MEDICARE (1-800-633-4227) 24/7',
    escalationTip: 'After redetermination, request Qualified Independent Contractor review. This is level 2 and often overturns denials.',
    proTip: 'Medicare must process urgent appeals within 72 hours. Always mark time-sensitive requests as urgent.',
  },
  'Oscar Health': {
    name: 'Oscar Health',
    denialRate: '27%',
    avgAppealTime: '30-45 days',
    appealWindowDays: 180,
    commonDenials: ['Network restrictions', 'Prior authorization', 'Medical necessity'],
    bestStrategy: 'Oscar is tech-forward. Use their app and portal to submit appeals with all documentation attached digitally.',
    phoneHours: 'Mon-Fri 8am-8pm EST',
    escalationTip: 'Oscar assigns a dedicated Care Team. Ask your Care Team member to advocate internally.',
    proTip: 'Oscar publishes a Surprise Bill protections page. If your denial involves emergency or out-of-network billing, check their No Surprises Act compliance.',
  },
  'Regence': {
    name: 'Regence',
    denialRate: '23%',
    avgAppealTime: '30-45 days',
    appealWindowDays: 180,
    commonDenials: ['Medical necessity', 'Experimental treatment', 'Out of network'],
    bestStrategy: 'Regence is a BCBS affiliate in the Pacific Northwest. Use WA or OR state external review rights.',
    phoneHours: 'Mon-Fri 8am-6pm PST',
    escalationTip: 'In Washington, file with the Office of the Insurance Commissioner for external review.',
    proTip: 'WA state law requires insurers to cover emergency services without prior auth. Always appeal emergency denials.',
  },
  'TRICARE': {
    name: 'TRICARE',
    denialRate: '16%',
    avgAppealTime: '30-60 days',
    appealWindowDays: 90,
    commonDenials: ['Referral not obtained', 'Non-covered benefit', 'Network restrictions'],
    bestStrategy: 'TRICARE follows Department of Defense guidelines. Reference the TRICARE Policy Manual for covered services.',
    phoneHours: 'Mon-Fri 8am-6pm EST (regional contractors vary)',
    escalationTip: 'Request a formal reconsideration from your TRICARE regional contractor, then escalate to DHA.',
    proTip: 'Active duty families have additional protections. If you\'re referred off-base, TRICARE must cover it if no military facility can provide the service.',
  },
  'WellCare': {
    name: 'WellCare',
    denialRate: '30%',
    avgAppealTime: '30-60 days',
    appealWindowDays: 60,
    commonDenials: ['Medicaid/Medicare plan limits', 'Prior auth', 'Formulary restrictions'],
    bestStrategy: 'WellCare is a Centene subsidiary. For Medicare plans, reference CMS coverage rules. For Medicaid, use state fair hearing rights.',
    phoneHours: 'Mon-Fri 8am-8pm EST',
    escalationTip: 'For Medicare plans, request an Independent Review Entity review after internal appeal.',
    proTip: 'WellCare must provide a 30-day transition supply for medications when switching plans. Demand this if prescriptions are denied.',
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
    if (key === 'Other') continue;
    if (normalized.includes(key.toLowerCase()) || key.toLowerCase().includes(normalized)) {
      return value;
    }
  }
  
  // Always return something — use "Other" as fallback
  return INSURER_INTEL['Other'];
}
