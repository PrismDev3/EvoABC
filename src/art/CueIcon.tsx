import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
// Imported one pack at a time on purpose: the package index pulls in every
// icon font it ships, which would add about five megabytes of unused fonts to
// the app for the two packs a picture cue can use.
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { fonts } from '../theme';
import { cueColors, cueSpec } from './cues';

/**
 * Draws the picture that belongs to a word, a region or a unit.
 *
 * Every picture is a real vector icon on a soft colour plate, so it is sharp at
 * any size, matches the card it sits on, and looks the same on every phone.
 * Cues that have no icon yet fall back to the word's first letter, which is
 * still more useful than an empty box.
 */

interface CueIconProps {
  /** Cue key from the data files, for example `bee`. */
  cue: string;
  /** Plate size. Without a plate this is the icon size instead. */
  size?: number;
  /** Draw the rounded colour plate behind the icon. */
  plate?: boolean;
  /** Overrides the icon colour, mostly for inline use next to text. */
  color?: string;
  /** Letter shown when the cue has no icon. Defaults to a question mark. */
  fallback?: string;
  style?: ViewStyle;
}

export function CueIcon({ cue, size = 64, plate = true, color, fallback, style }: CueIconProps) {
  const spec = cueSpec(cue);
  const tone = cueColors(cue, spec);
  const ink = color ?? tone.ink;
  const glyphSize = plate ? size * 0.54 : size;

  const glyph =
    spec === null ? null : spec.pack === 'fa6' ? (
      <FontAwesome6 name={spec.name as never} size={glyphSize} color={ink} />
    ) : (
      <MaterialCommunityIcons name={spec.name as never} size={glyphSize} color={ink} />
    );

  const letter = (fallback ?? '?').slice(0, 1).toUpperCase();

  if (!plate) {
    return (
      <View style={style} accessible={false} importantForAccessibility="no-hide-descendants">
        {glyph ?? <Text style={{ fontFamily: fonts.display, fontSize: glyphSize, color: ink }}>{letter}</Text>}
      </View>
    );
  }

  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.plate,
        {
          width: size,
          height: size,
          borderRadius: size * 0.28,
          backgroundColor: tone.bg,
          borderColor: tone.edge,
        },
        style,
      ]}
    >
      {glyph ?? (
        <Text style={{ fontFamily: fonts.display, fontSize: size * 0.46, lineHeight: size * 0.56, color: ink }}>{letter}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  plate: { alignItems: 'center', justifyContent: 'center', borderWidth: 3, overflow: 'hidden' },
});
