import React, { useRef, useState } from "react";
import { Animated, Pressable, Text, View, StyleSheet } from "react-native";
import { colors, spacing, fontSize, borderRadius } from "../constants/theme";
import type { CardType } from "../lib/cards";

interface FlipCardProps {
  front: string;
  back: string;
  cardType: CardType;
}

const typeLabel: Record<CardType, string> = {
  flashcard: "Flashcard",
  explain_aloud: "Explain Aloud",
  scenario: "Scenario",
  connection: "Connection",
};

export function FlipCard({ front, back, cardType }: FlipCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;

  const handleFlip = () => {
    const toValue = isFlipped ? 0 : 1;
    setIsFlipped(!isFlipped);
    Animated.spring(flipAnim, {
      toValue,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();
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
      <View>
        <Animated.View
          style={[
            styles.face,
            {
              transform: [{ perspective: 1000 }, { rotateY: frontRotation }],
              backfaceVisibility: "hidden",
            },
          ]}
        >
          <Text style={styles.typeLabel}>{typeLabel[cardType]}</Text>
          <View style={styles.frontBody}>
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
          <Text style={styles.typeLabelBack}>Answer</Text>
          <Text style={styles.backText}>{back}</Text>
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  face: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
    minHeight: 140,
  },
  faceBack: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    gap: spacing.md,
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: colors.textMuted,
  },
  typeLabelBack: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: colors.primaryLight,
  },
  frontBody: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: spacing.sm,
  },
  frontText: {
    fontFamily: "Georgia",
    fontSize: 18,
    lineHeight: 28,
    color: colors.text,
  },
  backText: {
    fontSize: fontSize.md,
    lineHeight: 24,
    color: colors.primaryLight,
  },
});
