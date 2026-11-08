import { differenceInCalendarDays } from "date-fns";
import type { Builder, Phase, TimerPreset, TimerState } from "@/lib/movement/types";

export function uid(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function lastPracticedNote(at: number | null, now = Date.now()) {
  if (at == null) return "No recorded sessions.";
  const days = Math.max(0, differenceInCalendarDays(now, at));
  return `Last practiced ${days} ${days === 1 ? "day" : "days"} ago.`;
}

export function latestAt(times: number[]) {
  let latest: number | null = null;
  for (const time of times) {
    if (latest == null || time > latest) latest = time;
  }
  return latest;
}

export function defaultBuilder(): Builder {
  return {
    mode: "stopwatch",
    countdownMin: 2,
    countdownSec: 0,
    prepareSec: 10,
    workSec: 20,
    restSec: 10,
    rounds: 8,
    selectedPresetId: "pre-stop",
  };
}

export function idleTimer(): TimerState {
  return {
    mode: "stopwatch",
    phases: [],
    status: "idle",
    phaseIndex: 0,
    phaseBankMs: 0,
    phaseSince: null,
    totalBankMs: 0,
    totalSince: null,
    laps: [],
    linkedPracticeId: null,
    startedAt: null,
    presetName: "Stopwatch",
  };
}

export function clamp(n: number, min: number, max: number) {
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function totalMs(timer: TimerState, now: number) {
  return timer.totalBankMs + (timer.totalSince != null ? Math.max(0, now - timer.totalSince) : 0);
}

export function phaseMs(timer: TimerState, now: number) {
  return timer.phaseBankMs + (timer.phaseSince != null ? Math.max(0, now - timer.phaseSince) : 0);
}

export function formatClock(ms: number, direction: "up" | "down" = "up") {
  const safe = Math.max(0, ms);
  const sec =
    direction === "down" ? Math.ceil(safe / 1000 - 1e-9) : Math.floor(safe / 1000);
  const clamped = Math.max(0, sec);
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = clamped % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

export function formatDuration(sec: number) {
  const s = Math.max(0, Math.round(sec));
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (m < 60) return rem ? `${m} min ${rem} s` : `${m} min`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm ? `${h} h ${rm} min` : `${h} h`;
}

export function phasesFor(preset: Pick<TimerPreset, "mode" | "seconds" | "prepareSec" | "rounds" | "blocks">): Phase[] {
  if (preset.mode === "stopwatch") return [];
  if (preset.mode === "countdown") {
    const seconds = Math.max(1, Math.round(preset.seconds));
    return [{ label: "Countdown", seconds, round: null }];
  }
  const blocks = preset.blocks.filter((b) => b.seconds > 0);
  if (blocks.length === 0) return [];
  const rounds = Math.max(1, Math.round(preset.rounds));
  const phases: Phase[] = [];
  for (let r = 1; r <= rounds; r++) {
    if (r === 1 && preset.prepareSec > 0) {
      phases.push({ label: "Prepare", seconds: Math.round(preset.prepareSec), round: null });
    }
    for (const block of blocks) {
      phases.push({ label: block.label, seconds: Math.round(block.seconds), round: r });
    }
  }
  return phases;
}

export function builderToPreset(builder: Builder, id: string, name: string, origin: TimerPreset["origin"]): TimerPreset {
  if (builder.mode === "stopwatch") {
    return {
      id,
      name,
      mode: "stopwatch",
      seconds: 0,
      prepareSec: 0,
      rounds: 1,
      blocks: [],
      origin,
    };
  }
  if (builder.mode === "countdown") {
    const seconds = clamp(builder.countdownMin, 0, 180) * 60 + clamp(builder.countdownSec, 0, 59);
    return {
      id,
      name,
      mode: "countdown",
      seconds: Math.max(1, seconds),
      prepareSec: 0,
      rounds: 1,
      blocks: [],
      origin,
    };
  }
  const blocks = [
    { label: "Work", seconds: clamp(builder.workSec, 0, 600) },
    { label: "Rest", seconds: clamp(builder.restSec, 0, 600) },
  ].filter((b) => b.seconds > 0);
  return {
    id,
    name,
    mode: "intervals",
    seconds: 0,
    prepareSec: clamp(builder.prepareSec, 0, 120),
    rounds: clamp(builder.rounds, 1, 40),
    blocks,
    origin,
  };
}

export function builderLabel(builder: Builder, presets: TimerPreset[]) {
  if (builder.selectedPresetId) {
    const found = presets.find((p) => p.id === builder.selectedPresetId);
    if (found) return found.name;
  }
  if (builder.mode === "stopwatch") return "Stopwatch";
  if (builder.mode === "countdown") return "Countdown";
  const rest = builder.restSec > 0 ? `/${builder.restSec}` : "";
  return `${builder.workSec}${rest} × ${builder.rounds}`;
}

export function applyPreset(preset: TimerPreset, base: Builder = defaultBuilder()): Builder {
  if (preset.mode === "stopwatch") {
    return { ...base, mode: "stopwatch", selectedPresetId: preset.id };
  }
  if (preset.mode === "countdown") {
    return {
      ...base,
      mode: "countdown",
      countdownMin: Math.floor(preset.seconds / 60),
      countdownSec: preset.seconds % 60,
      selectedPresetId: preset.id,
    };
  }
  const work = preset.blocks.find((b) => b.label === "Work")?.seconds ?? preset.blocks[0]?.seconds ?? 20;
  const rest = preset.blocks.find((b) => b.label === "Rest")?.seconds ?? 0;
  return {
    ...base,
    mode: "intervals",
    prepareSec: preset.prepareSec,
    workSec: work,
    restSec: rest,
    rounds: preset.rounds,
    selectedPresetId: preset.id,
  };
}

export function intervalSummary(builder: Builder) {
  const rest = builder.restSec > 0 ? ` / ${builder.restSec}s rest` : "";
  const prep = builder.prepareSec > 0 ? ` · ${builder.prepareSec}s prepare` : "";
  return `${builder.workSec}s work${rest} · ${builder.rounds} rounds${prep}`;
}

export function catchUp(timer: TimerState, now: number): { timer: TimerState; cue: "phase" | "done" | null } {
  if (timer.status !== "running" || timer.mode === "stopwatch") return { timer, cue: null };
  let next = timer;
  let cue: "phase" | "done" | null = null;
  let guard = 0;
  while (guard++ < 400) {
    const phase = next.phases[next.phaseIndex];
    if (!phase || next.phaseSince == null) break;
    const elapsed = next.phaseBankMs + (now - next.phaseSince);
    const dur = phase.seconds * 1000;
    if (elapsed < dur) break;
    const overflow = elapsed - dur;
    const upcoming = next.phaseIndex + 1;
    if (upcoming >= next.phases.length) {
      const endAt = now - overflow;
      const totalBankMs = next.totalBankMs + (next.totalSince != null ? endAt - next.totalSince : 0);
      next = {
        ...next,
        status: "complete",
        phaseBankMs: dur,
        phaseSince: null,
        totalBankMs,
        totalSince: null,
      };
      cue = "done";
      break;
    }
    next = {
      ...next,
      phaseIndex: upcoming,
      phaseBankMs: 0,
      phaseSince: now - overflow,
    };
    cue = "phase";
  }
  return { timer: next, cue };
}

export function pauseTimer(timer: TimerState, now: number): TimerState {
  if (timer.status !== "running") return timer;
  return {
    ...timer,
    status: "paused",
    totalBankMs: totalMs(timer, now),
    totalSince: null,
    phaseBankMs: phaseMs(timer, now),
    phaseSince: null,
  };
}

export function stopTimer(timer: TimerState, now: number): TimerState {
  if (timer.status !== "running" && timer.status !== "paused") return timer;
  return {
    ...timer,
    status: "complete",
    totalBankMs: totalMs(timer, now),
    totalSince: null,
    phaseBankMs: phaseMs(timer, now),
    phaseSince: null,
  };
}

export function resumeTimer(timer: TimerState, now: number): TimerState {
  if (timer.status !== "paused") return timer;
  return {
    ...timer,
    status: "running",
    totalSince: now,
    phaseSince: timer.mode === "stopwatch" ? null : now,
  };
}

export function skipPhase(timer: TimerState, now: number): TimerState {
  if (timer.mode === "stopwatch") return timer;
  if (timer.status !== "running" && timer.status !== "paused") return timer;
  if (timer.phases.length === 0) return timer;
  const upcoming = timer.phaseIndex + 1;
  if (upcoming >= timer.phases.length) {
    return {
      ...timer,
      status: "complete",
      phaseBankMs: phaseMs(timer, now),
      phaseSince: null,
      totalBankMs: totalMs(timer, now),
      totalSince: null,
    };
  }
  return {
    ...timer,
    phaseIndex: upcoming,
    phaseBankMs: 0,
    phaseSince: timer.status === "running" ? now : null,
  };
}

export function addLap(timer: TimerState, now: number): TimerState {
  if (timer.mode !== "stopwatch") return timer;
  if (timer.status !== "running" && timer.status !== "paused") return timer;
  return { ...timer, laps: [...timer.laps, totalMs(timer, now)] };
}

export function resetTimer(timer: TimerState): TimerState {
  return {
    ...idleTimer(),
    linkedPracticeId: timer.linkedPracticeId,
  };
}

export function beginFromBuilder(
  builder: Builder,
  presets: TimerPreset[],
  linkedPracticeId: string | null,
  now: number,
): { timer: TimerState } | { error: string } {
  const name = builderLabel(builder, presets);
  const preset = builderToPreset(builder, "live", name, "custom");
  if (preset.mode === "intervals" && preset.blocks.length === 0) {
    return { error: "Set a work interval before starting." };
  }
  const phases = phasesFor(preset);
  if (preset.mode !== "stopwatch" && phases.length === 0) {
    return { error: "That timer has no duration yet." };
  }
  return {
    timer: {
      mode: preset.mode,
      phases,
      status: "running",
      phaseIndex: 0,
      phaseBankMs: 0,
      phaseSince: preset.mode === "stopwatch" ? null : now,
      totalBankMs: 0,
      totalSince: now,
      laps: [],
      linkedPracticeId,
      startedAt: now,
      presetName: name,
    },
  };
}
