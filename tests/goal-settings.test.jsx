import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Goals from "../src/pages/Goals";
import Settings from "../src/pages/Settings";

const mocks = vi.hoisted(() => ({ app: {}, updateIdentity: vi.fn(), api: vi.fn() }));
vi.mock("../src/state/AppContext", () => ({ useApp: () => mocks.app }));
vi.mock("../src/state/AuthContext", () => ({ useAuth: () => ({ updateIdentity: mocks.updateIdentity, logout: vi.fn() }) }));
vi.mock("../src/lib/api", () => ({ api: mocks.api }));
beforeEach(() => {
  vi.clearAllMocks();
  const profile = { name: "Test User", firstName: "Test", lastName: "User", email: "test@example.com", phone: "", photo: null };
  mocks.app = { profile, goals: [{ id: 4, name: "Emergency fund", saved: 100, target: 1000, date: "2026-12-31", statusId: 1 }],
    money: (amount) => `PHP ${amount}`, currency: "PHP", theme: "light", dateFormat: "MMM D, YYYY",
    setCurrency: vi.fn(), setTheme: vi.fn(), setDateFormat: vi.fn(), notify: vi.fn(), updateProfile: vi.fn(),
    saveGoal: vi.fn().mockResolvedValue({ id: 4 }), addGoalContribution: vi.fn().mockResolvedValue(null) };
  mocks.updateIdentity.mockResolvedValue(profile);
  mocks.api.mockResolvedValue([{ id: 1, code: "active" }]);
});
it("adds money to a goal without editing the goal definition", async () => {
  render(<Goals />);
  fireEvent.click(screen.getByRole("button", { name: "Add money to Emergency fund" }));
  fireEvent.change(screen.getByLabelText("Amount (PHP)"), { target: { value: "250" } });
  fireEvent.click(screen.getByRole("button", { name: "Add Money" }));
  await waitFor(() => expect(mocks.app.addGoalContribution).toHaveBeenCalledWith(expect.objectContaining({ goal_id: 4, amount: 250 })));
  expect(mocks.app.saveGoal).not.toHaveBeenCalled();
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
});
it("edits the goal target separately from contributions", async () => {
  render(<Goals />);
  fireEvent.click(screen.getByRole("button", { name: "Edit Goal" }));
  fireEvent.change(screen.getByLabelText("Target amount (PHP)"), { target: { value: "2000" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
  await waitFor(() => expect(mocks.app.saveGoal).toHaveBeenCalledWith(expect.objectContaining({ target_amount: 2000 }), 4));
  expect(mocks.app.addGoalContribution).not.toHaveBeenCalled();
});
it("stages photo and currency changes until Save Changes", async () => {
  mocks.api.mockResolvedValue({ photoUrl: "uploads/test.png" });
  render(<MemoryRouter><Settings /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Updated" } });
  fireEvent.change(screen.getByLabelText("Currency"), { target: { value: "USD" } });
  const file = new File(["photo"], "photo.png", { type: "image/png" });
  fireEvent.change(screen.getByLabelText("Profile photo"), { target: { files: [file] } });
  expect(mocks.api).not.toHaveBeenCalled();
  expect(mocks.app.setCurrency).not.toHaveBeenCalled();
  expect(mocks.updateIdentity).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
  await waitFor(() => expect(mocks.api).toHaveBeenCalledWith("/profile/photo", expect.objectContaining({ method: "POST" })));
  expect(mocks.updateIdentity).toHaveBeenCalledWith("Updated", "User", "test@example.com", "");
  await waitFor(() => expect(mocks.app.setCurrency).toHaveBeenCalledWith("USD"));
});
it("discards pending profile and photo changes without saving", () => {
  render(<MemoryRouter><Settings /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Unsaved" } });
  fireEvent.change(screen.getByLabelText("Currency"), { target: { value: "USD" } });
  fireEvent.click(screen.getByRole("button", { name: "Remove" }));
  expect(mocks.api).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Discard Changes" }));
  expect(screen.getByLabelText("First name")).toHaveValue("Test");
  expect(screen.getByLabelText("Currency")).toHaveValue("PHP");
  expect(mocks.updateIdentity).not.toHaveBeenCalled();
});
