import { useState } from "react";
import { useApp } from "../state/AppContext";
import { Icon, PageTitle, ProgressBar, Summary } from "../components/UI";
import { BudgetModal } from "../components/Forms";
import { progress } from "../lib/format";
import { budgetStatus } from "../lib/budget-status";
import { ledgerTotals } from "../lib/ledger-totals";

export default function Budget() {
  const { budgets: allBudgets, transactions, wallets, money, date } = useApp();
  const [modal, setModal] = useState(false);
  const { monthlyBudgets: budgets, budgeted: limit, spent } = ledgerTotals(transactions, allBudgets, wallets);
  return (
    <>
      <PageTitle
        title="Budget"
        description="Set spending limits and stay on track"
      >
        <button
          className="btn btn-primary btn-sm"
          onClick={() => setModal(true)}
        >
          <Icon name="plus" />
          Add Budget
        </button>
      </PageTitle>
      <div className="budget-overview-summary">
        <Summary
          items={[
            { label: "Total Budgeted", value: money(limit) },
            { label: "Total Spent", value: money(spent) },
            { label: "Remaining", value: money(limit - spent), tone: limit < spent ? "red" : "green" },
          ]}
        />
      </div>
      <h2 className="budget-savings-title">Budget Progress</h2>
      <div className="budget-grid">
        {budgets.map((budget) => {
          const status = budgetStatus(budget);
          const over = budget.spent > budget.limit;
          const full = budget.spent === budget.limit;
          return (
            <div className="budget-card" key={budget.id}>
              <div className="bc-top">
                <h3>{budget.category}</h3>
                <span
                  className={`pill ${over ? "pill-red" : full ? "pill-gray" : "pill-green"}`}
                >
                  {status.label}
                </span>
              </div>
              <ProgressBar
                value={progress(budget.spent, budget.limit)}
                fill={
                  over
                    ? "red"
                    : full
                      ? "navy"
                      : budget.category === "Groceries"
                        ? "green"
                        : "blue"
                }
              />
              <div className="bc-foot">
                <span className={over ? 'budget-overage' : undefined}>{money(budget.spent)} spent</span>
                <span>of {money(budget.limit)} limit</span>
              </div>
              {over && <div className="budget-overage-details">
                <p className="report-caption">{date(budget.startDate)} – {date(budget.endDate)}</p>
                <p className="budget-overage">You have exceeded your budget by {money(status.exceeded)}.</p>
                <p className="budget-overage">Remaining budget: {money(status.remaining)}</p>
                <p>{status.percent.toFixed(1)}% used</p>
                <p className="report-caption">Review your expenses or adjust your budget. You can continue recording expenses.</p>
              </div>}
            </div>
          );
        })}
      </div>
      {modal && <BudgetModal onClose={() => setModal(false)} />}
    </>
  );
}
