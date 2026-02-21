import React from "react";
import { Text, TextInput, View } from "react-native";
import { AppHeader } from "../../components/AppHeader";
import { BBButton } from "../../components/BBButton";
import { Colors } from "../../theme";

type Props = {
  playlistIdInput: string;
  playlistError: string | null;
  reauthRequired?: boolean;
  reauthMessage?: string | null;
  onBack: () => void;
  onPlaylistIdChange: (value: string) => void;
  onCreateQuiz: () => Promise<void>;
  onRelogin?: () => Promise<void>;
};

export function CreateQuizView({
  playlistIdInput,
  playlistError,
  reauthRequired = false,
  reauthMessage = null,
  onBack,
  onPlaylistIdChange,
  onCreateQuiz,
  onRelogin,
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
        {reauthRequired && (
          <View style={{ marginTop: 10 }}>
            <Text style={{ textAlign: "center", color: "red", fontWeight: "700" }}>
              Spotify Login erneuern erforderlich
            </Text>
            {!!reauthMessage && (
              <Text style={{ marginTop: 6, textAlign: "center", color: "red" }}>
                {reauthMessage}
              </Text>
            )}
          </View>
        )}
        {reauthRequired && !!onRelogin && (
          <View style={{ marginTop: 12 }}>
            <BBButton title="Erneut einloggen" onPress={onRelogin} />
          </View>
        )}

        <View style={{ marginTop: 18 }}>
          <BBButton title="Create Quiz" onPress={onCreateQuiz} />
        </View>
      </View>
    </View>
  );
}
