import { useState, useCallback, useContext, useEffect, useRef } from "react";
import { api } from "../lib/api";
import { AuthContext } from "../../app/_layout";

type ReviewState = "loading" | "active" | "done" | "browse" | "empty";

interface ReviewItem {
  type: "card";
  card_id: string;
  concept_id: string;
  front: string;
  back: string;
}

interface AdvanceResponse {
  state: "active" | "done" | "browse" | "empty";
  remaining: number;
  due_count?: number;
  attempt_id: string | null;
  item: ReviewItem | null;
  message?: string;
}

export interface UseReviewReturn {
  state: ReviewState;
  item: ReviewItem | null;
  attemptId: string | null;
  remaining: number;
  dueCount: number;
  message: string | null;
  isSubmitting: boolean;
  error: string | null;
  start: () => Promise<void>;
  submitRating: (confidence: number, effort: boolean) => Promise<void>;
  startBrowsing: () => Promise<void>;
  nextBrowseCard: () => Promise<void>;
}

export function useReview(): UseReviewReturn {
  const auth = useContext(AuthContext);
  const [state, setState] = useState<ReviewState>("loading");
  const [item, setItem] = useState<ReviewItem | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [dueCount, setDueCount] = useState(0);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = auth?.session?.access_token;

  const advance = useCallback(async (body: Record<string, unknown>) => {
    if (!token) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await api.post<AdvanceResponse>("/review/advance", body, token);
      setState(res.state);
      setItem(res.item);
      setAttemptId(res.attempt_id);
      setRemaining(res.remaining);
      setDueCount(res.due_count ?? res.remaining);
      setMessage(res.message ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Review failed");
    } finally {
      setIsSubmitting(false);
    }
  }, [token]);

  const hasStarted = useRef(false);

  const start = useCallback(async () => {
    setState("loading");
    await advance({ action: "next" });
  }, [advance]);

  // Auto-start when token becomes available (handles auth race)
  useEffect(() => {
    if (token && !hasStarted.current) {
      hasStarted.current = true;
      start();
    }
  }, [token, start]);

  const submitRating = useCallback(async (confidence: number, effort: boolean) => {
    if (!item || isSubmitting) return;
    await advance({
      action: "rate",
      card_id: item.card_id,
      concept_id: item.concept_id,
      confidence,
      effort,
    });
  }, [advance, item, isSubmitting]);

  const startBrowsing = useCallback(async () => {
    await advance({ action: "browse" });
  }, [advance]);

  const nextBrowseCard = useCallback(async () => {
    await advance({ action: "browse" });
  }, [advance]);

  return {
    state,
    item,
    attemptId,
    remaining,
    dueCount,
    message,
    isSubmitting,
    error,
    start,
    submitRating,
    startBrowsing,
    nextBrowseCard,
  };
}
