import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api, assetUrl } from "../lib/api";
import { CURRENCIES, DATE_FORMATS, formatDate, money } from "../lib/format";
import { useAuth } from "./AuthContext";

const AppContext = createContext(null);
export const STORAGE_KEY = "pennyledger_react_v1";

function readPreference(key, fallback) {
  try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
}

const emptyLedger = {
  transactions: [], budgets: [], goals: [], reports: [], income: 0,
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
      api("/report-logs"), api("/profile"),
    ]).then(([transactions, budgets, goals, reports, profile]) => {
      if (!active) return;
      setData({ transactions, budgets, goals, reports,
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
    const query = new URLSearchParams(location.search);
    query.set(key, value);
    navigate({ pathname: location.pathname, search: `?${query}` }, { replace: true });
  }

  async function createTransaction(values) {
    // PHP validates and creates the record. Use its numeric ID and saved data.
    const saved = await api("/transactions", { method: "POST", body: values });
    setData((old) => ({ ...old, transactions: [saved, ...old.transactions] }));
    await refreshBudgets();
    return saved;
  }

  async function archiveTransaction(id, archived) {
    const action = archived ? "restore" : "archive";
    await api(`/transactions/${id}/${action}`, { method: "PATCH" });
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
    return saved;
  }

  async function saveGoal(values, id = null) {
    const saved = await api(id ? `/goals/${id}` : "/goals", {
      method: id ? "PUT" : "POST", body: values,
    });
    setData((old) => ({ ...old,
      goals: id ? old.goals.map((goal) => goal.id === id ? saved : goal) : [saved, ...old.goals],
    }));
    return saved;
  }

  async function addGoalContribution(values) {
    await api("/goal-contributions", { method: "POST", body: values });
    const goals = await api("/goals");
    setData((old) => ({ ...old, goals }));
  }

  async function addReport(values) {
    const saved = await api("/report-logs", { method: "POST", body: values });
    setData((old) => ({ ...old, reports: [saved, ...old.reports] }));
    return saved;
  }

  async function archiveReport(id, archived) {
    await api(`/report-logs/${id}/${archived ? "restore" : "archive"}`, { method: "PATCH" });
    setData((old) => ({ ...old,
      reports: old.reports.map((item) => item.id === id ? { ...item, archived: !archived } : item),
    }));
  }

  function updateProfile(profile) {
    setData((old) => ({ ...old, profile: { ...profile, photo: assetUrl(profile.photoUrl) } }));
  }

  async function saveIncomeEstimate(amount) {
    const result = await api('/profile/income-estimate', { method: 'PUT', body: { amount } });
    setData((old) => ({ ...old, income: result.monthlyIncomeEstimate }));
  }

  return <AppContext.Provider value={{
    ...data, loading, error, notify,
    createTransaction, archiveTransaction, createBudget, saveGoal,
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
