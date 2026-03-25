import React, { useRef, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, Animated } from "react-native";
import { colors, spacing } from "../constants/theme";

interface ConfidenceRatingProps {
  onSelect: (confidence: number) => void;
  disabled?: boolean;
  revealed?: boolean;
  disabledOptions?: number[];
}

const options = [
  { value: 1, label: "Again", color: "#FF6B6B", bg: "rgba(255, 107, 107, 0.12)" },
  { value: 2, label: "Hard", color: "#FF9F43", bg: "rgba(255, 159, 67, 0.12)" },
  { value: 3, label: "Good", color: "#A29BFE", bg: "rgba(162, 155, 254, 0.12)" },
  { value: 4, label: "Easy", color: "#51CF66", bg: "rgba(81, 207, 102, 0.12)" },
];

export function ConfidenceRating({
  onSelect,
  disabled,
  revealed = false,
  disabledOptions = [],
}: ConfidenceRatingProps) {
  const anims = useRef(options.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (revealed) {
      Animated.stagger(
        50,
        anims.map((anim) =>
          Animated.spring(anim, {
            toValue: 1,
            tension: 80,
            friction: 12,
            useNativeDriver: true,
          }),
        ),
      ).start();
    } else {
      anims.forEach((anim) => anim.setValue(0));
    }
  }, [revealed, anims]);

  return (
    <View style={styles.container}>
      {options.map((opt, i) => {
        const isOptionDisabled = disabledOptions.includes(opt.value);
        const opacity = anims[i].interpolate({
          inputRange: [0, 1],
          outputRange: [0.3, 1],
        });
        const translateY = anims[i].interpolate({
          inputRange: [0, 1],
          outputRange: [6, 0],
        });

        return (
          <Animated.View
            key={opt.value}
            style={[
              styles.buttonWrap,
              { opacity: isOptionDisabled ? 0.35 : 1 },
              { transform: [{ translateY }] },
            ]}
          >
            <Animated.View style={{ opacity }}>
              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  revealed && !isOptionDisabled
                    ? { backgroundColor: opt.bg }
                    : styles.dormant,
                  pressed && revealed && !isOptionDisabled && styles.pressed,
                ]}
                onPress={() => onSelect(opt.value)}
                disabled={!revealed || disabled || isOptionDisabled}
              >
                <Text
                  style={[
                    styles.label,
                    {
                      color:
                        revealed && !isOptionDisabled
                          ? opt.color
                          : colors.textMuted,
                    },
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            </Animated.View>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  buttonWrap: {
    flex: 1,
  },
  button: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    borderRadius: 14,
  },
  dormant: {
    backgroundColor: colors.surface,
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
