import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { Colors } from "../../theme";
import type { PlaylistCard } from "../../shared/types/app";
import { HostActionBar } from "../components/HostActionBar";
import { HostActionButton } from "../components/HostActionButton";
import { HostLayout } from "../components/HostLayout";
import { HostPanel } from "../components/HostPanel";
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
  const compactCarouselCards = isCompactHeight || height < 1100;
  const stageGap = compactCarouselCards ? space.sm : space.md;
  const scrollRef = useRef<ScrollView | null>(null);
  const [carouselWidth, setCarouselWidth] = useState(0);

  const itemGap = width <= 479 ? space.xs : compactCarouselCards ? space.sm : space.md;
  const cardWidth = useMemo(() => {
    const availableWidth = Math.max(carouselWidth, width * 0.7);
    const preferred =
      width <= 767
        ? availableWidth * 0.7
        : width <= 1023
          ? availableWidth * 0.48
          : compactCarouselCards
            ? availableWidth * 0.33
            : availableWidth * 0.36;
    const minWidth = width <= 479 ? 204 : width <= 767 ? 228 : compactCarouselCards ? 248 : 272;
    const maxWidth = width <= 767 ? 308 : width <= 1279 ? 382 : 418;
    return Math.round(Math.min(maxWidth, Math.max(minWidth, preferred)));
  }, [carouselWidth, compactCarouselCards, width]);
  const itemExtent = cardWidth + itemGap;
  const sideInset = Math.max(0, Math.round((carouselWidth - cardWidth) / 2));
  const coverAspectRatio =
    width <= 767 ? 1.2 : compactCarouselCards ? 1.38 : height < 1280 ? 1.26 : 1.18;

  const scrollToIndex = useCallback(
    (index: number, animated: boolean) => {
      if (!scrollRef.current || !playlists.length) {
        return;
      }
      const clamped = Math.max(0, Math.min(index, playlists.length - 1));
      scrollRef.current.scrollTo({
        x: clamped * itemExtent,
        y: 0,
        animated,
      });
    },
    [itemExtent, playlists.length],
  );

  const selectIndex = useCallback(
    (index: number, animated = true) => {
      const clamped = Math.max(0, Math.min(index, playlists.length - 1));
      onSelectPlaylistIndex(clamped);
      scrollToIndex(clamped, animated);
    },
    [onSelectPlaylistIndex, playlists.length, scrollToIndex],
  );

  const handleCarouselLayout = useCallback((event: LayoutChangeEvent) => {
    setCarouselWidth(Math.max(0, Math.round(event.nativeEvent.layout.width)));
  }, []);

  const handleMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!playlists.length) {
        return;
      }

      const offsetX = event.nativeEvent.contentOffset.x;
      const nextIndex = Math.round(offsetX / Math.max(1, itemExtent));
      const clamped = Math.max(0, Math.min(nextIndex, playlists.length - 1));
      if (clamped !== selectedPlaylistIndex) {
        onSelectPlaylistIndex(clamped);
      }
    },
    [itemExtent, onSelectPlaylistIndex, playlists.length, selectedPlaylistIndex],
  );

  useEffect(() => {
    if (!carouselWidth || !playlists.length) {
      return;
    }

    const timeout = setTimeout(() => {
      scrollToIndex(selectedPlaylistIndex, false);
    }, 0);

    return () => clearTimeout(timeout);
  }, [carouselWidth, playlists.length, scrollToIndex, selectedPlaylistIndex]);

  return (
    <HostLayout maxWidth={contentMax.stage} notice={notice} headerEyebrow="Playlist-Auswahl">
      <HostScreenContainer gap={stageGap}>
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
          <View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: width <= 767 ? space.xs : compactCarouselCards ? space.xs : space.sm,
              }}
            >
              <CarouselArrowButton
                direction="left"
                disabled={selectedPlaylistIndex <= 0}
                onPress={() => selectIndex(selectedPlaylistIndex - 1)}
              />

              <View style={{ flex: 1 }} onLayout={handleCarouselLayout}>
                <ScrollView
                  ref={scrollRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  bounces={false}
                  decelerationRate="fast"
                  snapToInterval={itemExtent}
                  snapToAlignment="start"
                  onMomentumScrollEnd={handleMomentumEnd}
                  contentContainerStyle={{
                    paddingHorizontal: sideInset,
                    paddingVertical: compactCarouselCards ? 0 : space.xxs,
                    gap: itemGap,
                  }}
                >
                  {playlists.map((item, index) => {
                    const selected = selectedPlaylistIndex === index;
                    const distance = Math.abs(index - selectedPlaylistIndex);
                    const scale = selected ? 1 : distance === 1 ? 0.93 : 0.88;
                    const opacity = selected ? 1 : distance === 1 ? 0.9 : 0.74;

                    return (
                      <Pressable
                        key={item.id}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        onPress={() => selectIndex(index)}
                        style={({ pressed }) => ({
                          width: cardWidth,
                          opacity: pressed ? 0.96 : opacity,
                          transform: [{ scale }],
                        })}
                      >
                        <View
                          style={{
                            backgroundColor: selected ? Colors.navy : "rgba(255,255,255,0.8)",
                            borderRadius: radii.xl,
                            padding: compactCarouselCards ? space.xs : space.sm,
                            gap: compactCarouselCards ? space.xxs : space.xs,
                            borderWidth: selected ? 3 : 1,
                            borderColor: selected
                              ? "rgba(255,255,255,0.9)"
                              : "rgba(32,44,89,0.14)",
                            shadowColor: "#000",
                            shadowOpacity: selected ? 0.18 : 0.08,
                            shadowRadius: selected ? 16 : 8,
                            shadowOffset: { width: 0, height: selected ? 12 : 5 },
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
                              aspectRatio: coverAspectRatio,
                              borderRadius: radii.lg,
                              backgroundColor: "rgba(255,255,255,0.1)",
                            }}
                          />

                          
                        </View>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              <CarouselArrowButton
                direction="right"
                disabled={selectedPlaylistIndex >= playlists.length - 1}
                onPress={() => selectIndex(selectedPlaylistIndex + 1)}
              />
            </View>
          </View>
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
              Keine BeatBrain-Playlists verfügbar.
            </Text>
          </StatusCard>
        )}

        {playlists.length > 0 && (
          <HostPanel
            tone="glass"
            padding="sm"
            gap={compactCarouselCards ? space.xs : space.sm}
            maxWidth={contentMax.compact}
          >
            <Text
              style={{
                color: Colors.textOnBg,
                fontSize: fluidBetween(24, compactCarouselCards ? 32 : 36, "width"),
                lineHeight: fluidBetween(28, compactCarouselCards ? 36 : 40, "width"),
                fontWeight: "900",
                textAlign: "center",
              }}
            >
              {selectedPlaylist ? selectedPlaylist.title : "Bitte eine Playlist auswählen"}
            </Text>

            {!!selectedPlaylist?.tags?.length && (
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  gap: space.xs,
                }}
              >
                {selectedPlaylist.tags.slice(0, 3).map((tag) => (
                  <View
                    key={`selected-${selectedPlaylist.id}-${tag}`}
                    style={{
                      borderRadius: radii.pill,
                      paddingHorizontal: space.sm,
                      paddingVertical: Math.max(4, space.xxs),
                      backgroundColor: "rgba(32,44,89,0.08)",
                    }}
                  >
                    <Text
                      style={{
                        color: Colors.textOnBg,
                        fontSize: compactCarouselCards
                          ? Math.max(10, typeScale.bodySm - 2)
                          : Math.max(11, typeScale.bodySm - 1),
                        fontWeight: "700",
                        textAlign: "center",
                      }}
                    >
                      {tag}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <HostActionBar maxWidth={contentMax.compact}>
              <HostActionButton
                title={creatingSession ? "Quiz wird vorbereitet..." : "Quiz starten"}
                onPress={onCreateSession}
                disabled={disableStart}
                textStyle={{ fontSize: fluidBetween(15, 18, "width"), fontWeight: "800" }}
              />
            </HostActionBar>

            {!!startDisabledReason && (
              <Text
                style={{
                  color: "rgba(32,44,89,0.82)",
                  fontSize: typeScale.bodySm,
                  lineHeight: typeScale.bodySm + 7,
                  fontWeight: "700",
                  textAlign: "center",
                }}
              >
                {startDisabledReason}
              </Text>
            )}
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

function CarouselArrowButton({
  direction,
  disabled,
  onPress,
}: {
  direction: "left" | "right";
  disabled: boolean;
  onPress: () => void;
}) {
  const isLeft = direction === "left";
  const chevronRotation = isLeft ? "225deg" : "45deg";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isLeft ? "Vorherige Playlist" : "Nächste Playlist"}
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.navy,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.28 : pressed ? 0.84 : 1,
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

function StatusCard({ children }: { children: React.ReactNode }) {
  return (
    <HostPanel tone="glass" style={{ alignItems: "center", justifyContent: "center" }}>
      {children}
    </HostPanel>
  );
}
