import React from 'react';
import { Pressable, Text } from 'react-native';
import { Colors, Radius, Spacing } from '../theme';

export function BBButton({
  title,
  onPress,
  style,
  disabled,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  style?: any;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        {
          backgroundColor: Colors.navy,
          paddingVertical: 18,
          borderRadius: 999,
          alignItems: 'center',
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      <Text
        style={{
          color: Colors.textOnNavy,
          fontSize: 22,
          fontWeight: '600',
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
