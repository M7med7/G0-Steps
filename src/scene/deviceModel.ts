/*
 * Procedural 3D model of the station, one group per layer, built from the team's exploded concept render.
 * Units: 1 = 10 cm. The footprint is 44 × 34 cm. Sizes are illustrative, not engineering dimensions.
 *
 * Every layer gets its own materials so the scene can fade or highlight one layer without touching the others.
 */
import * as THREE from 'three';
import { DEVICE_LAYERS, type DeviceLayerId, type DevicePartId } from '../models/deviceLayers';

/** Surface colours of the physical parts. UI colours stay in tokens.css. */
const COLOR = {
  shell: 0xeef0ef,
  shellDark: 0x16191a,
  rubber: 0x202324,
  frame: 0xd4d8d8,
  grid: 0x23272a,
  pcb: 0x1f6a3a,
  chip: 0x1a1c1e,
  shield: 0xc9ccce,
  battery: 0x1f63c9,
  batteryCap: 0xb9bec2,
  pin: 0xc9a14a,
  connector: 0xf1efe8,
  insulation: 0x2c3134,
  tray: 0xb7bcbf,
  camPcb: 0x1b2433,
  lensGlass: 0x2c3a66,
  lensGlassMlx: 0x4a2440,
  glass: 0xd9ecef,
  glassRim: 0x3a3f42,
  fsr: 0x3b3f42,
  fsrRing: 0xb08326,
  plate: 0x2a2e31,
  ledRed: 0xe0393e,
  ledBlue: 0x2f6bff,
} as const;

export const FOOTPRINT = { width: 4.4, depth: 3.4 } as const;

/** Height of each layer's base when assembled. */
const ASSEMBLED_Y: Readonly<Record<DeviceLayerId, number>> = {
  outerShell: 0,
  pressureSensors: 0.12,
  supports: 0.18,
  innerFrame: 0.45,
  circuit: 0.52,
  insulation: 0.95,
  cameras: 1.02,
  topGlass: 1.3,
};

/** Height of each layer's base when exploded, with clear air between layers so every label has its own line. */
const EXPLODED_Y: Readonly<Record<DeviceLayerId, number>> = {
  outerShell: 0,
  pressureSensors: 1.7,
  supports: 2.4,
  innerFrame: 3.2,
  circuit: 4.4,
  insulation: 5.2,
  cameras: 5.9,
  topGlass: 6.8,
};

export interface LayerObject {
  readonly id: DeviceLayerId;
  readonly group: THREE.Group;
  readonly parts: ReadonlyMap<DevicePartId, THREE.Object3D>;
  readonly materials: readonly THREE.MeshStandardMaterial[];
  /** Bounds with the group at the origin. */
  readonly localBox: THREE.Box3;
  readonly partBoxes: ReadonlyMap<DevicePartId, THREE.Box3>;
}

/** Height of a layer's base for an explode amount from 0 (assembled) to 1 (exploded). */
export function layerY(id: DeviceLayerId, explode: number): number {
  return THREE.MathUtils.lerp(ASSEMBLED_Y[id], EXPLODED_Y[id], explode);
}

// ---------------------------------------------------------------- geometry helpers

function roundedRect(width: number, depth: number, radius: number): THREE.Shape {
  const shape = new THREE.Shape();
  addRoundedRect(shape, width, depth, radius);
  return shape;
}

function addRoundedRect(path: THREE.Path, width: number, depth: number, radius: number): void {
  const x = -width / 2;
  const y = -depth / 2;
  const r = Math.min(radius, width / 2, depth / 2);
  path.moveTo(x + r, y);
  path.lineTo(x + width - r, y);
  path.quadraticCurveTo(x + width, y, x + width, y + r);
  path.lineTo(x + width, y + depth - r);
  path.quadraticCurveTo(x + width, y + depth, x + width - r, y + depth);
  path.lineTo(x + r, y + depth);
  path.quadraticCurveTo(x, y + depth, x, y + depth - r);
  path.lineTo(x, y + r);
  path.quadraticCurveTo(x, y, x + r, y);
}

/** Extrudes a shape upwards so it sits between y = 0 and y = height, with softly rounded edges. */
function extrudeUp(shape: THREE.Shape, height: number, bevel = 0.025): THREE.BufferGeometry {
  const b = Math.min(bevel, height / 3);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(height - 2 * b, 0.001),
    bevelEnabled: b > 0,
    bevelThickness: b,
    bevelSize: b,
    bevelSegments: 3,
    curveSegments: 12,
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, b, 0);
  return geometry;
}

function plateGeometry(width: number, depth: number, height: number, radius: number, bevel?: number): THREE.BufferGeometry {
  return extrudeUp(roundedRect(width, depth, radius), height, bevel);
}

/** A rounded rectangular wall ring, like the sides of a tray. */
function ringGeometry(width: number, depth: number, radius: number, wall: number, height: number, bevel?: number): THREE.BufferGeometry {
  const shape = roundedRect(width, depth, radius);
  const hole = new THREE.Path();
  addRoundedRect(hole, width - 2 * wall, depth - 2 * wall, Math.max(radius - wall, 0.02));
  shape.holes.push(hole);
  return extrudeUp(shape, height, bevel);
}

/** Small deterministic random numbers, so the circuit board looks the same on every load. */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function canvasTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas is not available');
  draw(ctx);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/** Collects the materials one layer creates, so they are never shared with another layer. */
class Materials {
  readonly all: THREE.MeshStandardMaterial[] = [];

  standard(params: THREE.MeshStandardMaterialParameters): THREE.MeshStandardMaterial {
    const material = new THREE.MeshStandardMaterial(params);
    this.all.push(material);
    return material;
  }

  physical(params: THREE.MeshPhysicalMaterialParameters): THREE.MeshPhysicalMaterial {
    const material = new THREE.MeshPhysicalMaterial(params);
    this.all.push(material);
    return material;
  }
}

function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  return m;
}

/** One InstancedMesh of boxes, each given as [x, y, z, width, height, depth] with y at the box's base. */
function boxes(material: THREE.Material, list: readonly (readonly [number, number, number, number, number, number])[]): THREE.InstancedMesh {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const instanced = new THREE.InstancedMesh(geometry, material, list.length);
  const matrix = new THREE.Matrix4();
  list.forEach(([x, y, z, w, h, d], i) => {
    matrix.makeScale(w, h, d).setPosition(x, y + h / 2, z);
    instanced.setMatrixAt(i, matrix);
  });
  instanced.computeBoundingSphere();
  instanced.computeBoundingBox();
  return instanced;
}

// ---------------------------------------------------------------- layers

const W = FOOTPRINT.width;
const D = FOOTPRINT.depth;

function buildOuterShell(m: Materials): THREE.Group {
  const group = new THREE.Group();
  const shell = m.standard({ color: COLOR.shell, roughness: 0.38, metalness: 0 });
  const dark = m.standard({ color: COLOR.shellDark, roughness: 0.7 });
  const rubber = m.standard({ color: COLOR.rubber, roughness: 0.9 });

  group.add(mesh(plateGeometry(W, D, 0.12, 0.45), shell));
  group.add(mesh(ringGeometry(W, D, 0.45, 0.16, 1.3, 0.05), shell));
  // Dark interior floor, seen through the front window and from above.
  group.add(mesh(plateGeometry(W - 0.34, D - 0.34, 0.02, 0.3, 0), dark, 0, 0.12, 0));

  // Front window: a dark recess with a soft frame, as in the render.
  const window = mesh(plateGeometry(2.9, 0.6, 0.03, 0.2, 0.01), dark);
  window.rotation.x = Math.PI / 2;
  window.position.set(0, 0.62, D / 2 + 0.005);
  group.add(window);

  // Status light on the front.
  const led = mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.02, 16), m.standard({ color: COLOR.shellDark, roughness: 0.3 }));
  led.rotation.x = Math.PI / 2;
  led.position.set(1.85, 0.62, D / 2 + 0.01);
  group.add(led);

  // Rubber foot under the base.
  group.add(mesh(plateGeometry(W - 0.8, D - 0.8, 0.08, 0.3, 0.02), rubber, 0, -0.08, 0));
  return group;
}

/** 4 FSRs per foot at the zones the app uses: big toe, inner forefoot, outer forefoot, heel. */
const FSR_LAYOUT: readonly (readonly [number, number])[] = [
  [-0.65, -1.0],
  [-0.55, -0.45],
  [-1.08, -0.4],
  [-0.85, 0.95],
  [0.65, -1.0],
  [0.55, -0.45],
  [1.08, -0.4],
  [0.85, 0.95],
];

function buildPressureSensors(m: Materials): THREE.Group {
  const group = new THREE.Group();
  const plate = m.standard({ color: COLOR.plate, roughness: 0.75 });
  const fsr = m.standard({ color: COLOR.fsr, roughness: 0.45, metalness: 0.2 });
  const ring = m.standard({ color: COLOR.fsrRing, roughness: 0.35, metalness: 0.8 });
  const trace = m.standard({ color: COLOR.fsrRing, roughness: 0.4, metalness: 0.7 });

  group.add(mesh(plateGeometry(W - 0.4, D - 0.4, 0.05, 0.3, 0.01), plate));

  const disc = new THREE.CylinderGeometry(0.17, 0.17, 0.02, 40);
  const rim = new THREE.TorusGeometry(0.17, 0.012, 8, 40);
  for (const [x, z] of FSR_LAYOUT) {
    group.add(mesh(disc, fsr, x, 0.06, z));
    const r = mesh(rim, ring, x, 0.07, z);
    r.rotation.x = Math.PI / 2;
    group.add(r);
  }
  // Each FSR402 has a flat tail running to the connector at the back edge.
  group.add(
    boxes(
      trace,
      FSR_LAYOUT.map(([x, z]) => [x, 0.05, (z - 1.45) / 2, 0.05, 0.008, Math.abs(-1.45 - z)] as const),
    ),
  );
  return group;
}

function buildSupports(m: Materials): THREE.Group {
  const group = new THREE.Group();
  const black = m.standard({ color: COLOR.grid, roughness: 0.55 });
  const list: [number, number, number, number, number, number][] = [];
  const w = W - 0.6;
  const d = D - 0.6;
  const h = 0.24;
  // Outer frame.
  list.push([0, 0, -d / 2, w, h, 0.12], [0, 0, d / 2, w, h, 0.12], [-w / 2, 0, 0, 0.12, h, d], [w / 2, 0, 0, 0.12, h, d]);
  // Inner grid, lower than the frame.
  for (let i = 1; i < 11; i++) list.push([-w / 2 + (i * w) / 11, 0, 0, 0.05, h * 0.75, d - 0.1]);
  for (let i = 1; i < 7; i++) list.push([0, 0, -d / 2 + (i * d) / 7, w - 0.1, h * 0.75, 0.05]);
  // Corner posts.
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) list.push([(sx * w) / 2, 0, (sz * d) / 2, 0.22, h + 0.06, 0.22]);
  group.add(boxes(black, list));
  return group;
}

function buildInnerFrame(m: Materials): THREE.Group {
  const group = new THREE.Group();
  const frame = m.standard({ color: COLOR.frame, roughness: 0.45 });
  const dark = m.standard({ color: COLOR.shellDark, roughness: 0.7 });
  const w = W - 0.36;
  const d = D - 0.36;
  group.add(mesh(plateGeometry(w, d, 0.06, 0.35, 0.015), frame));
  group.add(mesh(ringGeometry(w, d, 0.35, 0.12, 0.72, 0.03), frame));
  // Cable slot in the floor and a vent in the front wall.
  group.add(mesh(plateGeometry(2.4, 0.5, 0.012, 0.08, 0), dark, 0, 0.061, 0.75));
  const vent = mesh(plateGeometry(2.4, 0.26, 0.015, 0.1, 0), dark);
  vent.rotation.x = Math.PI / 2;
  vent.position.set(0, 0.36, d / 2 + 0.002);
  group.add(vent);
  // Mounting bosses for the circuit board.
  const boss = new THREE.CylinderGeometry(0.06, 0.07, 0.12, 16);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) group.add(mesh(boss, frame, sx * 1.65, 0.12, sz * 1.1));
  return group;
}

function buildCircuit(m: Materials): THREE.Group {
  const group = new THREE.Group();
  const pcb = m.standard({ color: COLOR.pcb, roughness: 0.5, metalness: 0.05 });
  const chip = m.standard({ color: COLOR.chip, roughness: 0.4 });
  const shield = m.standard({ color: COLOR.shield, roughness: 0.25, metalness: 0.9 });
  const battery = m.standard({ color: COLOR.battery, roughness: 0.3, metalness: 0.1 });
  const cap = m.standard({ color: COLOR.batteryCap, roughness: 0.25, metalness: 0.9 });
  const pin = m.standard({ color: COLOR.pin, roughness: 0.3, metalness: 0.9 });
  const connector = m.standard({ color: COLOR.connector, roughness: 0.6 });

  const w = 3.7;
  const d = 2.5;
  const top = 0.05;
  group.add(mesh(plateGeometry(w, d, top, 0.08, 0.008), pcb));

  // ESP32-S3 module: metal shield with its PCB antenna sticking out.
  group.add(mesh(new THREE.BoxGeometry(0.55, 0.012, 0.75), pcb, -0.95, top + 0.006, -0.55));
  group.add(mesh(new THREE.BoxGeometry(0.5, 0.06, 0.55), shield, -0.95, top + 0.042, -0.48));

  // Main chips, connectors and the battery pack.
  const chips: [number, number, number, number, number, number][] = [
    [0.15, top, -0.6, 0.42, 0.05, 0.42],
    [0.85, top, -0.65, 0.3, 0.04, 0.3],
    [1.35, top, -0.45, 0.22, 0.04, 0.35],
    [0.55, top, -0.05, 0.26, 0.04, 0.26],
    [-0.2, top, -0.05, 0.34, 0.04, 0.2],
  ];
  group.add(boxes(chip, chips));
  group.add(
    boxes(connector, [
      [1.55, top, 0.0, 0.28, 0.16, 0.42],
      [-1.55, top, -0.85, 0.3, 0.14, 0.3],
      [1.1, top, -1.05, 0.6, 0.1, 0.12],
    ]),
  );

  const cell = new THREE.CylinderGeometry(0.14, 0.14, 0.75, 32);
  const end = new THREE.CylinderGeometry(0.11, 0.11, 0.04, 24);
  for (let i = 0; i < 3; i++) {
    const x = -0.9 + i * 0.85;
    const body = mesh(cell, battery, x, top + 0.15, 0.78);
    body.rotation.z = Math.PI / 2;
    group.add(body);
    for (const side of [-1, 1]) {
      const c = mesh(end, cap, x + side * 0.395, top + 0.15, 0.78);
      c.rotation.z = Math.PI / 2;
      group.add(c);
    }
  }

  // Header pins and small surface-mount parts, placed the same way every time.
  const pins: [number, number, number, number, number, number][] = [];
  for (let i = 0; i < 16; i++) pins.push([-1.6 + i * 0.07, top, 1.13, 0.025, 0.12, 0.025], [-1.6 + i * 0.07, top, 1.06, 0.025, 0.12, 0.025]);
  group.add(boxes(pin, pins));

  const rand = seededRandom(7);
  const smd: [number, number, number, number, number, number][] = [];
  while (smd.length < 70) {
    const x = -1.7 + rand() * 3.4;
    const z = -1.1 + rand() * 1.55;
    const nearBig = chips.some(([cx, , cz, cw, , cd]) => Math.abs(x - cx) < cw / 2 + 0.06 && Math.abs(z - cz) < cd / 2 + 0.06);
    const nearModule = Math.abs(x + 0.95) < 0.35 && Math.abs(z + 0.5) < 0.45;
    if (nearBig || nearModule) continue;
    const long = rand() > 0.5;
    smd.push([x, top, z, long ? 0.07 : 0.035, 0.025, long ? 0.035 : 0.07]);
  }
  group.add(boxes(chip, smd));
  return group;
}

function buildInsulation(m: Materials): THREE.Group {
  const group = new THREE.Group();
  const w = W - 0.4;
  const d = D - 0.4;
  const dots = canvasTexture(1024, 768, (ctx) => {
    ctx.fillStyle = '#3a4044';
    ctx.fillRect(0, 0, 1024, 768);
    ctx.fillStyle = '#15181a';
    for (let y = 30; y < 768; y += 34) {
      for (let x = 30 + ((y / 34) % 2) * 17; x < 1000; x += 34) {
        ctx.beginPath();
        ctx.arc(x, y, 5.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
  const top = m.standard({ color: 0xffffff, map: dots, roughness: 0.8 });
  const rim = m.standard({ color: COLOR.insulation, roughness: 0.6 });
  group.add(mesh(ringGeometry(w, d, 0.32, 0.12, 0.09, 0.02), rim));
  const face = mesh(new THREE.PlaneGeometry(w - 0.22, d - 0.22), top, 0, 0.05, 0);
  face.rotation.x = -Math.PI / 2;
  group.add(face);
  group.add(mesh(plateGeometry(w - 0.2, d - 0.2, 0.045, 0.24, 0.005), rim));
  return group;
}

function cameraModule(m: Materials, kind: DevicePartId): THREE.Group {
  const group = new THREE.Group();
  const board = m.standard({ color: COLOR.camPcb, roughness: 0.5 });
  const black = m.standard({ color: COLOR.chip, roughness: 0.35 });
  const metal = m.standard({ color: COLOR.tray, roughness: 0.2, metalness: 0.95 });
  const lens = m.physical({
    color: kind === 'mlxCamera' ? COLOR.lensGlassMlx : COLOR.lensGlass,
    roughness: 0.05,
    metalness: 0.6,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
  });

  group.add(mesh(plateGeometry(0.62, 0.62, 0.04, 0.05, 0.005), board));
  if (kind === 'mlxCamera') {
    // MLX thermal sensor: a metal can with a dark window on top.
    group.add(mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.16, 40), metal, 0, 0.12, 0));
    group.add(mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.012, 40), lens, 0, 0.205, 0));
    group.add(mesh(new THREE.BoxGeometry(0.06, 0.03, 0.06), m.standard({ color: COLOR.ledRed, emissive: COLOR.ledRed, emissiveIntensity: 0.6 }), 0.24, 0.055, -0.22));
  } else {
    // ESP32 camera: lens holder with a round lens.
    group.add(mesh(new THREE.BoxGeometry(0.3, 0.12, 0.3), black, 0, 0.1, 0));
    group.add(mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.1, 40), black, 0, 0.21, 0));
    group.add(mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.012, 40), lens, 0, 0.265, 0));
    group.add(mesh(new THREE.BoxGeometry(0.06, 0.03, 0.06), m.standard({ color: COLOR.ledBlue, emissive: COLOR.ledBlue, emissiveIntensity: 0.6 }), -0.24, 0.055, -0.22));
  }
  return group;
}

function buildCameras(m: Materials, parts: Map<DevicePartId, THREE.Object3D>): THREE.Group {
  const group = new THREE.Group();
  const tray = m.standard({ color: COLOR.tray, roughness: 0.3, metalness: 0.85 });
  const floor = m.standard({ color: COLOR.plate, roughness: 0.6 });
  const w = W - 0.4;
  const d = D - 0.7;
  group.add(mesh(ringGeometry(w, d, 0.22, 0.14, 0.22, 0.02), tray));
  group.add(mesh(plateGeometry(w - 0.2, d - 0.2, 0.03, 0.15, 0.005), floor));
  // Cross rail the camera modules sit on.
  group.add(mesh(new THREE.BoxGeometry(w - 0.3, 0.06, 0.7), tray, 0, 0.06, 0));

  const esp = cameraModule(m, 'esp32Camera');
  esp.position.set(-0.85, 0.09, 0);
  const mlx = cameraModule(m, 'mlxCamera');
  mlx.position.set(0.85, 0.09, 0);
  group.add(esp, mlx);
  parts.set('esp32Camera', esp);
  parts.set('mlxCamera', mlx);
  return group;
}

function footOutlines(): THREE.CanvasTexture {
  return canvasTexture(1024, 1024, (ctx) => {
    ctx.clearRect(0, 0, 1024, 1024);
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.lineWidth = 6;
    for (const side of [-1, 1]) {
      ctx.save();
      // Left foot on the left, big toe towards the middle, toes at the back.
      ctx.translate(512 + side * 230, 540);
      ctx.scale(-side, 1);
      ctx.beginPath();
      ctx.moveTo(0, 330);
      ctx.bezierCurveTo(-95, 330, -105, 210, -80, 90);
      ctx.bezierCurveTo(-62, 0, -120, -120, -110, -230);
      ctx.bezierCurveTo(-100, -330, 90, -350, 105, -230);
      ctx.bezierCurveTo(118, -120, 80, -20, 92, 110);
      ctx.bezierCurveTo(104, 230, 95, 330, 0, 330);
      ctx.fill();
      ctx.stroke();
      const toes: readonly (readonly [number, number, number])[] = [
        [70, -330, 46],
        [5, -360, 32],
        [-48, -350, 28],
        [-92, -325, 24],
        [-125, -285, 21],
      ];
      for (const [x, y, r] of toes) {
        ctx.beginPath();
        ctx.ellipse(x, y, r, r * 1.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }
  });
}

function buildTopGlass(m: Materials): THREE.Group {
  const group = new THREE.Group();
  const glass = m.physical({
    color: COLOR.glass,
    roughness: 0.04,
    metalness: 0,
    transparent: true,
    opacity: 0.3,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    depthWrite: false,
  });
  const rim = m.standard({ color: COLOR.glassRim, roughness: 0.35, metalness: 0.6 });
  const outline = m.standard({ map: footOutlines(), transparent: true, roughness: 0.5, depthWrite: false });

  group.add(mesh(ringGeometry(W, D, 0.45, 0.07, 0.13, 0.03), rim));
  group.add(mesh(plateGeometry(W - 0.12, D - 0.12, 0.1, 0.4, 0.02), glass, 0, 0.015, 0));
  const feet = mesh(new THREE.PlaneGeometry(2.7, 2.7), outline, 0, 0.118, 0);
  feet.rotation.x = -Math.PI / 2;
  feet.renderOrder = 2;
  group.add(feet);
  return group;
}

// ---------------------------------------------------------------- assembly

export function buildDevice(): Map<DeviceLayerId, LayerObject> {
  const layers = new Map<DeviceLayerId, LayerObject>();
  for (const id of DEVICE_LAYERS) {
    const m = new Materials();
    const parts = new Map<DevicePartId, THREE.Object3D>();
    const group =
      id === 'outerShell' ? buildOuterShell(m)
      : id === 'pressureSensors' ? buildPressureSensors(m)
      : id === 'supports' ? buildSupports(m)
      : id === 'innerFrame' ? buildInnerFrame(m)
      : id === 'circuit' ? buildCircuit(m)
      : id === 'insulation' ? buildInsulation(m)
      : id === 'cameras' ? buildCameras(m, parts)
      : buildTopGlass(m);
    group.name = id;

    group.traverse((child) => {
      child.userData.layer = id;
    });
    for (const [part, object] of parts) object.traverse((child) => (child.userData.part = part));

    group.updateMatrixWorld(true);
    const localBox = new THREE.Box3().setFromObject(group);
    const partBoxes = new Map<DevicePartId, THREE.Box3>();
    for (const [part, object] of parts) partBoxes.set(part, new THREE.Box3().setFromObject(object));

    layers.set(id, { id, group, parts, materials: m.all, localBox, partBoxes });
  }
  return layers;
}

/** A soft round shadow under the station, cheaper than real-time shadows and steadier on small GPUs. */
export function buildGroundShadow(): THREE.Mesh {
  const texture = canvasTexture(256, 256, (ctx) => {
    const g = ctx.createRadialGradient(128, 128, 10, 128, 128, 128);
    g.addColorStop(0, 'rgba(10,30,34,0.45)');
    g.addColorStop(0.6, 'rgba(10,30,34,0.18)');
    g.addColorStop(1, 'rgba(10,30,34,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
  });
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(W * 1.7, D * 1.9),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.085;
  return shadow;
}
