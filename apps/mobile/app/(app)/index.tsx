import React, { useCallback, useContext, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { File } from "expo-file-system";
import { AuthContext } from "../_layout";
import { Button } from "../../src/components/Button";
import { RadialRecorder } from "../../src/components/RadialRecorder";
import { useRecorder } from "../../src/hooks/useRecorder";
import { api } from "../../src/lib/api";
import { colors, spacing, fontSize } from "../../src/constants/theme";

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
  const [dueCount, setDueCount] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      const token = auth?.session?.access_token;
      if (!token) return;
      api.get<{ due_count: number }>("/review/status", token)
        .then((res) => setDueCount(res.due_count))
        .catch(() => setDueCount(null));
    }, [auth?.session?.access_token]),
  );

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
      const topic = response.summary || "your recording";
      setSummary(`Building cards on ${topic}.`);
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
        {dueCount != null && dueCount > 0 && (
          <Text style={styles.dueCount}>{dueCount} cards to review</Text>
        )}
        {dueCount === 0 && (
          <Text style={styles.allCaughtUp}>All caught up ✓</Text>
        )}
      </View>

      <View style={styles.stage}>
        {!isRecording && !isSubmitting && summary ? (
          <Text style={styles.summary}>{summary}</Text>
        ) : !isRecording && !isSubmitting ? (
          <Text style={styles.hint}>Tap to record</Text>
        ) : isSubmitting ? (
          <Text style={styles.hint}>Transcribing...</Text>
        ) : null}

        <RadialRecorder
          isRecording={isRecording}
          currentLevel={levels.length > 0 ? levels[levels.length - 1] : 0}
          onPress={handleToggle}
        />

        {isRecording && (
          <Text style={styles.timer}>{formatDuration(durationMs)}</Text>
        )}
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
  dueCount: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.primary,
    marginTop: spacing.sm,
  },
  allCaughtUp: {
    fontSize: fontSize.sm,
    fontWeight: "500",
    color: colors.success,
    marginTop: spacing.sm,
  },
  stage: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
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
