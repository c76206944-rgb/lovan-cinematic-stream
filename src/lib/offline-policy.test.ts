import { describe, expect, it } from "vitest";
import { offlineEligible, refuseOfflineWorker } from "./offline-policy";

describe("offline availability", () => {
  it("allows every published uploaded source irrespective of legacy approval", () => {
    for (const video_path of ["r2/videos/movie.mp4", "videos/episode.mp4", "https://media.example.org/film.mp4"]) {
      const row = { video_path, published: true, archived: false, offline_allowed: false };
      expect(offlineEligible(row)).toBe(true);
    }
  });
  it("never exposes unpublished, archived or missing videos", () => {
    expect(offlineEligible({ video_path: "videos/private.mp4", published: false, archived: false })).toBe(false);
    expect(offlineEligible({ video_path: "videos/removed.mp4", published: true, archived: true })).toBe(false);
    expect(offlineEligible({ video_path: null, published: true, archived: false })).toBe(false);
  });
});

describe("offline worker safety", () => {
  it("refuses all editor preview families", () => {
    for (const host of ["id-preview--abc.lovable.app", "preview-v2--abc.gpt-eng.com", "id-preview-3--abc.gptengineer.run", "project--abc-dev.lovable.app", "abc.lovableproject.com", "abc.lovableproject-dev.com", "beta.lovable.dev"]) {
      expect(refuseOfflineWorker(host, true, false, "")).toBe(true);
    }
  });
  it("refuses development, iframe and explicit kill switch", () => {
    expect(refuseOfflineWorker("lovan.site", false, false, "")).toBe(true);
    expect(refuseOfflineWorker("lovan.site", true, true, "")).toBe(true);
    expect(refuseOfflineWorker("lovan.site", true, false, "?sw=off")).toBe(true);
  });
  it("allows published domains including similarly named custom hosts", () => {
    for (const host of ["lovan.site", "www.lovan.site", "lovan-cinematic-stream.lovable.app", "preview-v2--shop.example.com"]) expect(refuseOfflineWorker(host, true, false, "")).toBe(false);
  });
});