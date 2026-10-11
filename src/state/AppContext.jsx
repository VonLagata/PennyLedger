import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api, assetUrl } from "../lib/api";
import { isArchived } from "../lib/report-archive";
import { monthlyBudgetProgress } from "../lib/monthly-budget";
import { CURRENCIES, DATE_FORMATS, formatDate, money } from "../lib/format";
import { useAuth } from "./AuthContext";

const AppContext = createContext(null);
export const STORAGE_KEY = "pennyledger_react_v1";

function readPreference(key, fallback) {
  try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
}

const emptyLedger = {
  transactions: [], budgets: [], wallets: [], goals: [], reports: [], income: 0,
  profile: { name: "", email: "", phone: "", photo: null },
};

export function AppProvider({ children }) {
  const { account } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const toastTimer = useRef(null);
  const [data, setData] = useState(emptyLedger);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const activityKey = `pennyledger_activity_v1_${account?.id ?? "guest"}`;
  const [activities, setActivities] = useState([]);
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(activityKey) || "[]");
      setActivities(Array.isArray(stored) ? stored.filter((item) => typeof item?.id === "string" && typeof item?.description === "string" && typeof item?.date === "string").slice(0, 100) : []);
    } catch { setActivities([]); }
  }, [activityKey]);

  // Temporary per-account browser history, replace with the activity API later.
  function recordActivity(description, amount) {
    const entry = { id: crypto.randomUUID(), description, amount, date: new Date().toISOString() };
    setActivities((old) => {
      const next = [entry, ...old].slice(0, 100);
      try { localStorage.setItem(activityKey, JSON.stringify(next)); } catch { /* Keep the feed available in memory. */ }
      return next;
    });
  }
  const [theme, setThemeState] = useState(() => readPreference("pennyledger_theme", "light"));
  const [currency, setCurrencyState] = useState(() => readPreference("pennyledger_currency", "USD"));
  const [dateFormat, setDateFormatState] = useState(() => readPreference("pennyledger_dateformat", DATE_FORMATS[0]));

  useEffect(() => {
    if (!account || account.role !== "user") { setData(emptyLedger); return; }
    let active = true;
    setLoading(true);
    setError("");
    // One load replaces the two competing fetches in the old AuthContext and
    // AppContext. Data comes from authenticated API routes, never user_id URLs.
    Promise.all([
      api("/transactions"), api("/budgets"), api("/goals"),
      api("/report-logs"), api("/profile"), api("/wallets"),
    ]).then(([transactions, budgets, goals, reports, profile, wallets]) => {
      if (!active) return;
      setData({ transactions, budgets, goals, reports, wallets,
        income: profile.monthlyIncomeEstimate || 0,
        profile: { ...profile, photo: assetUrl(profile.photoUrl) } });
    }).catch((failure) => { if (active) setError(failure.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [account?.id, account?.role]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("pennyledger_theme", theme);
      localStorage.setItem("pennyledger_currency", currency);
      localStorage.setItem("pennyledger_dateformat", dateFormat);
    } catch { /* Display preferences still work in memory. */ }
  }, [theme, currency, dateFormat]);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  function notify(message) {
    clearTimeout(toastTimer.current);
    setToast(message); // Fixed the old undefined setToasting call.
    toastTimer.current = setTimeout(() => setToast(""), 3000);
  }

  function preference(key, value, setter) {
    setter(value);
    recordActivity(`Changed ${key}: ${value}`);
    const query = new URLSearchParams(location.search);
    query.set(key, value);
    navigate({ pathname: location.pathname, search: `?${query}` }, { replace: true });
  }

  async function createTransaction(values) {
    // PHP validates and creates the record. Use its numeric ID and saved data.
    const saved = await api("/transactions", { method: "POST", body: values });
    setData((old) => ({ ...old, transactions: [saved, ...old.transactions],
      // Apply the saved transaction once, then replace balances with the server refresh.
      wallets: old.wallets.map((wallet) => Number(wallet.paymentMethodId) === Number(saved.paymentMethodId ?? values.payment_method_id)
        ? { ...wallet, balance: Number(wallet.balance) + Number(saved.amount) } : wallet),
    }));
    recordActivity(`Added ${saved.amount > 0 ? "income" : "expense"}: ${saved.description}`, Math.abs(saved.amount));
    await Promise.all([refreshBudgets(), refreshWallets()]).catch(() => notify('Transaction saved. Refresh the page to update totals.'));
    return saved;
  }

  async function archiveTransaction(id, archived) {
    const action = archived ? "restore" : "archive";
    await api(`/transactions/${id}/${action}`, { method: "PATCH" });
    recordActivity(`${archived ? "Restored" : "Archived"} transaction: ${data.transactions.find((item) => item.id === id)?.description || "Transaction"}`);
    setData((old) => ({ ...old,
      transactions: old.transactions.map((tx) => tx.id === id ? { ...tx, archived: !archived } : tx),
    }));
    // Archiving changes visibility, not historical financial totals.
  }

  async function refreshBudgets() {
    const budgets = await api("/budgets");
    setData((old) => ({ ...old, budgets }));
  }

  async function createBudget(values) {
    const saved = await api("/budgets", { method: "POST", body: values });
    setData((old) => ({ ...old, budgets: [saved, ...old.budgets] }));
    recordActivity(`Added budget: ${saved.category}`, saved.limit);
    return saved;
  }

  async function updateBudget(id, values) {
    const saved = await api(`/budgets/${id}`, { method: "PUT", body: values });
    setData((old) => ({ ...old, budgets: old.budgets.map((item) => item.id === id ? saved : item) }));
    recordActivity(`Updated budget: ${saved.category}`, saved.limit);
    return saved;
  }

  async function deleteBudget(id) {
    const budget = data.budgets.find((item) => item.id === id);
    await api(`/budgets/${id}`, { method: "DELETE" });
    setData((old) => ({ ...old, budgets: old.budgets.filter((item) => item.id !== id) }));
    recordActivity(`Deleted budget: ${budget?.category || "Budget"}`, budget?.limit);
  }

  async function createWallet(values) {
    const saved = await api('/wallets', { method: 'POST', body: values });
    setData((old) => ({ ...old, wallets: [...old.wallets, saved] }));
    recordActivity(`Added wallet: ${saved.name}`, saved.balance);
    return saved;
  }

  async function refreshWallets() {
    const wallets = await api('/wallets');
    setData((old) => ({ ...old, wallets }));
  }

  async function transferWallet(values) {
    await api('/wallet-transfers', { method: 'POST', body: values });
    recordActivity("Transferred money between wallets", Number(values.amount));
    await refreshWallets().catch(() => notify('Transfer saved. Refresh the page to update balances.'));
  }

  async function updateWallet(id, values) {
    const saved = await api(`/wallets/${id}`, { method: 'PUT', body: values });
    setData((old) => ({ ...old, wallets: old.wallets.map((wallet) => wallet.id === id ? saved : wallet) }));
    recordActivity(`Updated wallet: ${saved.name}`, saved.balance);
    return saved;
  }

  async function deleteWallet(id, password) {
    await api(`/wallets/${id}`, { method: 'DELETE', body: { password } });
    recordActivity(`Deleted wallet: ${data.wallets.find((item) => item.id === id)?.name || "Wallet"}`);
    setData((old) => ({ ...old, wallets: old.wallets.filter((wallet) => wallet.id !== id) }));
  }

  async function saveGoal(values, id = null) {
    const saved = await api(id ? `/goals/${id}` : "/goals", {
      method: id ? "PUT" : "POST", body: values,
    });
    setData((old) => ({ ...old,
      goals: id ? old.goals.map((goal) => goal.id === id ? saved : goal) : [saved, ...old.goals],
    }));
    recordActivity(`${id ? "Updated" : "Added"} financial goal: ${saved.name}`, saved.target);
    return saved;
  }

  async function addGoalContribution(values) {
    await api("/goal-contributions", { method: "POST", body: values });
    recordActivity(`Added contribution: ${data.goals.find((item) => item.id === values.goal_id)?.name || "Financial goal"}`, Number(values.amount));
    // Once the contribution is saved, a failed refresh must not invite a second payment.
    setData((old) => ({ ...old, goals: old.goals.map((goal) => goal.id === values.goal_id ? { ...goal, saved: goal.saved + Number(values.amount) } : goal) }));
    try {
      const goals = await api("/goals");
      setData((old) => ({ ...old, goals }));
    } catch { notify("Contribution saved. Refresh the page to confirm the latest goal totals."); }
  }

  async function addReport(values) {
    const saved = await api("/report-logs", { method: "POST", body: values });
    setData((old) => ({ ...old, reports: [saved, ...old.reports] }));
    recordActivity("Created financial report");
    return saved;
  }

  async function archiveReport(id, archived) {
    archived = isArchived(archived);
    const saved = await api(`/report-logs/${id}/${archived ? "restore" : "archive"}`, { method: "PATCH" });
    recordActivity(`${archived ? "Restored" : "Archived"} financial report`);
    setData((old) => ({ ...old,
      reports: old.reports.map((item) => item.id === id ? { ...item, ...(saved || {}), archived: saved?.archived !== undefined ? isArchived(saved.archived) : !archived } : item),
    }));
  }

  function updateProfile(profile) {
    recordActivity("Updated profile");
    setData((old) => ({ ...old, profile: { ...profile, photo: assetUrl(profile.photoUrl) } }));
  }

  async function saveIncomeEstimate(amount) {
    const result = await api('/profile/income-estimate', { method: 'PUT', body: { amount } });
    setData((old) => ({ ...old, income: result.monthlyIncomeEstimate }));
    recordActivity("Updated monthly income estimate", result.monthlyIncomeEstimate);
  }

  return <AppContext.Provider value={{
    ...data, budgets: monthlyBudgetProgress(data.budgets, data.transactions), activities, loading, error, notify,
    createTransaction, archiveTransaction, createBudget, updateBudget, deleteBudget, createWallet, updateWallet, deleteWallet, transferWallet, saveGoal,
    addGoalContribution, addReport, archiveReport, updateProfile, saveIncomeEstimate,
    theme, currency, dateFormat,
    setTheme: (value) => preference("theme", value, setThemeState),
    setCurrency: (value) => preference("currency", value, setCurrencyState),
    setDateFormat: (value) => preference("dateformat", value, setDateFormatState),
    money: (value, signed = false) => money(value, currency, signed),
    date: (value) => formatDate(value, dateFormat),
  }}>
    {error && <p role="alert" className="form-error">Could not load account data: {error}</p>}
    {loading && <p role="status">Loading account data…</p>}
    {children}
    <div role="status" aria-live="polite" className={`toast${toast ? " show" : ""}`}>{toast}</div>
  </AppContext.Provider>;
}

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error("useApp must be inside AppProvider");
  return value;
}
