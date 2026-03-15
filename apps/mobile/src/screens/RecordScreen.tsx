import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, fontSize } from "../constants/theme";
import { Button } from "../components/Button";
import { useRecorder } from "../hooks/useRecorder";

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export const RecordScreen: React.FC = () => {
  const { isRecording, durationMs, uri, start, stop, reset } = useRecorder();

  const handleToggle = async () => {
    if (isRecording) {
      await stop();
    } else {
      await start();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Record</Text>
      <Text style={styles.timer}>{formatDuration(durationMs)}</Text>
      <View style={styles.actions}>
        <Button
          title={isRecording ? "Stop" : "Start"}
          onPress={handleToggle}
          variant={isRecording ? "secondary" : "primary"}
        />
        {uri && !isRecording && (
          <Button title="Reset" onPress={reset} variant="ghost" />
        )}
      </View>
      {uri && <Text style={styles.status}>Recording saved</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xl,
  },
  timer: {
    fontSize: 64,
    fontWeight: "200",
    color: colors.text,
    fontVariant: ["tabular-nums"],
    marginBottom: spacing.xl,
  },
  actions: {
    gap: spacing.md,
    width: "100%",
  },
  status: {
    marginTop: spacing.lg,
    fontSize: fontSize.sm,
    color: colors.success,
  },
});
