import { afterEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "../src/App";

afterEach(() => vi.unstubAllGlobals());

it("keeps a created account on verification when mail fails and offers resend", async () => {
  const requests = [];
  vi.stubGlobal("fetch", vi.fn(async (url, options = {}) => {
    requests.push({ url, options });
    const data = url.endsWith("/auth/registration-status")
      ? { registrationOpen: true }
      : url.endsWith("/auth/register")
        ? { userId: 7, emailSent: false }
        : null;
    return { ok: true, status: 200, json: async () => ({ status: "success", data }) };
  }));

  render(<MemoryRouter initialEntries={["/signup"]}><App /></MemoryRouter>);
  fireEvent.change(await screen.findByLabelText("Name"), { target: { value: "Jade Labine" } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "jade@example.com" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
  fireEvent.change(screen.getByLabelText("Verify Password"), { target: { value: "password123" } });
  fireEvent.click(screen.getByRole("checkbox", { name: /agree to create/i }));
  fireEvent.click(screen.getByRole("button", { name: "Sign Up" }));

  expect(await screen.findByText(/Account created, but email could not be sent/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Resend code" }));
  await waitFor(() => expect(requests.some(({ url }) => url.endsWith("/auth/resend-otp"))).toBe(true));
  expect(await screen.findByText(/New verification code sent/)).toBeInTheDocument();
});
