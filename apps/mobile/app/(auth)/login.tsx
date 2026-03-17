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
  if (message.includes("Invalid login credentials")) {
    return "Incorrect email or password.";
  }
  if (message.includes("Email not confirmed")) {
    return "Please confirm your email before signing in.";
  }
  return message;
}

export default function LoginScreen() {
  const auth = useContext(AuthContext);
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      await auth?.signIn(email.trim(), password);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed.";
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
        <Text style={styles.subtitle}>Sign in to continue</Text>

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
          autoComplete="password"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          title={isSubmitting ? "Signing in..." : "Sign In"}
          onPress={handleLogin}
          disabled={isSubmitting}
        />

        <Pressable onPress={() => router.push("/(auth)/sign-up")} style={styles.link}>
          <Text style={styles.linkText}>
            Don't have an account? <Text style={styles.linkHighlight}>Sign up</Text>
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
