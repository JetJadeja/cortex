import React, { useContext, useState, useCallback } from "react";
import { Tabs, useFocusEffect } from "expo-router";
import { colors, fontSize } from "../../src/constants/theme";
import { api } from "../../src/lib/api";
import { AuthContext } from "../_layout";

export default function AppLayout() {
  const auth = useContext(AuthContext);
  const [dueCount, setDueCount] = useState<number | undefined>(undefined);

  useFocusEffect(
    useCallback(() => {
      const token = auth?.session?.access_token;
      if (!token) return;

      api.get<{ due_count: number }>("/review/status", token)
        .then((res) => setDueCount(res.due_count > 0 ? res.due_count : undefined))
        .catch(() => setDueCount(undefined));
    }, [auth?.session?.access_token]),
  );

  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: fontSize.xs,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="explore"
        options={{ title: "Explore" }}
      />
      <Tabs.Screen
        name="index"
        options={{ title: "Record" }}
      />
      <Tabs.Screen
        name="review"
        options={{
          title: "Review",
          tabBarBadge: dueCount,
          tabBarBadgeStyle: {
            backgroundColor: colors.primary,
            fontSize: 10,
            fontWeight: "700",
          },
        }}
      />
    </Tabs>
  );
}
