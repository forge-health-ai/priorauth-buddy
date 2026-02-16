import { supabase } from './supabase';

/**
 * Email a generated document to the user's signup email.
 * Uses mailto: as a zero-infrastructure approach that works on all platforms.
 * For v2, swap with SendGrid/Resend server-side for cleaner UX.
 */
export async function emailLetterToSelf(
  subject: string,
  body: string,
): Promise<{ success: boolean; method: 'mailto' | 'clipboard'; email?: string }> {
  try {
    // Get user email
    let email: string | null = null;
    const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
    if (user?.email) {
      email = user.email;
    } else {
      const { data: { session } } = await supabase.auth.getSession();
      email = session?.user?.email || null;
    }

    if (!email) {
      return { success: false, method: 'mailto' };
    }

    // Use mailto link (works on web + mobile, no server needed)
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);
    const mailtoUrl = `mailto:${email}?subject=${encodedSubject}&body=${encodedBody}`;

    // On web, window.open; on mobile, Linking
    if (typeof window !== 'undefined' && window.open) {
      window.open(mailtoUrl, '_blank');
    } else {
      const { Linking } = require('react-native');
      await Linking.openURL(mailtoUrl);
    }

    return { success: true, method: 'mailto', email };
  } catch (error) {
    console.error('Email letter error:', error);
    return { success: false, method: 'mailto' };
  }
}
