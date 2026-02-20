import React from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { AppHeader } from "../components/AppHeader";
import { BBButton } from "../components/BBButton";
import { BUTTON_DROP } from "../constants/app";
import { Colors, Radius } from "../theme";
import type { LobbyState, QuizQuestion } from "../types/app";

type Props = {
  hasAuth: boolean;
  authBusy: boolean;
  authError: string | null;
  mpRole: "none" | "host" | "player";
  mpLobby: LobbyState | null;
  mpQuestion: QuizQuestion | null;
  mpCorrectAnswer: string | null;
  mpJoinCodeInput: string;
  mpJoinError: string | null;
  mpPlayerName: string;
  mpPlayerAvatarDataUrl: string;
  mpHostPlaylistId: string;
  mpYearAnswer: string;
  mpPlayerAnswered: boolean;
  mpPlayerContinued: boolean;
  mpAllAnswered: boolean;
  mpTimeUp: boolean;
  mpPlaybackError: string | null;
  mpReadyCount: number;
  mpAllContinued: boolean;
  joinUrl: string;
  onBack: () => void;
  onSetRole: (role: "none" | "host" | "player") => void;
  onRetryLogin: () => void;
  onHostPlaylistIdChange: (value: string) => void;
  onCreateLobby: () => void;
  onStartRound: () => void;
  onReveal: () => void;
  onJoinCodeChange: (value: string) => void;
  onPlayerNameChange: (value: string) => void;
  onPickAvatarCamera: () => void;
  onPickAvatarLibrary: () => void;
  onJoinLobby: () => void;
  onPlayerAnswer: (answer: string) => void;
  onPlayerContinue: () => void;
  onYearAnswerChange: (value: string) => void;
};

function answerColor(
  lobbyStatus: LobbyState["status"] | undefined,
  playerAnswer: string | null,
  correctAnswer: string | null,
) {
  if (lobbyStatus !== "reveal" || !correctAnswer) {
    return Colors.textOnBg;
  }
  if (!playerAnswer) {
    return "#6b7280";
  }
  return playerAnswer.toLowerCase() === correctAnswer.toLowerCase() ? "green" : "red";
}

export function MultiplayerView({
  hasAuth,
  authBusy,
  authError,
  mpRole,
  mpLobby,
  mpQuestion,
  mpCorrectAnswer,
  mpJoinCodeInput,
  mpJoinError,
  mpPlayerName,
  mpPlayerAvatarDataUrl,
  mpHostPlaylistId,
  mpYearAnswer,
  mpPlayerAnswered,
  mpPlayerContinued,
  mpAllAnswered,
  mpTimeUp,
  mpPlaybackError,
  mpReadyCount,
  mpAllContinued,
  joinUrl,
  onBack,
  onSetRole,
  onRetryLogin,
  onHostPlaylistIdChange,
  onCreateLobby,
  onStartRound,
  onReveal,
  onJoinCodeChange,
  onPlayerNameChange,
  onPickAvatarCamera,
  onPickAvatarLibrary,
  onJoinLobby,
  onPlayerAnswer,
  onPlayerContinue,
  onYearAnswerChange,
}: Props) {
  const { width } = useWindowDimensions();
  const gridColumns = width >= 1400 ? 5 : width >= 1100 ? 4 : width >= 800 ? 3 : 2;
  const showHostWaiting =
    mpRole === "host" &&
    mpLobby?.status === "reveal" &&
    mpLobby.players.length > 0 &&
    !mpAllContinued;
  const canStartRound =
    !!mpLobby &&
    (mpLobby.status === "lobby" || (mpLobby.status === "reveal" && mpAllContinued));
  const startRoundLabel = mpLobby?.status === "reveal" ? "Next Round" : "Start Round";
  const canJoinLobby =
    !!mpJoinCodeInput.trim() &&
    !!mpPlayerName.trim() &&
    mpPlayerName.trim().length <= 20 &&
    !!mpPlayerAvatarDataUrl.trim();

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <AppHeader onBack={onBack} />

      <View style={{ flex: 1, paddingHorizontal: 18, paddingTop: BUTTON_DROP, gap: 14 }}>
        {mpRole === "none" && (
          <>
            <BBButton title="Host Mode" onPress={() => onSetRole("host")} />
            <BBButton title="Join as Player" onPress={() => onSetRole("player")} />
          </>
        )}

        {mpRole === "host" && (
          <View style={{ gap: 10 }}>
            {!hasAuth && !authError && (
              <View style={{ alignItems: "center", marginTop: 8 }}>
                <ActivityIndicator size={56 as any} color={Colors.navy} />
                <Text
                  style={{
                    marginTop: 14,
                    color: Colors.textOnBg,
                    fontSize: 20,
                    fontWeight: "700",
                    textAlign: "center",
                  }}
                >
                  Warte auf Login...
                </Text>
              </View>
            )}

            {!hasAuth && !!authError && (
              <View style={{ gap: 10 }}>
                <Text style={{ textAlign: "center", color: "red", fontWeight: "700" }}>
                  {authError}
                </Text>
                <BBButton title="Spotify Login erneut" onPress={onRetryLogin} />
              </View>
            )}

            {hasAuth && (
              <>
                <View
                  style={{
                    backgroundColor: Colors.white,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                  }}
                >
                  <TextInput
                    value={mpHostPlaylistId}
                    onChangeText={onHostPlaylistIdChange}
                    autoCapitalize="none"
                    placeholder="Playlist ID"
                    style={{ fontSize: 15 }}
                  />
                </View>

                {!mpLobby && (
                  <BBButton
                    title={authBusy ? "Bitte warten..." : "Create Lobby"}
                    onPress={onCreateLobby}
                    disabled={authBusy}
                  />
                )}

                {!!mpLobby && (
                  <>
                    <Text
                      style={{
                        textAlign: "center",
                        color: Colors.textOnBg,
                        fontSize: 20,
                        fontWeight: "800",
                      }}
                    >
                      Join Code: {mpLobby.joinCode}
                    </Text>
                    {joinUrl ? (
                      <View style={{ alignItems: "center" }}>
                        <Image
                          source={{
                            uri: `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(joinUrl)}`,
                          }}
                          style={{ width: 170, height: 170, borderRadius: 12 }}
                        />
                      </View>
                    ) : null}

                    {!!showHostWaiting && (
                      <Text
                        style={{
                          color: Colors.textOnBg,
                          textAlign: "center",
                          fontWeight: "700",
                        }}
                      >
                        Waiting for players... ({mpReadyCount}/{mpLobby.players.length})
                      </Text>
                    )}

                    {!!mpPlaybackError && (
                      <Text style={{ color: "#92400e", textAlign: "center", fontWeight: "700" }}>
                        {mpPlaybackError}
                      </Text>
                    )}

                    <BBButton
                      title={startRoundLabel}
                      onPress={onStartRound}
                      disabled={!canStartRound}
                    />
                    {mpLobby.status === "question" && !!mpQuestion && (
                      <BBButton title="Reveal Answer" onPress={onReveal} />
                    )}
                  </>
                )}
              </>
            )}
          </View>
        )}

        {mpRole === "player" && (
          <View style={{ gap: 10 }}>
            {!mpLobby && (
              <>
                <View
                  style={{
                    backgroundColor: Colors.white,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                  }}
                >
                  <TextInput
                    value={mpJoinCodeInput}
                    onChangeText={onJoinCodeChange}
                    autoCapitalize="characters"
                    placeholder="Join Code"
                    style={{ fontSize: 15 }}
                  />
                </View>
                <View
                  style={{
                    backgroundColor: Colors.white,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                  }}
                >
                  <TextInput
                    value={mpPlayerName}
                    onChangeText={onPlayerNameChange}
                    placeholder="Name"
                    style={{ fontSize: 15 }}
                    maxLength={20}
                  />
                </View>

                <View style={{ flexDirection: "row", gap: 8 }}>
                  <BBButton title="Selfie" onPress={onPickAvatarCamera} style={{ flex: 1 }} />
                  <BBButton title="Galerie" onPress={onPickAvatarLibrary} style={{ flex: 1 }} />
                </View>

                <View
                  style={{
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: Colors.white,
                    borderRadius: 12,
                    paddingVertical: 14,
                  }}
                >
                  {mpPlayerAvatarDataUrl ? (
                    <Image
                      source={{ uri: mpPlayerAvatarDataUrl }}
                      style={{ width: 96, height: 96, borderRadius: 48 }}
                    />
                  ) : (
                    <Text style={{ color: "#6b7280", fontWeight: "700" }}>Kein Foto gewählt</Text>
                  )}
                </View>

                {!!mpJoinError && (
                  <Text style={{ textAlign: "center", color: "red", fontWeight: "700" }}>
                    {mpJoinError}
                  </Text>
                )}

                <BBButton title="Join Lobby" onPress={onJoinLobby} disabled={!canJoinLobby} />
              </>
            )}
            {!!mpLobby && (
              <Text style={{ color: Colors.textOnBg, textAlign: "center", fontWeight: "700" }}>
                Verbunden mit Lobby {mpLobby.joinCode}
              </Text>
            )}
          </View>
        )}

        {!!mpQuestion && (
          <View style={{ gap: 10 }}>
            <Text style={{ color: Colors.textOnBg, textAlign: "center", fontSize: 18, fontWeight: "700" }}>
              {mpQuestion.questionObject.questionText}
            </Text>

            {mpQuestion.options.length > 0 ? (
              mpQuestion.options.map((option) => {
                const isCorrect = mpCorrectAnswer ? option === mpCorrectAnswer : false;
                const bg = mpCorrectAnswer ? (isCorrect ? "green" : "red") : Colors.navy;
                return (
                  <Pressable
                    key={option}
                    onPress={() => onPlayerAnswer(option)}
                    disabled={mpRole !== "player" || mpPlayerAnswered || !!mpCorrectAnswer}
                    style={{
                      backgroundColor: bg,
                      borderRadius: Radius.xl,
                      minHeight: 56,
                      alignItems: "center",
                      justifyContent: "center",
                      paddingHorizontal: 12,
                      opacity:
                        mpRole !== "player" || mpPlayerAnswered || !!mpCorrectAnswer ? 0.8 : 1,
                    }}
                  >
                    <Text
                      style={{
                        color: Colors.textOnNavy,
                        fontSize: 17,
                        fontWeight: "700",
                        textAlign: "center",
                      }}
                    >
                      {option}
                    </Text>
                  </Pressable>
                );
              })
            ) : (
              <>
                {mpCorrectAnswer && (
                  <Text style={{ textAlign: "center", color: "green", fontWeight: "800", fontSize: 20 }}>
                    Richtiges Jahr: {mpCorrectAnswer}
                  </Text>
                )}
                {!mpCorrectAnswer && (
                  <>
                    <View
                      style={{
                        backgroundColor: Colors.white,
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                      }}
                    >
                      <TextInput
                        value={mpYearAnswer}
                        onChangeText={onYearAnswerChange}
                        placeholder="Jahr"
                        keyboardType="number-pad"
                        style={{ fontSize: 15 }}
                        editable={mpRole === "player" && !mpPlayerAnswered}
                      />
                    </View>
                    <BBButton
                      title="Antwort senden"
                      onPress={() => onPlayerAnswer(mpYearAnswer)}
                      disabled={mpRole !== "player" || mpPlayerAnswered || !mpYearAnswer.trim()}
                    />
                  </>
                )}
              </>
            )}

            {mpRole === "host" && mpLobby?.status === "question" && (
              <Text style={{ color: Colors.textOnBg, textAlign: "center", fontWeight: "700" }}>
                {mpAllAnswered
                  ? "Alle Spieler haben geantwortet."
                  : mpTimeUp
                    ? "Zeit abgelaufen (30s). Jetzt revealen."
                    : "Warte auf Antworten..."}
              </Text>
            )}

            {mpRole === "player" && mpLobby?.status === "reveal" && (
              <BBButton
                title={mpPlayerContinued ? "Warte auf andere..." : "Weiter"}
                onPress={onPlayerContinue}
                disabled={mpPlayerContinued}
              />
            )}
          </View>
        )}

        {!!mpLobby && (
          <View style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -6 }}>
              {mpLobby.players.map((player) => (
                <View
                  key={player.id}
                  style={{
                    width: `${100 / gridColumns}%`,
                    paddingHorizontal: 6,
                    marginBottom: 12,
                  }}
                >
                  <View
                    style={{
                      borderRadius: 16,
                      backgroundColor: Colors.white,
                      paddingVertical: 12,
                      paddingHorizontal: 10,
                      alignItems: "center",
                      minHeight: 180,
                    }}
                  >
                    <Image
                      source={{ uri: player.avatarDataUrl }}
                      style={{ width: 88, height: 88, borderRadius: 44 }}
                    />
                    <Text
                      style={{
                        marginTop: 10,
                        color: Colors.textOnBg,
                        fontSize: 18,
                        fontWeight: "800",
                        textAlign: "center",
                      }}
                      numberOfLines={1}
                    >
                      {player.name}
                    </Text>
                    <Text style={{ color: Colors.textOnBg, fontSize: 16, fontWeight: "700" }}>
                      Score: {player.score}
                    </Text>
                    <Text
                      style={{
                        marginTop: 6,
                        color: answerColor(mpLobby.status, player.latestAnswer, mpCorrectAnswer),
                        fontSize: 12,
                        fontWeight: "700",
                        textAlign: "center",
                      }}
                    >
                      {player.answered ? "Answered" : "Not answered"} |{" "}
                      {player.readyForNext ? "Continued" : "Waiting"}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

