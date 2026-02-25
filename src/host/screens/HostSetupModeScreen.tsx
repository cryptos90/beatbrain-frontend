import React from "react";
import Slider from "@react-native-community/slider";
import { Text, View } from "react-native";
import { BBButton } from "../../components/BBButton";
import { Colors } from "../../theme";
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
  return (
    <HostLayout maxWidth={760} notice={notice}>
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          gap: 18,
        }}
      >
        <View
          style={{
            backgroundColor: "rgba(255,255,255,0.45)",
            borderRadius: 16,
            paddingHorizontal: 18,
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
        <View style={{ flexDirection: "row", gap: 12, justifyContent: "center" }}>
          <BBButton
            title="Choose Quiz"
            onPress={onChooseMode}
            style={{ width: 220 }}
            textStyle={{ fontSize: 17 }}
          />
          <BBButton
            title="Create Quiz"
            onPress={onCreateMode}
            style={{ width: 220 }}
            textStyle={{ fontSize: 17 }}
          />
        </View>
      </View>
    </HostLayout>
  );
}
