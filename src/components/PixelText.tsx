import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { colors, fontFamilies, fontSizes, textShadow } from '@/theme';

type Variant =
  | 'titleXL'
  | 'title'
  | 'button'
  | 'label'
  | 'tiny'
  | 'bodyLG'
  | 'body'
  | 'bodySM'
  | 'instruction'
  | 'distance';

/** Which variants use the blocky display font vs the readable body font. */
const DISPLAY_VARIANTS: Variant[] = ['titleXL', 'title', 'button', 'label', 'tiny'];

export interface PixelTextProps extends TextProps {
  variant?: Variant;
  color?: string;
  /** Hard 2px ink shadow behind the glyphs (on by default for display text). */
  shadow?: boolean;
  align?: TextStyle['textAlign'];
}

/**
 * The only Text component allowed in the app: enforces pixel fonts and
 * hard shadows. No system fonts anywhere.
 */
export function PixelText({
  variant = 'body',
  color = colors.textLight,
  shadow,
  align,
  style,
  children,
  ...rest
}: PixelTextProps) {
  const isDisplay = DISPLAY_VARIANTS.includes(variant);
  const withShadow = shadow ?? isDisplay;
  return (
    <Text
      {...rest}
      style={[
        {
          fontFamily: isDisplay ? fontFamilies.display : fontFamilies.body,
          fontSize: fontSizes[variant],
          color,
          textAlign: align,
          // Press Start 2P has no descenders spacing; add breathing room
          lineHeight: fontSizes[variant] * (isDisplay ? 1.6 : 1.25),
        },
        withShadow ? textShadow : null,
        style,
      ]}
    >
      {children}
    </Text>
  );
}
