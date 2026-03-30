import React from "react";
import Slider from "@react-native-community/slider";
import { Text, View } from "react-native";
import { BBButton } from "../../components/BBButton";
import { Colors, Radius } from "../../theme";
import { useHostViewport } from "../hooks/useHostViewport";
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
  const { width, fluid } = useHostViewport();
  const wideCards = width >= 980;
  const sectionGap = fluid(20, 14, 20, "height");
  const cardPaddingX = fluid(24, 18, 24);
  const cardPaddingY = fluid(22, 18, 22, "height");
  const titleSize = fluid(38, 28, 38);
  const hintSize = fluid(14, 12, 14);

  return (
    <HostLayout maxWidth={1080} notice={notice} headerEyebrow="Quiz Setup">
      <View
        style={{
          width: "100%",
          gap: sectionGap,
        }}
      >
        <View
          style={{
            backgroundColor: Colors.navy,
            borderRadius: Radius.xl,
            paddingHorizontal: cardPaddingX,
            paddingVertical: cardPaddingY,
            gap: fluid(12, 10, 12, "height"),
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
              fontSize: titleSize,
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
          <View style={{ flexDirection: wideCards ? "row" : "column", gap: fluid(10, 8, 10, "height") }}>
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
                    fontSize: hintSize,
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

        <View style={{ flexDirection: wideCards ? "row" : "column", gap: fluid(16, 12, 16, "height") }}>
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
  const { fluid } = useHostViewport();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "rgba(255,255,255,0.76)",
        borderRadius: Radius.xl,
        paddingHorizontal: fluid(22, 18, 22),
        paddingVertical: fluid(22, 18, 22, "height"),
        gap: fluid(14, 10, 14, "height"),
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          color: Colors.textOnBg,
          fontSize: fluid(28, 22, 28),
          lineHeight: fluid(32, 26, 32),
          fontWeight: "900",
        }}
      >
        {title}
      </Text>
      <View style={{ width: "100%", maxWidth: 360 }}>
        <BBButton
          title={cta}
          onPress={onPress}
          style={{ height: fluid(62, 54, 62, "height") }}
          textStyle={{ fontSize: fluid(20, 17, 20), fontWeight: "800" }}
        />
      </View>
    </View>
  );
}
