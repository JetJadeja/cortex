import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, fontSize } from "../constants/theme";
import { Button } from "../components/Button";

export const HomeScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cortex</Text>
      <Text style={styles.subtitle}>Record, transcribe, and review your learning.</Text>
      <View style={styles.actions}>
        <Button title="Start Recording" onPress={() => {}} />
        <Button title="Review" onPress={() => {}} variant="secondary" />
      </View>
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
    fontSize: fontSize.title,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  actions: {
    gap: spacing.md,
    width: "100%",
  },
});
