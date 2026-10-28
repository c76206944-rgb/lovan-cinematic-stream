import { createRoot } from "react-dom/client";
import { DownloadsView } from "./components/site/DownloadsView";
import "./styles.css";

const root = document.getElementById("offline-root");
if (root) createRoot(root).render(
  <div className="min-h-dvh bg-background text-foreground">
    <header className="border-b border-border px-4 py-5 sm:px-6">
      <a href="/home" className="font-display text-xl font-semibold text-primary">LOVAN</a>
    </header>
    <main><DownloadsView /></main>
  </div>,
);