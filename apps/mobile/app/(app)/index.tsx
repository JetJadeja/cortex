import React, { useContext, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Animated,
  Dimensions,
} from "react-native";
import { AuthContext } from "../_layout";
import { Button } from "../../src/components/Button";
import { Waveform } from "../../src/components/Waveform";
import { RecordButton } from "../../src/components/RecordButton";
import { useRecorder } from "../../src/hooks/useRecorder";
import { colors, spacing, fontSize } from "../../src/constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export default function HomeScreen() {
  const auth = useContext(AuthContext);
  const displayName = auth?.profile?.display_name ?? "there";
  const { isRecording, durationMs, uri, levels, start, stop } =
    useRecorder();

  const waveformOpacity = useRef(new Animated.Value(0)).current;
  const timerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(waveformOpacity, {
        toValue: isRecording ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(timerOpacity, {
        toValue: isRecording ? 1 : 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isRecording, waveformOpacity, timerOpacity]);

  const handleToggle = async () => {
    if (isRecording) {
      await stop();
    } else {
      await start();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>CORTEX</Text>
        <Text style={styles.greeting}>Hey, {displayName}</Text>
        <Text style={styles.subtitle}>
          {isRecording
            ? "Listening..."
            : uri
              ? "Recording complete"
              : "Explain what you just learned."}
        </Text>
      </View>

      <View style={styles.stage}>
        <Animated.View
          style={[styles.waveformWrap, { opacity: waveformOpacity }]}
          pointerEvents="none"
        >
          <Waveform
            levels={levels}
            barCount={Math.floor((SCREEN_WIDTH - 48) / 4.5)}
            height={120}
            color="rgba(162, 155, 254, 0.5)"
            accentColor={colors.primaryLight}
          />
        </Animated.View>

        <Animated.Text
          style={[
            styles.timer,
            { opacity: timerOpacity },
          ]}
        >
          {formatDuration(durationMs)}
        </Animated.Text>

        <RecordButton isRecording={isRecording} onPress={handleToggle} />

        {!isRecording && !uri && (
          <Text style={styles.hint}>Tap to record</Text>
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
