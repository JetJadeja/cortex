import React, { useCallback, useContext, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { AuthContext } from "../../app/_layout";
import { FlipCard } from "../components/FlipCard";
import { getAllCards, type Card } from "../lib/cards";
import { colors, spacing, fontSize, borderRadius } from "../constants/theme";

export const ExploreScreen: React.FC = () => {
  const auth = useContext(AuthContext);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const userId = auth?.session?.user?.id;
      if (!userId) {
        setLoading(false);
        return;
      }

      let cancelled = false;

      async function fetchCards() {
        setLoading(true);
        try {
          const data = await getAllCards(userId!);
          if (!cancelled) setCards(data);
        } catch (err) {
          console.error("Failed to fetch cards:", err);
        } finally {
          if (!cancelled) setLoading(false);
        }
      }

      fetchCards();
      return () => { cancelled = true; };
    }, [auth?.session?.user?.id]),
  );

  const renderItem = useCallback(
    ({ item }: { item: Card }) => (
      <FlipCard front={item.front} back={item.back} cardType={item.card_type} />
    ),
    [],
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>CORTEX</Text>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Explore</Text>
          {!loading && cards.length > 0 && (
            <View style={styles.countPill}>
              <Text style={styles.countText}>{cards.length}</Text>
            </View>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : cards.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>No cards yet</Text>
          <Text style={styles.emptyHint}>
            Record something to generate{"\n"}your first cards.
          </Text>
        </View>
      ) : (
        <FlatList
          data={cards}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 3,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
  },
  countPill: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  countText: {
    fontSize: fontSize.xs,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  list: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  emptyHint: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
  },
});
