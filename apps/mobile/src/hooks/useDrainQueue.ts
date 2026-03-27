import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { supabase } from "../lib/supabase";
import { onPendingCount, emitPendingCount } from "../lib/pending-count";
import { getQueueSize } from "../lib/offline-queue";
import { drainQueue } from "../lib/drain-queue";

const RETRY_INTERVAL_MS = 30_000;

async function getToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export function useDrainQueue(): { pendingCount: number } {
  const [pendingCount, setPendingCount] = useState(0);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return onPendingCount(setPendingCount);
  }, []);

  useEffect(() => {
    const size = getQueueSize();
    emitPendingCount(size);
  }, []);

  useEffect(() => {
    function tryDrain() {
      drainQueue(getToken).then(() => {
        const remaining = getQueueSize();
        if (remaining > 0) {
          retryRef.current = setTimeout(tryDrain, RETRY_INTERVAL_MS);
        }
      }).catch(() => {});
    }

    tryDrain();

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        if (retryRef.current) clearTimeout(retryRef.current);
        tryDrain();
      }
    });

    return () => {
      if (retryRef.current) clearTimeout(retryRef.current);
      sub.remove();
    };
  }, []);

  return { pendingCount };
}
