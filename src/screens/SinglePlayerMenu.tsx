import React from 'react';
import { Image, View } from 'react-native';
import { BBButton } from '../components/BBButton';
import { Colors } from '../theme';

export function SinglePlayerMenu({
  onChoose,
  onCreate,
  onBack,
}: {
  onChoose: () => void;
  onCreate: () => void;
  onBack: () => void;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg, alignItems: 'center' }}>
      {/* simple back button (kreis) */}
      <View style={{ position: 'absolute', top: 48, left: 18 }}>
        <BBButton title="←" onPress={onBack} style={{ width: 56, height: 56, paddingVertical: 0, justifyContent: 'center' }} />
      </View>

      <View style={{ height: 70 }} />

      <Image
        source={require('../../assets/logo.png')}
        style={{ width: 240, height: 240, resizeMode: 'contain' }}
      />

      <View style={{ height: 28 }} />

      <View style={{ width: '72%', gap: 18 }}>
        <BBButton title="Chose Quiz" onPress={onChoose} />
        <BBButton title="Create Quiz" onPress={onCreate} disabled />
      </View>
    </View>
  );
}
