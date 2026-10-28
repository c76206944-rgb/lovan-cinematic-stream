import { readFileSync } from "node:fs";
import type { Plugin } from "vite";

/** Emit a static shell for a normal dynamic chunk, keeping Start's sole entry. */
export function offlineShellPlugin(): Plugin {
  return {
    name: "lovan-offline-shell",
    apply: "build",
    applyToEnvironment: (environment) => environment.name === "client",
    generateBundle(_options, bundle) {
      const entry = Object.values(bundle).find((item) => item.type === "chunk" && item.facadeModuleId?.replaceAll("\\", "/").endsWith("/src/offline-entry.tsx"));
      if (!entry || entry.type !== "chunk") throw new Error("LOVAN offline playback chunk is missing.");
      const css = new Set<string>();
      const visited = new Set<string>();
      const collect = (file: string) => {
        if (visited.has(file)) return;
        visited.add(file);
        const chunk = bundle[file];
        if (!chunk || chunk.type !== "chunk") return;
        const metadata = (chunk as typeof chunk & { viteMetadata?: { importedCss?: Set<string> } }).viteMetadata;
        metadata?.importedCss?.forEach((name) => css.add(name));
        chunk.imports.forEach(collect);
      };
      collect(entry.fileName);
      const source = readFileSync(new URL("./offline.html", import.meta.url), "utf8")
        .replace("/src/offline-entry.tsx", `/${entry.fileName}`)
        .replace("</head>", `${[...css].map((file) => `<link rel="stylesheet" href="/${file}" />`).join("\n")}\n</head>`);
      this.emitFile({ type: "asset", fileName: "offline.html", source });
    },
  };
}