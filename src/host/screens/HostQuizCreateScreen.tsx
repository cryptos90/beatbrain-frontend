import React from "react";
import { Text, TextInput, View } from "react-native";
import { BBButton } from "../../components/BBButton";
import { Colors } from "../../theme";
import { HostLayout } from "../components/HostLayout";

type Props = {
  playlistIdInput: string;
  setupError: string | null;
  creatingSession: boolean;
  onPlaylistIdInputChange: (value: string) => void;
  onCreateSession: () => void;
  notice?: string | null;
};

export function HostQuizCreateScreen({
  playlistIdInput,
  setupError,
  creatingSession,
  onPlaylistIdInputChange,
  onCreateSession,
  notice,
}: Props) {
  return (
    <HostLayout maxWidth={760} notice={notice}>
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          gap: 16,
        }}
      >
        <View
          style={{
            backgroundColor: Colors.white,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}
        >
          <TextInput
            value={playlistIdInput}
            onChangeText={onPlaylistIdInputChange}
            autoCapitalize="none"
            placeholder="Playlist ID eingeben"
            style={{ fontSize: 16, color: Colors.textOnBg }}
          />
        </View>

        {!!setupError && (
          <Text style={{ color: Colors.textOnBg, textAlign: "center", fontWeight: "700" }}>
            {setupError}
          </Text>
        )}

        <View style={{ width: "100%", maxWidth: 360, alignSelf: "center" }}>
          <BBButton
            title={creatingSession ? "Bitte warten..." : "Quiz starten"}
            onPress={onCreateSession}
            disabled={creatingSession}
          />
        </View>
      </View>
    </HostLayout>
  );
}
