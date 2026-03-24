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

export function shuffleCards(cards: Card[]): Card[] {
  const shuffled = [...cards];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
