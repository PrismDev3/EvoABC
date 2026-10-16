import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Polygon, Rect, Stop } from 'react-native-svg';

import { Skin } from '../types';
import { stageTraits } from '../data/dinosaurs';

/**
 * Every dinosaur in EvoABC is drawn from data. The skin picks a body plan
 * (rex, trike, spino, ankylo and friends), a palette and a set of traits, and
 * the evolution stage then adds armour, fins, horns and a glowing aura.
 */

export interface DinoProps {
  skin: Skin;
  stageIndex?: number;
  size?: number;
  aura?: boolean;
  flip?: boolean;
}

interface Ctx {
  c: Skin['colors'];
  t: Skin['traits'];
  stage: number;
}

const GLOW_RING = 0.34;

function Aura({ color, stage }: { color: string; stage: number }) {
  if (stage <= 0) return null;
  return (
    <G opacity={GLOW_RING + stage * 0.06}>
      <Circle cx={58} cy={64} r={40 + stage * 3} fill={color} opacity={0.16} />
      <Circle cx={58} cy={64} r={30 + stage * 3} fill={color} opacity={0.14} />
    </G>
  );
}

function Eye({ cx, cy, ctx }: { cx: number; cy: number; ctx: Ctx }) {
  const glow = ctx.t.glowEyes;
  return (
    <G>
      {glow ? <Circle cx={cx} cy={cy} r={8.4} fill={ctx.c.glow} opacity={0.4} /> : null}
      <Circle cx={cx} cy={cy} r={5.6} fill="#FFFFFF" />
      <Circle cx={cx + (glow ? 0.2 : 0.6)} cy={cy + 0.4} r={glow ? 3.4 : 2.9} fill={glow ? ctx.c.eye : '#17263D'} />
      <Circle cx={cx - 1.8} cy={cy - 1.9} r={1.5} fill="#FFFFFF" opacity={0.92} />
    </G>
  );
}

function Foot({ cx, cy, color }: { cx: number; cy: number; color: string }) {
  return (
    <G>
      <Ellipse cx={cx} cy={cy} rx={11} ry={5.4} fill={color} />
      <Polygon points={`${cx - 9},${cy - 1} ${cx - 12},${cy + 3.4} ${cx - 6},${cy + 2.6}`} fill="#FFFFFF" opacity={0.85} />
      <Polygon points={`${cx - 1},${cy + 1} ${cx - 2},${cy + 5.4} ${cx + 3},${cy + 3}`} fill="#FFFFFF" opacity={0.85} />
    </G>
  );
}

function Leg({ x, y, w, h, color }: { x: number; y: number; w: number; h: number; color: string }) {
  return <Rect x={x} y={y} width={w} height={h} rx={w / 2} fill={color} />;
}

function Spikes({ points, color }: { points: [number, number, number][]; color: string }) {
  return (
    <G>
      {points.map(([x, y, h], index) => (
        <Polygon key={index} points={`${x},${y} ${x - h * 0.72},${y + h} ${x + h * 0.72},${y + h}`} fill={color} />
      ))}
    </G>
  );
}

function Fins({ points, color, glow }: { points: [number, number, number][]; color: string; glow: string }) {
  return (
    <G>
      {points.map(([x, y, h], index) => (
        <G key={index}>
          <Polygon points={`${x},${y - h * 1.15} ${x - h * 0.66},${y} ${x + h * 0.66},${y}`} fill={color} />
          <Polygon points={`${x},${y - h * 0.78} ${x - h * 0.4},${y - h * 0.08} ${x + h * 0.4},${y - h * 0.08}`} fill={glow} opacity={0.75} />
        </G>
      ))}
    </G>
  );
}

function Plate({ x, y, w, h, color, accent }: { x: number; y: number; w: number; h: number; color: string; accent: string }) {
  return (
    <G>
      <Rect x={x} y={y} width={w} height={h} rx={Math.min(w, h) / 2.6} fill={color} />
      <Rect x={x + 2.4} y={y + 2.4} width={w - 4.8} height={Math.max(2, h * 0.34)} rx={2} fill={accent} opacity={0.6} />
    </G>
  );
}

function Wings({ color, dark }: { color: string; dark: string }) {
  return (
    <G>
      <Path d="M58 52 C40 26 20 18 4 24 C16 34 24 46 30 62 Z" fill={dark} />
      <Path d="M58 52 C44 30 26 22 12 26 C24 36 30 48 34 62 Z" fill={color} opacity={0.95} />
      <Path d="M58 56 C42 34 24 28 8 32" stroke={dark} strokeWidth={1.4} fill="none" opacity={0.7} />
    </G>
  );
}

function Horns({ color, accent }: { color: string; accent: string }) {
  return (
    <G>
      <Polygon points="74,26 68,6 82,22" fill={accent} />
      <Polygon points="86,24 88,4 96,24" fill={accent} />
      <Polygon points="74,26 70,10 79,23" fill={color} opacity={0.5} />
    </G>
  );
}

function Armour({ color, accent }: { color: string; accent: string }) {
  return (
    <G opacity={0.95}>
      <Plate x={40} y={52} w={13} h={20} color={color} accent={accent} />
      <Plate x={52} y={44} w={13} h={22} color={color} accent={accent} />
      <Plate x={64} y={52} w={12} h={20} color={color} accent={accent} />
      <Plate x={45} y={80} w={16} h={13} color={color} accent={accent} />
    </G>
  );
}

function Snout({ cx, cy, rx, ry, c }: { cx: number; cy: number; rx: number; ry: number; c: Skin['colors'] }) {
  return (
    <G>
      <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={c.belly} />
      <Circle cx={cx + rx * 0.55} cy={cy - ry * 0.4} r={0.9} fill={c.eye} opacity={0.85} />
      <Path d={`M${cx - rx * 0.55} ${cy + ry * 0.25} L${cx + rx * 0.6} ${cy + ry * 0.25}`} stroke={c.accent} strokeWidth={1.1} opacity={0.75} />
    </G>
  );
}

function Teeth({ cx, cy, count, color = '#FFFFFF' }: { cx: number; cy: number; count: number; color?: string }) {
  const teeth = new Array(count).fill(0);
  return (
    <G>
      {teeth.map((_, index) => (
        <Polygon key={index} points={`${cx + index * 5.4},${cy} ${cx + index * 5.4 + 4.2},${cy} ${cx + index * 5.4 + 2.1},${cy + 4.4}`} fill={color} />
      ))}
    </G>
  );
}

function Rex({ ctx, variant }: { ctx: Ctx; variant: 'rex' | 'raptor' }) {
  const { c, t } = ctx;
  const slim = variant === 'raptor';
  const bodyRx = slim ? 24 : 27;
  const bodyRy = slim ? 24 : 26;
  const headCx = slim ? 86 : 84;
  const headRx = slim ? 18 : 21;
  const headRy = slim ? 15 : 17;
  return (
    <G>
      {t.wings ? <Wings color={c.body} dark={c.bodyDark} /> : null}
      <Path d={slim ? 'M40 70 C22 72 10 64 2 50 C14 54 28 58 42 60 Z' : 'M36 78 C20 78 8 70 2 56 C14 60 26 62 38 66 Z'} fill={c.bodyDark} />
      {t.spikes ? <Spikes points={slim ? [[30, 56, 7], [38, 48, 8], [46, 42, 8]] : [[32, 58, 8], [42, 50, 9], [52, 44, 9]]} color={c.accent} /> : null}
      {t.fins ? <Fins points={slim ? [[30, 56, 11], [40, 48, 13], [50, 42, 12]] : [[32, 58, 12], [44, 50, 14], [56, 44, 13]]} color={c.accent} glow={c.glow} /> : null}
      <Leg x={slim ? 46 : 44} y={84} w={slim ? 13 : 15} h={26} color={c.bodyDark} />
      <Leg x={slim ? 64 : 62} y={84} w={slim ? 13 : 15} h={26} color={c.body} />
      <Foot cx={slim ? 52 : 51} cy={110} color={c.bodyDark} />
      <Foot cx={slim ? 70 : 70} cy={110} color={c.body} />
      <Ellipse cx={58} cy={68} rx={bodyRx} ry={bodyRy} fill={c.body} />
      <Ellipse cx={58} cy={78} rx={bodyRx * 0.68} ry={bodyRy * 0.55} fill={c.belly} opacity={0.95} />
      {t.armor ? <Armour color={c.bodyDark} accent={c.accent} /> : null}
      <Rect x={slim ? 62 : 60} y={44} width={20} height={24} rx={10} fill={c.body} />
      <Rect x={slim ? 68 : 66} y={68} width={14} height={8} rx={4} fill={c.bodyDark} />
      <Polygon points={`${slim ? 78 : 76},${72} ${slim ? 84 : 82},${72} ${slim ? 82 : 80},${77}`} fill={c.accent} />
      <Ellipse cx={headCx} cy={42} rx={headRx} ry={headRy} fill={c.body} />
      <Snout cx={headCx + (slim ? 10 : 8)} cy={52} rx={slim ? 13 : 16} ry={slim ? 6.4 : 8} c={c} />
      <Teeth cx={headCx + 2} cy={49} count={slim ? 4 : 5} />
      {t.horns ? <Horns color={c.body} accent={c.accent} /> : null}
      <Eye cx={headCx + 6} cy={38} ctx={ctx} />
      <Path d={`M${headCx - headRx * 0.4} ${30} C${headCx - 4} ${24} ${headCx + 6} ${24} ${headCx + 12} ${29}`} stroke={c.bodyDark} strokeWidth={2} fill="none" opacity={0.55} />
    </G>
  );
}

function Kaiju({ ctx }: { ctx: Ctx }) {
  const { c, t } = ctx;
  return (
    <G>
      <Path d="M38 82 C20 84 8 74 0 58 C16 62 28 64 40 68 Z" fill={c.bodyDark} />
      <Fins points={[[28, 60, 15], [40, 50, 18], [52, 42, 19], [64, 38, 17]]} color={c.accent} glow={c.glow} />
      <Leg x={38} y={86} w={19} h={26} color={c.bodyDark} />
      <Leg x={66} y={86} w={19} h={26} color={c.body} />
      <Foot cx={47} cy={112} color={c.bodyDark} />
      <Foot cx={75} cy={112} color={c.body} />
      <Ellipse cx={62} cy={72} rx={31} ry={30} fill={c.body} />
      <Ellipse cx={62} cy={84} rx={21} ry={17} fill={c.belly} opacity={0.92} />
      {t.armor ? <Armour color={c.bodyDark} accent={c.accent} /> : null}
      <Ellipse cx={62} cy={40} rx={23} ry={20} fill={c.body} />
      <Ellipse cx={62} cy={52} rx={17} ry={9} fill={c.belly} opacity={0.9} />
      <Teeth cx={52} cy={52} count={5} />
      <Path d="M50 60 L74 60" stroke={c.accent} strokeWidth={1.4} opacity={0.7} />
      <Rect x={78} y={66} width={17} height={10} rx={5} fill={c.bodyDark} />
      <Polygon points="92,68 99,68 96,74" fill={c.accent} />
      <Eye cx={54} cy={36} ctx={ctx} />
      <Eye cx={70} cy={36} ctx={ctx} />
      {t.horns ? <Horns color={c.body} accent={c.accent} /> : null}
    </G>
  );
}

function Trike({ ctx }: { ctx: Ctx }) {
  const { c, t } = ctx;
  return (
    <G>
      <Path d="M34 74 C20 72 12 64 8 54 C18 60 28 64 38 66 Z" fill={c.bodyDark} />
      <Leg x={30} y={82} w={13} h={28} color={c.bodyDark} />
      <Leg x={48} y={84} w={13} h={26} color={c.body} />
      <Leg x={68} y={82} w={13} h={28} color={c.bodyDark} />
      <Leg x={82} y={84} w={13} h={26} color={c.body} />
      <Foot cx={36} cy={110} color={c.bodyDark} />
      <Foot cx={54} cy={110} color={c.body} />
      <Foot cx={74} cy={110} color={c.bodyDark} />
      <Foot cx={88} cy={110} color={c.body} />
      <Ellipse cx={58} cy={72} rx={33} ry={22} fill={c.body} />
      <Ellipse cx={58} cy={80} rx={24} ry={13} fill={c.belly} opacity={0.92} />
      {t.spikes ? <Spikes points={[[38, 62, 7], [50, 58, 8], [62, 58, 8], [74, 62, 7]]} color={c.accent} /> : null}
      {t.armor ? <Plate x={46} y={62} w={26} h={18} color={c.bodyDark} accent={c.accent} /> : null}
      <Ellipse cx={92} cy={60} rx={22} ry={20} fill={c.bodyDark} />
      <Ellipse cx={92} cy={60} rx={16} ry={14} fill={c.body} opacity={0.75} />
      <Ellipse cx={100} cy={70} rx={16} ry={10} fill={c.body} />
      <Snout cx={104} cy={70} rx={11} ry={6} c={c} />
      <Polygon points="96,44 92,26 104,42" fill={c.accent} />
      <Polygon points="90,50 82,33 99,48" fill={c.belly} />
      <Polygon points="112,52 122,42 114,60" fill={c.accent} />
      <Eye cx={100} cy={60} ctx={ctx} />
      <Teeth cx={98} cy={72} count={3} />
    </G>
  );
}

function Spino({ ctx }: { ctx: Ctx }) {
  const { c, t } = ctx;
  return (
    <G>
      <Path d="M36 80 C18 80 6 70 0 56 C14 60 26 62 40 68 Z" fill={c.bodyDark} />
      <Path d="M34 62 C46 26 74 22 86 40 C74 40 56 46 44 62 Z" fill={c.accent} opacity={0.95} />
      <Path d="M38 60 C48 32 70 28 82 42 C70 42 56 48 46 62 Z" fill={c.glow} opacity={0.55} />
      <Leg x={44} y={84} w={15} h={26} color={c.bodyDark} />
      <Leg x={64} y={84} w={15} h={26} color={c.body} />
      <Foot cx={51} cy={110} color={c.bodyDark} />
      <Foot cx={71} cy={110} color={c.body} />
      <Ellipse cx={58} cy={70} rx={28} ry={24} fill={c.body} />
      <Ellipse cx={56} cy={78} rx={19} ry={14} fill={c.belly} opacity={0.92} />
      {t.armor ? <Armour color={c.bodyDark} accent={c.accent} /> : null}
      <Rect x={60} y={46} width={20} height={24} rx={10} fill={c.body} />
      <Ellipse cx={88} cy={44} rx={19} ry={14} fill={c.body} />
      <Path d="M86 36 C96 38 106 44 112 50 C104 54 92 52 86 48 Z" fill={c.belly} />
      <Path d="M88 46 L110 49" stroke={c.accent} strokeWidth={1.2} opacity={0.8} />
      <Teeth cx={86} cy={50} count={4} />
      <Eye cx={86} cy={40} ctx={ctx} />
      {t.horns ? <Horns color={c.body} accent={c.accent} /> : null}
    </G>
  );
}

function Ptera({ ctx }: { ctx: Ctx }) {
  const { c } = ctx;
  return (
    <G>
      <Wings color={c.body} dark={c.bodyDark} />
      <Path d="M56 74 C42 74 34 68 30 60 C40 64 48 66 58 66 Z" fill={c.bodyDark} />
      <Leg x={50} y={80} w={12} h={30} color={c.bodyDark} />
      <Leg x={66} y={80} w={12} h={30} color={c.body} />
      <Foot cx={56} cy={110} color={c.bodyDark} />
      <Foot cx={72} cy={110} color={c.body} />
      <Ellipse cx={62} cy={66} rx={22} ry={22} fill={c.body} />
      <Ellipse cx={62} cy={74} rx={15} ry={12} fill={c.belly} opacity={0.94} />
      <Ellipse cx={62} cy={38} rx={19} ry={17} fill={c.body} />
      <Polygon points="46,26 30,10 52,20" fill={c.accent} />
      <Polygon points="58,22 58,6 68,22" fill={c.accent} />
      <Path d="M78 40 L96 44 L78 50 Z" fill={c.belly} />
      <Path d="M78 42 L94 45" stroke={c.accent} strokeWidth={1} opacity={0.7} />
      <Eye cx={70} cy={34} ctx={ctx} />
    </G>
  );
}

function Ankylo({ ctx }: { ctx: Ctx }) {
  const { c, t } = ctx;
  return (
    <G>
      <Path d="M32 72 C20 70 14 64 10 56 C20 62 28 66 36 66 Z" fill={c.bodyDark} />
      <Circle cx={12} cy={58} r={11} fill={c.accent} />
      <Spikes points={[[6, 50, 8], [16, 48, 7]]} color={c.body} />
      <Leg x={28} y={82} w={13} h={28} color={c.bodyDark} />
      <Leg x={46} y={84} w={13} h={26} color={c.body} />
      <Leg x={68} y={82} w={13} h={28} color={c.bodyDark} />
      <Leg x={82} y={84} w={13} h={26} color={c.body} />
      <Foot cx={34} cy={110} color={c.bodyDark} />
      <Foot cx={52} cy={110} color={c.body} />
      <Foot cx={74} cy={110} color={c.bodyDark} />
      <Foot cx={88} cy={110} color={c.body} />
      <Ellipse cx={58} cy={74} rx={33} ry={21} fill={c.body} />
      <Ellipse cx={58} cy={84} rx={24} ry={10} fill={c.belly} opacity={0.9} />
      <G>
        {[
          [34, 58],
          [46, 54],
          [58, 53],
          [70, 55],
          [82, 60],
        ].map(([x, y], index) => (
          <G key={index}>
            <Rect x={(x ?? 0) - 7} y={(y ?? 0) - 7} width={14} height={14} rx={4} fill={t.armor ? c.bodyDark : c.accent} />
            <Polygon points={`${x},${(y ?? 0) - 12} ${(x ?? 0) - 6},${(y ?? 0) - 3} ${(x ?? 0) + 6},${(y ?? 0) - 3}`} fill={c.glow} opacity={t.glowEyes ? 0.85 : 0.45} />
          </G>
        ))}
      </G>
      <Ellipse cx={94} cy={70} rx={16} ry={13} fill={c.body} />
      <Snout cx={102} cy={74} rx={10} ry={6} c={c} />
      <Eye cx={96} cy={66} ctx={ctx} />
      {t.horns ? <Horns color={c.body} accent={c.accent} /> : null}
    </G>
  );
}

function Sauropod({ ctx }: { ctx: Ctx }) {
  const { c, t } = ctx;
  return (
    <G>
      <Path d="M34 74 C18 76 8 68 0 56 C14 60 26 62 38 64 Z" fill={c.bodyDark} />
      <Leg x={36} y={82} w={14} h={28} color={c.bodyDark} />
      <Leg x={54} y={84} w={14} h={26} color={c.body} />
      <Leg x={70} y={82} w={14} h={28} color={c.bodyDark} />
      <Foot cx={43} cy={110} color={c.bodyDark} />
      <Foot cx={61} cy={110} color={c.body} />
      <Foot cx={77} cy={110} color={c.bodyDark} />
      <Ellipse cx={58} cy={72} rx={28} ry={23} fill={c.body} />
      <Ellipse cx={56} cy={80} rx={19} ry={13} fill={c.belly} opacity={0.92} />
      <Path d="M74 58 C76 34 80 22 88 16 C96 20 98 32 96 52 C90 58 82 60 74 58 Z" fill={c.body} />
      <Ellipse cx={92} cy={16} rx={11} ry={9} fill={c.body} />
      <Snout cx={98} cy={19} rx={8} ry={5} c={c} />
      <Eye cx={90} cy={13} ctx={ctx} />
      {t.spikes ? <Spikes points={[[40, 60, 6], [52, 56, 7], [64, 56, 7]]} color={c.accent} /> : null}
      {t.armor ? <Plate x={44} y={62} w={24} h={16} color={c.bodyDark} accent={c.accent} /> : null}
    </G>
  );
}

export function Dino({ skin, stageIndex = 0, size = 200, aura = true, flip = false }: DinoProps) {
  const stage = Math.max(0, Math.min(4, stageIndex));
  const merged: Skin['traits'] = { ...skin.traits, ...stageTraits(stage) };
  const ctx: Ctx = { c: skin.colors, t: merged, stage };

  const shape = () => {
    switch (skin.shape) {
      case 'raptor':
        return <Rex ctx={ctx} variant="raptor" />;
      case 'kaiju':
        return <Kaiju ctx={ctx} />;
      case 'trike':
        return <Trike ctx={ctx} />;
      case 'spino':
        return <Spino ctx={ctx} />;
      case 'ptera':
        return <Ptera ctx={ctx} />;
      case 'ankylo':
        return <Ankylo ctx={ctx} />;
      case 'sauropod':
        return <Sauropod ctx={ctx} />;
      default:
        return <Rex ctx={ctx} variant="rex" />;
    }
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Defs>
        <LinearGradient id="evoBody" x1="0" y1="0" x2="0.3" y2="1">
          <Stop offset="0" stopColor={skin.colors.body} />
          <Stop offset="1" stopColor={skin.colors.bodyDark} />
        </LinearGradient>
      </Defs>
      <G transform={flip ? 'translate(120,0) scale(-1,1)' : undefined}>
        {aura ? <Aura color={skin.colors.glow} stage={stage} /> : null}
        <Ellipse cx={58} cy={106} rx={34} ry={8} fill="#0C2233" opacity={0.14} />
        {skin.companion ? <G transform="scale(0.92) translate(6,8)">{shape()}</G> : shape()}
      </G>
    </Svg>
  );
}

export default Dino;
