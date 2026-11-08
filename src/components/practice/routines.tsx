import { useState } from "react";
import { Back, OrderList } from "@/components/practice/chrome";
import { useNav } from "@/components/practice/nav";
import { UnitPicker } from "@/components/practice/vocabulary";
import { Button, Input, Select } from "@/components/ui";
import { usePractice } from "@/lib/practice/store";

export function RoutineScreen() {
  const { screen, tab } = useNav();
  const routineId = screen.id === "routine" ? screen.routineId : undefined;
  const practices = usePractice((state) => state.practices);
  const domains = usePractice((state) => state.domains);
  const existing = usePractice((state) => state.routines.find((item) => item.id === routineId));
  const saveRoutine = usePractice((state) => state.saveRoutine);
  const deleteRoutine = usePractice((state) => state.deleteRoutine);
  const addPractice = usePractice((state) => state.addPractice);
  const [name, setName] = useState(existing?.name ?? "");
  const [ids, setIds] = useState<string[]>(existing?.practiceIds ?? []);
  const [unitName, setUnitName] = useState("");
  const [domainId, setDomainId] = useState(domains[0]?.id ?? "");
  const nameOf = (id: string) => practices.find((item) => item.id === id)?.name ?? "Unit";

  function toggle(id: string) {
    setIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
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
      <Back title={existing ? "Edit routine" : "New routine"} onBack={() => tab({ id: "journal" })} />
      <p className="text-muted">A session of several units, kept in the order you will meet them.</p>
      <form
        className="mt-6 grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (ids.length < 2) return;
          saveRoutine(name, ids, existing?.id);
          tab({ id: "journal" });
        }}
      >
        <label className="grid gap-2 text-sm font-medium">
          Name
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="A name you will recognize" aria-label="Routine name" required />
        </label>
        <div className="grid gap-3 border-t border-line pt-4">
          <p className="text-sm font-medium">Create a unit</p>
          <Input value={unitName} onChange={(event) => setUnitName(event.target.value)} placeholder="Name" aria-label="Unit name" />
          <Select value={domainId} onChange={(event) => setDomainId(event.target.value)} aria-label="Category">
            {domains.map((domain) => (
              <option key={domain.id} value={domain.id}>
                {domain.name}
              </option>
            ))}
          </Select>
          <Button
            type="button"
            variant="secondary"
            disabled={!unitName.trim()}
            onClick={() => {
              const id = addPractice(domainId, unitName);
              if (!id) return;
              setUnitName("");
              setIds((current) => (current.includes(id) ? current : [...current, id]));
            }}
          >
            Add unit
          </Button>
        </div>
        <UnitPicker selected={ids} onToggle={toggle} />
        {ids.length > 0 ? <OrderList ids={ids} nameOf={nameOf} onMove={move} /> : null}
        {ids.length < 2 ? <p className="text-sm text-muted">Choose at least two units.</p> : null}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={ids.length < 2 || !name.trim()}>
            Save routine
          </Button>
          {existing ? (
            <Button
              type="button"
              variant="danger"
              onClick={() => {
                deleteRoutine(existing.id);
                tab({ id: "journal" });
              }}
            >
              Delete
            </Button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
