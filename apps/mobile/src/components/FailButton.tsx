import React from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import { colors, spacing, fontSize, borderRadius } from "../constants/theme";

interface FailButtonProps {
  onPress: () => void;
  disabled?: boolean;
}

export function FailButton({ onPress, disabled }: FailButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.text}>Didn't know it</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.error,
    alignItems: "center",
  },
  pressed: {
    opacity: 0.7,
    backgroundColor: "rgba(255, 107, 107, 0.1)",
  },
  disabled: {
    opacity: 0.4,
  },
  text: {
    fontSize: fontSize.md,
    fontWeight: "600",
    color: colors.error,
  },
});
