import { useState } from "react";
import { Button } from "@/components/ui";
import { useMovement } from "@/lib/movement/store";

export function SettingsScreen() {
  const sound = useMovement((state) => state.sound);
  const setSound = useMovement((state) => state.setSound);
  const theme = useMovement((state) => state.theme);
  const setTheme = useMovement((state) => state.setTheme);
  const restoreSeeds = useMovement((state) => state.restoreSeeds);
  const clearSessions = useMovement((state) => state.clearSessions);
  const resetAll = useMovement((state) => state.resetAll);
  const [armed, setArmed] = useState<"sessions" | "all" | null>(null);

  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="display text-5xl">Settings</h1>
      <section className="mt-8 max-w-xl">
        <h2 className="text-lg font-medium">What this tracks</h2>
        <p className="mt-2 text-muted">
          A somatic practice here is any movement done with attention and intention, so the body receives physical forces that can change how the musculoskeletal and nervous systems work and are built. That response to force is mechanotransduction. This is a private log, not medical advice.
        </p>
      </section>
      <section className="mt-8 border-t border-line pt-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-medium">Appearance</h2>
            <p className="text-sm text-muted">Light paper, or a darker room for evening practice.</p>
          </div>
          <Button
            variant="secondary"
            aria-pressed={theme === "dark"}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? "Dark" : "Light"}
          </Button>
        </div>
      </section>
      <section className="mt-8 border-t border-line pt-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-medium">Timer sound</h2>
            <p className="text-sm text-muted">A tone at the end of each interval.</p>
          </div>
          <Button variant="secondary" aria-pressed={sound} onClick={() => setSound(!sound)}>
            {sound ? "On" : "Off"}
          </Button>
        </div>
      </section>
      <section className="mt-8 border-t border-line pt-6">
        <h2 className="text-lg font-medium">Export</h2>
        <p className="mt-2 text-sm text-muted">
          Downloads your categories, practices, and journal as JSON. Photos and videos stay on this device; links are included.
        </p>
        <Button className="mt-3" variant="secondary" onClick={exportData}>
          Download journal
        </Button>
      </section>
      <section className="mt-8 border-t border-line pt-6">
        <h2 className="text-lg font-medium">Starter library</h2>
        <p className="mt-2 text-sm text-muted">
          Bring back categories, subcategories, or practices you deleted. Anything you edited and kept stays as it is.
        </p>
        <Button className="mt-3" variant="secondary" onClick={restoreSeeds}>
          Restore missing starters
        </Button>
      </section>
      <section className="mt-8 border-t border-line pt-6">
        <h2 className="text-lg font-medium">Erase</h2>
        <p className="mt-2 text-sm text-muted">Clearing the journal leaves the library. Reset removes practices you added too.</p>
        {armed === "sessions" ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="danger"
              onClick={() => {
                clearSessions();
                setArmed(null);
              }}
            >
              Clear journal
            </Button>
            <Button variant="secondary" onClick={() => setArmed(null)}>
              Cancel
            </Button>
          </div>
        ) : armed === "all" ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="danger"
              onClick={() => {
                resetAll();
                setArmed(null);
              }}
            >
              Reset everything
            </Button>
            <Button variant="secondary" onClick={() => setArmed(null)}>
              Cancel
            </Button>
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="danger" onClick={() => setArmed("sessions")}>
              Clear journal
            </Button>
            <Button variant="danger" onClick={() => setArmed("all")}>
              Reset everything
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}

function exportData() {
  const state = useMovement.getState();
  const payload = {
    exportedAt: new Date().toISOString(),
    categories: state.categories,
    subcategories: state.subcategories,
    practices: state.practices,
    regions: state.regions,
    sessions: state.sessions,
    presets: state.presets,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `movement-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
