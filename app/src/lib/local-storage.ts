import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const STORAGE_KEYS = {
  CASES: '@pab_cases',
  APPEALS_PREFIX: '@pab_appeals_',
  EVENTS_PREFIX: '@pab_events_',
  BACKUP_TIMESTAMP: '@pab_backup_timestamp',
} as const;

// UUID generator (RFC4122 v4)
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Types (mirroring Supabase types for compatibility)
export type CaseStatus = 
  | 'pending' 
  | 'approved' 
  | 'denied' 
  | 'appealing' 
  | 'appeal_won' 
  | 'appeal_denied' 
  | 'escalated' 
  | 'complaint_filed';

export type UrgencyLevel = 'normal' | 'urgent' | 'emergency';

export interface LocalCase {
  id: string;
  user_id: string;
  procedure_name: string;
  procedure_code?: string;
  insurer_id?: number;
  insurer_name?: string;
  policy_number?: string;
  reference_number?: string;
  provider_name?: string;
  status: CaseStatus;
  denial_reason?: string;
  denial_date?: string;
  appeal_deadline?: string;
  submitted_date?: string;
  urgency: UrgencyLevel;
  notes?: string;
  fight_score: number;
  created_at: string;
  updated_at: string;
}

export interface LocalAppeal {
  id: string;
  case_id: string;
  user_id: string;
  letter_text: string;
  letter_html?: string;
  model_used?: string;
  document_type?: 'appeal' | 'complaint';
  created_at: string;
}

export interface LocalCaseEvent {
  id: string;
  case_id: string;
  user_id: string;
  event_type: string;
  title?: string;
  description?: string;
  created_at: string;
}

export interface BackupData {
  version: string;
  exported_at: string;
  cases: LocalCase[];
  appeals: Record<string, LocalAppeal[]>; // keyed by case_id
  events: Record<string, LocalCaseEvent[]>; // keyed by case_id
}

// ==================== CASE CRUD ====================

/**
 * Get all cases for a user
 */
export async function getCases(userId: string): Promise<LocalCase[]> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEYS.CASES);
    if (!json) return [];
    
    const allCases: LocalCase[] = JSON.parse(json);
    return allCases.filter(c => c.user_id === userId).sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  } catch (error) {
    console.error('Error getting cases:', error);
    return [];
  }
}

/**
 * Get a single case by ID
 */
export async function getCase(caseId: string, userId: string): Promise<LocalCase | null> {
  try {
    const cases = await getCases(userId);
    return cases.find(c => c.id === caseId) || null;
  } catch (error) {
    console.error('Error getting case:', error);
    return null;
  }
}

/**
 * Create a new case
 */
export async function createCase(
  userId: string, 
  caseData: Omit<LocalCase, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<LocalCase> {
  try {
    const now = new Date().toISOString();
    const newCase: LocalCase = {
      ...caseData,
      id: generateUUID(),
      user_id: userId,
      created_at: now,
      updated_at: now,
    };

    const existingCases = await getCases(userId);
    const allCases = [...existingCases, newCase];
    
    await AsyncStorage.setItem(STORAGE_KEYS.CASES, JSON.stringify(allCases));
    
    // Initialize empty events and appeals for this case
    await AsyncStorage.setItem(`${STORAGE_KEYS.EVENTS_PREFIX}${newCase.id}`, JSON.stringify([]));
    await AsyncStorage.setItem(`${STORAGE_KEYS.APPEALS_PREFIX}${newCase.id}`, JSON.stringify([]));
    
    return newCase;
  } catch (error) {
    console.error('Error creating case:', error);
    throw error;
  }
}

/**
 * Update an existing case
 */
export async function updateCase(
  caseId: string,
  userId: string,
  updates: Partial<Omit<LocalCase, 'id' | 'user_id' | 'created_at'>>
): Promise<LocalCase | null> {
  try {
    const cases = await getCases(userId);
    const caseIndex = cases.findIndex(c => c.id === caseId);
    
    if (caseIndex === -1) return null;
    
    const updatedCase: LocalCase = {
      ...cases[caseIndex],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    
    cases[caseIndex] = updatedCase;
    await AsyncStorage.setItem(STORAGE_KEYS.CASES, JSON.stringify(cases));
    
    return updatedCase;
  } catch (error) {
    console.error('Error updating case:', error);
    throw error;
  }
}

/**
 * Delete a case and all associated data
 */
export async function deleteCase(caseId: string, userId: string): Promise<boolean> {
  try {
    // Remove case from cases list
    const cases = await getCases(userId);
    const filteredCases = cases.filter(c => c.id !== caseId);
    await AsyncStorage.setItem(STORAGE_KEYS.CASES, JSON.stringify(filteredCases));
    
    // Remove associated events and appeals
    await AsyncStorage.removeItem(`${STORAGE_KEYS.EVENTS_PREFIX}${caseId}`);
    await AsyncStorage.removeItem(`${STORAGE_KEYS.APPEALS_PREFIX}${caseId}`);
    
    return true;
  } catch (error) {
    console.error('Error deleting case:', error);
    return false;
  }
}

/**
 * Get case count for a user
 */
export async function getCaseCount(userId: string): Promise<number> {
  try {
    const cases = await getCases(userId);
    return cases.length;
  } catch (error) {
    console.error('Error getting case count:', error);
    return 0;
  }
}

// ==================== APPEAL CRUD ====================

/**
 * Get appeals for a specific case
 */
export async function getAppeals(caseId: string): Promise<LocalAppeal[]> {
  try {
    const json = await AsyncStorage.getItem(`${STORAGE_KEYS.APPEALS_PREFIX}${caseId}`);
    if (!json) return [];
    return JSON.parse(json).sort((a: LocalAppeal, b: LocalAppeal) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  } catch (error) {
    console.error('Error getting appeals:', error);
    return [];
  }
}

/**
 * Get all appeals for a user (across all cases)
 */
export async function getAllAppeals(userId: string): Promise<(LocalAppeal & { procedure_name?: string; insurer_name?: string })[]> {
  try {
    const cases = await getCases(userId);
    const allAppeals: (LocalAppeal & { procedure_name?: string; insurer_name?: string })[] = [];
    
    for (const caseItem of cases) {
      const appeals = await getAppeals(caseItem.id);
      appeals.forEach(appeal => {
        allAppeals.push({
          ...appeal,
          procedure_name: caseItem.procedure_name,
          insurer_name: caseItem.insurer_name,
        });
      });
    }
    
    return allAppeals.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  } catch (error) {
    console.error('Error getting all appeals:', error);
    return [];
  }
}

/**
 * Create a new appeal for a case
 */
export async function createAppeal(
  caseId: string,
  userId: string,
  appealData: Omit<LocalAppeal, 'id' | 'case_id' | 'user_id' | 'created_at'>
): Promise<LocalAppeal> {
  try {
    const newAppeal: LocalAppeal = {
      ...appealData,
      id: generateUUID(),
      case_id: caseId,
      user_id: userId,
      created_at: new Date().toISOString(),
    };

    const existingAppeals = await getAppeals(caseId);
    const allAppeals = [...existingAppeals, newAppeal];
    
    await AsyncStorage.setItem(`${STORAGE_KEYS.APPEALS_PREFIX}${caseId}`, JSON.stringify(allAppeals));
    
    return newAppeal;
  } catch (error) {
    console.error('Error creating appeal:', error);
    throw error;
  }
}

/**
 * Delete an appeal
 */
export async function deleteAppeal(caseId: string, appealId: string): Promise<boolean> {
  try {
    const appeals = await getAppeals(caseId);
    const filteredAppeals = appeals.filter(a => a.id !== appealId);
    await AsyncStorage.setItem(`${STORAGE_KEYS.APPEALS_PREFIX}${caseId}`, JSON.stringify(filteredAppeals));
    return true;
  } catch (error) {
    console.error('Error deleting appeal:', error);
    return false;
  }
}

// ==================== CASE EVENT CRUD ====================

/**
 * Get events for a specific case
 */
export async function getCaseEvents(caseId: string): Promise<LocalCaseEvent[]> {
  try {
    const json = await AsyncStorage.getItem(`${STORAGE_KEYS.EVENTS_PREFIX}${caseId}`);
    if (!json) return [];
    return JSON.parse(json).sort((a: LocalCaseEvent, b: LocalCaseEvent) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  } catch (error) {
    console.error('Error getting case events:', error);
    return [];
  }
}

/**
 * Create a new case event
 */
export async function createCaseEvent(
  caseId: string,
  userId: string,
  eventData: Omit<LocalCaseEvent, 'id' | 'case_id' | 'user_id' | 'created_at'>
): Promise<LocalCaseEvent> {
  try {
    const newEvent: LocalCaseEvent = {
      ...eventData,
      id: generateUUID(),
      case_id: caseId,
      user_id: userId,
      created_at: new Date().toISOString(),
    };

    const existingEvents = await getCaseEvents(caseId);
    const allEvents = [...existingEvents, newEvent];
    
    await AsyncStorage.setItem(`${STORAGE_KEYS.EVENTS_PREFIX}${caseId}`, JSON.stringify(allEvents));
    
    return newEvent;
  } catch (error) {
    console.error('Error creating case event:', error);
    throw error;
  }
}

/**
 * Delete a case event
 */
export async function deleteCaseEvent(caseId: string, eventId: string): Promise<boolean> {
  try {
    const events = await getCaseEvents(caseId);
    const filteredEvents = events.filter(e => e.id !== eventId);
    await AsyncStorage.setItem(`${STORAGE_KEYS.EVENTS_PREFIX}${caseId}`, JSON.stringify(filteredEvents));
    return true;
  } catch (error) {
    console.error('Error deleting case event:', error);
    return false;
  }
}

// ==================== BACKUP / EXPORT / IMPORT ====================

/**
 * Export all data for backup
 */
export async function exportData(userId: string): Promise<BackupData> {
  try {
    const cases = await getCases(userId);
    const appeals: Record<string, LocalAppeal[]> = {};
    const events: Record<string, LocalCaseEvent[]> = {};
    
    for (const caseItem of cases) {
      appeals[caseItem.id] = await getAppeals(caseItem.id);
      events[caseItem.id] = await getCaseEvents(caseItem.id);
    }
    
    const backup: BackupData = {
      version: '1.0.0',
      exported_at: new Date().toISOString(),
      cases,
      appeals,
      events,
    };
    
    await AsyncStorage.setItem(STORAGE_KEYS.BACKUP_TIMESTAMP, backup.exported_at);
    
    return backup;
  } catch (error) {
    console.error('Error exporting data:', error);
    throw error;
  }
}

/**
 * Import data from backup
 * WARNING: This will overwrite existing data!
 */
export async function importData(userId: string, backup: BackupData): Promise<{ success: boolean; imported: { cases: number; appeals: number; events: number } }> {
  try {
    // Validate backup structure
    if (!backup.cases || !Array.isArray(backup.cases)) {
      throw new Error('Invalid backup format: cases array missing');
    }
    
    // Filter cases to only include this user's cases
    const userCases = backup.cases.filter(c => c.user_id === userId);
    
    // Save cases
    await AsyncStorage.setItem(STORAGE_KEYS.CASES, JSON.stringify(userCases));
    
    let appealCount = 0;
    let eventCount = 0;
    
    // Restore appeals and events for each case
    for (const caseItem of userCases) {
      const caseAppeals = backup.appeals?.[caseItem.id] || [];
      const caseEvents = backup.events?.[caseItem.id] || [];
      
      await AsyncStorage.setItem(`${STORAGE_KEYS.APPEALS_PREFIX}${caseItem.id}`, JSON.stringify(caseAppeals));
      await AsyncStorage.setItem(`${STORAGE_KEYS.EVENTS_PREFIX}${caseItem.id}`, JSON.stringify(caseEvents));
      
      appealCount += caseAppeals.length;
      eventCount += caseEvents.length;
    }
    
    await AsyncStorage.setItem(STORAGE_KEYS.BACKUP_TIMESTAMP, new Date().toISOString());
    
    return {
      success: true,
      imported: {
        cases: userCases.length,
        appeals: appealCount,
        events: eventCount,
      },
    };
  } catch (error) {
    console.error('Error importing data:', error);
    throw error;
  }
}

/**
 * Get last backup timestamp
 */
export async function getLastBackupTime(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.BACKUP_TIMESTAMP);
  } catch (error) {
    console.error('Error getting backup time:', error);
    return null;
  }
}

/**
 * Clear all local data (for logout/account deletion)
 */
export async function clearAllLocalData(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const pabKeys = keys.filter(k => k.startsWith('@pab_'));
    await AsyncStorage.multiRemove(pabKeys);
  } catch (error) {
    console.error('Error clearing local data:', error);
    throw error;
  }
}

// ==================== STATS HELPERS ====================

/**
 * Get stats for buddy evolution (wins, appeals filed, insurers beaten)
 */
export async function getLocalStats(userId: string): Promise<{
  appealsFiled: number;
  wins: number;
  insurersBeaten: string[];
  deniedCount: number;
}> {
  try {
    const cases = await getCases(userId);
    const allAppeals = await getAllAppeals(userId);
    
    const wins = cases.filter(c => 
      c.status === 'approved' || c.status === 'appeal_won'
    ).length;
    
    const deniedCount = cases.filter(c => 
      c.status === 'denied' || c.status === 'appeal_denied'
    ).length;
    
    const insurersBeaten = [
      ...new Set(
        cases
          .filter(c => c.status === 'approved' || c.status === 'appeal_won')
          .map(c => c.insurer_name)
          .filter(Boolean)
      ),
    ] as string[];
    
    return {
      appealsFiled: allAppeals.length,
      wins,
      insurersBeaten,
      deniedCount,
    };
  } catch (error) {
    console.error('Error getting local stats:', error);
    return { appealsFiled: 0, wins: 0, insurersBeaten: [], deniedCount: 0 };
  }
}

/** Count total call log entries across all cases */
export async function getCallLogCount(userId: string): Promise<number> {
  try {
    const cases = await getCases(userId);
    let total = 0;
    for (const c of cases) {
      const raw = await AsyncStorage.getItem(`buddy_call_log_${c.id}`);
      if (raw) {
        const entries = JSON.parse(raw);
        total += Array.isArray(entries) ? entries.length : 0;
      }
    }
    return total;
  } catch { return 0; }
}

// Re-export types for compatibility with existing code
export type Case = LocalCase;
export type Appeal = LocalAppeal;
export type CaseEvent = LocalCaseEvent;