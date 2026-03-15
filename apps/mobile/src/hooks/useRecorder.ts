import { useState, useRef, useCallback } from "react";
import { Audio } from "expo-av";
import { requestPermissions, startRecording, stopRecording } from "../lib/audio";

interface UseRecorderReturn {
  isRecording: boolean;
  durationMs: number;
  uri: string | null;
  start: () => Promise<void>;
  stop: () => Promise<string | null>;
  reset: () => void;
}

export function useRecorder(): UseRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [durationMs, setDurationMs] = useState(0);
  const [uri, setUri] = useState<string | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(async () => {
    const granted = await requestPermissions();
    if (!granted) {
      throw new Error("Microphone permission not granted");
    }

    setUri(null);
    setDurationMs(0);

    const recording = await startRecording();
    recordingRef.current = recording;
    setIsRecording(true);

    const startTime = Date.now();
    intervalRef.current = setInterval(() => {
      setDurationMs(Date.now() - startTime);
    }, 100);
  }, []);

  const stop = useCallback(async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!recordingRef.current) {
      setIsRecording(false);
      return null;
    }

    const recordingUri = await stopRecording(recordingRef.current);
    recordingRef.current = null;
    setIsRecording(false);
    setUri(recordingUri);
    return recordingUri;
  }, []);

  const reset = useCallback(() => {
    setUri(null);
    setDurationMs(0);
  }, []);

  return { isRecording, durationMs, uri, start, stop, reset };
}
