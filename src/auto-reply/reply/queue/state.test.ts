import { afterEach, describe, expect, it } from "vitest";
import {
  clearFollowupQueue,
  FOLLOWUP_QUEUES,
  getExistingFollowupQueue,
  getFollowupQueue,
} from "./state.js";

const DEFAULT_SETTINGS = {
  mode: "queue" as const,
};

afterEach(() => {
  FOLLOWUP_QUEUES.clear();
});

describe("followup queue key normalization", () => {
  it("trims whitespace from keys when creating a queue", () => {
    const queue = getFollowupQueue("  session1  ", DEFAULT_SETTINGS);
    expect(queue).toBeDefined();
    expect(FOLLOWUP_QUEUES.has("session1")).toBe(true);
    expect(FOLLOWUP_QUEUES.has("  session1  ")).toBe(false);
  });

  it("finds a queue created with whitespace via getExistingFollowupQueue", () => {
    getFollowupQueue("  session2  ", DEFAULT_SETTINGS);
    const found = getExistingFollowupQueue("session2");
    expect(found).toBeDefined();
  });

  it("clears a queue created with whitespace via clearFollowupQueue", () => {
    const queue = getFollowupQueue("  session3  ", DEFAULT_SETTINGS);
    queue.items.push({} as never);
    const cleared = clearFollowupQueue("session3");
    expect(cleared).toBe(1);
    expect(FOLLOWUP_QUEUES.has("session3")).toBe(false);
  });

  it("returns the same queue for trimmed and untrimmed keys", () => {
    const q1 = getFollowupQueue("key", DEFAULT_SETTINGS);
    const q2 = getFollowupQueue("  key  ", DEFAULT_SETTINGS);
    expect(q1).toBe(q2);
  });

  it("returns undefined for empty/whitespace-only keys", () => {
    expect(getExistingFollowupQueue("")).toBeUndefined();
    expect(getExistingFollowupQueue("   ")).toBeUndefined();
  });
});
