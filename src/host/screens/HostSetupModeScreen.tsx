import React from "react";
import Slider from "@react-native-community/slider";
import { Text, View } from "react-native";
import { Colors } from "../../theme";
import { HostActionButton } from "../components/HostActionButton";
import { HostLayout } from "../components/HostLayout";
import { HostPanel } from "../components/HostPanel";
import { HostResponsiveGrid } from "../components/HostResponsiveGrid";
import { HostScreenContainer } from "../components/HostScreenContainer";
import { useHostViewport } from "../hooks/useHostViewport";

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

const SPEED_HINTS = [
  "10-20 für schnelle Runden",
  "30-50 für den Hauptmodus",
  "60+ nur für lange Sessions",
];

export function HostSetupModeScreen({
  questionCount,
  onQuestionCountChange,
  onChooseMode,
  onCreateMode,
  notice,
}: Props) {
  const { contentMax, radii, space, typeScale, fluidBetween, isCompactHeight } = useHostViewport();

  return (
    <HostLayout maxWidth={contentMax.wide} notice={notice} headerEyebrow="Quiz Setup">
      <HostScreenContainer>
        <HostPanel tone="navy" padding={isCompactHeight ? "sm" : "md"}>
          <Text
            style={{
              color: "rgba(46,196,182,0.88)",
              fontWeight: "900",
              fontSize: typeScale.label,
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
              fontSize: fluidBetween(isCompactHeight ? 24 : 28, isCompactHeight ? 34 : 40, "width"),
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
          <HostResponsiveGrid minItemWidth={190} maxColumns={3} gap={space.sm}>
            {SPEED_HINTS.map((hint) => (
              <View
                key={hint}
                style={{
                  height: "100%",
                  borderRadius: radii.pill,
                  backgroundColor: "rgba(255,255,255,0.12)",
                  paddingHorizontal: space.md,
                  paddingVertical: isCompactHeight ? space.xs : space.sm,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    color: Colors.textOnNavy,
                    fontSize: typeScale.bodySm,
                    fontWeight: "700",
                    textAlign: "center",
                  }}
                >
                  {hint}
                </Text>
              </View>
            ))}
          </HostResponsiveGrid>
        </HostPanel>

        <HostResponsiveGrid minItemWidth={280} maxColumns={2} gap={space.lg}>
          <ModeCard
            title="Kuratiert starten"
            description="Spotify-Playlists laden, am Big Screen auswählen und direkt mit der Session verbinden."
            cta="Aus Playlists wählen"
            onPress={onChooseMode}
          />
          <ModeCard
            title="Direkt per ID"
            description="Eine bekannte Playlist-ID manuell eingeben, wenn du ohne Auswahlgitter arbeiten willst."
            cta="Mit Playlist-ID starten"
            onPress={onCreateMode}
          />
        </HostResponsiveGrid>
      </HostScreenContainer>
    </HostLayout>
  );
}

function ModeCard({
  title,
  description,
  cta,
  onPress,
}: {
  title: string;
  description: string;
  cta: string;
  onPress: () => void;
}) {
  const { contentMax, typeScale, fluidBetween, isCompactHeight } = useHostViewport();

  return (
    <HostPanel
      tone="glass"
      padding={isCompactHeight ? "sm" : "md"}
      style={{ height: "100%", alignItems: "center", justifyContent: "center" }}
    >
      <Text
        style={{
          color: Colors.textOnBg,
          fontSize: fluidBetween(isCompactHeight ? 20 : 22, isCompactHeight ? 26 : 30, "width"),
          lineHeight: fluidBetween(isCompactHeight ? 24 : 26, isCompactHeight ? 30 : 34, "width"),
          fontWeight: "900",
          textAlign: "center",
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          color: "rgba(32,44,89,0.82)",
          fontSize: typeScale.bodySm,
          lineHeight: typeScale.bodySm + 7,
          fontWeight: "600",
          textAlign: "center",
        }}
      >
        {description}
      </Text>
      <View style={{ width: "100%", maxWidth: contentMax.compact }}>
        <HostActionButton
          title={cta}
          onPress={onPress}
          textStyle={{ fontSize: fluidBetween(17, 20, "width"), fontWeight: "800" }}
        />
      </View>
    </HostPanel>
  );
}
