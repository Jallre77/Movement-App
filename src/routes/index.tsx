import { createFileRoute } from "@tanstack/react-router";
import { PracticeApp } from "@/components/practice/app";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return <PracticeApp />;
}
