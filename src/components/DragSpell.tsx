import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, Text, View } from 'react-native';

import { colors, radii, shadow, spacing, type } from '../theme';
import { WordSlots } from './Spelling';
import { haptic } from '../lib/feedback';
import { playSfx } from '../audio/sfx';

/**
 * Drag and drop letter blocks. Letters are validated in order as they land:
 * the right letter snaps in and the wrong one bounces back with a wobble.
 * A plain tap on a tile places it too, which matters for small fingers and
 * for anyone who finds dragging hard.
 */

interface DragTile {
  id: string;
  letter: string;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DragSpellProps {
  word: string;
  letters: string[];
  onSolved: () => void;
  onWrong: () => void;
  locked?: boolean;
  tileSize?: number;
}

function DraggableTile({
  tile,
  size,
  disabled,
  wrong,
  dragging,
  onDragStart,
  onDragEnd,
  onTap,
  register,
}: {
  tile: DragTile;
  size: number;
  disabled: boolean;
  wrong: boolean;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: (point: { x: number; y: number }) => void;
  onTap: () => void;
  register: (id: string, api: { reset: () => void; place: () => void } | null) => void;
}) {
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const [lifted, setLifted] = useState(false);

  const snapBack = useCallback(() => {
    Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false, friction: 6, tension: 90 }).start();
  }, [pan]);

  useEffect(() => {
    register(tile.id, { reset: snapBack, place: snapBack });
    return () => register(tile.id, null);
  }, [register, snapBack, tile.id]);

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_evt, gesture) => !disabled && (Math.abs(gesture.dx) > 6 || Math.abs(gesture.dy) > 6),
        onPanResponderGrant: () => {
          setLifted(true);
          onDragStart();
        },
        onPanResponderMove: (evt, gesture) => {
          pan.setValue({ x: gesture.dx, y: gesture.dy });
          void evt;
        },
        onPanResponderRelease: (_evt, gesture) => {
          onDragEnd({ x: gesture.moveX, y: gesture.moveY });
          setLifted(false);
        },
        onPanResponderTerminate: () => {
          setLifted(false);
          snapBack();
        },
      }),
    [disabled, onDragEnd, onDragStart, pan, snapBack],
  );

  const tone = wrong ? colors.danger : colors.card;

  return (
    <Animated.View
      {...responder.panHandlers}
      style={[
        styles.dragTileWrap,
        {
          zIndex: lifted ? 40 : 1,
          transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale: lifted ? 1.12 : 1 }],
        },
      ]}
    >
      <View
        onStartShouldSetResponder={() => false}
        onResponderRelease={() => {
          if (!disabled && !lifted) onTap();
        }}
        style={[
          styles.dragTile,
          {
            width: size,
            height: size,
            borderRadius: size * 0.22,
            backgroundColor: tone,
            borderColor: wrong ? '#FFA3A6' : colors.cardLine,
            opacity: disabled ? 0.5 : 1,
          },
          shadow(lifted ? 3 : 1),
          dragging && wrong ? { borderWidth: 3 } : null,
        ]}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`Letter ${tile.letter}. Tap or drag to place it.`}
      >
        <Text style={[styles.dragLetter, { fontSize: size * 0.5, lineHeight: size * 0.6 }]}>{tile.letter}</Text>
      </View>
    </Animated.View>
  );
}

export function DragSpell({ word, letters, onSolved, onWrong, locked = false, tileSize = 58 }: DragSpellProps) {
  const [tray, setTray] = useState<DragTile[]>(() => letters.map((letter, index) => ({ id: `${letter}-${index}`, letter })));
  const [placed, setPlaced] = useState<string[]>([]);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [liftedId, setLiftedId] = useState<string | null>(null);
  const slotsRef = useRef<View | null>(null);
  const slotRect = useRef<Rect | null>(null);
  const tileApi = useRef<Map<string, { reset: () => void; place: () => void }>>(new Map());
  const solvedRef = useRef(false);

  const measureSlots = useCallback(
    () =>
      new Promise<Rect | null>((resolve) => {
        const node = slotsRef.current;
        if (node === null) {
          resolve(null);
          return;
        }
        node.measureInWindow((x, y, width, height) => {
          const rect: Rect = { x, y, width, height };
          slotRect.current = rect;
          resolve(rect);
        });
      }),
    [],
  );

  useEffect(() => {
    setTray(letters.map((letter, index) => ({ id: `${letter}-${index}`, letter })));
    setPlaced([]);
    setWrongId(null);
    solvedRef.current = false;
    slotRect.current = null;
  }, [letters, word]);

  const register = useCallback((id: string, api: { reset: () => void; place: () => void } | null) => {
    if (api === null) tileApi.current.delete(id);
    else tileApi.current.set(id, api);
  }, []);

  const attempt = useCallback(
    (tile: DragTile): boolean => {
      if (locked || solvedRef.current) return false;
      const expected = word[placed.length];
      if (tile.letter === expected) {
        const nextPlaced = [...placed, tile.letter];
        setPlaced(nextPlaced);
        setTray((current) => current.filter((item) => item.id !== tile.id));
        playSfx('tap');
        haptic('light');
        if (nextPlaced.length === word.length) {
          solvedRef.current = true;
        }
        return true;
      }
      setWrongId(tile.id);
      haptic('warning');
      setTimeout(() => setWrongId((current) => (current === tile.id ? null : current)), 460);
      onWrong();
      return false;
    },
    [locked, onWrong, placed, word],
  );

  useEffect(() => {
    if (solvedRef.current && placed.length === word.length) {
      const timer = setTimeout(() => onSolved(), 320);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [onSolved, placed.length, word.length]);

  const handleDrop = useCallback(
    async (tile: DragTile, point: { x: number; y: number }): Promise<boolean> => {
      const rect = slotRect.current ?? (await measureSlots());
      if (rect === null) return false;
      const inside =
        point.x >= rect.x - 26 && point.x <= rect.x + rect.width + 26 && point.y >= rect.y - 46 && point.y <= rect.y + rect.height + 46;
      if (!inside) return false;
      return attempt(tile);
    },
    [attempt, measureSlots],
  );

  const undo = useCallback(() => {
    if (locked || placed.length === 0) return;
    const letter = placed[placed.length - 1];
    if (letter === undefined) return;
    setPlaced((current) => current.slice(0, -1));
    setTray((current) => [...current, { id: `${letter}-undo-${current.length}`, letter }]);
    solvedRef.current = false;
    playSfx('whoosh');
    haptic('light');
  }, [locked, placed]);

  const filled: (string | null)[] = useMemo(() => Array.from({ length: word.length }, (_, index) => placed[index] ?? null), [placed, word.length]);

  return (
    <View style={styles.wrap}>
      <View ref={slotsRef} collapsable={false} onLayout={() => void measureSlots()}>
        <WordSlots total={word.length} filled={filled} activeIndex={placed.length} size={tileSize + 6} onPressSlot={() => undo()} />
      </View>
      <Text style={[type.small, styles.helper]}>{placed.length === 0 ? 'Drag a letter into the boxes, or just tap it' : 'Keep going, one letter at a time'}</Text>
      <View style={styles.tray}>
        {tray.map((tile) => (
          <DraggableTile
            key={tile.id}
            tile={tile}
            size={tileSize}
            disabled={locked}
            wrong={wrongId === tile.id}
            dragging={liftedId === tile.id}
            register={register}
            onDragStart={() => {
              setLiftedId(tile.id);
              void measureSlots();
            }}
            onDragEnd={(point) => {
              setLiftedId(null);
              void handleDrop(tile, point).then((accepted) => {
                if (!accepted) tileApi.current.get(tile.id)?.reset();
              });
            }}
            onTap={() => attempt(tile)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.md, width: '100%' },
  helper: { textAlign: 'center' },
  tray: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, minHeight: 80 },
  dragTileWrap: { alignItems: 'center', justifyContent: 'center' },
  dragTile: { alignItems: 'center', justifyContent: 'center', borderWidth: 3 },
  dragLetter: { fontFamily: 'Baloo2_800ExtraBold', color: colors.ink, textAlign: 'center' },
});
