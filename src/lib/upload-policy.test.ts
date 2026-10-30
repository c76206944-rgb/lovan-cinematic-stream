import { describe, expect, it } from "vitest";
import { restoredUploadState } from "./upload-policy";

describe("restored uploads", () => {
  it("keeps interrupted, queued and failed work paused after reopening", () => {
    for (const state of ["uploading", "saving", "waiting", "failed", "paused"]) {
      expect(restoredUploadState(state, null)).toBe("paused");
    }
  });
  it("discards completed work rather than uploading it again", () => {
    expect(restoredUploadState("done", null)).toBe("discard");
    expect(restoredUploadState("saving", "saved-title")).toBe("discard");
  });
});