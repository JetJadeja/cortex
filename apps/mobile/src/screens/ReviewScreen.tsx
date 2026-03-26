import React, { useState, useRef, useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fontFamily, spacing, fontSize } from "../constants/theme";
import { Button } from "../components/Button";
import { ReviewCard } from "../components/ReviewCard";
import { QuizCard } from "../components/QuizCard";
import { ConfidenceRating } from "../components/ConfidenceRating";
import { EffortToggle } from "../components/EffortToggle";
import { useReview } from "../hooks/useReview";

export const ReviewScreen: React.FC = () => {
  const review = useReview();
  const [isRevealed, setIsRevealed] = useState(false);
  const [effort, setEffort] = useState(true);
  const sessionTotalRef = useRef(0);

  useEffect(() => {
    if (review.state === "loading") {
      sessionTotalRef.current = 0;
    } else if (
      review.state === "active" &&
      sessionTotalRef.current === 0 &&
      review.remaining > 0
    ) {
      sessionTotalRef.current = review.remaining;
    }
  }, [review.state, review.remaining]);

  const sessionTotal = sessionTotalRef.current;
  const progress =
    sessionTotal > 0
      ? Math.max(0, (sessionTotal - review.remaining) / sessionTotal)
      : 0;

  useEffect(() => {
    setIsRevealed(false);
    setEffort(true);
  }, [review.attemptId]);

  const handleStartReview = () => {
    review.start();
  };

  const isQuiz = review.item?.type === "quiz";
  const showingQuizFeedback = review.quizResult !== null;

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
        <Text style={styles.stateHeading}>Nothing here yet</Text>
        <Text style={styles.stateSub}>
          Record what you've learned{"\n"}and your cards will appear here.
        </Text>
      </SafeAreaView>
    );
  }

  if (review.state === "done") {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.doneHeading}>All caught up</Text>
        <Text style={styles.stateSub}>
          You've reviewed everything due today.
        </Text>
        <View style={styles.browseAction}>
          <Button
            title="Browse random cards"
            onPress={review.startBrowsing}
            variant="secondary"
          />
        </View>
      </SafeAreaView>
    );
  }

  if (review.state === "browse") {
    const dueLabel = review.dueCount === 1
      ? "Review 1 card"
      : `Review ${review.dueCount} cards`;

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.browseLabel}>BROWSING</Text>
        </View>
        <View style={styles.cardArea}>
          {review.item && review.item.type === "card" && (
            <ReviewCard
              key={review.attemptId}
              front={review.item.front}
              back={review.item.back}
            />
          )}
        </View>
        <View style={styles.footer}>
          {review.dueCount > 0 && (
            <Button
              title={dueLabel}
              onPress={handleStartReview}
              disabled={review.isSubmitting}
            />
          )}
          <Button
            title="Next card"
            onPress={review.nextBrowseCard}
            disabled={review.isSubmitting}
            variant="secondary"
          />
        </View>
      </SafeAreaView>
    );
  }

  // state === "active"
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.min(progress * 100, 100)}%` },
            ]}
          />
        </View>
        <Text style={styles.remaining}>{review.remaining} remaining</Text>
      </View>

      <View style={styles.cardArea}>
        {showingQuizFeedback && review.quizResult && (
          <QuizCard
            key="quiz-feedback"
            question=""
            quizType=""
            isSubmitting={false}
            quizResult={review.quizResult}
            onSubmit={() => {}}
            onNext={() => review.clearQuizResult()}
          />
        )}
        {!showingQuizFeedback && review.item && isQuiz && review.item.type === "quiz" && (
          <QuizCard
            key={review.attemptId}
            question={review.item.question}
            quizType={review.item.quiz_type}
            isSubmitting={review.isSubmitting}
            quizResult={null}
            onSubmit={(audio, mimetype) =>
              review.submitQuizAnswer(audio, mimetype)
            }
            onNext={() => {}}
          />
        )}
        {!showingQuizFeedback && review.item && !isQuiz && review.item.type === "card" && (
          <ReviewCard
            key={review.attemptId}
            front={review.item.front}
            back={review.item.back}
            onRevealed={() => setIsRevealed(true)}
          />
        )}
      </View>

      {!isQuiz && !showingQuizFeedback && (
        <View style={styles.ratingArea}>
          <EffortToggle value={effort} onChange={setEffort} />
          <ConfidenceRating
            onSelect={(c) => review.submitRating(c, effort)}
            disabled={review.isSubmitting}
            revealed={isRevealed}
            disabledOptions={effort ? [] : [4]}
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
    gap: spacing.sm,
  },
  progressTrack: {
    height: 2,
    backgroundColor: colors.border,
    borderRadius: 1,
    overflow: "hidden",
  },
  progressFill: {
    height: 2,
    backgroundColor: colors.primary,
    borderRadius: 1,
  },
  remaining: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 12,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  browseLabel: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.textSecondary,
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
    gap: spacing.sm,
  },
  stateHeading: {
    fontFamily: fontFamily.serifBold,
    fontSize: fontSize.xl,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  doneHeading: {
    fontFamily: fontFamily.serifBold,
    fontSize: 28,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  stateSub: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
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
