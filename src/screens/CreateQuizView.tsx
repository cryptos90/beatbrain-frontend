import React from "react";
import { ActivityIndicator, Text, TextInput, View } from "react-native";
import { BBButton } from "../components/BBButton";
import { AppHeader } from "../components/AppHeader";
import { Colors } from "../theme";

type Props = {
  hasAuth: boolean;
  authBusy: boolean;
  authError: string | null;
  playlistIdInput: string;
  onBack: () => void;
  onPlaylistIdChange: (value: string) => void;
  onCreateQuiz: () => Promise<void>;
};

export function CreateQuizView({
  hasAuth,
  authBusy,
  authError,
  playlistIdInput,
  onBack,
  onPlaylistIdChange,
  onCreateQuiz,
}: Props) {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <AppHeader onBack={onBack} />

      {!hasAuth && (
        <View style={{ paddingHorizontal: 18, marginTop: 16, alignItems: "center" }}>
          {authBusy && <ActivityIndicator />}
          {authError && <Text style={{ marginTop: 10, color: "red", textAlign: "center", fontWeight: "700" }}>{authError}</Text>}
        </View>
      )}

      {hasAuth && (
        <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 18 }}>
          <View
            style={{
              backgroundColor: Colors.white,
              borderRadius: 10,
              paddingHorizontal: 14,
              paddingVertical: 10,
            }}
          >
            <TextInput
              placeholder="Please enter your Playlist ID here ..."
              value={playlistIdInput}
              onChangeText={onPlaylistIdChange}
              autoCapitalize="none"
              style={{ fontSize: 16 }}
            />
          </View>

          <View style={{ marginTop: 18 }}>
            <BBButton title="Create Quiz" onPress={onCreateQuiz} />
          </View>
        </View>
      )}
    </View>
  );
}
