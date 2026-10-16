import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';

import { Reminder, reminderPlan } from '../game/reminders';

/**
 * Local practice reminders.
 *
 * Everything here is scheduled on the phone itself: there is no server, no push
 * token and no Apple developer account involved, which is what makes reminders
 * possible in a build that is sideloaded from a PC. The one thing to know about
 * the free signing some people use is that it lasts a week, and a reminder can
 * only be delivered while the app is still installed.
 *
 * The copy and the times come from the pure rules in src/game/reminders.ts, so
 * this file only talks to the phone.
 */

/** Every notification this app schedules is tagged so it can be found again. */
export const REMINDER_TAG = 'evoabc-practice';

export type PermissionState = 'granted' | 'denied' | 'undetermined' | 'unknown';

/**
 * How a reminder behaves if the child happens to be in the app when it lands.
 * Without this handler iOS silently drops it, which is the kind of bug that
 * looks like "reminders do not work".
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function reminderPermission(): Promise<PermissionState> {
  try {
    const status = await Notifications.getPermissionsAsync();
    if (status.granted) return 'granted';
    if (status.canAskAgain) return 'undetermined';
    return 'denied';
  } catch (error) {
    console.warn('EvoABC could not read the notification permission.', error);
    return 'unknown';
  }
}

/** Asks once, when a grown up turns reminders on. Never on app launch. */
export async function askForReminders(): Promise<PermissionState> {
  const current = await reminderPermission();
  if (current === 'granted') return 'granted';
  if (current === 'denied') return 'denied';
  try {
    const asked = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: true },
    });
    return asked.granted ? 'granted' : 'denied';
  } catch (error) {
    console.warn('EvoABC could not ask for the notification permission.', error);
    return 'unknown';
  }
}

/** The notifications this app has scheduled, ignoring anything else on the phone. */
async function scheduledByApp(): Promise<Notifications.NotificationRequest[]> {
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    return all.filter((request) => request.identifier.startsWith(REMINDER_TAG));
  } catch (error) {
    console.warn('EvoABC could not read its scheduled reminders.', error);
    return [];
  }
}

export async function cancelReminders(): Promise<void> {
  const mine = await scheduledByApp();
  await Promise.all(
    mine.map((request) =>
      Notifications.cancelScheduledNotificationAsync(request.identifier).catch(() => undefined),
    ),
  );
}

export interface ScheduleInput {
  times: number[];
  streakCount: number;
  playedToday: boolean;
  wordsReady: number;
}

/**
 * Replaces the schedule with the plan for today. Cancelling first means editing
 * the times never leaves yesterday's reminders behind, and the whole thing is
 * safe to call on every launch.
 */
export async function scheduleReminders(input: ScheduleInput): Promise<Reminder[]> {
  const plan = reminderPlan(input);
  await cancelReminders();
  if (plan.length === 0) return plan;

  const granted = (await reminderPermission()) === 'granted';
  if (!granted) return [];

  for (const reminder of plan) {
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: `${REMINDER_TAG}-${reminder.minute}`,
        content: {
          title: reminder.title,
          body: reminder.body,
          sound: true,
          badge: 1,
          categoryIdentifier: REMINDER_TAG,
          data: { route: 'play', open: reminder.role },
        },
        // A daily trigger means the same clock time every day, which is what a
        // routine needs, and iOS delivers it with the app closed.
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: Math.floor(reminder.minute / 60),
          minute: reminder.minute % 60,
        },
      });
    } catch (error) {
      console.warn(`EvoABC could not schedule the ${reminder.minute} minute reminder.`, error);
    }
  }
  return plan;
}

/** A reminder fifteen seconds from now, so a grown up can see one arrive. */
export async function sendTestReminder(): Promise<boolean> {
  const granted = (await askForReminders()) === 'granted';
  if (!granted) return false;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Reminders are working',
        body: 'This is exactly how a practice nudge will look.',
        sound: true,
        data: { route: 'play', open: 'test' },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 15 },
    });
    return true;
  } catch (error) {
    console.warn('EvoABC could not send the test reminder.', error);
    return false;
  }
}

/** The times this app is currently scheduled for, for the settings screen. */
export async function scheduledMinutes(): Promise<number[]> {
  const mine = await scheduledByApp();
  return mine
    .map((request) => {
      const trigger = request.trigger as { hour?: number; minute?: number } | null;
      if (trigger === null || trigger.hour === undefined) return null;
      return trigger.hour * 60 + (trigger.minute ?? 0);
    })
    .filter((minute): minute is number => minute !== null)
    .sort((a, b) => a - b);
}

/** Clears the number on the app icon once the child is back in the app. */
export async function clearBadge(): Promise<void> {
  try {
    await Notifications.setBadgeCountAsync(0);
  } catch {
    // A phone without badge permission is not a problem worth reporting.
  }
}

/**
 * Only used on iOS, and only because iOS hides notification permission behind
 * its own settings screen once it has been refused.
 */
export function openNotificationSettings(): void {
  Linking.openSettings().catch(() => {
    console.warn('EvoABC could not open the system settings.');
  });
}

export function notificationsSupported(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}
