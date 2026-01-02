import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import { API_BASE_URL } from './src/config';
import { Colors, Radius } from './src/theme';
import { StartScreen } from './src/screens/StartScreen';
import { SinglePlayerMenu } from './src/screens/SinglePlayerMenu';
import { BBButton } from './src/components/BBButton';
import { MOCK_PLAYLISTS, MockPlaylist } from './src/mock/playlists';

type Track = { id: string; name: string; artist: string; spotifyUri: string };

type Screen =
  | { name: 'start' }
  | { name: 'singleMenu' }
  | { name: 'choose' }
  | { name: 'create' }
  | { name: 'quiz'; tracks: Track[]; playlistTitle: string }
  | { name: 'results' };

type Question = {
  correctTrackId: string;
  correctUri: string;
  options: { id: string; label: string }[];
};

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = Math.min(340, SCREEN_W * 0.78);

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'start' });

  // Choose screen data
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [loadingTracks, setLoadingTracks] = useState(false);

  // Create screen state
  const [playlistId, setPlaylistId] = useState('');

  // Quiz state
  const [questionIndex, setQuestionIndex] = useState(0);
  const [question, setQuestion] = useState<Question | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);

  // Carousel state
  const carouselRef = useRef<FlatList<MockPlaylist>>(null);
  const autoScrollTimer = useRef<any>(null);
  const [selectedPlaylistIndex, setSelectedPlaylistIndex] = useState(0);
  const selectedPlaylist = MOCK_PLAYLISTS[selectedPlaylistIndex];
  const [isHoldingCarousel, setIsHoldingCarousel] = useState(false);

  async function loadMockTracks(mockPlaylistId: string) {
    setLoadingTracks(true);
    try {
      const res = await fetch(`${API_BASE_URL}/mock/playlists/${mockPlaylistId}/tracks`);
      const data = await res.json();
      setTracks(data.tracks);
    } catch (e) {
      // fallback: no-op, keep UI responsive
      setTracks(null);
    } finally {
      setLoadingTracks(false);
    }
  }

  function startQuiz(withTracks: Track[], playlistTitle: string) {
    setScore(0);
    setQuestionIndex(0);
    setSelected(null);
    makeQuestion(withTracks);
    setScreen({ name: 'quiz', tracks: withTracks, playlistTitle });
  }

  function makeQuestion(withTracks: Track[]) {
    const pool = shuffle(withTracks);
    const correct = pool[0];
    const distractors = pool.slice(1, 4);

    const options = shuffle([
      { id: correct.id, label: correct.name },
      ...distractors.map((t) => ({ id: t.id, label: t.name })),
    ]);

    setQuestion({
      correctTrackId: correct.id,
      correctUri: correct.spotifyUri,
      options,
    });
    setSelected(null);

    // Später: Spotify Remote -> play(correct.spotifyUri)
  }

  const canStartQuiz = useMemo(() => (tracks ? tracks.length >= 4 : false), [tracks]);

  // Auto-scroll carousel (pause on hold)
  useEffect(() => {
    if (isHoldingCarousel) return;

    if (autoScrollTimer.current) clearInterval(autoScrollTimer.current);

    autoScrollTimer.current = setInterval(() => {
      setSelectedPlaylistIndex((prev) => {
        const next = (prev + 1) % MOCK_PLAYLISTS.length;
        carouselRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 3500);

    return () => {
      if (autoScrollTimer.current) clearInterval(autoScrollTimer.current);
    };
  }, [isHoldingCarousel]);

  // When playlist changes while on choose screen, load matching mock tracks
  useEffect(() => {
    if (screen.name === 'choose') {
      loadMockTracks(selectedPlaylist.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlaylistIndex, screen.name]);

  // ---------- Screens ----------
  if (screen.name === 'start') {
    return <StartScreen onSinglePlayer={() => setScreen({ name: 'singleMenu' })} />;
  }

  if (screen.name === 'singleMenu') {
    return (
      <SinglePlayerMenu
        onBack={() => setScreen({ name: 'start' })}
        onChoose={() => {
          setScreen({ name: 'choose' });
          // initial load happens via useEffect
        }}
        onCreate={() => setScreen({ name: 'create' })}
      />
    );
  }

    if (screen.name === 'choose') {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg, paddingTop: 54 }}>
        {/* Back */}
        <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
          <BBButton
            title="←"
            onPress={() => setScreen({ name: 'singleMenu' })}
            style={{ width: 56, height: 56, paddingVertical: 0, justifyContent: 'center' }}
          />
        </View>

        {/* Logo */}
        <View style={{ alignItems: 'center' }}>
          <Image
            source={require('./assets/logo.png')}
            style={{ width: 200, height: 200, resizeMode: 'contain' }}
          />
        </View>

        {/* Gallery area (full width swipe) */}
        <View style={{ marginTop: 10 }}>
          <FlatList
            ref={carouselRef}
            data={MOCK_PLAYLISTS}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: (SCREEN_W - CARD_W) / 2 }}
            snapToInterval={CARD_W + 18}
            decelerationRate="fast"
            bounces={false}
            // ✅ hold-to-pause without blocking swipes
            onTouchStart={() => setIsHoldingCarousel(true)}
            onTouchEnd={() => setIsHoldingCarousel(false)}
            onMomentumScrollEnd={(e) => {
              const x = e.nativeEvent.contentOffset.x;
              const idx = Math.round(x / (CARD_W + 18));
              setSelectedPlaylistIndex(Math.max(0, Math.min(idx, MOCK_PLAYLISTS.length - 1)));
            }}
            renderItem={({ item, index }) => {
              const isSelected = index === selectedPlaylistIndex;
              return (
                <View style={{ width: CARD_W, marginRight: 18, alignItems: 'center' }}>
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
                      source={item.cover}
                      style={{
                        width: CARD_W - 28,
                        height: CARD_W - 28,
                        borderRadius: Radius.lg,
                      }}
                    />
                  </View>

                  <Text
                    style={{
                      marginTop: 12,
                      fontSize: 22,
                      fontWeight: '700',
                      color: Colors.textOnBg,
                      textAlign: 'center',
                    }}
                  >
                    {item.title}
                  </Text>
                </View>
              );
            }}
          />

          <Text style={{ textAlign: 'center', marginTop: 6, opacity: 0.7, color: Colors.textOnBg }}>
            Swipe anywhere • Hold to pause
          </Text>
        </View>

        {/* ✅ Start button pinned below gallery */}
        <View style={{ paddingHorizontal: 18, marginTop: 18 }}>
          <BBButton
            title="Start Quiz"
            onPress={() => {
              if (tracks && canStartQuiz) startQuiz(tracks, selectedPlaylist.title);
            }}
            disabled={!canStartQuiz || loadingTracks}
          />

          {loadingTracks && (
            <View style={{ alignItems: 'center', marginTop: 14 }}>
              <ActivityIndicator />
              <Text style={{ marginTop: 8, color: Colors.textOnBg }}>Loading…</Text>
            </View>
          )}

          {!loadingTracks && !canStartQuiz && (
            <Text style={{ textAlign: 'center', marginTop: 10, opacity: 0.7, color: Colors.textOnBg }}>
              Not enough tracks for a quiz.
            </Text>
          )}
        </View>
      </View>
    );
  }



  if (screen.name === 'create') {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg, paddingTop: 54 }}>
        <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
          <BBButton
            title="←"
            onPress={() => setScreen({ name: 'singleMenu' })}
            style={{ width: 56, height: 56, paddingVertical: 0, justifyContent: 'center' }}
          />
        </View>

        <View style={{ alignItems: 'center' }}>
          <Image source={require('./assets/logo.png')} style={{ width: 220, height: 220, resizeMode: 'contain' }} />
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: 18 }}>
          <View
            style={{
              backgroundColor: Colors.white,
              borderRadius: 10,
              paddingHorizontal: 14,
              paddingVertical: 10,
            }}
          >
            <TextInput
              placeholder="Please enter your Playlist ID here ..."
              value={playlistId}
              onChangeText={setPlaylistId}
              autoCapitalize="none"
              style={{ fontSize: 16 }}
            />
          </View>

          <BBButton
            title="Create Quiz"
            onPress={() => {
              const pid = playlistId.trim() || selectedPlaylist.id;
              loadMockTracks(pid);
              setScreen({ name: 'choose' });
            }}
            style={{ marginTop: 18 }}
          />
        </View>
      </View>
    );
  }

  if (screen.name === 'quiz') {
    const withTracks = screen.tracks;

    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg, paddingTop: 54, paddingHorizontal: 18 }}>
        <View style={{ marginBottom: 10 }}>
          <BBButton
            title="←"
            onPress={() => setScreen({ name: 'choose' })}
            style={{ width: 56, height: 56, paddingVertical: 0, justifyContent: 'center' }}
          />
        </View>

        <View style={{ alignItems: 'center' }}>
          <Image source={require('./assets/logo.png')} style={{ width: 190, height: 190, resizeMode: 'contain' }} />
        </View>

        <Text
          style={{
            textAlign: 'center',
            marginTop: 2,
            fontSize: 16,
            fontWeight: '700',
            color: Colors.textOnBg,
            opacity: 0.8,
          }}
        >
          {screen.playlistTitle}
        </Text>

        {/* Question Card */}
        <View
          style={{
            backgroundColor: Colors.navy,
            borderRadius: Radius.xl,
            paddingVertical: 38,
            alignItems: 'center',
            marginTop: 12,
          }}
        >
          <Text style={{ color: Colors.textOnNavy, fontSize: 34, fontWeight: '600' }}>Question</Text>
        </View>

        <Text style={{ textAlign: 'center', marginTop: 14, fontSize: 20, fontWeight: '600', color: Colors.textOnBg }}>
          Question {questionIndex + 1}/10
        </Text>

        {/* Answers (2x2) */}
        <View style={{ flexDirection: 'row', gap: 14, marginTop: 18 }}>
          {[0, 1].map((col) => (
            <View key={col} style={{ flex: 1, gap: 14 }}>
              {question?.options.slice(col * 2, col * 2 + 2).map((opt) => {
                const isPicked = selected === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => {
                      if (selected) return;
                      setSelected(opt.id);
                      if (opt.id === question.correctTrackId) setScore((s) => s + 1);

                      setTimeout(() => {
                        const next = questionIndex + 1;
                        if (next >= 10) {
                          setScreen({ name: 'results' });
                          return;
                        }
                        setQuestionIndex(next);
                        makeQuestion(withTracks);
                      }, 450);
                    }}
                    style={{
                      backgroundColor: Colors.navy,
                      borderRadius: Radius.xl,
                      paddingVertical: 28,
                      alignItems: 'center',
                      opacity: selected && !isPicked ? 0.65 : 1,
                      borderWidth: isPicked ? 2 : 0,
                      borderColor: Colors.textOnNavy,
                    }}
                  >
                    <Text style={{ color: Colors.textOnNavy, fontSize: 18, fontWeight: '600', paddingHorizontal: 10, textAlign: 'center' }}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </View>
    );
  }

  // Results
  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg, paddingTop: 54, alignItems: 'center' }}>
      <View style={{ alignSelf: 'flex-start', paddingHorizontal: 16, marginBottom: 10 }}>
        <BBButton
          title="←"
          onPress={() => setScreen({ name: 'choose' })}
          style={{ width: 56, height: 56, paddingVertical: 0, justifyContent: 'center' }}
        />
      </View>

      <Image source={require('./assets/logo.png')} style={{ width: 220, height: 220, resizeMode: 'contain' }} />

      <View style={{ height: 16 }} />

      <Text style={{ marginTop: 10, fontSize: 22, color: Colors.textOnBg, fontWeight: '800' }}>
        Score: {score}/10
      </Text>

      <View style={{ width: '80%', gap: 18, marginTop: 24 }}>
        <BBButton
          title="Restart"
          onPress={() => {
            if (tracks) startQuiz(tracks, selectedPlaylist.title);
            else setScreen({ name: 'choose' });
          }}
        />
        <BBButton title="Return to Menu" onPress={() => setScreen({ name: 'singleMenu' })} />
      </View>
    </View>
  );
}
