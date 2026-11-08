import { ChevronDown, ChevronLeft, ChevronUp } from "lucide-react";
import type { ReactNode } from "react";
import { Button, Input } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { Stage } from "@/lib/practice/types";
import { STAGES } from "@/lib/practice/types";

export function Back({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <div className="mb-6 flex items-center gap-2">
      <button type="button" onClick={onBack} aria-label="Back" className="inline-flex size-11 items-center justify-center rounded-md">
        <ChevronLeft className="size-5" aria-hidden="true" />
      </button>
      <h1 className="display text-4xl">{title}</h1>
    </div>
  );
}

export function StageList({ onPick }: { onPick: (stage: Stage) => void }) {
  return (
    <ul className="mt-8 grid gap-3">
      {STAGES.map((stage, index) => (
        <li key={stage.id}>
          <button
            type="button"
            onClick={() => onPick(stage.id)}
            className={cn(
              "flex w-full items-start gap-4 rounded-lg border px-4 py-3 text-left",
              index === 0 ? "border-transparent bg-accent text-accent-fg" : "border-line bg-surface text-ink",
            )}
          >
            <span className={cn("display text-3xl", index === 0 ? "text-accent-fg" : "text-accent")}>{index + 1}</span>
            <span>
              <span className="block text-lg font-medium">{stage.name}</span>
              <span className={cn("mt-1 block text-sm", index === 0 ? "text-accent-fg" : "text-muted")}>{stage.line}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function SessionTimer({
  running,
  display,
  onStart,
  onPause,
  onStop,
  onClear,
}: {
  running: boolean;
  display: string;
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
  onClear: () => void;
}) {
  return (
    <div>
      <p className="text-sm font-medium">Timer</p>
      <p className="display mt-2 text-5xl tabular-nums">{display}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {running ? (
          <Button type="button" onClick={onPause}>
            Pause
          </Button>
        ) : (
          <Button type="button" onClick={onStart}>
            Start
          </Button>
        )}
        <Button type="button" variant="secondary" onClick={onStop}>
          Stop
        </Button>
        <Button type="button" variant="secondary" onClick={onClear}>
          Clear
        </Button>
      </div>
    </div>
  );
}

export function DurationFields({
  hours,
  minutes,
  seconds,
  onHours,
  onMinutes,
  onSeconds,
}: {
  hours: string;
  minutes: string;
  seconds: string;
  onHours: (value: string) => void;
  onMinutes: (value: string) => void;
  onSeconds: (value: string) => void;
}) {
  const field = (label: string, value: string, onChange: (value: string) => void) => (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <Input inputMode="numeric" value={value} placeholder="0" aria-label={label} onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 2))} />
    </label>
  );
  return (
    <div className="grid grid-cols-3 gap-2">
      {field("Hours", hours, onHours)}
      {field("Minutes", minutes, onMinutes)}
      {field("Seconds", seconds, onSeconds)}
    </div>
  );
}

export function OrderList({
  ids,
  nameOf,
  onMove,
}: {
  ids: string[];
  nameOf: (id: string) => string;
  onMove: (index: number, direction: -1 | 1) => void;
}) {
  return (
    <ol className="mt-3 border-t border-line">
      {ids.map((id, index) => (
        <li key={id} className="flex items-center justify-between gap-3 border-b border-line py-2">
          <span className="min-w-0">
            <span className="text-sm text-faint">{index + 1}</span>
            <span className="ml-3">{nameOf(id)}</span>
          </span>
          <span className="flex shrink-0">
            <Button variant="ghost" size="icon" aria-label={`Move ${nameOf(id)} up`} disabled={index === 0} onClick={() => onMove(index, -1)}>
              <ChevronUp className="size-4" aria-hidden="true" />
            </Button>
            <Button variant="ghost" size="icon" aria-label={`Move ${nameOf(id)} down`} disabled={index === ids.length - 1} onClick={() => onMove(index, 1)}>
              <ChevronDown className="size-4" aria-hidden="true" />
            </Button>
          </span>
        </li>
      ))}
    </ol>
  );
}

export function Note({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-28 w-full rounded-md border border-line bg-surface px-3 py-3 text-base text-ink"
      />
    </label>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-sm font-medium text-muted">{title}</h2>
      {children}
    </section>
  );
}
