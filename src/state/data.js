import transactions from "./transactions.json";

export const categories = [
  "Groceries",
  "Income",
  "Entertainment",
  "Transportation",
  "Housing",
  "Utilities",
  "Dining Out",
];
export const initialBudgets = [
  { id: "budget-1", category: "Groceries", spent: 420, limit: 500 },
  { id: "budget-2", category: "Dining Out", spent: 310, limit: 250 },
  { id: "budget-3", category: "Transportation", spent: 140, limit: 300 },
  { id: "budget-4", category: "Entertainment", spent: 90, limit: 150 },
  { id: "budget-5", category: "Housing", spent: 1200, limit: 1200 },
  { id: "budget-6", category: "Utilities", spent: 98, limit: 200 },
];
export const initialGoals = [
  {
    id: "goal-1",
    name: "Emergency Fund",
    target: 6000,
    saved: 4200,
    date: "Dec 2026",
  },
  {
    id: "goal-2",
    name: "Vacation to Japan",
    target: 4000,
    saved: 1850,
    date: "Aug 2026",
  },
  {
    id: "goal-3",
    name: "New Laptop",
    target: 1500,
    saved: 900,
    date: "May 2026",
  },
  {
    id: "goal-4",
    name: "Home Down Payment",
    target: 40000,
    saved: 12500,
    date: "2029",
  },
];
export const reportTypes = [
  {
    id: "income-expense",
    name: "Income vs Expense",
    description: "Cash flow trend over time",
    icon: "reports",
  },
  {
    id: "category",
    name: "Category Breakdown",
    description: "Where your money goes",
    icon: "pie",
  },
  {
    id: "budget",
    name: "Budget Performance",
    description: "Spent vs. limit by category",
    icon: "budget",
  },
  {
    id: "goals",
    name: "Goal Progress",
    description: "How close you are to each goal",
    icon: "goals",
  },
];
export const initialReports = [
  {
    id: "log-1",
    name: "August 2026 Summary",
    type: "income-expense",
    range: "2026-08",
    period: "Aug 2026",
    generated: "2026-08-31",
    archived: false,
  },
  {
    id: "log-2",
    name: "Category Breakdown — July",
    type: "category",
    range: "2026-07",
    period: "Jul 2026",
    generated: "2026-08-01",
    archived: false,
  },
  {
    id: "log-3",
    name: "Budget Performance — Q2",
    type: "budget",
    range: "q2",
    period: "Apr – Jun 2026",
    generated: "2026-07-03",
    archived: false,
  },
  {
    id: "log-4",
    name: "H1 2026 Overview",
    type: "income-expense",
    range: "h1",
    period: "Jan – Jun 2026",
    generated: "2026-07-01",
    archived: false,
  },
  {
    id: "log-5",
    name: "June 2026 Summary",
    type: "income-expense",
    range: "2026-06",
    period: "Jun 2026",
    generated: "2026-06-30",
    archived: false,
  },
];
export const initialData = {
  transactions,
  budgets: initialBudgets,
  goals: initialGoals,
  reports: initialReports,
  profile: { name: "Alex Rivera", email: "alex@email.com", phone: "" },
  income: 6250,
};

// Historical samples from the original reports page. They are demo data, not bank data.
export const monthlySeries = [
  { key: "2026-03", label: "Mar", income: 5800, expense: 3600 },
  { key: "2026-04", label: "Apr", income: 6100, expense: 4200 },
  { key: "2026-05", label: "May", income: 5950, expense: 3950 },
  { key: "2026-06", label: "Jun", income: 6300, expense: 4100 },
  { key: "2026-07", label: "Jul", income: 6250, expense: 3750 },
  { key: "2026-08", label: "Aug", income: 6250, expense: 3840.25 },
];
export const reportRanges = [
  ...monthlySeries.map((month) => ({
    key: month.key,
    label: new Date(`${month.key}-01T12:00:00`).toLocaleString("en-US", {
      month: "long",
      year: "numeric",
    }),
  })),
  { key: "this-year", label: "This Year (Jan – Aug 2026)" },
  { key: "q2", label: "April – June 2026" },
  { key: "h1", label: "January – June 2026" },
];
