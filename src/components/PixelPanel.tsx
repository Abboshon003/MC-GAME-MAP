import React from 'react';
import { View, ViewProps } from 'react-native';
import { colors, hardShadow, spacing } from '@/theme';
import { BlockBorder } from './BlockBorder';

export interface PixelPanelProps extends ViewProps {
  /** stone (dark gray, default) | dirt (brown) | parchment (map paper) */
  texture?: 'stone' | 'dirt' | 'parchment';
  padded?: boolean;
}

const TEXTURES = {
  stone: {
    face: colors.panelStone,
    light: colors.panelStoneLight,
    dark: colors.panelStoneDark,
    outline: '#141414',
  },
  dirt: {
    face: colors.dirt,
    light: colors.dirtLight,
    dark: colors.dirtDark,
    outline: '#2E1F10',
  },
  parchment: {
    face: colors.parchment,
    light: '#F4EBC2',
    dark: colors.parchmentShadow,
    outline: colors.parchmentInk,
  },
} as const;

/**
 * Menu/inventory panel: dark stone or dirt/wood surface with a pixel bevel
 * border and a hard offset shadow. No blur, no rounded corners, no glass.
 */
export function PixelPanel({
  texture = 'stone',
  padded = true,
  style,
  children,
  ...rest
}: PixelPanelProps) {
  const t = TEXTURES[texture];
  return (
    <BlockBorder
      {...rest}
      face={t.face}
      light={t.light}
      dark={t.dark}
      outline={t.outline}
      style={[hardShadow, { elevation: 0 }, style]}
    >
      <View style={padded ? { padding: spacing.lg } : null}>{children}</View>
    </BlockBorder>
  );
}
