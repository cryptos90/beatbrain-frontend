import React, { useState } from "react";
import { View } from "react-native";
import PlaylistCarousel from "../components/PlaylistCarousel";
import { BBButton } from "../components/BBButton";
import { MOCK_PLAYLISTS } from "../mock/playlists";

type Props = {
  onStartQuiz: (playlistId: string) => void;
};

export default function ChooseQuizScreen({ onStartQuiz }: Props) {
  const [activePlaylistId, setActivePlaylistId] = useState(
    MOCK_PLAYLISTS[0].id
  );

  return (
    <View style={{ flex: 1, paddingTop: 24 }}>
      <PlaylistCarousel
        playlists={MOCK_PLAYLISTS}
        onPlaylistChange={(p) => setActivePlaylistId(p.id)}
      />

      <View style={{ paddingHorizontal: 24, marginTop: 20 }}>
        <BBButton
          title="Start Quiz"
          onPress={() => onStartQuiz(activePlaylistId)}
        />
      </View>
    </View>
  );
}
