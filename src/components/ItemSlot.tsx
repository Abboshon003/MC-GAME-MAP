import React from 'react';
import { Pressable, View, ViewStyle } from 'react-native';
import { borders, colors, spacing } from '@/theme';
import { PixelText } from './PixelText';

export interface ItemSlotProps {
  /** Pixel icon rendered inside the square slot */
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  style?: ViewStyle;
}

/**
 * Inventory-style row: a square item slot (inset bevel like a chest slot)
 * with the item's name beside it. Used for saved places, search results
 * and offline region cards.
 */
export function ItemSlot({ icon, title, subtitle, onPress, right, style }: ItemSlotProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: pressed ? '#333333' : colors.panelStone,
          borderWidth: borders.thin,
          borderColor: '#141414',
          padding: spacing.sm,
          borderRadius: 0,
        },
        style,
      ]}
    >
      {/* The slot square: inset bevel (dark top/left, light bottom/right) */}
      <View
        style={{
          width: 52,
          height: 52,
          backgroundColor: colors.slot,
          borderTopWidth: 3,
          borderLeftWidth: 3,
          borderBottomWidth: 3,
          borderRightWidth: 3,
          borderTopColor: colors.slotDark,
          borderLeftColor: colors.slotDark,
          borderBottomColor: colors.slotLight,
          borderRightColor: colors.slotLight,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 0,
        }}
      >
        {icon}
      </View>
      <View style={{ flex: 1, marginLeft: spacing.md }}>
        <PixelText variant="body" numberOfLines={1}>
          {title}
        </PixelText>
        {subtitle ? (
          <PixelText variant="bodySM" color={colors.textDim} numberOfLines={1}>
            {subtitle}
          </PixelText>
        ) : null}
      </View>
      {right}
    </Pressable>
  );
}
