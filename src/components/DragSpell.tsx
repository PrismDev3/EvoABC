import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, Text, View } from 'react-native';

import { colors, radii, shadow, spacing, type } from '../theme';
import { WordSlots } from './Spelling';
import { haptic } from '../lib/feedback';
import { playSfx } from '../audio/sfx';

/**
 * Drag and drop letter blocks. Letters are checked in order as they land: the
 * right letter snaps into the row and the wrong one bounces back with a wobble.
 *
 * The gesture handling here is deliberate. A plain PanResponder that only asks
 * for the responder once the finger has already moved loses the fight with the
 * ScrollView it sits inside, which is why dragging a letter used to do nothing
 * at all. Instead each tile claims the responder the moment a finger touches
 * it, waits to see whether the finger travels more than a few points, and then
 * decides by itself whether this was a drag or a tap. The screen is also told
 * to stop scrolling while a tile is up, so the board cannot slide away under
 * the finger.
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

/** How far a finger may travel before a touch counts as a drag, not a tap. */
const TAP_SLOP = 9;
/** How far outside the letter row a drop still counts, in points. */
const DROP_SLOP = 74;

interface DragSpellProps {
  word: string;
  letters: string[];
  onSolved: () => void;
  onWrong: () => void;
  locked?: boolean;
  tileSize?: number;
  /** Told when a tile is picked up and put down, so the page can stop scrolling. */
  onDragStateChange?: (dragging: boolean) => void;
}

interface TileApi {
  reset: () => void;
}

function DraggableTile({
  tile,
  size,
  disabled,
  wrong,
  lifted,
  onPickUp,
  onDrop,
  onTap,
  register,
}: {
  tile: DragTile;
  size: number;
  disabled: boolean;
  wrong: boolean;
  lifted: boolean;
  onPickUp: () => void;
  onDrop: (point: { x: number; y: number }) => void;
  onTap: () => void;
  register: (id: string, api: TileApi | null) => void;
}) {
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const [held, setHeld] = useState(false);

  const snapBack = useCallback(() => {
    Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false, friction: 7, tension: 110 }).start();
  }, [pan]);

  useEffect(() => {
    register(tile.id, { reset: snapBack });
    return () => register(tile.id, null);
  }, [register, snapBack, tile.id]);

  const responder = useMemo(
    () =>
      PanResponder.create({
        // Claim the touch straight away: waiting for movement hands the gesture
        // to whatever ScrollView is around us.
        onStartShouldSetPanResponder: () => !disabled,
        onStartShouldSetPanResponderCapture: () => !disabled,
        onMoveShouldSetPanResponder: () => !disabled,
        onPanResponderGrant: () => {
          setHeld(true);
          onPickUp();
        },
        onPanResponderMove: (_event, gesture) => {
          pan.setValue({ x: gesture.dx, y: gesture.dy });
        },
        onPanResponderRelease: (_event, gesture) => {
          setHeld(false);
          if (Math.abs(gesture.dx) < TAP_SLOP && Math.abs(gesture.dy) < TAP_SLOP) {
            onTap();
            return;
          }
          onDrop({ x: gesture.moveX, y: gesture.moveY });
        },
        onPanResponderTerminate: () => {
          setHeld(false);
          snapBack();
          onDrop({ x: -1, y: -1 });
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [disabled, onDrop, onPickUp, onTap, pan, snapBack],
  );

  const tone = wrong ? colors.danger : colors.card;
  const raised = held || lifted;

  return (
    <Animated.View
      {...responder.panHandlers}
      style={[
        styles.dragTileWrap,
        {
          zIndex: raised ? 40 : 1,
          transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale: raised ? 1.14 : 1 }],
        },
      ]}
    >
      <View
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
          shadow(raised ? 3 : 1),
        ]}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`Letter ${tile.letter}. Tap it or drag it into the boxes.`}
      >
        <Text style={[styles.dragLetter, { fontSize: size * 0.5, lineHeight: size * 0.6 }]}>{tile.letter}</Text>
      </View>
    </Animated.View>
  );
}

export function DragSpell({
  word,
  letters,
  onSolved,
  onWrong,
  locked = false,
  tileSize = 58,
  onDragStateChange,
}: DragSpellProps) {
  const [tray, setTray] = useState<DragTile[]>(() => letters.map((letter, index) => ({ id: `${letter}-${index}`, letter })));
  const [placed, setPlaced] = useState<string[]>([]);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [liftedId, setLiftedId] = useState<string | null>(null);
  const slotsRef = useRef<View | null>(null);
  const slotRect = useRef<Rect | null>(null);
  const tileApi = useRef<Map<string, TileApi>>(new Map());
  const solvedRef = useRef(false);

  /** Measures the letter row so a drop anywhere near it counts. */
  const measureSlots = useCallback(async (): Promise<Rect | null> => {
    const node = slotsRef.current;
    if (node === null) return slotRect.current;
    return new Promise<Rect | null>((resolve) => {
      node.measureInWindow((x, y, width, height) => {
        const rect: Rect = { x, y, width, height };
        slotRect.current = rect;
        resolve(rect);
      });
    });
  }, []);

  useEffect(() => {
    setTray(letters.map((letter, index) => ({ id: `${letter}-${index}`, letter })));
    setPlaced([]);
    setWrongId(null);
    setLiftedId(null);
    solvedRef.current = false;
    slotRect.current = null;
  }, [letters, word]);

  // A fresh word takes the size the board just laid out.
  useEffect(() => {
    const timer = setTimeout(() => {
      void measureSlots();
    }, 120);
    return () => clearTimeout(timer);
  }, [measureSlots, word]);

  const register = useCallback((id: string, api: TileApi | null) => {
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
        if (nextPlaced.length === word.length) solvedRef.current = true;
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

  const pickUp = useCallback(
    (tile: DragTile) => {
      setLiftedId(tile.id);
      haptic('light');
      onDragStateChange?.(true);
      void measureSlots();
    },
    [measureSlots, onDragStateChange],
  );

  const putDown = useCallback(
    (tile: DragTile, point: { x: number; y: number }) => {
      setLiftedId(null);
      onDragStateChange?.(false);
      if (point.x < 0 && point.y < 0) return;
      const rect = slotRect.current;
      if (rect === null) {
        tileApi.current.get(tile.id)?.reset();
        return;
      }
      const inside =
        point.x >= rect.x - DROP_SLOP &&
        point.x <= rect.x + rect.width + DROP_SLOP &&
        point.y >= rect.y - DROP_SLOP &&
        point.y <= rect.y + rect.height + DROP_SLOP;
      if (!inside || !attempt(tile)) tileApi.current.get(tile.id)?.reset();
    },
    [attempt, onDragStateChange],
  );

  const undo = useCallback(() => {
    if (locked || placed.length === 0) return;
    const letter = placed[placed.length - 1];
    if (letter === undefined) return;
    const nextPlaced = placed.slice(0, -1);
    setPlaced(nextPlaced);
    setTray((current) => [...current, { id: `${letter}-undo-${current.length}-${nextPlaced.length}`, letter }]);
    solvedRef.current = false;
    playSfx('whoosh');
    haptic('light');
  }, [locked, placed]);

  const filled: (string | null)[] = useMemo(
    () => Array.from({ length: word.length }, (_, index) => placed[index] ?? null),
    [placed, word.length],
  );

  const helper =
    liftedId !== null
      ? 'Drop it in the boxes up there'
      : placed.length === 0
        ? 'Drag a letter into the boxes, or just tap it'
        : 'Keep going, one letter at a time';

  return (
    <View style={styles.wrap}>
      <View ref={slotsRef} collapsable={false} onLayout={() => void measureSlots()}>
        <WordSlots total={word.length} filled={filled} activeIndex={placed.length} size={tileSize + 6} onPressSlot={() => undo()} />
      </View>
      <Text style={[type.small, styles.helper]}>{helper}</Text>
      <View style={styles.tray}>
        {tray.map((tile) => (
          <DraggableTile
            key={tile.id}
            tile={tile}
            size={tileSize}
            disabled={locked}
            wrong={wrongId === tile.id}
            lifted={liftedId === tile.id}
            register={register}
            onPickUp={() => pickUp(tile)}
            onDrop={(point) => putDown(tile, point)}
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
  tray: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    minHeight: 80,
  },
  dragTileWrap: { alignItems: 'center', justifyContent: 'center' },
  dragTile: { alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderRadius: radii.md },
  dragLetter: { fontFamily: 'Baloo2_800ExtraBold', color: colors.ink, textAlign: 'center' },
});
