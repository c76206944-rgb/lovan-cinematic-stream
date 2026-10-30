import { expect, it } from "vitest";
import { seriesGroups } from "./series-selection";
it("groups case and spacing variants without changing stored names", () => {
  const rows = [{ id: "1", kind: "series", series_name: "Alice in Borderland", published: true }, { id: "2", kind: "series", series_name: " Alice  In Borderland ", published: true }];
  expect(seriesGroups(rows)).toEqual([{ key: "alice in borderland", name: "Alice in Borderland", ids: ["1", "2"], published: true }]);
});
it("keeps unfinished series available when published series are hidden", () => {
  expect(seriesGroups([{ id: "1", kind: "series", series_name: "Show", published: false }])[0]?.published).toBe(false);
});