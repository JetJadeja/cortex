import {
  setAudioModeAsync,
  requestRecordingPermissionsAsync,
} from "expo-audio";

export async function requestPermissions(): Promise<boolean> {
  const { granted } = await requestRecordingPermissionsAsync();
  return granted;
}

export async function configureAudioSession(): Promise<void> {
  await setAudioModeAsync({
    allowsRecording: true,
    playsInSilentMode: true,
  });
}
