import { useState, useRef, useCallback, useEffect } from "react";
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
} from "expo-audio";
import { requestPermissions, configureAudioSession } from "../lib/audio";

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
  const recorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    isMeteringEnabled: true,
    numberOfChannels: 1,
  });
  const recorderState = useAudioRecorderState(recorder, 40);

  const [isRecording, setIsRecording] = useState(false);
  const [uri, setUri] = useState<string | null>(null);
  const [levels, setLevels] = useState<number[]>([]);

  const levelsRef = useRef<number[]>([]);
  const lastMeteringRef = useRef(0);
  const currentMeteringRef = useRef(0);
  const meteringTimestampRef = useRef(0);
  const rafRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRecordingRef = useRef(false);

  useEffect(() => {
    if (isRecordingRef.current && recorderState.metering !== undefined) {
      lastMeteringRef.current = currentMeteringRef.current;
      currentMeteringRef.current = Math.max(0, Math.min(1, (recorderState.metering + 45) / 45));
      meteringTimestampRef.current = Date.now();
    }
  }, [recorderState.metering]);

  const tick = useCallback(() => {
    if (!isRecordingRef.current) return;

    const elapsed = Date.now() - meteringTimestampRef.current;
    const t = Math.min(1, elapsed / 80);
    const lerped =
      lastMeteringRef.current +
      (currentMeteringRef.current - lastMeteringRef.current) * t;

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

    await configureAudioSession();

    setUri(null);
    levelsRef.current = [];
    setLevels([]);
    lastMeteringRef.current = 0;
    currentMeteringRef.current = 0;
    meteringTimestampRef.current = Date.now();

    await recorder.prepareToRecordAsync();
    recorder.record();
    isRecordingRef.current = true;
    setIsRecording(true);

    rafRef.current = setTimeout(tick, FRAME_MS);
  }, [recorder, tick]);

  const stop = useCallback(async () => {
    isRecordingRef.current = false;
    if (rafRef.current) {
      clearTimeout(rafRef.current);
      rafRef.current = null;
    }

    await recorder.stop();
    const recordingUri = recorder.uri;
    setIsRecording(false);
    setUri(recordingUri);
    return recordingUri;
  }, [recorder]);

  const reset = useCallback(() => {
    setUri(null);
    levelsRef.current = [];
    setLevels([]);
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current) clearTimeout(rafRef.current);
    };
  }, []);

  return {
    isRecording,
    durationMs: recorderState.durationMillis,
    uri,
    levels,
    start,
    stop,
    reset,
  };
}
