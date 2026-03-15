import { Router, Request, Response } from "express";
import { transcribeAudio } from "../services/deepgram";
import { processTranscript } from "../services/claude";

export const processTranscriptRouter = Router();

processTranscriptRouter.post("/", async (req: Request, res: Response) => {
  try {
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
    const processed = await processTranscript(transcription.transcript);

    res.json({
      transcription: {
        text: transcription.transcript,
        confidence: transcription.confidence,
      },
      processed,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error processing transcript:", message);
    res.status(500).json({ error: message });
  }
});
