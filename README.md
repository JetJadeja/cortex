# Cortex

Voice-first knowledge retention. Record yourself explaining what you just learned, and Cortex turns it into spaced repetition cards automatically.

## Why

You read constantly — newsletters, books, articles, tweets — but retain almost none of it. The gap isn't input, it's retention. Cortex fixes that: explain something out loud, and AI extracts the concepts and generates review cards. If you can't explain it clearly, you didn't understand it.

## How It Works

1. **Record** — Open the app, tap record, explain what you learned. One topic or many — AI separates them.
2. **Review** — Daily spaced repetition queue powered by FSRS. Flashcards, voice-answer cards, and quizzes.
3. **Explore** — Searchable knowledge library grouped by recording session.

## Stack

- **Mobile** — React Native + Expo
- **Server** — Express on Node.js
- **Database** — Supabase (Postgres + pgvector + auth)
- **AI** — Claude (concept extraction, card generation, review evaluation), Deepgram (transcription), OpenAI (embeddings)

## Development

```bash
# Install dependencies
bun install

# Start everything (mobile + server)
bun run dev
```

Requires a `.env` in `apps/mobile/` and `server/` with Supabase, Anthropic, Deepgram, and OpenAI keys.

## Structure

```
apps/mobile/    React Native app (Expo Router)
server/         Express API (AI processing + review engine)
supabase/       Migrations and seed data
```
