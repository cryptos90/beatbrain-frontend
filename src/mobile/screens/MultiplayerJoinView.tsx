import React from "react";
import { Image, Text, TextInput, View } from "react-native";
import { AppHeader } from "../../components/AppHeader";
import { BBButton } from "../../components/BBButton";
import { Colors } from "../../theme";

type Props = {
  sessionId: string;
  name: string;
  avatarDataUrl: string;
  joinError: string | null;
  onBack: () => void;
  onSessionIdChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onPickAvatarCamera: () => void;
  onPickAvatarLibrary: () => void;
  onJoin: () => void;
};

export function MultiplayerJoinView({
  sessionId,
  name,
  avatarDataUrl,
  joinError,
  onBack,
  onSessionIdChange,
  onNameChange,
  onPickAvatarCamera,
  onPickAvatarLibrary,
  onJoin,
}: Props) {
  const canJoin =
    sessionId.trim().length > 0 &&
    name.trim().length > 0 &&
    name.trim().length <= 20 &&
    avatarDataUrl.trim().length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <AppHeader onBack={onBack} />

      <View style={{ flex: 1, paddingHorizontal: 18, paddingTop: 16, gap: 12 }}>
        <View
          style={{
            backgroundColor: Colors.white,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}
        >
          <TextInput
            value={sessionId}
            onChangeText={(value) => onSessionIdChange(value.toUpperCase())}
            autoCapitalize="characters"
            placeholder="Session ID"
            style={{ fontSize: 15 }}
          />
        </View>

        <View
          style={{
            backgroundColor: Colors.white,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}
        >
          <TextInput
            value={name}
            onChangeText={onNameChange}
            placeholder="Name"
            maxLength={20}
            style={{ fontSize: 15 }}
          />
        </View>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <BBButton title="Selfie" onPress={onPickAvatarCamera} style={{ flex: 1 }} />
          <BBButton title="Gallery" onPress={onPickAvatarLibrary} style={{ flex: 1 }} />
        </View>

        <View
          style={{
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: Colors.white,
            borderRadius: 12,
            paddingVertical: 14,
          }}
        >
          {avatarDataUrl ? (
            <Image
              source={{ uri: avatarDataUrl }}
              style={{ width: 96, height: 96, borderRadius: 48 }}
            />
          ) : (
            <Text style={{ color: "#6b7280", fontWeight: "700" }}>No photo selected</Text>
          )}
        </View>

        {!!joinError && (
          <Text style={{ textAlign: "center", color: "red", fontWeight: "700" }}>{joinError}</Text>
        )}

        <BBButton title="Join" onPress={onJoin} disabled={!canJoin} />
      </View>
    </View>
  );
}
