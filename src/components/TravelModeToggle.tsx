import React from 'react';
import { Pressable, View } from 'react-native';
import { borders, colors, spacing } from '@/theme';
import { PixelText } from './PixelText';
import type { RouteProfile } from '@/nav/types';

const MODES: Array<{ k: RouteProfile; label: string }> = [
  { k: 'drive', label: 'DRIVE' },
  { k: 'walk', label: 'WALK' },
  { k: 'bike', label: 'BIKE' },
];

/** Pixel segmented control for the travel mode. Selected segment goes gold. */
export function TravelModeToggle({
  value,
  onChange,
}: {
  value: RouteProfile;
  onChange: (p: RouteProfile) => void;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        borderWidth: borders.pixel,
        borderColor: colors.buttonBorder,
      }}
    >
      {MODES.map((m, i) => {
        const selected = m.k === value;
        return (
          <Pressable
            key={m.k}
            onPress={() => onChange(m.k)}
            style={{
              flex: 1,
              paddingVertical: spacing.sm,
              alignItems: 'center',
              backgroundColor: selected ? colors.routeGold : colors.button,
              borderLeftWidth: i === 0 ? 0 : borders.thin,
              borderLeftColor: colors.buttonBorder,
            }}
          >
            <PixelText variant="label" color={selected ? colors.charcoal : colors.textLight}>
              {m.label}
            </PixelText>
          </Pressable>
        );
      })}
    </View>
  );
}
