import React from "react";
import { Text, TextInput, View } from "react-native";
import { AppHeader } from "../../components/AppHeader";
import { BBButton } from "../../components/BBButton";
import { Colors } from "../../theme";

type Props = {
  playlistIdInput: string;
  playlistError: string | null;
  onBack: () => void;
  onPlaylistIdChange: (value: string) => void;
  onCreateQuiz: () => Promise<void>;
};

export function CreateQuizView({
  playlistIdInput,
  playlistError,
  onBack,
  onPlaylistIdChange,
  onCreateQuiz,
}: Props) {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <AppHeader onBack={onBack} />

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

        {!!playlistError && (
          <Text style={{ marginTop: 10, textAlign: "center", color: "red", fontWeight: "700" }}>
            {playlistError}
          </Text>
        )}

        <View style={{ marginTop: 18 }}>
          <BBButton title="Create Quiz" onPress={onCreateQuiz} />
        </View>
      </View>
    </View>
  );
}
