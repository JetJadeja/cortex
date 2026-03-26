import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors, fontFamily, spacing, borderRadius } from "../constants/theme";

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
    backgroundColor: colors.surfaceLight,
    borderRadius: 10,
    padding: 2,
    gap: 2,
  },
  option: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 8,
  },
  active: {
    backgroundColor: colors.surface,
  },
  text: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 13,
    color: colors.textMuted,
  },
  activeText: {
    color: colors.text,
  },
});
