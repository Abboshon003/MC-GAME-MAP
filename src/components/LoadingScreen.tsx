import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { colors, spacing } from '@/theme';
import { PixelText } from './PixelText';
import { XPProgressBar } from './XPProgressBar';

const DEFAULT_MESSAGES = [
  'Generating chunks…',
  'Loading terrain…',
  'Crafting route…',
  'Exploring nearby area…',
];

export interface LoadingScreenProps {
  /** Override the cycling flavor messages (e.g. just "Crafting route…") */
  messages?: string[];
  /** Externally-driven progress 0..1; if omitted the bar auto-fills */
  progress?: number;
}

/**
 * Loading state: no spinners. Game-style flavor text over a green
 * XP progress bar with pixel segments.
 */
export function LoadingScreen({ messages = DEFAULT_MESSAGES, progress }: LoadingScreenProps) {
  const [msgIndex, setMsgIndex] = useState(0);
  const [autoProgress, setAutoProgress] = useState(0.08);

  useEffect(() => {
    const id = setInterval(() => setMsgIndex((i) => (i + 1) % messages.length), 1400);
    return () => clearInterval(id);
  }, [messages.length]);

  useEffect(() => {
    if (progress !== undefined) return;
    const id = setInterval(
      () => setAutoProgress((p) => (p >= 0.95 ? 0.15 : p + 0.07)),
      220,
    );
    return () => clearInterval(id);
  }, [progress]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.charcoal,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xxl,
      }}
    >
      <PixelText variant="label" color={colors.textLight} align="center">
        {messages[msgIndex]}
      </PixelText>
      <XPProgressBar
        progress={progress ?? autoProgress}
        style={{ alignSelf: 'stretch', marginTop: spacing.xl, maxWidth: 420 }}
      />
    </View>
  );
}
