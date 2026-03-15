import { createClient } from "@deepgram/sdk";

const deepgram = createClient(process.env.DEEPGRAM_API_KEY ?? "");

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
  const { result } = await deepgram.listen.prerecorded.transcribeFile(audioBuffer, {
    model: "nova-2",
    language: "en",
    smart_format: true,
    punctuate: true,
    diarize: true,
    mimetype,
  });

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
