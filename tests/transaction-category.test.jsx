import { expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TransactionModal, BudgetModal } from "../src/components/Forms";

const { createTransaction, createBudget, saved } = vi.hoisted(() => ({ createTransaction: vi.fn().mockResolvedValue({}), createBudget: vi.fn().mockResolvedValue({}), saved: [] }));
vi.mock("../src/state/AppContext", () => ({ useApp: () => ({ createTransaction, createBudget, budgets: [], notify: vi.fn(), currency: "PHP" }) }));
vi.mock("../src/lib/api", () => ({ api: async (path) => {
  if (path.endsWith("payment-methods")) return [{ id: 1, name: "Cash" }];
  if (path.endsWith("transaction-types")) return [{ id: 2, code: "expense" }, { id: 1, code: "income" }];
  return saved;
} }));

it("starts with no category suggestions and saves a typed category with the chosen type", async () => {
  render(<TransactionModal onClose={vi.fn()} />);
  await screen.findByRole("option", { name: "Cash" });
  expect(screen.getByLabelText("Category")).toHaveValue("");
  fireEvent.click(screen.getByLabelText("Choose a saved category"));
  expect(screen.getByText(/No saved categories yet/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Description"), { target: { value: "Weekend work" } });
  fireEvent.change(screen.getByLabelText("Transaction type"), { target: { value: "income" } });
  fireEvent.change(screen.getByLabelText("Category"), { target: { value: " Freelance " } });
  fireEvent.change(screen.getByLabelText("Amount (PHP)"), { target: { value: "500" } });
  fireEvent.click(screen.getByRole("button", { name: "Add Transaction" }));
  await waitFor(() => expect(createTransaction).toHaveBeenCalledWith(expect.objectContaining({ category_name: "Freelance", transaction_type_id: 1, amount: 500 })));
});

it("creates a budget from a typed category", async () => {
  render(<BudgetModal onClose={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("Category"), { target: { value: " Pet care " } });
  fireEvent.change(screen.getByLabelText("Monthly limit (PHP)"), { target: { value: "750" } });
  fireEvent.click(screen.getByRole("button", { name: "Add Budget" }));
  await waitFor(() => expect(createBudget).toHaveBeenCalledWith(expect.objectContaining({ category_name: "Pet care", budget_amount: 750 })));
});

it("fills the transaction category from the saved-category dropdown", async () => {
  saved.push({ id: 9, name: "Pet care", type: "expense" });
  render(<TransactionModal onClose={vi.fn()} />);
  await screen.findByRole("option", { name: "Cash" });
  fireEvent.click(screen.getByLabelText("Choose a saved category"));
  await screen.findByRole("option", { name: "Pet care" });
  fireEvent.click(screen.getByRole("option", { name: "Pet care" }));
  expect(screen.getByLabelText("Category")).toHaveValue("Pet care");
  saved.length = 0;
});
