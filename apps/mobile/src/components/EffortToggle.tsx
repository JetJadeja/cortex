import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors, spacing, fontSize, borderRadius } from "../constants/theme";

interface EffortToggleProps {
  value: boolean;
  onChange: (effort: boolean) => void;
}

export function EffortToggle({ value, onChange }: EffortToggleProps) {
  return (
    <View style={styles.container}>
      <Pressable
        style={[styles.option, value && styles.active]}
        onPress={() => onChange(true)}
      >
        <Text style={[styles.text, value && styles.activeText]}>Focused</Text>
      </Pressable>
      <Pressable
        style={[styles.option, !value && styles.active]}
        onPress={() => onChange(false)}
      >
        <Text style={[styles.text, !value && styles.activeText]}>Distracted</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: 3,
    gap: 3,
  },
  option: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  active: {
    backgroundColor: colors.background,
  },
  text: {
    fontSize: fontSize.sm,
    fontWeight: "500",
    color: colors.textMuted,
  },
  activeText: {
    color: colors.text,
  },
});
