import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import { transcribeAudio } from "../services/deepgram";
import { generateRecordingSummary } from "../services/claude";
import { createSession } from "../services/recording";
import { enqueueProcessing } from "../lib/processing-queue";

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

    const audioBuffer = Buffer.from(audio, "base64");
    const transcription = await transcribeAudio(audioBuffer, mimetype);
    const transcript = transcription.transcript;

    const sessionId = await createSession(userId, transcript);

    let summary = "Building cards on your recording.";
    try {
      summary = await generateRecordingSummary(transcript);
    } catch (err) {
      console.error("Summary generation failed, using default:", err);
    }

    res.json({ session_id: sessionId, summary });

    enqueueProcessing(userId, sessionId, transcript);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error processing recording:", message);
    res.status(500).json({ error: message });
  }
});
