import React from "react";
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle } from "react-native";
import { colors, spacing, fontSize, borderRadius } from "../constants/theme";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = "primary",
  disabled = false,
}) => {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text
        style={[
          styles.text,
          variant === "ghost" && styles.ghostText,
          variant === "secondary" && styles.secondaryText,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,
  primary: {
    backgroundColor: colors.primary,
  } as ViewStyle,
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  } as ViewStyle,
  ghost: {
    backgroundColor: "transparent",
  } as ViewStyle,
  pressed: {
    opacity: 0.8,
  } as ViewStyle,
  disabled: {
    opacity: 0.4,
  } as ViewStyle,
  text: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: "600",
  } as TextStyle,
  ghostText: {
    color: colors.primaryLight,
  } as TextStyle,
  secondaryText: {
    color: colors.textSecondary,
  } as TextStyle,
});
