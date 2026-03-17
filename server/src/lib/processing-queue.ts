import PQueue from "p-queue";
import { extractConcepts } from "../services/claude";
import {
  writeConceptsAndCards,
  updateSessionStatus,
  clearSessionData,
} from "../services/recording";

const queue = new PQueue({ concurrency: 2 });

export function enqueueProcessing(
  userId: string,
  sessionId: string,
  transcript: string,
): void {
  queue
    .add(() => processJob(userId, sessionId, transcript))
    .catch(() => {
      // Error handled inside processJob
    });
}

async function processJob(
  userId: string,
  sessionId: string,
  transcript: string,
  attempt = 1,
): Promise<void> {
  try {
    const concepts = await extractConcepts(transcript);
    await writeConceptsAndCards(userId, sessionId, concepts);
    await updateSessionStatus(sessionId, "complete");
    console.log(
      `Session ${sessionId} processed: ${concepts.length} concepts extracted`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    if (attempt < 2) {
      console.warn(
        `Session ${sessionId} failed (attempt ${attempt}), retrying:`,
        message,
      );
      try {
        await clearSessionData(sessionId);
      } catch (cleanupErr) {
        console.error(
          `Failed to clean up session ${sessionId} before retry:`,
          cleanupErr,
        );
      }
      return processJob(userId, sessionId, transcript, attempt + 1);
    }

    console.error(
      `Session ${sessionId} failed after ${attempt} attempts:`,
      message,
    );
    try {
      await updateSessionStatus(sessionId, "failed");
    } catch (statusErr) {
      console.error(
        `Failed to mark session ${sessionId} as failed:`,
        statusErr,
      );
    }
  }
}
