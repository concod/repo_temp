import { useState, useEffect } from "react";
import { connect } from "react-redux";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import ShowChartOutlinedIcon from "@mui/icons-material/ShowChartOutlined";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import OverviewKpiCard, { OVERVIEW_ICON_MAP } from "./OverviewKpiCard";
import { getAggregateInsightsSummary } from "modules/inventorysmart/services-inventorysmart/Decision-Dashboard/decision-dashboard-services";
import "./OverviewSection.css";

const DEFAULT_OVERVIEW_ICON_CONFIG = {
  icon: <Inventory2OutlinedIcon style={{ fontSize: 16, color: "#4B5563" }} />,
  iconBg: "#F2F3F4",
  sparklineColor: "#4259EE",
};

const OVERVIEW_METRIC_ICON_CONFIG = {
  box: {
    icon: OVERVIEW_ICON_MAP.unitsAllocated,
    iconBg: "#EAF1FB",
    sparklineColor: "#5B8DEF",
  },
  "warehouse-chart": {
    icon: <Inventory2OutlinedIcon style={{ fontSize: 16, color: "#8B5CF6" }} />,
    iconBg: "#F1EAFB",
    sparklineColor: "#8B5CF6",
  },
  "alert-triangle": {
    icon: <ShowChartOutlinedIcon style={{ fontSize: 16, color: "#7C6FA0" }} />,
    iconBg: "#EDEAFB",
    sparklineColor: "#7C6FA0",
  },
  dollar: {
    icon: <AccountBalanceWalletOutlinedIcon style={{ fontSize: 16, color: "#A98F5E" }} />,
    iconBg: "#F5F1E8",
    sparklineColor: "#B69B72",
  },
  building: {
    icon: <StorefrontOutlinedIcon style={{ fontSize: 16, color: "#2FBFAE" }} />,
    iconBg: "#E6FBF7",
    sparklineColor: "#2FBFAE",
  },
};

// The API sends labels in ALL CAPS (e.g. "DC CONSUMPTION & SOURCING") - this
// turns them into the same sentence/title mix the hand-built sample titles
// used, while keeping short known acronyms (e.g. "DC") uppercase.
const KNOWN_ACRONYMS = new Set(["DC"]);

const toDisplayTitle = (label) => {
  if (!label) return label;
  return label
    .toLowerCase()
    .split(" ")
    .map((word) => {
      const upper = word.toUpperCase();
      return KNOWN_ACRONYMS.has(upper) ? upper : word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
};


const buildOverviewMetricDetail = (detail, index) => {
  if (!detail) return null;
  const isPercentValue =
    typeof detail.value === "number" &&
    typeof detail.valueDisplay === "string" &&
    detail.valueDisplay.includes("%");
  const value = isPercentValue
    ? `${detail.value}%`
    : detail.value !== null && detail.value !== undefined
    ? detail.value
    : detail.valueDisplay;
  return {
    key: detail.label || `detail_${index}`,
    label: detail.label ? `${detail.label}:` : "",
    value: value ?? "—",
    warning: detail.severity === "warning",
  };
};


const buildOverviewCardFromMetric = (metric, index) => {
  if (!metric) return null;
  const iconConfig = OVERVIEW_METRIC_ICON_CONFIG[metric.icon] || DEFAULT_OVERVIEW_ICON_CONFIG;
  const hasValueDisplay = metric.valueDisplay !== null && metric.valueDisplay !== undefined;

  return {
    key: metric.id || `overview_${index}`,
    icon: iconConfig.icon,
    iconBg: iconConfig.iconBg,
    title: toDisplayTitle(metric.label) || "Metric",
    value: hasValueDisplay
      ? metric.valueDisplay
      : metric.value !== null && metric.value !== undefined
      ? String(metric.value)
      : "—",
    caption: metric.valueSubtitle,
    delta:
      metric.trend && metric.trend.text
        ? { text: metric.trend.text, variant: metric.trend.variant }
        : undefined,
    sparklineColor: iconConfig.sparklineColor,
    sparklinePoints: Array.isArray(metric.sparkline?.data) ? metric.sparkline.data : [],
    defaultExpanded: false,
    details: Array.isArray(metric.details)
      ? metric.details.map(buildOverviewMetricDetail).filter(Boolean)
      : [],
  };
};

// Builds the Overview grid's card list from the aggregate-insights/summary
// API's `overview.metrics` array - returns null if that shape isn't usable
// (an unexpected/empty payload), so the caller can render an empty state
// instead of fabricating data.
const buildOverviewCardsFromApi = (overview) => {
  if (!overview || !Array.isArray(overview.metrics) || overview.metrics.length === 0) {
    return null;
  }
  return overview.metrics.map(buildOverviewCardFromMetric).filter(Boolean);
};

const OverviewSection = ({ cards, filters, getAggregateInsightsSummary, onLoadingChange }) => {
  const [apiCards, setApiCards] = useState(null);
  const [loading, setLoading] = useState(!cards);

  // See KpiSummarySection's identical `onLoadingChange` effect - lets a
  // parent combine every sibling section's loading state into one unified
  // loader. Optional/no-op if not passed.
  useEffect(() => {
    onLoadingChange?.(loading);
  }, [loading, onLoadingChange]);

  useEffect(() => {
    // An explicitly-passed `cards` prop wins and skips the network call.
    if (cards) return undefined;

    let isMounted = true;
    setLoading(true);

    getAggregateInsightsSummary(filters)
      .then((response) => {
        if (!isMounted) return;
        setApiCards(buildOverviewCardsFromApi(response?.data?.overview));
      })
      .catch((err) => {
        console.error("Failed to fetch overview metrics", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [cards, filters, getAggregateInsightsSummary]);


  const displayCards = cards || apiCards;

  return (
    <div className="overview-section">
      <div className="overview-section-title">Overview</div>
      {displayCards ? (
        <div className="overview-kpi-grid">
          {displayCards.map((card) => (
            <OverviewKpiCard key={card.key} {...card} />
          ))}
        </div>
      ) : (
        <div className="overview-section-status">
          {loading ? "Loading overview..." : "No overview data available."}
        </div>
      )}
    </div>
  );
};

const mapDispatchToProps = (dispatch) => ({
  getAggregateInsightsSummary: (filters) =>
    dispatch(getAggregateInsightsSummary(filters)),
});

export default connect(null, mapDispatchToProps)(OverviewSection);
