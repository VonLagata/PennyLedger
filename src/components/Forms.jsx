import { useState } from "react";
import { useApp } from "../state/AppContext";
import { categories } from "../state/data";
import { localDate, monthlyIncome } from "../lib/format";
import { Field, FormActions, Modal } from "./UI";

export function TransactionModal({ onClose }) {
  const { dispatch, notify, currency } = useApp();
  function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const category = form.get("category");
    const amount = Number(form.get("amount"));
    const description = form.get("description").trim();
    if (!description || !Number.isFinite(amount) || amount <= 0) return;
    dispatch({
      type: "add-transaction",
      value: {
        id: crypto.randomUUID(),
        description,
        category,
        amount: category === "Income" ? amount : -amount,
        date: form.get("date"),
        archived: false,
        added: true,
      },
    });
    notify("Transaction added");
    onClose();
  }
  return (
    <Modal title="Add Transaction" onClose={onClose}>
      <form onSubmit={submit}>
        <Field
          label="Description"
          name="description"
          placeholder="e.g. Coffee Shop"
          required
          maxLength={150}
        />
        <div className="field">
          <label htmlFor="tx-category">Category</label>
          <select name="category" id="tx-category">
            {categories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </div>
        <Field
          label={`Amount (${currency})`}
          name="amount"
          type="number"
          min="0.01"
          step="0.01"
          placeholder="0.00"
          required
        />
        <Field
          label="Date"
          name="date"
          type="date"
          defaultValue={localDate()}
          required
        />
        <FormActions onClose={onClose} label="Add Transaction" />
      </form>
    </Modal>
  );
}

export function BudgetModal({ onClose }) {
  const { budgets, dispatch, currency, notify } = useApp();
  const [error, setError] = useState("");
  function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const category = form.get("category").trim();
    const limit = Number(form.get("limit"));
    if (!category) return setError("Enter a category name.");
    if (
      budgets.some(
        (budget) => budget.category.toLowerCase() === category.toLowerCase(),
      )
    )
      return setError("A budget for this category already exists.");
    if (!Number.isFinite(limit) || limit <= 0 || limit > 1000000)
      return setError("Enter a limit between 0.01 and 1,000,000.");
    dispatch({
      type: "add-budget",
      value: { id: crypto.randomUUID(), category, limit, spent: 0 },
    });
    notify("Budget created");
    onClose();
  }
  return (
    <Modal title="Create Budget" onClose={onClose}>
      <form onSubmit={submit}>
        <Field
          label="Category"
          name="category"
          placeholder="e.g. Subscriptions"
          required
          maxLength={80}
          error={error}
          onChange={() => setError("")}
        />
        <Field
          label={`Monthly limit (${currency})`}
          name="limit"
          type="number"
          min="0.01"
          max="1000000"
          step="0.01"
          placeholder="0.00"
          required
        />
        <FormActions onClose={onClose} label="Create Budget" />
      </form>
    </Modal>
  );
}

export function GoalModal({ goal, onClose }) {
  const { dispatch, currency, notify } = useApp();
  const [error, setError] = useState("");
  function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = {
      id: goal?.id || crypto.randomUUID(),
      name: form.get("name").trim(),
      target: Number(form.get("target")),
      saved: Number(form.get("saved")),
      date: form.get("date").trim() || "No date set",
    };
    if (
      !value.name ||
      !Number.isFinite(value.target) ||
      value.target <= 0 ||
      !Number.isFinite(value.saved) ||
      value.saved < 0
    )
      return setError(
        "Enter a name, a positive target, and a nonnegative saved amount.",
      );
    dispatch({ type: "save-goal", value });
    notify(goal ? "Goal updated" : "Goal added");
    onClose();
  }
  return (
    <Modal title={goal ? "Edit Goal" : "Add Goal"} onClose={onClose}>
      <form onSubmit={submit}>
        <Field
          label="Goal name"
          name="name"
          defaultValue={goal?.name || ""}
          required
          maxLength={100}
          error={error}
        />
        <Field
          label={`Target amount (${currency})`}
          name="target"
          type="number"
          min="0.01"
          step="0.01"
          defaultValue={goal?.target || ""}
          required
        />
        <Field
          label={`Amount saved (${currency})`}
          name="saved"
          type="number"
          min="0"
          step="0.01"
          defaultValue={goal?.saved || 0}
          required
        />
        <Field
          label="Target date"
          name="date"
          placeholder="e.g. Dec 2026"
          defaultValue={goal?.date === "No date set" ? "" : goal?.date || ""}
        />
        <FormActions
          onClose={onClose}
          label={goal ? "Save Changes" : "Add Goal"}
        />
      </form>
    </Modal>
  );
}

export function IncomeModal({ onClose }) {
  const { dispatch, currency, notify } = useApp();
  function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const amount = Number(form.get("amount"));
    if (!Number.isFinite(amount) || amount < 0) return;
    dispatch({
      type: "income",
      value: monthlyIncome(amount, form.get("frequency")),
    });
    notify("Monthly income estimate updated");
    onClose();
  }
  return (
    <Modal title="Estimate Monthly Income" onClose={onClose}>
      <form onSubmit={submit}>
        <Field
          label={`Pay amount (${currency})`}
          name="amount"
          type="number"
          min="0"
          step="0.01"
          required
        />
        <div className="field">
          <label htmlFor="income-frequency">Pay Frequency</label>
          <select id="income-frequency" name="frequency" defaultValue="monthly">
            <option value="weekly">Weekly</option>
            <option value="biweekly">Every 2 Weeks</option>
            <option value="monthly">Monthly</option>
            <option value="annually">Annually</option>
          </select>
        </div>
        <FormActions onClose={onClose} label="Estimate" />
      </form>
    </Modal>
  );
}
