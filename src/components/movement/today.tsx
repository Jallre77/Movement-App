import { format, formatDistanceToNow, startOfWeek } from "date-fns";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui";
import { useNav } from "@/components/movement/nav";
import { useMovement } from "@/lib/movement/store";
import { cn } from "@/lib/cn";
import { formatDuration } from "@/lib/movement/time";

export function TodayScreen() {
  const { push } = useNav();
  const categories = useMovement((state) => state.categories);
  const subcategories = useMovement((state) => state.subcategories);
  const regions = useMovement((state) => state.regions);
  const sessions = useMovement((state) => state.sessions);
  const now = Date.now();
  const weekStart = startOfWeek(new Date(now), { weekStartsOn: 1 }).getTime();
  const week = sessions.filter((session) => session.at >= weekStart && session.at <= now);
  const minutes = Math.round(week.reduce((sum, session) => sum + session.durationSec, 0) / 60);
  const touched = new Set(week.flatMap((session) => session.regionIds));
  const recentCut = now - 7 * 24 * 60 * 60 * 1000;
  const recent = [...sessions].sort((a, b) => b.at - a.at).slice(0, 3);

  return (
    <div className="mx-auto w-full max-w-2xl">
      <p className="text-sm text-muted">{format(now, "EEEE, MMMM d")}</p>
      <p className="mt-4 max-w-xl text-base text-muted">
        A private log for articular work done on purpose, and the joints those practices meet.
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Button size="lg" onClick={() => push({ id: "timer" })}>
          Start a timer
        </Button>
        <Button size="lg" variant="secondary" onClick={() => push({ id: "log" })}>
          Log a session
        </Button>
      </div>

      <p className="mt-10 text-sm text-muted">Since Monday</p>
      <dl className="grid grid-cols-3 border-y border-line">
        <Stat value={String(minutes)} label="Minutes" />
        <Stat value={String(week.length)} label="Sessions" />
        <Stat value={`${touched.size}/${regions.length}`} label="Regions" />
      </dl>

      <h2 className="display mt-10 text-3xl">Regions</h2>
      <p className="mt-2 text-sm text-muted">Filled marks were practiced in the last 7 days.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {regions.map((region) => {
          const recentHit = sessions.some(
            (session) => session.regionIds.includes(region.id) && session.at >= recentCut,
          );
          return (
            <button
              key={region.id}
              type="button"
              onClick={() => push({ id: "region", regionId: region.id })}
              className={cn(
                "h-11 rounded-full border px-3 text-sm",
                recentHit ? "border-ink bg-inverse text-inverse-fg" : "border-line bg-surface text-ink",
              )}
            >
              {region.name}
            </button>
          );
        })}
      </div>

      <h2 className="display mt-10 text-3xl">Categories</h2>
      <ul className="mt-4 border-t border-line">
        {categories.map((category) => {
          const names = subcategories
            .filter((sub) => sub.categoryId === category.id)
            .map((sub) => sub.name)
            .join(" · ");
          return (
            <li key={category.id} className="border-b border-line">
              <button
                type="button"
                onClick={() => push({ id: "category", categoryId: category.id })}
                className="flex w-full items-start gap-4 py-5 text-left"
              >
                <span className="min-w-0 flex-1">
                  <span className="display block text-3xl">{category.name}</span>
                  <span className="mt-1 block text-sm text-muted">{category.blurb}</span>
                  {names ? <span className="mt-2 block text-sm text-faint">{names}</span> : null}
                </span>
                <ChevronRight className="mt-2 size-5 shrink-0 text-faint" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>

      {recent.length > 0 ? (
        <>
          <h2 className="display mt-10 text-3xl">Recent</h2>
          <ul className="mt-4 border-t border-line">
            {recent.map((session) => (
              <li key={session.id} className="border-b border-line">
                <button
                  type="button"
                  onClick={() => push({ id: "session", sessionId: session.id })}
                  className="flex w-full items-baseline justify-between gap-3 py-4 text-left"
                >
                  <span className="min-w-0">
                    <span className="block truncate">{session.name}</span>
                    <span className="text-sm text-muted">
                      {formatDistanceToNow(session.at, { addSuffix: true })}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm text-muted tabular-nums">{formatDuration(session.durationSec)}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-10 text-sm text-muted">Nothing logged yet. A session can be a timer, a note, or both.</p>
      )}
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="py-4 pr-3">
      <dd className="text-2xl font-medium tabular-nums">{value}</dd>
      <dt className="text-sm text-muted">{label}</dt>
    </div>
  );
}
