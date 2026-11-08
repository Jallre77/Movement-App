import { useState } from "react";
import { Button, Input, Select } from "@/components/ui";
import { useNav } from "@/components/practice/nav";
import { daysSince } from "@/lib/practice/format";
import { lastMeeting, stageName, usePractice } from "@/lib/practice/store";
import { cn } from "@/lib/cn";

export function VocabularyScreen() {
  const { push } = useNav();
  const domains = usePractice((state) => state.domains);
  const practices = usePractice((state) => state.practices);
  const sessions = usePractice((state) => state.sessions);
  const addPractice = usePractice((state) => state.addPractice);
  const addDomain = usePractice((state) => state.addDomain);
  const updateDomain = usePractice((state) => state.updateDomain);
  const deleteDomain = usePractice((state) => state.deleteDomain);
  const [name, setName] = useState("");
  const [domainId, setDomainId] = useState(domains[0]?.id ?? "");
  const [categoryName, setCategoryName] = useState("");
  const [categoryBlurb, setCategoryBlurb] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftBlurb, setDraftBlurb] = useState("");

  return (
    <div>
      <h1 className="display text-5xl">Vocabulary</h1>
      <p className="mt-3 max-w-xl text-muted">The units. A session does not invent them. It studies one, joins a few, or lets a known set move.</p>
      <form
        className="mt-8 grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          const id = addDomain(categoryName, categoryBlurb);
          if (!id) return;
          setCategoryName("");
          setCategoryBlurb("");
          setDomainId(id);
        }}
      >
        <h2 className="text-lg font-medium">New category</h2>
        <Input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="Name" aria-label="Category name" required />
        <Input value={categoryBlurb} onChange={(event) => setCategoryBlurb(event.target.value)} placeholder="A short line, if you want one" aria-label="Category description" />
        <Button type="submit" variant="secondary" disabled={!categoryName.trim()}>
          Add category
        </Button>
      </form>
      <ul className="mt-8 grid gap-8">
        {domains.map((domain) => {
          const items = practices.filter((practice) => practice.domainId === domain.id);
          const editing = editingId === domain.id;
          return (
            <li key={domain.id}>
              {editing ? (
                <form
                  className="grid gap-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!updateDomain(domain.id, draftName, draftBlurb)) return;
                    setEditingId(null);
                  }}
                >
                  <Input value={draftName} onChange={(event) => setDraftName(event.target.value)} aria-label="Category name" required />
                  <Input value={draftBlurb} onChange={(event) => setDraftBlurb(event.target.value)} aria-label="Category description" placeholder="A short line, if you want one" />
                  <div className="flex gap-2">
                    <Button type="submit" disabled={!draftName.trim()}>
                      Save
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-medium">{domain.name}</h2>
                    {domain.blurb ? <p className="text-sm text-muted">{domain.blurb}</p> : null}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setEditingId(domain.id);
                        setDraftName(domain.name);
                        setDraftBlurb(domain.blurb);
                      }}
                    >
                      Edit
                    </Button>
                    <Button variant="danger" disabled={domains.length <= 1} onClick={() => deleteDomain(domain.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              )}
              <ul className="mt-2 border-t border-line">
                {items.map((practice) => {
                  const last = lastMeeting(sessions, practice.id);
                  return (
                    <li key={practice.id} className="border-b border-line">
                      <button type="button" className="w-full py-3 text-left" onClick={() => push({ id: "practice", practiceId: practice.id })}>
                        <span className="block">{practice.name}</span>
                        <span className="block text-sm text-muted">
                          {last ? `${stageName(last.stage)} · ${daysSince(last.at)}` : "Not yet practiced"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ul>
      <form
        className="mt-10 grid gap-3 border-t border-line pt-6"
        onSubmit={(event) => {
          event.preventDefault();
          addPractice(domainId, name);
          setName("");
        }}
      >
        <h2 className="text-lg font-medium">New unit</h2>
        <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" aria-label="Unit name" required />
        <Select value={domainId} onChange={(event) => setDomainId(event.target.value)} aria-label="Category">
          {domains.map((domain) => (
            <option key={domain.id} value={domain.id}>
              {domain.name}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="secondary" disabled={!name.trim()}>
          Add unit
        </Button>
      </form>
    </div>
  );
}

export function UnitPicker({
  selected,
  onToggle,
  max,
}: {
  selected: string[];
  onToggle: (id: string) => void;
  max?: number;
}) {
  const domains = usePractice((state) => state.domains);
  const practices = usePractice((state) => state.practices);
  return (
    <div className="mt-4 grid gap-6">
      {domains.map((domain) => {
        const items = practices.filter((practice) => practice.domainId === domain.id);
        if (items.length === 0) return null;
        return (
          <section key={domain.id}>
            <h2 className="text-sm font-medium text-muted">{domain.name}</h2>
            <ul className="mt-2 flex flex-wrap gap-2">
              {items.map((practice) => {
                const on = selected.includes(practice.id);
                const blocked = !on && max != null && selected.length >= max;
                return (
                  <li key={practice.id}>
                    <button
                      type="button"
                      aria-pressed={on}
                      disabled={blocked}
                      onClick={() => onToggle(practice.id)}
                      className={cn(
                        "h-11 rounded-full border px-3 text-sm disabled:opacity-40",
                        on ? "border-transparent bg-accent text-accent-fg" : "border-line bg-surface text-ink",
                      )}
                    >
                      {practice.name}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
