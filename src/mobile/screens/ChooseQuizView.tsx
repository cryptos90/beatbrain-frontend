import React, { RefObject } from "react";
import { FlatList, Image, Text, View } from "react-native";
import { AppHeader } from "../../components/AppHeader";
import { BBButton } from "../../components/BBButton";
import { CARD_W, CHOOSE_FOOTER_PADDING_BOTTOM, SCREEN_W } from "../../constants/app";
import { Colors, Radius } from "../../theme";
import type { PlaylistCard } from "../../shared/types/app";

type Props = {
  playlists: PlaylistCard[];
  selectedPlaylistIndex: number;
  selectedPlaylist: PlaylistCard | null;
  carouselRef: RefObject<FlatList<PlaylistCard> | null>;
  playlistError: string | null;
  onBack: () => void;
  onSelectPlaylistIndex: (index: number) => void;
  onStartQuiz: () => Promise<void>;
};

export function ChooseQuizView({
  playlists,
  selectedPlaylistIndex,
  selectedPlaylist,
  carouselRef,
  playlistError,
  onBack,
  onSelectPlaylistIndex,
  onStartQuiz,
}: Props) {
  const disableStart = !selectedPlaylist;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <AppHeader onBack={onBack} />

      <View style={{ flex: 1, paddingTop: 8 }}>
        <FlatList
          ref={carouselRef}
          data={playlists}
          horizontal
          showsHorizontalScrollIndicator={false}
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
                    source={item.imageUrl ? { uri: item.imageUrl } : require("../../../assets/logo.png")}
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

                {!!item.tags?.length && (
                  <Text
                    style={{
                      marginTop: 6,
                      color: Colors.textOnBg,
                      opacity: 0.8,
                      fontSize: 14,
                    }}
                  >
                    {item.tags.join(" | ")}
                  </Text>
                )}
              </View>
            );
          }}
        />

        {!!playlistError && (
          <Text style={{ textAlign: "center", color: "red", fontWeight: "700", marginTop: 8 }}>
            {playlistError}
          </Text>
        )}

        <View
          style={{
            paddingHorizontal: 18,
            marginTop: "auto",
            paddingBottom: CHOOSE_FOOTER_PADDING_BOTTOM,
          }}
        >
          <BBButton title="Start Quiz" disabled={disableStart} onPress={onStartQuiz} />
        </View>
      </View>
    </View>
  );
}
