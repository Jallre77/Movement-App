import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { NotesSection, RecordActions } from "@/components/movement/notes";
import { FavoriteButton } from "@/components/movement/favorites";
import { PracticeModal } from "@/components/movement/library";
import { Button, Input, Textarea } from "@/components/ui";
import { useNav } from "@/components/movement/nav";
import { useMovement } from "@/lib/movement/store";
import { formatDuration, lastPracticedNote, latestAt } from "@/lib/movement/time";
import type { Region } from "@/lib/movement/types";

export function RegionsScreen() {
  const { push } = useNav();
  const regions = useMovement((state) => state.regions);
  const sessions = useMovement((state) => state.sessions);
  const addRegion = useMovement((state) => state.addRegion);
  const [name, setName] = useState("");
  const [summary, setSummary] = useState("");

  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="display text-5xl">Regions</h1>
      <p className="mt-3 max-w-xl text-muted">
        Spine through foot, including the hand. A practice can meet more than one. Add a region if your work lives somewhere else — jaw, neck.
      </p>
      <ul className="mt-8 border-t border-line">
        {regions.map((region) => {
          const hits = sessions.filter((session) => session.regionIds.includes(region.id));
          const last = hits.sort((a, b) => b.at - a.at)[0];
          return (
            <li key={region.id} className="border-b border-line">
              <button
                type="button"
                onClick={() => push({ id: "region", regionId: region.id })}
                className="flex w-full items-baseline justify-between gap-3 py-4 text-left"
              >
                <span>
                  <span className="block text-lg">{region.name}</span>
                  <span className="text-sm text-muted">
                    {last ? formatDistanceToNow(last.at, { addSuffix: true }) : "Not yet"}
                    {(region.entries ?? []).length > 0
                      ? ` · ${(region.entries ?? []).length} ${(region.entries ?? []).length === 1 ? "note" : "notes"}`
                      : ""}
                  </span>
                </span>
                <span className="text-sm text-faint tabular-nums">{hits.length}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <form
        className="mt-8 grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          addRegion(name, summary);
          setName("");
          setSummary("");
        }}
      >
        <h2 className="text-lg font-medium">Add a region</h2>
        <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" aria-label="Region name" required />
        <Textarea
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          placeholder="What you pay attention to here"
          aria-label="Region summary"
        />
        <Button type="submit" variant="secondary" disabled={!name.trim()}>
          Add region
        </Button>
      </form>
    </div>
  );
}

export function RegionScreen() {
  const { screen, push } = useNav();
  const regionId = screen.id === "region" ? screen.regionId : "";
  const region = useMovement((state) => state.regions.find((item) => item.id === regionId));
  const allPractices = useMovement((state) => state.practices);
  const allSessions = useMovement((state) => state.sessions);
  const practices = allPractices.filter((item) => item.regionIds.includes(regionId));
  const sessions = allSessions
    .filter((item) => item.regionIds.includes(regionId))
    .sort((a, b) => b.at - a.at);
  const deleteRegion = useMovement((state) => state.deleteRegion);
  const updateRegion = useMovement((state) => state.updateRegion);
  const { pop } = useNav();
  const [editing, setEditing] = useState(false);
  const [armed, setArmed] = useState(false);
  const [name, setName] = useState("");
  const [summary, setSummary] = useState("");

  if (!region) {
    return (
      <div>
        <h1 className="display text-4xl">Region missing</h1>
        <Button className="mt-4" variant="secondary" onClick={pop}>
          Back
        </Button>
      </div>
    );
  }

  const total = sessions.reduce((sum, session) => sum + session.durationSec, 0);

  function beginEdit(current: Region) {
    setName(current.name);
    setSummary(current.summary);
    setEditing(true);
    setArmed(false);
  }

  function saveRegion(current: Region) {
    const trimmed = name.trim();
    if (!trimmed) {
      useMovement.getState().setNotice("Name the region.");
      return;
    }
    updateRegion({
      ...current,
      name: trimmed,
      summary: summary.trim(),
      entries: current.entries ?? [],
    });
    setEditing(false);
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <h1 className="display text-5xl">{region.name}</h1>
        {editing ? null : (
          <RecordActions
            subject="region"
            className={armed ? "basis-full" : undefined}
            editing={false}
            armed={armed}
            onEdit={() => beginEdit(region)}
            onCancel={() => setArmed(false)}
            onArm={() => setArmed(true)}
            onDisarm={() => setArmed(false)}
            onDelete={() => {
              deleteRegion(region.id);
              pop();
            }}
            hint="Practices lose this region. Missing starters can be restored in Settings."
          />
        )}
      </div>
      {editing ? (
        <form
          className="mt-6 grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!armed) saveRegion(region);
          }}
        >
          <label className="grid gap-2 text-sm font-medium">
            Name
            <Input value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            What you pay attention to
            <Textarea className="min-h-24" value={summary} onChange={(event) => setSummary(event.target.value)} />
          </label>
          <RecordActions
            subject="region"
            editing
            armed={armed}
            saveDisabled={!name.trim()}
            onEdit={() => beginEdit(region)}
            onCancel={() => {
              setEditing(false);
              setArmed(false);
            }}
            onArm={() => setArmed(true)}
            onDisarm={() => setArmed(false)}
            onDelete={() => {
              deleteRegion(region.id);
              pop();
            }}
            hint="Practices lose this region. Missing starters can be restored in Settings."
          />
        </form>
      ) : (
        <>
          {region.summary ? <p className="mt-3 max-w-xl text-muted">{region.summary}</p> : null}
          <p className="mt-4 text-sm text-faint tabular-nums">
            {sessions.length} sessions · {formatDuration(total)}
          </p>
        </>
      )}
      <p className="mt-3 text-sm text-muted">{lastPracticedNote(latestAt(sessions.map((session) => session.at)))}</p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Button onClick={() => push({ id: "log", regionId: region.id })}>Log for {region.name}</Button>
        <Button variant="secondary" onClick={() => push({ id: "library" })}>
          Browse practices
        </Button>
      </div>
      <NotesSection parent="region" parentId={region.id} entries={region.entries} />
      <h2 className="mt-10 text-lg font-medium">Practices</h2>
      {practices.length === 0 ? (
        <p className="mt-2 text-sm text-muted">No library practice lists this region yet.</p>
      ) : (
        <PracticeModal title={region.name} count={practices.length}>
          <ul className="border-t border-line">
            {practices.map((practice) => (
              <li key={practice.id} className="flex items-center border-b border-line">
                <button
                  type="button"
                  className="min-w-0 flex-1 py-3 text-left"
                  onClick={() => push({ id: "practice", practiceId: practice.id })}
                >
                  {practice.name}
                </button>
                <FavoriteButton practiceId={practice.id} />
              </li>
            ))}
          </ul>
        </PracticeModal>
      )}
      <h2 className="mt-10 text-lg font-medium">Journal</h2>
      {sessions.length === 0 ? (
        <p className="mt-2 text-sm text-muted">No sessions for {region.name} yet.</p>
      ) : (
        <ul className="mt-3 border-t border-line">
          {sessions.slice(0, 12).map((session) => (
            <li key={session.id} className="border-b border-line">
              <button
                type="button"
                className="flex w-full items-baseline justify-between gap-3 py-3 text-left"
                onClick={() => push({ id: "session", sessionId: session.id })}
              >
                <span>{session.name}</span>
                <span className="text-sm text-muted">{formatDuration(session.durationSec)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
