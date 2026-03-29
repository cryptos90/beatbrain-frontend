import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type LayoutChangeEvent,
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
import { HostLayout } from "../components/HostLayout";

type Props = {
  playlists: PlaylistCard[];
  selectedPlaylistIndex: number;
  setupError: string | null;
  creatingSession: boolean;
  onSelectPlaylistIndex: (index: number) => void;
  onCreateSession: () => void;
  notice?: string | null;
};

export function HostQuizSetupScreen({
  playlists,
  selectedPlaylistIndex,
  setupError,
  creatingSession,
  onSelectPlaylistIndex,
  onCreateSession,
  notice,
}: Props) {
  const scrollRef = useRef<ScrollView | null>(null);
  const [carouselWidth, setCarouselWidth] = useState(Math.max(680, CARD_W * 2.8));
  const itemSpacing = 14;
  const cardWidth = useMemo(() => {
    const visibleWithHalfSides = (carouselWidth - itemSpacing * 4) / 4;
    return Math.max(124, Math.min(280, visibleWithHalfSides));
  }, [carouselWidth]);
  const itemWidth = cardWidth + itemSpacing;
  const sideInset = Math.max(0, (carouselWidth - cardWidth) / 2);
  const hasPlaylists = playlists.length > 0;
  const selectedPlaylist = playlists[selectedPlaylistIndex] ?? null;

  const onCarouselLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const nextWidth = Math.max(320, event.nativeEvent.layout.width);
      if (Math.abs(nextWidth - carouselWidth) > 2) {
        setCarouselWidth(nextWidth);
      }
    },
    [carouselWidth],
  );

  const selectIndex = useCallback(
    (index: number) => {
      if (!playlists.length) {
        return;
      }
      const safeIndex = Math.max(0, Math.min(index, playlists.length - 1));
      onSelectPlaylistIndex(safeIndex);
      scrollRef.current?.scrollTo({
        x: Math.max(0, safeIndex * itemWidth),
        animated: true,
      });
    },
    [itemWidth, onSelectPlaylistIndex, playlists.length],
  );

  const selectPrev = useCallback(() => {
    selectIndex(selectedPlaylistIndex - 1);
  }, [selectIndex, selectedPlaylistIndex]);

  const selectNext = useCallback(() => {
    selectIndex(selectedPlaylistIndex + 1);
  }, [selectIndex, selectedPlaylistIndex]);

  useEffect(() => {
    if (!hasPlaylists) {
      return;
    }
    scrollRef.current?.scrollTo({
      x: Math.max(0, selectedPlaylistIndex * itemWidth),
      animated: false,
    });
  }, [hasPlaylists, itemWidth, selectedPlaylistIndex]);

  useEffect(() => {
    if (Platform.OS !== "web") {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
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
    <HostLayout maxWidth={1160} notice={notice} headerEyebrow="Playlist Auswahl">
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          gap: 16,
        }}
      >
        <View
          style={{
            alignSelf: "center",
            maxWidth: 760,
            width: "100%",
            borderRadius: Radius.xl,
            backgroundColor: "rgba(255,255,255,0.72)",
            paddingHorizontal: 18,
            paddingVertical: 16,
            gap: 8,
          }}
        >
          <Text
            style={{
              color: Colors.textOnBg,
              fontSize: 24,
              fontWeight: "900",
              textAlign: "center",
            }}
          >
            Playlist wählen
          </Text>
          <Text
            style={{
              color: "rgba(32,44,89,0.84)",
              fontSize: 15,
              lineHeight: 22,
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
              paddingVertical: 16,
              paddingHorizontal: 18,
              gap: 8,
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
                fontSize: 26,
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
            style={{ height: 64 }}
            textStyle={{ fontSize: 20, fontWeight: "800" }}
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
