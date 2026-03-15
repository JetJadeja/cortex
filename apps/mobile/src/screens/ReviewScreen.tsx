import React, { useEffect } from "react";
import { View, Text, StyleSheet, TextInput } from "react-native";
import { colors, spacing, fontSize, borderRadius } from "../constants/theme";
import { Button } from "../components/Button";
import { useReview } from "../hooks/useReview";

export const ReviewScreen: React.FC = () => {
  const {
    session,
    currentIndex,
    isLoading,
    error,
    loadSession,
    submitAnswer,
    nextItem,
    previousItem,
  } = useReview();

  const [response, setResponse] = React.useState("");
  const currentItem = session?.items[currentIndex];

  useEffect(() => {
    setResponse("");
  }, [currentIndex]);

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>{error}</Text>
        <Button title="Retry" onPress={() => loadSession("latest")} />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Review</Text>
        <Text style={styles.subtitle}>Start a review session from your recent recordings.</Text>
        <Button
          title={isLoading ? "Loading..." : "Start Review"}
          onPress={() => loadSession("latest")}
          disabled={isLoading}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.progress}>
        {currentIndex + 1} / {session.items.length}
      </Text>
      {currentItem && (
        <>
          <Text style={styles.question}>{currentItem.question}</Text>
          <TextInput
            style={styles.input}
            value={response}
            onChangeText={setResponse}
            placeholder="Type your answer..."
            placeholderTextColor={colors.textMuted}
            multiline
          />
          <View style={styles.actions}>
            <Button
              title="Submit"
              onPress={() => submitAnswer(currentItem.id, response)}
              disabled={isLoading || response.length === 0}
            />
            <View style={styles.nav}>
              <Button title="Previous" onPress={previousItem} variant="ghost" disabled={currentIndex === 0} />
              <Button title="Next" onPress={nextItem} variant="ghost" disabled={currentIndex === session.items.length - 1} />
            </View>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    justifyContent: "center",
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  progress: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  question: {
    fontSize: fontSize.lg,
    color: colors.text,
    fontWeight: "600",
    marginBottom: spacing.lg,
  },
  input: {
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    minHeight: 120,
    textAlignVertical: "top",
    marginBottom: spacing.lg,
  },
  actions: {
    gap: spacing.md,
  },
  nav: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  error: {
    fontSize: fontSize.md,
    color: colors.error,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
});
