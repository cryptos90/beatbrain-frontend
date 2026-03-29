import React from "react";
import Slider from "@react-native-community/slider";
import { Text, View, useWindowDimensions } from "react-native";
import { BBButton } from "../../components/BBButton";
import { Colors, Radius } from "../../theme";
import { HostLayout } from "../components/HostLayout";

type Props = {
  questionCount: number;
  onQuestionCountChange: (value: number) => void;
  onChooseMode: () => void;
  onCreateMode: () => void;
  notice?: string | null;
};

function normalizeQuestionCount(value: number) {
  const clamped = Math.max(10, Math.min(100, value));
  return Math.max(10, Math.min(100, Math.round(clamped / 10) * 10));
}

export function HostSetupModeScreen({
  questionCount,
  onQuestionCountChange,
  onChooseMode,
  onCreateMode,
  notice,
}: Props) {
  const { width } = useWindowDimensions();
  const wideCards = width >= 980;

  return (
    <HostLayout maxWidth={1080} notice={notice} headerEyebrow="Quiz Setup">
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          gap: 20,
        }}
      >
        <View
          style={{
            backgroundColor: Colors.navy,
            borderRadius: Radius.xl,
            paddingHorizontal: 24,
            paddingVertical: 22,
            gap: 12,
          }}
        >
          <Text
            style={{
              color: "rgba(46,196,182,0.88)",
              fontWeight: "900",
              fontSize: 13,
              letterSpacing: 1.2,
              textTransform: "uppercase",
              textAlign: "center",
            }}
          >
            Spieltempo
          </Text>
          <Text
            style={{
              color: Colors.textOnNavy,
              fontWeight: "900",
              fontSize: 38,
              textAlign: "center",
            }}
          >
            {questionCount} Fragen
          </Text>
          <Slider
            minimumValue={10}
            maximumValue={100}
            step={10}
            value={questionCount}
            minimumTrackTintColor={Colors.bg}
            maximumTrackTintColor="rgba(46,196,182,0.32)"
            thumbTintColor={Colors.bg}
            onValueChange={(value) => onQuestionCountChange(normalizeQuestionCount(value))}
            onSlidingComplete={(value) =>
              onQuestionCountChange(normalizeQuestionCount(value))
            }
          />
          <View style={{ flexDirection: wideCards ? "row" : "column", gap: 10 }}>
            {[
              "10-20 für schnelle Runden",
              "30-50 für den Hauptmodus",
              "60+ nur für lange Sessions",
            ].map((hint) => (
              <View
                key={hint}
                style={{
                  flex: 1,
                  borderRadius: 999,
                  backgroundColor: "rgba(255,255,255,0.12)",
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                }}
              >
                <Text
                  style={{
                    color: Colors.textOnNavy,
                    fontSize: 14,
                    fontWeight: "700",
                    textAlign: "center",
                  }}
                >
                  {hint}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ flexDirection: wideCards ? "row" : "column", gap: 16 }}>
          <ModeCard
            title=""
            cta="Aus Playlists wählen"
            onPress={onChooseMode}
          />
          <ModeCard
            title=""
            cta="Mit Playlist-ID starten"
            onPress={onCreateMode}
          />
        </View>
      </View>
    </HostLayout>
  );
}

function ModeCard({
  title,
  cta,
  onPress,
}: {
  title: string;
  cta: string;
  onPress: () => void;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "rgba(255,255,255,0.76)",
        borderRadius: Radius.xl,
        paddingHorizontal: 22,
        paddingVertical: 22,
        gap: 14,
      }}
    >
      <Text
        style={{
          color: Colors.textOnBg,
          fontSize: 28,
          lineHeight: 32,
          fontWeight: "900",
        }}
      >
        {title}
      </Text>
      <BBButton title={cta} onPress={onPress} style={{ height: 62 }} textStyle={{ fontSize: 20, fontWeight: "800" }} />
    </View>
  );
}
