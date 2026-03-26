import React, { useEffect, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Slot, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import {
  Newsreader_400Regular,
  Newsreader_400Regular_Italic,
  Newsreader_700Bold,
} from "@expo-google-fonts/newsreader";
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from "@expo-google-fonts/manrope";
import { useAuth } from "../src/hooks/useAuth";
import { colors } from "../src/constants/theme";

SplashScreen.preventAutoHideAsync();

export const AuthContext = React.createContext<ReturnType<typeof useAuth> | null>(null);

export default function RootLayout() {
  const auth = useAuth();
  const router = useRouter();
  const segments = useSegments();

  const [fontsLoaded] = useFonts({
    Newsreader_400Regular,
    Newsreader_400Regular_Italic,
    Newsreader_700Bold,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });

  const isReady = fontsLoaded && !auth.isLoading;

  const onLayoutReady = useCallback(async () => {
    if (isReady) {
      await SplashScreen.hideAsync();
    }
  }, [isReady]);

  useEffect(() => {
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

  if (!isReady) {
    return <View style={styles.loading} />;
  }

  return (
    <SafeAreaProvider>
      <AuthContext.Provider value={auth}>
        <View style={styles.root} onLayout={onLayoutReady}>
          <Slot />
        </View>
      </AuthContext.Provider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.background,
  },
  root: {
    flex: 1,
  },
});
