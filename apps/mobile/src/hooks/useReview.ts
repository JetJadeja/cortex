import { useState, useCallback } from "react";
import { api } from "../lib/api";

interface ReviewItem {
  id: string;
  question: string;
  answer: string;
  confidence: number;
}

interface ReviewSession {
  id: string;
  items: ReviewItem[];
  score: number | null;
}

interface UseReviewReturn {
  session: ReviewSession | null;
  currentIndex: number;
  isLoading: boolean;
  error: string | null;
  loadSession: (recordingId: string) => Promise<void>;
  submitAnswer: (itemId: string, response: string) => Promise<void>;
  nextItem: () => void;
  previousItem: () => void;
}

export function useReview(): UseReviewReturn {
  const [session, setSession] = useState<ReviewSession | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSession = useCallback(async (recordingId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.get<ReviewSession>(`/reviews/${recordingId}`);
      setSession(data);
      setCurrentIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load review session");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const submitAnswer = useCallback(async (itemId: string, response: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.post<{ score: number }>("/evaluate-review", {
        itemId,
        response,
      });
      setSession((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          items: prev.items.map((item) =>
            item.id === itemId ? { ...item, confidence: result.score } : item
          ),
        };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit answer");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const nextItem = useCallback(() => {
    setCurrentIndex((prev) =>
      session ? Math.min(prev + 1, session.items.length - 1) : prev
    );
  }, [session]);

  const previousItem = useCallback(() => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  return {
    session,
    currentIndex,
    isLoading,
    error,
    loadSession,
    submitAnswer,
    nextItem,
    previousItem,
  };
}
