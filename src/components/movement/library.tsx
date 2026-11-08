import { ChevronDown, ChevronRight, ChevronUp, GripVertical, X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import { MediaEditor, MediaPreview } from "@/components/movement/media-editor";
import { FavoriteButton } from "@/components/movement/favorites";
import { IrradiationControl } from "@/components/movement/irradiation";
import { useNav } from "@/components/movement/nav";
import { NotesSection, RecordActions } from "@/components/movement/notes";
import { Button, Input, Select, Textarea } from "@/components/ui";
import { commitMedia, normalizeUrl } from "@/lib/movement/media";
import { useMovement } from "@/lib/movement/store";
import { lastPracticedNote, latestAt, uid } from "@/lib/movement/time";
import type { Category, DraftMedia, Practice, Subcategory } from "@/lib/movement/types";

export function LibraryScreen() {
  const { push } = useNav();
  const categories = useMovement((state) => state.categories);
  const practices = useMovement((state) => state.practices);
  const addCategory = useMovement((state) => state.addCategory);
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [blurb, setBlurb] = useState("");
  const q = query.trim().toLowerCase();
  const matches = q
    ? practices.filter(
        (practice) =>
          practice.name.toLowerCase().includes(q) || practice.summary.toLowerCase().includes(q),
      )
    : [];

  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="display text-5xl">Library</h1>
      <p className="mt-3 max-w-xl text-muted">
        Categories hold subcategories. A practice can point at a photo, a clip, or a video that lives somewhere else.
      </p>
      <Input
        className="mt-6"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search practices"
        aria-label="Search practices"
      />
      {q ? (
        <ul className="mt-4 border-t border-line">
          {matches.length === 0 ? (
            <li className="py-4 text-sm text-muted">No practice matches that.</li>
          ) : (
            matches.map((practice) => (
              <li key={practice.id} className="border-b border-line">
                <button
                  type="button"
                  className="w-full py-3 text-left"
                  onClick={() => push({ id: "practice", practiceId: practice.id })}
                >
                  {practice.name}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : (
        <ul className="mt-6 border-t border-line">
          {categories.map((category) => (
            <li key={category.id} className="border-b border-line">
              <button
                type="button"
                onClick={() => push({ id: "category", categoryId: category.id })}
                className="flex w-full items-center justify-between gap-3 py-4 text-left"
              >
                <span>
                  <span className="block text-lg">{category.name}</span>
                  <span className="text-sm text-muted">{category.blurb}</span>
                  {(category.entries ?? []).length > 0 ? (
                    <span className="text-sm text-faint">
                      {(category.entries ?? []).length === 1
                        ? "1 note"
                        : `${(category.entries ?? []).length} notes`}
                    </span>
                  ) : null}
                </span>
                <ChevronRight className="size-5 text-faint" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        className="mt-8 grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          addCategory(name, blurb);
          setName("");
          setBlurb("");
        }}
      >
        <h2 className="text-lg font-medium">New category</h2>
        <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" aria-label="Category name" required />
        <Input value={blurb} onChange={(event) => setBlurb(event.target.value)} placeholder="One line about it" aria-label="Category summary" />
        <Button type="submit" variant="secondary" disabled={!name.trim()}>
          Add category
        </Button>
      </form>
    </div>
  );
}

export function CategoryScreen() {
  const { screen, push, pop } = useNav();
  const categoryId = screen.id === "category" ? screen.categoryId : "";
  const category = useMovement((state) => state.categories.find((item) => item.id === categoryId));
  const allSubs = useMovement((state) => state.subcategories);
  const allPractices = useMovement((state) => state.practices);
  const subcategories = allSubs.filter((item) => item.categoryId === categoryId);
  const practices = allPractices.filter((item) => item.categoryId === categoryId);
  const regions = useMovement((state) => state.regions);
  const sessions = useMovement((state) => state.sessions);
  const addSubcategory = useMovement((state) => state.addSubcategory);
  const updateCategory = useMovement((state) => state.updateCategory);
  const updateSubcategory = useMovement((state) => state.updateSubcategory);
  const deleteSubcategory = useMovement((state) => state.deleteSubcategory);
  const deleteCategory = useMovement((state) => state.deleteCategory);
  const [subName, setSubName] = useState("");
  const [subSummary, setSubSummary] = useState("");
  const [editing, setEditing] = useState(false);
  const [armed, setArmed] = useState(false);
  const [name, setName] = useState("");
  const [blurb, setBlurb] = useState("");
  const [summary, setSummary] = useState("");
  const [guide, setGuide] = useState("");
  const [editingSub, setEditingSub] = useState<string | null>(null);
  const [armedSub, setArmedSub] = useState<string | null>(null);
  const [sectionName, setSectionName] = useState("");
  const [sectionSummary, setSectionSummary] = useState("");

  if (!category) {
    return (
      <div>
        <h1 className="display text-4xl">Category missing</h1>
        <Button className="mt-4" variant="secondary" onClick={pop}>
          Back
        </Button>
      </div>
    );
  }

  const unsorted = practices.filter((practice) => !practice.subcategoryId);

  function beginEdit(current: Category) {
    setName(current.name);
    setBlurb(current.blurb);
    setSummary(current.summary);
    setGuide(current.note);
    setEditing(true);
    setArmed(false);
  }

  function saveCategory(current: Category) {
    const trimmed = name.trim();
    if (!trimmed) {
      useMovement.getState().setNotice("Name the category.");
      return;
    }
    updateCategory({
      ...current,
      name: trimmed,
      blurb: blurb.trim() || "A category you keep.",
      summary: summary.trim(),
      note: guide.trim(),
      entries: current.entries ?? [],
    });
    setEditing(false);
  }

  function beginSection(sub: Subcategory) {
    setEditingSub(sub.id);
    setSectionName(sub.name);
    setSectionSummary(sub.summary);
    setArmedSub(null);
  }

  function saveSection(sub: Subcategory) {
    const trimmed = sectionName.trim();
    if (!trimmed) {
      useMovement.getState().setNotice("Name the section.");
      return;
    }
    updateSubcategory({
      ...sub,
      name: trimmed,
      summary: sectionSummary.trim(),
      entries: sub.entries ?? [],
    });
    setEditingSub(null);
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <h1 className="display text-5xl">{category.name}</h1>
        {editing ? null : (
          <RecordActions
            subject="category"
            className={armed ? "basis-full" : undefined}
            editing={false}
            armed={armed}
            onEdit={() => beginEdit(category)}
            onCancel={() => setArmed(false)}
            onArm={() => setArmed(true)}
            onDisarm={() => setArmed(false)}
            onDelete={() => {
              deleteCategory(category.id);
              pop();
            }}
            hint="This removes the category, its sections, and its practices. Journal entries stay. Starters can be restored in Settings."
          />
        )}
      </div>
      {editing ? (
        <form
          className="mt-6 grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!armed) saveCategory(category);
          }}
        >
          <label className="grid gap-2 text-sm font-medium">
            Name
            <Input value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Short line
            <Input value={blurb} onChange={(event) => setBlurb(event.target.value)} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Description
            <Textarea className="min-h-24" value={summary} onChange={(event) => setSummary(event.target.value)} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Guide
            <Textarea className="min-h-24" value={guide} onChange={(event) => setGuide(event.target.value)} />
          </label>
          <RecordActions
            subject="category"
            editing
            armed={armed}
            saveDisabled={!name.trim()}
            onEdit={() => beginEdit(category)}
            onCancel={() => {
              setEditing(false);
              setArmed(false);
            }}
            onArm={() => setArmed(true)}
            onDisarm={() => setArmed(false)}
            onDelete={() => {
              deleteCategory(category.id);
              pop();
            }}
            hint="This removes the category, its sections, and its practices. Journal entries stay. Starters can be restored in Settings."
          />
        </form>
      ) : (
        <>
          {category.summary ? <p className="mt-3 max-w-xl text-muted">{category.summary}</p> : null}
          {category.note ? <p className="mt-3 max-w-xl text-sm text-faint">{category.note}</p> : null}
        </>
      )}
      <NotesSection parent="category" parentId={category.id} entries={category.entries} />
      {subcategories.map((sub) => {
        const items = practices.filter((practice) => practice.subcategoryId === sub.id);
        const sectionEditing = editingSub === sub.id;
        return (
          <section key={sub.id} className="mt-10">
            {sectionEditing ? (
              <form
                className="grid gap-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (armedSub !== sub.id) saveSection(sub);
                }}
              >
                <h2 className="text-lg font-medium">Section</h2>
                <Input
                  value={sectionName}
                  onChange={(event) => setSectionName(event.target.value)}
                  aria-label="Section name"
                  required
                />
                <Input
                  value={sectionSummary}
                  onChange={(event) => setSectionSummary(event.target.value)}
                  aria-label="Section summary"
                  placeholder="What this group is for"
                />
                <RecordActions
                  subject="section"
                  editing
                  armed={armedSub === sub.id}
                  saveDisabled={!sectionName.trim()}
                  onEdit={() => beginSection(sub)}
                  onCancel={() => {
                    setEditingSub(null);
                    setArmedSub(null);
                  }}
                  onArm={() => setArmedSub(sub.id)}
                  onDisarm={() => setArmedSub(null)}
                  onDelete={() => {
                    deleteSubcategory(sub.id);
                    setEditingSub(null);
                    setArmedSub(null);
                  }}
                  hint="Practices in this section become unsorted."
                />
              </form>
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-lg font-medium">{sub.name}</h2>
                    {sub.summary ? <p className="text-sm text-muted">{sub.summary}</p> : null}
                  </div>
                  <RecordActions
                    subject="section"
                    className={armedSub === sub.id ? "basis-full" : undefined}
                    editing={false}
                    armed={armedSub === sub.id}
                    onEdit={() => beginSection(sub)}
                    onCancel={() => setArmedSub(null)}
                    onArm={() => setArmedSub(sub.id)}
                    onDisarm={() => setArmedSub(null)}
                    onDelete={() => {
                      deleteSubcategory(sub.id);
                      setArmedSub(null);
                    }}
                    hint="Practices in this section become unsorted."
                  />
                </div>
              </>
            )}
            <p className="mt-2 text-sm text-muted">
              {lastPracticedNote(
                latestAt(
                  sessions
                    .filter(
                      (session) =>
                        session.subcategoryId === sub.id ||
                        items.some((practice) => practice.id === session.practiceId),
                    )
                    .map((session) => session.at),
                ),
              )}
            </p>
            <PracticeModal title={sub.name} count={items.length}>
              {sub.id === "sub-cars" ? (
                <CarsList
                  practices={items}
                  regions={regions}
                  onOpen={(id) => push({ id: "practice", practiceId: id })}
                  onRecord={(id) => push({ id: "log", practiceId: id })}
                />
              ) : (
                <PracticeList practices={items} regions={regions} onOpen={(id) => push({ id: "practice", practiceId: id })} />
              )}
              <Button
                className="mt-3"
                variant="ghost"
                onClick={() => push({ id: "practice-form", categoryId, subcategoryId: sub.id })}
              >
                Add practice
              </Button>
            </PracticeModal>
            {items.length === 0 ? (
              <Button
                className="mt-3"
                variant="ghost"
                onClick={() => push({ id: "practice-form", categoryId, subcategoryId: sub.id })}
              >
                Add practice
              </Button>
            ) : null}
          </section>
        );
      })}
      {unsorted.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-lg font-medium">Unsorted</h2>
          <PracticeModal title="Unsorted" count={unsorted.length}>
            <PracticeList practices={unsorted} regions={regions} onOpen={(id) => push({ id: "practice", practiceId: id })} />
          </PracticeModal>
        </section>
      ) : null}
      <form
        className="mt-10 grid gap-3 border-t border-line pt-6"
        onSubmit={(event) => {
          event.preventDefault();
          addSubcategory(category.id, subName, subSummary);
          setSubName("");
          setSubSummary("");
        }}
      >
        <h2 className="text-lg font-medium">New subcategory</h2>
        <Input
          value={subName}
          onChange={(event) => setSubName(event.target.value)}
          placeholder="Name"
          aria-label="Subcategory name"
          required
        />
        <Input
          value={subSummary}
          onChange={(event) => setSubSummary(event.target.value)}
          placeholder="What this group is for"
          aria-label="Subcategory summary"
        />
        <Button type="submit" variant="secondary" disabled={!subName.trim()}>
          Add subcategory
        </Button>
      </form>
    </div>
  );
}

export function PracticeModal({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  if (count === 0) return null;
  const label = `${count} ${count === 1 ? "practice" : "practices"}`;
  return (
    <Dialog.Root>
      <Dialog.Trigger className="mt-4 inline-flex h-11 items-center rounded-sm border border-line bg-surface px-4 text-sm font-medium">
        {label}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40" />
        <Dialog.Content className="panel-shadow fixed inset-x-4 top-1/2 z-50 flex max-h-[85dvh] -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-surface md:inset-x-auto md:left-1/2 md:w-full md:max-w-lg md:-translate-x-1/2">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <Dialog.Title className="text-lg font-medium">{title}</Dialog.Title>
            <Dialog.Close className="inline-flex size-11 shrink-0 items-center justify-center" aria-label="Close">
              <X className="size-5" aria-hidden="true" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">Practices in {title}.</Dialog.Description>
          <div className="overflow-auto px-4 pb-4">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function useReorder(practices: Practice[]) {
  const placePractice = useMovement((state) => state.placePractice);
  const listRef = useRef<HTMLUListElement>(null);
  const drag = useRef<{ id: string; startY: number; active: boolean } | null>(null);
  const overRef = useRef<number | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [over, setOver] = useState<number | null>(null);

  function start(event: PointerEvent<HTMLButtonElement>, id: string) {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id, startY: event.clientY, active: false };
    overRef.current = practices.findIndex((item) => item.id === id);
  }

  function move(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (!current || !listRef.current) return;
    if (!current.active && Math.abs(event.clientY - current.startY) < 6) return;
    current.active = true;
    setDraggingId(current.id);
    const rows = [...listRef.current.querySelectorAll<HTMLElement>("[data-practice-id]")];
    let index = Math.max(0, rows.length - 1);
    for (let i = 0; i < rows.length; i += 1) {
      const rect = rows[i].getBoundingClientRect();
      if (event.clientY < rect.top + rect.height / 2) {
        index = i;
        break;
      }
    }
    overRef.current = index;
    setOver(index);
    const scroller = listRef.current.closest(".overflow-auto");
    if (scroller instanceof HTMLElement) {
      const rect = scroller.getBoundingClientRect();
      if (event.clientY < rect.top + 48) scroller.scrollTop -= 18;
      else if (event.clientY > rect.bottom - 48) scroller.scrollTop += 18;
    }
  }

  function end() {
    const current = drag.current;
    const index = overRef.current;
    drag.current = null;
    overRef.current = null;
    setDraggingId(null);
    setOver(null);
    if (current?.active && index != null) placePractice(current.id, index);
  }

  return { listRef, draggingId, over, start, move, end };
}

function DragHandle({ name, onPointerDown, onPointerMove, onPointerUp }: {
  name: string;
  onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={`Drag to reorder ${name}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className="inline-flex size-11 shrink-0 cursor-grab touch-none items-center justify-center active:cursor-grabbing"
    >
      <GripVertical className="size-4 text-faint" aria-hidden="true" />
    </button>
  );
}

function MoveButtons({
  name,
  index,
  count,
  onMove,
}: {
  name: string;
  index: number;
  count: number;
  onMove: (direction: "up" | "down") => void;
}) {
  return (
    <div className="flex shrink-0">
      <button
        type="button"
        aria-label={`Move ${name} up`}
        disabled={index === 0}
        onClick={() => onMove("up")}
        className="inline-flex size-11 items-center justify-center disabled:opacity-30"
      >
        <ChevronUp className="size-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label={`Move ${name} down`}
        disabled={index === count - 1}
        onClick={() => onMove("down")}
        className="inline-flex size-11 items-center justify-center disabled:opacity-30"
      >
        <ChevronDown className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

function CarsList({
  practices,
  regions,
  onOpen,
  onRecord,
}: {
  practices: Practice[];
  regions: { id: string; name: string }[];
  onOpen: (id: string) => void;
  onRecord: (id: string) => void;
}) {
  const setIrradiation = useMovement((state) => state.setIrradiation);
  const movePractice = useMovement((state) => state.movePractice);
  const reorder = useReorder(practices);
  if (practices.length === 0) return <p className="mt-2 text-sm text-muted">No practices yet.</p>;
  return (
    <ul ref={reorder.listRef} className="mt-3 border-t border-line">
      {practices.map((practice, index) => {
        const names = practice.regionIds
          .map((id) => regions.find((region) => region.id === id)?.name)
          .filter(Boolean)
          .join(", ");
        const all = practice.id === "prac-all-cars";
        return (
          <li
            key={practice.id}
            data-practice-id={practice.id}
            className={`border-b border-line py-3 ${reorder.draggingId === practice.id ? "opacity-50" : ""} ${reorder.over === index && reorder.draggingId && reorder.draggingId !== practice.id ? "border-t-2 border-t-ink" : ""}`}
          >
            <div className="flex items-start justify-between gap-1">
              <DragHandle
                name={practice.name}
                onPointerDown={(event) => reorder.start(event, practice.id)}
                onPointerMove={reorder.move}
                onPointerUp={reorder.end}
              />
              <MoveButtons
                name={practice.name}
                index={index}
                count={practices.length}
                onMove={(direction) => movePractice(practice.id, direction)}
              />
              <button type="button" onClick={() => onOpen(practice.id)} className="min-w-0 flex-1 py-2 text-left">
                <span className="block">{practice.name}</span>
                <span className="block text-sm text-muted">{all ? "Every region in one session." : names}</span>
              </button>
              {all ? (
                <div className="flex shrink-0 items-center gap-1">
                  <FavoriteButton practiceId={practice.id} />
                  <Button type="button" onClick={() => onRecord(practice.id)}>
                    Record session
                  </Button>
                </div>
              ) : (
                <div className="flex shrink-0 items-center">
                  <FavoriteButton practiceId={practice.id} />
                  <ChevronRight className="size-4 text-faint" aria-hidden="true" />
                </div>
              )}
            </div>
            <IrradiationControl
              value={practice.irradiation ?? null}
              onChange={(value) => setIrradiation(practice.id, value)}
            />
          </li>
        );
      })}
    </ul>
  );
}

function PracticeList({
  practices,
  regions,
  onOpen,
}: {
  practices: Practice[];
  regions: { id: string; name: string }[];
  onOpen: (id: string) => void;
}) {
  const movePractice = useMovement((state) => state.movePractice);
  const reorder = useReorder(practices);
  if (practices.length === 0) return <p className="mt-2 text-sm text-muted">No practices yet.</p>;
  return (
    <ul ref={reorder.listRef} className="mt-3 border-t border-line">
      {practices.map((practice, index) => {
        const names = practice.regionIds
          .map((id) => regions.find((region) => region.id === id)?.name)
          .filter(Boolean)
          .join(", ");
        return (
          <li
            key={practice.id}
            data-practice-id={practice.id}
            className={`flex items-center border-b border-line ${reorder.draggingId === practice.id ? "opacity-50" : ""} ${reorder.over === index && reorder.draggingId && reorder.draggingId !== practice.id ? "border-t-2 border-t-ink" : ""}`}
          >
            <DragHandle
              name={practice.name}
              onPointerDown={(event) => reorder.start(event, practice.id)}
              onPointerMove={reorder.move}
              onPointerUp={reorder.end}
            />
            <MoveButtons
              name={practice.name}
              index={index}
              count={practices.length}
              onMove={(direction) => movePractice(practice.id, direction)}
            />
            <button type="button" onClick={() => onOpen(practice.id)} className="flex min-w-0 flex-1 items-center justify-between gap-3 py-3 text-left">
              <span className="min-w-0">
                <span className="block">{practice.name}</span>
                {names ? <span className="block text-sm text-muted">{names}</span> : null}
              </span>
              <ChevronRight className="size-4 shrink-0 text-faint" aria-hidden="true" />
            </button>
            <FavoriteButton practiceId={practice.id} />
          </li>
        );
      })}
    </ul>
  );
}

export function PracticeScreen() {
  const { screen, push, pop } = useNav();
  const practiceId = screen.id === "practice" ? screen.practiceId : "";
  const practice = useMovement((state) => state.practices.find((item) => item.id === practiceId));
  const regions = useMovement((state) => state.regions);
  const category = useMovement((state) => state.categories.find((item) => item.id === practice?.categoryId));
  const sub = useMovement((state) => state.subcategories.find((item) => item.id === practice?.subcategoryId));
  const sessions = useMovement((state) => state.sessions);

  if (!practice) {
    return (
      <div>
        <h1 className="display text-4xl">Practice missing</h1>
        <Button className="mt-4" variant="secondary" onClick={pop}>
          Back
        </Button>
      </div>
    );
  }

  const regionNames = practice.regionIds
    .map((id) => regions.find((region) => region.id === id)?.name)
    .filter(Boolean)
    .join(", ");

  return (
    <div className="mx-auto w-full max-w-2xl">
      <p className="text-sm text-muted">
        {category?.name}
        {sub ? ` · ${sub.name}` : ""}
      </p>
      <div className="mt-2 flex items-start justify-between gap-3">
        <h1 className="display text-5xl">{practice.name}</h1>
        <FavoriteButton practiceId={practice.id} />
      </div>
      <p className="mt-3 text-sm text-muted">
        {lastPracticedNote(latestAt(sessions.filter((session) => session.practiceId === practice.id).map((session) => session.at)))}
      </p>
      {practice.summary ? <p className="mt-4 max-w-xl text-muted">{practice.summary}</p> : null}
      {regionNames ? <p className="mt-4 text-sm">{regionNames}</p> : null}
      {practice.subcategoryId === "sub-cars" ? (
        <IrradiationControl
          value={practice.irradiation ?? null}
          onChange={(value) => useMovement.getState().setIrradiation(practice.id, value)}
        />
      ) : null}
      {practice.linkUrl ? (
        <a href={practice.linkUrl} target="_blank" rel="noreferrer" className="mt-4 block text-sm break-all underline">
          {practice.linkLabel || practice.linkUrl}
        </a>
      ) : null}
      {practice.media.length > 0 ? (
        <ul className="mt-6 grid gap-3">
          {practice.media.map((item) => (
            <li key={item.id} className="overflow-hidden rounded-md border border-line">
              <MediaPreview item={item} />
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-8 flex flex-col gap-2 sm:flex-row">
        <Button
          onClick={() => {
            useMovement.getState().armPractice(practice.id);
            push({ id: "timer" });
          }}
        >
          Use timer
        </Button>
        <Button variant="secondary" onClick={() => push({ id: "log", practiceId: practice.id })}>
          Log session
        </Button>
      </div>
      <Button
        className="mt-3"
        variant="ghost"
        onClick={() => push({ id: "practice-form", practiceId: practice.id })}
      >
        Edit practice
      </Button>
      <NotesSection parent="practice" parentId={practice.id} entries={practice.entries} />
    </div>
  );
}

export function PracticeFormScreen() {
  const { screen, pop } = useNav();
  const form = screen.id === "practice-form" ? screen : null;
  const existing = useMovement((state) =>
    form?.practiceId ? state.practices.find((item) => item.id === form.practiceId) : undefined,
  );
  const categories = useMovement((state) => state.categories);
  const subcategories = useMovement((state) => state.subcategories);
  const regions = useMovement((state) => state.regions);
  const savePractice = useMovement((state) => state.savePractice);
  const deletePractice = useMovement((state) => state.deletePractice);
  const [name, setName] = useState(existing?.name ?? "");
  const [summary, setSummary] = useState(existing?.summary ?? "");
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? form?.categoryId ?? categories[0]?.id ?? "");
  const [subcategoryId, setSubcategoryId] = useState<string | "">(
    existing?.subcategoryId ?? form?.subcategoryId ?? "",
  );
  const [regionIds, setRegionIds] = useState<string[]>(existing?.regionIds ?? []);
  const [linkUrl, setLinkUrl] = useState(existing?.linkUrl ?? "");
  const [linkLabel, setLinkLabel] = useState(existing?.linkLabel ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const mediaRef = useRef<DraftMedia[]>(existing?.media.map((item) => ({ ...item })) ?? []);
  const subs = subcategories.filter((sub) => sub.categoryId === categoryId);

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name the practice.");
      return;
    }
    if (!categoryId) {
      setError("Choose a category.");
      return;
    }
    let nextLink: string | null = null;
    if (linkUrl.trim()) {
      nextLink = normalizeUrl(linkUrl);
      if (!nextLink) {
        setError("That link needs to be a web address.");
        return;
      }
    }
    setSaving(true);
    setError(null);
    try {
      const media = await commitMedia(existing?.media ?? [], mediaRef.current);
      const sub = subs.find((item) => item.id === subcategoryId);
      const practice: Practice = {
        id: existing?.id ?? uid("prac"),
        categoryId,
        subcategoryId: sub?.id ?? null,
        name: trimmed,
        summary: summary.trim(),
        regionIds,
        linkUrl: nextLink,
        linkLabel: nextLink ? linkLabel.trim() || null : null,
        media,
        entries: existing?.entries ?? [],
        irradiation: existing?.irradiation ?? null,
        origin: existing?.origin ?? "custom",
      };
      savePractice(practice);
      pop();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the practice.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="display text-5xl">{existing ? "Edit practice" : "New practice"}</h1>
      <form
        className="mt-6 grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <label className="grid gap-2 text-sm font-medium">
          Name
          <Input value={name} onChange={(event) => setName(event.target.value)} required />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          What it is
          <Textarea value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Attention, intention, and the force you want." />
        </label>
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
          <Select value={subcategoryId} onChange={(event) => setSubcategoryId(event.target.value)}>
            <option value="">None</option>
            {subs.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name}
              </option>
            ))}
          </Select>
        </label>
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
                      current.includes(region.id)
                        ? current.filter((id) => id !== region.id)
                        : [...current, region.id],
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
        <label className="grid gap-2 text-sm font-medium">
          Library link
          <Input value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} placeholder="https://" inputMode="url" />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Link label
          <Input value={linkLabel} onChange={(event) => setLinkLabel(event.target.value)} placeholder="Optional" />
        </label>
        <div>
          <p className="text-sm font-medium">Reference media</p>
          <div className="mt-2">
            <MediaEditor initial={existing?.media ?? []} onChange={(items) => (mediaRef.current = items)} />
          </div>
        </div>
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save practice"}
        </Button>
      </form>
      {existing ? (
        confirmDelete ? (
          <div className="mt-6 flex gap-2">
            <Button
              variant="danger"
              onClick={() => {
                deletePractice(existing.id);
                pop();
              }}
            >
              Delete practice
            </Button>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
              Keep
            </Button>
          </div>
        ) : (
          <Button className="mt-6" variant="danger" onClick={() => setConfirmDelete(true)}>
            Delete practice
          </Button>
        )
      ) : null}
    </div>
  );
}
