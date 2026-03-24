import React, { useCallback, useContext, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { AuthContext } from "../../app/_layout";
import { FlipCard } from "../components/FlipCard";
import { getAllCards, type Card } from "../lib/cards";
import { getSessions } from "../lib/sessions";
import { buildSections, shuffleCards, type ExploreSection } from "../lib/explore-helpers";
import { colors, spacing, fontSize, borderRadius } from "../constants/theme";

type ExploreMode = "sessions" | "shuffle";

export const ExploreScreen: React.FC = () => {
  const auth = useContext(AuthContext);
  const [sections, setSections] = useState<ExploreSection[]>([]);
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [shuffledCards, setShuffledCards] = useState<Card[]>([]);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<ExploreMode>("sessions");
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const userId = auth?.session?.user?.id;
      if (!userId) {
        setLoading(false);
        return;
      }

      let cancelled = false;

      async function fetchData() {
        setLoading(true);
        try {
          const [sessionsData, cardsData] = await Promise.all([
            getSessions(userId!),
            getAllCards(userId!),
          ]);
          if (cancelled) return;
          setSections(buildSections(sessionsData, cardsData));
          setAllCards(cardsData);
          setShuffledCards(shuffleCards(cardsData));
        } catch (err) {
          console.error("Failed to fetch explore data:", err);
        } finally {
          if (!cancelled) setLoading(false);
        }
      }

      fetchData();
      return () => { cancelled = true; };
    }, [auth?.session?.user?.id]),
  );

  const handleModePress = useCallback((pressed: ExploreMode) => {
    if (pressed === "shuffle") {
      setShuffledCards(shuffleCards(allCards));
    }
    setMode(pressed);
  }, [allCards]);

  const toggleSection = useCallback((sessionId: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  }, []);

  const displaySections = useMemo(
    () =>
      sections.map((section) =>
        collapsedIds.has(section.sessionId)
          ? { ...section, data: [] }
          : section,
      ),
    [sections, collapsedIds],
  );

  const renderCard = useCallback(
    ({ item }: { item: Card }) => (
      <View style={styles.cardWrap}>
        <FlipCard front={item.front} back={item.back} cardType={item.card_type} />
      </View>
    ),
    [],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: ExploreSection }) => {
      const isCollapsed = collapsedIds.has(section.sessionId);
      return (
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection(section.sessionId)}
          activeOpacity={0.7}
        >
          <View style={styles.sectionLeft}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.timestamp !== "" && (
              <Text style={styles.sectionTimestamp}>{section.timestamp}</Text>
            )}
          </View>
          <View style={styles.sectionRight}>
            <View style={styles.countPill}>
              <Text style={styles.countText}>{section.cardCount}</Text>
            </View>
            <Text style={styles.chevron}>{isCollapsed ? "\u25B8" : "\u25BE"}</Text>
          </View>
        </TouchableOpacity>
      );
    },
    [collapsedIds, toggleSection],
  );

  const hasCards = allCards.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>CORTEX</Text>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Explore</Text>
          {!loading && hasCards && (
            <View style={styles.headerPill}>
              <Text style={styles.headerPillText}>{allCards.length}</Text>
            </View>
          )}
        </View>
        {!loading && hasCards && (
          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[styles.modePill, mode === "sessions" && styles.modePillActive]}
              onPress={() => handleModePress("sessions")}
              activeOpacity={0.7}
            >
              <Text style={[styles.modePillText, mode === "sessions" && styles.modePillTextActive]}>
                Sessions
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modePill, mode === "shuffle" && styles.modePillActive]}
              onPress={() => handleModePress("shuffle")}
              activeOpacity={0.7}
            >
              <Text style={[styles.modePillText, mode === "shuffle" && styles.modePillTextActive]}>
                Shuffle
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !hasCards ? (
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>No cards yet</Text>
          <Text style={styles.emptyHint}>
            Record something to generate{"\n"}your first cards.
          </Text>
        </View>
      ) : mode === "sessions" ? (
        <SectionList
          sections={displaySections}
          keyExtractor={(item) => item.id}
          renderItem={renderCard}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
        />
      ) : (
        <FlatList
          data={shuffledCards}
          keyExtractor={(item) => item.id}
          renderItem={renderCard}
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
    gap: spacing.sm,
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
  headerPill: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  headerPillText: {
    fontSize: fontSize.xs,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  modeRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  modePill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceLight,
  },
  modePillActive: {
    backgroundColor: colors.primary,
  },
  modePillText: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  modePillTextActive: {
    color: colors.text,
  },
  list: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  sectionLeft: {
    flex: 1,
    marginRight: spacing.md,
    gap: 2,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: "600",
    color: colors.text,
    textTransform: "capitalize",
  },
  sectionTimestamp: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  sectionRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  countPill: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  chevron: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  cardWrap: {
    marginBottom: spacing.md,
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
