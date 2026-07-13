import * as THREE from 'three';

/**
 * Pixel-art textures for the 3D voxel world, built as DataTextures from
 * string grids (no canvas — works identically on native and web).
 * NearestFilter keeps every texel crisp: the Minecraft look.
 */

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

export function gridTexture(grid: string[], palette: Record<string, string>): THREE.DataTexture {
  const h = grid.length;
  const w = grid[0].length;
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = grid[h - 1 - y][x]; // flip so row 0 = top
      const [r, g, b] = hexToRgb(palette[ch] ?? '#FF00FF');
      const i = (y * w + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, w, h);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

const G = {
  grass: {
    palette: { a: '#5FA346', b: '#6FB855', c: '#4E8A37' },
    grid: ['aabaaaca', 'aaaaabaa', 'caaabaaa', 'aabaaaac', 'aaacaaba', 'baaaaaaa', 'aacaabaa', 'abaaacaa'],
  },
  road: {
    palette: { a: '#7B7B7B', b: '#6C6C6C', c: '#8A8A8A' },
    grid: ['aaabaaaa', 'acaaaaba', 'aaaabaaa', 'baaaaaac', 'aaacaaaa', 'aabaaaba', 'caaaaaaa', 'aaabacaa'],
  },
  roadMajor: {
    palette: { a: '#8C8C8C', b: '#7C7C7C', c: '#9C9C9C' },
    grid: ['aaabaaaa', 'acaaaaba', 'aaaabaaa', 'baaaaaac', 'aaacaaaa', 'aabaaaba', 'caaaaaaa', 'aaabacaa'],
  },
  sidewalk: {
    palette: { a: '#B9B9B0', b: '#A8A89F', c: '#C4C4BB' },
    grid: ['aaaabaaa', 'abaaaaca', 'aaacaaaa', 'bbbbbbbb', 'aaaaabaa', 'acaabaaa', 'aaaaaaac', 'baacaaaa'],
  },
  water: {
    palette: { a: '#4A7BA6', b: '#5B8CB6', c: '#3E6C94' },
    grid: ['aaaaaaaa', 'abbaaaca', 'aaaaaaaa', 'caaabbaa', 'aaaaaaaa', 'aabbaaac', 'aaaaaaaa', 'acaaabba'],
  },
  park: {
    palette: { a: '#67B24C', b: '#76C05B', c: '#5CA341' },
    grid: ['aabaaaca', 'aaaaabaa', 'caaabaaa', 'aabaaaac', 'aaacaaba', 'baaaaaaa', 'aacaabaa', 'abaaacaa'],
  },
  forest: {
    palette: { a: '#2E4D28', b: '#264220', c: '#375E30' },
    grid: ['aabaaaca', 'aaaaabaa', 'caaabaaa', 'aabaaaac', 'aaacaaba', 'baaaaaaa', 'aacaabaa', 'abaaacaa'],
  },
  sand: {
    palette: { a: '#D8C38A', b: '#C9B277', c: '#E4D29B' },
    grid: ['aaabaaaa', 'acaaaaba', 'aaaabaaa', 'baaaaaac', 'aaacaaaa', 'aabaaaba', 'caaaaaaa', 'aaabacaa'],
  },
  path: {
    palette: { a: '#A08A5E', b: '#8F7A50', c: '#B29A6C' },
    grid: ['aabaacaa', 'acaaaaba', 'aaabaaaa', 'baaacaab', 'aacaaaaa', 'aabaabca', 'caaaaaaa', 'aabacaaa'],
  },
  crosswalk: {
    palette: { a: '#7B7B7B', w: '#E8E8E0' },
    grid: ['wwaawwaa', 'wwaawwaa', 'wwaawwaa', 'wwaawwaa', 'wwaawwaa', 'wwaawwaa', 'wwaawwaa', 'wwaawwaa'],
  },
  roofPlanks: {
    palette: { a: '#9A6A3C', b: '#7A5230', c: '#835836' },
    grid: ['bbbbbbbb', 'aaacaaaa', 'aaacaaaa', 'aaacaaaa', 'bbbbbbbb', 'acaaaaca', 'acaaaaca', 'acaaaaca'],
  },
  roofCobble: {
    palette: { a: '#8F8F8F', b: '#7E7E7E', c: '#9C9C9C' },
    grid: ['bbbaaccb', 'bbbaaccb', 'aabbbbaa', 'ccabbbaa', 'ccabbaac', 'aabbaacc', 'bbaacbba', 'bbaacbba'],
  },
  roofBrick: {
    palette: { a: '#A24E38', b: '#853E2C', c: '#8E4632' },
    grid: ['bbbbbbbb', 'aacaaaca', 'aacaaaca', 'bbbbbbbb', 'caaacaaa', 'caaacaaa', 'bbbbbbbb', 'aacaaaca'],
  },
  wallPlaster: {
    palette: { a: '#D9CBA8', b: '#C9BA95', c: '#E5D9BC' },
    grid: ['aaaabaaa', 'abaaaaca', 'aaaaaaaa', 'caabaaaa', 'aaaaaaba', 'aabaaaaa', 'acaaacaa', 'aaaaaaaa'],
  },
  wallWood: {
    palette: { a: '#8A5F35', b: '#7A5230', c: '#96683E' },
    grid: ['abaaabaa', 'abaaabaa', 'acaaacaa', 'abaaabaa', 'abaaabaa', 'acaaacaa', 'abaaabaa', 'abaaabaa'],
  },
  wallStone: {
    palette: { a: '#9A9A9A', b: '#878787', c: '#ABABAB' },
    grid: ['bbbaaccb', 'bbbaaccb', 'aabbbbaa', 'ccabbbaa', 'ccabbaac', 'aabbaacc', 'bbaacbba', 'bbaacbba'],
  },
  leaves: {
    palette: { a: '#2E7D32', b: '#256B2A', c: '#43A047' },
    grid: ['abacabaa', 'caaabaac', 'abcaaaba', 'aabacaab', 'bacaabca', 'aabaacaa', 'cabacaba', 'aacabaac'],
  },
  trunk: {
    palette: { a: '#5C3E22', b: '#4E3319', c: '#6B4A2B' },
    grid: ['abaacaba', 'abaacaba', 'abaacaba', 'abaacaba', 'abaacaba', 'abaacaba', 'abaacaba', 'abaacaba'],
  },
} as const;

export type TextureName = keyof typeof G;

let cache: Map<TextureName, THREE.DataTexture> | null = null;

export function textures(): Map<TextureName, THREE.DataTexture> {
  if (!cache) {
    cache = new Map();
    (Object.keys(G) as TextureName[]).forEach((k) => {
      cache!.set(k, gridTexture([...G[k].grid], G[k].palette as Record<string, string>));
    });
  }
  return cache;
}
