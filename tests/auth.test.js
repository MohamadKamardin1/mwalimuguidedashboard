import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

const gql = vi.fn();
vi.mock("@/api/client", () => ({ gql: (...args) => gql(...args) }));

const { useAuthStore } = await import("@/stores/auth");

/** The same key the store writes to: a reload has to find it again. */
const REFRESH_KEY = "zsa.refreshToken";

/**
 * The refresh flow, which is what keeps a teacher signed in across a day of
 * lessons without ever putting an access token somewhere a script can read it.
 */

const TOKENS = {
  login: {
    accessToken: "access-1",
    refreshToken: "refresh-1",
    expiresIn: 900,
    user: { id: "u1", email: "teacher@mjini.test", role: "teacher", mustChangePassword: false },
  },
};

describe("the auth store's session", () => {
  beforeEach(() => {
    gql.mockReset();
    window.localStorage.clear();
    setActivePinia(createPinia());
  });

  it("keeps the access token in memory and the refresh token on the device", async () => {
    gql.mockResolvedValueOnce({ login: TOKENS.login });
    const auth = useAuthStore();

    await auth.login("teacher@mjini.test", "secret");

    expect(auth.accessToken).toBe("access-1");
    expect(auth.isAuthenticated).toBe(true);
    // The refresh token has to survive a reload; the access token must not.
    expect(window.localStorage.getItem(REFRESH_KEY)).toBe("refresh-1");
    expect(JSON.stringify(window.localStorage)).not.toContain("access-1");
  });

  it("swaps the refresh token for a new pair and keeps the session", async () => {
    window.localStorage.setItem(REFRESH_KEY, "refresh-1");
    gql.mockResolvedValueOnce({
      refreshToken: { ...TOKENS.login, accessToken: "access-2", refreshToken: "refresh-2" },
    });

    const auth = useAuthStore();
    const ok = await auth.refreshAndKeep();

    expect(ok).toBe(true);
    expect(auth.accessToken).toBe("access-2");
    expect(window.localStorage.getItem(REFRESH_KEY)).toBe("refresh-2");
  });

  it("reports failure rather than throwing when the refresh token is dead", async () => {
    window.localStorage.setItem(REFRESH_KEY, "stale");
    gql.mockRejectedValueOnce(new Error("Invalid token."));

    const auth = useAuthStore();
    // The client calls this on a 401 and branches on the answer, so it has to
    // be a boolean, not an exception.
    await expect(auth.refreshAndKeep()).resolves.toBe(false);
  });

  it("does not ask the server at all when there is no refresh token", async () => {
    const auth = useAuthStore();
    await expect(auth.refreshAndKeep()).resolves.toBe(false);
    expect(gql).not.toHaveBeenCalled();
  });

  it("clears the session when it expires for good", async () => {
    gql.mockResolvedValueOnce({ login: TOKENS.login });
    const auth = useAuthStore();
    await auth.login("teacher@mjini.test", "secret");

    await auth.sessionExpired();

    expect(auth.user).toBe(null);
    expect(auth.accessToken).toBe("");
    expect(auth.isAuthenticated).toBe(false);
    expect(window.localStorage.getItem(REFRESH_KEY)).toBe(null);
  });
});
