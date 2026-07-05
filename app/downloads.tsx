import React from 'react';
import { ScrollView, View } from 'react-native';
import { BlockButton, PixelPanel, PixelText, ScreenHeader, XPProgressBar } from '@/components';
import { ChestIcon } from '@/icons';
import { offlineRegions } from '@/data/savedPlaces';
import { colors, spacing } from '@/theme';
import { play } from '@/sound/sounds';

/** Offline Downloads — map regions as item cards with XP-style progress. */
export default function DownloadsScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.charcoal }}>
      <ScreenHeader title="DOWNLOAD AREA" />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <View style={{ maxWidth: 520, width: '100%', alignSelf: 'center' }}>
          {offlineRegions.map((r) => {
            const done = r.progress >= 1;
            return (
              <PixelPanel key={r.id} texture="stone" style={{ marginBottom: spacing.lg }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <ChestIcon size={44} />
                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <PixelText variant="body">{r.name}</PixelText>
                    <PixelText variant="bodySM" color={colors.textDim}>
                      {r.sizeLabel} · {done ? 'STORED IN CHEST' : `${Math.round(r.progress * 100)}%`}
                    </PixelText>
                  </View>
                  <BlockButton
                    title={done ? 'DELETE' : 'GET'}
                    tone={done ? 'danger' : 'wood'}
                    compact
                    onPress={() => play('button-click')}
                  />
                </View>
                <XPProgressBar progress={r.progress} style={{ marginTop: spacing.md }} />
              </PixelPanel>
            );
          })}
          <PixelText variant="bodySM" color={colors.textDim} align="center">
            Downloaded regions let you explore without a signal.
          </PixelText>
        </View>
      </ScrollView>
    </View>
  );
}
