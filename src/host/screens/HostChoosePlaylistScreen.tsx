import React from "react";
import { ActivityIndicator, Image, Pressable, Text, View } from "react-native";
import { Colors } from "../../theme";
import type { PlaylistCard } from "../../shared/types/app";
import { HostActionBar } from "../components/HostActionBar";
import { HostActionButton } from "../components/HostActionButton";
import { HostLayout } from "../components/HostLayout";
import { HostPanel } from "../components/HostPanel";
import { HostResponsiveGrid } from "../components/HostResponsiveGrid";
import { HostScreenContainer } from "../components/HostScreenContainer";
import { useHostViewport } from "../hooks/useHostViewport";

type Props = {
  playlists: PlaylistCard[];
  loading: boolean;
  playlistsError: string | null;
  selectedPlaylistIndex: number;
  setupError: string | null;
  startDisabledReason?: string | null;
  creatingSession: boolean;
  onSelectPlaylistIndex: (index: number) => void;
  onCreateSession: () => void;
  notice?: string | null;
};

export function HostChoosePlaylistScreen({
  playlists,
  loading,
  playlistsError,
  selectedPlaylistIndex,
  setupError,
  startDisabledReason,
  creatingSession,
  onSelectPlaylistIndex,
  onCreateSession,
  notice,
}: Props) {
  const {
    width,
    height,
    contentMax,
    radii,
    space,
    typeScale,
    fluidBetween,
    isCompactHeight,
  } = useHostViewport();
  const selectedPlaylist = playlists[selectedPlaylistIndex] ?? null;
  const disableStart =
    creatingSession || loading || !selectedPlaylist || Boolean(startDisabledReason);
  const useCompactSummary = isCompactHeight || height < 960;

  return (
    <HostLayout maxWidth={contentMax.stage} notice={notice} headerEyebrow="Playlist Auswahl">
      <HostScreenContainer>
        <HostPanel
          tone="glass"
          padding={isCompactHeight ? "sm" : "md"}
          maxWidth={contentMax.medium}
        >
          <Text
            style={{
              color: Colors.textOnBg,
              fontSize: fluidBetween(isCompactHeight ? 20 : 22, isCompactHeight ? 26 : 28, "width"),
              fontWeight: "900",
              textAlign: "center",
            }}
          >
            Playlist waehlen
          </Text>
          <Text
            style={{
              color: "rgba(32,44,89,0.84)",
              fontSize: typeScale.bodySm,
              lineHeight: typeScale.bodySm + 7,
              fontWeight: "600",
              textAlign: "center",
            }}
          >
            {loading
              ? "Kuratierte BeatBrain-Playlists werden geladen..."
              : selectedPlaylist
                ? selectedPlaylist.title
                : "Waehle eine lokale BeatBrain-Kategorie aus."}
          </Text>
          {useCompactSummary && (
            <HostActionBar maxWidth={contentMax.compact} gap={space.sm}>
              <HostActionButton
                title={creatingSession ? "Quiz wird vorbereitet..." : "Diese Playlist starten"}
                onPress={onCreateSession}
                disabled={disableStart}
                textStyle={{ fontSize: fluidBetween(16, 19, "width"), fontWeight: "800" }}
              />
            </HostActionBar>
          )}
        </HostPanel>

        {loading ? (
          <StatusCard>
            <ActivityIndicator color={Colors.navy} size={36 as any} />
            <Text
              style={{
                color: Colors.textOnBg,
                fontSize: fluidBetween(17, 20, "width"),
                fontWeight: "800",
                textAlign: "center",
              }}
            >
              BeatBrain-Playlists werden geladen...
            </Text>
          </StatusCard>
        ) : playlists.length > 0 ? (
          <HostResponsiveGrid
            minItemWidth={
              width <= 479
                ? 150
                : width <= 767
                  ? 176
                  : isCompactHeight
                    ? 196
                    : 220
            }
            maxColumns={width >= 1600 ? 5 : 4}
            gap={isCompactHeight ? space.md : space.lg}
          >
            {playlists.map((item, index) => {
              const selected = selectedPlaylistIndex === index;
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => onSelectPlaylistIndex(index)}
                  style={({ pressed }) => ({
                    height: "100%",
                    opacity: pressed ? 0.9 : 1,
                    backgroundColor: selected ? Colors.navy : "rgba(255,255,255,0.78)",
                    borderRadius: radii.xl,
                    padding: isCompactHeight ? space.xs : space.sm,
                    borderWidth: selected ? 2 : 1,
                    borderColor: selected ? Colors.textOnNavy : "rgba(32,44,89,0.12)",
                    gap: isCompactHeight ? space.xs : space.sm,
                  })}
                >
                  <Image
                    source={
                      item.imageUrl
                        ? { uri: item.imageUrl }
                        : require("../../../assets/logo.png")
                    }
                    resizeMode="cover"
                    style={{
                      width: "100%",
                      aspectRatio: useCompactSummary ? 1.35 : isCompactHeight ? 1.2 : 1,
                      borderRadius: radii.lg,
                      backgroundColor: "rgba(255,255,255,0.1)",
                    }}
                  />

                  <View style={{ gap: space.xs }}>
                    <Text
                      numberOfLines={2}
                      style={{
                        color: selected ? Colors.textOnNavy : Colors.textOnBg,
                        fontSize: fluidBetween(15, 18, "width"),
                        fontWeight: "900",
                        textAlign: "center",
                      }}
                    >
                      {item.title}
                    </Text>
                    {typeof item.trackCount === "number" && (
                      <Text
                        style={{
                          color: selected ? "rgba(255,255,255,0.86)" : "rgba(32,44,89,0.72)",
                          fontSize: typeScale.bodySm,
                          fontWeight: "700",
                          textAlign: "center",
                        }}
                      >
                        {item.trackCount} Tracks
                      </Text>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </HostResponsiveGrid>
        ) : (
          <StatusCard>
            <Text
              style={{
                color: Colors.textOnBg,
                fontSize: fluidBetween(16, 19, "width"),
                fontWeight: "800",
                textAlign: "center",
              }}
            >
              Keine Playlists verfuegbar.
            </Text>
          </StatusCard>
        )}

        {!useCompactSummary && (
          <HostPanel tone="navy" maxWidth={contentMax.medium}>
            <Text
              style={{
                color: "rgba(46,196,182,0.86)",
                fontSize: typeScale.label,
                fontWeight: "900",
                textTransform: "uppercase",
                letterSpacing: 1.1,
                textAlign: "center",
              }}
            >
              Aktive Auswahl
            </Text>
            <Text
              style={{
                color: Colors.textOnNavy,
                fontSize: fluidBetween(22, 30, "width"),
                lineHeight: fluidBetween(26, 34, "width"),
                fontWeight: "900",
                textAlign: "center",
              }}
            >
              {selectedPlaylist ? selectedPlaylist.title : "Bitte eine Playlist auswaehlen"}
            </Text>
            {!!startDisabledReason && (
              <Text
                style={{
                  color: "rgba(255,255,255,0.82)",
                  fontSize: typeScale.bodySm,
                  lineHeight: typeScale.bodySm + 7,
                  fontWeight: "700",
                  textAlign: "center",
                }}
              >
                {startDisabledReason}
              </Text>
            )}
            <HostActionBar maxWidth={contentMax.compact}>
              <HostActionButton
                title={creatingSession ? "Quiz wird vorbereitet..." : "Diese Playlist starten"}
                onPress={onCreateSession}
                disabled={disableStart}
                invert
                textStyle={{ fontSize: fluidBetween(17, 20, "width"), fontWeight: "800" }}
              />
            </HostActionBar>
          </HostPanel>
        )}

        {!!playlistsError && (
          <Text
            style={{
              color: Colors.textOnBg,
              textAlign: "center",
              fontWeight: "700",
              fontSize: typeScale.bodySm,
            }}
          >
            {playlistsError}
          </Text>
        )}

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
      </HostScreenContainer>
    </HostLayout>
  );
}

function StatusCard({ children }: { children: React.ReactNode }) {
  return (
    <HostPanel tone="glass" style={{ alignItems: "center", justifyContent: "center" }}>
      {children}
    </HostPanel>
  );
}
