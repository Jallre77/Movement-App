import { addMonths, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { useState } from "react";
import { Button } from "@/components/ui";
import { Note } from "@/components/practice/chrome";
import { cn } from "@/lib/cn";
import { formatDuration } from "@/lib/practice/format";
import { stageName, usePractice } from "@/lib/practice/store";
import { useNav } from "@/components/practice/nav";
import type { Stage } from "@/lib/practice/types";

export function JournalScreen() {
  const { push } = useNav();
  const sessions = usePractice((state) => state.sessions);
  const routines = usePractice((state) => state.routines);
  const practices = usePractice((state) => state.practices);
  const deleteSession = usePractice((state) => state.deleteSession);
  const updateSessionNotes = usePractice((state) => state.updateSessionNotes);
  const [stage, setStage] = useState<Stage | "all">("all");
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [day, setDay] = useState<Date | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const filtered = sessions.filter((session) => stage === "all" || session.stage === stage);
  const shown = day ? filtered.filter((session) => isSameDay(session.at, day)) : filtered.filter((session) => isSameDay(session.at, new Date()));
  const nameOf = (id: string) => practices.find((item) => item.id === id)?.name ?? "Unit";
  const start = startOfWeek(month, { weekStartsOn: 1 });
  const cells = Array.from({ length: 42 }, (_, index) => new Date(start.getTime() + index * 86400000));
  const marked = new Set(filtered.map((session) => format(session.at, "yyyy-MM-dd")));

  return (
    <div>
      <h1 className="display text-5xl">Journal</h1>
      <p className="mt-3 text-muted">Sessions stay in this browser.</p>
      <section className="mt-8">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-medium text-muted">Routines</h2>
          <button type="button" className="text-sm text-accent" onClick={() => push({ id: "routine" })}>
            New
          </button>
        </div>
        {routines.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No routines yet.</p>
        ) : (
          <ul className="mt-3 border-t border-line">
            {routines.map((routine) => (
              <li key={routine.id} className="border-b border-line">
                <button type="button" className="w-full py-3 text-left" onClick={() => push({ id: "routine", routineId: routine.id })}>
                  <span className="block">{routine.name}</span>
                  <span className="block truncate text-sm text-muted">{routine.practiceIds.map(nameOf).join(" · ")}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <div className="mt-6 flex flex-wrap gap-2">
        {(["all", "isolation", "integration", "improvisation"] as const).map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={stage === item}
            onClick={() => setStage(item)}
            className={cn("h-11 rounded-full border px-3 text-sm", stage === item ? "border-transparent bg-accent text-accent-fg" : "border-line bg-surface")}
          >
            {item === "all" ? "All" : stageName(item)}
          </button>
        ))}
      </div>
      <div className="mt-6 flex items-center justify-between">
        <Button variant="ghost" onClick={() => setMonth(addMonths(month, -1))} aria-label="Previous month">
          Previous
        </Button>
        <p className="font-medium">{format(month, "MMMM yyyy")}</p>
        <Button variant="ghost" onClick={() => setMonth(addMonths(month, 1))} aria-label="Next month">
          Next
        </Button>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-sm">
        {["M", "T", "W", "T", "F", "S", "S"].map((label, index) => (
          <div key={`${label}${index}`} className="py-2 text-faint">
            {label}
          </div>
        ))}
        {cells.map((date) => {
          const key = format(date, "yyyy-MM-dd");
          const on = day ? isSameDay(date, day) : isSameDay(date, new Date());
          return (
            <button
              key={key}
              type="button"
              onClick={() => setDay(date)}
              className={cn(
                "h-11 rounded-md",
                !isSameMonth(date, month) && "text-faint",
                on && "bg-accent text-accent-fg",
                marked.has(key) && !on && "border border-accent text-accent",
              )}
            >
              {format(date, "d")}
            </button>
          );
        })}
      </div>
      <h2 className="mt-8 text-sm font-medium text-muted">{day ? format(day, "EEEE, MMMM d") : "Today"}</h2>
      {shown.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No sessions for this day.</p>
      ) : (
        <ul className="mt-3 border-t border-line">
          {shown.map((session) => (
            <li key={session.id} className="border-b border-line py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{stageName(session.stage)}</p>
                  <p className="text-sm text-muted">{session.practiceIds.map(nameOf).join(" · ")}</p>
                  {editingId === session.id ? (
                    <form
                      className="mt-2 grid gap-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        updateSessionNotes(session.id, draft);
                        setEditingId(null);
                      }}
                    >
                      <Note label="Note" value={draft} onChange={setDraft} />
                      <div className="flex gap-2">
                        <Button type="submit">Save</Button>
                        <Button type="button" variant="secondary" onClick={() => setEditingId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </form>
                  ) : (
                    session.notes ? <p className="mt-1 text-sm">{session.notes}</p> : null
                  )}
                  <p className="text-sm text-faint">{formatDuration(session.durationSec)}</p>
                </div>
                <div className="flex shrink-0 flex-col gap-2">
                  <Button onClick={() => push({ id: "continue", sessionId: session.id })}>Continue</Button>
                  {editingId === session.id ? null : (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setEditingId(session.id);
                        setDraft(session.notes);
                      }}
                    >
                      Edit
                    </Button>
                  )}
                  <Button variant="danger" onClick={() => deleteSession(session.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
