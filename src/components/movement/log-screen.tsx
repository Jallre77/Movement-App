import { useRef, useState } from "react";
import { MediaEditor } from "@/components/movement/media-editor";
import { IrradiationControl } from "@/components/movement/irradiation";
import { useNav } from "@/components/movement/nav";
import { Button, Input, Select, Textarea } from "@/components/ui";
import { commitMedia } from "@/lib/movement/media";
import { useMovement } from "@/lib/movement/store";
import { totalMs, uid } from "@/lib/movement/time";
import { ISOMETRIC_PASSES, ISOMETRIC_SECTION, LIMBS, OWNERSHIP, type DraftMedia, type IsometricPass, type Limb, type Ownership, type Session } from "@/lib/movement/types";

export function LogScreen() {
  const { screen, replace } = useNav();
  const log = screen.id === "log" ? screen : null;
  const categories = useMovement((state) => state.categories);
  const subcategories = useMovement((state) => state.subcategories);
  const practices = useMovement((state) => state.practices);
  const regions = useMovement((state) => state.regions);
  const existing = useMovement((state) =>
    log?.sessionId ? state.sessions.find((item) => item.id === log.sessionId) : undefined,
  );
  const seededPractice = practices.find((item) => item.id === (existing?.practiceId ?? log?.practiceId));
  const [practiceId, setPracticeId] = useState<string | null>(existing?.practiceId ?? seededPractice?.id ?? null);
  const [name, setName] = useState(existing?.name ?? seededPractice?.name ?? "");
  const [categoryId, setCategoryId] = useState(
    existing?.categoryId ?? seededPractice?.categoryId ?? categories[0]?.id ?? "",
  );
  const [subcategoryId, setSubcategoryId] = useState(existing?.subcategoryId ?? seededPractice?.subcategoryId ?? "");
  const [regionIds, setRegionIds] = useState<string[]>(existing?.regionIds ?? []);
  const [side, setSide] = useState<Limb | null>(existing?.side ?? null);
  const [isometric, setIsometric] = useState<IsometricPass | null>(existing?.isometric ?? null);
  const [intention, setIntention] = useState(existing?.intention ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [ownership, setOwnership] = useState<Ownership | null>(existing?.ownership ?? null);
  const [irradiation, setIrradiation] = useState<number | null>(
    existing?.irradiation ?? seededPractice?.irradiation ?? null,
  );
  const initialSec = existing?.durationSec ?? log?.durationSec ?? 0;
  const [hours, setHours] = useState(durationPart(initialSec, "h"));
  const [mins, setMins] = useState(durationPart(initialSec, "m"));
  const [secs, setSecs] = useState(durationPart(initialSec, "s"));
  const [at, setAt] = useState(toLocalInput(existing?.at ?? log?.at ?? Date.now()));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const mediaRef = useRef<DraftMedia[]>(existing?.media.map((item) => ({ ...item })) ?? []);
  const subs = subcategories.filter((sub) => sub.categoryId === categoryId);
  const timerStatus = useMovement((state) => state.timer.status);
  const category = categories.find((item) => item.id === categoryId);
  const internal = category?.id === "cat-internal" || category?.name === "Internal Training";
  const isometricSection = subcategoryId === ISOMETRIC_SECTION;

  function choosePractice(id: string) {
    setPracticeId(id || null);
    const found = practices.find((item) => item.id === id);
    if (!found) return;
    setName(found.name);
    setCategoryId(found.categoryId);
    setSubcategoryId(found.subcategoryId ?? "");
    setIrradiation(found.subcategoryId === "sub-cars" ? (found.irradiation ?? null) : null);
  }

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name what you practiced.");
      return;
    }
    if (!categoryId) {
      setError("Choose a category.");
      return;
    }
    const hourCount = Number(hours || 0);
    const minutes = Number(mins || 0);
    const seconds = Number(secs || 0);
    if (
      !Number.isFinite(hourCount) ||
      !Number.isFinite(minutes) ||
      !Number.isFinite(seconds) ||
      hourCount < 0 ||
      minutes < 0 ||
      seconds < 0
    ) {
      setError("Duration needs zero or a positive number of hours, minutes, and seconds.");
      return;
    }
    const category = categories.find((item) => item.id === categoryId);
    const sub = subs.find((item) => item.id === subcategoryId);
    setSaving(true);
    setError(null);
    try {
      const media = await commitMedia(existing?.media ?? [], mediaRef.current);
      const session: Session = {
        id: existing?.id ?? uid("ses"),
        practiceId,
        name: trimmed,
        categoryId,
        categoryName: category?.name ?? existing?.categoryName ?? "Practice",
        subcategoryId: sub?.id ?? null,
        subcategoryName: sub?.name ?? null,
        regionIds,
        regionNames: regionIds
          .map((id) => regions.find((region) => region.id === id)?.name)
          .filter((item): item is string => Boolean(item)),
        side: internal ? side : null,
        isometric: isometricSection ? isometric : null,
        intention: intention.trim(),
        notes: notes.trim(),
        durationSec: Math.min(24 * 60 * 60, Math.round(hourCount * 3600 + minutes * 60 + seconds)),
        ownership,
        irradiation: subcategoryId === "sub-cars" ? irradiation : null,
        media,
        at: fromLocalInput(at),
      };
      useMovement.getState().saveSession(session);
      replace({ id: "journal" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the session.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="display text-5xl">{existing ? "Edit session" : "Log a session"}</h1>
      <p className="mt-3 max-w-xl text-sm text-muted">
        Write what you intended, what you attended to, and the force the tissues actually received.
      </p>
      <form
        className="mt-6 grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <label className="grid gap-2 text-sm font-medium">
          From the library
          <Select value={practiceId ?? ""} onChange={(event) => choosePractice(event.target.value)}>
            <option value="">None — write it in</option>
            {practices.map((practice) => (
              <option key={practice.id} value={practice.id}>
                {practice.name}
              </option>
            ))}
          </Select>
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Name
          <Input value={name} onChange={(event) => setName(event.target.value)} required />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium">
            Category
            <Select
              value={categoryId}
              onChange={(event) => {
                setCategoryId(event.target.value);
                setSubcategoryId("");
              }}
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Subcategory
            <Select value={subcategoryId ?? ""} onChange={(event) => setSubcategoryId(event.target.value)}>
              <option value="">None</option>
              {subs.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </Select>
          </label>
        </div>
        {internal ? (
          <fieldset>
            <legend className="sr-only">Side</legend>
            <div className="flex gap-2" role="group" aria-label="Side">
              {LIMBS.map((limb) => {
                const on = side === limb.id;
                return (
                  <button
                    key={limb.id}
                    type="button"
                    aria-pressed={on}
                    aria-label={limb.name}
                    onClick={() => setSide(on ? null : limb.id)}
                    className={
                      on
                        ? "inline-flex size-11 items-center justify-center rounded-sm border border-ink bg-inverse text-sm font-medium text-inverse-fg"
                        : "inline-flex size-11 items-center justify-center rounded-sm border border-line bg-surface text-sm font-medium"
                    }
                  >
                    {limb.label}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ) : null}
        {isometricSection ? (
          <fieldset>
            <legend className="sr-only">PAILs and RAILs</legend>
            <div className="grid grid-cols-3 gap-2" role="group" aria-label="PAILs and RAILs">
              {ISOMETRIC_PASSES.map((pass) => {
                const on = isometric === pass.id;
                return (
                  <button
                    key={pass.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setIsometric(on ? null : pass.id)}
                    className={
                      on
                        ? "h-11 rounded-sm border border-ink bg-inverse text-sm font-medium text-inverse-fg"
                        : "h-11 rounded-sm border border-line bg-surface text-sm font-medium"
                    }
                  >
                    {pass.label}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ) : null}
        <fieldset>
          <legend className="text-sm font-medium">Regions</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {regions.map((region) => {
              const on = regionIds.includes(region.id);
              return (
                <button
                  key={region.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    setRegionIds((current) =>
                      current.includes(region.id) ? current.filter((id) => id !== region.id) : [...current, region.id],
                    )
                  }
                  className={
                    on
                      ? "h-11 rounded-full border border-ink bg-inverse px-3 text-sm text-inverse-fg"
                      : "h-11 rounded-full border border-line bg-surface px-3 text-sm"
                  }
                >
                  {region.name}
                </button>
              );
            })}
          </div>
        </fieldset>
        {subcategoryId === "sub-cars" ? (
          <div>
            <p className="text-sm font-medium">Body tension during the CAR</p>
            <IrradiationControl
              value={irradiation}
              onChange={(value) => {
                setIrradiation(value);
                if (practiceId) useMovement.getState().setIrradiation(practiceId, value);
              }}
            />
          </div>
        ) : null}
        <div className="grid grid-cols-3 gap-3">
          <label className="grid gap-2 text-sm font-medium">
            Hours
            <Input
              inputMode="numeric"
              placeholder="0"
              value={hours}
              onChange={(event) => setHours(digitsOnly(event.target.value))}
              onFocus={(event) => {
                if (event.currentTarget.value === "0") event.currentTarget.select();
              }}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Minutes
            <Input
              inputMode="numeric"
              placeholder="0"
              value={mins}
              onChange={(event) => setMins(digitsOnly(event.target.value))}
              onFocus={(event) => {
                if (event.currentTarget.value === "0") event.currentTarget.select();
              }}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Seconds
            <Input
              inputMode="numeric"
              placeholder="0"
              value={secs}
              onChange={(event) => setSecs(digitsOnly(event.target.value))}
              onFocus={(event) => {
                if (event.currentTarget.value === "0") event.currentTarget.select();
              }}
            />
          </label>
        </div>
        {timerStatus !== "idle" ? (
          <Button
            variant="secondary"
            onClick={() => {
              const total = Math.max(0, Math.round(totalMs(useMovement.getState().timer, Date.now()) / 1000));
              setHours(durationPart(total, "h"));
              setMins(durationPart(total, "m"));
              setSecs(durationPart(total, "s"));
            }}
          >
            Use the timer
          </Button>
        ) : null}
        <label className="grid gap-2 text-sm font-medium">
          When
          <Input type="datetime-local" value={at} onChange={(event) => setAt(event.target.value)} />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Intention
          <Input
            value={intention}
            onChange={(event) => setIntention(event.target.value)}
            placeholder="Own the last few degrees of hip rotation"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Attention and force
          <Textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Where attention went, and what force the tissues received."
          />
        </label>
        <fieldset>
          <legend className="text-sm font-medium">How available was the range?</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {OWNERSHIP.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={ownership === item.id}
                onClick={() => setOwnership((current) => (current === item.id ? null : item.id))}
                className={
                  ownership === item.id
                    ? "h-14 rounded-sm border border-ink bg-inverse px-3 text-left text-inverse-fg"
                    : "h-14 rounded-sm border border-line bg-surface px-3 text-left"
                }
              >
                <span className="block text-sm font-medium">{item.label}</span>
                <span className={ownership === item.id ? "block text-xs text-inverse-fg/80" : "block text-xs text-muted"}>
                  {item.hint}
                </span>
              </button>
            ))}
          </div>
        </fieldset>
        <div>
          <p className="text-sm font-medium">Record</p>
          <p className="mt-1 text-sm text-muted">Photo, video, or a link to media stored elsewhere.</p>
          <div className="mt-3">
            <MediaEditor initial={existing?.media ?? []} onChange={(items) => (mediaRef.current = items)} />
          </div>
        </div>
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
        <Button type="submit" size="lg" disabled={saving}>
          {saving ? "Saving…" : existing ? "Update session" : "Save session"}
        </Button>
      </form>
    </div>
  );
}

function toLocalInput(ts: number) {
  const date = new Date(ts);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalInput(value: string) {
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? Date.now() : time;
}

function durationPart(totalSec: number, unit: "h" | "m" | "s") {
  const safe = Math.max(0, Math.round(totalSec));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  const value = unit === "h" ? hours : unit === "m" ? minutes : seconds;
  return value > 0 ? String(value) : "";
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
}
