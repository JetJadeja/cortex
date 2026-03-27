import { useCallback, useContext, useState } from "react";
import { useFocusEffect } from "expo-router";
import { AuthContext } from "../../app/_layout";
import { getAllCards, updateCard, deleteCard, type Card } from "../lib/cards";
import {
  getSessions,
  updateSession,
  deleteSession,
} from "../lib/sessions";
import { buildSections, type ExploreSection } from "../lib/explore-helpers";

interface ExploreCache {
  sections: ExploreSection[];
  allCards: Card[];
  userId: string;
}

let cache: ExploreCache | null = null;

function updateCache(sections: ExploreSection[], allCards: Card[], userId: string) {
  cache = { sections, allCards, userId };
}

async function fetchExploreData(userId: string) {
  const [sessions, cards] = await Promise.all([
    getSessions(userId),
    getAllCards(userId),
  ]);
  return { sections: buildSections(sessions, cards), allCards: cards };
}

export function useExploreData() {
  const auth = useContext(AuthContext);
  const userId = auth?.session?.user?.id ?? null;

  const hasCacheHit = cache !== null && cache.userId === userId;

  const [sections, setSections] = useState<ExploreSection[]>(
    hasCacheHit ? cache!.sections : [],
  );
  const [allCards, setAllCards] = useState<Card[]>(
    hasCacheHit ? cache!.allCards : [],
  );
  const [loading, setLoading] = useState(!hasCacheHit);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(
    () => new Set(hasCacheHit ? cache!.sections.map((s) => s.sessionId) : []),
  );

  const applyFetchResult = useCallback(
    (result: { sections: ExploreSection[]; allCards: Card[] }, uid: string, isFirstLoad: boolean) => {
      setSections(result.sections);
      setAllCards(result.allCards);
      updateCache(result.sections, result.allCards, uid);
      if (isFirstLoad) {
        setCollapsedIds(new Set(result.sections.map((s) => s.sessionId)));
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      if (!userId) {
        setLoading(false);
        return;
      }

      let cancelled = false;
      const isCacheHit = cache !== null && cache.userId === userId;

      if (isCacheHit) {
        setSections(cache!.sections);
        setAllCards(cache!.allCards);
        setLoading(false);

        fetchExploreData(userId).then((result) => {
          if (!cancelled) applyFetchResult(result, userId, false);
        }).catch((err) => console.error("Background refresh failed:", err));
      } else {
        setLoading(true);
        fetchExploreData(userId)
          .then((result) => {
            if (!cancelled) applyFetchResult(result, userId, true);
          })
          .catch((err) => console.error("Failed to fetch explore data:", err))
          .finally(() => {
            if (!cancelled) setLoading(false);
          });
      }

      return () => { cancelled = true; };
    }, [userId, applyFetchResult]),
  );

  const refresh = useCallback(async () => {
    if (!userId) return;
    setIsRefreshing(true);
    try {
      const result = await fetchExploreData(userId);
      applyFetchResult(result, userId, false);
    } catch (err) {
      console.error("Refresh failed:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, [userId, applyFetchResult]);

  const toggleSection = useCallback((sessionId: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) next.delete(sessionId);
      else next.add(sessionId);
      return next;
    });
  }, []);

  const editCard = useCallback(async (cardId: string, front: string, back: string) => {
    const updated = await updateCard(cardId, { front, back });
    const replace = (c: Card) => (c.id === cardId ? updated : c);
    setSections((prevSections) => {
      const nextSections = prevSections.map((s) => ({ ...s, data: s.data.map(replace) }));
      setAllCards((prevCards) => {
        const nextCards = prevCards.map(replace);
        if (userId) updateCache(nextSections, nextCards, userId);
        return nextCards;
      });
      return nextSections;
    });
    return updated;
  }, [userId]);

  const removeCard = useCallback(async (cardId: string) => {
    await deleteCard(cardId);
    const keep = (c: Card) => c.id !== cardId;
    setSections((prev) => {
      const next = prev
        .map((s) => ({ ...s, data: s.data.filter(keep), cardCount: s.data.filter(keep).length }))
        .filter((s) => s.data.length > 0);
      setAllCards((prevCards) => {
        const nextCards = prevCards.filter(keep);
        if (userId) updateCache(next, nextCards, userId);
        return nextCards;
      });
      return next;
    });
  }, [userId]);

  const renameSession = useCallback(async (sessionId: string, newTitle: string | null) => {
    await updateSession(sessionId, { summary: newTitle });
    const displayTitle = newTitle ?? "Untitled session";
    setSections((prevSections) => {
      const nextSections = prevSections.map((s) =>
        s.sessionId === sessionId ? { ...s, title: displayTitle } : s,
      );
      if (userId && cache) updateCache(nextSections, cache.allCards, userId);
      return nextSections;
    });
  }, [userId]);

  const removeSession = useCallback(async (sessionId: string) => {
    await deleteSession(sessionId);
    setSections((prev) => {
      const deleted = prev.find((s) => s.sessionId === sessionId);
      const deletedCardIds = new Set(deleted?.data.map((c) => c.id) ?? []);
      const next = prev.filter((s) => s.sessionId !== sessionId);
      setAllCards((prevCards) => {
        const nextCards = prevCards.filter((c) => !deletedCardIds.has(c.id));
        if (userId) updateCache(next, nextCards, userId);
        return nextCards;
      });
      setCollapsedIds((prevIds) => {
        const nextIds = new Set(prevIds);
        nextIds.delete(sessionId);
        return nextIds;
      });
      return next;
    });
  }, [userId]);

  return {
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
  };
}
