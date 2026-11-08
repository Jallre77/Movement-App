import { Star } from "lucide-react";
import { Button } from "@/components/ui";
import { useNav } from "@/components/movement/nav";
import { useMovement } from "@/lib/movement/store";
import { cn } from "@/lib/cn";
import { lastPracticedNote, latestAt } from "@/lib/movement/time";

export function FavoriteButton({ practiceId }: { practiceId: string }) {
  const favoriteIds = useMovement((state) => state.favoriteIds);
  const toggleFavorite = useMovement((state) => state.toggleFavorite);
  const on = favoriteIds.includes(practiceId);
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? "Remove from favorites" : "Favorite this practice"}
      onClick={() => toggleFavorite(practiceId)}
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-sm text-ink"
    >
      <Star className={cn("size-5", on ? "fill-star text-star" : "text-faint")} aria-hidden="true" />
    </button>
  );
}

export function FavoritesScreen() {
  const { push } = useNav();
  const favoriteIds = useMovement((state) => state.favoriteIds);
  const practices = useMovement((state) => state.practices);
  const categories = useMovement((state) => state.categories);
  const subcategories = useMovement((state) => state.subcategories);
  const sessions = useMovement((state) => state.sessions);
  const saved = favoriteIds
    .map((id) => practices.find((practice) => practice.id === id))
    .filter((practice) => practice != null);

  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="display text-5xl">Favorites</h1>
      <p className="mt-3 max-w-xl text-muted">
        The practices you return to. Record a session from here instead of searching the library.
      </p>
      {saved.length === 0 ? (
        <p className="mt-8 text-sm text-muted">No favorites yet. Open a practice and press the star.</p>
      ) : (
        <ul className="mt-8 border-t border-line">
          {saved.map((practice) => {
            const category = categories.find((item) => item.id === practice.categoryId)?.name;
            const sub = subcategories.find((item) => item.id === practice.subcategoryId)?.name;
            const place = [category, sub].filter(Boolean).join(" · ");
            return (
              <li key={practice.id} className="border-b border-line py-3">
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => push({ id: "practice", practiceId: practice.id })}
                    className="min-w-0 text-left"
                  >
                    <span className="block text-lg">{practice.name}</span>
                    {place ? <span className="block text-sm text-muted">{place}</span> : null}
                    <span className="mt-1 block text-sm text-muted">
                      {lastPracticedNote(
                        latestAt(sessions.filter((session) => session.practiceId === practice.id).map((session) => session.at)),
                      )}
                    </span>
                  </button>
                  <FavoriteButton practiceId={practice.id} />
                </div>
                <Button className="mt-2" onClick={() => push({ id: "log", practiceId: practice.id })}>
                  Record session
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
