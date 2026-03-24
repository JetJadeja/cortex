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
  const animating = useRef(false);

  const handleFlip = () => {
    if (animating.current) return;
    animating.current = true;

    // First half: rotate to 90deg (card goes edge-on)
    Animated.timing(flipAnim, {
      toValue: 90,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      // Swap content while card is invisible
      setIsFlipped((prev) => !prev);
      // Jump to -90deg (other side of edge-on)
      flipAnim.setValue(-90);
      // Second half: rotate from -90deg back to 0deg with spring
      Animated.spring(flipAnim, {
        toValue: 0,
        tension: 80,
        friction: 8,
        useNativeDriver: true,
      }).start(() => {
        animating.current = false;
      });
    });
  };

  const rotateY = flipAnim.interpolate({
    inputRange: [-90, 0, 90],
    outputRange: ["-90deg", "0deg", "90deg"],
  });

  return (
    <Pressable onPress={handleFlip}>
      <Animated.View
        style={[
          styles.card,
          { transform: [{ perspective: 1000 }, { rotateY }] },
        ]}
      >
        {isFlipped ? (
          <>
            <Text style={styles.typeLabelBack}>Answer</Text>
            <Text style={styles.backText}>{back}</Text>
          </>
        ) : (
          <>
            <Text style={styles.typeLabel}>{typeLabel[cardType]}</Text>
            <Text style={styles.frontText}>{front}</Text>
          </>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
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
