import React from 'react';
import { Image, View } from 'react-native';
import { BBButton } from '../components/BBButton';
import { Colors, Spacing } from '../theme';

export function StartScreen({ onSinglePlayer }: { onSinglePlayer: () => void }) {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg, alignItems: 'center' }}>
      <View style={{ height: 70 }} />

      <Image
        source={require('../../assets/logo.png')}
        style={{ width: 260, height: 260, resizeMode: 'contain' }}
      />

      <View style={{ height: 26 }} />

      <View style={{ width: '82%', gap: 18 }}>
        <BBButton title="Single Player" onPress={onSinglePlayer} />
        <BBButton title="Multi Player" onPress={() => {}} disabled />
      </View>
    </View>
  );
}
