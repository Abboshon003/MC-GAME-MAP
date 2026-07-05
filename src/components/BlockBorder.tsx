import React from 'react';
import { View, ViewProps } from 'react-native';
import { borders, colors } from '@/theme';

export interface BlockBorderProps extends ViewProps {
  /** Face color of the block */
  face?: string;
  /** Bevel highlight (top + left) */
  light?: string;
  /** Bevel shade (bottom + right) */
  dark?: string;
  /** Outermost pixel outline */
  outline?: string;
  bevelWidth?: number;
  /** Flip bevel (pressed-in look) */
  inset?: boolean;
}

/**
 * Classic block bevel: an outer pixel outline, a light top/left edge and a
 * dark bottom/right edge around a flat face. Square corners, no blur.
 * The universal wrapper for anything that should read as an in-game block.
 */
export function BlockBorder({
  face = colors.button,
  light = colors.buttonLight,
  dark = colors.buttonDark,
  outline = colors.buttonBorder,
  bevelWidth = borders.bevel,
  inset = false,
  style,
  children,
  ...rest
}: BlockBorderProps) {
  const top = inset ? dark : light;
  const bottom = inset ? light : dark;
  return (
    <View
      {...rest}
      style={[{ borderWidth: borders.pixel, borderColor: outline, borderRadius: 0 }, style]}
    >
      <View
        style={{
          borderTopWidth: bevelWidth,
          borderLeftWidth: bevelWidth,
          borderBottomWidth: bevelWidth,
          borderRightWidth: bevelWidth,
          borderTopColor: top,
          borderLeftColor: top,
          borderBottomColor: bottom,
          borderRightColor: bottom,
          backgroundColor: face,
          borderRadius: 0,
        }}
      >
        {children}
      </View>
    </View>
  );
}
