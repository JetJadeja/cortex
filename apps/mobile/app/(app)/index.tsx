import React, { useContext } from "react";
import { View, Text, StyleSheet } from "react-native";
import { AuthContext } from "../_layout";
import { Button } from "../../src/components/Button";
import { colors, spacing, fontSize } from "../../src/constants/theme";

export default function HomeScreen() {
  const auth = useContext(AuthContext);
  const displayName = auth?.profile?.display_name ?? "there";

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to Cortex, {displayName}.</Text>
      </View>
      <View style={styles.footer}>
        <Button title="Sign Out" variant="ghost" onPress={() => auth?.signOut()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  content: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
  },
  footer: {
    paddingBottom: spacing.xxl,
  },
});
