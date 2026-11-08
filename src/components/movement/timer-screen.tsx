import { Pause, Play, RotateCcw, SkipForward, Square, Volume2, VolumeX } from "lucide-react";
import { useEffect, useState } from "react";
import { useNav } from "@/components/movement/nav";
import { Button, Input } from "@/components/ui";
import { unlockAudio } from "@/lib/movement/audio";
import { useMovement } from "@/lib/movement/store";
import { formatClock, intervalSummary, phaseMs, totalMs } from "@/lib/movement/time";
import { cn } from "@/lib/cn";

export function TimerScreen() {
  const { push } = useNav();
  const timer = useMovement((state) => state.timer);
  const builder = useMovement((state) => state.builder);
  const presets = useMovement((state) => state.presets);
  const sound = useMovement((state) => state.sound);
  const practices = useMovement((state) => state.practices);
  const setBuilder = useMovement((state) => state.setBuilder);
  const selectPreset = useMovement((state) => state.selectPreset);
  const savePreset = useMovement((state) => state.savePreset);
  const deletePreset = useMovement((state) => state.deletePreset);
  const startTimer = useMovement((state) => state.startTimer);
  const pause = useMovement((state) => state.pause);
  const reset = useMovement((state) => state.reset);
  const stop = useMovement((state) => state.stop);
  const lap = useMovement((state) => state.lap);
  const skip = useMovement((state) => state.skip);
  const setSound = useMovement((state) => state.setSound);
  const clearLink = useMovement((state) => state.clearLink);
  const [presetName, setPresetName] = useState("");
  const now = useNow(timer.status === "running");
  const linked = practices.find((practice) => practice.id === timer.linkedPracticeId);
  const idle = timer.status === "idle";
  const faceMode = idle ? builder.mode : timer.mode;
  const face = idle ? idleFace(builder) : liveFace(timer, now);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== " " && event.code !== "Space") return;
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.closest("button, a, input, textarea, select")) return;
      event.preventDefault();
      if (useMovement.getState().timer.status === "running") useMovement.getState().pause();
      else useMovement.getState().startTimer();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const selected = presets.find((preset) => preset.id === builder.selectedPresetId);

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="flex items-start justify-between gap-3">
        <h1 className="display text-5xl">Timer</h1>
        <button
          type="button"
          className="inline-flex size-11 items-center justify-center rounded-sm border border-line"
          aria-pressed={sound}
          aria-label={sound ? "Mute timer sounds" : "Play timer sounds"}
          onClick={() => {
            unlockAudio();
            setSound(!sound);
          }}
        >
          {sound ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
        </button>
      </div>
      {timer.linkedPracticeId ? (
        <p className="mt-3 text-sm">
          <span className="text-muted">Practice · </span>
          {linked ? linked.name : "Removed from the library"}
          {idle || timer.status === "complete" ? (
            <button type="button" className="ml-3 text-muted underline" onClick={clearLink}>
              Remove
            </button>
          ) : null}
        </p>
      ) : (
        <p className="mt-3 text-sm text-muted">Stopwatch, countdown, or intervals. Tabata is 20 seconds on, 10 off, 8 rounds.</p>
      )}

      <div className="mt-8" aria-live="off">
        <p className="text-sm text-muted">{face.label}</p>
        <p className="mt-1 text-6xl font-semibold tabular-nums tracking-tight md:text-7xl">{formatClock(face.ms, face.direction)}</p>
        {face.detail ? <p className="mt-2 text-sm text-muted">{face.detail}</p> : null}
        {face.ratio != null ? (
          <div className="mt-4 h-px w-full bg-line" aria-hidden="true">
            <div className="h-px w-full origin-left bg-accent" style={{ transform: `scaleX(${face.ratio})` }} />
          </div>
        ) : null}
        {timer.status !== "idle" && timer.mode !== "stopwatch" ? (
          <p className="mt-3 text-sm text-faint tabular-nums">Elapsed {formatClock(totalMs(timer, now), "up")}</p>
        ) : null}
      </div>

      <div className="mt-8 grid gap-2">
        {timer.status === "running" ? (
          <Button size="lg" onClick={pause}>
            <Pause className="size-4" aria-hidden="true" />
            Pause
          </Button>
        ) : (
          <Button size="lg" onClick={startTimer}>
            <Play className="size-4" aria-hidden="true" />
            {timer.status === "paused" ? "Resume" : "Start"}
          </Button>
        )}
        <div className="grid grid-cols-2 gap-2">
          {faceMode === "stopwatch" ? (
            <Button variant="secondary" onClick={lap} disabled={timer.status === "idle" || timer.status === "complete"}>
              Lap
            </Button>
          ) : (
            <Button variant="secondary" onClick={skip} disabled={timer.status !== "running" && timer.status !== "paused"}>
              <SkipForward className="size-4" aria-hidden="true" />
              Skip
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={stop}
            disabled={timer.status !== "running" && timer.status !== "paused"}
          >
            <Square className="size-4" aria-hidden="true" />
            Stop
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={reset} disabled={idle}>
            <RotateCcw className="size-4" aria-hidden="true" />
            Clear
          </Button>
          <Button variant="secondary" onClick={reset} disabled={idle}>
            <RotateCcw className="size-4" aria-hidden="true" />
            Reset
          </Button>
        </div>
        <Button
          variant="secondary"
          disabled={idle}
          onClick={() => {
            if (timer.status === "running") pause();
            const seconds = Math.max(0, Math.round(totalMs(useMovement.getState().timer, Date.now()) / 1000));
            push({
              id: "log",
              durationSec: seconds,
              practiceId: timer.linkedPracticeId ?? undefined,
              at: timer.startedAt ?? Date.now(),
            });
          }}
        >
          Log this practice
        </Button>
      </div>

      {timer.mode === "stopwatch" && timer.laps.length > 0 ? (
        <ul className="mt-6 max-h-48 overflow-auto border-t border-line">
          {timer.laps.map((mark, index) => {
            const prev = index === 0 ? 0 : timer.laps[index - 1] ?? 0;
            return (
              <li key={`${mark}-${index}`} className="flex items-baseline justify-between border-b border-line py-2 text-sm tabular-nums">
                <span className="text-muted">Lap {index + 1}</span>
                <span>{formatClock(mark - prev, "up")}</span>
                <span className="text-muted">{formatClock(mark, "up")}</span>
              </li>
            );
          })}
        </ul>
      ) : null}

      {idle ? (
        <div className="mt-10 grid gap-4">
          <div role="radiogroup" aria-label="Timer mode" className="grid grid-cols-3 gap-2">
            {(
              [
                ["stopwatch", "Stopwatch"],
                ["countdown", "Countdown"],
                ["intervals", "Intervals"],
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={builder.mode === mode}
                onClick={() => setBuilder({ mode })}
                className={cn(
                  "h-11 rounded-sm border text-sm",
                  builder.mode === mode ? "border-ink bg-inverse text-inverse-fg" : "border-line bg-surface",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {presets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                aria-pressed={builder.selectedPresetId === preset.id}
                onClick={() => selectPreset(preset.id)}
                className={cn(
                  "h-11 shrink-0 rounded-full border px-3 text-sm",
                  builder.selectedPresetId === preset.id
                    ? "border-ink bg-inverse text-inverse-fg"
                    : "border-line bg-surface",
                )}
              >
                {preset.name}
              </button>
            ))}
          </div>
          {builder.mode === "countdown" ? (
            <div className="rounded-xl border border-line p-4">
              <Stepper label="Minutes" value={builder.countdownMin} min={0} max={180} onChange={(countdownMin) => setBuilder({ countdownMin })} />
              <Stepper label="Seconds" value={builder.countdownSec} min={0} max={59} onChange={(countdownSec) => setBuilder({ countdownSec })} />
            </div>
          ) : null}
          {builder.mode === "intervals" ? (
            <div className="rounded-xl border border-line p-4">
              <p className="text-sm text-muted">{intervalSummary(builder)}</p>
              <Stepper label="Prepare" value={builder.prepareSec} min={0} max={120} suffix="s" onChange={(prepareSec) => setBuilder({ prepareSec })} />
              <Stepper label="Work" value={builder.workSec} min={5} max={600} suffix="s" onChange={(workSec) => setBuilder({ workSec })} />
              <Stepper label="Rest" value={builder.restSec} min={0} max={600} suffix="s" onChange={(restSec) => setBuilder({ restSec })} />
              <Stepper label="Rounds" value={builder.rounds} min={1} max={40} onChange={(rounds) => setBuilder({ rounds })} />
            </div>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={presetName}
              onChange={(event) => setPresetName(event.target.value)}
              placeholder="Name this setup"
              aria-label="Preset name"
            />
            <Button
              variant="secondary"
              onClick={() => {
                savePreset(presetName);
                setPresetName("");
              }}
            >
              Save preset
            </Button>
          </div>
          {selected?.origin === "custom" ? (
            <Button variant="danger" onClick={() => deletePreset(selected.id)}>
              Remove this preset
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line py-2 last:border-b-0">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="inline-flex size-11 items-center justify-center rounded-sm border border-line bg-surface text-lg"
          aria-label={`Decrease ${label}`}
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          −
        </button>
        <span className="w-14 text-center text-sm font-medium tabular-nums">
          {value}
          {suffix ?? ""}
        </span>
        <button
          type="button"
          className="inline-flex size-11 items-center justify-center rounded-sm border border-line bg-surface text-lg"
          aria-label={`Increase ${label}`}
          onClick={() => onChange(Math.min(max, value + 1))}
        >
          +
        </button>
      </div>
    </div>
  );
}

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(id);
  }, [active]);
  return now;
}

function idleFace(builder: ReturnType<typeof useMovement.getState>["builder"]) {
  if (builder.mode === "stopwatch") {
    return { ms: 0, direction: "up" as const, label: "Stopwatch", detail: "Lap marks each pass", ratio: null };
  }
  if (builder.mode === "countdown") {
    return {
      ms: (builder.countdownMin * 60 + builder.countdownSec) * 1000,
      direction: "down" as const,
      label: "Countdown",
      detail: "",
      ratio: 1,
    };
  }
  return {
    ms: (builder.prepareSec > 0 ? builder.prepareSec : builder.workSec) * 1000,
    direction: "down" as const,
    label: builder.prepareSec > 0 ? "Prepare" : "Work",
    detail: intervalSummary(builder),
    ratio: 1,
  };
}

function liveFace(timer: ReturnType<typeof useMovement.getState>["timer"], now: number) {
  if (timer.mode === "stopwatch") {
    return {
      ms: totalMs(timer, now),
      direction: "up" as const,
      label: timer.status === "paused" ? "Paused" : timer.status === "complete" ? "Stopped" : timer.presetName || "Stopwatch",
      detail: "",
      ratio: null,
    };
  }
  const phase = timer.phases[timer.phaseIndex];
  const dur = (phase?.seconds ?? 0) * 1000;
  const spent = phaseMs(timer, now);
  const remaining = Math.max(0, dur - spent);
  const finished = timer.status === "complete" && remaining < 250;
  const rounds = timer.phases.reduce((max, item) => Math.max(max, item.round ?? 0), 0);
  const label = finished
    ? "Complete"
    : timer.status === "complete"
      ? "Stopped"
      : timer.status === "paused"
        ? `Paused · ${phase?.label ?? ""}`
        : phase?.label ?? "Timer";
  const detail = phase?.round ? `Round ${phase.round} of ${rounds}` : timer.presetName;
  return {
    ms: finished ? 0 : remaining,
    direction: "down" as const,
    label,
    detail,
    ratio: dur > 0 && !finished ? Math.max(0, Math.min(1, remaining / dur)) : null,
  };
}
