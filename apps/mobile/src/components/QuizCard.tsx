import React, { useRef } from "react";
import {
  Animated,
  Pressable,
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { File } from "expo-file-system";
import { colors, fontFamily, spacing, fontSize, borderRadius, shadow } from "../constants/theme";
import { RadialRecorder } from "./RadialRecorder";
import { useRecorder } from "../hooks/useRecorder";

interface QuizCardProps {
  question: string;
  quizType: string;
  isSubmitting: boolean;
  quizResult: { score: number; feedback: string } | null;
  onSubmit: (audio: string, mimetype: string) => void;
  onNext: () => void;
}

const QUIZ_TYPE_LABELS: Record<string, string> = {
  explain: "EXPLAIN",
  distinguish: "DISTINGUISH",
  connect: "CONNECT",
  apply: "APPLY",
  synthesize: "SYNTHESIZE",
};

const SCORE_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "Needs work", color: colors.error },
  2: { label: "Partial", color: "#c97a2e" },
  3: { label: "Good", color: colors.primary },
  4: { label: "Excellent", color: colors.success },
};

export function QuizCard({
  question,
  quizType,
  isSubmitting,
  quizResult,
  onSubmit,
  onNext,
}: QuizCardProps) {
  const recorder = useRecorder();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const handleToggleRecording = async () => {
    if (isSubmitting) return;
    if (recorder.isRecording) {
      const uri = await recorder.stop();
      if (uri) {
        const file = new File(uri);
        const base64 = await file.base64();
        onSubmit(base64, "audio/m4a");
      }
    } else {
      recorder.reset();
      await recorder.start();
    }
  };

  React.useEffect(() => {
    if (quizResult) {
      Animated.spring(fadeAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [quizResult, fadeAnim]);

  if (quizResult) {
    const scoreInfo = SCORE_LABELS[quizResult.score] ?? SCORE_LABELS[2];
    return (
      <Animated.View style={[styles.feedbackContainer, { opacity: fadeAnim }]}>
        <Text style={styles.typeLabel}>
          {QUIZ_TYPE_LABELS[quizType] ?? quizType.toUpperCase()}
        </Text>
        <View style={styles.scoreRow}>
          <Text style={[styles.scoreLabel, { color: scoreInfo.color }]}>
            {scoreInfo.label}
          </Text>
          <Text style={[styles.scoreNumber, { color: scoreInfo.color }]}>
            {quizResult.score}/4
          </Text>
        </View>
        <ScrollView style={styles.feedbackScroll}>
          <Text style={styles.feedbackText}>{quizResult.feedback}</Text>
        </ScrollView>
        <Pressable style={styles.nextButton} onPress={onNext}>
          <Text style={styles.nextButtonText}>Continue</Text>
        </Pressable>
      </Animated.View>
    );
  }

  const currentLevel = recorder.levels.length > 0
    ? recorder.levels[recorder.levels.length - 1]
    : 0;

  return (
    <View style={styles.container}>
      <View style={styles.questionArea}>
        <Text style={styles.typeLabel}>
          {QUIZ_TYPE_LABELS[quizType] ?? quizType.toUpperCase()}
        </Text>
        <Text style={styles.questionText}>{question}</Text>
      </View>

      <View style={styles.recorderArea}>
        {isSubmitting ? (
          <View style={styles.submittingWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.submittingText}>Evaluating...</Text>
          </View>
        ) : (
          <RadialRecorder
            isRecording={recorder.isRecording}
            currentLevel={currentLevel}
            onPress={handleToggleRecording}
          />
        )}
      </View>

      {recorder.isRecording && (
        <Text style={styles.hint}>Tap to stop</Text>
      )}
      {!recorder.isRecording && !isSubmitting && (
        <Text style={styles.hint}>Tap to record your answer</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
  },
  questionArea: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  typeLabel: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 10,
    letterSpacing: 2.5,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  questionText: {
    fontFamily: fontFamily.serif,
    fontSize: 19,
    lineHeight: 30,
    color: colors.text,
  },
  recorderArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  submittingWrap: {
    alignItems: "center",
    gap: spacing.md,
  },
  submittingText: {
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  hint: {
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  feedbackContainer: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadow.cardLarge,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  scoreLabel: {
    fontFamily: fontFamily.sansBold,
    fontSize: fontSize.lg,
  },
  scoreNumber: {
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.sm,
  },
  feedbackScroll: {
    flex: 1,
    marginBottom: spacing.lg,
  },
  feedbackText: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.md,
    lineHeight: 26,
    color: colors.text,
  },
  nextButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  nextButtonText: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.md,
    color: colors.surface,
  },
});
