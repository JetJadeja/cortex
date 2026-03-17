import React, { useContext, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { File } from "expo-file-system";
import { AuthContext } from "../_layout";
import { Button } from "../../src/components/Button";
import { Waveform } from "../../src/components/Waveform";
import { RecordButton } from "../../src/components/RecordButton";
import { useRecorder } from "../../src/hooks/useRecorder";
import { api } from "../../src/lib/api";
import { colors, spacing, fontSize } from "../../src/constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

interface ProcessResponse {
  session_id: string;
  summary: string;
}

export default function HomeScreen() {
  const auth = useContext(AuthContext);
  const displayName = auth?.profile?.display_name ?? "there";
  const { isRecording, durationMs, levels, start, stop } = useRecorder();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);


  const submitRecording = async (uri: string) => {
    const token = auth?.session?.access_token;
    if (!token) return;

    setIsSubmitting(true);
    try {
      const file = new File(uri);
      const base64 = await file.base64();
      const response = await api.post<ProcessResponse>(
        "/process-recording",
        { audio: base64, mimetype: "audio/m4a" },
        token,
      );
      setSummary(response.summary || "Building cards on your recording.");
    } catch (err) {
      console.error("Failed to submit recording:", err);
      setSummary("Recording saved.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async () => {
    if (isSubmitting) return;
    if (isRecording) {
      const uri = await stop();
      if (uri) {
        submitRecording(uri);
      }
    } else {
      setSummary(null);
      await start();
    }
  };

  const subtitleText = isRecording
    ? "Listening..."
    : isSubmitting
      ? "Transcribing..."
      : "Explain what you just learned.";

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>CORTEX</Text>
        <Text style={styles.greeting}>Hey, {displayName}</Text>
        <Text style={styles.subtitle}>{subtitleText}</Text>
      </View>

      <View style={styles.stage}>
        {isRecording && (
          <>
            <View style={styles.waveformWrap}>
              <Waveform
                levels={levels}
                barCount={Math.floor((SCREEN_WIDTH - 48) / 4.5)}
                height={120}
                color="rgba(162, 155, 254, 0.5)"
                accentColor={colors.primaryLight}
              />
            </View>
            <Text style={styles.timer}>{formatDuration(durationMs)}</Text>
          </>
        )}

        {!isRecording && !isSubmitting && summary ? (
          <Text style={styles.summary}>{summary}</Text>
        ) : !isRecording && !isSubmitting ? (
          <Text style={styles.hint}>Tap to record</Text>
        ) : isSubmitting ? (
          <Text style={styles.hint}>Transcribing...</Text>
        ) : null}

        <RecordButton
          isRecording={isRecording}
          onPress={handleToggle}
        />
      </View>

      <View style={styles.footer}>
        <View style={styles.footerLine} />
        <Button
          title="Sign Out"
          variant="ghost"
          onPress={() => auth?.signOut()}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 3,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  greeting: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  stage: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.lg,
  },
  waveformWrap: {
    width: "100%",
    height: 120,
  },
  timer: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textSecondary,
    letterSpacing: 2,
    fontVariant: ["tabular-nums"],
  },
  hint: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  summary: {
    fontSize: fontSize.md,
    color: colors.primaryLight,
    textAlign: "center",
    paddingHorizontal: spacing.lg,
  },
  footer: {
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    gap: spacing.md,
  },
  footerLine: {
    width: 40,
    height: 1,
    backgroundColor: colors.border,
  },
});
