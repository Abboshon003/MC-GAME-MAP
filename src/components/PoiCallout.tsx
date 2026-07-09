import React from 'react';
import { View } from 'react-native';
import { BlockButton, PixelPanel, PixelText } from '@/components';
import { PoiIcon } from '@/icons';
import { CATEGORY_LABEL, type Poi } from '@/nav/poi';
import { formatDistance } from '@/nav';
import { colors, spacing } from '@/theme';

/**
 * Popup shown when a business marker is tapped: name, category, straight-line
 * distance, and a NAVIGATE button that routes there.
 */
export function PoiCallout({
  poi,
  distanceMeters,
  onNavigate,
  onClose,
}: {
  poi: Poi;
  distanceMeters: number;
  onNavigate: () => void;
  onClose: () => void;
}) {
  return (
    <PixelPanel texture="stone">
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <PoiIcon category={poi.category} size={40} />
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <PixelText variant="body" numberOfLines={1}>
            {poi.name}
          </PixelText>
          <PixelText variant="bodySM" color={colors.textDim}>
            {CATEGORY_LABEL[poi.category]} · {formatDistance(distanceMeters)}
          </PixelText>
        </View>
      </View>
      <View style={{ flexDirection: 'row', marginTop: spacing.md }}>
        <BlockButton title="NAVIGATE" tone="gold" style={{ flex: 1 }} onPress={onNavigate} />
        <BlockButton title="X" tone="stone" compact style={{ marginLeft: spacing.sm }} onPress={onClose} />
      </View>
    </PixelPanel>
  );
}
