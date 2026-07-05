import React from 'react';
import { View, ViewStyle } from 'react-native';
import { borders, colors } from '@/theme';

export interface XPProgressBarProps {
  /** 0..1 */
  progress: number;
  height?: number;
  segments?: number;
  style?: ViewStyle;
}

/**
 * XP-style progress bar: bright green pixel segments in a dark square
 * trough. Square edges, visible segment notches, no animation gloss.
 */
export function XPProgressBar({
  progress,
  height = 14,
  segments = 18,
  style,
}: XPProgressBarProps) {
  const clamped = Math.max(0, Math.min(1, progress));
  const filled = Math.round(clamped * segments);
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          borderWidth: borders.thin,
          borderColor: '#101010',
          backgroundColor: '#1E1E1E',
          padding: 2,
          borderRadius: 0,
        },
        style,
      ]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
    >
      {Array.from({ length: segments }, (_, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height,
            marginHorizontal: 1,
            backgroundColor: i < filled ? colors.xpGreen : '#2A2A2A',
            borderBottomWidth: 3,
            borderBottomColor: i < filled ? colors.xpGreenDark : '#222222',
            borderRadius: 0,
          }}
        />
      ))}
    </View>
  );
}
