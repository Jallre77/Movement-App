import { createFileRoute } from "@tanstack/react-router";
import { MovementApp } from "@/components/movement/app";

export const Route = createFileRoute("/movement")({
  component: MovementHome,
});

function MovementHome() {
  return <MovementApp />;
}
