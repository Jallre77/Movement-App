import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  formatDistanceToNow,
  isAfter,
  isSameDay,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { MediaPreview } from "@/components/movement/media-editor";
import { irradiationCaption } from "@/components/movement/irradiation";
import { useNav } from "@/components/movement/nav";
import { Button, Select } from "@/components/ui";
import { cn } from "@/lib/cn";
import { useMovement } from "@/lib/movement/store";
import { formatDuration } from "@/lib/movement/time";
import { OWNERSHIP, ISOMETRIC_PASSES, LIMBS, type Session } from "@/lib/movement/types";

export function JournalScreen() {
  const { push } = useNav();
  const sessions = useMovement((state) => state.sessions);
  const categories = useMovement((state) => state.categories);
  const regions = useMovement((state) => state.regions);
  const [categoryId, setCategoryId] = useState("all");
  const [regionId, setRegionId] = useState("all");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState<Date | null>(null);
  const filtered = sessions.filter((session) => {
    if (categoryId !== "all" && session.categoryId !== categoryId) return false;
    if (regionId !== "all" && !session.regionIds.includes(regionId)) return false;
    return true;
  });
  const today = filtered.filter((session) => isToday(session.at)).sort((a, b) => b.at - a.at);
  const todayExists = sessions.some((session) => isToday(session.at));
  const marked = new Set(filtered.map((session) => format(session.at, "yyyy-MM-dd")));
  const chosen = selected ? filtered.filter((session) => isSameDay(session.at, selected)).sort((a, b) => b.at - a.at) : [];
  const chosenIsToday = selected != null && isToday(selected);

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="flex items-end justify-between gap-3">
        <h1 className="display text-5xl">Journal</h1>
        <Button onClick={() => push({ id: "log" })}>Log</Button>
      </div>
      <p className="mt-3 text-sm text-muted">Sessions stay in this browser. Photos and video stay with them.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">
          Category
          <Select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} aria-label="Filter by category">
            <option value="all">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Region
          <Select value={regionId} onChange={(event) => setRegionId(event.target.value)} aria-label="Filter by region">
            <option value="all">All regions</option>
            {regions.map((region) => (
              <option key={region.id} value={region.id}>
                {region.name}
              </option>
            ))}
          </Select>
        </label>
      </div>

      <section className="mt-8">
        <h2 className="text-sm text-muted">Today</h2>
        {today.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            {todayExists ? "Nothing today in this category or region." : "No sessions today."}
          </p>
        ) : (
          <SessionList sessions={today} onOpen={(id) => push({ id: "session", sessionId: id })} />
        )}
      </section>

      <div className="mt-8">
        <button
          type="button"
          aria-expanded={calendarOpen}
          aria-label={calendarOpen ? "Hide calendar" : "Previous sessions by date"}
          onClick={() => setCalendarOpen((open) => !open)}
          className={cn(
            "inline-flex size-11 items-center justify-center rounded-sm border border-line",
            calendarOpen ? "border-ink bg-inverse text-inverse-fg" : "bg-surface",
          )}
        >
          <Calendar className="size-5" aria-hidden="true" />
        </button>
      </div>

      {calendarOpen ? (
        <MonthCalendar
          month={month}
          selected={selected}
          marked={marked}
          onMonth={setMonth}
          onSelect={setSelected}
        />
      ) : null}

      {calendarOpen && selected && !chosenIsToday ? (
        <section className="mt-8">
          <h2 className="text-sm text-muted">{format(selected, "EEEE, MMMM d")}</h2>
          {chosen.length === 0 ? (
            <p className="mt-2 text-sm text-muted">No sessions on this date.</p>
          ) : (
            <SessionList sessions={chosen} onOpen={(id) => push({ id: "session", sessionId: id })} />
          )}
        </section>
      ) : null}
    </div>
  );
}

export function SessionScreen() {
  const { screen, push, pop } = useNav();
  const sessionId = screen.id === "session" ? screen.sessionId : "";
  const session = useMovement((state) => state.sessions.find((item) => item.id === sessionId));
  const practice = useMovement((state) =>
    session?.practiceId ? state.practices.find((item) => item.id === session.practiceId) : undefined,
  );
  const deleteSession = useMovement((state) => state.deleteSession);
  const [confirm, setConfirm] = useState(false);

  if (!session) {
    return (
      <div>
        <h1 className="display text-4xl">Session missing</h1>
        <Button className="mt-4" variant="secondary" onClick={pop}>
          Back
        </Button>
      </div>
    );
  }

  const ownership = OWNERSHIP.find((item) => item.id === session.ownership);

  return (
    <div className="mx-auto w-full max-w-2xl">
      <p className="text-sm text-muted">{format(session.at, "EEEE, MMMM d · h:mm a")}</p>
      <h1 className="display mt-2 text-5xl">{session.name}</h1>
      <p className="mt-3 text-sm text-muted">
        {session.categoryName}
        {session.subcategoryName ? ` · ${session.subcategoryName}` : ""} · {formatDuration(session.durationSec)}
      </p>
      {session.side ? (
        <p className="mt-2 text-sm">
          <span className="text-muted">Side · </span>
          {LIMBS.find((item) => item.id === session.side)?.name}
        </p>
      ) : null}
      {session.isometric ? (
        <p className="mt-2 text-sm">
          <span className="text-muted">PAILs / RAILs · </span>
          {ISOMETRIC_PASSES.find((item) => item.id === session.isometric)?.label}
        </p>
      ) : null}
      {session.regionNames.length > 0 ? <p className="mt-2 text-sm">{session.regionNames.join(", ")}</p> : null}
      {session.irradiation != null ? (
        <p className="mt-4 text-sm">
          <span className="text-muted">Irradiation · </span>
          {session.irradiation}
          <span className="text-muted"> — {irradiationCaption(session.irradiation)}</span>
        </p>
      ) : null}
      {ownership ? (
        <p className="mt-4 text-sm">
          <span className="text-muted">Range felt · </span>
          {ownership.label}
        </p>
      ) : null}
      {session.intention ? (
        <section className="mt-6">
          <h2 className="text-sm font-medium">Intention</h2>
          <p className="mt-1 whitespace-pre-wrap">{session.intention}</p>
        </section>
      ) : null}
      {session.notes ? (
        <section className="mt-6">
          <h2 className="text-sm font-medium">Attention and force</h2>
          <p className="mt-1 whitespace-pre-wrap">{session.notes}</p>
        </section>
      ) : null}
      {session.media.length > 0 ? (
        <ul className="mt-6 grid gap-3">
          {session.media.map((item) => (
            <li key={item.id} className="overflow-hidden rounded-md border border-line bg-surface">
              <MediaPreview item={item} />
              <p className="px-3 py-2 text-sm text-muted">{item.name}</p>
            </li>
          ))}
        </ul>
      ) : null}
      {practice && (practice.media.length > 0 || practice.linkUrl) ? (
        <section className="mt-8">
          <h2 className="text-sm font-medium">From the library</h2>
          {practice.linkUrl ? (
            <a href={practice.linkUrl} target="_blank" rel="noreferrer" className="mt-2 block text-sm break-all underline">
              {practice.linkLabel || practice.linkUrl}
            </a>
          ) : null}
          <ul className="mt-3 grid gap-3">
            {practice.media.map((item) => (
              <li key={item.id} className="overflow-hidden rounded-md border border-line">
                <MediaPreview item={item} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <p className="mt-6 text-sm text-faint">{formatDistanceToNow(session.at, { addSuffix: true })}</p>
      <div className="mt-6 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => push({ id: "log", sessionId: session.id })}>
          Edit
        </Button>
        {confirm ? (
          <>
            <Button
              variant="danger"
              onClick={() => {
                deleteSession(session.id);
                pop();
              }}
            >
              Delete session
            </Button>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Keep
            </Button>
          </>
        ) : (
          <Button variant="danger" onClick={() => setConfirm(true)}>
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}

function SessionList({ sessions, onOpen }: { sessions: Session[]; onOpen: (id: string) => void }) {
  return (
    <ul className="mt-2 border-t border-line">
      {sessions.map((session) => (
        <li key={session.id} className="border-b border-line">
          <button
            type="button"
            onClick={() => onOpen(session.id)}
            className="flex w-full items-baseline justify-between gap-3 py-3 text-left"
          >
            <span className="min-w-0">
              <span className="block truncate">{session.name}</span>
              <span className="block text-sm text-muted">
                {session.categoryName}
                {session.subcategoryName ? ` · ${session.subcategoryName}` : ""}
                {session.isometric ? ` · ${ISOMETRIC_PASSES.find((item) => item.id === session.isometric)?.label}` : ""}
                {session.side ? ` · ${LIMBS.find((item) => item.id === session.side)?.name}` : ""}
                {session.regionNames.length ? ` · ${session.regionNames.join(", ")}` : ""}
              </span>
            </span>
            <span className="shrink-0 text-sm text-muted tabular-nums">{formatDuration(session.durationSec)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function MonthCalendar({
  month,
  selected,
  marked,
  onMonth,
  onSelect,
}: {
  month: Date;
  selected: Date | null;
  marked: Set<string>;
  onMonth: (month: Date) => void;
  onSelect: (day: Date) => void;
}) {
  const today = startOfDay(new Date());
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  });

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => onMonth(subMonths(month, 1))}
          className="inline-flex size-11 items-center justify-center rounded-sm border border-line bg-surface"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </button>
        <p className="text-sm font-medium">{format(month, "MMMM yyyy")}</p>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => onMonth(addMonths(month, 1))}
          className="inline-flex size-11 items-center justify-center rounded-sm border border-line bg-surface"
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>
      <div className="mt-3 grid grid-cols-7 text-center text-xs text-muted">
        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((label) => (
          <span key={label} className="py-1">
            {label}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const future = isAfter(startOfDay(day), today);
          const on = selected != null && isSameDay(day, selected);
          const inMonth = isSameMonth(day, month);
          const hasSessions = marked.has(format(day, "yyyy-MM-dd"));
          return (
            <button
              key={format(day, "yyyy-MM-dd")}
              type="button"
              disabled={future}
              aria-pressed={on}
              aria-current={isToday(day) ? "date" : undefined}
              aria-label={format(day, "EEEE, MMMM d")}
              onClick={() => onSelect(startOfDay(day))}
              className={cn(
                "relative mx-auto inline-flex size-11 items-center justify-center rounded-sm text-sm tabular-nums",
                on ? "bg-inverse text-inverse-fg" : isToday(day) ? "border border-ink" : "",
                !on && !inMonth && "text-faint",
                future && "text-faint opacity-40",
              )}
            >
              {format(day, "d")}
              {hasSessions ? <span className="absolute bottom-1.5 size-1 rounded-full bg-current" aria-hidden="true" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
