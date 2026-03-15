import React from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import { useAuth } from "../src/hooks/useAuth";
import { colors } from "../src/constants/theme";

export const AuthContext = React.createContext<ReturnType<typeof useAuth> | null>(null);

export default function RootLayout() {
  const auth = useAuth();
  const router = useRouter();
  const segments = useSegments();

  React.useEffect(() => {
    if (auth.isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inOnboarding = segments[0] === "onboarding";

    if (!auth.session) {
      if (!inAuthGroup) router.replace("/(auth)/login");
    } else if (auth.isNewUser) {
      if (!inOnboarding) router.replace("/onboarding");
    } else {
      if (inAuthGroup || inOnboarding) router.replace("/(app)");
    }
  }, [auth.isLoading, auth.session, auth.isNewUser, segments, router]);

  if (auth.isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <AuthContext.Provider value={auth}>
      <Slot />
    </AuthContext.Provider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
});
