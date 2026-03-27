import { File, Directory, Paths } from "expo-file-system";
import { emitPendingCount } from "./pending-count";

export interface QueueEntry {
  id: string;
  filename: string;
  mimetype: string;
  enqueuedAt: number;
}

const queueDir = new Directory(Paths.document, "offline-queue");
const manifestFile = new File(queueDir, "manifest.json");

let manifestLock: Promise<void> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = manifestLock.then(fn, fn);
  manifestLock = next.then(() => {}, () => {});
  return next;
}

function ensureDir(): void {
  if (!queueDir.exists) {
    queueDir.create({ intermediates: true });
  }
}

function readManifest(): QueueEntry[] {
  try {
    if (!manifestFile.exists) return [];
    const raw = manifestFile.textSync();
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as QueueEntry[];
    return [];
  } catch {
    // Attempt recovery: scan directory for orphaned audio files
    try {
      return recoverFromDirectory();
    } catch {
      return [];
    }
  }
}

function recoverFromDirectory(): QueueEntry[] {
  if (!queueDir.exists) return [];
  const entries: QueueEntry[] = [];
  const listing = queueDir.list();
  for (const item of listing) {
    const uri = item.uri;
    const name = uri.split("/").pop() ?? "";
    if (!name || name === "manifest.json" || item instanceof Directory) continue;
    const id = name.replace(/\.[^.]+$/, "");
    entries.push({ id, filename: name, mimetype: "audio/m4a", enqueuedAt: 0 });
  }
  return entries;
}

function writeManifest(entries: QueueEntry[]): void {
  ensureDir();
  manifestFile.write(JSON.stringify(entries));
}

export async function enqueue(cacheUri: string, mimetype: string): Promise<QueueEntry> {
  return withLock(async () => {
    ensureDir();
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const filename = `${id}.m4a`;
    const dest = new File(queueDir, filename);

    const source = new File(cacheUri);
    source.copy(dest);

    const entry: QueueEntry = { id, filename, mimetype, enqueuedAt: Date.now() };
    const manifest = readManifest();
    manifest.push(entry);
    writeManifest(manifest);

    emitPendingCount(manifest.length);
    return entry;
  });
}

export async function dequeue(id: string): Promise<void> {
  return withLock(async () => {
    const manifest = readManifest();
    const updated = manifest.filter((e) => e.id !== id);
    writeManifest(updated);

    try {
      const entry = manifest.find((e) => e.id === id);
      if (entry) {
        const audioFile = new File(queueDir, entry.filename);
        if (audioFile.exists) audioFile.delete();
      }
    } catch {
      // Audio file already gone — fine
    }

    emitPendingCount(updated.length);
  });
}

export function getQueueSize(): number {
  return readManifest().length;
}

export function getManifest(): QueueEntry[] {
  return readManifest();
}

export function getAudioFile(entry: QueueEntry): File {
  return new File(queueDir, entry.filename);
}
