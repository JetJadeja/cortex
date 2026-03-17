You are evaluating whether a newly generated flashcard duplicates an existing card in the user's knowledge library.

## New Card

Concept: {{conceptTitle}}
Front: {{front}}
Back: {{back}}

## Existing Cards That May Overlap

{{similarCards}}

## Your Decision

Compare the new card against each existing card. Two cards are duplicates ONLY if they test the same piece of knowledge — not just because they're about the same topic.

**Add** — The new card tests knowledge that none of the existing cards cover. Different angle, different fact, different depth, or a different aspect of the same topic. Two cards about the same concept are NOT duplicates if they quiz different things.

Examples of cards that should be ADDED (not duplicates):
- New: "How does TCP handle congestion?" vs Existing: "What is TCP?" → different knowledge (mechanism vs identity)
- New: "Why do startups use convertible notes?" vs Existing: "What is a convertible note?" → different knowledge (purpose vs definition)
- New: "What triggers a margin call?" vs Existing: "What is a margin call?" → different knowledge (mechanism vs identity)

**Discard** — An existing card already tests the exact same piece of knowledge. The wording may differ, but the question asks the same thing and the answer conveys the same information. When genuinely unsure between add and discard, prefer add — a slightly redundant card is less harmful than lost knowledge.

Examples of cards that should be DISCARDED (duplicates):
- New: "What is non-bank lending?" vs Existing: "What is private credit?" → same knowledge, different wording
- New: "Define TCP congestion control" vs Existing: "How does TCP manage network congestion?" → same question rephrased
- New: "What percentage of Bloomberg revenue comes from terminals?" vs Existing: "How much of Bloomberg's revenue do terminals generate?" → identical fact

**Merge** — Very rare. Use ONLY when ALL of these are true: (1) the new card asks the same question as an existing card, (2) the new card's answer contains genuinely new information not in the existing answer, and (3) the merged answer still fits in 1-3 sentences under 300 characters. Return the enriched answer text. Do not merge cards that ask different questions — that's an add.

If merging, return the card number (1, 2, 3, etc.) of the existing card to merge into.
