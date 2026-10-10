import { useEffect, useId, useRef, useState } from "react";
import { useApp } from "../state/AppContext";
import { api } from "../lib/api";
import { localDate, monthlyIncome } from "../lib/format";
import { Field, FormActions, Modal } from "./UI";

function CategoryField({ categories }) {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const id = useId();
  const input = useRef(null);
  function choose(name) {
    setValue(name);
    setOpen(false);
    setActive(-1);
    input.current?.focus();
  }
  return <div className="field category-combobox" onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }}>
    <label htmlFor={id}>Category</label>
    <div className="input-wrap">
      <input id={id} ref={input} name="category" role="combobox" aria-expanded={open}
        aria-controls={`${id}-options`} aria-autocomplete="list"
        aria-activedescendant={open && active >= 0 ? `${id}-${active}` : undefined}
        placeholder="Type or choose a category" autoComplete="off" required maxLength={100}
        value={value} onChange={(event) => { setValue(event.target.value); setActive(-1); }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
            setActive((index) => categories.length ? (index < 0 ? (event.key === "ArrowDown" ? 0 : categories.length - 1) : (index + (event.key === "ArrowDown" ? 1 : categories.length - 1)) % categories.length) : -1);
          } else if (event.key === "Enter" && open && active >= 0) {
            event.preventDefault(); choose(categories[active].name);
          } else if (event.key === "Escape" && open) {
            event.preventDefault(); event.stopPropagation(); setOpen(false);
          }
        }} />
      <button type="button" className="category-toggle" aria-label="Choose a saved category"
        aria-expanded={open} aria-controls={`${id}-options`}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => { setOpen((previous) => !previous); setActive(-1); input.current?.focus(); }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </button>
    </div>
    {open && <ul id={`${id}-options`} role="listbox" aria-label="Saved categories" className="category-options">
      {categories.map((item, index) => <li key={item.id} id={`${id}-${index}`} role="option"
        aria-selected={active === index} onMouseDown={(event) => event.preventDefault()}
        onClick={() => choose(item.name)}>{item.name}</li>)}
      {!categories.length && <li role="presentation">No saved categories yet. Type a new one above.</li>}
    </ul>}
  </div>;
}

export function TransactionModal({ onClose }) {
  const { createTransaction, notify, currency } = useApp();
  const [categories, setCategories] = useState([]);
  const [methods, setMethods] = useState([]);
  const [types, setTypes] = useState([]);
  const [type, setType] = useState("expense");
  const [error, setError] = useState("");
  useEffect(() => {
    // Use database IDs in the request; the old static category names could
    // not satisfy the PHP controller's category_id foreign key.
    Promise.all([api("/lookups/categories"), api("/lookups/payment-methods"), api("/lookups/transaction-types")])
      .then(([cats, payments, transactionTypes]) => { setCategories(cats); setMethods(payments); setTypes(transactionTypes); })
      .catch((failure) => setError(failure.message));
  }, []);

  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const category = form.get("category").trim();
    const selectedType = types.find((item) => item.code === type);
    const amount = Number(form.get("amount"));
    if (!category || !selectedType || !Number.isFinite(amount) || amount <= 0) return setError("Enter a category, transaction type, and positive amount.");
    try {
      // Wait for the saved server row. Failed requests stay visible in the form.
      await createTransaction({ category_name: category,
        transaction_type_id: selectedType.id,
        payment_method_id: Number(form.get("payment_method")), amount,
        description: form.get("description").trim(), transaction_date: form.get("date") });
      notify("Transaction added");
      onClose();
    } catch (failure) { setError(failure.message); }
  }

  return <Modal title="Add Transaction" onClose={onClose}>
    <form onSubmit={submit}>
      <Field label="Description" name="description" placeholder="e.g. Coffee Shop" required maxLength={150} />
      <div className="field"><label htmlFor="tx-type">Transaction type</label>
        <div className="aligned-select">
        <select id="tx-type" value={type} onChange={(event) => setType(event.target.value)}>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
        </div>
      </div>
      <CategoryField key={type} categories={categories.filter((item) => item.type === type)} />
      <div className="field"><label htmlFor="tx-payment">Payment method</label>
        <div className="aligned-select">
        <select name="payment_method" id="tx-payment" required>
          {!methods.length && <option value="">Loading payment methods…</option>}
          {methods.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
        </div>
      </div>
      <Field label={`Amount (${currency})`} name="amount" type="number" min="0.01" step="0.01" required />
      <Field label="Date" name="date" type="date" defaultValue={localDate()} required />
      {error && <p role="alert" className="form-error">{error}</p>}
      <FormActions onClose={onClose} label="Add Transaction" />
    </form>
  </Modal>;
}

export function BudgetModal({ onClose }) {
  const { budgets, createBudget, currency, notify } = useApp();
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    api("/lookups/categories")
      .then((items) => setCategories(items.filter((item) => item.type === "expense")))
      .catch((failure) => setError(failure.message));
  }, []);

  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const categoryName = form.get("category").trim();
    if (!categoryName) return setError("Enter a category.");
    const categoryId = categories.find((item) => item.name.toLowerCase() === categoryName.toLowerCase())?.id;
    const limit = Number(form.get("limit"));
    if (!Number.isFinite(limit) || limit <= 0 || limit > 1_000_000) {
      return setError("Enter a limit between 0.01 and 1,000,000.");
    }
    const today = localDate();
    const start = `${today.slice(0, 7)}-01`;
    const end = `${today.slice(0, 7)}-${String(new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 0).getDate()).padStart(2, "0")}`;
    if (budgets.some((item) => item.categoryId === categoryId && item.startDate === start)) {
      return setError("A budget for this category already exists this month.");
    }
    try {
      // The backend requires period and dates; the current UI creates a
      // monthly budget covering the current calendar month.
      await createBudget({ category_name: categoryName, budget_amount: limit,
        budget_period: "monthly", start_date: start, end_date: end });
      notify("Budget created");
      onClose();
    } catch (failure) { setError(failure.message); }
  }

  return <Modal title="Add Budget" onClose={onClose}>
    <form onSubmit={submit}>
      <CategoryField categories={categories} />
      <Field label={`Monthly limit (${currency})`} name="limit" type="number"
        min="0.01" max="1000000" step="0.01" required />
      {error && <p role="alert" className="form-error">{error}</p>}
      <FormActions onClose={onClose} label="Add Budget" />
    </form>
  </Modal>;
}

export function GoalModal({ goal, onClose }) {
  const { saveGoal, addGoalContribution, currency, notify } = useApp();
  const [statusId, setStatusId] = useState(goal?.statusId || null);
  const [error, setError] = useState("");
  useEffect(() => {
    api("/lookups/goal-statuses").then((items) => {
      setStatusId(goal?.statusId || items.find((item) => item.code === "active")?.id || null);
    }).catch((failure) => setError(failure.message));
  }, [goal?.statusId]);

  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = form.get("name").trim();
    const target = Number(form.get("target"));
    const contribution = Number(form.get("contribution"));
    if (!name || !Number.isFinite(target) || target <= 0 ||
        !Number.isFinite(contribution) || contribution < 0 || !statusId) {
      return setError("Enter a name, positive target, and nonnegative contribution.");
    }
    try {
      const saved = await saveGoal({ goal_name: name, target_amount: target,
        target_date: form.get("date"), status_id: statusId }, goal?.id);
      // "Saved" is now a contribution, not a local number that overwrites
      // the balance. The backend sums persisted contributions for each goal.
      if (contribution > 0) await addGoalContribution({ goal_id: saved.id,
        amount: contribution, contribution_date: localDate(), description: "Goal form contribution" });
      notify(goal ? "Goal updated" : "Goal added");
      onClose();
    } catch (failure) { setError(failure.message); }
  }

  return <Modal title={goal ? "Edit Goal" : "Add Goal"} onClose={onClose}>
    <form onSubmit={submit}>
      <Field label="Goal name" name="name" defaultValue={goal?.name || ""} required maxLength={100} />
      <Field label={`Target amount (${currency})`} name="target" type="number" min="0.01"
        step="0.01" defaultValue={goal?.target || ""} required />
      <Field label={`${goal ? "Add contribution" : "Initial saved amount"} (${currency})`}
        name="contribution" type="number" min="0" step="0.01" defaultValue={0} required />
      <Field label="Target date" name="date" type="date" defaultValue={goal?.date || localDate()} required />
      {error && <p role="alert" className="form-error">{error}</p>}
      <FormActions onClose={onClose} label={goal ? "Save Changes" : "Add Goal"} />
    </form>
  </Modal>;
}

export function IncomeModal({ onClose }) {
  const { saveIncomeEstimate, currency, notify } = useApp();
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const amount = Number(form.get("amount"));
    if (!Number.isFinite(amount) || amount < 0) return;
    try {
      // Save the estimate to the user's profile; it is distinct from actual
      // income transactions used by the reports.
      await saveIncomeEstimate(monthlyIncome(amount, form.get("frequency")));
      notify("Monthly income estimate updated");
      onClose();
    } catch (failure) { setError(failure.message); }
  }
  return <Modal title="Estimate Monthly Income" onClose={onClose}>
    <form onSubmit={submit}>
      <Field label={`Pay amount (${currency})`} name="amount" type="number" min="0" step="0.01" required />
      <div className="field"><label htmlFor="income-frequency">Pay Frequency</label>
        <select id="income-frequency" name="frequency" defaultValue="monthly">
          <option value="weekly">Weekly</option><option value="biweekly">Every 2 Weeks</option>
          <option value="monthly">Monthly</option><option value="annually">Annually</option>
        </select>
      </div>
      {error && <p role="alert" className="form-error">{error}</p>}
      <FormActions onClose={onClose} label="Estimate" />
    </form>
  </Modal>;
}

export function SavingsModal({ onClose }) {
  return <Modal title="Savings" onClose={onClose}><p>Savings details go here.</p></Modal>;
}
