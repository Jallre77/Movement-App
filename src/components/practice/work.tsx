import { useEffect, useState } from "react";
import { Back, DurationFields, Note, OrderList, SessionTimer } from "@/components/practice/chrome";
import { useNav } from "@/components/practice/nav";
import { UnitPicker } from "@/components/practice/vocabulary";
import { Button, Input, Select } from "@/components/ui";
import { daysSince, formatDuration, toSeconds } from "@/lib/practice/format";
import { isolatedIds, lastMeeting, stageName, usePractice } from "@/lib/practice/store";
import type { Stage } from "@/lib/practice/types";

function useClock() {
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [seconds, setSeconds] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"idle" | "running" | "paused">("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [anchor, setAnchor] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (status !== "running") return;
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, [status]);
  const live = status === "running" && anchor != null ? elapsedMs + (now - anchor) : elapsedMs;
  function write(ms: number) {
    const total = Math.floor(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    setHours(h > 0 ? String(h) : "");
    setMinutes(m > 0 ? String(m) : "");
    setSeconds(s > 0 ? String(s) : "");
  }
  const timer = {
    running: status === "running",
    display: clockText(live),
    start: () => {
      setAnchor(Date.now());
      setStatus("running");
    },
    pause: () => {
      const ms = live;
      setElapsedMs(ms);
      setAnchor(null);
      setStatus("paused");
      write(ms);
    },
    stop: () => {
      const ms = live;
      setElapsedMs(ms);
      setAnchor(null);
      setStatus("idle");
      write(ms);
    },
    clear: () => {
      setElapsedMs(0);
      setAnchor(null);
      setStatus("idle");
      setHours("");
      setMinutes("");
      setSeconds("");
    },
  };
  const typed = toSeconds(hours, minutes, seconds);
  return {
    hours,
    setHours,
    minutes,
    setMinutes,
    seconds,
    setSeconds,
    notes,
    setNotes,
    duration: status === "running" ? Math.floor(live / 1000) : typed,
    timer,
  };
}

function clockText(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return hours > 0 ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

export function IsolateScreen() {
  const { push, pop } = useNav();
  return (
    <div>
      <Back title="Isolation" onBack={pop} />
      <p className="text-muted">Choose one unit. Study it alone.</p>
      <UnitPicker selected={[]} onToggle={(id) => push({ id: "isolate-log", practiceId: id })} />
    </div>
  );
}

export function IsolateLogScreen() {
  const { screen, pop, tab } = useNav();
  const practiceId = screen.id === "isolate-log" ? screen.practiceId : "";
  const practice = usePractice((state) => state.practices.find((item) => item.id === practiceId));
  const logSession = usePractice((state) => state.logSession);
  const clock = useClock();
  if (!practice) return <Missing onBack={pop} />;
  return (
    <div>
      <Back title={practice.name} onBack={pop} />
      {practice.summary ? <p className="text-muted">{practice.summary}</p> : null}
      <form
        className="mt-6 grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          logSession({
            stage: "isolation",
            practiceIds: [practice.id],
            phraseId: null,
            appearedIds: [practice.id],
            notes: clock.notes.trim(),
            durationSec: clock.duration,
          });
          tab({ id: "today" });
        }}
      >
        <SessionTimer
          running={clock.timer.running}
          display={clock.timer.display}
          onStart={clock.timer.start}
          onPause={clock.timer.pause}
          onStop={clock.timer.stop}
          onClear={clock.timer.clear}
        />
        <DurationFields
          hours={clock.hours}
          minutes={clock.minutes}
          seconds={clock.seconds}
          onHours={clock.setHours}
          onMinutes={clock.setMinutes}
          onSeconds={clock.setSeconds}
        />
        <Note label="What you noticed" value={clock.notes} onChange={clock.setNotes} />
        <Button type="submit">Save isolation</Button>
      </form>
    </div>
  );
}

export function IntegrateScreen() {
  const { screen, pop, tab } = useNav();
  const phraseId = screen.id === "integrate" ? screen.phraseId : undefined;
  const practices = usePractice((state) => state.practices);
  const existing = usePractice((state) => state.phrases.find((item) => item.id === phraseId));
  const savePhrase = usePractice((state) => state.savePhrase);
  const logSession = usePractice((state) => state.logSession);
  const known = isolatedIds(usePractice((state) => state.sessions));
  const [ids, setIds] = useState<string[]>(existing?.practiceIds ?? []);
  const [name, setName] = useState(existing?.name ?? "");
  const clock = useClock();
  const nameOf = (id: string) => practices.find((item) => item.id === id)?.name ?? "Unit";
  const fresh = ids.filter((id) => !known.has(id));

  function toggle(id: string) {
    setIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : current.length >= 4 ? current : [...current, id]));
  }

  function move(index: number, direction: -1 | 1) {
    setIds((current) => {
      const next = [...current];
      const swap = index + direction;
      if (swap < 0 || swap >= next.length) return current;
      [next[index], next[swap]] = [next[swap], next[index]];
      return next;
    });
  }

  return (
    <div>
      <Back title="Integration" onBack={pop} />
      <p className="text-muted">Two to four units, in an order you will repeat until it is one action.</p>
      <UnitPicker selected={ids} onToggle={toggle} max={4} />
      {ids.length > 0 ? <OrderList ids={ids} nameOf={nameOf} onMove={move} /> : null}
      {fresh.length > 0 ? (
        <p className="mt-4 text-sm text-muted">Not isolated yet: {fresh.map(nameOf).join(", ")}. You can still join them.</p>
      ) : null}
      <form
        className="mt-6 grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (ids.length < 2) return;
          const id = savePhrase(name, ids, existing?.id);
          logSession({
            stage: "integration",
            practiceIds: ids,
            phraseId: id,
            appearedIds: ids,
            notes: clock.notes.trim(),
            durationSec: clock.duration,
          });
          tab({ id: "today" });
        }}
      >
        <label className="grid gap-2 text-sm font-medium">
          Phrase name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="A name you will recognize"
            aria-label="Phrase name"
            className="h-11 w-full rounded-md border border-line bg-surface px-3 text-base text-ink"
          />
        </label>
        <SessionTimer
          running={clock.timer.running}
          display={clock.timer.display}
          onStart={clock.timer.start}
          onPause={clock.timer.pause}
          onStop={clock.timer.stop}
          onClear={clock.timer.clear}
        />
        <DurationFields
          hours={clock.hours}
          minutes={clock.minutes}
          seconds={clock.seconds}
          onHours={clock.setHours}
          onMinutes={clock.setMinutes}
          onSeconds={clock.setSeconds}
        />
        <Note label="How the order felt" value={clock.notes} onChange={clock.setNotes} />
        <Button type="submit" disabled={ids.length < 2}>
          Save phrase
        </Button>
      </form>
    </div>
  );
}

export function ImproviseScreen() {
  const { screen, pop, tab, push } = useNav();
  const phraseId = screen.id === "improvise" ? screen.phraseId : undefined;
  const practices = usePractice((state) => state.practices);
  const phrases = usePractice((state) => state.phrases);
  const existing = phrases.find((item) => item.id === phraseId);
  const sessions = usePractice((state) => state.sessions);
  const logSession = usePractice((state) => state.logSession);
  const known = isolatedIds(sessions);
  const [ids, setIds] = useState<string[]>(existing?.practiceIds ?? []);
  const [appeared, setAppeared] = useState<string[]>(existing?.practiceIds ?? []);
  const [override, setOverride] = useState(false);
  const clock = useClock();
  const nameOf = (id: string) => practices.find((item) => item.id === id)?.name ?? "Unit";
  const fresh = ids.filter((id) => !known.has(id));

  function toggle(id: string) {
    setIds((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : current.length >= 4 ? current : [...current, id];
      setAppeared(next);
      return next;
    });
  }

  return (
    <div>
      <Back title="Improvisation" onBack={pop} />
      <p className="text-muted">A closed set. No fixed order. Attention stays on the transitions.</p>
      {phrases.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {phrases.map((phrase) => (
            <button
              key={phrase.id}
              type="button"
              className="h-11 rounded-full border border-line bg-surface px-3 text-sm"
              onClick={() => {
                setIds(phrase.practiceIds);
                setAppeared(phrase.practiceIds);
              }}
            >
              {phrase.name}
            </button>
          ))}
        </div>
      ) : null}
      <UnitPicker selected={ids} onToggle={toggle} max={4} />
      {fresh.length > 0 ? (
        <div className="mt-4 rounded-lg border border-line bg-surface p-4">
          <p className="text-sm">These units have not been isolated yet.</p>
          <ul className="mt-2">
            {fresh.map((id) => (
              <li key={id}>
                <button type="button" className="h-11 text-sm text-accent" onClick={() => push({ id: "isolate-log", practiceId: id })}>
                  Isolate {nameOf(id)}
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="mt-2 text-sm text-muted" onClick={() => setOverride(true)}>
            {override ? "Continuing anyway." : "I already know them. Continue anyway."}
          </button>
        </div>
      ) : null}
      {ids.length > 0 ? (
        <fieldset className="mt-6">
          <legend className="text-sm font-medium">Which units appeared</legend>
          <ul className="mt-2 flex flex-wrap gap-2">
            {ids.map((id) => {
              const on = appeared.includes(id);
              return (
                <li key={id}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => setAppeared((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))}
                    className={`h-11 rounded-full border px-3 text-sm ${on ? "border-transparent bg-accent text-accent-fg" : "border-line bg-surface"}`}
                  >
                    {nameOf(id)}
                  </button>
                </li>
              );
            })}
          </ul>
        </fieldset>
      ) : null}
      <form
        className="mt-6 grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (ids.length < 2 || (fresh.length > 0 && !override)) return;
          logSession({
            stage: "improvisation",
            practiceIds: ids,
            phraseId: existing && sameSet(existing.practiceIds, ids) ? existing.id : null,
            appearedIds: appeared,
            notes: clock.notes.trim(),
            durationSec: clock.duration,
          });
          tab({ id: "today" });
        }}
      >
        <SessionTimer
          running={clock.timer.running}
          display={clock.timer.display}
          onStart={clock.timer.start}
          onPause={clock.timer.pause}
          onStop={clock.timer.stop}
          onClear={clock.timer.clear}
        />
        <DurationFields
          hours={clock.hours}
          minutes={clock.minutes}
          seconds={clock.seconds}
          onHours={clock.setHours}
          onMinutes={clock.setMinutes}
          onSeconds={clock.setSeconds}
        />
        <Note label="What happened between the units" value={clock.notes} onChange={clock.setNotes} />
        <Button type="submit" disabled={ids.length < 2 || (fresh.length > 0 && !override)}>
          Save improvisation
        </Button>
      </form>
    </div>
  );
}

export function PracticeScreen() {
  const { screen, pop, push } = useNav();
  const practiceId = screen.id === "practice" ? screen.practiceId : "";
  const practice = usePractice((state) => state.practices.find((item) => item.id === practiceId));
  const domains = usePractice((state) => state.domains);
  const domain = domains.find((item) => item.id === practice?.domainId);
  const sessions = usePractice((state) => state.sessions);
  const deletePractice = usePractice((state) => state.deletePractice);
  const updatePractice = usePractice((state) => state.updatePractice);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftDomain, setDraftDomain] = useState("");
  if (!practice) return <Missing onBack={pop} />;
  const meetings = (["isolation", "integration", "improvisation"] as const).map((stage) => {
    const found = sessions
      .filter((session) => session.stage === stage && (session.practiceIds.includes(practice.id) || session.appearedIds.includes(practice.id)))
      .sort((a, b) => b.at - a.at)[0];
    return { stage, found };
  });
  return (
    <div>
      <Back title={practice.name} onBack={pop} />
      {editing ? (
        <form
          className="mt-4 grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!updatePractice(practice.id, draftName, draftDomain)) return;
            setEditing(false);
          }}
        >
          <Input value={draftName} onChange={(event) => setDraftName(event.target.value)} aria-label="Unit name" required />
          <Select value={draftDomain} onChange={(event) => setDraftDomain(event.target.value)} aria-label="Domain">
            {domains.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
          <div className="flex gap-2">
            <Button type="submit" disabled={!draftName.trim()}>
              Save
            </Button>
            <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <p className="text-sm text-muted">{domain?.name}</p>
      )}
      {practice.summary ? <p className="mt-3 max-w-xl">{practice.summary}</p> : null}
      <ul className="mt-6 border-t border-line">
        {meetings.map((meeting) => (
          <li key={meeting.stage} className="flex items-baseline justify-between border-b border-line py-3">
            <span>{stageName(meeting.stage)}</span>
            <span className="text-sm text-muted">{meeting.found ? daysSince(meeting.found.at) : "Not yet"}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex flex-wrap gap-2">
        <Button onClick={() => push({ id: "isolate-log", practiceId: practice.id })}>Isolate</Button>
        {editing ? null : (
          <Button
            variant="secondary"
            onClick={() => {
              setDraftName(practice.name);
              setDraftDomain(practice.domainId);
              setEditing(true);
            }}
          >
            Edit
          </Button>
        )}
        {practice.origin === "custom" ? (
          <Button
            variant="danger"
            onClick={() => {
              deletePractice(practice.id);
              pop();
            }}
          >
            Delete unit
          </Button>
        ) : null}
      </div>
      {lastMeeting(sessions, practice.id) ? null : <p className="mt-4 text-sm text-muted">This unit has not been part of a session yet.</p>}
    </div>
  );
}

export function ContinueScreen() {
  const { screen, pop } = useNav();
  const sessionId = screen.id === "continue" ? screen.sessionId : "";
  const session = usePractice((state) => state.sessions.find((item) => item.id === sessionId));
  const practices = usePractice((state) => state.practices);
  const extendSession = usePractice((state) => state.extendSession);
  const clock = useClock();
  if (!session) return <Missing onBack={pop} />;
  const names = session.practiceIds.map((id) => practices.find((item) => item.id === id)?.name ?? "Unit").join(" · ");
  return (
    <div>
      <Back title="Continue" onBack={pop} />
      <p className="font-medium">{stageName(session.stage)}</p>
      <p className="mt-1 text-muted">{names}</p>
      <p className="mt-3 text-sm text-muted">Already {formatDuration(session.durationSec)}. Time you add stays with this session.</p>
      {session.notes ? <p className="mt-3 whitespace-pre-wrap text-sm">{session.notes}</p> : null}
      <form
        className="mt-6 grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (clock.duration > 0 || clock.notes.trim()) extendSession(session.id, clock.duration, clock.notes);
          pop();
        }}
      >
        <SessionTimer
          running={clock.timer.running}
          display={clock.timer.display}
          onStart={clock.timer.start}
          onPause={clock.timer.pause}
          onStop={clock.timer.stop}
          onClear={clock.timer.clear}
        />
        <DurationFields
          hours={clock.hours}
          minutes={clock.minutes}
          seconds={clock.seconds}
          onHours={clock.setHours}
          onMinutes={clock.setMinutes}
          onSeconds={clock.setSeconds}
        />
        <Note label="What you noticed this time" value={clock.notes} onChange={clock.setNotes} />
      </form>
    </div>
  );
}

export function TimerLogScreen() {
  const { screen, pop, tab } = useNav();
  const durationSec = screen.id === "timer-log" ? screen.durationSec : 0;
  const practices = usePractice((state) => state.practices);
  const domains = usePractice((state) => state.domains);
  const addPractice = usePractice((state) => state.addPractice);
  const savePhrase = usePractice((state) => state.savePhrase);
  const logSession = usePractice((state) => state.logSession);
  const [stage, setStage] = useState<Stage>("isolation");
  const [ids, setIds] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [unitName, setUnitName] = useState("");
  const [domainId, setDomainId] = useState(domains[0]?.id ?? "");
  const split = splitDuration(durationSec);
  const [hours, setHours] = useState(split.hours);
  const [minutes, setMinutes] = useState(split.minutes);
  const [seconds, setSeconds] = useState(split.seconds);
  const nameOf = (id: string) => practices.find((item) => item.id === id)?.name ?? "Unit";
  const max = stage === "isolation" ? 1 : 4;
  const ready = stage === "isolation" ? ids.length === 1 : ids.length >= 2;

  function toggle(id: string) {
    setIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (stage === "isolation") return [id];
      if (current.length >= 4) return current;
      return [...current, id];
    });
  }

  function move(index: number, direction: -1 | 1) {
    setIds((current) => {
      const next = [...current];
      const swap = index + direction;
      if (swap < 0 || swap >= next.length) return current;
      [next[index], next[swap]] = [next[swap], next[index]];
      return next;
    });
  }

  return (
    <div>
      <Back title="Log a session" onBack={pop} />
      <p className="text-muted">The time from the timer is already here. Choose what the time was for.</p>
      <div className="mt-6 flex flex-wrap gap-2">
        {(["isolation", "integration", "improvisation"] as const).map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={stage === item}
            onClick={() => {
              setStage(item);
              if (item === "isolation") setIds((current) => current.slice(0, 1));
            }}
            className={`h-11 rounded-full border px-3 text-sm ${stage === item ? "border-transparent bg-accent text-accent-fg" : "border-line bg-surface"}`}
          >
            {stageName(item)}
          </button>
        ))}
      </div>
      <form
        className="mt-6 grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          const id = addPractice(domainId, unitName);
          if (!id) return;
          setUnitName("");
          toggle(id);
        }}
      >
        <p className="text-sm font-medium">Create a unit</p>
        <Input value={unitName} onChange={(event) => setUnitName(event.target.value)} placeholder="Name" aria-label="Unit name" required />
        <Select value={domainId} onChange={(event) => setDomainId(event.target.value)} aria-label="Domain">
          {domains.map((domain) => (
            <option key={domain.id} value={domain.id}>
              {domain.name}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="secondary" disabled={!unitName.trim()}>
          Add unit
        </Button>
      </form>
      <UnitPicker selected={ids} onToggle={toggle} max={max} />
      {stage === "integration" && ids.length > 0 ? <OrderList ids={ids} nameOf={nameOf} onMove={move} /> : null}
      <form
        className="mt-6 grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!ready) return;
          const phraseId = stage === "integration" ? savePhrase(name, ids) : null;
          logSession({
            stage,
            practiceIds: ids,
            phraseId,
            appearedIds: ids,
            notes: notes.trim(),
            durationSec: toSeconds(hours, minutes, seconds),
          });
          tab({ id: "today" });
        }}
      >
        {stage === "integration" ? (
          <label className="grid gap-2 text-sm font-medium">
            Phrase name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="A name you will recognize"
              aria-label="Phrase name"
              className="h-11 w-full rounded-md border border-line bg-surface px-3 text-base text-ink"
            />
          </label>
        ) : null}
        <DurationFields hours={hours} minutes={minutes} seconds={seconds} onHours={setHours} onMinutes={setMinutes} onSeconds={setSeconds} />
        <Note label="What you noticed" value={notes} onChange={setNotes} />
        <Button type="submit" disabled={!ready}>
          Save session
        </Button>
      </form>
    </div>
  );
}

function splitDuration(total: number) {
  const safe = Math.max(0, Math.floor(total));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return {
    hours: hours > 0 ? String(hours) : "",
    minutes: minutes > 0 ? String(minutes) : "",
    seconds: seconds > 0 ? String(seconds) : "",
  };
}

function Missing({ onBack }: { onBack: () => void }) {
  return (
    <div>
      <h1 className="display text-4xl">Missing</h1>
      <Button className="mt-4" variant="secondary" onClick={onBack}>
        Back
      </Button>
    </div>
  );
}

function sameSet(a: string[], b: string[]) {
  return a.length === b.length && a.every((id) => b.includes(id));
}
