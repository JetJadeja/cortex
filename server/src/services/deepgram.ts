import { createClient, DeepgramClient } from "@deepgram/sdk";

let deepgram: DeepgramClient | null = null;

function getClient(): DeepgramClient {
  if (!deepgram) {
    const key = process.env.DEEPGRAM_API_KEY;
    if (!key) throw new Error("DEEPGRAM_API_KEY is not set");
    deepgram = createClient(key);
  }
  return deepgram;
}

interface TranscriptionResult {
  transcript: string;
  confidence: number;
  words: Array<{
    word: string;
    start: number;
    end: number;
    confidence: number;
  }>;
}

export async function transcribeAudio(audioBuffer: Buffer, mimetype: string): Promise<TranscriptionResult> {
  const { result } = await getClient().listen.prerecorded.transcribeFile(audioBuffer, {
    model: "nova-2",
    language: "en",
    smart_format: true,
    punctuate: true,
    diarize: true,
    mimetype,
  });

  if (!result) throw new Error("Deepgram returned no result");
  const channel = result.results.channels[0];
  const alternative = channel.alternatives[0];

  return {
    transcript: alternative.transcript,
    confidence: alternative.confidence,
    words: alternative.words.map((w) => ({
      word: w.word,
      start: w.start,
      end: w.end,
      confidence: w.confidence,
    })),
  };
}
