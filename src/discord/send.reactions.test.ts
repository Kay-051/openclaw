import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../config/config.js", () => ({
  loadConfig: () => ({
    channels: {
      discord: {
        accounts: {
          default: { config: { token: "test-token", retry: { attempts: 2 } } },
        },
      },
    },
  }),
}));

vi.mock("./accounts.js", () => ({
  resolveDiscordAccount: () => ({
    token: "test-token",
    config: { token: "test-token", retry: { attempts: 2 } },
  }),
}));

vi.mock("./token.js", () => ({
  normalizeDiscordToken: (t: string | undefined) => t ?? "test-token",
}));

type MockRest = {
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
};

let mockRest: MockRest;

vi.mock("./client.js", () => ({
  createDiscordClient: () => {
    const request = async <T>(fn: () => Promise<T>) => fn();
    return { token: "test-token", rest: mockRest, request };
  },
}));

import {
  reactMessageDiscord,
  removeReactionDiscord,
  removeOwnReactionsDiscord,
  fetchReactionsDiscord,
} from "./send.reactions.js";

describe("Discord reaction functions use retry runner", () => {
  beforeEach(() => {
    mockRest = {
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue({}),
    };
  });

  it("reactMessageDiscord calls rest.put via request()", async () => {
    const result = await reactMessageDiscord("ch1", "msg1", "👍");
    expect(result).toEqual({ ok: true });
    expect(mockRest.put).toHaveBeenCalledTimes(1);
  });

  it("removeReactionDiscord calls rest.delete via request()", async () => {
    const result = await removeReactionDiscord("ch1", "msg1", "👍");
    expect(result).toEqual({ ok: true });
    expect(mockRest.delete).toHaveBeenCalledTimes(1);
  });

  it("removeOwnReactionsDiscord wraps rest.get and rest.delete via request()", async () => {
    mockRest.get.mockResolvedValue({
      reactions: [{ emoji: { id: null, name: "👍" } }],
    });
    mockRest.delete.mockResolvedValue(undefined);

    const result = await removeOwnReactionsDiscord("ch1", "msg1");
    expect(result.ok).toBe(true);
    expect(result.removed.length).toBe(1);
    expect(mockRest.get).toHaveBeenCalledTimes(1);
    expect(mockRest.delete).toHaveBeenCalledTimes(1);
  });

  it("removeOwnReactionsDiscord returns empty when no reactions", async () => {
    mockRest.get.mockResolvedValue({ reactions: [] });
    const result = await removeOwnReactionsDiscord("ch1", "msg1");
    expect(result).toEqual({ ok: true, removed: [] });
    expect(mockRest.delete).not.toHaveBeenCalled();
  });

  it("fetchReactionsDiscord wraps rest.get calls via request()", async () => {
    mockRest.get
      .mockResolvedValueOnce({
        reactions: [{ count: 2, emoji: { id: null, name: "🔥" } }],
      })
      .mockResolvedValueOnce([
        { id: "u1", username: "alice" },
        { id: "u2", username: "bob", discriminator: "0001" },
      ]);

    const summaries = await fetchReactionsDiscord("ch1", "msg1");
    expect(summaries).toHaveLength(1);
    expect(summaries[0].count).toBe(2);
    expect(summaries[0].users).toHaveLength(2);
    expect(summaries[0].users[1].tag).toBe("bob#0001");
    expect(mockRest.get).toHaveBeenCalledTimes(2);
  });

  it("fetchReactionsDiscord returns empty when no reactions", async () => {
    mockRest.get.mockResolvedValue({ reactions: [] });
    const summaries = await fetchReactionsDiscord("ch1", "msg1");
    expect(summaries).toEqual([]);
  });
});
