import { Platform, TextStyle, ViewStyle } from 'react-native';

/**
 * EvoABC visual language: bright, high contrast, rounded and chunky.
 * Jungle sky on the outside, paper white cards on the inside.
 */

export const colors = {
  skyTop: '#63D3FF',
  skyMid: '#A7E7FF',
  skyLow: '#DFF6FF',
  jungle: '#3DDC84',
  jungleDark: '#22A75D',
  leaf: '#7BE495',
  sand: '#FFE9A8',
  lava: '#FF6B35',
  lavaDark: '#D8410F',
  amber: '#FFC531',
  amberDark: '#D9930B',
  grape: '#7B5CFF',
  grapeDark: '#5533D6',
  gem: '#4FD1FF',
  gemDark: '#1899CC',
  heart: '#FF4D6D',
  heartDark: '#C81E45',
  bone: '#FFF6E5',
  ink: '#17263D',
  inkSoft: '#4A5C77',
  inkFaint: '#8A9AB3',
  card: '#FFFFFF',
  cardAlt: '#F3F8FF',
  cardLine: '#E1ECF9',
  shadow: '#0C2233',
  overlay: 'rgba(14,32,54,0.55)',
  success: '#2FD070',
  successDark: '#159A50',
  danger: '#FF5A5F',
  dangerDark: '#C42B33',
  locked: '#C9D6E4',
} as const;

export const gradients = {
  sky: ['#63D3FF', '#A7E7FF', '#EAF9FF'] as const,
  night: ['#2A2A72', '#4B3FA8', '#7B5CFF'] as const,
  lava: ['#FF9A3C', '#FF6B35', '#D8410F'] as const,
  jungle: ['#7BE495', '#3DDC84', '#1E9A55'] as const,
  grape: ['#B39CFF', '#7B5CFF', '#5533D6'] as const,
  gem: ['#9BE7FF', '#4FD1FF', '#1899CC'] as const,
  gold: ['#FFE07A', '#FFC531', '#D9930B'] as const,
  bone: ['#FFFFFF', '#FFF3D9', '#FFE3A8'] as const,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  pill: 999,
} as const;

export const fonts = {
  display: 'Baloo2_800ExtraBold',
  displayBold: 'Baloo2_700Bold',
  displayMid: 'Baloo2_600SemiBold',
  body: 'Nunito_600SemiBold',
  bodyBold: 'Nunito_700Bold',
  bodyBlack: 'Nunito_800ExtraBold',
  bodyRegular: 'Nunito_400Regular',
} as const;

/** Chunky kid friendly drop shadow. */
export function shadow(level: 0 | 1 | 2 | 3 = 1): ViewStyle {
  const config = {
    0: { radius: 0, opacity: 0, offset: 0, elevation: 0 },
    1: { radius: 8, opacity: 0.16, offset: 3, elevation: 3 },
    2: { radius: 14, opacity: 0.2, offset: 6, elevation: 7 },
    3: { radius: 22, opacity: 0.26, offset: 10, elevation: 12 },
  }[level];
  return {
    shadowColor: colors.shadow,
    shadowOpacity: config.opacity,
    shadowRadius: config.radius,
    shadowOffset: { width: 0, height: config.offset },
    elevation: config.elevation,
  };
}

export const type = {
  hero: { fontFamily: fonts.display, fontSize: 40, lineHeight: 46, color: colors.ink } as TextStyle,
  h1: { fontFamily: fonts.display, fontSize: 30, lineHeight: 36, color: colors.ink } as TextStyle,
  h2: { fontFamily: fonts.displayBold, fontSize: 23, lineHeight: 28, color: colors.ink } as TextStyle,
  h3: { fontFamily: fonts.displayMid, fontSize: 19, lineHeight: 24, color: colors.ink } as TextStyle,
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 22, color: colors.inkSoft } as TextStyle,
  bodyBold: { fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 22, color: colors.ink } as TextStyle,
  small: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.inkFaint } as TextStyle,
  button: { fontFamily: fonts.displayBold, fontSize: 20, lineHeight: 24, color: '#FFFFFF' } as TextStyle,
  tile: { fontFamily: fonts.display, fontSize: 32, lineHeight: 38, color: colors.ink } as TextStyle,
  label: { fontFamily: fonts.bodyBlack, fontSize: 12, lineHeight: 16, letterSpacing: 1.2, color: colors.inkFaint } as TextStyle,
} as const;

export const RARITY_COLORS: Record<string, { text: string; bg: string; border: string; gradient: readonly [string, string, ...string[]] }> = {
  common: { text: '#1E7A4B', bg: '#E4F8EC', border: '#8BD9AE', gradient: gradients.jungle },
  rare: { text: '#0E6FA8', bg: '#E4F4FF', border: '#7FCBF2', gradient: gradients.gem },
  epic: { text: '#5B37C9', bg: '#EFEBFF', border: '#AE9BFF', gradient: gradients.grape },
  legendary: { text: '#9A6400', bg: '#FFF6DC', border: '#F0CE6A', gradient: gradients.gold },
};

/** Strips dashes of every kind so UI copy stays clean per the project rules. */
export const dashSafe = (value: string): string => value.replace(/[\u2012\u2013\u2014\u2015]/g, '-');

export const hitSlop = { top: 8, bottom: 8, left: 8, right: 8 };

export const isIOS = Platform.OS === 'ios';
