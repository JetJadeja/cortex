import { useState, useCallback, useContext, useEffect, useRef } from "react";
import { api } from "../lib/api";
import { emitDueCount } from "../lib/due-count";
import { AuthContext } from "../../app/_layout";

type ReviewState = "loading" | "active" | "done" | "browse" | "empty";

interface CardItem {
  type: "card";
  card_id: string;
  concept_id: string;
  front: string;
  back: string;
}

interface QuizItem {
  type: "quiz";
  quiz_id: string;
  concept_id: string;
  question: string;
  quiz_type: string;
}

type ReviewItem = CardItem | QuizItem;

interface QuizResult {
  score: number;
  feedback: string;
}

interface AdvanceResponse {
  state: "active" | "done" | "browse" | "empty";
  remaining: number;
  due_count?: number;
  attempt_id: string | null;
  item: ReviewItem | null;
  message?: string;
  quiz_result?: QuizResult;
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
  quizResult: QuizResult | null;
  start: () => Promise<void>;
  submitRating: (confidence: number, effort: boolean) => Promise<void>;
  submitQuizAnswer: (audio: string, mimetype: string) => Promise<void>;
  clearQuizResult: () => void;
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
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);

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
      const newDueCount = res.due_count ?? res.remaining;
      setDueCount(newDueCount);
      emitDueCount(newDueCount);
      setMessage(res.message ?? null);
      setQuizResult(res.quiz_result ?? null);
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

  useEffect(() => {
    if (token && !hasStarted.current) {
      hasStarted.current = true;
      start();
    }
  }, [token, start]);

  const submitRating = useCallback(async (confidence: number, effort: boolean) => {
    if (!item || item.type !== "card" || isSubmitting) return;
    setQuizResult(null);
    await advance({
      action: "rate",
      card_id: item.card_id,
      concept_id: item.concept_id,
      confidence,
      effort,
    });
  }, [advance, item, isSubmitting]);

  const submitQuizAnswer = useCallback(async (audio: string, mimetype: string) => {
    if (!item || item.type !== "quiz" || isSubmitting) return;
    await advance({
      action: "quiz_rate",
      quiz_id: item.quiz_id,
      audio,
      mimetype,
    });
  }, [advance, item, isSubmitting]);

  const clearQuizResult = useCallback(() => {
    setQuizResult(null);
  }, []);

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
    quizResult,
    start,
    submitRating,
    submitQuizAnswer,
    clearQuizResult,
    startBrowsing,
    nextBrowseCard,
  };
}
