import * as THREE from 'three';
import type { LatLng, Route } from '@/nav/types';
import type { VoxelGrid, TerrainType } from '@/map/voxelize';
import type { WorldData } from '@/map/worldData';
import { cellHash } from '@/map/projection';
import { blockCenterScene, blockMeters, makeOrigin, toScene, type SceneOrigin } from './geo3d';
import { textures, type TextureName } from './pixelTextures';

/**
 * Builds the static voxel world (terrain, buildings, trees, crosswalks,
 * flowers) and dynamic nav objects (route, player, destination) as three.js
 * objects. Pure scene-graph construction — no rendering here.
 */

const TERRAIN_TEX: Record<Exclude<TerrainType, 'building'>, TextureName> = {
  water: 'water',
  park: 'park',
  forest: 'forest',
  road: 'road',
  road_major: 'roadMajor',
  sidewalk: 'sidewalk',
  path: 'path',
  sand: 'sand',
};

function mat(name: TextureName, repeat = 1): THREE.MeshLambertMaterial {
  const tex = textures().get(name)!.clone();
  tex.repeat.set(repeat, repeat);
  tex.needsUpdate = true;
  return new THREE.MeshLambertMaterial({ map: tex });
}

export interface WorldScene {
  group: THREE.Group;
  origin: SceneOrigin;
}

export function buildWorld(grid: VoxelGrid, features: WorldData): WorldScene {
  const origin = makeOrigin(features.center);
  const group = new THREE.Group();
  const B = blockMeters(origin);

  /* ——— ground: one big grass plane ——— */
  const groundSize = features.radiusMeters * 2.6;
  const groundMat = mat('grass', groundSize / B);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(groundSize, groundSize), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  ground.receiveShadow = true;
  group.add(ground);

  /* ——— terrain blocks, instanced per type ——— */
  const byType = new Map<Exclude<TerrainType, 'building'>, Array<{ x: number; z: number }>>();
  const waterEdges: Array<{ x: number; z: number }> = [];
  grid.blocks.forEach((type, k) => {
    if (type === 'building') return;
    const comma = k.indexOf(',');
    const bx = +k.slice(0, comma);
    const by = +k.slice(comma + 1);
    const c = blockCenterScene(bx, by, origin);
    const t = type as Exclude<TerrainType, 'building'>;
    let list = byType.get(t);
    if (!list) byType.set(t, (list = []));
    list.push(c);
    // shoreline rim: water block with any non-water neighbor
    if (type === 'water') {
      const nb = [
        grid.blocks.get(`${bx + 1},${by}`),
        grid.blocks.get(`${bx - 1},${by}`),
        grid.blocks.get(`${bx},${by + 1}`),
        grid.blocks.get(`${bx},${by - 1}`),
      ];
      if (nb.some((n) => n !== 'water')) waterEdges.push(c);
    }
  });

  const dummy = new THREE.Object3D();
  byType.forEach((list, type) => {
    const h = type === 'water' ? 0.25 : 0.35;
    const geo = new THREE.BoxGeometry(B + 0.02, h, B + 0.02);
    const im = new THREE.InstancedMesh(geo, mat(TERRAIN_TEX[type]), list.length);
    list.forEach((c, i) => {
      dummy.position.set(c.x, type === 'water' ? -0.15 : h / 2 - 0.02, c.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix);
    });
    im.receiveShadow = true;
    group.add(im);
  });

  // lighter shoreline rims
  if (waterEdges.length) {
    const rim = new THREE.InstancedMesh(
      new THREE.BoxGeometry(B + 0.02, 0.1, B + 0.02),
      new THREE.MeshLambertMaterial({ color: '#7FA8C9' }),
      waterEdges.length,
    );
    waterEdges.forEach((c, i) => {
      dummy.position.set(c.x, 0.08, c.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      rim.setMatrixAt(i, dummy.matrix);
    });
    group.add(rim);
  }

  /* ——— trees + flowers on greens ——— */
  addVegetation(group, grid, origin, B);

  /* ——— buildings ——— */
  addBuildings(group, features, origin);

  /* ——— crosswalks at road junctions ——— */
  addCrosswalks(group, features, origin, B);

  return { group, origin };
}

/* ————————————————— vegetation ————————————————— */

function addVegetation(group: THREE.Group, grid: VoxelGrid, origin: SceneOrigin, B: number) {
  const trunks: THREE.Matrix4[] = [];
  const leaves: THREE.Matrix4[] = [];
  const tops: THREE.Matrix4[] = [];
  const flowers: Array<{ m: THREE.Matrix4; c: THREE.Color }> = [];
  const dummy = new THREE.Object3D();
  const flowerColors = ['#E3574B', '#F2C438', '#E88AC1', '#FFFFFF'];

  let trees = 0;
  for (const [k, type] of grid.blocks) {
    if (type !== 'park' && type !== 'forest') continue;
    const comma = k.indexOf(',');
    const bx = +k.slice(0, comma);
    const by = +k.slice(comma + 1);
    const c = blockCenterScene(bx, by, origin);
    const jx = (cellHash(bx, by, 9) - 0.5) * B * 0.6;
    const jz = (cellHash(bx, by, 17) - 0.5) * B * 0.6;

    const treeRoll = cellHash(bx, by, 5);
    if (trees < 220 && treeRoll < (type === 'forest' ? 0.5 : 0.3)) {
      trees++;
      const s = 0.8 + cellHash(bx, by, 23) * 0.5;
      dummy.position.set(c.x + jx, 2.2 * s, c.z + jz);
      dummy.scale.set(s, s, s);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      trunks.push(dummy.matrix.clone());
      dummy.position.set(c.x + jx, (4.4 + 1.6) * s, c.z + jz);
      dummy.updateMatrix();
      leaves.push(dummy.matrix.clone());
      dummy.position.set(c.x + jx, (4.4 + 3.6) * s, c.z + jz);
      dummy.updateMatrix();
      tops.push(dummy.matrix.clone());
    } else if (type === 'park' && flowers.length < 120 && cellHash(bx, by, 31) < 0.12) {
      dummy.position.set(c.x + jx, 0.55, c.z + jz);
      dummy.scale.set(1, 1, 1);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      flowers.push({
        m: dummy.matrix.clone(),
        c: new THREE.Color(flowerColors[Math.floor(cellHash(bx, by, 37) * flowerColors.length)]),
      });
    }
  }

  const addIM = (
    matrices: THREE.Matrix4[],
    geo: THREE.BoxGeometry,
    material: THREE.Material,
    shadow = true,
  ) => {
    if (!matrices.length) return;
    const im = new THREE.InstancedMesh(geo, material, matrices.length);
    matrices.forEach((m, i) => im.setMatrixAt(i, m));
    im.castShadow = shadow;
    group.add(im);
  };

  addIM(trunks, new THREE.BoxGeometry(0.9, 4.4, 0.9), mat3('trunk'));
  addIM(leaves, new THREE.BoxGeometry(4.6, 3.2, 4.6), mat3('leaves'));
  addIM(tops, new THREE.BoxGeometry(2.6, 1.8, 2.6), mat3('leaves'));

  if (flowers.length) {
    const im = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.5, 0.9, 0.5),
      new THREE.MeshLambertMaterial(),
      flowers.length,
    );
    flowers.forEach((f, i) => {
      im.setMatrixAt(i, f.m);
      im.setColorAt(i, f.c);
    });
    group.add(im);
  }
}

function mat3(name: TextureName): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({ map: textures().get(name)! });
}

/* ————————————————— buildings ————————————————— */

const hashOf = (p: LatLng) => Math.abs(Math.round(p.lat * 9173 + p.lon * 6291)) >>> 0;

function addBuildings(group: THREE.Group, features: WorldData, origin: SceneOrigin) {
  const walls: TextureName[] = ['wallPlaster', 'wallWood', 'wallStone'];
  const roofs: TextureName[] = ['roofPlanks', 'roofCobble', 'roofBrick'];
  let count = 0;

  for (const poly of features.polygons) {
    if (poly.kind !== 'building' || poly.ring.length < 3) continue;
    if (count++ >= 260) break;
    const h = hashOf(poly.ring[0]);
    const pts = poly.ring.map((p) => toScene(p, origin));

    // oriented box fit: centroid + dominant edge angle + extents
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const cz = pts.reduce((s, p) => s + p.z, 0) / pts.length;
    const e0 = pts[1];
    const angle = Math.atan2(e0.z - pts[0].z, e0.x - pts[0].x);
    const cos = Math.cos(-angle);
    const sin = Math.sin(-angle);
    let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
    for (const p of pts) {
      const u = (p.x - cx) * cos - (p.z - cz) * sin;
      const v = (p.x - cx) * sin + (p.z - cz) * cos;
      minU = Math.min(minU, u); maxU = Math.max(maxU, u);
      minV = Math.min(minV, v); maxV = Math.max(maxV, v);
    }
    const len = Math.max(2.5, maxU - minU);
    const wid = Math.max(2.5, maxV - minV);
    if (len > 120 || wid > 120) continue; // skip giant slabs

    const small = len < 22 && wid < 22;
    const bodyH = small ? 3.4 + (h % 3) * 0.9 : 5 + (h % 4) * 2.2;
    const wallTex = walls[h % walls.length];
    const roofTex = roofs[(h >> 2) % roofs.length];

    const topMat = mat(roofTex, Math.max(1, Math.round(len / 4)));
    topMat.color.set('#8F8F8F'); // darken the flat top so gable steps pop
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(len, bodyH, wid),
      [
        mat(wallTex, Math.max(1, Math.round(wid / 4))),  // +x
        mat(wallTex, Math.max(1, Math.round(wid / 4))),  // -x
        topMat,                                           // +y top
        mat(wallTex, 1),                                  // -y
        mat(wallTex, Math.max(1, Math.round(len / 4))),  // +z
        mat(wallTex, Math.max(1, Math.round(len / 4))),  // -z
      ],
    );
    body.position.set(cx, bodyH / 2, cz);
    body.rotation.y = angle;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    if (small) {
      // stepped blocky gable roof along the long axis
      const r1 = new THREE.Mesh(new THREE.BoxGeometry(len, 1.6, wid * 0.64), mat(roofTex, 2));
      r1.position.set(cx, bodyH + 0.8, cz);
      r1.rotation.y = angle;
      r1.castShadow = true;
      group.add(r1);
      const r2 = new THREE.Mesh(new THREE.BoxGeometry(len, 1.5, wid * 0.3), mat(roofTex, 2));
      r2.position.set(cx, bodyH + 2.3, cz);
      r2.rotation.y = angle;
      r2.castShadow = true;
      group.add(r2);
      if (h % 3 === 0) {
        const chimney = new THREE.Mesh(
          new THREE.BoxGeometry(0.9, 1.6, 0.9),
          new THREE.MeshLambertMaterial({ color: '#6E6E6E' }),
        );
        const t = -0.25 + (h % 5) * 0.12;
        chimney.position.set(
          cx + Math.cos(angle) * len * t,
          bodyH + 2.6,
          cz + Math.sin(angle) * len * t,
        );
        chimney.castShadow = true;
        group.add(chimney);
      }
    } else {
      // flat roof: parapet rim + vents
      const rim = new THREE.Mesh(
        new THREE.BoxGeometry(len + 0.4, 0.5, wid + 0.4),
        new THREE.MeshLambertMaterial({ color: '#5E5E5E' }),
      );
      rim.position.set(cx, bodyH + 0.25, cz);
      rim.rotation.y = angle;
      group.add(rim);
      const vent = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 1.1, 1.6),
        new THREE.MeshLambertMaterial({ color: '#7B7B7B' }),
      );
      vent.position.set(cx + 1.5, bodyH + 0.8, cz - 1);
      vent.castShadow = true;
      group.add(vent);
    }
  }
}

/* ————————————————— crosswalks ————————————————— */

function addCrosswalks(group: THREE.Group, features: WorldData, origin: SceneOrigin, B: number) {
  // Junctions: endpoints shared by 2+ differently-named drivable roads.
  const ends = new Map<string, { p: LatLng; names: Set<string>; bearings: number[] }>();
  for (const road of features.roads) {
    if (road.klass === 'path' || road.pts.length < 2) continue;
    const endpoints: Array<[LatLng, LatLng]> = [
      [road.pts[0], road.pts[1]],
      [road.pts[road.pts.length - 1], road.pts[road.pts.length - 2]],
    ];
    for (const [pt, next] of endpoints) {
      const key = `${pt.lat.toFixed(5)},${pt.lon.toFixed(5)}`;
      let e = ends.get(key);
      if (!e) ends.set(key, (e = { p: pt, names: new Set(), bearings: [] }));
      e.names.add(road.name ?? `#${e.names.size}`);
      const a = toScene(pt, origin);
      const b = toScene(next, origin);
      e.bearings.push(Math.atan2(b.z - a.z, b.x - a.x));
    }
  }

  let n = 0;
  const stripeMat = mat('crosswalk');
  for (const e of ends.values()) {
    if (e.names.size < 2 || n >= 24) continue;
    n++;
    const c = toScene(e.p, origin);
    for (const bearing of e.bearings.slice(0, 4)) {
      const d = B * 1.6; // stripe set sits this far into the approach
      const cw = new THREE.Mesh(new THREE.BoxGeometry(B * 0.9, 0.42, B * 1.7), stripeMat);
      cw.position.set(c.x + Math.cos(bearing) * d, 0.21, c.z + Math.sin(bearing) * d);
      cw.rotation.y = -bearing;
      group.add(cw);
    }
  }
}

/* ————————————————— dynamic nav objects ————————————————— */

export function buildRoute(route: Route, origin: SceneOrigin): THREE.Group {
  const g = new THREE.Group();
  const gold = new THREE.MeshLambertMaterial({ color: '#F2C438' });
  const brown = new THREE.MeshLambertMaterial({ color: '#7A4E1E' });
  const pts = route.coords.map((c) => toScene(c, origin));
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    if (len < 0.5) continue;
    const angle = Math.atan2(b.z - a.z, b.x - a.x);
    const base = new THREE.Mesh(new THREE.BoxGeometry(len + 1.6, 0.5, 4.6), brown);
    base.position.set((a.x + b.x) / 2, 0.35, (a.z + b.z) / 2);
    base.rotation.y = -angle;
    g.add(base);
    const top = new THREE.Mesh(new THREE.BoxGeometry(len + 0.8, 0.5, 2.6), gold);
    top.position.set((a.x + b.x) / 2, 0.62, (a.z + b.z) / 2);
    top.rotation.y = -angle;
    g.add(top);
  }
  return g;
}

export function buildPlayer(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.ConeGeometry(4.2, 10, 4),
    new THREE.MeshLambertMaterial({ color: '#F2C438' }),
  );
  body.geometry.rotateY(Math.PI / 4);
  body.geometry.rotateX(Math.PI / 2); // point along -z (north at heading 0)
  body.position.y = 3;
  body.castShadow = true;
  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(3.4, 3.4, 0.6, 8),
    new THREE.MeshLambertMaterial({ color: '#7A4E1E' }),
  );
  rim.position.y = 0.35;
  g.add(rim, body);
  return g;
}

export function buildDestination(): THREE.Group {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 10, 0.7),
    new THREE.MeshLambertMaterial({ color: '#5C3E22' }),
  );
  pole.position.y = 5;
  pole.castShadow = true;
  const flag = new THREE.Mesh(
    new THREE.BoxGeometry(5, 3.2, 0.4),
    new THREE.MeshLambertMaterial({ color: '#B4322A' }),
  );
  flag.position.set(2.8, 8.2, 0);
  flag.castShadow = true;
  g.add(pole, flag);
  return g;
}
