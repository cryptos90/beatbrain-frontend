import { CameraView, useCameraPermissions } from "expo-camera";
import React, { useMemo, useState } from "react";
import { Image, Modal, Platform, Text, TextInput, View } from "react-native";
import { AppHeader } from "../../components/AppHeader";
import { BBButton } from "../../components/BBButton";
import { Colors } from "../../theme";

type Props = {
  sessionId: string;
  name: string;
  avatarDataUrl: string;
  joinError: string | null;
  onBack: () => void;
  onSessionIdChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onPickAvatarCamera: () => void;
  onPickAvatarLibrary: () => void;
  onJoin: () => void;
};

const JOIN_CODE_MIN_LENGTH = 4;

function parseJoinCodeFromQr(rawData: string) {
  const raw = String(rawData ?? "").trim();
  if (!raw) {
    return null;
  }

  const fromQueryMatch = raw.match(/[?&](joinCode|sessionId|code)=([^&#]+)/i);
  if (fromQueryMatch?.[2]) {
    return decodeURIComponent(fromQueryMatch[2]).trim().toUpperCase();
  }

  try {
    const url = new URL(raw);
    const fromParams =
      url.searchParams.get("joinCode") ??
      url.searchParams.get("sessionId") ??
      url.searchParams.get("code");
    if (fromParams) {
      return fromParams.trim().toUpperCase();
    }
  } catch {
    // Not a URL. Continue with direct-code fallback.
  }

  const directCode = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (directCode.length >= JOIN_CODE_MIN_LENGTH) {
    return directCode;
  }

  return null;
}

export function MultiplayerJoinView({
  sessionId,
  name,
  avatarDataUrl,
  joinError,
  onBack,
  onSessionIdChange,
  onNameChange,
  onPickAvatarCamera,
  onPickAvatarLibrary,
  onJoin,
}: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scanHandled, setScanHandled] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);

  const canJoin =
    sessionId.trim().length > 0 &&
    name.trim().length > 0 &&
    name.trim().length <= 20 &&
    avatarDataUrl.trim().length > 0;

  const mergedError = useMemo(() => joinError ?? scannerError, [joinError, scannerError]);

  const openScanner = async () => {
    setScannerError(null);
    if (Platform.OS === "web") {
      setScannerError("QR-Scan ist in der Web-Ansicht nicht verfügbar.");
      return;
    }

    if (!permission?.granted) {
      const nextPermission = await requestPermission();
      if (!nextPermission.granted) {
        setScannerError("Kamera-Berechtigung fehlt.");
        return;
      }
    }

    setScanHandled(false);
    setScannerVisible(true);
  };

  const closeScanner = () => {
    setScannerVisible(false);
    setScanHandled(false);
  };

  const onQrDetected = (rawData: string) => {
    if (scanHandled) {
      return;
    }

    const resolvedJoinCode = parseJoinCodeFromQr(rawData);
    if (!resolvedJoinCode) {
      setScanHandled(true);
      setScannerError("QR-Code enthält keine gültige Session-ID.");
      return;
    }

    setScanHandled(true);
    setScannerVisible(false);
    setScannerError(null);
    onSessionIdChange(resolvedJoinCode);
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <AppHeader onBack={onBack} />

      <View style={{ flex: 1, paddingHorizontal: 18, paddingTop: 16, gap: 12 }}>
        <View
          style={{
            backgroundColor: Colors.white,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}
        >
          <TextInput
            value={sessionId}
            onChangeText={(value) => onSessionIdChange(value.toUpperCase())}
            autoCapitalize="characters"
            placeholder="Session-ID"
            style={{ fontSize: 15 }}
          />
        </View>

        <BBButton title="QR-Code scannen" onPress={openScanner} />

        <View
          style={{
            backgroundColor: Colors.white,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}
        >
          <TextInput
            value={name}
            onChangeText={onNameChange}
            placeholder="Name"
            maxLength={20}
            style={{ fontSize: 15 }}
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
          {avatarDataUrl ? (
            <Image
              source={{ uri: avatarDataUrl }}
              style={{ width: 96, height: 96, borderRadius: 48 }}
            />
          ) : (
            <Text style={{ color: "#6b7280", fontWeight: "700" }}>Kein Foto gewählt</Text>
          )}
        </View>

        {!!mergedError && (
          <Text style={{ textAlign: "center", color: "red", fontWeight: "700" }}>
            {mergedError}
          </Text>
        )}

        <BBButton title="Beitreten" onPress={onJoin} disabled={!canJoin} />
      </View>

      <Modal visible={scannerVisible} animationType="slide" onRequestClose={closeScanner}>
        <View style={{ flex: 1, backgroundColor: Colors.bg }}>
          <View style={{ paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12 }}>
            <Text
              style={{
                color: Colors.textOnBg,
                fontSize: 22,
                fontWeight: "800",
                textAlign: "center",
              }}
            >
              QR-Code scannen
            </Text>
            <Text
              style={{
                marginTop: 8,
                color: Colors.textOnBg,
                textAlign: "center",
                fontWeight: "600",
              }}
            >
              Richte die Kamera auf den Host-QR-Code.
            </Text>
          </View>

          <View style={{ flex: 1, marginHorizontal: 16, marginBottom: 16, borderRadius: 16, overflow: "hidden" }}>
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={
                scanHandled
                  ? undefined
                  : (event: { data?: string }) => onQrDetected(String(event?.data ?? ""))
              }
            />
          </View>

          {scanHandled && (
            <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
              <BBButton
                title="Erneut scannen"
                onPress={() => {
                  setScanHandled(false);
                  setScannerError(null);
                }}
              />
            </View>
          )}

          <View style={{ paddingHorizontal: 16, paddingBottom: 20 }}>
            <BBButton title="Schließen" onPress={closeScanner} />
          </View>
        </View>
      </Modal>
    </View>
  );
}
