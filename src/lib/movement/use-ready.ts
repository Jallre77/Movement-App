import { useEffect, useState } from "react";
import { useMovement } from "@/lib/movement/store";

export function useMovementReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const unsub = useMovement.persist.onFinishHydration(() => setReady(true));
    if (useMovement.persist.hasHydrated()) setReady(true);
    else void useMovement.persist.rehydrate();
    return unsub;
  }, []);
  return ready;
}
