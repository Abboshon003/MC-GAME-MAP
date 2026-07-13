import React from 'react';
import { Pressable, View } from 'react-native';
import { PoiIcon } from '@/icons';
import type { PoiCategory } from '@/nav/poi';
import { PixelText } from './PixelText';

/** Google-Maps-style category colors, voxel-flavored. */
export const PIN_COLORS: Record<PoiCategory, string> = {
  restaurant: '#E8892E',
  cafe: '#E8892E',
  fastfood: '#E8892E',
  bar: '#E8892E',
  grocery: '#5B8CB6',
  shop: '#5B8CB6',
  bank: '#4E8A37',
  pharmacy: '#D3564D',
  hospital: '#D3564D',
  school: '#8A6FC9',
  hotel: '#B268A6',
  fuel: '#4A7BA6',
  worship: '#8A8A8A',
  gym: '#C97B3D',
  park: '#5FA346',
  default: '#6F6F6F',
};

/**
 * A teardrop map pin: colored circle (by category) holding the pixel icon,
 * square tail, and an optional real-name chip beside it. Square corners and
 * hard edges — no iOS-style balloons.
 */
export function PoiPin({
  category,
  name,
  showLabel,
  onPress,
}: {
  category: PoiCategory;
  name: string;
  showLabel: boolean;
  onPress: () => void;
}) {
  const color = PIN_COLORS[category];
  return (
    <Pressable onPress={onPress} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
      <View style={{ alignItems: 'center' }}>
        <View
          style={{
            width: 30,
            height: 30,
            backgroundColor: color,
            borderWidth: 2,
            borderColor: '#FFFFFF',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <PoiIcon category={category} size={20} />
        </View>
        {/* square tail */}
        <View
          style={{
            width: 8,
            height: 8,
            marginTop: -4,
            backgroundColor: color,
            borderColor: '#FFFFFF',
            borderRightWidth: 2,
            borderBottomWidth: 2,
            transform: [{ rotate: '45deg' }],
          }}
        />
      </View>
      {showLabel && (
        <View
          style={{
            marginLeft: 4,
            marginTop: 2,
            paddingHorizontal: 6,
            paddingVertical: 2,
            backgroundColor: 'rgba(20,20,20,0.82)',
            borderWidth: 2,
            borderColor: '#000000',
          }}
        >
          <PixelText variant="bodySM" color="#FFFFFF" numberOfLines={1} style={{ maxWidth: 150 }}>
            {name}
          </PixelText>
        </View>
      )}
    </Pressable>
  );
}
