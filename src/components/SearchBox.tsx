import React, { useEffect, useState } from 'react';
import { TextInput, View, ViewStyle } from 'react-native';
import { borders, colors, fontFamilies, fontSizes, spacing } from '@/theme';

export interface SearchBoxProps {
  value: string;
  onChangeText: (t: string) => void;
  onSubmit?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  style?: ViewStyle;
}

/**
 * Stone-textured search box with an inset bevel (carved into the panel)
 * and a blinking blocky pixel cursor when empty.
 */
export function SearchBox({
  value,
  onChangeText,
  onSubmit,
  onFocus,
  onBlur,
  placeholder = 'WHERE TO?',
  autoFocus,
  style,
}: SearchBoxProps) {
  const [blink, setBlink] = useState(true);
  useEffect(() => {
    const id = setInterval(() => setBlink((b) => !b), 530);
    return () => clearInterval(id);
  }, []);

  return (
    <View
      style={[
        {
          borderWidth: borders.pixel,
          borderColor: '#141414',
          borderRadius: 0,
        },
        style,
      ]}
    >
      <View
        style={{
          // Inset bevel: dark top/left, light bottom/right (carved in)
          borderTopWidth: borders.bevel,
          borderLeftWidth: borders.bevel,
          borderBottomWidth: borders.bevel,
          borderRightWidth: borders.bevel,
          borderTopColor: colors.panelStoneDark,
          borderLeftColor: colors.panelStoneDark,
          borderBottomColor: colors.panelStoneLight,
          borderRightColor: colors.panelStoneLight,
          backgroundColor: '#1D1D1D',
          flexDirection: 'row',
          alignItems: 'center',
          borderRadius: 0,
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmit}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          placeholderTextColor={colors.textDim}
          autoFocus={autoFocus}
          autoCorrect={false}
          returnKeyType="search"
          style={{
            flex: 1,
            fontFamily: fontFamilies.body,
            fontSize: fontSizes.body,
            color: colors.textLight,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.md,
            borderRadius: 0,
          }}
        />
        {/* Blocky pixel cursor */}
        {value.length === 0 && (
          <View
            style={{
              width: 10,
              height: 20,
              marginRight: spacing.md,
              backgroundColor: blink ? colors.textLight : 'transparent',
            }}
          />
        )}
      </View>
    </View>
  );
}
