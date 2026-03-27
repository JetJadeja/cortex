import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  RefreshControl,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthContext } from "../../app/_layout";
import { FlipCard } from "../components/FlipCard";
import { CardInfoModal } from "../components/CardInfoModal";
import { SessionActionModal } from "../components/SessionActionModal";
import { useExploreData } from "../hooks/useExploreData";
import type { Card } from "../lib/cards";
import { getHistoryForCard } from "../lib/review-history";
import type { ExploreSection } from "../lib/explore-helpers";
import { searchCards, type SearchResult } from "../lib/search";
import { colors, fontFamily, spacing, fontSize, borderRadius } from "../constants/theme";

const SEARCH_DEBOUNCE_MS = 300;
const MIN_SEARCH_LENGTH = 2;

export const ExploreScreen: React.FC = () => {
  const auth = useContext(AuthContext);
  const {
    sections,
    allCards,
    loading,
    isRefreshing,
    refresh,
    collapsedIds,
    toggleSection,
    editCard,
    removeCard,
    renameSession,
    removeSession,
  } = useExploreData();

  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [lastReviewed, setLastReviewed] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedSession, setSelectedSession] = useState<ExploreSection | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchGenRef = useRef(0);

  const token = auth?.session?.access_token;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = searchQuery.trim();
    if (trimmed.length < MIN_SEARCH_LENGTH) {
      ++searchGenRef.current;
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const gen = ++searchGenRef.current;

    debounceRef.current = setTimeout(async () => {
      if (!token) return;
      try {
        const results = await searchCards(trimmed, token);
        if (searchGenRef.current !== gen) return;
        setSearchResults(results);
      } catch (err) {
        console.error("Search failed:", err);
        if (searchGenRef.current === gen) setSearchResults([]);
      } finally {
        if (searchGenRef.current === gen) setIsSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, token]);

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
      const updated = await editCard(cardId, front, back);
      setSelectedCard(updated);
    } catch (err) {
      console.error("Failed to update card:", err);
    }
  }, [editCard]);

  const handleDelete = useCallback(async (cardId: string) => {
    try {
      await removeCard(cardId);
      setSelectedCard(null);
    } catch (err) {
      console.error("Failed to delete card:", err);
    }
  }, [removeCard]);

  const handleSessionLongPress = useCallback((section: ExploreSection) => {
    if (section.sessionId === "ungrouped") return;
    setSelectedSession(section);
  }, []);

  const handleSessionRename = useCallback(async (sessionId: string, newTitle: string | null) => {
    try {
      await renameSession(sessionId, newTitle);
      setSelectedSession(null);
    } catch (err) {
      console.error("Failed to rename session:", err);
      throw err;
    }
  }, [renameSession]);

  const handleSessionDelete = useCallback(async (sessionId: string) => {
    try {
      await removeSession(sessionId);
      setSelectedSession(null);
    } catch (err) {
      console.error("Failed to delete session:", err);
      throw err;
    }
  }, [removeSession]);

  const displaySections = useMemo(() => {
    let filtered = sections;

    if (searchResults !== null) {
      const matchedCardIds = new Set(searchResults.map((r) => r.card_id));
      const similarityByCard = new Map(searchResults.map((r) => [r.card_id, r.similarity]));

      filtered = sections
        .filter((s) => s.data.some((c) => matchedCardIds.has(c.id)))
        .sort((a, b) => {
          const maxA = Math.max(...a.data.map((c) => similarityByCard.get(c.id) ?? 0));
          const maxB = Math.max(...b.data.map((c) => similarityByCard.get(c.id) ?? 0));
          return maxB - maxA;
        });
    }

    return filtered.map((section) =>
      collapsedIds.has(section.sessionId)
        ? { ...section, data: [] }
        : section,
    );
  }, [sections, collapsedIds, searchResults]);

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
      const isRealSession = section.sessionId !== "ungrouped";
      return (
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection(section.sessionId)}
          onLongPress={isRealSession ? () => handleSessionLongPress(section) : undefined}
          activeOpacity={0.7}
          accessibilityHint={isRealSession ? "Long press for session options" : undefined}
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
            <Feather
              name={isCollapsed ? "chevron-right" : "chevron-down"}
              size={16}
              color={colors.textMuted}
            />
          </View>
        </TouchableOpacity>
      );
    },
    [collapsedIds, toggleSection, handleSessionLongPress],
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
          <View style={styles.searchRow}>
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
            {isSearching && (
              <ActivityIndicator
                size="small"
                color={colors.primary}
                style={styles.searchSpinner}
              />
            )}
          </View>
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
      ) : searchResults !== null && displaySections.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>No matches</Text>
          <Text style={styles.emptyHint}>
            Try a different search term.
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
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refresh}
              tintColor={colors.primary}
            />
          }
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
      <SessionActionModal
        session={selectedSession}
        visible={selectedSession !== null}
        onRename={handleSessionRename}
        onDelete={handleSessionDelete}
        onClose={() => setSelectedSession(null)}
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
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 11,
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
    fontFamily: fontFamily.serifBold,
    fontSize: 28,
    color: colors.text,
  },
  headerPill: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  headerPillText: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  searchWrap: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  searchRow: {
    position: "relative",
    justifyContent: "center",
  },
  searchInput: {
    fontFamily: fontFamily.sans,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    paddingRight: 40,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  searchSpinner: {
    position: "absolute",
    right: spacing.md,
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
    fontFamily: fontFamily.serif,
    fontSize: fontSize.md,
    color: colors.text,
    textTransform: "capitalize",
  },
  sectionTimestamp: {
    fontFamily: fontFamily.sans,
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
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 11,
    color: colors.textSecondary,
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
    fontFamily: fontFamily.serifBold,
    fontSize: fontSize.lg,
    color: colors.textSecondary,
  },
  emptyHint: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
  },
});
