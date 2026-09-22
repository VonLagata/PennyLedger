import { monthlySeries, reportRanges, reportTypes } from "../state/data";
import { progress } from "./format";

export function createReport(type, range, budgets, goals) {
  const period =
    reportRanges.find((item) => item.key === range)?.label || range;
  const selected = monthlySeries.find((item) => item.key === range);
  const series =
    range === "q2"
      ? monthlySeries.filter((item) =>
          ["2026-04", "2026-05", "2026-06"].includes(item.key),
        )
      : range === "h1"
        ? monthlySeries.filter((item) => item.key <= "2026-06")
        : monthlySeries;
  const income =
    selected?.income ??
    (range === "this-year"
      ? 48200
      : series.reduce((sum, item) => sum + item.income, 0));
  const expense =
    selected?.expense ??
    (range === "this-year"
      ? 29650
      : series.reduce((sum, item) => sum + item.expense, 0));
  const categoryShares = [
    { name: "Housing", pct: 63, color: "var(--blue)" },
    { name: "Groceries", pct: 22, color: "var(--success)" },
    { name: "Transportation", pct: 7, color: "#1F63AC" },
    { name: "Entertainment", pct: 5, color: "#7EB8EA" },
    { name: "Other", pct: 3, color: "#C3CDC7" },
  ];
  return {
    type,
    range,
    period,
    income,
    expense,
    series,
    name: reportTypes.find((item) => item.id === type)?.name || "Report",
    categories: categoryShares.map((item) => ({
      ...item,
      amount: (expense * item.pct) / 100,
    })),
    budgets: budgets.map((item) => ({ ...item })),
    goals: goals.map((item) => ({ ...item })),
  };
}

export function reportCsvRows(report) {
  switch (report.type) {
    case "category":
      return [
        ["Category", "Share (%)", "Amount"],
        ...report.categories.map((item) => [
          item.name,
          item.pct,
          Number(item.amount.toFixed(2)),
        ]),
      ];
    case "budget":
      return [
        ["Category", "Spent", "Limit", "Remaining"],
        ...report.budgets.map((item) => [
          item.category,
          item.spent,
          item.limit,
          item.limit - item.spent,
        ]),
      ];
    case "goals":
      return [
        ["Goal", "Saved", "Target", "Progress (%)"],
        ...report.goals.map((item) => [
          item.name,
          item.saved,
          item.target,
          progress(item.saved, item.target),
        ]),
      ];
    default:
      return [
        ["Period", "Income", "Expenses", "Net Savings"],
        [
          report.period,
          report.income,
          report.expense,
          Number((report.income - report.expense).toFixed(2)),
        ],
      ];
  }
}
