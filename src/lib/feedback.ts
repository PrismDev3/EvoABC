import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';

/**
 * Touch and voice feedback. Both are optional for the player but they are the
 * difference between a quiz app and a game that feels alive.
 */

let hapticsEnabled = true;
let speechEnabled = true;
let speechRate = 0.82;

export function configureFeedback(options: { haptics: boolean; speech: boolean; speechRate: number }): void {
  hapticsEnabled = options.haptics;
  speechEnabled = options.speech;
  speechRate = options.speechRate;
}

export type HapticKind = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'select';

export function haptic(kind: HapticKind = 'light'): void {
  if (!hapticsEnabled) return;
  const run = async () => {
    switch (kind) {
      case 'medium':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'heavy':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case 'success':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'warning':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case 'error':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      case 'select':
        await Haptics.selectionAsync();
        break;
      default:
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };
  run().catch(() => {
    // haptics are best effort only
  });
}

export function speak(text: string, options: { rate?: number; pitch?: number } = {}): void {
  if (!speechEnabled) return;
  try {
    Speech.stop();
    Speech.speak(text, {
      rate: options.rate ?? speechRate,
      pitch: options.pitch ?? 1.15,
      language: 'en-US',
    });
  } catch (error) {
    console.warn('EvoABC could not speak.', error);
  }
}

export function speakSlow(text: string): void {
  if (!speechEnabled) return;
  try {
    Speech.stop();
    Speech.speak(text, { rate: Math.max(0.4, speechRate - 0.3), pitch: 1.15, language: 'en-US' });
  } catch (error) {
    console.warn('EvoABC could not speak.', error);
  }
}

export function stopSpeaking(): void {
  Speech.stop().catch(() => {
    // nothing to stop
  });
}
