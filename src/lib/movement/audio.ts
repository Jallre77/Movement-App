let ctx: AudioContext | null = null;

export function unlockAudio() {
  if (typeof window === "undefined") return;
  const AC = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  ctx = ctx ?? new AC();
  if (ctx.state === "suspended") void ctx.resume();
}

export function beep(kind: "phase" | "done") {
  if (!ctx || ctx.state !== "running") return;
  const now = ctx.currentTime;
  tone(880, now, kind === "done" ? 0.12 : 0.09);
  if (kind === "done") tone(660, now + 0.14, 0.18);
}

function tone(freq: number, when: number, length: number) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  osc.connect(gain);
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(0.06, when + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + length);
  osc.start(when);
  osc.stop(when + length + 0.02);
}
