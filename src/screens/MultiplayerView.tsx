import React from "react";
import { ActivityIndicator, Image, Pressable, Text, TextInput, View } from "react-native";
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
  mpPlayerName: string;
  mpPlayerIcon: string;
  mpHostPlaylistId: string;
  mpYearAnswer: string;
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
  onPlayerIconChange: (value: string) => void;
  onJoinLobby: () => void;
  onPlayerAnswer: (answer: string) => void;
  onYearAnswerChange: (value: string) => void;
};

export function MultiplayerView({
  hasAuth,
  authBusy,
  authError,
  mpRole,
  mpLobby,
  mpQuestion,
  mpCorrectAnswer,
  mpJoinCodeInput,
  mpPlayerName,
  mpPlayerIcon,
  mpHostPlaylistId,
  mpYearAnswer,
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
  onPlayerIconChange,
  onJoinLobby,
  onPlayerAnswer,
  onYearAnswerChange,
}: Props) {
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
                {!mpLobby && <BBButton title="Create Lobby" onPress={onCreateLobby} />}
                {mpLobby && (
                  <>
                    <Text style={{ textAlign: "center", color: Colors.textOnBg, fontSize: 20, fontWeight: "800" }}>
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

                    <BBButton title="Start Round" onPress={onStartRound} />
                    {!!mpQuestion && <BBButton title="Reveal Answer" onPress={onReveal} />}
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
                  <TextInput value={mpPlayerName} onChangeText={onPlayerNameChange} placeholder="Name" style={{ fontSize: 15 }} />
                </View>
                <View
                  style={{
                    backgroundColor: Colors.white,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                  }}
                >
                  <TextInput value={mpPlayerIcon} onChangeText={onPlayerIconChange} placeholder="Icon" style={{ fontSize: 15 }} />
                </View>
                <BBButton title="Join Lobby" onPress={onJoinLobby} />
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
                    style={{
                      backgroundColor: bg,
                      borderRadius: Radius.xl,
                      minHeight: 56,
                      alignItems: "center",
                      justifyContent: "center",
                      paddingHorizontal: 12,
                    }}
                  >
                    <Text style={{ color: Colors.textOnNavy, fontSize: 17, fontWeight: "700", textAlign: "center" }}>{option}</Text>
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
                      />
                    </View>
                    <BBButton title="Antwort senden" onPress={() => onPlayerAnswer(mpYearAnswer)} />
                  </>
                )}
              </>
            )}
          </View>
        )}

        {!!mpLobby && (
          <View>
            {mpLobby.players.map((player) => (
              <Text
                key={player.id}
                style={{
                  color: mpCorrectAnswer
                    ? (player.latestAnswer ?? "").toLowerCase() === mpCorrectAnswer.toLowerCase()
                      ? "green"
                      : "red"
                    : Colors.textOnBg,
                  fontSize: 14,
                }}
              >
                {player.icon} {player.name}: {player.score}
              </Text>
            ))}
          </View>
        )}

      </View>
    </View>
  );
}
