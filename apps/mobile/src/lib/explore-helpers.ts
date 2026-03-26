import type { Card } from "./cards";
import type { Session } from "./sessions";

export interface ExploreSection {
  sessionId: string;
  title: string;
  cardCount: number;
  timestamp: string;
  data: Card[];
}

export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function buildSections(sessions: Session[], cards: Card[]): ExploreSection[] {
  const cardsBySession = new Map<string, Card[]>();
  const ungrouped: Card[] = [];

  for (const card of cards) {
    if (!card.session_id) {
      ungrouped.push(card);
      continue;
    }
    const list = cardsBySession.get(card.session_id);
    if (list) {
      list.push(card);
    } else {
      cardsBySession.set(card.session_id, [card]);
    }
  }

  const sessionMap = new Map(sessions.map((s) => [s.id, s]));
  const sections: ExploreSection[] = [];

  for (const session of sessions) {
    const sessionCards = cardsBySession.get(session.id);
    if (!sessionCards || sessionCards.length === 0) continue;

    sections.push({
      sessionId: session.id,
      title: session.summary ?? "Untitled session",
      cardCount: sessionCards.length,
      timestamp: formatRelativeDate(session.created_at),
      data: sessionCards,
    });
  }

  for (const [sessionId, sessionCards] of cardsBySession) {
    if (!sessionMap.has(sessionId)) {
      ungrouped.push(...sessionCards);
    }
  }

  if (ungrouped.length > 0) {
    sections.push({
      sessionId: "ungrouped",
      title: "Ungrouped",
      cardCount: ungrouped.length,
      timestamp: "",
      data: ungrouped,
    });
  }

  return sections;
}

export function formatTimeAgo(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  if (!Number.isFinite(ms)) return "unknown";
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

export function formatDueIn(dueAt: string): string {
  const parts = dueAt.slice(0, 10).split("-").map(Number);
  if (parts.length < 3 || parts.some((n) => !Number.isFinite(n))) return "unknown";
  const dueLocal = new Date(parts[0], parts[1] - 1, parts[2]);
  const now = new Date();
  const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((dueLocal.getTime() - todayLocal.getTime()) / 86_400_000);
  if (days < -1) return `overdue by ${Math.abs(days)}d`;
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days < 30) return `in ${days}d`;
  const months = Math.round(days / 30);
  if (months < 12) return `in ${months}mo`;
  const years = Math.round(months / 12);
  return `in ${years}y`;
}

export function shuffleCards(cards: Card[]): Card[] {
  const shuffled = [...cards];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
