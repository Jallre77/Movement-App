import { useEffect } from "react";
import { useMovement } from "@/lib/movement/store";

export function TimerEngine() {
  useEffect(() => {
    const id = window.setInterval(() => {
      useMovement.getState().tick(Date.now());
    }, 100);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let sentinel: WakeLockSentinel | null = null;
    let last = useMovement.getState().timer.status;

    const sync = async () => {
      const running = useMovement.getState().timer.status === "running" && document.visibilityState === "visible";
      try {
        if (!("wakeLock" in navigator)) return;
        if (running) {
          sentinel ??= await navigator.wakeLock.request("screen");
        } else if (sentinel) {
          await sentinel.release();
          sentinel = null;
        }
      } catch {
        sentinel = null;
      }
    };

    void sync();
    const onVis = () => void sync();
    document.addEventListener("visibilitychange", onVis);
    const unsub = useMovement.subscribe((state) => {
      if (state.timer.status !== last) {
        last = state.timer.status;
        void sync();
      }
    });
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      unsub();
      void sentinel?.release();
    };
  }, []);

  return null;
}
