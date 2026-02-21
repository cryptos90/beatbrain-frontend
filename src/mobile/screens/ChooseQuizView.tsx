import React, { RefObject } from "react";
import { ActivityIndicator, FlatList, Image, Text, View } from "react-native";
import { AppHeader } from "../../components/AppHeader";
import { BBButton } from "../../components/BBButton";
import { CARD_W, CHOOSE_FOOTER_PADDING_BOTTOM, SCREEN_W } from "../../constants/app";
import { Colors, Radius } from "../../theme";
import type { PlaylistCard } from "../../shared/types/app";

type ChooseViewMode = "normal" | "error";

type Props = {
  playlists: PlaylistCard[];
  loading: boolean;
  selectedPlaylistIndex: number;
  selectedPlaylist: PlaylistCard | null;
  carouselRef: RefObject<FlatList<PlaylistCard> | null>;
  playlistError: string | null;
  reauthRequired?: boolean;
  reauthMessage?: string | null;
  viewMode: ChooseViewMode;
  onBack: () => void;
  onSelectPlaylistIndex: (index: number) => void;
  onStartQuiz: () => Promise<void>;
  onRelogin?: () => Promise<void>;
  onRetry?: () => Promise<void>;
};

export function ChooseQuizView({
  playlists,
  loading,
  selectedPlaylistIndex,
  selectedPlaylist,
  carouselRef,
  playlistError,
  reauthRequired = false,
  reauthMessage = null,
  viewMode,
  onBack,
  onSelectPlaylistIndex,
  onStartQuiz,
  onRelogin,
  onRetry,
}: Props) {
  const disableStart = loading || !selectedPlaylist;
  const isErrorMode = viewMode === "error";
  const errorTitle = reauthRequired
    ? "Spotify Login erneuern erforderlich"
    : "Quiz konnte nicht gestartet werden";
  const primaryError = (playlistError ?? "").trim();
  const secondaryError = (reauthMessage ?? "").trim();

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <AppHeader onBack={onBack} />

      <View style={{ flex: 1, paddingTop: 8 }}>
        {loading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color={Colors.textOnBg} />
            <Text
              style={{
                marginTop: 12,
                fontSize: 18,
                fontWeight: "700",
                color: Colors.textOnBg,
              }}
            >
              Playlists werden geladen...
            </Text>
          </View>
        ) : isErrorMode ? (
          <View
            style={{
              flex: 1,
              paddingHorizontal: 18,
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
            }}
          >
            <Text
              style={{
                textAlign: "center",
                color: "red",
                fontWeight: "700",
                fontSize: 18,
              }}
            >
              {errorTitle}
            </Text>
            {!!primaryError && (
              <Text style={{ textAlign: "center", color: "red", fontWeight: "700" }}>
                {primaryError}
              </Text>
            )}
            {!primaryError && !!secondaryError && (
              <Text style={{ textAlign: "center", color: "red", fontWeight: "700" }}>
                {secondaryError}
              </Text>
            )}
            <View style={{ width: "90%", maxWidth: 420, marginTop: 6, gap: 10 }}>
              {!!onRelogin && (
                <BBButton
                  title="Erneut einloggen"
                  onPress={onRelogin}
                  style={{ width: "100%" }}
                />
              )}
              {!!onRetry && <BBButton title="Retry" onPress={onRetry} style={{ width: "100%" }} />}
            </View>
          </View>
        ) : (
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
                      source={
                        item.imageUrl
                          ? { uri: item.imageUrl }
                          : require("../../../assets/logo.png")
                      }
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
        )}

        {!loading && !isErrorMode && (
          <View
            style={{
              paddingHorizontal: 18,
              marginTop: "auto",
              paddingBottom: CHOOSE_FOOTER_PADDING_BOTTOM,
            }}
          >
            <BBButton title="Start Quiz" disabled={disableStart} onPress={onStartQuiz} />
          </View>
        )}
      </View>
    </View>
  );
}
