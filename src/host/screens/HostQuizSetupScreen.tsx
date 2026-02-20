import Slider from "@react-native-community/slider";
import React from "react";
import { FlatList, Image, Text, TextInput, TouchableOpacity, View } from "react-native";
import { AppHeader } from "../../components/AppHeader";
import { BBButton } from "../../components/BBButton";
import { CARD_W, SCREEN_W } from "../../constants/app";
import { Colors, Radius } from "../../theme";
import type { PlaylistCard } from "../../shared/types/app";

type Props = {
  playlists: PlaylistCard[];
  selectedPlaylistIndex: number;
  questionCount: number;
  playlistIdInput: string;
  setupError: string | null;
  creatingSession: boolean;
  onBack: () => void;
  onQuestionCountChange: (value: number) => void;
  onSelectPlaylistIndex: (index: number) => void;
  onPlaylistIdInputChange: (value: string) => void;
  onCreateSession: () => void;
};

function normalizeQuestionCount(value: number) {
  const clamped = Math.max(10, Math.min(100, value));
  return Math.max(10, Math.min(100, Math.round(clamped / 10) * 10));
}

export function HostQuizSetupScreen({
  playlists,
  selectedPlaylistIndex,
  questionCount,
  playlistIdInput,
  setupError,
  creatingSession,
  onBack,
  onQuestionCountChange,
  onSelectPlaylistIndex,
  onPlaylistIdInputChange,
  onCreateSession,
}: Props) {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <AppHeader onBack={onBack} />

      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 6, gap: 14 }}>
        <View
          style={{
            backgroundColor: Colors.white,
            borderRadius: 14,
            paddingHorizontal: 16,
            paddingVertical: 14,
          }}
        >
          <Text
            style={{
              color: Colors.textOnBg,
              fontWeight: "800",
              fontSize: 18,
              textAlign: "center",
            }}
          >
            Fragen: {questionCount}
          </Text>
          <Slider
            minimumValue={10}
            maximumValue={100}
            step={10}
            value={questionCount}
            minimumTrackTintColor={Colors.navy}
            maximumTrackTintColor="rgba(15,23,42,0.2)"
            thumbTintColor={Colors.navy}
            onValueChange={(value) => onQuestionCountChange(normalizeQuestionCount(value))}
            onSlidingComplete={(value) =>
              onQuestionCountChange(normalizeQuestionCount(value))
            }
          />
        </View>

        <Text style={{ color: Colors.textOnBg, textAlign: "center", fontWeight: "800" }}>
          Choose Quiz (curated)
        </Text>

        <FlatList
          data={playlists}
          horizontal
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: (SCREEN_W - CARD_W) / 2 }}
          renderItem={({ item, index }) => {
            const selected = selectedPlaylistIndex === index;
            return (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => onSelectPlaylistIndex(index)}
                style={{ width: CARD_W, marginRight: 16, alignItems: "center" }}
              >
                <View
                  style={{
                    backgroundColor: Colors.navy,
                    borderRadius: Radius.xl,
                    padding: 12,
                    borderWidth: selected ? 2 : 0,
                    borderColor: Colors.textOnNavy,
                  }}
                >
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={{ width: CARD_W - 24, height: CARD_W - 24, borderRadius: Radius.lg }}
                  />
                </View>
                <Text
                  numberOfLines={2}
                  style={{
                    marginTop: 8,
                    color: Colors.textOnBg,
                    fontSize: 20,
                    fontWeight: "700",
                    textAlign: "center",
                  }}
                >
                  {item.title}
                </Text>
              </TouchableOpacity>
            );
          }}
        />

        <View
          style={{
            backgroundColor: Colors.white,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}
        >
          <TextInput
            value={playlistIdInput}
            onChangeText={onPlaylistIdInputChange}
            autoCapitalize="none"
            placeholder="Playlist ID (optional, ueberschreibt curated)"
            style={{ fontSize: 15 }}
          />
        </View>

        {!!setupError && (
          <Text style={{ color: "red", textAlign: "center", fontWeight: "700" }}>
            {setupError}
          </Text>
        )}

        <BBButton
          title={creatingSession ? "Bitte warten..." : "Quiz Session erstellen"}
          onPress={onCreateSession}
          disabled={creatingSession}
        />
      </View>
    </View>
  );
}
