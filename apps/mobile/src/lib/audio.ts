import { Audio } from "expo-av";

const RECORDING_OPTIONS: Audio.RecordingOptions = {
  android: {
    extension: ".m4a",
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 128000,
  },
  ios: {
    extension: ".m4a",
    audioQuality: Audio.IOSAudioQuality.HIGH,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 128000,
    outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
  },
  web: {
    mimeType: "audio/webm",
    bitsPerSecond: 128000,
  },
};

export async function requestPermissions(): Promise<boolean> {
  const { granted } = await Audio.requestPermissionsAsync();
  return granted;
}

export async function configureAudioSession(): Promise<void> {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });
}

export async function startRecording(): Promise<Audio.Recording> {
  await configureAudioSession();
  const recording = new Audio.Recording();
  await recording.prepareToRecordAsync(RECORDING_OPTIONS);
  await recording.startAsync();
  return recording;
}

export async function stopRecording(recording: Audio.Recording): Promise<string | null> {
  await recording.stopAndUnloadAsync();
  return recording.getURI();
}

export async function playAudio(uri: string): Promise<Audio.Sound> {
  const { sound } = await Audio.Sound.createAsync({ uri });
  await sound.playAsync();
  return sound;
}
