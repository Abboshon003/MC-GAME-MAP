import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '@/theme';
import { BlockButton } from './BlockButton';
import { PixelText } from './PixelText';
import { play } from '@/sound/sounds';

/** Pause-menu style screen header: back block + pixel title. */
export function ScreenHeader({ title }: { title: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: insets.top + spacing.md,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.md,
        backgroundColor: colors.panelStoneDark,
        borderBottomWidth: 3,
        borderBottomColor: '#141414',
      }}
    >
      <BlockButton
        title="<"
        compact
        onPress={() => {
          play('wood-tap');
          if (router.canGoBack()) router.back();
          else router.replace('/');
        }}
      />
      <PixelText variant="title" style={{ marginLeft: spacing.lg, flex: 1 }} numberOfLines={1}>
        {title}
      </PixelText>
    </View>
  );
}
