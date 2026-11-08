import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { Button, Textarea } from "@/components/ui";
import { useMovement } from "@/lib/movement/store";
import type { EntryParent, NoteEntry } from "@/lib/movement/types";

export function RecordActions({
  editing,
  saveDisabled,
  armed,
  onEdit,
  onCancel,
  onArm,
  onDisarm,
  onDelete,
  hint,
  subject,
  className,
}: {
  editing: boolean;
  saveDisabled?: boolean;
  armed: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onArm: () => void;
  onDisarm: () => void;
  onDelete: () => void;
  hint?: string;
  subject: string;
  className?: string;
}) {
  const editLabel = `Edit ${subject}`;
  const deleteLabel = `Delete ${subject}`;
  const row = ["flex flex-wrap gap-2", className].filter(Boolean).join(" ");
  if (armed) {
    return (
      <div className={className}>
        {hint ? <p className="text-sm text-muted">{hint}</p> : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="danger" onClick={onDelete}>
            {deleteLabel}
          </Button>
          <Button variant="secondary" onClick={onDisarm}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }
  if (editing) {
    return (
      <div className={row}>
        <Button type="submit" disabled={saveDisabled}>
          Save
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onArm}>
          {deleteLabel}
        </Button>
      </div>
    );
  }
  return (
    <div className={row}>
      <Button variant="secondary" onClick={onEdit}>
        {editLabel}
      </Button>
      <Button variant="danger" onClick={onArm}>
        {deleteLabel}
      </Button>
    </div>
  );
}

export function NotesSection({
  parent,
  parentId,
  entries,
}: {
  parent: EntryParent;
  parentId: string;
  entries: NoteEntry[] | undefined;
}) {
  const addEntry = useMovement((state) => state.addEntry);
  const updateEntry = useMovement((state) => state.updateEntry);
  const deleteEntry = useMovement((state) => state.deleteEntry);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const notes = entries ?? [];

  return (
    <section className="mt-8 border-t border-line pt-6">
      <h2 className="text-lg font-medium">Notes</h2>
      <p className="mt-1 text-sm text-muted">Text for this section, kept on this device.</p>
      <form
        className="mt-4 grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (addEntry(parent, parentId, draft)) setDraft("");
        }}
      >
        <Textarea
          className="min-h-24"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Write a note"
          aria-label="New note"
        />
        <div>
          <Button type="submit" disabled={!draft.trim()}>
            Save
          </Button>
        </div>
      </form>
      {notes.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No notes yet.</p>
      ) : (
        <ul className="mt-6 border-t border-line">
          {notes.map((entry) => (
            <li key={entry.id} className="border-b border-line py-4">
              {editingId === entry.id ? (
                <form
                  className="grid gap-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (updateEntry(parent, parentId, entry.id, editBody)) setEditingId(null);
                  }}
                >
                  <Textarea
                    className="min-h-24"
                    value={editBody}
                    onChange={(event) => setEditBody(event.target.value)}
                    aria-label="Edit note"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" disabled={!editBody.trim()}>
                      Save
                    </Button>
                    <Button variant="secondary" onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <>
                  <p className="whitespace-pre-wrap">{entry.body}</p>
                  <p className="mt-1 text-sm text-faint">{formatDistanceToNow(entry.at, { addSuffix: true })}</p>
                  {pendingId === entry.id ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button variant="danger" onClick={() => deleteEntry(parent, parentId, entry.id)}>
                        Delete note
                      </Button>
                      <Button variant="secondary" onClick={() => setPendingId(null)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setEditingId(entry.id);
                          setEditBody(entry.body);
                          setPendingId(null);
                        }}
                      >
                        Edit note
                      </Button>
                      <Button variant="danger" onClick={() => setPendingId(entry.id)}>
                        Delete note
                      </Button>
                    </div>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
