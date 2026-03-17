import React, { useState, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { AuthContext } from "./_layout";
import { Button } from "../src/components/Button";
import { createProfile, updateProfile } from "../src/lib/profiles";
import { colors, spacing, fontSize, borderRadius } from "../src/constants/theme";

export default function OnboardingScreen() {
  const auth = useContext(AuthContext);
  const [displayName, setDisplayName] = useState("");
  const [age, setAge] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleComplete = async () => {
    if (!displayName.trim()) {
      setError("Please enter your name.");
      return;
    }

    const trimmedAge = age.trim();
    const parsedAge = trimmedAge ? parseInt(trimmedAge, 10) : null;
    if (trimmedAge && (!/^\d+$/.test(trimmedAge) || (parsedAge as number) < 1)) {
      setError("Please enter a valid age.");
      return;
    }

    if (!auth?.session) return;

    setError("");
    setIsSubmitting(true);

    try {
      const userId = auth.session.user.id;
      if (auth.profile) {
        await updateProfile(userId, { display_name: displayName.trim(), age: parsedAge });
      } else {
        await createProfile(userId, displayName.trim(), parsedAge);
      }
      await auth.refreshProfile();
    } catch (err: unknown) {
      const message = err instanceof Error
        ? err.message
        : typeof err === "object" && err !== null && "message" in err
          ? String((err as Record<string, unknown>).message)
          : "Something went wrong.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>Welcome to Cortex</Text>
        <Text style={styles.subtitle}>Tell us a bit about yourself</Text>

        <TextInput
          style={styles.input}
          placeholder="Your name"
          placeholderTextColor={colors.textMuted}
          value={displayName}
          onChangeText={setDisplayName}
          autoCapitalize="words"
          autoComplete="name"
          autoFocus
        />

        <TextInput
          style={styles.input}
          placeholder="Age (optional)"
          placeholderTextColor={colors.textMuted}
          value={age}
          onChangeText={setAge}
          keyboardType="number-pad"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button title="Get Started" onPress={handleComplete} disabled={isSubmitting} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  inner: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  input: {
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: fontSize.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  error: {
    color: colors.error,
    fontSize: fontSize.sm,
    textAlign: "center",
  },
});
