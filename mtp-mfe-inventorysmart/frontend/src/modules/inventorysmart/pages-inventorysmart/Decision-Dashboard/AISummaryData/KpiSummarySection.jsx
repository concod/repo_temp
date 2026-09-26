import { useState, useEffect } from "react";
import { connect } from "react-redux";
import KpiCard, { KPI_STATUS_COLORS } from "./KpiCard";
import { getAggregateInsightsSummary } from "modules/inventorysmart/services-inventorysmart/Decision-Dashboard/decision-dashboard-services";
import "./KpiCard.css";

// The API sends card labels in all-caps (e.g. "TOTAL PLANS") but the design
// calls for title case ("Total Plans") - lowercases everything then
// capitalizes each word rather than hardcoding a fixed set of labels, so any
// label the API sends (current or future) renders consistently.
const toTitleCase = (str) => {
  if (!str) return str;
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
};

// Turns one workflowTriage entry (totalPlans / safePlans / plansWithIssues)
// from the aggregate-insights/summary API response into the prop shape
// <KpiCard /> expects.
const mapWorkflowCardToKpi = (card) => {
  if (!card) return null;

  const meta = card.meta || {};
  const stats = [];
  if (meta.styleColorsCount !== undefined) {
    stats.push({
      key: "style_colors",
      icon: "styleColors",
      label: "Style colors",
      value: meta.styleColorsCount,
    });
  }
  if (meta.storesCount !== undefined) {
    stats.push({
      key: "stores",
      icon: "stores",
      label: "Stores",
      value: meta.storesCount,
    });
  }

  return {
    key: card.id,
    title: toTitleCase(card.label),
    value: card.count,
    caption: card.description,
    statusColor: KPI_STATUS_COLORS[card.status] || KPI_STATUS_COLORS.info,
    stats,
    scopeTag: meta.scopeTag,
    copyList: card.copy,
  };
};

const buildKpiRowsFromApi = (workflowTriage) => {
  if (!workflowTriage) return null;

  const row = [
    mapWorkflowCardToKpi(workflowTriage.totalPlans),
    mapWorkflowCardToKpi(workflowTriage.safePlans),
    mapWorkflowCardToKpi(workflowTriage.plansWithIssues),
  ].filter(Boolean);

  return row.length > 0 ? [row] : null;
};

const KpiSummarySection = ({ rows, filters, getAggregateInsightsSummary, onLoadingChange }) => {
  const [apiRows, setApiRows] = useState(null);
  const [loading, setLoading] = useState(!rows);

  useEffect(() => {
    onLoadingChange?.(loading);
  }, [loading, onLoadingChange]);

  useEffect(() => {
    // An explicitly-passed `rows` prop wins and skips the network call.
    if (rows) return undefined;

    let isMounted = true;
    setLoading(true);

    getAggregateInsightsSummary(filters)
      .then((response) => {
        if (!isMounted) return;
        setApiRows(buildKpiRowsFromApi(response?.data?.workflowTriage));
      })
      .catch((err) => {
        console.error("Failed to fetch aggregate insights summary", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [rows, filters, getAggregateInsightsSummary]);

  const displayRows = rows || apiRows;

  return (
    <div className="kpi-section">
      {displayRows ? (
        displayRows.map((row, rowIndex) => (
          <div className="kpi-row" key={rowIndex}>
            {row.map((card) => (
              <KpiCard key={card.key} {...card} />
            ))}
          </div>
        ))
      ) : (
        <div className="kpi-section-status">
          {loading ? "Loading KPI summary..." : "No KPI summary data available."}
        </div>
      )}
    </div>
  );
};

const mapDispatchToProps = (dispatch) => ({
  getAggregateInsightsSummary: (filters) =>
    dispatch(getAggregateInsightsSummary(filters)),
});

export default connect(null, mapDispatchToProps)(KpiSummarySection);
