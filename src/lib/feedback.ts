import * as Haptics from 'expo-haptics';

import { speakLine, speakWordSlow, stopSpeech } from './tts';

/**
 * Touch and voice feedback. Both are optional for the player but they are the
 * difference between a quiz app and a game that feels alive.
 *
 * Speech lives in src/lib/tts.ts, which owns the voice, the pace and the queue.
 * Anything here just forwards to it, so the whole app speaks with one voice at
 * one speed instead of two settings fighting each other.
 */

let hapticsEnabled = true;

/** The speech flag itself is applied by configureTts, kept for one setting store. */
export function configureFeedback(options: { haptics: boolean; speech: boolean; speechRate: number }): void {
  hapticsEnabled = options.haptics;
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
  speakLine(text, options);
}

export function speakSlow(text: string): void {
  speakWordSlow(text);
}

export function stopSpeaking(): void {
  stopSpeech();
}
