/**
 * When EvoABC nudges the child to practise, and what the nudge says.
 *
 * The reminders are local notifications: this phone schedules them itself, with
 * no server and no push, so the whole rule is decided by the pure functions
 * here and only the scheduling itself lives in src/lib/notifications.ts. That
 * split is deliberate, because a reminder that fires at the wrong time or
 * repeats a sentence twice is a bug nobody can see from the code.
 *
 * Times are minutes from midnight, which keeps them easy to store, compare and
 * test. Two thousand one hundred is nine in the evening.
 */

/** How many reminders a grown up may choose, from a single nudge to a pester. */
export type ReminderCadence = 'once' | 'three' | 'five';

export interface CadenceOption {
  id: ReminderCadence;
  label: string;
  hint: string;
  /** Times of day as minutes from midnight, in order. */
  times: number[];
}

/**
 * The three choices offered in the parent zone. The five reminder setting is
 * the one that ships on, spaced seventy five minutes apart through the after
 * school slump so a child hears from the app while there is still time to play,
 * and the last one lands as the evening runs out.
 */
export const CADENCES: CadenceOption[] = [
  {
    id: 'once',
    label: 'Once a day',
    hint: 'One nudge at 6 in the evening.',
    times: [1080],
  },
  {
    id: 'three',
    label: 'Three a day',
    hint: 'After school, dinner time and bedtime.',
    times: [960, 1110, 1260],
  },
  {
    id: 'five',
    label: 'Five a day',
    hint: 'Every 75 minutes from 4 until 9 in the evening.',
    times: [960, 1035, 1110, 1185, 1260],
  },
];

export const DEFAULT_CADENCE: ReminderCadence = 'five';

/** Minutes from midnight for the five a day setting, used as the shipped default. */
export const DEFAULT_REMINDER_TIMES: number[] = CADENCES.filter((option) => option.id === DEFAULT_CADENCE)[0]?.times ?? [1260];

export function cadenceFor(times: number[]): ReminderCadence | null {
  const match = CADENCES.find((option) => option.times.join(',') === times.join(','));
  return match === null || match === undefined ? null : match.id;
}

export function timesForCadence(id: ReminderCadence): number[] {
  const match = CADENCES.find((option) => option.id === id);
  return (match?.times ?? DEFAULT_REMINDER_TIMES).slice();
}

/** A clock label for a minute of the day, in the 12 hour form a phone shows. */
export function clockLabel(minutes: number): string {
  const wrapped = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const hour24 = Math.floor(wrapped / 60);
  const minute = wrapped % 60;
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const suffix = hour24 < 12 ? 'AM' : 'PM';
  return `${hour12}:${String(minute).padStart(2, '0')} ${suffix}`;
}

/** All the times as one line, for the settings screen. */
export function clockList(times: number[]): string {
  return times.map(clockLabel).join(', ');
}

/** The job a reminder is doing, which decides how it reads. */
export type ReminderRole = 'open' | 'keep' | 'last';

export interface Reminder {
  /** Minutes from midnight. */
  minute: number;
  role: ReminderRole;
  title: string;
  body: string;
}

export interface ReminderInput {
  /** Times of day to nudge, in order. An empty list means no reminders at all. */
  times: number[];
  /** The streak the child is on, so the last reminder can defend it. */
  streakCount: number;
  /** True once the child has finished a level today. */
  playedToday: boolean;
  /** How many new words are waiting in the next level. */
  wordsReady: number;
}

/**
 * The reminders to schedule, in order.
 *
 * A child who has already practised today is not nagged: they get one friendly
 * invitation at the last time of day and nothing else, because the point is to
 * build a habit rather than to punish a good day.
 */
export function reminderPlan(input: ReminderInput): Reminder[] {
  const times = input.times
    .map((minute) => Math.round(minute))
    .filter((minute, index, list) => minute >= 0 && minute < 1440 && list.indexOf(minute) === index)
    .sort((a, b) => a - b);

  if (times.length === 0) return [];

  const last = times[times.length - 1] ?? 1260;
  const words = Math.max(1, Math.round(input.wordsReady));

  if (input.playedToday) {
    return [
      {
        minute: last,
        role: 'last',
        title: 'Bonus level?',
        body: 'Nice work today. Your dinosaur would love one more run.',
      },
    ];
  }

  const streak = Math.max(0, Math.round(input.streakCount));

  return times.map((minute, index) => {
    if (index === 0) {
      return {
        minute,
        role: 'open' as ReminderRole,
        title: 'Time to spell',
        body: `${words} words and your dinosaur grows.`,
      };
    }
    if (index === times.length - 1) {
      return {
        minute,
        role: 'last' as ReminderRole,
        title: streak > 0 ? `Your ${streak} day streak ends tonight` : 'One word before bed',
        body: streak > 0 ? 'Spell a single word to keep it going.' : 'One word is enough to start a streak.',
      };
    }
    const middles = [
      { title: 'Five more words', body: 'Your creature is still waiting for you.' },
      { title: 'Two minutes of spelling', body: 'That is all it takes for a star.' },
      { title: 'Keep the combo going', body: 'Beat your best streak from yesterday.' },
    ];
    const pick = middles[(index - 1) % middles.length] ?? middles[0];
    return {
      minute,
      role: 'keep' as ReminderRole,
      title: pick?.title ?? 'Five more words',
      body: pick?.body ?? 'Your creature is still waiting for you.',
    };
  });
}

/** Reminders never repeat a title, so the phone does not look broken. */
export function titlesAreDistinct(plan: Reminder[]): boolean {
  return new Set(plan.map((reminder) => reminder.title)).size === plan.length;
}

/** iOS keeps a hard limit of 64 pending notifications, which is plenty. */
export const MAX_SCHEDULED = 64;

export function planFitsIosLimit(plan: Reminder[]): boolean {
  return plan.length <= MAX_SCHEDULED;
}
