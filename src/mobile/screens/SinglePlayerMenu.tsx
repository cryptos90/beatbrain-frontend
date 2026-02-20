import Slider from "@react-native-community/slider";
import React from "react";
import { ActivityIndicator, Image, Text, View } from "react-native";
import { BBButton } from "../../components/BBButton";
import { Colors } from "../../theme";

type Props = {
  onBack: () => void;
  onChoose: () => void;
  onCreate: () => void;
  onRetryLogin: () => void;
  waitingForLogin?: boolean;
  loginError?: string | null;
  questionCount: number;
  onQuestionCountChange: (value: number) => void;
};

const HEADER_PAD_TOP = 54;
const BACK_BTN_SIZE = 56;
const LOGO_SIZE = 200;
const BUTTON_DROP = 56 * 2;

export function SinglePlayerMenu({
  onBack,
  onChoose,
  onCreate,
  onRetryLogin,
  waitingForLogin,
  loginError,
  questionCount,
  onQuestionCountChange,
}: Props) {
  const showRetryLogin = !waitingForLogin && Boolean(loginError);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <View style={{ paddingTop: HEADER_PAD_TOP, paddingHorizontal: 16 }}>
        <View style={{ height: BACK_BTN_SIZE, justifyContent: "flex-start", alignItems: "flex-start" }}>
          <BBButton
            title="<-"
            onPress={onBack}
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
            source={require("../../../assets/logo.png")}
            resizeMode="contain"
            style={{ width: LOGO_SIZE, height: LOGO_SIZE }}
          />
        </View>
      </View>

      <View style={{ flex: 1, paddingHorizontal: 18, paddingTop: BUTTON_DROP, gap: 14 }}>
        {waitingForLogin ? (
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
        ) : showRetryLogin ? (
          <>
            <Text
              style={{
                marginTop: 12,
                color: "red",
                fontSize: 16,
                fontWeight: "700",
                textAlign: "center",
              }}
            >
              Login fehlgeschlagen
            </Text>
            <BBButton title="Login erneut versuchen" onPress={onRetryLogin} />
          </>
        ) : (
          <>
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
                  fontWeight: "700",
                  fontSize: 16,
                  textAlign: "center",
                }}
              >
                Fragen: {questionCount}
              </Text>
              <Slider
                minimumValue={10}
                maximumValue={100}
                step={1}
                value={questionCount}
                minimumTrackTintColor={Colors.navy}
                maximumTrackTintColor="rgba(15, 23, 42, 0.2)"
                thumbTintColor={Colors.navy}
                onValueChange={(value) => onQuestionCountChange(Math.round(value))}
              />
            </View>

            <BBButton title="Choose Quiz" onPress={onChoose} />
            <BBButton title="Create Quiz" onPress={onCreate} />
          </>
        )}
      </View>
    </View>
  );
}
