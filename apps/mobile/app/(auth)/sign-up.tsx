import React, { useState, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { AuthContext } from "../_layout";
import { Button } from "../../src/components/Button";
import { colors, spacing, fontSize, borderRadius } from "../../src/constants/theme";

function mapAuthError(message: string): string {
  if (message.includes("User already registered")) {
    return "An account with this email already exists.";
  }
  if (message.includes("valid email")) {
    return "Please enter a valid email address.";
  }
  return message;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function SignUpScreen() {
  const auth = useContext(AuthContext);
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignUp = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.");
      return;
    }

    if (!isValidEmail(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      await auth?.signUp(email.trim(), password);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Sign up failed.";
      setError(mapAuthError(message));
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
        <Text style={styles.title}>Cortex</Text>
        <Text style={styles.subtitle}>Create your account</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.textMuted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          spellCheck={false}
          autoCorrect={false}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
        />

        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          placeholderTextColor={colors.textMuted}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          autoComplete="new-password"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          title={isSubmitting ? "Creating..." : "Create Account"}
          onPress={handleSignUp}
          disabled={isSubmitting}
        />

        <Pressable onPress={() => router.back()} style={styles.link}>
          <Text style={styles.linkText}>
            Already have an account? <Text style={styles.linkHighlight}>Sign in</Text>
          </Text>
        </Pressable>
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
    fontSize: fontSize.md,
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
  link: {
    alignItems: "center",
    marginTop: spacing.md,
  },
  linkText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  linkHighlight: {
    color: colors.primaryLight,
    fontWeight: "600",
  },
});
