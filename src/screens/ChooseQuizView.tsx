import React, { RefObject } from "react";
import { ActivityIndicator, FlatList, Image, Text, View } from "react-native";
import { BBButton } from "../components/BBButton";
import { AppHeader } from "../components/AppHeader";
import {
  CARD_W,
  CHOOSE_FOOTER_PADDING_BOTTOM,
  SCREEN_W,
} from "../constants/app";
import { Colors, Radius } from "../theme";
import type { PlaylistCard } from "../types/app";

type Props = {
  hasAuth: boolean;
  authBusy: boolean;
  authError: string | null;
  playlists: PlaylistCard[];
  selectedPlaylistIndex: number;
  selectedPlaylist: PlaylistCard | null;
  playlistLoading: boolean;
  playlistError: string | null;
  carouselRef: RefObject<FlatList<PlaylistCard> | null>;
  onBack: () => void;
  onSelectPlaylistIndex: (index: number) => void;
  onStartQuiz: () => Promise<void>;
};

export function ChooseQuizView({
  hasAuth,
  authBusy,
  authError,
  playlists,
  selectedPlaylistIndex,
  selectedPlaylist,
  playlistLoading,
  playlistError,
  carouselRef,
  onBack,
  onSelectPlaylistIndex,
  onStartQuiz,
}: Props) {
  const disableStart = playlistLoading || !selectedPlaylist;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <AppHeader onBack={onBack} />

      {!hasAuth && (
        <View style={{ paddingHorizontal: 18, marginTop: 16, alignItems: "center" }}>
          {authBusy && <ActivityIndicator />}
          {authError && (
            <Text style={{ marginTop: 10, color: "red", textAlign: "center", fontWeight: "700" }}>{authError}</Text>
          )}
        </View>
      )}

      {hasAuth && (
        <View style={{ flex: 1, paddingTop: 8 }}>
          <View>
            <FlatList
              ref={carouselRef}
              data={playlists}
              horizontal
              showsHorizontalScrollIndicator={false}
              initialNumToRender={3}
              windowSize={5}
              removeClippedSubviews
              maxToRenderPerBatch={3}
              updateCellsBatchingPeriod={50}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingHorizontal: (SCREEN_W - CARD_W) / 2 }}
              snapToInterval={CARD_W + 18}
              decelerationRate="fast"
              bounces={false}
              onMomentumScrollEnd={(e) => {
                const x = e.nativeEvent.contentOffset.x;
                const idx = Math.round(x / (CARD_W + 18));
                onSelectPlaylistIndex(Math.max(0, Math.min(idx, playlists.length - 1)));
              }}
              renderItem={({ item, index }) => {
                const isSelected = index === selectedPlaylistIndex;
                return (
                  <View style={{ width: CARD_W, marginRight: 18, alignItems: "center" }}>
                    <View
                      style={{
                        backgroundColor: Colors.navy,
                        borderRadius: Radius.xl,
                        padding: 14,
                        borderWidth: isSelected ? 2 : 0,
                        borderColor: Colors.textOnNavy,
                      }}
                    >
                      <Image
                        source={item.imageUrl ? { uri: item.imageUrl } : require("../../assets/logo.png")}
                        style={{ width: CARD_W - 28, height: CARD_W - 28, borderRadius: Radius.lg }}
                      />
                    </View>

                    <Text
                      style={{
                        marginTop: 12,
                        fontSize: 22,
                        fontWeight: "700",
                        color: Colors.textOnBg,
                        textAlign: "center",
                      }}
                    >
                      {item.title}
                    </Text>
                  </View>
                );
              }}
            />
          </View>

          <View
            style={{
              paddingHorizontal: 18,
              marginTop: "auto",
              paddingBottom: CHOOSE_FOOTER_PADDING_BOTTOM,
            }}
          >
            <BBButton title="Start Quiz" disabled={disableStart} onPress={onStartQuiz} />

            {playlistLoading && (
              <View style={{ alignItems: "center", marginTop: 14 }}>
                <ActivityIndicator />
                <Text style={{ marginTop: 8, color: Colors.textOnBg }}>Playlists werden geladen...</Text>
              </View>
            )}

            {playlistError && (
              <Text
                style={{
                  marginTop: 12,
                  textAlign: "center",
                  color: "red",
                  fontSize: 16,
                  fontWeight: "700",
                }}
              >
                {playlistError}
              </Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
}
