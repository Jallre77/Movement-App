import { useState } from "react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";

const STEPS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export function irradiationCaption(value: number) {
  if (value <= 1) return "Very little tension.";
  if (value >= 10) return "Maximal contraction throughout the body.";
  return "Tension held through the body.";
}

export function IrradiationControl({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const shown = value ?? 1;

  return (
    <div className="mt-3">
      <Button type="button" variant="secondary" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
        Irradiation{value != null ? ` ${value}` : ""}
      </Button>
      {open ? (
        <div className="mt-3">
          <p className="text-sm text-muted">
            {value == null ? "1 is very little tension. 10 is maximal contraction throughout the body." : `${shown} — ${irradiationCaption(shown)}`}
          </p>
          <input
            className="mt-3 h-11 w-full accent-accent"
            type="range"
            min={1}
            max={10}
            step={1}
            value={shown}
            aria-label="Irradiation, from 1, very little tension, to 10, maximal contraction throughout the body"
            onChange={(event) => onChange(Number(event.target.value))}
          />
          <div className="grid grid-cols-10">
            {STEPS.map((step) => (
              <button
                key={step}
                type="button"
                aria-pressed={value === step}
                onClick={() => onChange(step)}
                className={cn("h-11 text-sm tabular-nums", value === step ? "font-medium text-ink" : "text-faint")}
              >
                {step}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
