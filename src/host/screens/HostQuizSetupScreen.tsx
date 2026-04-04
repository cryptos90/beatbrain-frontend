export { HostChoosePlaylistScreen as HostQuizSetupScreen } from "./HostChoosePlaylistScreen";
/*
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type LayoutChangeEvent,
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { BBButton } from "../../components/BBButton";
import { CARD_W } from "../../constants/app";
import { Colors, Radius } from "../../theme";
import type { PlaylistCard } from "../../shared/types/app";
import { HostActionButton } from "../components/HostActionButton";
import { useHostViewport } from "../hooks/useHostViewport";
import { HostLayout } from "../components/HostLayout";

type Props = {
  playlists: PlaylistCard[];
  loading: boolean;
  playlistsError: string | null;
  selectedPlaylistIndex: number;
  setupError: string | null;
  creatingSession: boolean;
  onSelectPlaylistIndex: (index: number) => void;
  onCreateSession: () => void;
  notice?: string | null;
};

export function HostQuizSetupScreen({
  playlists,
  loading,
  playlistsError,
  selectedPlaylistIndex,
  setupError,
  creatingSession,
  onSelectPlaylistIndex,
  onCreateSession,
  notice,
}: Props) {
  const { width, fluid, isShortHeight } = useHostViewport();
  const columns =
    width >= 1500 && !isShortHeight ? 4 : width >= 1160 ? 3 : width >= 760 ? 2 : 1;
  const cardWidth =
    columns === 1 ? "100%" : columns === 2 ? "50%" : columns === 3 ? "33.333%" : "25%";
  const cardGap = fluid(16, 10, 18, "height");
  const selectedPlaylist = playlists[selectedPlaylistIndex] ?? null;
  const disableStart = creatingSession || loading || !selectedPlaylist;

  return (
    <HostLayout maxWidth={1160} notice={notice} headerEyebrow="Playlist Auswahl">
      <View
        style={{
          width: "100%",
          gap: fluid(16, 12, 16, "height"),
        }}
      >
        <View
          style={{
            alignSelf: "center",
            maxWidth: 760,
            width: "100%",
            borderRadius: Radius.xl,
            backgroundColor: "rgba(255,255,255,0.72)",
            paddingHorizontal: fluid(18, 14, 18),
            paddingVertical: fluid(16, 12, 16, "height"),
            gap: fluid(8, 6, 8, "height"),
          }}
        >
          <Text
            style={{
              color: Colors.textOnBg,
              fontSize: fluid(24, 20, 24),
              fontWeight: "900",
              textAlign: "center",
            }}
          >
            Playlist wählen
          </Text>
          <Text
            style={{
              color: "rgba(32,44,89,0.84)",
              fontSize: fluid(15, 13, 15),
              lineHeight: fluid(22, 18, 22),
              fontWeight: "600",
              textAlign: "center",
            }}
          >
            {selectedPlaylist ? selectedPlaylist.title : "Playlist auswählen"}
          </Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <ArrowButton direction="left" disabled={selectedPlaylistIndex <= 0} onPress={selectPrev} />
          <View style={{ flex: 1 }} onLayout={onCarouselLayout}>
            <ScrollView
              ref={scrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={itemWidth}
              snapToAlignment="start"
              decelerationRate="fast"
              onMomentumScrollEnd={(event) => {
                if (!playlists.length) {
                  return;
                }
                const offset = event.nativeEvent.contentOffset.x;
                const index = Math.round(offset / itemWidth);
                const clamped = Math.max(0, Math.min(index, playlists.length - 1));
                if (clamped !== selectedPlaylistIndex) {
                  onSelectPlaylistIndex(clamped);
                }
              }}
              contentContainerStyle={{
                gap: itemSpacing,
                paddingHorizontal: sideInset,
                paddingVertical: 14,
              }}
              style={{ flex: 1 }}
            >
              {playlists.map((item, index) => {
                const selected = selectedPlaylistIndex === index;
                const distance = Math.abs(index - selectedPlaylistIndex);
                const scale = selected ? 1.09 : distance <= 1 ? 0.96 : 0.88;
                const opacity = selected ? 1 : distance <= 1 ? 0.84 : 0.62;
                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.92}
                    onPress={() => selectIndex(index)}
                    style={{
                      width: cardWidth,
                      alignItems: "center",
                      opacity,
                      transform: [{ scale }],
                    }}
                  >
                    <View
                      style={{
                        backgroundColor: Colors.navy,
                        borderRadius: Radius.xl,
                        padding: 9,
                        borderWidth: selected ? 4 : 1,
                        borderColor: selected
                          ? Colors.textOnNavy
                          : "rgba(255,255,255,0.28)",
                        width: "100%",
                        shadowColor: "#000",
                        shadowOpacity: selected ? 0.2 : 0.08,
                        shadowRadius: selected ? 12 : 6,
                        shadowOffset: { width: 0, height: selected ? 8 : 4 },
                      }}
                    >
                      <Image
                        source={{ uri: item.imageUrl }}
                        style={{ width: "100%", height: cardWidth - 18, borderRadius: Radius.lg }}
                      />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
          <ArrowButton
            direction="right"
            disabled={selectedPlaylistIndex >= playlists.length - 1}
            onPress={selectNext}
          />
        </View>

        {selectedPlaylist ? (
          <View
            style={{
              alignSelf: "center",
              maxWidth: 660,
              width: "100%",
              backgroundColor: Colors.navy,
              borderRadius: Radius.xl,
              paddingVertical: fluid(16, 12, 16, "height"),
              paddingHorizontal: fluid(18, 14, 18),
              gap: fluid(8, 6, 8, "height"),
            }}
          >
            <Text
              style={{
                color: "rgba(46,196,182,0.86)",
                fontSize: 12,
                fontWeight: "900",
                textTransform: "uppercase",
                letterSpacing: 1.1,
                textAlign: "center",
              }}
            >
              Aktive Auswahl
            </Text>
            <Text
              numberOfLines={2}
              style={{
                color: Colors.textOnNavy,
                fontSize: fluid(26, 22, 26),
                fontWeight: "900",
                textAlign: "center",
              }}
            >
              {selectedPlaylist.title}
            </Text>
          </View>
        ) : (
          <Text style={{ color: Colors.textOnBg, textAlign: "center", fontWeight: "700" }}>
            Keine Playlists verfügbar.
          </Text>
        )}

        {!!setupError && (
          <Text style={{ color: Colors.textOnBg, textAlign: "center", fontWeight: "700" }}>
            {setupError}
          </Text>
        )}

        <View
          style={{
            width: "100%",
            maxWidth: 420,
            alignSelf: "center",
            marginTop: 4,
          }}
        >
          <BBButton
            title={creatingSession ? "Quiz wird vorbereitet..." : "Diese Playlist starten"}
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

type ArrowButtonProps = {
  direction: "left" | "right";
  disabled: boolean;
  onPress: () => void;
};

function ArrowButton({ direction, disabled, onPress }: ArrowButtonProps) {
  const isLeft = direction === "left";
  const chevronRotation = isLeft ? "225deg" : "45deg";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isLeft ? "Vorherige Playlist" : "Nächste Playlist"}
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => ({
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: Colors.navy,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.3 : pressed ? 0.82 : 1,
      })}
    >
      <View
        style={{
          width: 12,
          height: 12,
          borderTopWidth: 3,
          borderRightWidth: 3,
          borderColor: Colors.textOnNavy,
          transform: [{ rotate: chevronRotation }],
        }}
      />
    </Pressable>
  );
}
*/
