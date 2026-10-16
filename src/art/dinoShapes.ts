import { BodyShape, SkinColors, SkinTraits } from '../types';

/**
 * Every dinosaur EvoABC draws, written as plain data.
 *
 * Keeping the geometry out of the component means the shapes can be checked and
 * previewed without a device, and it keeps the rules of the art in one place:
 * everything lives in a 120x120 box, the feet stand on the ground at y about
 * 112, the head is on the right, and the creature is built back to front so the
 * near limbs and the head overlap the body instead of piling up on top of it.
 *
 * The drawing is deliberately deterministic: the same body plan, palette,
 * traits and stage always produce the same shapes.
 */

export type DinoShape =
  | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number; fill: string; opacity?: number; rotate?: number }
  | { kind: 'rect'; x: number; y: number; width: number; height: number; radius: number; fill: string; opacity?: number; rotate?: number }
  | { kind: 'polygon'; points: number[][]; fill: string; opacity?: number }
  | { kind: 'path'; d: string; fill: string; opacity?: number; stroke?: string; strokeWidth?: number };

export interface DinoDrawing {
  /** Drawn first, behind the body: tail, wings, back plates, far legs. */
  back: DinoShape[];
  /** Drawn on top: body, belly, near legs and feet, arms, armour, neck, head, snout, teeth, eyes, horns. */
  front: DinoShape[];
}

/** White teeth and highlights plus the ink pupils are the only fixed colours. */
const WHITE = '#FFFFFF';
const INK = '#17263D';

interface Palette {
  body: string;
  dark: string;
  belly: string;
  accent: string;
  glow: string;
  eye: string;
}

/** How much bigger and brighter the creature gets as it evolves. */
interface Look {
  grow: number;
  head: number;
  glow: number;
  baby: boolean;
  titan: boolean;
}

function stageLook(stage: number): Look {
  const index = Math.max(0, Math.min(4, Math.round(stage)));
  // The body nearly doubles between the baby and the titan while the head
  // stays about the same, which is what makes a hatchling look young and a
  // titan look heavy. src/art/Dino.tsx scales the whole creature on top of
  // this, so the two together are clearly visible on a phone screen.
  const grow = [0.84, 0.92, 1, 1.08, 1.16][index] ?? 1;
  const head = [1.26, 1.12, 1, 0.94, 0.9][index] ?? 1;
  const glow = [0.5, 0.75, 1, 1.25, 1.5][index] ?? 1;
  return { grow, head, glow, baby: index === 0, titan: index === 4 };
}

// ------------------------------------------------------------- shape helpers

function ellipse(cx: number, cy: number, rx: number, ry: number, fill: string, opacity?: number, rotate?: number): DinoShape {
  return { kind: 'ellipse', cx, cy, rx, ry, fill, opacity, rotate };
}

function rect(x: number, y: number, width: number, height: number, radius: number, fill: string, opacity?: number, rotate?: number): DinoShape {
  return { kind: 'rect', x, y, width, height, radius, fill, opacity, rotate };
}

function polygon(points: number[][], fill: string, opacity?: number): DinoShape {
  return { kind: 'polygon', points, fill, opacity };
}

function stroke(d: string, color: string, width: number, opacity?: number): DinoShape {
  return { kind: 'path', d, fill: 'none', stroke: color, strokeWidth: width, opacity };
}

function fillPath(d: string, color: string, opacity?: number): DinoShape {
  return { kind: 'path', d, fill: color, opacity };
}

/** A triangle standing on a baseline, used for spikes, plates and claws. */
function spike(x: number, y: number, height: number, fill: string, opacity?: number): DinoShape {
  return polygon(
    [
      [x, y - height],
      [x - height * 0.68, y],
      [x + height * 0.68, y],
    ],
    fill,
    opacity,
  );
}

function spikeRow(points: number[][], fill: string, opacity?: number): DinoShape[] {
  return points.map(([x, y, h]) => spike(x ?? 0, y ?? 0, h ?? 6, fill, opacity));
}

/** Glowing fins: a solid triangle with a brighter inner shape. */
function finRow(points: number[][], color: string, glow: string, glowLevel: number): DinoShape[] {
  const shapes: DinoShape[] = [];
  for (const [x, y, h] of points) {
    const bx = x ?? 0;
    const by = y ?? 0;
    const bh = h ?? 8;
    shapes.push(polygon([[bx, by - bh * 1.2], [bx - bh * 0.6, by], [bx + bh * 0.6, by]], color));
    shapes.push(polygon([[bx, by - bh * 0.82], [bx - bh * 0.34, by - bh * 0.06], [bx + bh * 0.34, by - bh * 0.06]], glow, 0.42 + glowLevel * 0.2));
  }
  return shapes;
}

/** Armour plates: rounded scutes with a small spike, for the evolved stages. */
function plateRow(points: number[][], color: string, accent: string): DinoShape[] {
  const shapes: DinoShape[] = [];
  for (const [x, y, w] of points) {
    const bx = x ?? 0;
    const by = y ?? 0;
    const bw = w ?? 14;
    shapes.push(rect(bx - bw / 2, by - bw * 0.42, bw, bw * 0.84, bw * 0.32, color));
    shapes.push(rect(bx - bw * 0.32, by - bw * 0.3, bw * 0.64, bw * 0.2, bw * 0.1, accent, 0.55));
    shapes.push(spike(bx, by - bw * 0.42, bw * 0.3, accent));
  }
  return shapes;
}

/** A far limb: a rounded thigh plus a shin, all in the darker shade. */
function leg(px: number, py: number, prx: number, pry: number, sx: number, sy: number, sw: number, sh: number, fill: string): DinoShape[] {
  return [ellipse(px, py, prx, pry, fill), rect(sx, sy, sw, sh, sw / 2, fill)];
}

/** A foot with three toes, which is what makes a leg read as a leg. */
function foot(cx: number, cy: number, r: number, fill: string, claw: string): DinoShape[] {
  return [
    ellipse(cx, cy, r, r * 0.5, fill),
    ellipse(cx - r * 0.2, cy - r * 0.12, r * 0.6, r * 0.26, WHITE, 0.2),
    polygon(
      [
        [cx - r * 0.7, cy + r * 0.08],
        [cx - r * 1.05, cy + r * 0.62],
        [cx - r * 0.38, cy + r * 0.56],
      ],
      claw,
    ),
    polygon(
      [
        [cx - r * 0.04, cy + r * 0.24],
        [cx - r * 0.18, cy + r * 0.8],
        [cx + r * 0.3, cy + r * 0.54],
      ],
      claw,
    ),
    polygon(
      [
        [cx + r * 0.48, cy + r * 0.1],
        [cx + r * 0.82, cy + r * 0.6],
        [cx + r * 0.28, cy + r * 0.54],
      ],
      claw,
    ),
  ];
}

/** A small arm tucked against the chest, with two claws. */
function arm(x: number, y: number, w: number, h: number, fill: string, claw: string, rotate: number): DinoShape[] {
  const handX = x + w * 0.84;
  const handY = y + h * 0.78;
  return [
    rect(x, y, w, h, h / 2, fill, undefined, rotate),
    polygon(
      [
        [handX, handY - h * 0.2],
        [handX + h * 0.75, handY - h * 0.05],
        [handX + h * 0.2, handY + h * 0.4],
      ],
      claw,
    ),
    polygon(
      [
        [handX - h * 0.1, handY + h * 0.15],
        [handX + h * 0.5, handY + h * 0.5],
        [handX - h * 0.2, handY + h * 0.6],
      ],
      claw,
    ),
  ];
}

/** A horn pointing up and back, drawn as a tapered triangle. */
function horn(baseX: number, baseY: number, length: number, lean: number, fill: string, shade: string): DinoShape[] {
  const tipX = baseX + lean;
  const tipY = baseY - length;
  return [
    polygon([[baseX, baseY], [tipX, tipY], [baseX + length * 0.42, baseY + length * 0.12]], fill),
    polygon([[baseX, baseY], [tipX, tipY], [baseX + length * 0.2, baseY - length * 0.1]], shade, 0.5),
  ];
}

/** One eye: glow halo when the skin glows, sclera, pupil and a highlight. */
function eye(cx: number, cy: number, r: number, p: Palette, glow: boolean): DinoShape[] {
  const shapes: DinoShape[] = [];
  if (glow) shapes.push(ellipse(cx, cy, r * 1.5, r * 1.5, p.glow, 0.3));
  shapes.push(ellipse(cx, cy, r * 0.94, r, WHITE));
  shapes.push(ellipse(cx + r * 0.14, cy + r * 0.06, r * 0.46, r * 0.5, glow ? p.eye : INK));
  shapes.push(ellipse(cx - r * 0.36, cy - r * 0.36, r * 0.24, r * 0.24, WHITE, 0.95));
  return shapes;
}

/** A soft brow above the eye, which is most of the expression. */
function brow(x1: number, y1: number, x2: number, y2: number, color: string): DinoShape[] {
  return [stroke(`M${x1} ${y1} C${(x1 + x2) / 2} ${y1 - 4.5} ${(x1 + x2) / 2 + 3} ${y2 - 4} ${x2} ${y2}`, color, 1.6, 0.55)];
}

/** A mouth line that ends in a small curve, so the face is not blank. */
function mouth(x1: number, y: number, x2: number, color: string): DinoShape[] {
  return [stroke(`M${x1} ${y} C${(x1 + x2) / 2} ${y + 1.6} ${x2 - 3} ${y + 1} ${x2} ${y - 1.6}`, color, 1.4, 0.6)];
}

/** Hanging teeth for the predators. */
function teeth(startX: number, y: number, count: number, size: number): DinoShape[] {
  const shapes: DinoShape[] = [];
  for (let index = 0; index < count; index += 1) {
    const x = startX + index * size * 1.28;
    shapes.push(polygon([[x, y], [x + size, y], [x + size * 0.5, y + size * 1.05]], WHITE));
  }
  return shapes;
}

// ------------------------------------------------------------------- plans

/** Shared chest and belly for every plan, so they all read as the same family. */
function torso(cx: number, cy: number, rx: number, ry: number, p: Palette): DinoShape[] {
  return [
    ellipse(cx, cy, rx, ry, p.body),
    ellipse(cx, cy + ry * 0.3, rx * 0.98, ry * 0.72, p.dark, 0.28),
    ellipse(cx + rx * 0.06, cy + ry * 0.26, rx * 0.7, ry * 0.58, p.belly, 0.98),
    ellipse(cx - rx * 0.34, cy - ry * 0.42, rx * 0.34, ry * 0.2, WHITE, 0.22, -18),
  ];
}

/** The two footed hunters: rex, raptor and the kaiju share one skeleton. */
function biped(plan: 'rex' | 'raptor' | 'kaiju', p: Palette, t: SkinTraits, look: Look): DinoDrawing {
  const { grow, head: headScale, glow, baby } = look;
  const heavy = plan === 'kaiju';
  const slim = plan === 'raptor';
  const bodyCx = heavy ? 58 : slim ? 57 : 58;
  const bodyCy = heavy ? 74 : 72;
  const bodyRx = (heavy ? 29 : slim ? 21 : 25) * grow;
  const bodyRy = (heavy ? 27 : slim ? 21 : 24) * grow;
  const headCx = heavy ? 87 : slim ? 89 : 86;
  const headCy = heavy ? 38 : 36;
  const headRx = (heavy ? 23 : slim ? 17 : 20) * headScale;
  const headRy = (heavy ? 18 : slim ? 14 : 15.5) * headScale;
  const neckX = headCx - 28;
  const neckY = headCy + 5;
  const eyeR = (baby ? 6.2 : slim ? 5.6 : 5.2) * headScale;
  const friendly = plan !== 'rex';
  const farX = bodyCx + 7;
  const nearX = bodyCx - 8;

  const back: DinoShape[] = [];
  const front: DinoShape[] = [];

  // Tail, lifted off the ground and tapering to a point.
  back.push(
    fillPath(
      `M${bodyCx - 8} ${bodyCy + 4} C${bodyCx - 26} ${bodyCy + 8} ${bodyCx - 38} ${bodyCy - 2} ${bodyCx - 50} ${bodyCy - 18} C${bodyCx - 36} ${bodyCy - 6} ${bodyCx - 24} ${bodyCy - 2} ${bodyCx - 8} ${bodyCy - 6} Z`,
      p.dark,
    ),
  );
  if (t.tailClub) {
    const tipX = bodyCx - 45;
    const tipY = bodyCy - 15;
    back.push(ellipse(tipX, tipY, 9, 8, p.dark));
    back.push(...spikeRow([[tipX - 3, tipY - 6, 6], [tipX + 3, tipY - 8, 7], [tipX + 8, tipY - 4, 5]], p.accent));
  } else if (slim) {
    // Feathers along the raptor tail.
    back.push(...spikeRow([[bodyCx - 24, bodyCy - 4, 7], [bodyCx - 32, bodyCy - 9, 8], [bodyCx - 40, bodyCy - 15, 7]], p.accent, 0.9));
  }

  // Far legs and far arm, all one shade darker so they sit behind.
  back.push(...leg(farX + 6, bodyCy + 12, 10 * grow, 12 * grow, farX + 1, bodyCy + 20, 11, 20 * grow, p.dark));
  back.push(...foot(farX + 6, 110, 11, p.dark, p.accent));
  back.push(...arm(bodyCx + 16, bodyCy - 12, 15, 8, p.dark, p.accent, -12));

  if (t.wings) {
    back.push(
      fillPath(`M${bodyCx + 6} ${bodyCy - 14} C${bodyCx - 12} ${bodyCy - 40} ${bodyCx - 34} ${bodyCy - 50} ${bodyCx - 50} ${bodyCy - 44} C${bodyCx - 34} ${bodyCy - 34} ${bodyCx - 22} ${bodyCy - 18} ${bodyCx - 16} ${bodyCy + 2} Z`, p.dark),
    );
  }
  if (t.fins) {
    back.push(...finRow([[bodyCx - 20, bodyCy - 17, 11], [bodyCx - 8, bodyCy - 23, 14], [bodyCx + 4, bodyCy - 24, 13]], p.accent, p.glow, glow));
  }
  if (t.spikes) {
    back.push(...spikeRow([[bodyCx - 22, bodyCy - 16, 8], [bodyCx - 12, bodyCy - 22, 9], [bodyCx - 2, bodyCy - 24, 9], [bodyCx + 8, bodyCy - 22, 7]], p.accent));
  }
  if (t.armor) {
    back.push(...plateRow([[bodyCx - 18, bodyCy - 14, 14], [bodyCx - 4, bodyCy - 20, 15], [bodyCx + 10, bodyCy - 20, 14]], p.dark, p.accent));
  }

  // Neck behind the head, chest in front of it.
  front.push(rect(neckX, neckY, 22, 30 * grow, 11, p.body, undefined, -22));
  front.push(...torso(bodyCx, bodyCy, bodyRx, bodyRy, p));

  // Near leg, in the skin colour so it reads as the closest one.
  front.push(...leg(nearX, bodyCy + 12, 11 * grow, 13 * grow, nearX - 6, bodyCy + 20, 12, 20 * grow, p.body));
  front.push(...foot(nearX, 111, 12, p.body, p.accent));
  front.push(...arm(bodyCx + 12, bodyCy - 8, 16, 9, p.body, p.accent, -8));

  // Head, jaw, snout, mouth and nostrils.
  front.push(ellipse(headCx, headCy, headRx, headRy, p.body));
  front.push(ellipse(headCx - 2, headCy + headRy * 0.44, headRx * 0.82, headRy * 0.5, p.dark, 0.32));
  front.push(ellipse(headCx + headRx * 0.42, headCy + headRy * 0.3, headRx * 0.56, headRy * 0.44, p.belly));
  front.push(ellipse(headCx - headRx * 0.3, headCy - headRy * 0.58, headRx * 0.34, headRy * 0.16, WHITE, 0.26, -14));
  front.push(ellipse(headCx + headRx * 0.72, headCy - headRy * 0.06, 1.4, 1.1, p.eye, 0.8));
  front.push(...mouth(headCx - headRx * 0.1, headCy + headRy * 0.52, headCx + headRx * 0.86, p.dark));
  if (!slim) front.push(...teeth(headCx - headRx * 0.02, headCy + headRy * 0.46, 4, 4.1));
  if (friendly && (baby || plan === 'raptor')) {
    front.push(ellipse(headCx - headRx * 0.34, headCy + headRy * 0.28, headRx * 0.26, headRy * 0.24, p.accent, 0.24));
  }
  if (heavy) {
    front.push(...eye(headCx - headRx * 0.42, headCy - headRy * 0.3, eyeR, p, t.glowEyes));
    front.push(...eye(headCx + headRx * 0.2, headCy - headRy * 0.34, eyeR * 0.82, p, t.glowEyes));
  } else {
    front.push(...eye(headCx - headRx * 0.14, headCy - headRy * 0.34, eyeR, p, t.glowEyes));
  }
  front.push(...brow(headCx - headRx * 0.62, headCy - headRy * 0.82, headCx + headRx * 0.28, headCy - headRy * 0.7, INK));
  if (t.horns) {
    front.push(...horn(headCx - headRx * 0.36, headCy - headRy * 0.9, 12, 3, p.accent, p.body));
    front.push(...horn(headCx + headRx * 0.12, headCy - headRy * 0.96, 10, 5, p.belly, p.body));
  }
  if (look.titan) {
    front.push(...spikeRow([[headCx - headRx * 0.1, headCy - headRy * 1.05, 6], [headCx + headRx * 0.32, headCy - headRy * 1.02, 5]], p.glow, 0.8));
  }

  return { back, front };
}

/** Four stout legs for the low walkers, the far pair first so it sits behind. */
function quadrupedLegs(
  bodyCy: number,
  backX: number,
  frontX: number,
  p: Palette,
  grow: number,
): { back: DinoShape[]; front: DinoShape[] } {
  const back: DinoShape[] = [
    ...leg(backX + 8, bodyCy + 8, 9 * grow, 11 * grow, backX + 4, bodyCy + 16, 10, 20 * grow, p.dark),
    ...leg(frontX + 6, bodyCy + 9, 9 * grow, 11 * grow, frontX + 2, bodyCy + 17, 10, 19 * grow, p.dark),
    ...foot(backX + 9, 110, 10, p.dark, p.accent),
    ...foot(frontX + 7, 110, 10, p.dark, p.accent),
  ];
  const front: DinoShape[] = [
    ...leg(backX - 4, bodyCy + 9, 10 * grow, 12 * grow, backX - 9, bodyCy + 17, 11, 20 * grow, p.body),
    ...leg(frontX - 6, bodyCy + 10, 10 * grow, 12 * grow, frontX - 11, bodyCy + 18, 11, 19 * grow, p.body),
    ...foot(backX - 3, 111, 11, p.body, p.accent),
    ...foot(frontX - 5, 111, 11, p.body, p.accent),
  ];
  return { back, front };
}

/** Trike: a wide frill, three horns and a beak, which is unmistakable. */
function trike(p: Palette, t: SkinTraits, look: Look): DinoDrawing {
  const { grow, head: headScale, glow } = look;
  const bodyCx = 56;
  const bodyCy = 76;
  const legs = quadrupedLegs(bodyCy, 38, 68, p, grow);
  const headCx = 88;
  const headCy = 62;
  const headRx = 19 * headScale;
  const headRy = 17 * headScale;
  const frillR = 24 * headScale;

  const back: DinoShape[] = [];
  const front: DinoShape[] = [];

  back.push(fillPath(`M${bodyCx - 22} ${bodyCy + 2} C${bodyCx - 34} ${bodyCy} ${bodyCx - 44} ${bodyCy - 6} ${bodyCx - 52} ${bodyCy - 14} C${bodyCx - 40} ${bodyCy - 6} ${bodyCx - 30} ${bodyCy - 2} ${bodyCx - 22} ${bodyCy - 4} Z`, p.dark));
  back.push(...legs.back);
  if (t.spikes) back.push(...spikeRow([[bodyCx - 16, bodyCy - 20, 7], [bodyCx - 4, bodyCy - 23, 8], [bodyCx + 8, bodyCy - 22, 7]], p.accent));
  if (t.armor) back.push(...plateRow([[bodyCx - 12, bodyCy - 18, 15], [bodyCx + 2, bodyCy - 21, 16]], p.dark, p.accent));

  // The frill sits behind the head so the horns can stand on top of it.
  front.push(ellipse(headCx - 4, headCy - 2, frillR, frillR * 0.94, p.accent));
  front.push(ellipse(headCx - 4, headCy - 2, frillR * 0.72, frillR * 0.68, p.body, 0.9));
  front.push(...spikeRow([[headCx - 22, headCy - 12, 7], [headCx - 28, headCy - 2, 6], [headCx - 24, headCy + 9, 6]], p.dark, 0.9));
  front.push(...torso(bodyCx, bodyCy, 32 * grow, 22 * grow, p));
  front.push(...legs.front);

  front.push(rect(headCx - 16, headCy + 4, 22, 22 * grow, 10, p.body, undefined, 12));
  front.push(ellipse(headCx, headCy, headRx, headRy, p.body));
  front.push(ellipse(headCx + 2, headCy + headRy * 0.42, headRx * 0.86, headRy * 0.46, p.dark, 0.3));
  front.push(rect(headCx + headRx * 0.5, headCy + headRy * 0.18, 9, 7, 3, p.belly, undefined, -14));
  front.push(polygon([[headCx + headRx * 0.86, headCy + headRy * 0.24], [headCx + headRx * 1.15, headCy + headRy * 0.36], [headCx + headRx * 0.84, headCy + headRy * 0.72]], p.accent));
  front.push(...mouth(headCx + 2, headCy + headRy * 0.6, headCx + headRx * 0.92, p.dark));
  front.push(...eye(headCx + 1, headCy - headRy * 0.3, 5.4 * headScale, p, t.glowEyes));
  front.push(...brow(headCx - 8, headCy - headRy * 0.86, headCx + 9, headCy - headRy * 0.66, INK));
  front.push(...horn(headCx + 2, headCy - headRy * 0.62, 17, 5, p.belly, p.dark));
  front.push(...horn(headCx + 13, headCy - headRy * 0.5, 13, 7, p.belly, p.dark));
  front.push(...horn(headCx + headRx * 0.86, headCy + headRy * 0.1, 8, 5, p.belly, p.dark));
  if (t.horns) front.push(...horn(headCx - 12, headCy - headRy * 0.88, 11, -2, p.accent, p.dark));
  if (t.fins) front.push(...finRow([[bodyCx - 20, bodyCy - 22, 9], [bodyCx - 8, bodyCy - 26, 10]], p.accent, p.glow, glow));

  return { back, front };
}

/** Spino: the sail is the whole personality, so it gets a glowing core. */
function spino(p: Palette, t: SkinTraits, look: Look): DinoDrawing {
  const { grow, head: headScale, glow } = look;
  const bodyCx = 55;
  const bodyCy = 72;
  const bodyRx = 28 * grow;
  const bodyRy = 24 * grow;
  const headCx = 78;
  const headCy = 44;
  const headRx = 20 * headScale;
  const headRy = 13 * headScale;

  const back: DinoShape[] = [];
  const front: DinoShape[] = [];

  back.push(fillPath(`M${bodyCx - 8} ${bodyCy + 2} C${bodyCx - 28} ${bodyCy + 6} ${bodyCx - 38} ${bodyCy - 4} ${bodyCx - 50} ${bodyCy - 20} C${bodyCx - 38} ${bodyCy - 8} ${bodyCx - 26} ${bodyCy - 2} ${bodyCx - 8} ${bodyCy - 8} Z`, p.dark));

  // The sail, tall and rounded, with a bright edge.
  front.push(
    fillPath(
      `M${bodyCx - 18} ${bodyCy - 12} C${bodyCx - 24} ${bodyCy - 40} ${bodyCx - 8} ${bodyCy - 52} ${bodyCx + 8} ${bodyCy - 46} C${bodyCx + 22} ${bodyCy - 40} ${bodyCx + 22} ${bodyCy - 20} ${bodyCx + 16} ${bodyCy - 8} Z`,
      p.accent,
    ),
  );
  front.push(
    fillPath(
      `M${bodyCx - 12} ${bodyCy - 14} C${bodyCx - 16} ${bodyCy - 34} ${bodyCx - 4} ${bodyCy - 44} ${bodyCx + 6} ${bodyCy - 39} C${bodyCx + 16} ${bodyCy - 34} ${bodyCx + 15} ${bodyCy - 20} ${bodyCx + 11} ${bodyCy - 11} Z`,
      p.glow,
      0.36 + glow * 0.24,
    ),
  );
  if (t.spikes) front.push(...spikeRow([[bodyCx - 14, bodyCy - 26, 7], [bodyCx - 2, bodyCy - 32, 8], [bodyCx + 9, bodyCy - 30, 6]], p.dark, 0.85));

  back.push(...leg(bodyCx + 8, bodyCy + 12, 10 * grow, 12 * grow, bodyCx + 3, bodyCy + 20, 11, 20 * grow, p.dark));
  back.push(...foot(bodyCx + 8, 110, 11, p.dark, p.accent));

  front.push(rect(headCx - 30, headCy - 8, 24, 30 * grow, 12, p.body, undefined, -26));
  front.push(...torso(bodyCx, bodyCy, bodyRx, bodyRy, p));
  front.push(...leg(bodyCx - 8, bodyCy + 12, 11 * grow, 13 * grow, bodyCx - 14, bodyCy + 20, 12, 20 * grow, p.body));
  front.push(...foot(bodyCx - 8, 111, 12, p.body, p.accent));
  front.push(...arm(bodyCx + 12, bodyCy - 6, 15, 9, p.body, p.accent, -10));

  // Long crocodile snout.
  front.push(ellipse(headCx, headCy, headRx, headRy, p.body));
  front.push(fillPath(`M${headCx + headRx * 0.3} ${headCy - headRy * 0.3} C${headCx + headRx * 1.1} ${headCy - headRy * 0.5} ${headCx + headRx * 1.4} ${headCy + headRy * 0.2} ${headCx + headRx * 1.5} ${headCy + headRy * 0.7} C${headCx + headRx * 1} ${headCy + headRy * 0.9} ${headCx + headRx * 0.6} ${headCy + headRy * 0.8} ${headCx + headRx * 0.3} ${headCy + headRy * 0.4} Z`, p.belly));
  front.push(fillPath(`M${headCx + headRx * 0.4} ${headCy + headRy * 0.42} C${headCx + headRx * 0.9} ${headCy + headRy * 0.5} ${headCx + headRx * 1.3} ${headCy + headRy * 0.6} ${headCx + headRx * 1.46} ${headCy + headRy * 0.72} C${headCx + headRx * 1.05} ${headCy + headRy * 0.86} ${headCx + headRx * 0.7} ${headCy + headRy * 0.8} ${headCx + headRx * 0.4} ${headCy + headRy * 0.62} Z`, p.body, 0.95));
  front.push(...teeth(headCx + headRx * 0.65, headCy + headRy * 0.42, 5, 3));
  front.push(ellipse(headCx + headRx * 1.2, headCy - headRy * 0.1, 1.4, 1.1, p.eye, 0.8));
  front.push(...eye(headCx + 1, headCy - headRy * 0.36, 5.2 * headScale, p, t.glowEyes));
  front.push(...brow(headCx - 7, headCy - headRy * 0.9, headCx + 9, headCy - headRy * 0.74, INK));
  if (t.horns) {
    front.push(...horn(headCx - headRx * 0.4, headCy - headRy * 0.86, 12, 2, p.accent, p.dark));
    front.push(...horn(headCx + headRx * 0.2, headCy - headRy * 0.9, 9, 4, p.belly, p.dark));
  }

  return { back, front };
}

/** Ptera: both wings spread, a long crest and a beak. */
function ptera(p: Palette, t: SkinTraits, look: Look): DinoDrawing {
  const { grow, head: headScale, glow } = look;
  const bodyCx = 60;
  const bodyCy = 68;

  const back: DinoShape[] = [];
  const front: DinoShape[] = [];

  // Far wing first, in the dark shade, then the tail.
  back.push(
    fillPath(`M${bodyCx + 4} ${bodyCy - 12} C${bodyCx - 14} ${bodyCy - 40} ${bodyCx - 40} ${bodyCy - 50} ${bodyCx - 58} ${bodyCy - 44} C${bodyCx - 40} ${bodyCy - 30} ${bodyCx - 26} ${bodyCy - 14} ${bodyCx - 20} ${bodyCy + 4} Z`, p.dark),
  );
  back.push(fillPath(`M${bodyCx - 4} ${bodyCy + 6} C${bodyCx - 20} ${bodyCy + 10} ${bodyCx - 32} ${bodyCy + 6} ${bodyCx - 44} ${bodyCy - 2} C${bodyCx - 32} ${bodyCy + 4} ${bodyCx - 20} ${bodyCy + 4} ${bodyCx - 4} ${bodyCy} Z`, p.dark));
  back.push(...leg(bodyCx + 4, bodyCy + 14, 8 * grow, 10 * grow, bodyCx + 1, bodyCy + 22, 9, 20 * grow, p.dark));
  back.push(...foot(bodyCx + 5, 110, 10, p.dark, p.accent));

  front.push(...torso(bodyCx, bodyCy, 21 * grow, 20 * grow, p));
  front.push(...leg(bodyCx - 6, bodyCy + 14, 9 * grow, 11 * grow, bodyCx - 11, bodyCy + 22, 10, 20 * grow, p.body));
  front.push(...foot(bodyCx - 5, 111, 11, p.body, p.accent));

  // Near wing, light in front of the dark far wing.
  front.push(
    fillPath(`M${bodyCx - 2} ${bodyCy - 10} C${bodyCx - 8} ${bodyCy - 34} ${bodyCx - 30} ${bodyCy - 46} ${bodyCx - 48} ${bodyCy - 40} C${bodyCx - 30} ${bodyCy - 26} ${bodyCx - 18} ${bodyCy - 12} ${bodyCx - 12} ${bodyCy + 6} Z`, p.body),
  );
  front.push(stroke(`M${bodyCx - 6} ${bodyCy - 12} C${bodyCx - 18} ${bodyCy - 28} ${bodyCx - 32} ${bodyCy - 38} ${bodyCx - 44} ${bodyCy - 40}`, p.dark, 1.3, 0.7));
  front.push(stroke(`M${bodyCx - 10} ${bodyCy - 4} C${bodyCx - 22} ${bodyCy - 18} ${bodyCx - 34} ${bodyCy - 28} ${bodyCx - 44} ${bodyCy - 32}`, p.dark, 1.1, 0.5));

  const headCx = 74;
  const headCy = 38;
  const headRx = 16 * headScale;
  const headRy = 14 * headScale;
  front.push(rect(headCx - 12, headCy + 2, 18, 22 * grow, 9, p.body, undefined, -14));
  front.push(ellipse(headCx, headCy, headRx, headRy, p.body));
  front.push(ellipse(headCx - 1, headCy + headRy * 0.44, headRx * 0.8, headRy * 0.44, p.dark, 0.3));
  front.push(fillPath(`M${headCx + headRx * 0.5} ${headCy - headRy * 0.1} C${headCx + headRx * 1.3} ${headCy - headRy * 0.2} ${headCx + headRx * 1.9} ${headCy + headRy * 0.1} ${headCx + headRx * 2} ${headCy + headRy * 0.34} C${headCx + headRx * 1.3} ${headCy + headRy * 0.6} ${headCx + headRx * 0.7} ${headCy + headRy * 0.4} ${headCx + headRx * 0.5} ${headCy + headRy * 0.16} Z`, p.belly));
  front.push(...eye(headCx - 1, headCy - headRy * 0.32, 5 * headScale, p, t.glowEyes));
  front.push(...brow(headCx - 8, headCy - headRy * 0.84, headCx + 7, headCy - headRy * 0.72, INK));
  front.push(...horn(headCx - headRx * 0.5, headCy - headRy * 0.84, 13, -6, p.accent, p.dark));
  front.push(...horn(headCx + headRx * 0.1, headCy - headRy * 0.95, 10, 4, p.accent, p.dark));
  if (t.fins) front.push(...finRow([[bodyCx - 4, bodyCy - 18, 9], [bodyCx + 6, bodyCy - 20, 8]], p.accent, p.glow, glow));
  if (t.horns) front.push(...horn(headCx + headRx * 0.5, headCy - headRy * 0.9, 8, 6, p.belly, p.dark));

  return { back, front };
}

/** Ankylo: a low tank with a club tail and a row of plates. */
function ankylo(p: Palette, t: SkinTraits, look: Look): DinoDrawing {
  const { grow, head: headScale, glow } = look;
  const bodyCx = 58;
  const bodyCy = 78;
  const legs = quadrupedLegs(bodyCy, 40, 70, p, grow);

  const back: DinoShape[] = [];
  const front: DinoShape[] = [];

  // Club tail: a heavy ball with spikes on the end.
  back.push(fillPath(`M${bodyCx - 24} ${bodyCy + 2} C${bodyCx - 30} ${bodyCy + 2} ${bodyCx - 36} ${bodyCy - 2} ${bodyCx - 42} ${bodyCy - 5} C${bodyCx - 36} ${bodyCy - 2} ${bodyCx - 30} ${bodyCy} ${bodyCx - 24} ${bodyCy - 3} Z`, p.dark));
  back.push(ellipse(bodyCx - 46, bodyCy - 6, 10, 9, p.accent));
  back.push(...spikeRow([[bodyCx - 51, bodyCy - 13, 7], [bodyCx - 45, bodyCy - 15, 8], [bodyCx - 39, bodyCy - 11, 6]], p.dark));
  back.push(...legs.back);
  back.push(...plateRow([[bodyCx - 24, bodyCy - 18, 15], [bodyCx - 10, bodyCy - 22, 16], [bodyCx + 4, bodyCy - 22, 15], [bodyCx + 16, bodyCy - 18, 13]], t.armor ? p.dark : p.accent, p.glow));

  front.push(...torso(bodyCx, bodyCy, 33 * grow, 21 * grow, p));
  front.push(...legs.front);
  front.push(...spikeRow([[bodyCx - 18, bodyCy + 18, 6], [bodyCx - 2, bodyCy + 20, 6], [bodyCx + 14, bodyCy + 18, 5]], p.accent));

  const headCx = 92;
  const headCy = 72;
  const headRx = 15 * headScale;
  const headRy = 12 * headScale;
  front.push(rect(headCx - 14, headCy + 2, 18, 18 * grow, 8, p.body, undefined, 10));
  front.push(ellipse(headCx, headCy, headRx, headRy, p.body));
  front.push(ellipse(headCx + 1, headCy + headRy * 0.42, headRx * 0.8, headRy * 0.4, p.dark, 0.28));
  front.push(rect(headCx + headRx * 0.6, headCy + headRy * 0.1, 8, 6, 2.6, p.belly, undefined, -10));
  front.push(...mouth(headCx + 2, headCy + headRy * 0.55, headCx + headRx * 0.95, p.dark));
  front.push(...eye(headCx + 1, headCy - headRy * 0.28, 4.8 * headScale, p, t.glowEyes));
  front.push(...brow(headCx - 7, headCy - headRy * 0.82, headCx + 7, headCy - headRy * 0.7, INK));
  if (t.horns) {
    front.push(...horn(headCx - 9, headCy - headRy * 0.7, 9, -6, p.accent, p.dark));
    front.push(...horn(headCx + 3, headCy - headRy * 0.86, 7, -1, p.belly, p.dark));
  }
  if (t.fins) front.push(...finRow([[bodyCx - 12, bodyCy - 26, 9], [bodyCx, bodyCy - 28, 9]], p.accent, p.glow, glow));

  return { back, front };
}

/** Sauropod: an enormous body, four columns for legs and a long neck. */
function sauropod(p: Palette, t: SkinTraits, look: Look): DinoDrawing {
  const { grow, head: headScale, glow } = look;
  const bodyCx = 54;
  const bodyCy = 76;
  const bodyRx = 30 * grow;
  const bodyRy = 24 * grow;
  const legs = quadrupedLegs(bodyCy, 38, 68, p, grow);
  const neckReach = t.longNeck ? 1.18 : 1;
  const headCx = 76 + 20 * neckReach;
  const headCy = 52 - 26 * neckReach;

  const back: DinoShape[] = [];
  const front: DinoShape[] = [];

  back.push(fillPath(`M${bodyCx - 20} ${bodyCy + 2} C${bodyCx - 30} ${bodyCy + 4} ${bodyCx - 40} ${bodyCy - 1} ${bodyCx - 48} ${bodyCy - 9} C${bodyCx - 38} ${bodyCy - 1} ${bodyCx - 30} ${bodyCy + 1} ${bodyCx - 20} ${bodyCy - 3} Z`, p.dark));
  back.push(...legs.back);
  if (t.spikes) back.push(...spikeRow([[bodyCx - 18, bodyCy - 20, 7], [bodyCx - 6, bodyCy - 23, 8], [bodyCx + 6, bodyCy - 22, 7]], p.accent));
  if (t.armor) back.push(...plateRow([[bodyCx - 12, bodyCy - 18, 16], [bodyCx + 4, bodyCy - 20, 15]], p.dark, p.accent));

  // The neck: a thick curve from the shoulders up to a small head.
  front.push(
    fillPath(
      `M${bodyCx + 10} ${bodyCy - 12} C${bodyCx + 22} ${bodyCy - 30} ${bodyCx + 30} ${bodyCy - 44} ${headCx - 4} ${headCy + 8} L${headCx + 8} ${headCy + 14} C${bodyCx + 30} ${bodyCy - 28} ${bodyCx + 24} ${bodyCy - 6} ${bodyCx + 22} ${bodyCy + 2} Z`,
      p.body,
    ),
  );
  front.push(...torso(bodyCx, bodyCy, bodyRx, bodyRy, p));
  front.push(...legs.front);
  front.push(
    fillPath(
      `M${bodyCx + 14} ${bodyCy - 8} C${bodyCx + 24} ${bodyCy - 26} ${bodyCx + 32} ${bodyCy - 40} ${headCx - 6} ${headCy + 12} L${headCx} ${headCy + 15} C${bodyCx + 26} ${bodyCy - 22} ${bodyCx + 22} ${bodyCy - 4} ${bodyCx + 20} ${bodyCy + 4} Z`,
      p.belly,
      0.65,
    ),
  );

  const headRx = 12 * headScale;
  const headRy = 9 * headScale;
  front.push(ellipse(headCx, headCy, headRx, headRy, p.body));
  front.push(ellipse(headCx + headRx * 0.5, headCy + headRy * 0.3, headRx * 0.6, headRy * 0.5, p.belly));
  front.push(ellipse(headCx + headRx * 1.05, headCy - headRy * 0.05, 1.3, 1.1, p.eye, 0.8));
  front.push(...mouth(headCx + headRx * 0.2, headCy + headRy * 0.5, headCx + headRx, p.dark));
  front.push(...eye(headCx - headRx * 0.1, headCy - headRy * 0.34, 4.8 * headScale, p, t.glowEyes));
  front.push(...brow(headCx - 8, headCy - headRy * 0.9, headCx + 6, headCy - headRy * 0.78, INK));
  if (t.horns) front.push(...horn(headCx - headRx * 0.3, headCy - headRy * 0.9, 9, -2, p.accent, p.dark));
  if (t.fins) front.push(...finRow([[bodyCx - 8, bodyCy - 26, 9], [bodyCx + 4, bodyCy - 28, 10]], p.accent, p.glow, glow));

  return { back, front };
}

/** Kaiju is the biped skeleton at its heaviest, with the glow turned up. */
function kaiju(p: Palette, t: SkinTraits, look: Look): DinoDrawing {
  const drawing = biped('kaiju', p, t, look);
  const bodyCx = 58;
  const bodyCy = 74;
  return {
    back: [...drawing.back, ...finRow([[bodyCx - 30, bodyCy - 8, 12], [bodyCx - 22, bodyCy - 18, 15]], p.accent, p.glow, look.glow)],
    front: drawing.front,
  };
}

// --------------------------------------------------------------- public API

/** One drawing per body plan, for this skin, these traits and this evolution stage. */
export function dinoDrawing(shape: BodyShape, colors: SkinColors, traits: SkinTraits, stage: number): DinoDrawing {
  const p: Palette = {
    body: colors.body,
    dark: colors.bodyDark,
    belly: colors.belly,
    accent: colors.accent,
    glow: colors.glow,
    eye: colors.eye,
  };
  const look = stageLook(stage);
  switch (shape) {
    case 'trike':
      return trike(p, traits, look);
    case 'spino':
      return spino(p, traits, look);
    case 'ptera':
      return ptera(p, traits, look);
    case 'ankylo':
      return ankylo(p, traits, look);
    case 'sauropod':
      return sauropod(p, traits, look);
    case 'kaiju':
      return kaiju(p, traits, look);
    case 'raptor':
      return biped('raptor', p, traits, look);
    default:
      return biped('rex', p, traits, look);
  }
}
