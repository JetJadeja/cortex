import React, { useCallback, useContext, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { AuthContext } from "../../app/_layout";
import { FlipCard } from "../components/FlipCard";
import { CardInfoModal } from "../components/CardInfoModal";
import { getAllCards, updateCard, deleteCard, type Card } from "../lib/cards";
import { getHistoryForCard } from "../lib/review-history";
import { getSessions } from "../lib/sessions";
import { buildSections, type ExploreSection } from "../lib/explore-helpers";
import { colors, spacing, fontSize, borderRadius } from "../constants/theme";

export const ExploreScreen: React.FC = () => {
  const auth = useContext(AuthContext);
  const [sections, setSections] = useState<ExploreSection[]>([]);
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [lastReviewed, setLastReviewed] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const selectedIdRef = useRef<string | null>(null);

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
          const built = buildSections(sessionsData, cardsData);
          setSections(built);
          setAllCards(cardsData);
          setCollapsedIds(new Set(built.map((s) => s.sessionId)));
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

  const handleLongPress = useCallback(async (card: Card) => {
    selectedIdRef.current = card.id;
    setSelectedCard(card);
    setLastReviewed(null);
    try {
      const history = await getHistoryForCard(card.id);
      if (selectedIdRef.current !== card.id) return;
      setLastReviewed(history[0]?.created_at ?? null);
    } catch {
      // Non-critical — modal still shows without last reviewed
    }
  }, []);

  const handleEdit = useCallback(async (cardId: string, front: string, back: string) => {
    try {
      const updated = await updateCard(cardId, { front, back });
      const replace = (c: Card) => (c.id === cardId ? updated : c);
      setAllCards((prev) => prev.map(replace));
      setSections((prev) =>
        prev.map((s) => ({ ...s, data: s.data.map(replace) })),
      );
      setSelectedCard(updated);
    } catch (err) {
      console.error("Failed to update card:", err);
    }
  }, []);

  const handleDelete = useCallback(async (cardId: string) => {
    try {
      await deleteCard(cardId);
      const remove = (c: Card) => c.id !== cardId;
      setAllCards((prev) => prev.filter(remove));
      setSections((prev) =>
        prev
          .map((s) => ({ ...s, data: s.data.filter(remove), cardCount: s.data.filter(remove).length }))
          .filter((s) => s.data.length > 0),
      );
      setSelectedCard(null);
    } catch (err) {
      console.error("Failed to delete card:", err);
    }
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
        <FlipCard
          front={item.front}
          back={item.back}
          cardType={item.card_type}
          onLongPress={() => handleLongPress(item)}
        />
      </View>
    ),
    [handleLongPress],
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
      </View>

      {!loading && hasCards && (
        <View style={styles.searchWrap}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search cards..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>
      )}

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
      ) : (
        <SectionList
          sections={displaySections}
          keyExtractor={(item) => item.id}
          renderItem={renderCard}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
        />
      )}
      <CardInfoModal
        card={selectedCard}
        visible={selectedCard !== null}
        lastReviewed={lastReviewed}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onClose={() => setSelectedCard(null)}
      />
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
    paddingBottom: spacing.md,
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
  searchWrap: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  list: {
    paddingTop: spacing.sm,
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
