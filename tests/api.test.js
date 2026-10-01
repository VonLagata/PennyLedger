import { afterEach, describe, expect, it, vi } from "vitest";
import { api, setToken } from "../src/lib/api";

afterEach(() => {
  setToken(null);
  vi.unstubAllGlobals();
});

describe("React-to-PHP API contract", () => {
  it("sends the bearer token and unwraps the PHP data envelope", async () => {
    setToken("test-session-token");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "success", message: null, data: [{ id: 7 }] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    expect(await api("/transactions")).toEqual([{ id: 7 }]);
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/public\/index\.php\/transactions$/);
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer test-session-token");
  });

  it("rejects a failed write so the UI cannot claim it was saved", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ status: "error", message: "Validation failed",
        errors: { amount: "Must be greater than zero" } }),
    }));
    await expect(api("/transactions", { method: "POST", body: { amount: -1 } }))
      .rejects.toMatchObject({ message: "Validation failed",
        fields: { amount: "Must be greater than zero" } });
  });
});
