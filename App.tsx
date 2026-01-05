import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
  Keyboard,
} from "react-native";

import { Audio } from "expo-av";
import { Asset } from "expo-asset";

import { API_BASE_URL } from "./src/config";
import { Colors, Radius } from "./src/theme";
import { StartScreen } from "./src/screens/StartScreen";
import { SinglePlayerMenu } from "./src/screens/SinglePlayerMenu";
import { BBButton } from "./src/components/BBButton";
import { MOCK_PLAYLISTS } from "./src/mock/playlists";
import type { MockPlaylist } from "./src/mock/playlists";

import { getSongAssetById } from "./src/mock/songAssets";

// ---------------- Types ----------------

type Track = {
  id: string;
  name: string;
  artist: string;
  spotifyUri: string;

  year: number;
  album: string;
  solo: boolean;
};

type Screen =
  | { name: "start" }
  | { name: "singleMenu" }
  | { name: "choose" }
  | { name: "create" }
  | { name: "quiz"; tracks: Track[]; playlistTitle: string }
  | { name: "results" };

type QuestionType =
  | "YEAR_TOLERANCE_INPUT"
  | "ARTIST_MC4"
  | "ALBUM_MC4"
  | "SOLO_BAND_2"
  | "YEAR_MC4_EXACT"
  | "TITLE_MC4";

type QuizQuestion = {
  type: QuestionType;
  track: Track;
  options?: { id: string; label: string }[];
  correctOptionId?: string;
};

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickDistinct<T>(arr: T[], count: number) {
  return shuffle(arr).slice(0, Math.min(count, arr.length));
}

const { width: SCREEN_W } = Dimensions.get("window");
const CARD_W = Math.min(340, SCREEN_W * 0.78);

// ---------------- Layout constants ----------------
const HEADER_PAD_TOP = 54;
const BACK_BTN_SIZE = 56;
const LOGO_SIZE = 200;
const QUIZ_LOGO_SIZE = BACK_BTN_SIZE;

const CHOOSE_FOOTER_PADDING_BOTTOM = 24 + 56;

// ---------------- Quiz constants ----------------
const QUESTIONS_PER_QUIZ = 5;
const TIMER_SECONDS = 30;
// ---------------- App ----------------

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: "start" });

  // Choose screen data
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [tracksError, setTracksError] = useState<string | null>(null);

  // Create screen state
  const [playlistId, setPlaylistId] = useState("");

  // Carousel state
  const carouselRef = useRef<FlatList<MockPlaylist>>(null);
  const [selectedPlaylistIndex, setSelectedPlaylistIndex] = useState(0);
  const selectedPlaylist = MOCK_PLAYLISTS[selectedPlaylistIndex];

  // Prefetch playlist covers once on app start (improves Choose screen cover loading)
  useEffect(() => {
    (async () => {
      try {
        await Promise.all(
          MOCK_PLAYLISTS.map((p) => Asset.fromModule(p.cover).downloadAsync())
        );
      } catch {
        // Ignore prefetch errors
      }
    })();
  }, []);

  // ---------------- Quiz runtime state ----------------
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const currentQ = quizQuestions[qIndex] ?? null;
  const currentQRef = useRef<QuizQuestion | null>(null);

  const [score, setScore] = useState(0);

  // answer state
  const [revealed, setRevealed] = useState(false);
  // refs to avoid stale closures (e.g. timer timeout)
  const revealedRef = useRef(false);
  const [pickedOptionId, setPickedOptionId] = useState<string | null>(null);
  const [yearInput, setYearInput] = useState<string>("");
  const [yearWasCorrect, setYearWasCorrect] = useState<boolean | null>(null);

  // keep refs in sync to prevent stale closure issues (timeouts, etc.)
  useEffect(() => {
    revealedRef.current = revealed;
  }, [revealed]);

  useEffect(() => {
    currentQRef.current = currentQ;
  }, [currentQ]);

  // timer state
  const timerAnim = useRef(new Animated.Value(1)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [timerBarW, setTimerBarW] = useState(0);

  // audio state
  const soundRef = useRef<Audio.Sound | null>(null);

  // ------------- Backend fetch -------------
  async function loadMockTracks(mockPlaylistId: string): Promise<Track[] | null> {
    setLoadingTracks(true);
    setTracksError(null);

    try {
      const url = `${API_BASE_URL}/mock/playlists/${mockPlaylistId}/tracks`;
      console.log("📡 Fetching tracks:", url);

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      console.log("✅ Backend response:", data);

      const t: Track[] = data.tracks ?? [];
      if (t.length === 0) {
        throw new Error("No tracks in response");
      }

      setTracks(t);
      return t;
    } catch (e: any) {
      console.log("❌ loadMockTracks error:", e?.message ?? e);
      setTracks(null);
      setTracksError("Songs konnten nicht geladen werden.");
      return null;
    } finally {
      setLoadingTracks(false);
    }
  }

  // ------------- Audio helpers -------------
  async function stopAndUnload() {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      }
    } catch {}
    soundRef.current = null;
  }

  async function playSongById(trackId: string) {
    await stopAndUnload();

    const asset = getSongAssetById(trackId);
    if (!asset) return;

    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      const { sound } = await Audio.Sound.createAsync(asset, { shouldPlay: true });
      soundRef.current = sound;
    } catch {
      soundRef.current = null;
    }
  }

  // ------------- Quiz building -------------
  function buildQuizQuestions(allTracks: Track[]): QuizQuestion[] {
    const songs = pickDistinct(allTracks, QUESTIONS_PER_QUIZ);

    const pool: QuestionType[] = [
      "YEAR_TOLERANCE_INPUT",
      "ARTIST_MC4",
      "ALBUM_MC4",
      "SOLO_BAND_2",
      "YEAR_MC4_EXACT",
      "TITLE_MC4",
    ];

    const chosenTypes = shuffle(pool).slice(0, QUESTIONS_PER_QUIZ);

    return chosenTypes.map((type, idx) => {
      const track = songs[idx] ?? songs[0];

      if (type === "SOLO_BAND_2") {
        const correct = track.solo ? "Solo" : "Band";
        const options = shuffle([
          { id: "solo", label: "Solo" },
          { id: "band", label: "Band" },
        ]);
        return {
          type,
          track,
          options,
          correctOptionId: correct === "Solo" ? "solo" : "band",
        };
      }

      if (type === "YEAR_TOLERANCE_INPUT") {
        return { type, track };
      }

      if (type === "YEAR_MC4_EXACT") {
        const others = allTracks.filter((t) => t.id !== track.id);
        const wrongYears = shuffle(others.map((t) => t.year))
          .filter((y, i, arr) => y !== track.year && arr.indexOf(y) === i)
          .slice(0, 3);

        const years = shuffle([track.year, ...wrongYears]).slice(0, 4);
        const options = years.map((y) => ({ id: String(y), label: String(y) }));
        return {
          type,
          track,
          options,
          correctOptionId: String(track.year),
        };
      }

      if (type === "ARTIST_MC4") {
        const others = allTracks.filter((t) => t.id !== track.id);
        const wrong = shuffle(others.map((t) => t.artist))
          .filter((a, i, arr) => a !== track.artist && arr.indexOf(a) === i)
          .slice(0, 3);

        const labels = shuffle([track.artist, ...wrong]).slice(0, 4);
        const options = labels.map((label) => ({ id: label, label }));
        return {
          type,
          track,
          options,
          correctOptionId: track.artist,
        };
      }

      if (type === "ALBUM_MC4") {
        const others = allTracks.filter((t) => t.id !== track.id);
        const wrong = shuffle(others.map((t) => t.album))
          .filter((a, i, arr) => a !== track.album && arr.indexOf(a) === i)
          .slice(0, 3);

        const labels = shuffle([track.album, ...wrong]).slice(0, 4);
        const options = labels.map((label) => ({ id: label, label }));
        return {
          type,
          track,
          options,
          correctOptionId: track.album,
        };
      }

      const others = allTracks.filter((t) => t.id !== track.id);
      const wrong = shuffle(others.map((t) => t.name))
        .filter((n, i, arr) => n !== track.name && arr.indexOf(n) === i)
        .slice(0, 3);

      const labels = shuffle([track.name, ...wrong]).slice(0, 4);
      const options = labels.map((label) => ({ id: label, label }));
      return {
        type,
        track,
        options,
        correctOptionId: track.name,
      };
    });
  }

  function resetPerQuestionUI() {
    setRevealed(false);
    setPickedOptionId(null);
    setYearInput("");
    setYearWasCorrect(null);
  }

  function startTimer() {
    stopTimer();

    // reset progress to full and animate smoothly to 0 without JS re-renders
    timerAnim.setValue(1);

    Animated.timing(timerAnim, {
      toValue: 0,
      duration: TIMER_SECONDS * 1000,
      useNativeDriver: true,
    }).start();

    timeoutRef.current = setTimeout(() => {
      onTimeout();
    }, TIMER_SECONDS * 1000);
  }

  function stopTimer() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    timerAnim.stopAnimation();
  }

  function onTimeout() {
    if (revealedRef.current) return;

    stopTimer();
    Keyboard.dismiss();
    setRevealed(true);

    const q = currentQRef.current;
    if (q?.type === "YEAR_TOLERANCE_INPUT") {
      setYearWasCorrect(false);
      return;
    }

    setPickedOptionId(null);
  }

  function beginQuiz(allTracks: Track[], playlistTitle: string) {
    console.log("🎮 beginQuiz() with tracks:", allTracks.length, "playlist:", playlistTitle);

    const qs = buildQuizQuestions(allTracks);

    setQuizQuestions(qs);
    setQIndex(0);
    setScore(0);
    resetPerQuestionUI();

    setScreen({ name: "quiz", tracks: allTracks, playlistTitle });
  }

  // Start music & timer when question changes and we are in quiz
  useEffect(() => {
    if (screen.name !== "quiz") return;
    if (!currentQ) return;

    resetPerQuestionUI();
    playSongById(currentQ.track.id);
    startTimer();

    return () => {
      stopTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen.name, qIndex]);

  // stop audio when leaving quiz
  useEffect(() => {
    if (screen.name !== "quiz") {
      stopTimer();
      stopAndUnload();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen.name]);

  // Load tracks when entering choose & when playlist changes
  useEffect(() => {
    if (screen.name === "choose") {
      loadMockTracks(selectedPlaylist.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlaylistIndex, screen.name]);

  function QuestionTitle(q: QuizQuestion) {
    switch (q.type) {
      case "YEAR_TOLERANCE_INPUT":
        return "In welchem Jahr erschien der Song? (±4)";
      case "ARTIST_MC4":
        return "Wer ist der Interpret?";
      case "ALBUM_MC4":
        return "Auf welchem Album ist der Song?";
      case "SOLO_BAND_2":
        return "Solo oder Band?";
      case "YEAR_MC4_EXACT":
        return "In welchem Jahr erschien der Song?";
      case "TITLE_MC4":
        return "Wie heißt der Song?";
    }
  }

  function isOptionCorrect(optId: string) {
    return currentQ?.correctOptionId === optId;
  }

  function handlePickOption(optId: string) {
    if (!currentQ) return;
    if (revealed) return;

    Keyboard.dismiss();

    stopTimer();
    setRevealed(true);
    setPickedOptionId(optId);

    const correct = isOptionCorrect(optId);
    if (correct) setScore((s) => s + 1);
  }

  function handleSubmitYearTolerance() {
    if (!currentQ) return;
    if (revealed) return;

    Keyboard.dismiss();

    const guess = parseInt(yearInput.trim(), 10);
    stopTimer();
    setRevealed(true);

    if (Number.isNaN(guess)) {
      setYearWasCorrect(false);
      return;
    }

    const ok = Math.abs(guess - currentQ.track.year) <= 4;
    setYearWasCorrect(ok);
    if (ok) setScore((s) => s + 1);
  }

  async function goNextQuestionOrFinish() {
    if (!currentQ) return;

    await stopAndUnload();

    const last = qIndex >= QUESTIONS_PER_QUIZ - 1;
    if (last) {
      setScreen({ name: "results" });
      return;
    }
    setQIndex((i) => i + 1);
  }

  // ---------------- Screens ----------------

  if (screen.name === "start") {
    return <StartScreen onSinglePlayer={() => setScreen({ name: "singleMenu" })} />;
  }

  if (screen.name === "singleMenu") {
    return (
      <SinglePlayerMenu
        onBack={() => setScreen({ name: "start" })}
        onChoose={() => setScreen({ name: "choose" })}
        onCreate={() => setScreen({ name: "create" })}
      />
    );
  }

  if (screen.name === "choose") {
    // ✅ Fix: Button darf nicht “tot” sein, wenn loading läuft, aber tracks schon geladen sind
    const hasTracks = !!tracks && tracks.length > 0;
    const disableStart = loadingTracks && !hasTracks;

    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg }}>
        {/* HEADER */}
        <View style={{ paddingTop: HEADER_PAD_TOP, paddingHorizontal: 16 }}>
          <View style={{ height: BACK_BTN_SIZE, justifyContent: "flex-start", alignItems: "flex-start" }}>
            <BBButton
              title="←"
              onPress={() => setScreen({ name: "singleMenu" })}
              style={{
                width: BACK_BTN_SIZE,
                height: BACK_BTN_SIZE,
                paddingHorizontal: 0,
                justifyContent: "center",
              }}
            />
          </View>

          <View style={{ alignItems: "center" }}>
            <Image
              source={require("./assets/logo.png")}
              style={{ width: LOGO_SIZE, height: LOGO_SIZE, resizeMode: "contain" }}
            />
          </View>
        </View>

        {/* CONTENT */}
        <View style={{ flex: 1, paddingTop: 8 }}>
          {/* Gallery */}
          <View>
            <FlatList
              ref={carouselRef}
              data={MOCK_PLAYLISTS}
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
                setSelectedPlaylistIndex(Math.max(0, Math.min(idx, MOCK_PLAYLISTS.length - 1)));
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

          {/* Footer pinned */}
          <View
            style={{
              paddingHorizontal: 18,
              marginTop: "auto",
              paddingBottom: CHOOSE_FOOTER_PADDING_BOTTOM,
            }}
          >
            <BBButton
              title="Start Quiz"
              disabled={disableStart}
              onPress={async () => {
                console.log("🟦 Start Quiz pressed. loadingTracks:", loadingTracks, "tracks:", tracks?.length ?? 0);

                // Wenn tracks schon da -> direkt starten
                if (tracks && tracks.length > 0) {
                  beginQuiz(tracks, selectedPlaylist.title);
                  return;
                }

                // sonst nachladen
                const loaded = await loadMockTracks(selectedPlaylist.id);
                console.log("🟩 Loaded:", loaded?.length ?? 0);

                if (loaded && loaded.length > 0) {
                  beginQuiz(loaded, selectedPlaylist.title);
                }
              }}
            />

            {loadingTracks && (
              <View style={{ alignItems: "center", marginTop: 14 }}>
                <ActivityIndicator />
                <Text style={{ marginTop: 8, color: Colors.textOnBg }}>Loading…</Text>
              </View>
            )}

            {/* ✅ Fix: Error sichtbar machen */}
            {tracksError && (
              <Text
                style={{
                  marginTop: 12,
                  textAlign: "center",
                  color: "red",
                  fontSize: 16,
                  fontWeight: "700",
                }}
              >
                {tracksError}
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  }

  // Create screen bleibt (auch wenn im Menü disabled)
  if (screen.name === "create") {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg }}>
        <View style={{ paddingTop: HEADER_PAD_TOP, paddingHorizontal: 16 }}>
          <View style={{ height: BACK_BTN_SIZE, justifyContent: "flex-start", alignItems: "flex-start" }}>
            <BBButton
              title="←"
              onPress={() => setScreen({ name: "singleMenu" })}
              style={{
                width: BACK_BTN_SIZE,
                height: BACK_BTN_SIZE,
                paddingHorizontal: 0,
                justifyContent: "center",
              }}
            />
          </View>

          <View style={{ alignItems: "center" }}>
            <Image
              source={require("./assets/logo.png")}
              style={{ width: LOGO_SIZE, height: LOGO_SIZE, resizeMode: "contain" }}
            />
          </View>
        </View>

        <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 18 }}>
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

          <View style={{ marginTop: 18 }}>
            <BBButton
              title="Create Quiz"
              onPress={async () => {
                const pid = playlistId.trim() || selectedPlaylist.id;
                const loaded = await loadMockTracks(pid);
                if (loaded && loaded.length > 0) beginQuiz(loaded, selectedPlaylist.title);
                else setScreen({ name: "choose" });
              }}
            />
          </View>
        </View>
      </View>
    );
  }

  // ---------------- QUIZ SCREEN ----------------
  if (screen.name === "quiz") {
    if (!currentQ) {
      return (
        <View style={{ flex: 1, backgroundColor: Colors.bg, paddingTop: HEADER_PAD_TOP, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator />
        </View>
      );
    }

    const qTitle = QuestionTitle(currentQ);
    const isLast = qIndex >= QUESTIONS_PER_QUIZ - 1;

    const opts = currentQ.options ?? [];
    const correctId = currentQ.correctOptionId ?? null;
    const showSongInfo = revealed;

    const renderAnswerButtons = () => {
      if (currentQ.type === "YEAR_TOLERANCE_INPUT") {
        return (
          <View style={{ marginTop: 18 }}>
            {!revealed && (
              <>
                <View
                  style={{
                    backgroundColor: Colors.white,
                    borderRadius: 10,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                  }}
                >
                  <TextInput
                    placeholder="Jahr eingeben…"
                    value={yearInput}
                    onChangeText={(t) => setYearInput(t.replace(/[^\d]/g, ""))}
                    keyboardType="number-pad"
                    style={{ fontSize: 18 }}
                  />
                </View>

                <View style={{ marginTop: 14 }}>
                  <BBButton title="Antwort absenden" onPress={handleSubmitYearTolerance} />
                </View>
              </>
            )}

            {revealed && (
              <View style={{ marginTop: 6 }}>
                <Text style={{ textAlign: "center", fontSize: 20, fontWeight: "800", color: yearWasCorrect ? "green" : "red" }}>
                  Richtiges Jahr: {currentQ.track.year}
                </Text>
              </View>
            )}
          </View>
        );
      }

      const columns = opts.length === 2 ? 2 : 2;
      const rows = opts.length === 2 ? 1 : 2;
      const cellGap = 14;

      return (
        <View style={{ marginTop: 18, gap: cellGap }}>
          {Array.from({ length: rows }).map((_, r) => (
            <View key={r} style={{ flexDirection: "row", gap: cellGap }}>
              {Array.from({ length: columns }).map((__, c) => {
                const idx = r * columns + c;
                const opt = opts[idx];
                if (!opt) return <View key={c} style={{ flex: 1 }} />;

                const pressed = pickedOptionId === opt.id;
                const shouldShowCorrect = revealed;
                const isCorrect = opt.id === correctId;

                let bg = Colors.navy;

                if (shouldShowCorrect) {
                  if (isCorrect) bg = "green";
                  if (pressed && !isCorrect) bg = "red";
                }

                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => handlePickOption(opt.id)}
                    disabled={revealed}
                    style={{
                      flex: 1,
                      backgroundColor: bg,
                      borderRadius: Radius.xl,
                      paddingVertical: 22,
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: revealed && !isCorrect && !pressed ? 0.7 : 1,
                      minHeight: 84,
                    }}
                  >
                    <Text style={{ color: Colors.textOnNavy, fontSize: 18, fontWeight: "700", textAlign: "center", paddingHorizontal: 10 }}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      );
    };

    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg }}>
        {/* HEADER: back left, small logo right */}
        <View style={{ paddingTop: HEADER_PAD_TOP, paddingHorizontal: 16 }}>
          <View style={{ height: BACK_BTN_SIZE, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <BBButton
              title="←"
              onPress={async () => {
                await stopAndUnload();
                setScreen({ name: "choose" });
              }}
              style={{
                width: BACK_BTN_SIZE,
                height: BACK_BTN_SIZE,
                paddingHorizontal: 0,
                justifyContent: "center",
              }}
            />

            <Image
              source={require("./assets/logo.png")}
              style={{ width: QUIZ_LOGO_SIZE, height: QUIZ_LOGO_SIZE, resizeMode: "contain" }}
            />
          </View>
        </View>

        <Text style={{ fontSize: 18, fontWeight: "800", color: Colors.textOnBg, textAlign: "center", marginTop: 10 }}>
          Question {qIndex + 1}/{QUESTIONS_PER_QUIZ}
        </Text>

        {/* TIMER BAR */}
        <View style={{ paddingHorizontal: 18, marginTop: 10 }}>
          <View
            onLayout={(e) => setTimerBarW(e.nativeEvent.layout.width)}
            style={{ height: 10, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.15)", overflow: "hidden" }}
          >
            <Animated.View
              style={{
                width: "100%",
                height: "100%",
                backgroundColor: Colors.navy,
                transform: [
                  {
                    translateX: timerAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-(timerBarW / 2), 0],
                    }),
                  },
                  { scaleX: timerAnim },
                ],
              }}
            />
          </View>
        </View>

        {/* CONTENT */}
        <View style={{ flex: 1, paddingHorizontal: 18, paddingTop: 14 }}>
          <View
            style={{
              backgroundColor: Colors.navy,
              borderRadius: Radius.xl,
              paddingVertical: 28,
              paddingHorizontal: 18,
              alignItems: "center",
              marginTop: 6,
            }}
          >
            <Text style={{ color: Colors.textOnNavy, fontSize: 24, fontWeight: "800", textAlign: "center" }}>{qTitle}</Text>
          </View>

          {renderAnswerButtons()}

          {showSongInfo && (
            <View style={{ marginTop: "auto", paddingBottom: 24 }}>
              <View
                style={{
                  backgroundColor: Colors.navy,
                  borderRadius: Radius.xl,
                  paddingVertical: 24,
                  paddingHorizontal: 18,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: Colors.textOnNavy, fontSize: 28, fontWeight: "800" }}>Song Info</Text>

                <View style={{ height: 12 }} />

                <Text style={{ color: Colors.textOnNavy, fontSize: 18, fontWeight: "700", textAlign: "center" }}>
                  {currentQ.track.name}
                </Text>
                <Text style={{ color: Colors.textOnNavy, fontSize: 16, opacity: 0.9, textAlign: "center", marginTop: 4 }}>
                  {currentQ.track.artist}
                </Text>
                <Text style={{ color: Colors.textOnNavy, fontSize: 16, opacity: 0.9, textAlign: "center", marginTop: 4 }}>
                  {currentQ.track.album} • {currentQ.track.year} • {currentQ.track.solo ? "Solo" : "Band"}
                </Text>
              </View>

              <View style={{ marginTop: 14 }}>
                <BBButton
                  title={isLast ? "Quiz beenden" : "Nächste Frage"}
                  onPress={goNextQuestionOrFinish}
                />
              </View>
            </View>
          )}
        </View>
      </View>
    );
  }

  // ---------------- RESULTS ----------------
  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <View style={{ paddingTop: HEADER_PAD_TOP, paddingHorizontal: 16 }}>
        <View style={{ height: BACK_BTN_SIZE, justifyContent: "flex-start", alignItems: "flex-start" }}>
          <BBButton
            title="←"
            onPress={() => setScreen({ name: "choose" })}
            style={{ width: BACK_BTN_SIZE, height: BACK_BTN_SIZE, paddingHorizontal: 0, justifyContent: "center" }}
          />
        </View>

        <View style={{ alignItems: "center" }}>
          <Image
            source={require("./assets/logo.png")}
            style={{ width: LOGO_SIZE, height: LOGO_SIZE, resizeMode: "contain" }}
          />
        </View>
      </View>

      <View style={{ flex: 1, alignItems: "center", paddingTop: 18 }}>
        <Text style={{ marginTop: 10, fontSize: 22, color: Colors.textOnBg, fontWeight: "800" }}>
          Score: {score}/{QUESTIONS_PER_QUIZ}
        </Text>

        <View style={{ width: "80%", gap: 18, marginTop: 24 }}>
          <BBButton
            title="Restart"
            onPress={() => {
              if (tracks && tracks.length > 0) {
                beginQuiz(tracks, selectedPlaylist.title);
              } else {
                setScreen({ name: "choose" });
              }
            }}
          />
          <BBButton title="Return to Menu" onPress={() => setScreen({ name: "singleMenu" })} />
        </View>
      </View>
    </View>
  );
}
