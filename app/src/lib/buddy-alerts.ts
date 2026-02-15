import { Case } from './supabase';

export interface BuddyAlert {
  id: string;
  type: 'deadline' | 'coaching' | 'checkin' | 'milestone' | 'tip';
  title: string;
  message: string;
  mood: 'happy' | 'thinking' | 'angry' | 'celebrating' | 'determined' | 'curious' | 'excited';
  actionLabel?: string;
  actionRoute?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  caseId?: string;
}

export function generateAlerts(cases: Case[]): BuddyAlert[] {
  const alerts: BuddyAlert[] = [];
  const now = new Date();

  cases.forEach(c => {
    // Deadline alerts
    if (c.appeal_deadline) {
      const deadline = new Date(c.appeal_deadline);
      const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysLeft <= 0) {
        alerts.push({
          id: `deadline-expired-${c.id}`,
          type: 'deadline',
          title: 'Appeal deadline passed!',
          message: `Your appeal window for "${c.procedure_name}" has expired. You may still have options through external review.`,
          mood: 'angry',
          actionLabel: 'View Case',
          actionRoute: `/case/${c.id}`,
          priority: 'urgent',
          caseId: c.id,
        });
      } else if (daysLeft <= 3) {
        alerts.push({
          id: `deadline-critical-${c.id}`,
          type: 'deadline',
          title: `${daysLeft} day${daysLeft === 1 ? '' : 's'} left to appeal!`,
          message: `Your deadline for "${c.procedure_name}" with ${c.insurer_name} is almost here. Act now or you lose your right to appeal.`,
          mood: 'determined',
          actionLabel: 'Write Appeal Now',
          actionRoute: `/case/${c.id}`,
          priority: 'urgent',
          caseId: c.id,
        });
      } else if (daysLeft <= 7) {
        alerts.push({
          id: `deadline-warning-${c.id}`,
          type: 'deadline',
          title: `${daysLeft} days until appeal deadline`,
          message: `"${c.procedure_name}" appeal deadline is coming up. Let's get your letter ready.`,
          mood: 'thinking',
          actionLabel: 'Prepare Appeal',
          actionRoute: `/case/${c.id}`,
          priority: 'high',
          caseId: c.id,
        });
      } else if (daysLeft <= 14) {
        alerts.push({
          id: `deadline-heads-up-${c.id}`,
          type: 'deadline',
          title: `${daysLeft} days to appeal`,
          message: `Still time for "${c.procedure_name}" but don't wait too long. Stronger appeals take preparation.`,
          mood: 'curious',
          priority: 'medium',
          caseId: c.id,
        });
      }
    }

    // Stage-based coaching
    if (c.status === 'denied' && !c.appeal_deadline) {
      alerts.push({
        id: `coaching-denied-${c.id}`,
        type: 'coaching',
        title: 'Denial received. What now?',
        message: `"${c.procedure_name}" was denied by ${c.insurer_name}. 50% of denials are overturned on appeal. Let's fight this.`,
        mood: 'determined',
        actionLabel: 'Start Fighting',
        actionRoute: `/case/${c.id}`,
        priority: 'high',
        caseId: c.id,
      });
    }

    if (c.status === 'pending') {
      const created = new Date(c.created_at);
      const daysSinceCreated = Math.ceil((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));

      if (daysSinceCreated >= 7) {
        alerts.push({
          id: `checkin-pending-${c.id}`,
          type: 'checkin',
          title: 'Any updates on your case?',
          message: `It's been ${daysSinceCreated} days since you added "${c.procedure_name}". Have you heard back from ${c.insurer_name}?`,
          mood: 'curious',
          actionLabel: 'Update Status',
          actionRoute: `/case/${c.id}`,
          priority: 'low',
          caseId: c.id,
        });
      }
    }

    if (c.status === 'appealing') {
      alerts.push({
        id: `coaching-appealing-${c.id}`,
        type: 'coaching',
        title: 'Appeal in progress',
        message: `Your appeal for "${c.procedure_name}" is out there. While you wait, practice your phone script in case they call.`,
        mood: 'thinking',
        actionLabel: 'Practice Call',
        actionRoute: '/(tabs)/scripts',
        priority: 'low',
        caseId: c.id,
      });
    }

    // Milestone celebrations
    if (c.status === 'approved') {
      alerts.push({
        id: `milestone-won-${c.id}`,
        type: 'milestone',
        title: 'You won this fight!',
        message: `"${c.procedure_name}" was approved! You stood up to ${c.insurer_name} and won. That takes courage.`,
        mood: 'celebrating',
        priority: 'low',
        caseId: c.id,
      });
    }
  });

  // General tips when there are active cases
  const activeCases = cases.filter(c => ['denied', 'appealing', 'pending'].includes(c.status));
  if (activeCases.length > 0 && alerts.length < 2) {
    const tips = [
      { title: 'Document everything', message: 'Keep a log of every call, email and letter. Note the date, time, who you spoke with and what was said. This paper trail wins appeals.', mood: 'thinking' as const },
      { title: 'Request peer-to-peer review', message: 'Your doctor can speak directly with the insurer\'s medical director. This often reverses denials faster than written appeals.', mood: 'curious' as const },
      { title: 'Know your rights', message: 'Federal law requires insurers to tell you exactly why they denied your claim and how to appeal. If they haven\'t, that\'s a violation.', mood: 'determined' as const },
      { title: 'Don\'t take the first "no"', message: 'Insurance companies count on people giving up. Most denials are overturned when patients push back. You\'ve already started. Keep going.', mood: 'excited' as const },
    ];
    const tip = tips[Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % tips.length]; // Rotate daily
    alerts.push({
      id: 'daily-tip',
      type: 'tip',
      title: tip.title,
      message: tip.message,
      mood: tip.mood,
      priority: 'low',
    });
  }

  // Sort by priority
  const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
  alerts.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return alerts;
}
