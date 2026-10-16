import React from 'react';
import Svg, { Circle, Ellipse, G, Path, Polygon, Rect } from 'react-native-svg';

import { Skin } from '../types';
import { stageTraits } from '../data/dinosaurs';
import { DinoShape, dinoDrawing } from './dinoShapes';

/**
 * Every dinosaur in EvoABC is drawn from data. The skin picks a body plan
 * (rex, trike, spino, ankylo and friends), a palette and a set of traits, the
 * evolution stage then grows the creature and adds armour, fins, horns and a
 * glowing aura, and src/art/dinoShapes.ts turns all of that into shapes. This
 * file only paints them.
 */

export interface DinoProps {
  skin: Skin;
  stageIndex?: number;
  size?: number;
  aura?: boolean;
  flip?: boolean;
}

const GLOW_RING = 0.34;

/**
 * How much the whole creature grows with its evolution stage.
 *
 * dinoShapes.ts already grows the body, but on its own that is nearly
 * invisible: a hatchling and a titan looked the same size on the collection
 * screen, and a creature that never grows makes a poor reward. Scaling around
 * the ground line keeps the feet planted while the animal rises, and the cap of
 * 1.05 stops the tallest horns from leaving the 120x120 box.
 */
const STAGE_SCALE = [0.88, 0.94, 1, 1.02, 1.05];

/** Scaling about the ground keeps the feet on the floor as the creature grows. */
const GROUND = 'translate(58 112) scale(%s) translate(-58 -112)';

function Aura({ color, stage }: { color: string; stage: number }) {
  if (stage <= 0) return null;
  return (
    <G opacity={GLOW_RING + stage * 0.06}>
      <Circle cx={58} cy={64} r={40 + stage * 3} fill={color} opacity={0.16} />
      <Circle cx={58} cy={64} r={30 + stage * 3} fill={color} opacity={0.14} />
    </G>
  );
}

/** The centre a shape rotates around, which is itself unless it is a polygon. */
function centreOf(shape: DinoShape): [number, number] {
  switch (shape.kind) {
    case 'ellipse':
      return [shape.cx, shape.cy];
    case 'rect':
      return [shape.x + shape.width / 2, shape.y + shape.height / 2];
    case 'polygon': {
      let x = 0;
      let y = 0;
      for (const point of shape.points) {
        x += point[0] ?? 0;
        y += point[1] ?? 0;
      }
      return [x / Math.max(1, shape.points.length), y / Math.max(1, shape.points.length)];
    }
    default:
      return [60, 60];
  }
}

function renderShape(shape: DinoShape): React.ReactElement {
  switch (shape.kind) {
    case 'ellipse':
      return <Ellipse cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} fill={shape.fill} opacity={shape.opacity} />;
    case 'rect':
      return (
        <Rect x={shape.x} y={shape.y} width={shape.width} height={shape.height} rx={shape.radius} fill={shape.fill} opacity={shape.opacity} />
      );
    case 'polygon':
      return <Polygon points={shape.points.map(([x, y]) => `${x},${y}`).join(' ')} fill={shape.fill} opacity={shape.opacity} />;
    default:
      return <Path d={shape.d} fill={shape.fill} opacity={shape.opacity} stroke={shape.stroke} strokeWidth={shape.strokeWidth} />;
  }
}

function Shape({ shape }: { shape: DinoShape }) {
  const drawn = renderShape(shape);
  const rotate = shape.kind === 'ellipse' || shape.kind === 'rect' ? shape.rotate : undefined;
  if (rotate === undefined) return drawn;
  const [cx, cy] = centreOf(shape);
  return <G transform={`rotate(${rotate} ${cx} ${cy})`}>{drawn}</G>;
}

export function Dino({ skin, stageIndex = 0, size = 200, aura = true, flip = false }: DinoProps) {
  const stage = Math.max(0, Math.min(4, stageIndex));
  const traits: Skin['traits'] = { ...skin.traits, ...stageTraits(stage) };
  const drawing = dinoDrawing(skin.shape, skin.colors, traits, stage);
  const scale = STAGE_SCALE[stage] ?? 1;

  const creature = (
    <G transform={GROUND.replace('%s', String(scale))}>
      {drawing.back.map((shape, index) => (
        <Shape key={`back-${index}`} shape={shape} />
      ))}
      {drawing.front.map((shape, index) => (
        <Shape key={`front-${index}`} shape={shape} />
      ))}
    </G>
  );

  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <G transform={flip ? 'translate(120,0) scale(-1,1)' : undefined}>
        {aura ? <Aura color={skin.colors.glow} stage={stage} /> : null}
        <Ellipse cx={58} cy={106} rx={34} ry={8} fill="#0C2233" opacity={0.14} />
        {skin.companion ? <G transform="scale(0.92) translate(6,8)">{creature}</G> : creature}
      </G>
    </Svg>
  );
}

export default Dino;
