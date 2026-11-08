import type { DraftMedia, MediaItem } from "@/lib/movement/types";

const DB_NAME = "movement-media";
const STORE = "blobs";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb() {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("This browser cannot store photos or video."));
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) {
          req.result.createObjectStore(STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        dbPromise = null;
        reject(req.error ?? new Error("Could not open storage."));
      };
    });
  }
  return dbPromise;
}

function request<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>) {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = run(tx.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error("Storage failed."));
      }),
  );
}

export function putBlob(id: string, blob: Blob) {
  return request("readwrite", (store) => store.put(blob, id)).then(() => undefined);
}

export function getBlob(id: string) {
  return request<Blob | undefined>("readonly", (store) => store.get(id));
}

export function deleteBlob(id: string) {
  return request("readwrite", (store) => store.delete(id)).then(() => undefined);
}

export function clearAllBlobs() {
  return request("readwrite", (store) => store.clear()).then(() => undefined);
}

const VIDEO_CAP = 32 * 1024 * 1024;

export async function prepareImage(file: Blob) {
  try {
    return await compressImage(file);
  } catch {
    if (file.size > 8 * 1024 * 1024) {
      throw new Error("That image is too large. Try a smaller photo or link it instead.");
    }
    return file;
  }
}

export function prepareVideo(file: Blob) {
  if (file.size > VIDEO_CAP) {
    throw new Error("That video is over 32 MB. Link it from a library instead of storing it here.");
  }
  return file;
}

async function compressImage(file: Blob) {
  const bitmap = await createImageBitmap(file);
  const max = 1600;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Could not read that image.");
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
  if (!blob) throw new Error("Could not store that image.");
  return blob;
}

export async function commitMedia(initial: MediaItem[], draft: DraftMedia[]): Promise<MediaItem[]> {
  const nextIds = new Set(draft.map((item) => item.id));
  for (const item of initial) {
    if (!nextIds.has(item.id) && item.kind !== "link") {
      await deleteBlob(item.id);
    }
  }
  for (const item of draft) {
    if (item.file && item.kind !== "link") {
      await putBlob(item.id, item.file);
    }
  }
  return draft.map(({ file: _file, ...meta }) => meta);
}

export function normalizeUrl(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withProto);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function domainOf(raw: string) {
  try {
    return new URL(raw).hostname.replace(/^www\./, "");
  } catch {
    return raw;
  }
}

export function youtubeId(raw: string) {
  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return url.pathname.split("/").filter(Boolean)[0] ?? null;
    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      if (url.pathname.startsWith("/watch")) return url.searchParams.get("v");
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts[0] === "shorts" || parts[0] === "embed" || parts[0] === "live") return parts[1] ?? null;
    }
  } catch {
    return null;
  }
  return null;
}

export function blobsFor(items: MediaItem[]) {
  for (const item of items) {
    if (item.kind !== "link") void deleteBlob(item.id);
  }
}
