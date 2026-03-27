import { api, NetworkError, ApiError } from "./api";
import { getManifest, getAudioFile, dequeue } from "./offline-queue";

type TokenGetter = () => Promise<string | null>;

let isDraining = false;

export async function drainQueue(getToken: TokenGetter): Promise<void> {
  if (isDraining) return;
  isDraining = true;

  try {
    const entries = getManifest();
    if (entries.length === 0) return;

    const token = await getToken();
    if (!token) return;

    for (const entry of entries) {
      const audioFile = getAudioFile(entry);
      if (!audioFile.exists) {
        await dequeue(entry.id);
        continue;
      }

      let uploaded = false;
      let retries = 0;
      const maxRetries = 2;

      while (!uploaded && retries <= maxRetries) {
        try {
          const base64 = await audioFile.base64();
          await api.post(
            "/process-recording",
            { audio: base64, mimetype: entry.mimetype },
            token,
          );
          uploaded = true;
        } catch (err) {
          if (err instanceof NetworkError) {
            return; // Still offline — stop entire drain
          }
          if (err instanceof ApiError) {
            if (err.status === 401 || err.status === 403 || err.status === 429) {
              return; // Auth or rate limit — stop drain
            }
            // Server error (5xx) — retry
            retries++;
            if (retries > maxRetries) break; // Skip this item, leave in queue
          } else {
            // Unknown error — skip item, leave in queue
            break;
          }
        }
      }

      if (uploaded) {
        await dequeue(entry.id);
      }
    }
  } finally {
    isDraining = false;
  }
}
