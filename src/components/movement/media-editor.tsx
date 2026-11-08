import * as Dialog from "@radix-ui/react-dialog";
import { Camera, Link2, Trash2, Video, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button, Input } from "@/components/ui";
import { domainOf, normalizeUrl, prepareImage, prepareVideo, youtubeId } from "@/lib/movement/media";
import type { DraftMedia, MediaItem } from "@/lib/movement/types";
import { getBlob } from "@/lib/movement/media";
import { uid } from "@/lib/movement/time";

const RECORD_LIMIT = 45;

export function MediaEditor({
  initial,
  onChange,
}: {
  initial: MediaItem[];
  onChange: (items: DraftMedia[]) => void;
}) {
  const [items, setItems] = useState<DraftMedia[]>(() => initial.map((item) => ({ ...item })));
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState("");
  const [label, setLabel] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  function update(next: DraftMedia[]) {
    setItems(next);
    onChange(next);
  }

  useEffect(() => {
    onChange(items);
    // Report the initial draft once; later edits go through update().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addImage(file: Blob) {
    setError(null);
    try {
      const prepared = await prepareImage(file);
      update([
        ...items,
        { id: uid("med"), kind: "image", name: "Photo", mime: prepared.type || "image/jpeg", file: prepared },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add that photo.");
    }
  }

  async function addVideo(file: Blob, name = "Video") {
    setError(null);
    try {
      const prepared = prepareVideo(file);
      update([
        ...items,
        { id: uid("med"), kind: "video", name, mime: prepared.type || "video/webm", file: prepared },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add that video.");
    }
  }

  function addLink() {
    const url = normalizeUrl(link);
    if (!url) {
      setError("Enter a full link, like a video in your exercise library.");
      return;
    }
    update([...items, { id: uid("med"), kind: "link", name: label.trim() || domainOf(url), url }]);
    setLink("");
    setLabel("");
    setError(null);
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => setCameraOpen(true)}>
          <Camera className="size-4" aria-hidden="true" />
          Camera
        </Button>
        <Button variant="secondary" onClick={() => photoRef.current?.click()}>
          Upload photo
        </Button>
        <Button variant="secondary" onClick={() => videoRef.current?.click()}>
          Upload video
        </Button>
      </div>
      <input
        ref={photoRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void addImage(file);
        }}
      />
      <input
        ref={videoRef}
        type="file"
        accept="video/*"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void addVideo(file);
        }}
      />
      <div className="grid gap-2 sm:grid-cols-[1fr_9rem_auto]">
        <Input
          value={link}
          onChange={(event) => setLink(event.target.value)}
          placeholder="Link to a video or library"
          inputMode="url"
          aria-label="Media link"
        />
        <Input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Label"
          aria-label="Link label"
        />
        <Button variant="secondary" onClick={addLink}>
          <Link2 className="size-4" aria-hidden="true" />
          Add link
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      {items.length > 0 ? (
        <ul className="grid gap-3">
          {items.map((item) => (
            <li key={item.id} className="overflow-hidden rounded-md border border-line bg-surface">
              <MediaPreview item={item} />
              <div className="flex items-center justify-between gap-3 px-3 py-2">
                <p className="min-w-0 truncate text-sm">{item.name}</p>
                <button
                  type="button"
                  className="inline-flex size-11 items-center justify-center text-danger"
                  aria-label={`Remove ${item.name}`}
                  onClick={() => update(items.filter((entry) => entry.id !== item.id))}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Nothing attached yet. A photo, a short clip, or a link is enough.</p>
      )}
      <CameraDialog
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        onPhoto={(blob) => void addImage(blob)}
        onVideo={(blob) => void addVideo(blob, "Recording")}
      />
    </div>
  );
}

export function MediaPreview({ item }: { item: DraftMedia }) {
  const url = usePreviewUrl(item);
  if (item.kind === "link" && item.url) {
    const videoId = youtubeId(item.url);
    return (
      <a href={item.url} target="_blank" rel="noreferrer" className="block">
        {videoId ? (
          <img
            src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
            alt=""
            className="aspect-video w-full object-cover"
          />
        ) : null}
        <span className="block px-3 pt-3 text-sm break-all underline">{item.url}</span>
      </a>
    );
  }
  if (item.kind === "image" && url) {
    return <img src={url} alt={item.name} className="aspect-video w-full object-cover" />;
  }
  if (item.kind === "video" && url) {
    return <video src={url} controls playsInline className="aspect-video w-full bg-ink" />;
  }
  return <div className="aspect-video w-full bg-bg" />;
}

function usePreviewUrl(item: DraftMedia) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (item.kind === "link") return;
    let dead = false;
    let created: string | null = null;
    const run = async () => {
      const blob = item.file ?? (await getBlob(item.id).catch(() => undefined));
      if (!blob || dead) return;
      created = URL.createObjectURL(blob);
      setUrl(created);
    };
    void run();
    return () => {
      dead = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [item]);
  return url;
}

function CameraDialog({
  open,
  onOpenChange,
  onPhoto,
  onVideo,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPhoto: (blob: Blob) => void;
  onVideo: (blob: Blob) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [ready, setReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let stopped = false;
    setMessage(null);
    setReady(false);
    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setMessage("This browser has no camera. Upload a file instead.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: true,
        });
        if (stopped) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setReady(true);
      } catch {
        setMessage("Camera access was blocked. You can still upload a file or paste a link.");
      }
    };
    void start();
    return () => {
      stopped = true;
      const rec = recorderRef.current;
      if (rec && rec.state === "recording") rec.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      recorderRef.current = null;
      setRecording(false);
      setSeconds(0);
    };
  }, [open]);

  useEffect(() => {
    if (!recording) return;
    const started = Date.now();
    const id = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - started) / 1000);
      setSeconds(elapsed);
      if (elapsed >= RECORD_LIMIT && recorderRef.current?.state === "recording") {
        recorderRef.current.stop();
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [recording]);

  function takePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onPhoto(blob);
        onOpenChange(false);
      },
      "image/jpeg",
      0.9,
    );
  }

  function toggleRecord() {
    const stream = streamRef.current;
    if (!stream) return;
    if (recorderRef.current && recording) {
      recorderRef.current.stop();
      return;
    }
    const types = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];
    const mimeType = types.find((type) => MediaRecorder.isTypeSupported(type));
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    chunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" });
      setRecording(false);
      if (blob.size > 0) {
        onVideo(blob);
        onOpenChange(false);
      }
    };
    recorderRef.current = recorder;
    recorder.start();
    setSeconds(0);
    setRecording(true);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40" />
        <Dialog.Content className="panel-shadow fixed inset-x-4 top-1/2 z-50 max-h-[85dvh] -translate-y-1/2 overflow-auto rounded-xl bg-surface p-4 md:inset-x-auto md:left-1/2 md:w-full md:max-w-lg md:-translate-x-1/2">
          <div className="flex items-start justify-between gap-3">
            <Dialog.Title className="font-display text-3xl">Camera</Dialog.Title>
            <Dialog.Close className="inline-flex size-11 items-center justify-center" aria-label="Close">
              <X className="size-5" />
            </Dialog.Close>
          </div>
          <p className="mt-1 text-sm text-muted">Photos save as stills. Video records up to {RECORD_LIMIT} seconds.</p>
          <div className="mt-4 overflow-hidden rounded-md bg-ink">
            <video ref={videoRef} autoPlay muted playsInline className="aspect-video w-full object-cover" />
          </div>
          {message ? (
            <p role="alert" className="mt-3 text-sm text-danger">
              {message}
            </p>
          ) : null}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button onClick={takePhoto} disabled={!ready}>
              <Camera className="size-4" aria-hidden="true" />
              Photo
            </Button>
            <Button variant={recording ? "primary" : "secondary"} onClick={toggleRecord} disabled={!ready}>
              <Video className="size-4" aria-hidden="true" />
              {recording ? `Stop ${seconds}s` : "Record"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
