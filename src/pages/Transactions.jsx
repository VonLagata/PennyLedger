import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useApp } from "../state/AppContext";
import { Icon, PageTitle, Segments } from "../components/UI";
import { TransactionModal } from "../components/Forms";

export function TransactionTable({ records, restoreOnly = false }) {
  const { money, date, dispatch, notify } = useApp();
  return (
    <div className="table-scroll">
      <table className="tx-table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Category</th>
            <th>Date</th>
            <th className="th-amount">Amount</th>
            <th className="th-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {records.map((tx) => (
            <tr key={tx.id}>
              <td className="td-desc">{tx.description}</td>
              <td className="td-category">
                <span
                  className={`pill ${tx.category === "Income" || tx.category === "Groceries" ? "pill-green" : tx.category === "Dining Out" ? "pill-red" : "pill-blue"}`}
                >
                  {tx.category}
                </span>
              </td>
              <td className="td-date">{date(tx.date)}</td>
              <td className={`td-amount${tx.amount > 0 ? " amt-pos" : ""}`}>
                {money(tx.amount, true)}
              </td>
              <td className="td-actions">
                <button
                  type="button"
                  className="btn-archive"
                  aria-label={`${tx.archived || restoreOnly ? "Restore" : "Archive"} ${tx.description}`}
                  onClick={() => {
                    dispatch({ type: "archive-transaction", id: tx.id });
                    notify(
                      tx.archived
                        ? "Transaction restored"
                        : "Transaction archived",
                    );
                  }}
                >
                  <Icon name={tx.archived ? "restore" : "archive"} />
                  <span>
                    {tx.archived || restoreOnly ? "Restore" : "Archive"}
                  </span>
                </button>
              </td>
            </tr>
          ))}
          {!records.length && (
            <tr>
              <td className="td-empty" colSpan={5}>
                No transactions found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function Transactions() {
  const { transactions } = useApp();
  const [params] = useSearchParams();
  const [search, setSearch] = useState(params.get("q") || "");
  const [category, setCategory] = useState("");
  const [month, setMonth] = useState("");
  const [type, setType] = useState("all");
  const [view, setView] = useState("active");
  const [modal, setModal] = useState(false);
  useEffect(() => {
    setSearch(params.get("q") || "");
  }, [params]);
  const categories = [...new Set(transactions.map((tx) => tx.category))].sort();
  const months = [...new Set(transactions.map((tx) => tx.date.slice(0, 7)))]
    .sort()
    .reverse();
  const inView = transactions.filter(
    (tx) => tx.archived === (view === "archived"),
  );
  const records = inView.filter(
    (tx) =>
      (!category || tx.category === category) &&
      (!month || tx.date.startsWith(month)) &&
      (type === "all" || (type === "income" ? tx.amount > 0 : tx.amount < 0)) &&
      `${tx.description} ${tx.category}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  );
  return (
    <>
      <PageTitle
        title="Transactions"
        description="All your income and expenses in one place"
      >
        <button
          className="btn btn-primary btn-sm"
          onClick={() => setModal(true)}
        >
          <Icon name="plus" />
          Add Transaction
        </button>
      </PageTitle>
      <div className="filter-bar">
        <div className="search-box">
          <Icon name="search" />
          <input
            aria-label="Search by name or category"
            placeholder="Search by name or category"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <select
          className="filter-select"
          aria-label="Filter by category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map((category) => (
            <option key={category}>{category}</option>
          ))}
        </select>
        <select
          className="filter-select"
          aria-label="Filter by month"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
        >
          <option value="">All Months</option>
          {months.map((month) => (
            <option value={month} key={month}>
              {new Date(`${month}-01T12:00:00`).toLocaleString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </option>
          ))}
        </select>
        <button
          className="filter-reset"
          onClick={() => {
            setSearch("");
            setCategory("");
            setMonth("");
            setType("all");
          }}
        >
          Reset filters
        </button>
      </div>
      <div className="filter-toolbar">
        <Segments
          label="Filter by type"
          value={type}
          onChange={setType}
          options={[
            { value: "all", label: "All" },
            { value: "income", label: "Income" },
            { value: "expense", label: "Expenses" },
          ]}
        />
        <Segments
          label="Active or archived"
          value={view}
          onChange={setView}
          options={[
            { value: "active", label: "Active" },
            {
              value: "archived",
              label: "Archived",
              count: transactions.filter((tx) => tx.archived).length,
            },
          ]}
        />
        <span className="muted-tag">
          Showing {records.length} of {inView.length}{" "}
          {view === "archived" ? "archived " : ""}transactions
        </span>
      </div>
      <div className="card">
        <TransactionTable records={records} />
      </div>
      {modal && <TransactionModal onClose={() => setModal(false)} />}
    </>
  );
}
