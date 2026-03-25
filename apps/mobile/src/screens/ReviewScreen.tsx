import React, { useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, fontSize } from "../constants/theme";
import { Button } from "../components/Button";
import { ReviewCard } from "../components/ReviewCard";
import { ConfidenceRating } from "../components/ConfidenceRating";
import { EffortToggle } from "../components/EffortToggle";
import { FailButton } from "../components/FailButton";
import { useReview } from "../hooks/useReview";

export const ReviewScreen: React.FC = () => {
  const review = useReview();
  const [isRevealed, setIsRevealed] = useState(false);
  const [effort, setEffort] = useState(true);

  React.useEffect(() => {
    setIsRevealed(false);
    setEffort(true);
  }, [review.item?.card_id]);

  const handleConfidence = (confidence: number) => {
    review.submitRating(confidence, effort);
  };

  if (review.state === "loading") {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (review.state === "empty") {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.heading}>No cards yet</Text>
        <Text style={styles.sub}>Record something to get started.</Text>
      </SafeAreaView>
    );
  }

  if (review.state === "done") {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.heading}>You're done!</Text>
        <Text style={styles.sub}>All caught up for today.</Text>
        <View style={styles.browseAction}>
          <Button title="See random cards" onPress={review.startBrowsing} variant="secondary" />
        </View>
      </SafeAreaView>
    );
  }

  if (review.state === "browse") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.browseLabel}>RANDOM BROWSE</Text>
        </View>
        <View style={styles.cardArea}>
          {review.item && (
            <ReviewCard
              key={review.item.card_id}
              front={review.item.front}
              back={review.item.back}
            />
          )}
        </View>
        <View style={styles.footer}>
          <Button
            title="Next"
            onPress={review.nextBrowseCard}
            disabled={review.isSubmitting}
          />
        </View>
      </SafeAreaView>
    );
  }

  // state === "active"
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.remaining}>{review.remaining} left</Text>
      </View>
      <View style={styles.cardArea}>
        {review.item && (
          <ReviewCard
            key={review.item.card_id}
            front={review.item.front}
            back={review.item.back}
            onRevealed={() => setIsRevealed(true)}
          />
        )}
      </View>
      {isRevealed && (
        <View style={styles.ratingArea}>
          <FailButton
            onPress={() => handleConfidence(1)}
            disabled={review.isSubmitting}
          />
          <EffortToggle value={effort} onChange={setEffort} />
          <ConfidenceRating
            onSelect={handleConfidence}
            disabled={review.isSubmitting}
          />
        </View>
      )}
      {review.error && <Text style={styles.error}>{review.error}</Text>}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  header: {
    paddingBottom: spacing.md,
  },
  remaining: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.textMuted,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  browseLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 2,
    color: colors.textMuted,
  },
  cardArea: {
    flex: 1,
    justifyContent: "center",
  },
  ratingArea: {
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  footer: {
    paddingTop: spacing.md,
  },
  heading: {
    fontSize: fontSize.xl,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  sub: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: "center",
  },
  browseAction: {
    marginTop: spacing.xl,
    width: "100%",
  },
  error: {
    fontSize: fontSize.sm,
    color: colors.error,
    textAlign: "center",
    marginTop: spacing.sm,
  },
});
