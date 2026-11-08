import { useEffect, useState } from "react";
import { create } from "zustand";
import { DurationFields } from "@/components/practice/chrome";
import { useNav } from "@/components/practice/nav";
import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";
import { toSeconds } from "@/lib/practice/format";

type Mode = "stopwatch" | "countdown";
type Status = "idle" | "running" | "paused";

type TimerStore = {
  mode: Mode;
  status: Status;
  elapsedMs: number;
  anchor: number | null;
  countdownSec: number;
  setMode: (mode: Mode) => void;
  setCountdown: (seconds: number) => void;
  start: () => void;
  pause: () => void;
  stop: () => void;
  clear: () => void;
  addTime: (seconds: number) => void;
};

function liveMs(state: TimerStore, now: number) {
  if (state.status !== "running" || state.anchor == null) return state.elapsedMs;
  return state.elapsedMs + (now - state.anchor);
}

const useTimer = create<TimerStore>((set, get) => ({
  mode: "stopwatch",
  status: "idle",
  elapsedMs: 0,
  anchor: null,
  countdownSec: 180,
  setMode: (mode) => set({ mode, status: "idle", elapsedMs: 0, anchor: null }),
  setCountdown: (seconds) => set({ countdownSec: seconds, status: "idle", elapsedMs: 0, anchor: null }),
  start: () => {
    const state = get();
    if (state.mode === "countdown" && liveMs(state, Date.now()) >= state.countdownSec * 1000) {
      set({ elapsedMs: 0, anchor: Date.now(), status: "running" });
      return;
    }
    set({ anchor: Date.now(), status: "running", elapsedMs: liveMs(state, Date.now()) });
  },
  pause: () => {
    const state = get();
    set({ elapsedMs: liveMs(state, Date.now()), anchor: null, status: "paused" });
  },
  stop: () => {
    const state = get();
    set({ elapsedMs: liveMs(state, Date.now()), anchor: null, status: "paused" });
  },
  clear: () => set({ status: "idle", elapsedMs: 0, anchor: null }),
  addTime: (seconds) => {
    const extra = Math.max(0, Math.round(seconds));
    if (extra <= 0) return;
    const state = get();
    const now = Date.now();
    const elapsed = liveMs(state, now);
    const running = state.status === "running";
    if (state.mode === "countdown") {
      set({
        countdownSec: state.countdownSec + extra,
        elapsedMs: elapsed,
        anchor: running ? now : null,
        status: running ? "running" : "paused",
      });
      return;
    }
    set({
      elapsedMs: elapsed + extra * 1000,
      anchor: running ? now : null,
      status: running ? "running" : "paused",
    });
  },
}));

function clock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return hours > 0 ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

export function TimerScreen() {
  const { push } = useNav();
  const timer = useTimer();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (timer.status !== "running") return;
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, [timer.status]);
  const elapsed = liveMs(timer, now);
  const remain = timer.countdownSec * 1000 - elapsed;
  const display = timer.mode === "countdown" ? clock(remain) : clock(elapsed);
  const used = Math.floor(elapsed / 1000) > 0;
  const [addHours, setAddHours] = useState("");
  const [addMinutes, setAddMinutes] = useState("");
  const [addSeconds, setAddSeconds] = useState("");
  const added = toSeconds(addHours, addMinutes, addSeconds);
  useEffect(() => {
    if (timer.mode === "countdown" && timer.status === "running" && remain <= 0) timer.pause();
  }, [remain, timer]);

  return (
    <div>
      <h1 className="display text-5xl">Timer</h1>
      <p className="mt-3 text-muted">A container for the work. Three minutes is enough for a closed set.</p>
      <div className="mt-6 flex gap-2">
        {(["stopwatch", "countdown"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            aria-pressed={timer.mode === mode}
            onClick={() => timer.setMode(mode)}
            className={cn("h-11 rounded-full border px-3 text-sm capitalize", timer.mode === mode ? "border-transparent bg-accent text-accent-fg" : "border-line bg-surface")}
          >
            {mode}
          </button>
        ))}
      </div>
      {timer.mode === "countdown" ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {[120, 180, 300].map((seconds) => (
            <button
              key={seconds}
              type="button"
              onClick={() => timer.setCountdown(seconds)}
              className={cn("h-11 rounded-full border px-3 text-sm", timer.countdownSec === seconds ? "border-accent text-accent" : "border-line")}
            >
              {seconds / 60}:00
            </button>
          ))}
        </div>
      ) : null}
      <p className="display mt-10 text-7xl tabular-nums">{display}</p>
      <div className="mt-8 flex flex-wrap gap-2">
        {timer.status === "running" ? (
          <Button onClick={timer.pause}>Pause</Button>
        ) : (
          <Button onClick={timer.start}>{timer.status === "paused" ? "Resume" : "Start"}</Button>
        )}
        <Button variant="secondary" onClick={timer.stop}>
          Stop
        </Button>
        <Button variant="secondary" onClick={timer.clear}>
          Clear
        </Button>
        {used ? (
          <Button
            onClick={() => {
              const seconds = Math.max(1, Math.floor(elapsed / 1000));
              if (timer.status === "running") timer.pause();
              push({ id: "timer-log", durationSec: seconds });
            }}
          >
            Log a session
          </Button>
        ) : null}
      </div>
      <div className="mt-8 max-w-sm">
        <p className="text-sm font-medium">Add time</p>
        <div className="mt-2">
          <DurationFields
            hours={addHours}
            minutes={addMinutes}
            seconds={addSeconds}
            onHours={setAddHours}
            onMinutes={setAddMinutes}
            onSeconds={setAddSeconds}
          />
        </div>
        <Button
          className="mt-3"
          variant="secondary"
          disabled={added <= 0}
          onClick={() => {
            timer.addTime(added);
            setAddHours("");
            setAddMinutes("");
            setAddSeconds("");
          }}
        >
          Add
        </Button>
      </div>
    </div>
  );
}
