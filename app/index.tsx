import React from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlockButton, PixelPanel, PixelText } from '@/components';
import { CompassIcon } from '@/icons';
import { colors, spacing } from '@/theme';
import { play } from '@/sound/sounds';

/** Title screen — the game's main menu. */
export default function TitleScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.charcoal }}
      contentContainerStyle={{
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: insets.top + spacing.xl,
        paddingBottom: insets.bottom + spacing.xl,
        paddingHorizontal: spacing.xl,
      }}
    >
      <View style={{ width: '100%', maxWidth: 440 }}>
        {/* Title block */}
        <View style={{ alignItems: 'center', marginBottom: spacing.xxl }}>
          <CompassIcon size={72} />
          <PixelText
            variant="titleXL"
            color={colors.textGoldTitle}
            align="center"
            style={{ marginTop: spacing.lg }}
          >
            MC GAME MAP
          </PixelText>
          <PixelText variant="label" color={colors.textDim} align="center">
            A VOXEL WORLD NAVIGATOR
          </PixelText>
        </View>

        {/* Menu panel */}
        <PixelPanel texture="stone">
          <BlockButton
            title="START NAVIGATION"
            tone="gold"
            onPress={() => {
              play('button-click');
              router.push('/search');
            }}
          />
          <BlockButton
            title="SAVED PLACES"
            style={{ marginTop: spacing.lg }}
            onPress={() => {
              play('button-click');
              router.push('/saved');
            }}
          />
          <BlockButton
            title="DOWNLOAD AREA"
            style={{ marginTop: spacing.lg }}
            onPress={() => {
              play('button-click');
              router.push('/downloads');
            }}
          />
        </PixelPanel>

        <PixelText
          variant="tiny"
          color={colors.textDim}
          align="center"
          style={{ marginTop: spacing.xl }}
        >
          v0.1.0 — SURVIVAL CARTOGRAPHY DIVISION
        </PixelText>
      </View>
    </ScrollView>
  );
}
