/** Restored work never takes over the connection until explicitly resumed. */
export function restoredUploadState(state: string, titleId: string | null) {
  return state === "done" || titleId ? "discard" : "paused";
}