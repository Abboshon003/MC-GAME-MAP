import React from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ItemSlot, PixelPanel, PixelText, ScreenHeader } from '@/components';
import { CategoryIcon } from '@/icons';
import { savedPlaces } from '@/data/savedPlaces';
import { colors, spacing } from '@/theme';
import { play } from '@/sound/sounds';

/** Saved Places — a chest screen; each place is an item in a slot. */
export default function SavedScreen() {
  const router = useRouter();
  return (
    <View style={{ flex: 1, backgroundColor: colors.charcoal }}>
      <ScreenHeader title="SAVED PLACES" />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <PixelPanel texture="dirt" padded={false} style={{ maxWidth: 520, width: '100%', alignSelf: 'center' }}>
          <View style={{ padding: spacing.sm }}>
            <PixelText
              variant="label"
              color={colors.textLight}
              style={{ margin: spacing.sm }}
            >
              PLACE CHEST ({savedPlaces.length}/27)
            </PixelText>
            {savedPlaces.map((p) => (
              <ItemSlot
                key={p.id}
                icon={<CategoryIcon category={p.category ?? 'star'} size={40} />}
                title={p.name}
                subtitle={p.detail}
                style={{ marginTop: spacing.xs }}
                onPress={() => {
                  play('wood-tap');
                  router.push({
                    pathname: '/',
                    params: {
                      name: p.name,
                      lat: String(p.location.lat),
                      lon: String(p.location.lon),
                    },
                  });
                }}
              />
            ))}
          </View>
        </PixelPanel>
      </ScrollView>
    </View>
  );
}
