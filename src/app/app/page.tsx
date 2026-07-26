import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "BreakItFirst — Run a premortem",
  description:
    "Paste your startup, app, API, or product idea and get a structured failure analysis: single point of failure, causal cascade, and resilience.",
};

export default function AppPage() {
  return <AppShell />;
}
