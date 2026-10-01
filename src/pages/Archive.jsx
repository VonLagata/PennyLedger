import { Link } from "react-router-dom";
import { useApp } from "../state/AppContext";
import { PageTitle } from "../components/UI";
import { TransactionTable } from "./Transactions";
import { ReportTable } from "./Reports";

export default function Archive() {
  const { transactions, reports } = useApp();
  const archivedTransactions = transactions
    .filter((tx) => tx.archived)
    .sort((a, b) => a.description.localeCompare(b.description));
  const archivedReports = reports
    .filter((report) => report.archived)
    .sort((a, b) => a.name.localeCompare(b.name));
  return (
    <>
      <PageTitle
        title="Archive"
        description="Restore transactions and reports you've archived"
      >
        <Link to="/settings" className="btn btn-outline btn-sm">
          Back to Settings
        </Link>
      </PageTitle>
      <section className="card" style={{ marginBottom: 18 }}>
        <div className="card-head">
          <h2>Archived Transactions</h2>
          <span className="muted-tag">
            {archivedTransactions.length} archived transactions
          </span>
        </div>
        <TransactionTable records={archivedTransactions} restoreOnly />
      </section>
      <section className="card">
        <div className="card-head">
          <h2>Archived Reports</h2>
          <span className="muted-tag">
            {archivedReports.length} archived reports
          </span>
        </div>
        <ReportTable records={archivedReports} />
      </section>
    </>
  );
}
