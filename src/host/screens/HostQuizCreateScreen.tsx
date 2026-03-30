import React from "react";
import { Text, TextInput, View } from "react-native";
import { BBButton } from "../../components/BBButton";
import { Colors, Radius } from "../../theme";
import { useHostViewport } from "../hooks/useHostViewport";
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
  const { fluid } = useHostViewport();

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
          width: "100%",
          gap: fluid(18, 12, 18, "height"),
        }}
      >
        <View
          style={{
            borderRadius: Radius.xl,
            backgroundColor: "rgba(255,255,255,0.72)",
            paddingHorizontal: fluid(22, 16, 22),
            paddingVertical: fluid(18, 14, 18, "height"),
          }}
        >
          <Text
            style={{
              color: Colors.textOnBg,
              fontSize: fluid(28, 22, 28),
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
            paddingHorizontal: fluid(16, 12, 16),
            paddingVertical: fluid(14, 12, 14, "height"),
          }}
        >
          <Text
            style={{
              color: "rgba(32,44,89,0.72)",
              fontSize: fluid(13, 11, 13),
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
            style={{
              fontSize: fluid(22, 17, 22),
              color: Colors.textOnBg,
              fontWeight: "700",
            }}
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
            style={{ height: fluid(64, 54, 64, "height") }}
            textStyle={{ fontSize: fluid(20, 17, 20), fontWeight: "800" }}
          />
        </View>
      </View>
    </HostLayout>
  );
}
