import { expect, it } from "vitest";
import { offlineShellPlugin } from "./offline-build";

it("emits the offline shell with hashed script and transitive styles without adding an app entry", () => {
  const plugin = offlineShellPlugin();
  const hook = plugin.generateBundle;
  if (typeof hook !== "function") throw new Error("Offline shell hook missing");
  const files: Array<{ type: string; fileName: string; source: string }> = [];
  const bundle = {
    "assets/offline-abc.js": { type: "chunk", isEntry: false, exports: ["mountOfflineApp"], facadeModuleId: "/app/src/offline-entry.tsx", fileName: "assets/offline-abc.js", imports: ["assets/shared-xyz.js"], viteMetadata: { importedCss: new Set(["assets/offline-abc.css"]) } },
    "assets/shared-xyz.js": { type: "chunk", isEntry: false, fileName: "assets/shared-xyz.js", imports: [], viteMetadata: { importedCss: new Set(["assets/shared-xyz.css"]) } },
  };
  Reflect.apply(hook, { emitFile: (file: typeof files[number]) => files.push(file) }, [{}, bundle, false]);
  expect(files).toHaveLength(1);
  expect(files[0]?.fileName).toBe("offline.html");
  expect(files[0]?.source).toContain('import { mountOfflineApp } from "/assets/offline-abc.js"; mountOfflineApp();');
  expect(files[0]?.source).toContain('href="/assets/shared-xyz.css"');
  expect(files[0]?.source).not.toContain("/src/offline-entry.tsx");
  expect(bundle["assets/offline-abc.js"].isEntry).toBe(false);
});

it("refuses to emit an offline shell when production removed its mount function", () => {
  const hook = offlineShellPlugin().generateBundle;
  if (typeof hook !== "function") throw new Error("Offline shell hook missing");
  const bundle = {
    "assets/offline.js": { type: "chunk", exports: [], facadeModuleId: "/app/src/offline-entry.tsx" },
  };
  expect(() => Reflect.apply(hook, {}, [{}, bundle, false])).toThrow("LOVAN offline playback mount export is missing.");
});