import { localDate } from './format';
export function ledgerTotals(transactions, budgets, wallets, today = localDate()) {
  const month = today.slice(0, 7);
  const monthlyBudgets = budgets.filter((b) => b.period === 'monthly' && b.startDate?.slice(0, 7) === month);
  const monthly = transactions.filter((t) => t.date.startsWith(month));
  const budgeted = monthlyBudgets.reduce((sum, b) => sum + b.limit, 0);
  const spent = monthlyBudgets.reduce((sum, b) => sum + b.spent, 0);
  return { monthlyBudgets, budgeted, spent, remaining: budgeted - spent,
    balance: wallets.reduce((sum, w) => sum + w.balance, 0),
    income: monthly.reduce((sum, t) => sum + Math.max(0, t.amount), 0),
    expenses: monthly.reduce((sum, t) => sum + Math.max(0, -t.amount), 0) };
}
