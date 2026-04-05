import React from "react";
import { Text, TextInput, View } from "react-native";
import { Colors } from "../../theme";
import { HostActionBar } from "../components/HostActionBar";
import { HostActionButton } from "../components/HostActionButton";
import { HostLayout } from "../components/HostLayout";
import { HostPanel } from "../components/HostPanel";
import { HostScreenContainer } from "../components/HostScreenContainer";
import { useHostViewport } from "../hooks/useHostViewport";

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
  const { contentMax, radii, space, typeScale, fluidBetween, isCompactHeight } = useHostViewport();

  return (
    <HostLayout
      maxWidth={contentMax.narrow}
      notice={notice}
      headerEyebrow="Playlist-ID"
      headerTitle={
        isCompactHeight
          ? "Playlist-ID direkt eingeben."
          : "Manuelle Playlist-Auswahl bleibt klar und lesbar."
      }
      headerSubtitle={
        isCompactHeight
          ? undefined
          : "Wenn du eine feste Playlist-ID kennst, kannst du sie hier direkt eingeben, ohne den Host-Flow zu verlassen."
      }
    >
      <HostScreenContainer>
        <HostPanel
          tone="glass"
          padding={isCompactHeight ? "sm" : "md"}
          maxWidth={contentMax.compact}
        >
          <Text
            style={{
              color: Colors.textOnBg,
              fontSize: fluidBetween(24, 30, "width"),
              fontWeight: "900",
              textAlign: "center",
            }}
          >
            Playlist-ID eingeben
          </Text>
        </HostPanel>

        <HostPanel tone="white" padding={isCompactHeight ? "sm" : "md"}>
          <Text
            style={{
              color: "rgba(32,44,89,0.72)",
              fontSize: typeScale.label,
              fontWeight: "800",
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
            Spotify Playlist-ID
          </Text>
          <TextInput
            value={playlistIdInput}
            onChangeText={onPlaylistIdInputChange}
            autoCapitalize="none"
            placeholder="Playlist ID eingeben"
            placeholderTextColor="rgba(32,44,89,0.42)"
            style={{
              color: Colors.textOnBg,
              fontSize: fluidBetween(18, 22, "width"),
              fontWeight: "700",
              borderRadius: radii.md,
              borderWidth: 1,
              borderColor: "rgba(32,44,89,0.12)",
              paddingHorizontal: space.md,
              paddingVertical: space.sm,
            }}
          />
        </HostPanel>

        {!!setupError && (
          <Text
            style={{
              color: Colors.textOnBg,
              textAlign: "center",
              fontWeight: "700",
              fontSize: typeScale.bodySm,
            }}
          >
            {setupError}
          </Text>
        )}

        <HostActionBar maxWidth={contentMax.compact}>
          <HostActionButton
            title={creatingSession ? "Quiz wird vorbereitet..." : "Quiz starten"}
            onPress={onCreateSession}
            disabled={creatingSession}
            textStyle={{ fontSize: fluidBetween(17, 20, "width"), fontWeight: "800" }}
          />
        </HostActionBar>
      </HostScreenContainer>
    </HostLayout>
  );
}
