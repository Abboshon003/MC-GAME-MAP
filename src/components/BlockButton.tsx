import React, { useState } from 'react';
import { Pressable, View, ViewStyle } from 'react-native';
import { borders, colors, spacing } from '@/theme';
import { PixelText } from './PixelText';

export interface BlockButtonProps {
  title: string;
  onPress?: () => void;
  /** stone (gray, default) | wood (dirt-brown) | gold (route accent) | danger */
  tone?: 'stone' | 'wood' | 'gold' | 'danger';
  disabled?: boolean;
  style?: ViewStyle;
  compact?: boolean;
}

const TONES = {
  stone: { face: colors.button, light: colors.buttonLight, dark: colors.buttonDark, text: colors.textLight },
  wood: { face: colors.dirt, light: colors.dirtLight, dark: colors.dirtDark, text: colors.textLight },
  gold: { face: colors.routeGold, light: '#F8DA75', dark: colors.routeGoldDark, text: colors.charcoal },
  danger: { face: colors.dangerRed, light: '#D3564D', dark: '#7E211B', text: colors.textLight },
} as const;

/**
 * A button that reads as an in-game block:
 * gray beveled face, pixel outline, hard drop shadow.
 * Pressed: shifts down 2px, bevel inverts/darkens, text nudges down.
 */
export function BlockButton({
  title,
  onPress,
  tone = 'stone',
  disabled = false,
  style,
  compact = false,
}: BlockButtonProps) {
  const [pressed, setPressed] = useState(false);
  const t = TONES[tone];
  const shift = pressed ? 2 : 0;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      disabled={disabled}
      style={[{ opacity: disabled ? 0.45 : 1 }, style]}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      {/* Hard shadow block behind — shrinks as the button sinks */}
      <View
        style={{
          position: 'absolute',
          left: 3,
          top: 3,
          right: -3 + shift * 0,
          bottom: -3,
          backgroundColor: '#000000',
          opacity: 0.55,
        }}
      />
      <View
        style={{
          transform: [{ translateY: shift }],
          borderWidth: borders.pixel,
          borderColor: pressed ? '#000000' : colors.buttonBorder,
          borderRadius: 0,
        }}
      >
        <View
          style={{
            borderTopWidth: borders.bevel,
            borderLeftWidth: borders.bevel,
            borderBottomWidth: borders.bevel,
            borderRightWidth: borders.bevel,
            borderTopColor: pressed ? t.dark : t.light,
            borderLeftColor: pressed ? t.dark : t.light,
            borderBottomColor: pressed ? t.light : t.dark,
            borderRightColor: pressed ? t.light : t.dark,
            backgroundColor: pressed ? shade(t.face) : t.face,
            paddingVertical: compact ? spacing.sm : spacing.md,
            paddingHorizontal: compact ? spacing.md : spacing.lg,
            alignItems: 'center',
            borderRadius: 0,
          }}
        >
          <PixelText
            variant={compact ? 'label' : 'button'}
            color={t.text}
            style={{ transform: [{ translateY: pressed ? 1 : 0 }] }}
          >
            {title}
          </PixelText>
        </View>
      </View>
    </Pressable>
  );
}

/** Darken a hex color ~18% for the pressed face. */
function shade(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.floor(v * 0.82));
  const r = f((n >> 16) & 0xff);
  const g = f((n >> 8) & 0xff);
  const b = f(n & 0xff);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
