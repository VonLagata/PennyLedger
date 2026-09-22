import { useState } from "react";
import { useApp } from "../state/AppContext";
import { Icon, PageTitle, ProgressBar, Summary } from "../components/UI";
import { BudgetModal } from "../components/Forms";
import { progress } from "../lib/format";

export default function Budget() {
  const { budgets, money } = useApp();
  const [modal, setModal] = useState(false);
  const limit = budgets.reduce((sum, budget) => sum + budget.limit, 0);
  const spent = budgets.reduce((sum, budget) => sum + budget.spent, 0);
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
          Create Budget
        </button>
      </PageTitle>
      <Summary
        items={[
          { label: "Total Budgeted", value: money(limit) },
          { label: "Total Spent", value: money(spent) },
          { label: "Remaining", value: money(limit - spent), tone: "green" },
        ]}
      />
      <div className="budget-grid">
        {budgets.map((budget) => {
          const over = budget.spent > budget.limit;
          const full = budget.spent === budget.limit;
          return (
            <div className="budget-card" key={budget.id}>
              <div className="bc-top">
                <h3>{budget.category}</h3>
                <span
                  className={`pill ${over ? "pill-red" : full ? "pill-gray" : "pill-green"}`}
                >
                  {over ? "Over budget" : full ? "Fully used" : "On track"}
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
                <span>{money(budget.spent)} spent</span>
                <span>of {money(budget.limit)} limit</span>
              </div>
            </div>
          );
        })}
      </div>
      {modal && <BudgetModal onClose={() => setModal(false)} />}
    </>
  );
}
