import { useState } from "react";
import { SparkLineChart } from "@mui/x-charts/SparkLineChart";
import "./OverviewSection.css";

// Delta badge color variants - keyed so sample/API data can just pass a
// variant name instead of raw colors.
export const DELTA_VARIANTS = {
  success: { bg: "#F4FFF7", color: "#1FA971" },
  warning: { bg: "#FFFBEA", color: "#8A6D1D" },
  danger: { bg: "#FFF4F4", color: "#E5484D" },
};

const UnitsAllocatedIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="none"
  >
    <path
      d="M10.8 1C11.1027 0.999911 11.3943 1.10578 11.6163 1.29639C11.8383 1.48699 11.9743 1.74825 11.997 2.02778L12 2.11111V4.33333H11.4V9.88889C11.4001 10.1692 11.2858 10.4392 11.0799 10.6447C10.874 10.8503 10.5919 10.9762 10.29 10.9972L10.2 11H1.8C1.49725 11.0001 1.20566 10.8942 0.983671 10.7036C0.761682 10.513 0.625706 10.2518 0.603 9.97222L0.6 9.88889V4.33333H6.01608e-08V2.11111C-9.57475e-05 1.83079 0.114244 1.5608 0.320098 1.35525C0.525953 1.14971 0.808107 1.0238 1.11 1.00278L1.2 1H10.8ZM10.2 4.33333H1.8V9.88889H10.2V4.33333ZM7.2 6.55556C7.35913 6.55556 7.51174 6.61409 7.62426 6.71827C7.73679 6.82246 7.8 6.96377 7.8 7.11111C7.8 7.25845 7.73679 7.39976 7.62426 7.50395C7.51174 7.60814 7.35913 7.66667 7.2 7.66667H4.8C4.64087 7.66667 4.48826 7.60814 4.37574 7.50395C4.26321 7.39976 4.2 7.25845 4.2 7.11111C4.2 6.96377 4.26321 6.82246 4.37574 6.71827C4.48826 6.61409 4.64087 6.55556 4.8 6.55556H7.2ZM10.8 2.11111H1.2V3.22222H10.8V2.11111Z"
      fill="#658EC4"
    />
  </svg>
);

// Sample-data icon lookup - swap/extend once the real API tells us which
// icon each overview metric should use.
export const OVERVIEW_ICON_MAP = {
  unitsAllocated: <UnitsAllocatedIcon />,
};

const WarningIcon = () => <span className="overview-kpi-warningIcon">⚠️</span>;

const OverviewKpiCard = ({
  icon,
  iconBg = "#EAF1FB",
  title,
  value,
  caption,
  delta,
  deltaCaption = "vs 7 day avg",
  sparklineColor = "#4259EE",
  sparklinePoints = [],
  details = [],
  defaultExpanded = false,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const deltaVariant = DELTA_VARIANTS[delta?.variant] || DELTA_VARIANTS.success;

  return (
    <div className="overview-kpi-card">
      <div className="overview-kpi-headerRow">
        <div className="overview-kpi-titleRow">
          <span className="overview-kpi-iconBox" style={{ background: iconBg }}>
            {icon}
          </span>
          <span className="overview-kpi-title">{title}</span>
        </div>

        {delta && (
          <div className="overview-kpi-deltaCol">
            <span
              className="overview-kpi-deltaBadge"
              style={{ background: deltaVariant.bg, color: deltaVariant.color }}
            >
              {delta.text}
            </span>
            <span className="overview-kpi-deltaCaption">{deltaCaption}</span>
          </div>
        )}
      </div>

      <div className="overview-kpi-body">
        <div className="overview-kpi-valueRow">
          <div className="overview-kpi-valueCol">
            <div className="overview-kpi-value">{value}</div>
            <div className="overview-kpi-caption">{caption}</div>
          </div>

          <SparkLineChart
            data={sparklinePoints}
            color={sparklineColor}
            width={120}
            height={40}
            area
            showHighlight
            curve="linear"
            plotType="line"
            margin={{ top: 6, bottom: 3, left: 3, right: 3 }}
            sx={{ "& .MuiLineElement-root": { strokeWidth: 2 } }}
          />
        </div>

        {expanded && details.length > 0 && (
          <div className="overview-kpi-details">
            {details.map((detail, index) => (
              <div className="overview-kpi-detailLine" key={detail.key || index}>
                <span className="overview-kpi-detailLabel">{detail.label} </span>
                <span
                  className={
                    detail.warning
                      ? "overview-kpi-detailValue overview-kpi-detailValue--warning"
                      : "overview-kpi-detailValue"
                  }
                >
                  {detail.warning && <WarningIcon />}
                  {detail.value}
                </span>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          className="overview-kpi-toggle"
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? "View less" : "View more"}
        </button>
      </div>
    </div>
  );
};

export default OverviewKpiCard;
