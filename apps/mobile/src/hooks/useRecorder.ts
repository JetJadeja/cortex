import { useState, useRef, useCallback, useEffect } from "react";
import { Audio, AVPlaybackStatus } from "expo-av";
import { requestPermissions, startRecording, stopRecording } from "../lib/audio";

const MAX_LEVELS = 80;
const FRAME_MS = 25;

interface UseRecorderReturn {
  isRecording: boolean;
  durationMs: number;
  uri: string | null;
  levels: number[];
  start: () => Promise<void>;
  stop: () => Promise<string | null>;
  reset: () => void;
}

export function useRecorder(): UseRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [durationMs, setDurationMs] = useState(0);
  const [uri, setUri] = useState<string | null>(null);
  const [levels, setLevels] = useState<number[]>([]);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const levelsRef = useRef<number[]>([]);
  const lastMeteringRef = useRef(0);
  const currentMeteringRef = useRef(0);
  const meteringTimestampRef = useRef(0);
  const rafRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRecordingRef = useRef(false);

  const onStatus = useCallback((status: AVPlaybackStatus & { metering?: number; durationMillis?: number; isRecording?: boolean }) => {
    const s = status as unknown as { isRecording?: boolean; durationMillis?: number; metering?: number };
    if (s.isRecording) {
      if (s.durationMillis !== undefined) {
        setDurationMs(s.durationMillis);
      }
      if (s.metering !== undefined) {
        lastMeteringRef.current = currentMeteringRef.current;
        currentMeteringRef.current = Math.max(0, Math.min(1, (s.metering + 45) / 45));
        meteringTimestampRef.current = Date.now();
      }
    }
  }, []);

  const tick = useCallback(() => {
    if (!isRecordingRef.current) return;

    const elapsed = Date.now() - meteringTimestampRef.current;
    const t = Math.min(1, elapsed / 80);
    const lerped = lastMeteringRef.current + (currentMeteringRef.current - lastMeteringRef.current) * t;

    const arr = levelsRef.current;
    arr.push(lerped);
    if (arr.length > MAX_LEVELS) {
      arr.shift();
    }
    levelsRef.current = arr;
    setLevels([...arr]);

    rafRef.current = setTimeout(tick, FRAME_MS);
  }, []);

  const start = useCallback(async () => {
    const granted = await requestPermissions();
    if (!granted) {
      throw new Error("Microphone permission not granted");
    }

    setUri(null);
    setDurationMs(0);
    levelsRef.current = [];
    setLevels([]);
    lastMeteringRef.current = 0;
    currentMeteringRef.current = 0;
    meteringTimestampRef.current = Date.now();

    const recording = await startRecording();
    recording.setOnRecordingStatusUpdate(onStatus as (status: Audio.RecordingStatus) => void);
    recording.setProgressUpdateInterval(40);
    recordingRef.current = recording;
    isRecordingRef.current = true;
    setIsRecording(true);

    rafRef.current = setTimeout(tick, FRAME_MS);
  }, [onStatus, tick]);

  const stop = useCallback(async () => {
    isRecordingRef.current = false;
    if (rafRef.current) {
      clearTimeout(rafRef.current);
      rafRef.current = null;
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
    levelsRef.current = [];
    setLevels([]);
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current) clearTimeout(rafRef.current);
    };
  }, []);

  return { isRecording, durationMs, uri, levels, start, stop, reset };
}
