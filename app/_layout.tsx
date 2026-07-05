import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  PressStart2P_400Regular,
} from '@expo-google-fonts/press-start-2p';
import {
  PixelifySans_500Medium,
  PixelifySans_700Bold,
} from '@expo-google-fonts/pixelify-sans';
import { colors } from '@/theme';
import { LoadingScreen } from '@/components';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PressStart2P_400Regular,
    PixelifySans_500Medium,
    PixelifySans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.charcoal }} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.charcoal }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.charcoal },
          animation: 'none',
        }}
      />
    </View>
  );
}
