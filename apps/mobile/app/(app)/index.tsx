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
import { colors, fontFamily, spacing } from "../../src/constants/theme";

const HEADER_HEIGHT = 140;
const ACCENT = "#4361ee";

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
  const { isRecording, durationMs, levels, start, stop } = useRecorder();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [topic, setTopic] = useState<string | null>(null);
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
      setTopic(response.summary || "your recording");
    } catch (err) {
      console.error("Failed to submit recording:", err);
      setTopic("your recording");
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
      setTopic(null);
      await start();
    }
  };

  const stateLabel = isRecording
    ? "RECORDING"
    : isSubmitting
      ? "TRANSCRIBING"
      : topic
        ? "CAPTURED"
        : "NEW ENTRY";

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{stateLabel}</Text>
        {topic && !isRecording && !isSubmitting ? (
          <Text style={styles.headline} numberOfLines={3}>
            <Text style={styles.headlineAccent}>{topic}.</Text>
          </Text>
        ) : (
          <Text style={styles.headline} numberOfLines={3}>
            {"Capture your\n"}
            <Text style={styles.headlineAccent}>thoughts.</Text>
          </Text>
        )}
      </View>

      <View style={styles.stage}>
        <RadialRecorder
          isRecording={isRecording}
          currentLevel={levels.length > 0 ? levels[levels.length - 1] : 0}
          onPress={handleToggle}
        />
        <View style={styles.timerSlot}>
          {isRecording && (
            <Text style={styles.timer}>{formatDuration(durationMs)}</Text>
          )}
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.dueRow}>
          {dueCount != null && dueCount > 0 && (
            <Text style={styles.dueCount}>
              {dueCount} {dueCount === 1 ? "card" : "cards"} to review
            </Text>
          )}
          {dueCount === 0 && (
            <Text style={styles.allCaughtUp}>All caught up</Text>
          )}
        </View>
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
    height: HEADER_HEIGHT,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  label: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 11,
    letterSpacing: 3,
    color: colors.primary,
    marginBottom: 8,
  },
  headline: {
    fontFamily: fontFamily.serifBold,
    fontSize: 36,
    lineHeight: 42,
    color: colors.text,
  },
  headlineAccent: {
    fontFamily: fontFamily.serifItalic,
    color: ACCENT,
  },
  stage: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  timerSlot: {
    minHeight: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  timer: {
    fontFamily: fontFamily.mono,
    fontSize: 14,
    color: colors.textSecondary,
    letterSpacing: 2,
    fontVariant: ["tabular-nums"],
  },
  footer: {
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    gap: spacing.sm,
  },
  dueRow: {
    minHeight: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  dueCount: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 13,
    color: colors.primary,
  },
  allCaughtUp: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 13,
    color: colors.success,
  },
  footerLine: {
    width: 40,
    height: 1,
    backgroundColor: colors.border,
  },
});
