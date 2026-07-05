import React from 'react';
import Svg, { G, Rect } from 'react-native-svg';

/**
 * Pixel-art icon renderer: takes a grid of characters and a palette and
 * draws one SVG rect per pixel. All icons in the app are original pixel
 * art defined this way — nothing is copied from any game.
 *
 * '.' (or space) = transparent.
 */
export interface PixelIconProps {
  grid: string[];
  palette: Record<string, string>;
  size?: number;
}

export function PixelIcon({ grid, palette, size = 32 }: PixelIconProps) {
  const rows = grid.length;
  const cols = Math.max(...grid.map((r) => r.length));
  const rects: React.ReactElement[] = [];
  grid.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const fill = palette[ch];
      if (!fill) continue;
      rects.push(<Rect key={`${x}-${y}`} x={x} y={y} width={1.05} height={1.05} fill={fill} />);
    }
  });
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${cols} ${rows}`}>
      {rects}
    </Svg>
  );
}

/**
 * Same pixel-grid renderer but as an SVG <G> group, for embedding glyphs
 * inside a larger Svg scene (e.g. markers drawn onto the parchment map).
 * `x`/`y` position the glyph's top-left; `size` is the rendered width.
 */
export function PixelGlyph({
  grid,
  palette,
  x,
  y,
  size = 24,
}: PixelIconProps & { x: number; y: number }) {
  const cols = Math.max(...grid.map((r) => r.length));
  const px = size / cols;
  const rects: React.ReactElement[] = [];
  grid.forEach((row, gy) => {
    for (let gx = 0; gx < row.length; gx++) {
      const ch = row[gx];
      if (ch === '.' || ch === ' ') continue;
      const fill = palette[ch];
      if (!fill) continue;
      rects.push(
        <Rect
          key={`${gx}-${gy}`}
          x={x + gx * px}
          y={y + gy * px}
          width={px * 1.05}
          height={px * 1.05}
          fill={fill}
        />,
      );
    }
  });
  return <G>{rects}</G>;
}
