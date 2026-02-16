import * as Clipboard from 'expo-clipboard';
import { Alert } from 'react-native';

/**
 * Copy a generated document to clipboard.
 */
export async function copyLetterToClipboard(
  label: string,
  body: string,
): Promise<boolean> {
  try {
    await Clipboard.setStringAsync(body);
    Alert.alert('Copied!', `${label} copied to clipboard. Paste it into an email or document.`);
    return true;
  } catch (error) {
    console.error('Copy error:', error);
    Alert.alert('Error', 'Failed to copy. Please try again.');
    return false;
  }
}

// Keep old name as alias for backward compat
export const emailLetterToSelf = (subject: string, body: string) =>
  copyLetterToClipboard(subject, body);
