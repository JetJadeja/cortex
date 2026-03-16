# Cortex

Voice-first knowledge retention app. The problem: you read constantly — newsletters (Matt Levine's Money Stuff, Stratechery), tweets, books, articles, conversations — but retain almost none of it. When someone brings up a concept in conversation, you can't retrieve it. The gap isn't input, it's retention and recall.

## How It Works

You read something, open Cortex, and explain what you just learned out loud. The app records you, transcribes it via Deepgram, and sends the transcript to Claude. Claude extracts every discrete concept and generates typed review cards. Over time you build a personal knowledge base of everything you've ever read, and spaced repetition (FSRS) ensures it sticks in long-term memory.

The voice-first mechanic is the forcing function — if you can't explain it clearly out loud, you didn't understand it, and the app catches that gap. It trains both retention and verbal articulation simultaneously.

## Three Modes

1. **Record** — Tap record, explain what you learned (one topic or many — AI separates them), stop, review generated cards, confirm. Input source can be anything: books, articles, tweets, conversations, podcasts. Post-recording transcription only (no live streaming) — shows waveform while recording, full transcript after.
2. **Review** — Daily spaced repetition queue. Cards served in priority order: previously failed → core-tagged → connection cards → everything else by due date. Mix of tap-to-reveal flashcards and voice-answer cards where Claude evaluates your spoken response. No daily cap — "due" queue is the default, but you can keep pulling cards endlessly.
3. **Explore** — Full knowledge library, searchable and browsable. Tap any concept to see its cards, linked concepts, and original transcript. "Random card" button for idle browsing. This is the phone-fidget mode.

## Data Model

- **Sessions** — each recording: id, timestamp, transcript, auto-detected source type (book/article/tweet/conversation/other), audio path.
- **Concepts** — extracted from sessions. Each has a title, explanation, and type: `definition`, `fact`, `framework`, `principle`, or `connection`. Links back to source session.
- **Cards** — generated from concepts. Types: `flashcard` (tap-reveal for terms/facts), `explain_aloud` (say it out loud, Claude scores), `scenario` (situational prompt for principles/frameworks), `connection` (how do X and Y relate?). Carries FSRS metadata: `due_at`, `stability`, `difficulty`.
- **Concept Links** — cross-session connections. After each new session, Claude checks the top ~15 most similar existing concepts and flags meaningful connections, not shallow overlaps.
- **Review History** — card_id, timestamp, response_quality (1-4), was_voice_review.

## Card Management

- Swipe left on any card → delete.
- Swipe right → re-record (opens recorder scoped to that concept, Claude regenerates cards).
- Long press → quick text edit modal (front + back fields).
- Same gestures in both Review and Explore modes.

## Stack

- **Mobile**: React Native + Expo (managed workflow)
- **Backend**: Node.js + Express on Railway
- **Database**: Supabase (Postgres + auth + real-time)
- **AI**: Claude API (concept extraction, card generation, cross-linking, review evaluation)
- **Transcription**: Deepgram REST API (post-recording, not streaming)
- **Runtime**: Bun everywhere — `bun install`, `bun run`, `bunx`. Never use npm/yarn/npx.

## Monorepo Structure

- `apps/mobile/` — Expo app (screens, components, hooks, lib)
- `apps/web/` — Future web client. Do not touch until mobile is complete.
- `server/` — Express API. Only two jobs: AI processing + review evaluation.
- `supabase/` — Migrations and seed data.

## Code Rules

- TypeScript strict mode. No `any`. No `as` casts unless truly unavoidable — add a comment explaining why.
- Functional components only. No classes. No default exports except screens.
- One component per file. File name matches export name.
- Pure functions by default. Side effects only in hooks or clearly named handlers.
- No barrel exports (`index.ts` re-exporting everything). Import from the actual file.
- Keep files under 200 lines. If a file is growing, split it — don't ask, just do it.
- No dead code. No commented-out code. Delete it; git has history.
- Error handling: explicit try/catch with typed errors. Never swallow errors silently.
- All Supabase queries go through typed helper functions in `lib/`, never raw calls in components.
- AI prompts live in `server/src/prompts/` as standalone `.md` files, never inline strings.

## Naming

- Files: `kebab-case.ts` / `PascalCase.tsx` for components.
- Variables/functions: `camelCase`. No abbreviations unless universally obvious (`id`, `url`, `db`).
- Types: `PascalCase`. Suffix with purpose: `CardType`, `ReviewSession`, `ConceptLink`.
- Booleans: prefix with `is`, `has`, `should`, `can`.
- Event handlers: prefix with `handle` in components, `on` in props.

## Testing

- Use Vitest for server tests, Jest + React Native Testing Library for mobile.
- Test business logic (FSRS algorithm, card generation parsing), not UI layout.
- Run `bun test` before committing.

## Git

- Conventional commits: `feat:`, `fix:`, `refactor:`, `chore:`.
- One logical change per commit. Small commits over big ones.

## Codex / Review Mode

This repo may be used with `codex-exec` for automated code review. When asked to review:

- Focus on logic errors, type safety gaps, and missing error handling.
- Flag any raw Supabase calls outside `lib/`.
- Flag any inline AI prompt strings outside `server/src/prompts/`.
- Flag files over 200 lines.
- Don't nitpick formatting — that's the linter's job.

## Key Architecture Decisions

- Supabase handles all CRUD. Express server only handles AI orchestration (`/process-transcript`, `/evaluate-review`).
- All data flows: mobile → Supabase for persistence, mobile → Express for AI processing.
- Spaced repetition (FSRS) runs server-side. Two tables do all the work: `cards` (FSRS state) and `review_history` (append-only log). Everything else derived at request time.
- Cross-linking uses keyword similarity against existing concepts (not embeddings for v1).
- Voice review evaluation sends audio → Deepgram → transcript → Claude for scoring.

## What Not To Build

- No concept graph visualization. A "related concepts" list is enough.
- No manual card editor screen. Long-press for quick text edit, swipe to re-record.
- No social features. No sharing. No accounts beyond basic Supabase auth.
- No widget until core loop is validated.
- No web app until mobile is complete.
