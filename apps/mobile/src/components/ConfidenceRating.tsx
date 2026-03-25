import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors, spacing, fontSize, borderRadius } from "../constants/theme";

interface ConfidenceRatingProps {
  onSelect: (confidence: number) => void;
  disabled?: boolean;
}

const options = [
  { value: 1, label: "No recall", color: colors.error },
  { value: 2, label: "Vague", color: "#FF9F43" },
  { value: 3, label: "Got it", color: colors.primaryLight },
  { value: 4, label: "Easy", color: colors.success },
];

export function ConfidenceRating({ onSelect, disabled }: ConfidenceRatingProps) {
  return (
    <View style={styles.container}>
      {options.map((opt) => (
        <Pressable
          key={opt.value}
          style={({ pressed }) => [
            styles.button,
            { borderColor: opt.color },
            pressed && styles.pressed,
            disabled && styles.disabled,
          ]}
          onPress={() => onSelect(opt.value)}
          disabled={disabled}
        >
          <Text style={[styles.value, { color: opt.color }]}>{opt.value}</Text>
          <Text style={styles.label}>{opt.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  button: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    backgroundColor: colors.surface,
    gap: 4,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.4,
  },
  value: {
    fontSize: fontSize.lg,
    fontWeight: "700",
  },
  label: {
    fontSize: 10,
    fontWeight: "500",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
