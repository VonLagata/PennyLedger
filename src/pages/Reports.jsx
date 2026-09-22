import { useRef, useState } from "react";
import { useApp } from "../state/AppContext";
import { reportRanges, reportTypes } from "../state/data";
import { createReport, reportCsvRows } from "../lib/reports";
import { download, localDate, progress, toCsv } from "../lib/format";
import {
  BudgetRow,
  Icon,
  PageTitle,
  ProgressBar,
  Segments,
  Summary,
} from "../components/UI";

export function ReportTable({ records, onView }) {
  const { date, dispatch, notify } = useApp();
  return (
    <div className="table-scroll">
      <table className="archive-table">
        <thead>
          <tr>
            <th>Report</th>
            <th>Type</th>
            <th>Period</th>
            <th>Generated</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {records.map((report) => (
            <tr
              key={report.id}
              className={report.archived ? "is-archived-row" : ""}
            >
              <td className="td-name">{report.name}</td>
              <td className="td-type">
                <span className="pill pill-blue">
                  {reportTypes.find((type) => type.id === report.type)?.name}
                </span>
              </td>
              <td className="td-period">{report.period}</td>
              <td className="td-gen">{date(report.generated)}</td>
              <td className="td-actions">
                <div className="arch-actions">
                  {onView && (
                    <button
                      className="icon-btn"
                      aria-label={`View ${report.name}`}
                      onClick={() => onView(report)}
                    >
                      <Icon name="eye" />
                    </button>
                  )}
                  <button
                    className="icon-btn archive"
                    aria-label={`${report.archived ? "Restore" : "Archive"} ${report.name}`}
                    onClick={() => {
                      dispatch({ type: "archive-report", id: report.id });
                      notify(
                        report.archived ? "Report restored" : "Report archived",
                      );
                    }}
                  >
                    <Icon name={report.archived ? "restore" : "archive"} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {!records.length && (
            <tr>
              <td className="td-empty" colSpan={5}>
                No report logs.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function ReportPreview({ report }) {
  const { money } = useApp();
  if (report.type === "income-expense") {
    const max = Math.max(
      ...report.series.map((month) => Math.max(month.income, month.expense)),
      1,
    );
    return (
      <>
        <Summary
          items={[
            {
              label: "Total Income",
              value: money(report.income),
              tone: "green",
            },
            { label: "Total Expenses", value: money(report.expense) },
            {
              label: "Net Savings",
              value: money(report.income - report.expense),
            },
          ]}
        />
        <p className="report-caption">
          {report.period} · sample cash flow trend
        </p>
        <div
          className="bar-chart"
          role="img"
          aria-label="Income and expenses by month"
        >
          {report.series.map((month) => (
            <div
              className={`bc-col${month.key === report.range ? " selected" : ""}`}
              key={month.key}
            >
              <div className="bc-bars">
                <div
                  className="bc-bar income"
                  title={`${month.label} income: ${money(month.income)}`}
                  style={{ height: `${(month.income / max) * 100}%` }}
                />
                <div
                  className="bc-bar expense"
                  title={`${month.label} expenses: ${money(month.expense)}`}
                  style={{ height: `${(month.expense / max) * 100}%` }}
                />
              </div>
              <span className="bc-label">{month.label}</span>
            </div>
          ))}
        </div>
        <div className="chart-legend">
          <span>
            <i style={{ background: "#219653" }} />
            Income
          </span>
          <span>
            <i style={{ background: "#E1473E" }} />
            Expenses
          </span>
        </div>
      </>
    );
  }
  if (report.type === "category") {
    let angle = 0;
    const gradient = report.categories
      .map((item) => {
        const start = angle;
        angle += item.pct;
        return `${item.color} ${start}% ${angle}%`;
      })
      .join(",");
    return (
      <>
        <p className="report-caption">{report.period} · spending by category</p>
        <div className="donut-wrap">
          <div
            className="donut"
            style={{ background: `conic-gradient(${gradient})` }}
          >
            <div className="donut-center">
              <strong>{money(report.expense)}</strong>
              <span>Total</span>
            </div>
          </div>
          <ul className="donut-legend">
            {report.categories.map((item) => (
              <li key={item.name}>
                <span className="dl-left">
                  <i style={{ background: item.color }} />
                  {item.name}
                </span>
                <b>{item.pct}%</b>
              </li>
            ))}
          </ul>
        </div>
      </>
    );
  }
  if (report.type === "budget") {
    const spent = report.budgets.reduce((sum, item) => sum + item.spent, 0);
    const limit = report.budgets.reduce((sum, item) => sum + item.limit, 0);
    return (
      <>
        <Summary
          items={[
            { label: "Total Budgeted", value: money(limit) },
            { label: "Total Spent", value: money(spent) },
            { label: "Remaining", value: money(limit - spent), tone: "green" },
          ]}
        />
        <p className="report-caption">
          {report.period} · current budget snapshot
        </p>
        {report.budgets.map((budget) => (
          <BudgetRow key={budget.id} budget={budget} />
        ))}
      </>
    );
  }
  const saved = report.goals.reduce((sum, item) => sum + item.saved, 0);
  const target = report.goals.reduce((sum, item) => sum + item.target, 0);
  const percent = progress(saved, target);
  return (
    <>
      <Summary
        items={[
          { label: "Total Saved", value: money(saved), tone: "green" },
          { label: "Combined Target", value: money(target) },
          { label: "Overall Progress", value: `${percent}%` },
        ]}
      />
      <p className="report-caption">
        {report.period} · current goal progress snapshot
      </p>
      <div className="prog-row overall-goal-row">
        <div className="prow-top">
          <span>Overall Goal Progress</span>
          <span>{percent}%</span>
        </div>
        <ProgressBar value={percent} />
      </div>
      {report.goals.map((goal) => (
        <div className="prog-row" key={goal.id}>
          <div className="prow-top">
            <span>{goal.name}</span>
            <span>{progress(goal.saved, goal.target)}%</span>
          </div>
          <ProgressBar value={progress(goal.saved, goal.target)} />
        </div>
      ))}
    </>
  );
}

export default function Reports() {
  const { budgets, goals, reports, dispatch, notify } = useApp();
  const [type, setType] = useState("income-expense");
  const [range, setRange] = useState("2026-08");
  const [view, setView] = useState("active");
  const [snapshot, setSnapshot] = useState(null);
  const preview = useRef(null);
  const report = snapshot || createReport(type, range, budgets, goals);
  const records = reports.filter(
    (report) => report.archived === (view === "archived"),
  );
  function generate() {
    const value = createReport(type, range, budgets, goals);
    dispatch({
      type: "add-report",
      value: {
        id: crypto.randomUUID(),
        name: `${value.name} — ${value.period}`,
        type,
        range,
        period: value.period,
        generated: localDate(),
        archived: false,
        snapshot: value,
      },
    });
    setSnapshot(value);
    notify("Report generated and added to logs");
  }
  return (
    <>
      <PageTitle
        title="Reports"
        description="Generate insights from your data and browse past reports"
      />
      <section className="card report-card" style={{ marginBottom: 18 }}>
        <div className="card-head">
          <h2>Generate a Report</h2>
        </div>
        <div className="report-types">
          {reportTypes.map((item) => (
            <button
              key={item.id}
              className={`report-type${type === item.id ? " active" : ""}`}
              aria-pressed={type === item.id}
              onClick={() => {
                setType(item.id);
                setSnapshot(null);
              }}
            >
              <Icon name={item.icon} />
              <strong>{item.name}</strong>
              <span>{item.description}</span>
            </button>
          ))}
        </div>
        <div className="report-controls">
          <div className="field">
            <label htmlFor="report-range">Period</label>
            <select
              id="report-range"
              value={range}
              onChange={(event) => {
                setRange(event.target.value);
                setSnapshot(null);
              }}
            >
              {reportRanges.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary" onClick={generate}>
            <Icon name="reports" />
            Generate Report
          </button>
        </div>
        <div className="report-preview" ref={preview}>
          <h2 className="print-title">
            {report.name} — {report.period}
          </h2>
          <ReportPreview report={report} />
        </div>
        <div className="report-actions">
          <button
            className="btn btn-outline btn-sm"
            onClick={() => {
              download(
                toCsv(reportCsvRows(report)),
                `pennyledger-${report.type}-${report.range}.csv`,
                "text/csv;charset=utf-8",
              );
              notify("CSV downloaded");
            }}
          >
            <Icon name="download" />
            Export CSV
          </button>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => window.print()}
          >
            <Icon name="print" />
            Print Report
          </button>
        </div>
      </section>
      <section className="card report-logs">
        <div className="card-head">
          <h2>Report Logs</h2>
          <span className="muted-tag">
            {records.length} {view} reports
          </span>
        </div>
        <div className="filter-toolbar">
          <Segments
            label="Active or archived logs"
            value={view}
            onChange={setView}
            options={[
              { value: "active", label: "Active" },
              {
                value: "archived",
                label: "Archived",
                count: reports.filter((report) => report.archived).length,
              },
            ]}
          />
        </div>
        <ReportTable
          records={records}
          onView={(record) => {
            setType(record.type);
            setRange(record.range);
            setSnapshot(
              record.snapshot ||
                createReport(record.type, record.range, budgets, goals),
            );
            preview.current?.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
            notify(`Loaded: ${record.name}`);
          }}
        />
      </section>
    </>
  );
}
