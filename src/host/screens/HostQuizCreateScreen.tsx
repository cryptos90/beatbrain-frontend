import React from "react";
import { Text, TextInput, View } from "react-native";
import { BBButton } from "../../components/BBButton";
import { Colors, Radius } from "../../theme";
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
    <HostLayout
      maxWidth={860}
      notice={notice}
      headerEyebrow="Playlist-ID"
      headerTitle="Manuelle Playlist-Auswahl bleibt klar und groß auf dem Host-Screen."
      headerSubtitle="Wenn du eine feste Playlist-ID kennst, kannst du sie hier direkt eingeben, ohne den Big-Screen-Flow zu verlieren."
    >
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          gap: 18,
        }}
      >
        <View
          style={{
            borderRadius: Radius.xl,
            backgroundColor: "rgba(255,255,255,0.72)",
            paddingHorizontal: 22,
            paddingVertical: 18,
          }}
        >
          <Text
            style={{
              color: Colors.textOnBg,
              fontSize: 28,
              fontWeight: "900",
              textAlign: "center",
            }}
          >
            Playlist-ID eingeben
          </Text>
        </View>

        <View
          style={{
            backgroundColor: Colors.white,
            borderRadius: Radius.lg,
            paddingHorizontal: 16,
            paddingVertical: 14,
          }}
        >
          <Text
            style={{
              color: "rgba(32,44,89,0.72)",
              fontSize: 13,
              fontWeight: "800",
              letterSpacing: 1,
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Spotify Playlist-ID
          </Text>
          <TextInput
            value={playlistIdInput}
            onChangeText={onPlaylistIdInputChange}
            autoCapitalize="none"
            placeholder="Playlist ID eingeben"
            style={{ fontSize: 22, color: Colors.textOnBg, fontWeight: "700" }}
          />
        </View>

        {!!setupError && (
          <Text style={{ color: Colors.textOnBg, textAlign: "center", fontWeight: "700" }}>
            {setupError}
          </Text>
        )}

        <View style={{ width: "100%", maxWidth: 360, alignSelf: "center" }}>
          <BBButton
            title={creatingSession ? "Quiz wird vorbereitet..." : "Quiz starten"}
            onPress={onCreateSession}
            disabled={creatingSession}
            style={{ height: 64 }}
            textStyle={{ fontSize: 20, fontWeight: "800" }}
          />
        </View>
      </View>
    </HostLayout>
  );
}
