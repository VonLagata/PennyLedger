import { useAuth } from "../state/AuthContext";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../state/AppContext";
import {
  BudgetRow,
  Field,
  FormActions,
  Icon,
  Modal,
  PasswordField,
  ProgressBar,
} from "../components/UI";
import {
  BudgetModal,
  TransactionModal,
} from "../components/Forms";
import { progress, localDate } from "../lib/format";
import { ledgerTotals } from "../lib/ledger-totals";

function WalletModal({ wallet, onClose }) {
  const { createWallet, updateWallet, deleteWallet, currency, notify } = useApp();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Modal title={deleting ? 'Delete wallet?' : wallet ? 'Edit wallet' : 'Add wallet'} onClose={onClose}>
      <form onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setBusy(true);
        setError("");
        try {
          if (deleting) {
            await deleteWallet(wallet.id, form.get('password'));
          } else {
            const values = {
              name: form.get('name').trim(),
              kind: wallet?.isDefault ? 'cash' : form.get('kind'),
              balance: Number(form.get('balance')),
              ...(wallet ? { reason: form.get('reason') } : {}),
            };
            if (wallet) await updateWallet(wallet.id, values);
            else await createWallet(values);
          }
          notify(deleting ? 'Wallet deleted' : wallet ? 'Wallet updated' : 'Wallet added');
          onClose();
        } catch (failure) {
          setError(failure.message);
        } finally {
          setBusy(false);
        }
      }}>
        <fieldset disabled={busy} className="admin-fieldset">
          {deleting ? (
            <>
              <p className="report-caption">Delete {wallet.name}? Its balance will be removed from Total Balance. Existing transactions will be kept.</p>
              <PasswordField label="Confirm your password" name="password" autoComplete="current-password" required />
            </>
          ) : (
            <>
              <Field label="Wallet name" name="name" readOnly={wallet?.isDefault} defaultValue={wallet?.name || ''} placeholder="e.g. GCash, Bank card, Cash" maxLength={50} required />
              <div className="field">
                <label htmlFor="wallet-kind">Type</label>
                <select id="wallet-kind" name="kind" disabled={wallet?.isDefault} defaultValue={wallet?.kind || 'digital'}>
                  <option value="digital">Digital wallet</option>
                  <option value="bank">Bank card</option>
                  <option value="cash">Physical money</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <Field label={`Current balance (${currency})`} name="balance" defaultValue={wallet?.balance ?? ''} type="number" min="-99999999.99" max="99999999.99" step="0.01" required />
              {wallet && <Field label="Adjustment reason" name="reason" defaultValue="Balance reconciliation" maxLength={200} required />}
              <p className="report-caption">{wallet ? 'Changing this amount corrects your current balance; it does not record income.' : 'This is your opening balance. It does not count as income.'}</p>
            </>
          )}
          {error && <p role="alert" className="form-error">{error}</p>}
          {wallet && !wallet.isDefault && !deleting && (
            <button type="button" className="btn btn-danger btn-sm" onClick={() => { setDeleting(true); setError(''); }}>Delete wallet</button>
          )}
          <FormActions onClose={onClose} label={busy ? 'Please wait…' : deleting ? 'Confirm deletion' : wallet ? 'Save changes' : 'Add wallet'} />
        </fieldset>
      </form>
    </Modal>
  );
}

export default function Dashboard() {
  const { transactions, budgets: allBudgets, wallets, goals, profile, money, date } =
    useApp();
  const [modal, setModal] = useState(null);
  const [walletModal, setWalletModal] = useState(false);
  const [manageWallets, setManageWallets] = useState(false);
  const [editingWallet, setEditingWallet] = useState(null);
  // Every saved transaction contributes to the totals; the old demo-only
  // calculation ignored records loaded from MySQL.
  const { balance, income, expenses, remaining, monthlyBudgets: budgets } = ledgerTotals(transactions, allBudgets, wallets);
  const overBudget = budgets.some((budget) => budget.spent > budget.limit);
  const categorySpending = new Map();
  for (const tx of transactions.filter((tx) => tx.amount < 0 && tx.date.startsWith(localDate().slice(0, 7)))) {
    categorySpending.set(tx.category, (categorySpending.get(tx.category) || 0) - tx.amount);
  }
  const spending = [...categorySpending].map(([name, amount]) => ({ name, amount }));
  const total = spending.reduce((sum, item) => sum + item.amount, 0);
  const colors = [
    "var(--success)",
    "var(--danger)",
    "#1F63AC",
    "#7EB8EA",
    "var(--blue)",
    "#C3CDC7",
  ];
  let angle = 0;
  const gradient = spending
    .map((item, index) => {
      const start = angle;
      angle += total ? (item.amount / total) * 100 : 0;
      return `${colors[index % colors.length]} ${start}% ${angle}%`;
    })
    .join(",");
  const stats = [
    ["Total Balance", money(balance), "", "flat"],
    ["Monthly Income", money(income), "", "flat"],
    ["Monthly Expenses", money(expenses), "", "flat"],
    [
      "Remaining Budget",
      money(remaining),
      overBudget || remaining < 0 ? "Over budget" : "On track",
      overBudget || remaining < 0 ? "down" : "flat",
    ],
  ];
  return (
    <>
      <div className="greeting page-heading">
        <div>
          <h1>Good afternoon, {profile.name.split(" ")[0]}</h1>
          <p>Here's what's happening with your money</p>
        </div>
        <div className="quick-actions">
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setModal("budget")}
          >
            <Icon name="budget" />
            Add Budget
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setModal("transaction")}
          >
            <Icon name="plus" />
            Add Transaction
          </button>
        </div>
      </div>
      <div className="stat-grid">
        {stats.map(([label, value, delta, tone], index) => (
          <div
            className="stat-card"
            key={label}
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <div className="stat-top">
              <div
                className="stat-dot"
                style={{ background: "var(--blue-50)" }}
              >
                <i style={{ background: "var(--blue)" }} />
              </div>
              {label === "Total Balance" ? (
                <button
                  type="button"
                  className="btn btn-outline btn-sm wallet-toggle"
                  aria-label="eWallet"
                  title={manageWallets ? "Hide eWallets" : "Show eWallets"}
                  aria-expanded={manageWallets}
                  aria-controls="wallet-panel"
                  onClick={() => setManageWallets(!manageWallets)}
                >
                  <Icon name="wallet" />
                  <span>eWallet</span>
                </button>
              ) : (
                <span className={`stat-delta ${tone}`}>{delta}</span>
              )}
            </div>
            <p className="stat-label">{label}</p>
            <p className="stat-value">{value}</p>
          </div>
        ))}
      </div>
      <div id="wallet-panel" className={`wallet-reveal${manageWallets ? ' is-open' : ''}`} inert={!manageWallets} aria-hidden={!manageWallets}>
        <div className="wallet-reveal-inner">
          <section className="card wallet-section">
            <div className="card-head">
              <h2>EWallet · Total Balance {money(balance)}</h2>
              <button className="btn btn-primary btn-sm" onClick={() => setWalletModal(true)}><Icon name="plus" /> Add wallet</button>
            </div>
            <div className="wallet-grid">
              {wallets.map((wallet) => (
                <article className="wallet-card" key={wallet.id}>
                  <button className="btn btn-outline btn-sm wallet-edit" aria-label={`Edit ${wallet.name}`} onClick={() => setEditingWallet(wallet)}>Edit</button>
                  <h3>{wallet.name}</h3>
                  <span className="report-caption">{{ bank: 'Bank card', digital: 'Digital wallet', cash: 'Physical money', other: 'Other' }[wallet.kind]}</span>
                  <strong>{money(wallet.balance)}</strong>
                </article>
              ))}
            </div>
            {!wallets.length && <p className="report-caption">Add a bank card, digital wallet, or cash balance.</p>}
          </section>
        </div>
      </div>
      <div className="dash-grid">
        <div className="dash-col">
          <section className="card">
            <div className="card-head">
              <h2>Budget Progress</h2>
              <span className="muted-tag">This Month</span>
            </div>
            {budgets.map((budget) => (
              <BudgetRow key={budget.id} budget={budget} />
            ))}
          </section>
          <section className="card">
            <div className="card-head">
              <h2>Recent Transactions</h2>
              <Link to="/transactions" className="link">
                View All
              </Link>
            </div>
            <div className="tx-list">
              {transactions
                .filter((tx) => !tx.archived)
                .slice(0, 5)
                .map((tx) => (
                  <div className="tx-row" key={tx.id}>
                    <div className="tx-left">
                      <span
                        className="tx-dot"
                        style={{
                          background:
                            tx.amount > 0 ? "var(--success)" : "var(--blue)",
                        }}
                      />
                      <div>
                        <p className="tx-name">{tx.description}</p>
                        <p className="tx-meta">
                          {tx.category} · {date(tx.date)}
                        </p>
                      </div>
                    </div>
                    <span className={`tx-amt${tx.amount > 0 ? " pos" : ""}`}>
                      {money(tx.amount, true)}
                    </span>
                  </div>
                ))}
            </div>
          </section>
        </div>
        <div className="dash-col">
          <section className="card">
            <div className="card-head">
              <h2>Spending Categories</h2>
            </div>
            <div className="donut-wrap">
              <div
                className="donut"
                style={{
                  background: `conic-gradient(${gradient || "var(--line) 0% 100%"})`,
                }}
              >
                <div className="donut-center">
                  <strong>{money(total)}</strong>
                  <span>Total</span>
                </div>
              </div>
              <ul className="donut-legend">
                {spending.map((item, index) => (
                  <li key={item.name}>
                    <span className="dl-left">
                      <i
                        style={{ background: colors[index % colors.length] }}
                      />
                      {item.name}
                    </span>
                    <b>{Math.round((item.amount / total) * 100)}%</b>
                  </li>
                ))}
              </ul>
            </div>
          </section>
          <section className="card">
            <div className="card-head">
              <h2>Financial Goals</h2>
              <Link to="/goals" className="link">
                + Add Goal
              </Link>
            </div>
            {goals.slice(0, 3).map((goal) => (
              <div className="goal-row" key={goal.id}>
                <div className="grow-top">
                  <span>{goal.name}</span>
                  <b>{progress(goal.saved, goal.target)}%</b>
                </div>
                <ProgressBar value={progress(goal.saved, goal.target)} />
                <p className="grow-sub">
                  {money(goal.saved)} of {money(goal.target)}
                </p>
              </div>
            ))}
          </section>
        </div>
      </div>
      {modal === "transaction" && (
        <TransactionModal onClose={() => setModal(null)} />
      )}
      {modal === "budget" && <BudgetModal onClose={() => setModal(null)} />}
      {walletModal && <WalletModal onClose={() => setWalletModal(false)} />}
      {editingWallet && <WalletModal wallet={editingWallet} onClose={() => setEditingWallet(null)} />}
    </>
  );
}
