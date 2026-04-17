import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { Colors, Radius } from "../../theme";
import type { PlaylistCard } from "../../shared/types/app";
import { HostActionButton } from "../components/HostActionButton";
import { HostLayout } from "../components/HostLayout";
import { useHostViewport } from "../hooks/useHostViewport";

type Props = {
  playlists: PlaylistCard[];
  loading: boolean;
  playlistsError: string | null;
  selectedPlaylistIndex: number;
  setupError: string | null;
  socketError?: string | null;
  startDisabledReason?: string | null;
  creatingSession: boolean;
  onSelectPlaylistIndex: (index: number) => void;
  onCreateSession: () => void;
  notice?: string | null;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function HostChoosePlaylistScreen({
  playlists,
  loading,
  playlistsError,
  selectedPlaylistIndex,
  setupError,
  socketError,
  startDisabledReason,
  creatingSession,
  onSelectPlaylistIndex,
  onCreateSession,
  notice,
}: Props) {
  const { width, fluid, isShortHeight, isVeryShortHeight } = useHostViewport();
  const scrollRef = useRef<ScrollView | null>(null);
  const [carouselWidth, setCarouselWidth] = useState(Math.max(320, Math.round(width * 0.72)));
  const hasPlaylists = playlists.length > 0;
  const boundedSelectedPlaylistIndex = hasPlaylists
    ? clamp(selectedPlaylistIndex, 0, playlists.length - 1)
    : -1;
  const selectedPlaylist =
    boundedSelectedPlaylistIndex >= 0 ? playlists[boundedSelectedPlaylistIndex] ?? null : null;
  const setupStatusMessage = setupError || socketError;
  const disableStart =
    creatingSession || loading || !selectedPlaylist || Boolean(startDisabledReason);
  const itemSpacing = fluid(16, 10, 18, "width");
  const visibleCards =
    width >= 1600 && !isShortHeight
      ? 4.1
      : width >= 1280 && !isShortHeight
        ? 3.5
        : width >= 1024
          ? 3.1
          : width >= 820
            ? 2.6
            : width >= 640
              ? 2.1
              : 1.28;
  const cardWidth = useMemo(() => {
    const computed = carouselWidth / visibleCards - itemSpacing;
    return Math.round(clamp(computed, 150, width >= 1440 ? 300 : width >= 1024 ? 252 : 220));
  }, [carouselWidth, itemSpacing, visibleCards, width]);
  const itemWidth = cardWidth + itemSpacing;
  const sideInset = Math.max(0, (carouselWidth - cardWidth) / 2);

  const onCarouselLayout = useCallback((event: LayoutChangeEvent) => {
    const nextWidth = Math.max(280, Math.round(event.nativeEvent.layout.width));
    setCarouselWidth((currentWidth) =>
      Math.abs(currentWidth - nextWidth) > 2 ? nextWidth : currentWidth,
    );
  }, []);

  const selectIndex = useCallback(
    (nextIndex: number, animated = true) => {
      if (!playlists.length) {
        return;
      }

      const safeIndex = Math.max(0, Math.min(nextIndex, playlists.length - 1));
      onSelectPlaylistIndex(safeIndex);
      scrollRef.current?.scrollTo({
        x: Math.max(0, safeIndex * itemWidth),
        animated,
      });
    },
    [itemWidth, onSelectPlaylistIndex, playlists.length],
  );

  const selectPrev = useCallback(() => {
    selectIndex(boundedSelectedPlaylistIndex - 1);
  }, [boundedSelectedPlaylistIndex, selectIndex]);

  const selectNext = useCallback(() => {
    selectIndex(boundedSelectedPlaylistIndex + 1);
  }, [boundedSelectedPlaylistIndex, selectIndex]);

  useEffect(() => {
    if (!hasPlaylists) {
      return;
    }

    selectIndex(boundedSelectedPlaylistIndex, false);
  }, [boundedSelectedPlaylistIndex, hasPlaylists, selectIndex]);

  useEffect(() => {
    if (Platform.OS !== "web") {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target instanceof HTMLSelectElement ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        selectPrev();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        selectNext();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectNext, selectPrev]);

  return (
    <HostLayout maxWidth={1180} notice={notice} headerEyebrow="Playlist Auswahl">
      <View
        style={{
          width: "100%",
          gap: fluid(isVeryShortHeight ? 10 : 14, 10, 16, "height"),
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
            paddingVertical: fluid(isVeryShortHeight ? 10 : 14, 10, 16, "height"),
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
            {loading
              ? "Kuratierte BeatBrain-Playlists werden geladen..."
              : selectedPlaylist
                ? selectedPlaylist.title
                : "Waehle eine lokale BeatBrain-Kategorie aus."}
          </Text>
        </View>

        {loading ? (
          <StatusCard>
            <ActivityIndicator color={Colors.navy} size={36} />
            <Text
              style={{
                color: Colors.textOnBg,
                fontSize: fluid(18, 16, 20),
                fontWeight: "800",
                textAlign: "center",
              }}
            >
              BeatBrain-Playlists werden geladen...
            </Text>
          </StatusCard>
        ) : playlists.length > 0 ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: fluid(10, 8, 12, "width"),
            }}
          >
            <ArrowButton
              direction="left"
              disabled={boundedSelectedPlaylistIndex <= 0}
              onPress={selectPrev}
            />

            <View style={{ flex: 1 }} onLayout={onCarouselLayout}>
              <ScrollView
                ref={scrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={itemWidth}
                snapToAlignment="start"
                decelerationRate="fast"
                contentContainerStyle={{
                  gap: itemSpacing,
                  paddingHorizontal: sideInset,
                  paddingVertical: fluid(10, 8, 12, "height"),
                }}
                style={{ flex: 1 }}
                onMomentumScrollEnd={(event) => {
                  const offset = event.nativeEvent.contentOffset.x;
                  const index = Math.round(offset / itemWidth);
                  const safeIndex = Math.max(0, Math.min(index, playlists.length - 1));
                  if (safeIndex !== boundedSelectedPlaylistIndex) {
                    onSelectPlaylistIndex(safeIndex);
                  }
                }}
              >
                {playlists.map((item, index) => {
                  const selected = boundedSelectedPlaylistIndex === index;
                  const distance = Math.abs(index - boundedSelectedPlaylistIndex);
                  const scale = selected ? 1.05 : distance <= 1 ? 0.95 : 0.9;
                  const opacity = selected ? 1 : distance <= 1 ? 0.84 : 0.64;

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
                          width: "100%",
                          borderRadius: Radius.xl,
                          backgroundColor: Colors.navy,
                          padding: fluid(9, 7, 10),
                          borderWidth: selected ? 3 : 1,
                          borderColor: selected
                            ? Colors.textOnNavy
                            : "rgba(255,255,255,0.26)",
                          shadowColor: "#000000",
                          shadowOpacity: selected ? 0.2 : 0.08,
                          shadowRadius: selected ? 12 : 6,
                          shadowOffset: { width: 0, height: selected ? 8 : 4 },
                          elevation: selected ? 8 : 3,
                        }}
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
                            aspectRatio: 1,
                            borderRadius: Radius.lg,
                            backgroundColor: "rgba(255,255,255,0.1)",
                          }}
                        />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <ArrowButton
              direction="right"
              disabled={boundedSelectedPlaylistIndex >= playlists.length - 1}
              onPress={selectNext}
            />
          </View>
        ) : (
          <StatusCard>
            <Text
              style={{
                color: Colors.textOnBg,
                fontSize: fluid(18, 16, 20),
                fontWeight: "800",
                textAlign: "center",
              }}
            >
              Keine Playlists verfügbar.
            </Text>
          </StatusCard>
        )}

        <View
          style={{
            alignSelf: "center",
            maxWidth: 720,
            width: "100%",
            backgroundColor: Colors.navy,
            borderRadius: Radius.xl,
            paddingVertical: fluid(isVeryShortHeight ? 12 : 16, 12, 18, "height"),
            paddingHorizontal: fluid(18, 14, 20),
            gap: fluid(10, 8, 12, "height"),
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
              fontSize: fluid(26, 20, 28),
              lineHeight: fluid(30, 24, 32),
              fontWeight: "900",
              textAlign: "center",
            }}
          >
            {selectedPlaylist ? selectedPlaylist.title : "Bitte eine Playlist auswählen"}
          </Text>
          {!!startDisabledReason && (
            <Text
              style={{
                color: "rgba(255,255,255,0.82)",
                fontSize: fluid(14, 12, 14),
                lineHeight: fluid(20, 17, 20),
                fontWeight: "700",
                textAlign: "center",
              }}
            >
              {startDisabledReason}
            </Text>
          )}
          <View style={{ width: "100%", maxWidth: 460, alignSelf: "center" }}>
            <HostActionButton
              title={creatingSession ? "Quiz wird vorbereitet..." : "Diese Playlist starten"}
              onPress={onCreateSession}
              disabled={disableStart}
              invert
              textStyle={{ fontSize: fluid(20, 17, 20), fontWeight: "800" }}
            />
          </View>
        </View>

        {!!playlistsError && (
          <Text style={{ color: Colors.textOnBg, textAlign: "center", fontWeight: "700" }}>
            {playlistsError}
          </Text>
        )}

        {!!setupStatusMessage && (
          <Text style={{ color: Colors.textOnBg, textAlign: "center", fontWeight: "700" }}>
            {setupStatusMessage}
          </Text>
        )}
      </View>
    </HostLayout>
  );
}

function StatusCard({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        width: "100%",
        borderRadius: Radius.xl,
        backgroundColor: "rgba(255,255,255,0.72)",
        paddingHorizontal: 18,
        paddingVertical: 20,
        gap: 12,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </View>
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
      accessibilityState={{ disabled }}
      disabled={disabled}
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
