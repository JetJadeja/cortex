import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import { transcribeAudio } from "../services/deepgram";
import { extractConcepts, generateHaikuSummary } from "../services/claude";
import { createSession, updateSessionStatus, writeConceptsAndCards } from "../services/recording";

export const processRecordingRouter = Router();
processRecordingRouter.use(requireAuth);

processRecordingRouter.post("/", async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { audio, mimetype } = req.body as {
      audio: string;
      mimetype: string;
    };

    if (!audio || !mimetype) {
      res.status(400).json({ error: "Missing audio or mimetype in request body" });
      return;
    }

    // Step 1: Transcribe
    const audioBuffer = Buffer.from(audio, "base64");
    const transcription = await transcribeAudio(audioBuffer, mimetype);
    const transcript = transcription.transcript;

    // Step 2: Create session (pending)
    const sessionId = await createSession(userId, transcript);

    // Step 3: Generate haiku summary and return immediately
    const summary = await generateHaikuSummary(transcript);
    res.json({ session_id: sessionId, summary });

    // Step 4: Async processing — concept extraction + card generation + DB writes
    processAsync(userId, sessionId, transcript).catch((err) => {
      console.error(`Async processing failed for session ${sessionId}:`, err);
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error processing recording:", message);
    res.status(500).json({ error: message });
  }
});

async function processAsync(userId: string, sessionId: string, transcript: string): Promise<void> {
  try {
    const concepts = await extractConcepts(transcript);
    await writeConceptsAndCards(userId, sessionId, concepts);
    await updateSessionStatus(sessionId, "complete");
  } catch (err) {
    console.error(`Failed to process session ${sessionId}:`, err);
    await updateSessionStatus(sessionId, "failed").catch(() => {});
  }
}
