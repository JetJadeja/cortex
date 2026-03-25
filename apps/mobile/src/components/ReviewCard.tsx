import React, { useRef, useState } from "react";
import { Animated, Pressable, Text, View, StyleSheet } from "react-native";
import { colors, spacing, fontSize, borderRadius } from "../constants/theme";

interface ReviewCardProps {
  front: string;
  back: string;
  onRevealed?: () => void;
}

const CARD_HEIGHT = 300;

export function ReviewCard({ front, back, onRevealed }: ReviewCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;

  const handleFlip = () => {
    if (isFlipped) return;
    setIsFlipped(true);
    Animated.spring(flipAnim, {
      toValue: 1,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start(() => onRevealed?.());
  };

  const frontRotation = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const backRotation = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["180deg", "360deg"],
  });

  return (
    <Pressable onPress={handleFlip}>
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.face,
            {
              transform: [{ perspective: 1000 }, { rotateY: frontRotation }],
              backfaceVisibility: "hidden",
            },
          ]}
        >
          <Text style={styles.hint}>{isFlipped ? "" : "TAP TO REVEAL"}</Text>
          <View style={styles.body}>
            <Text style={styles.frontText}>{front}</Text>
          </View>
        </Animated.View>

        <Animated.View
          style={[
            styles.face,
            styles.faceBack,
            {
              transform: [{ perspective: 1000 }, { rotateY: backRotation }],
              backfaceVisibility: "hidden",
            },
          ]}
        >
          <Text style={styles.answerLabel}>ANSWER</Text>
          <Text style={styles.backText}>{back}</Text>
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    height: CARD_HEIGHT,
  },
  face: {
    height: CARD_HEIGHT,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  faceBack: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    gap: spacing.md,
  },
  hint: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 2.5,
    color: colors.textMuted,
    opacity: 0.7,
  },
  body: {
    flex: 1,
    justifyContent: "center",
  },
  frontText: {
    fontFamily: "Georgia",
    fontSize: 19,
    lineHeight: 30,
    color: colors.text,
  },
  answerLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 2.5,
    color: colors.primaryLight,
  },
  backText: {
    fontSize: fontSize.md,
    lineHeight: 26,
    color: colors.primaryLight,
  },
});
