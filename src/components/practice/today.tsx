import { format, formatDistanceToNow } from "date-fns";
import { useNav } from "@/components/practice/nav";
import { StageList } from "@/components/practice/chrome";
import { stageName, usePractice } from "@/lib/practice/store";
import { formatDuration } from "@/lib/practice/format";

export function TodayScreen() {
  const { push } = useNav();
  const sessions = usePractice((state) => state.sessions);
  const phrases = usePractice((state) => state.phrases);
  const practices = usePractice((state) => state.practices);
  const recent = sessions.slice(0, 4);
  const nameOf = (id: string) => practices.find((item) => item.id === id)?.name ?? "A unit";

  return (
    <div>
      <p className="text-sm text-muted">{format(Date.now(), "EEEE, MMMM d")}</p>
      <h1 className="display mt-3 text-4xl md:text-5xl">One unit. Then a phrase. Then the phrase, unbound.</h1>
      <p className="mt-4 max-w-xl text-muted">
        Isolation studies a single pattern. Integration repeats a fixed order until it is one action. Improvisation keeps that set and lets the order go.
      </p>
      <StageList
        onPick={(stage) => {
          if (stage === "isolation") push({ id: "isolate" });
          if (stage === "integration") push({ id: "integrate" });
          if (stage === "improvisation") push({ id: "improvise" });
        }}
      />
      {phrases.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-sm font-medium text-muted">Phrases</h2>
          <ul className="mt-3 border-t border-line">
            {phrases.slice(0, 3).map((phrase) => (
              <li key={phrase.id} className="border-b border-line">
                <button type="button" className="w-full py-3 text-left" onClick={() => push({ id: "integrate", phraseId: phrase.id })}>
                  <span className="block">{phrase.name}</span>
                  <span className="text-sm text-muted">{phrase.practiceIds.map(nameOf).join(" · ")}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section className="mt-10">
        <h2 className="text-sm font-medium text-muted">Recent</h2>
        {recent.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Nothing logged yet. Begin with one unit.</p>
        ) : (
          <ul className="mt-3 border-t border-line">
            {recent.map((session) => (
              <li key={session.id} className="flex items-baseline justify-between gap-3 border-b border-line py-3">
                <span className="min-w-0">
                  <span className="block">{stageName(session.stage)}</span>
                  <span className="block truncate text-sm text-muted">{session.practiceIds.map(nameOf).join(" · ")}</span>
                </span>
                <span className="shrink-0 text-sm text-faint">
                  {formatDuration(session.durationSec)} · {formatDistanceToNow(session.at, { addSuffix: true })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
