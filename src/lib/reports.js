import { reportTypes } from "../state/data";
import { progress } from "./format";

// NEW calculation: report screens use authenticated transactions loaded from
// PHP rather than the sample monthlySeries and hardcoded category percentages.
export function buildReportRanges(transactions) {
  const months = [...new Set(transactions.map((tx) => tx.date?.slice(0, 7)).filter(Boolean))].sort().reverse();
  const current = new Date();
  const thisMonth = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`;
  if (!months.includes(thisMonth)) months.unshift(thisMonth);
  return [
    ...months.map((key) => ({ key, label: new Date(`${key}-01T12:00:00`).toLocaleString("en-US", { month: "long", year: "numeric" }) })),
    { key: "this-year", label: `This Year (${current.getFullYear()})` },
  ];
}

function inRange(tx, range) {
  if (range === "this-year") return tx.date?.startsWith(String(new Date().getFullYear()));
  return tx.date?.startsWith(range);
}

export function createReport(type, range, transactions, budgets, goals) {
  const period = buildReportRanges(transactions).find((item) => item.key === range)?.label || range;
  const selected = transactions.filter((tx) => inRange(tx, range));
  const income = selected.reduce((sum, tx) => sum + Math.max(0, Number(tx.amount)), 0);
  const expense = selected.reduce((sum, tx) => sum + Math.max(0, -Number(tx.amount)), 0);
  const months = [...new Set(selected.map((tx) => tx.date.slice(0, 7)))].sort();
  const series = months.map((key) => {
    const rows = selected.filter((tx) => tx.date.startsWith(key));
    return { key, label: new Date(`${key}-01T12:00:00`).toLocaleString("en-US", { month: "short" }),
      income: rows.reduce((sum, tx) => sum + Math.max(0, Number(tx.amount)), 0),
      expense: rows.reduce((sum, tx) => sum + Math.max(0, -Number(tx.amount)), 0) };
  });
  const shares = new Map();
  for (const tx of selected.filter((row) => row.amount < 0)) {
    shares.set(tx.category, (shares.get(tx.category) || 0) - Number(tx.amount));
  }
  const colors = ["var(--blue)", "var(--success)", "#1F63AC", "#7EB8EA", "#C3CDC7"];
  const categories = [...shares].map(([name, amount], index) => ({
    name, amount, pct: expense ? Math.round((amount / expense) * 100) : 0,
    color: colors[index % colors.length],
  }));
  return {
    type, range, period, income, expense, series,
    name: reportTypes.find((item) => item.id === type)?.name || "Report",
    categories, budgets: budgets.map((item) => ({ ...item })), goals: goals.map((item) => ({ ...item })),
  };
}

export function reportCsvRows(report) {
  switch (report.type) {
    case "category": return [["Category", "Share (%)", "Amount"],
      ...report.categories.map((item) => [item.name, item.pct, Number(item.amount.toFixed(2))])];
    case "budget": return [["Category", "Spent", "Limit", "Remaining"],
      ...report.budgets.map((item) => [item.category, item.spent, item.limit, item.limit - item.spent])];
    case "goals": return [["Goal", "Saved", "Target", "Progress (%)"],
      ...report.goals.map((item) => [item.name, item.saved, item.target, progress(item.saved, item.target)])];
    default: return [["Period", "Income", "Expenses", "Net Savings"],
      [report.period, report.income, report.expense, Number((report.income - report.expense).toFixed(2))]];
  }
}
