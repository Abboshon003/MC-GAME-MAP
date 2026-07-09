import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { BlockButton, PixelPanel } from '@/components';
import { spacing } from '@/theme';
import { play } from '@/sound/sounds';

/**
 * Corner menu button. Opens a small pixel panel linking to Saved Places and
 * the Download Area — replaces the old title-screen menu now that the app
 * opens straight to the map.
 */
export function CornerMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const go = (path: '/saved' | '/downloads') => {
    play('wood-tap');
    setOpen(false);
    router.push(path);
  };

  return (
    <View style={{ alignItems: 'flex-start' }}>
      <BlockButton
        title="MENU"
        compact
        onPress={() => {
          play('button-click');
          setOpen((o) => !o);
        }}
      />
      {open && (
        <PixelPanel texture="stone" style={{ marginTop: spacing.sm, minWidth: 200 }}>
          <BlockButton title="SAVED PLACES" onPress={() => go('/saved')} />
          <BlockButton title="DOWNLOAD AREA" tone="wood" style={{ marginTop: spacing.sm }} onPress={() => go('/downloads')} />
        </PixelPanel>
      )}
    </View>
  );
}
