import React, { useContext, useState, useEffect, useCallback, useRef } from "react";
import { AppState } from "react-native";
import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { colors, fontFamily, fontSize } from "../../src/constants/theme";
import { api } from "../../src/lib/api";
import { onDueCount } from "../../src/lib/due-count";
import { AuthContext } from "../_layout";

const POLL_INTERVAL_MS = 30_000;

export default function AppLayout() {
  const auth = useContext(AuthContext);
  const [dueCount, setDueCount] = useState<number | undefined>(undefined);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(() => {
    const token = auth?.session?.access_token;
    if (!token) return;

    api.get<{ due_count: number }>("/review/status", token)
      .then((res) => setDueCount(res.due_count > 0 ? res.due_count : undefined))
      .catch(() => {});
  }, [auth?.session?.access_token]);

  useEffect(() => {
    return onDueCount((count) => {
      setDueCount(count > 0 ? count : undefined);
    });
  }, []);

  useEffect(() => {
    fetchStatus();
    intervalRef.current = setInterval(fetchStatus, POLL_INTERVAL_MS);

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") fetchStatus();
    });

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      sub.remove();
    };
  }, [fetchStatus]);

  return (
    <>
      <StatusBar style="dark" />
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
            fontFamily: fontFamily.sansMedium,
            fontSize: 10,
          },
        }}
      >
        <Tabs.Screen
          name="explore"
          options={{
            title: "Explore",
            tabBarIcon: ({ color, size }) => (
              <Feather name="compass" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="index"
          options={{
            title: "Record",
            tabBarIcon: ({ color, size }) => (
              <Feather name="mic" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="review"
          options={{
            title: "Review",
            tabBarIcon: ({ color, size }) => (
              <Feather name="layers" size={size} color={color} />
            ),
            tabBarBadge: dueCount,
            tabBarBadgeStyle: {
              backgroundColor: colors.primary,
              color: "#ffffff",
              fontSize: 10,
              fontFamily: fontFamily.sansBold,
            },
          }}
        />
      </Tabs>
    </>
  );
}
