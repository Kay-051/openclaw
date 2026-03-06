import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  hookRunner: {
    hasHooks: vi.fn(() => true),
    runBeforeReset: vi.fn(async () => {}),
  },
}));

vi.mock("../../plugins/hook-runner-global.js", () => ({
  getGlobalHookRunner: () => mocks.hookRunner,
}));

vi.mock("../../hooks/internal-hooks.js", () => ({
  createInternalHookEvent: vi.fn(() => ({ messages: [] })),
  triggerInternalHook: vi.fn(async () => {}),
}));

vi.mock("./route-reply.js", () => ({
  routeReply: vi.fn(async () => {}),
}));

import { emitResetCommandHooks } from "./commands-core.js";

// oxlint-disable typescript/no-explicit-any -- test stubs need partial objects

describe("emitResetCommandHooks agent ID extraction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.hookRunner.hasHooks.mockReturnValue(true);
    mocks.hookRunner.runBeforeReset.mockResolvedValue(undefined);
  });

  it("extracts correct agentId from agent-prefixed session key", async () => {
    await emitResetCommandHooks({
      action: "reset",
      ctx: { Body: "", From: "user" } as any,
      cfg: {} as any,
      command: { surface: "text", channel: "discord" } as any,
      sessionKey: "agent:mybot:discord:default:direct:user123",
      workspaceDir: "/tmp/workspace",
    });

    await vi.waitFor(() => {
      expect(mocks.hookRunner.runBeforeReset).toHaveBeenCalledTimes(1);
    });

    const hookCtx = mocks.hookRunner.runBeforeReset.mock.calls[0][1];
    expect(hookCtx.agentId).toBe("mybot");
  });

  it("returns 'main' for undefined session key", async () => {
    await emitResetCommandHooks({
      action: "new",
      ctx: { Body: "", From: "user" } as any,
      cfg: {} as any,
      command: { surface: "text", channel: "telegram" } as any,
      sessionKey: undefined,
      workspaceDir: "/tmp/workspace",
    });

    await vi.waitFor(() => {
      expect(mocks.hookRunner.runBeforeReset).toHaveBeenCalledTimes(1);
    });

    const hookCtx = mocks.hookRunner.runBeforeReset.mock.calls[0][1];
    expect(hookCtx.agentId).toBe("main");
  });

  it("extracts agentId from simple agent session key", async () => {
    await emitResetCommandHooks({
      action: "reset",
      ctx: { Body: "", From: "user" } as any,
      cfg: {} as any,
      command: { surface: "text", channel: "slack" } as any,
      sessionKey: "agent:ops:slack:default:direct:U12345",
      workspaceDir: "/tmp/workspace",
    });

    await vi.waitFor(() => {
      expect(mocks.hookRunner.runBeforeReset).toHaveBeenCalledTimes(1);
    });

    const hookCtx = mocks.hookRunner.runBeforeReset.mock.calls[0][1];
    expect(hookCtx.agentId).toBe("ops");
  });

  it("does not return the literal string 'agent' as the agentId", async () => {
    await emitResetCommandHooks({
      action: "reset",
      ctx: { Body: "", From: "user" } as any,
      cfg: {} as any,
      command: { surface: "text", channel: "discord" } as any,
      sessionKey: "agent:helper:discord:default:direct:user1",
      workspaceDir: "/tmp/workspace",
    });

    await vi.waitFor(() => {
      expect(mocks.hookRunner.runBeforeReset).toHaveBeenCalledTimes(1);
    });

    const hookCtx = mocks.hookRunner.runBeforeReset.mock.calls[0][1];
    expect(hookCtx.agentId).not.toBe("agent");
    expect(hookCtx.agentId).toBe("helper");
  });
});
