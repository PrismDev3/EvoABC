import React from 'react';
import Svg, { Circle, G, Path, Polygon, Rect } from 'react-native-svg';

export interface IconProps {
  size?: number;
  color?: string;
}

export const HeartIcon = ({ size = 24, color = '#FF4D6D' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M12 21s-7.5-4.7-9.3-9.1C1.1 8.1 3.2 4.8 6.6 4.8c2 0 3.6 1.1 4.4 2.4.8-1.3 2.4-2.4 4.4-2.4 3.4 0 5.5 3.3 3.9 7.1C19.5 16.3 12 21 12 21z"
      fill={color}
    />
    <Path d="M8.2 7.6c-1 .2-1.8 1-2.1 2" stroke="#FFFFFF" strokeWidth={1.4} strokeLinecap="round" fill="none" opacity={0.75} />
  </Svg>
);

export const CoinIcon = ({ size = 22, color = '#FFC531', dark = '#D9930B' }: IconProps & { dark?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx={12} cy={12} r={10} fill={dark} />
    <Circle cx={12} cy={11} r={9} fill={color} />
    <Circle cx={12} cy={11} r={5.6} fill="none" stroke={dark} strokeWidth={1.6} opacity={0.5} />
    <Path d="M12 8.4v5.2M9.8 10.4h4.4" stroke={dark} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

export const GemIcon = ({ size = 22, color = '#4FD1FF' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Polygon points="12,2 21,9.4 12,22 3,9.4" fill={color} />
    <Polygon points="12,2 16.4,9.4 12,22 7.6,9.4" fill="#FFFFFF" opacity={0.32} />
    <Polygon points="3,9.4 21,9.4 12,22" fill="#0B7FA8" opacity={0.22} />
  </Svg>
);

export const StarIcon = ({ size = 22, color = '#FFC531' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.4L12 17.4 6.2 20.4l1.1-6.4L2.6 9.4l6.5-.9z" fill={color} />
  </Svg>
);

export const FlameIcon = ({ size = 24, color = '#FF6B35' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M12 2c4.2 3.2 6.4 6.4 6.4 9.9A6.4 6.4 0 0112 22a6.4 6.4 0 01-6.4-6.1c0-2.3 1-4.3 2.6-6.3.4 1.4 1.2 2.4 2.3 2.9-.2-3.6.9-7 3.5-10.5z" fill={color} />
    <Path d="M12 11.4c1.7 1.6 2.6 2.9 2.6 4.3A2.6 2.6 0 0112 18.3a2.6 2.6 0 01-2.6-2.6c0-1.4.9-2.7 2.6-4.3z" fill="#FFE07A" />
  </Svg>
);

export const EggIcon = ({ size = 24, color = '#FFF3D9', spot = '#7BE495' }: IconProps & { spot?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M12 2c4 0 7.2 6.2 7.2 10.6A7.2 7.2 0 0112 22a7.2 7.2 0 01-7.2-9.4C4.8 8.2 8 2 12 2z" fill={color} />
    <Circle cx={9.6} cy={12.4} r={1.5} fill={spot} opacity={0.85} />
    <Circle cx={14.2} cy={15.4} r={1.1} fill={spot} opacity={0.85} />
    <Circle cx={13.6} cy={9.2} r={0.9} fill={spot} opacity={0.7} />
  </Svg>
);

export const LockIcon = ({ size = 22, color = '#8A9AB3' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M7.4 10.2V8.4a4.6 4.6 0 019.2 0v1.8" stroke={color} strokeWidth={2.2} fill="none" strokeLinecap="round" />
    <Rect x={4.2} y={10} width={15.6} height={11} rx={3.2} fill={color} />
    <Circle cx={12} cy={15} r={1.7} fill="#FFFFFF" />
  </Svg>
);

export const CheckIcon = ({ size = 22, color = '#FFFFFF' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M5 12.6l4.4 4.4L19 7.4" stroke={color} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </Svg>
);

export const CloseIcon = ({ size = 22, color = '#FFFFFF' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M6.4 6.4l11.2 11.2M17.6 6.4L6.4 17.6" stroke={color} strokeWidth={3.2} strokeLinecap="round" />
  </Svg>
);

export const BackIcon = ({ size = 26, color = '#17263D' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M14.6 5.4L8 12l6.6 6.6" stroke={color} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </Svg>
);

export const PlayIcon = ({ size = 30, color = '#FFFFFF' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M7.5 4.6l11.4 7.4-11.4 7.4z" fill={color} />
  </Svg>
);

export const SoundOnIcon = ({ size = 24, color = '#17263D' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Polygon points="4,9.4 7.6,9.4 12,5.4 12,18.6 7.6,14.6 4,14.6" fill={color} />
    <Path d="M15 9.2a4 4 0 010 5.6M17.6 6.8a7.6 7.6 0 010 10.4" stroke={color} strokeWidth={2} strokeLinecap="round" fill="none" />
  </Svg>
);

export const SoundOffIcon = ({ size = 24, color = '#8A9AB3' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Polygon points="4,9.4 7.6,9.4 12,5.4 12,18.6 7.6,14.6 4,14.6" fill={color} />
    <Path d="M15.4 9.6l5 4.8M20.4 9.6l-5 4.8" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
  </Svg>
);

/** Speaker with a single wave, used for anything that plays a sound. */
export const SpeakerIcon = ({ size = 24, color = '#4FD1FF' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Polygon points="3.4,9 7,9 11.6,5 11.6,19 7,15 3.4,15" fill={color} />
    <Path d="M15.2 9.6a3.6 3.6 0 010 4.8" stroke={color} strokeWidth={2.1} strokeLinecap="round" fill="none" />
  </Svg>
);

/** Note with a flag, used for the background music row. */
export const MusicIcon = ({ size = 24, color = '#7B5CFF' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx={8.4} cy={17} r={3.4} fill={color} />
    <Rect x={10.9} y={4.2} width={2.4} height={12.8} rx={1.2} fill={color} />
    <Path d="M13.2 4.3c3.2.8 5.6 2.6 6.8 5.5-2.2-1.7-4.4-2.5-6.8-2.7z" fill={color} />
  </Svg>
);

/** Phone with motion lines, used for the vibration row. */
export const VibrateIcon = ({ size = 24, color = '#3DDC84' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Rect x={8.6} y={3.6} width={6.8} height={16.8} rx={2.4} fill={color} />
    <Rect x={10.4} y={5.8} width={3.2} height={1.5} rx={0.75} fill="#FFFFFF" opacity={0.85} />
    <Path d="M5.6 8.6c-1.2 2.1-1.2 4.7 0 6.8" stroke={color} strokeWidth={1.8} strokeLinecap="round" fill="none" opacity={0.75} />
    <Path d="M18.4 8.6c1.2 2.1 1.2 4.7 0 6.8" stroke={color} strokeWidth={1.8} strokeLinecap="round" fill="none" opacity={0.75} />
  </Svg>
);

/** Microphone on a stand, used for the reading voice and the word pace. */
export const MicIcon = ({ size = 24, color = '#FF4D6D' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Rect x={8.6} y={2.6} width={6.8} height={11.4} rx={3.4} fill={color} />
    <Path d="M5.6 11.2a6.4 6.4 0 0012.8 0" stroke={color} strokeWidth={2.1} strokeLinecap="round" fill="none" />
    <Path d="M12 17.8v3.4M9 21.2h6" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

/** Bell, used for the practice reminder row. */
export const BellIcon = ({ size = 24, color = '#FFC531' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M12 2.4c-3.3 0-5.7 2.5-5.7 5.8 0 3.4-.6 5-1.6 6.3-.5.7-.1 1.6.8 1.6h13c.9 0 1.3-.9.8-1.6-1-1.3-1.6-2.9-1.6-6.3 0-3.3-2.4-5.8-5.7-5.8z"
      fill={color}
    />
    <Path d="M9.7 18.6a2.3 2.3 0 004.6 0" stroke={color} strokeWidth={2} strokeLinecap="round" fill="none" />
    <Path d="M12 4.2V1.4" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
  </Svg>
);

export const MapIcon = ({ size = 24, color = '#3DDC84' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M3 6.6l6-2.2 6 2.2 6-2.2v13l-6 2.2-6-2.2-6 2.2z" fill={color} opacity={0.28} />
    <Path d="M9 4.4v13.4M15 6.6V20" stroke={color} strokeWidth={2} />
    <Path d="M3 6.6l6-2.2v13.4l-6 2.2zM15 6.6l6-2.2v13l-6 2.2z" fill={color} />
  </Svg>
);

export const TrophyIcon = ({ size = 24, color = '#FFC531' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M7 4h10v5.4a5 5 0 01-10 0z" fill={color} />
    <Path d="M7 5.4H4.6v1.8A3.4 3.4 0 008 10.6M17 5.4h2.4v1.8A3.4 3.4 0 0116 10.6" stroke={color} strokeWidth={1.8} fill="none" />
    <Rect x={10} y={15} width={4} height={4} fill={color} />
    <Rect x={7.4} y={18.6} width={9.2} height={2.4} rx={1.2} fill={color} />
  </Svg>
);

export const SparkleIcon = ({ size = 20, color = '#FFE07A' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M12 2.4l1.9 5.8 5.7 1.9-5.7 1.9L12 17.8l-1.9-5.8L4.4 10.1l5.7-1.9z" fill={color} />
  </Svg>
);

export const PawIcon = ({ size = 22, color = '#7B5CFF' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <G>
      <Circle cx={7.4} cy={8.6} r={2.4} fill={color} />
      <Circle cx={12} cy={6.6} r={2.6} fill={color} />
      <Circle cx={16.6} cy={8.6} r={2.4} fill={color} />
      <Path d="M12 11.4c3.4 0 6 2.4 6 5.2S15.4 21 12 21s-6-1.6-6-4.4 2.6-5.2 6-5.2z" fill={color} />
    </G>
  </Svg>
);

/**
 * A cog, drawn from its measurements rather than traced by hand.
 *
 * The old one was a hand written outline: the teeth came out slightly different
 * sizes, the body was not round, and the middle of it was a white disc. A white
 * disc is only a hole on a white background, so on a coloured badge it read as a
 * blob with a sticker on it. This one is generated instead: eight teeth of
 * exactly equal size on a real circle, and a genuine see through hole cut with
 * the even odd fill rule, so it sits correctly on any colour underneath.
 */
function gearPath({ teeth = 8, outer = 10.1, root = 7.9, hole = 3.4, centre = 12 } = {}): string {
  const step = (Math.PI * 2) / teeth;
  // Half of a tooth tip, and the sliver of root between one tooth and the next.
  const tip = step * 0.28;
  const gap = step * 0.22;
  // Angles start at the top and run clockwise, which is the direction the arc
  // sweep flags below assume.
  const at = (angle: number, radius: number): string => {
    const x = centre + radius * Math.cos(angle - Math.PI / 2);
    const y = centre + radius * Math.sin(angle - Math.PI / 2);
    return `${x.toFixed(2)} ${y.toFixed(2)}`;
  };
  const along = (radius: number, from: number, to: number): string => `A ${radius} ${radius} 0 0 1 ${at(to, radius)}`;

  let d = `M ${at(-tip, outer)}`;
  for (let index = 0; index < teeth; index += 1) {
    const middle = index * step;
    d += ` ${along(outer, middle - tip, middle + tip)}`;
    d += ` L ${at(middle + tip + gap, root)}`;
    d += ` ${along(root, middle + tip + gap, middle + step - tip - gap)}`;
    // The closing line of the last tooth back to the first is the path's own Z.
    if (index < teeth - 1) d += ` L ${at((index + 1) * step - tip, outer)}`;
  }
  d += ' Z';
  // The hole, as a second subpath: even odd makes it an opening rather than
  // another filled shape.
  d += ` M ${at(0, hole)} A ${hole} ${hole} 0 1 1 ${at(Math.PI, hole)} A ${hole} ${hole} 0 1 1 ${at(Math.PI * 2, hole)} Z`;
  return d;
}

export const GearsIcon = ({ size = 24, color = '#4A5C77' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d={gearPath()} fill={color} fillRule="evenodd" />
  </Svg>
);

export const CrownIcon = ({ size = 24, color = '#FFC531' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Polygon points="3,7.4 7.4,11 12,4.4 16.6,11 21,7.4 19,18.6 5,18.6" fill={color} />
    <Rect x={5} y={18.6} width={14} height={2.2} rx={1.1} fill={color} />
  </Svg>
);
