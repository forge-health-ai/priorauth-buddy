import { supabase } from './supabase';
import * as Clipboard from 'expo-clipboard';
import { Alert, Platform } from 'react-native';

/**
 * Email a generated document to the user's signup email.
 * Strategy:
 *   1. Copy letter to clipboard (always works)
 *   2. Open Gmail compose with pre-filled to/subject (body via clipboard)
 *   3. User pastes the letter body
 * 
 * mailto: doesn't work reliably for long bodies (2000 char URL limit).
 */
export async function emailLetterToSelf(
  subject: string,
  body: string,
): Promise<{ success: boolean; method: 'gmail' | 'clipboard'; email?: string }> {
  try {
    // Get user email
    let email: string | null = null;
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!error && user?.email) email = user.email;
    } catch {}
    if (!email) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        email = session?.user?.email || null;
      } catch {}
    }

    // Always copy to clipboard first
    await Clipboard.setStringAsync(body);

    if (!email) {
      Alert.alert(
        'Copied to Clipboard',
        'Your letter has been copied. Paste it into an email to send it.',
      );
      return { success: true, method: 'clipboard' };
    }

    // Open Gmail compose (works for Gmail users, graceful fallback for others)
    const encodedSubject = encodeURIComponent(subject);
    const gmailUrl = `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(email)}&su=${encodedSubject}&body=${encodeURIComponent('(Paste your letter here - it\'s already copied to your clipboard)')}`;

    if (typeof window !== 'undefined') {
      // Web: open Gmail compose in new tab
      window.open(gmailUrl, '_blank');
      Alert.alert(
        'Letter Copied + Email Opened',
        `Your letter is copied to clipboard. Gmail opened with ${email} pre-filled. Just paste (Ctrl+V) to add the letter body.`,
      );
    } else {
      // Mobile: use Linking
      const { Linking } = require('react-native');
      await Linking.openURL(gmailUrl);
    }

    return { success: true, method: 'gmail', email };
  } catch (error) {
    console.error('Email letter error:', error);
    // Last resort: just copy
    try {
      await Clipboard.setStringAsync(body);
      Alert.alert('Copied to Clipboard', 'Your letter has been copied. Paste it into an email.');
      return { success: true, method: 'clipboard' };
    } catch {
      return { success: false, method: 'clipboard' };
    }
  }
}
