import React from "react";
import netSalesComp from "../../assets/netsales-icon.svg";
import revvOverallScore from "../../assets/revv-icon.svg";
import nrrAuditAverage from "../../assets/nrr-icon.svg";
import laborSph from "../../assets/LS_icon.svg";
import graphIcon from "../../assets/graph.svg";
import { useOverlayStore } from "../../store/overlayStore";
import type { KPICard } from "../../types/dashboard.types";

interface MetricCardProps {
  kpiData: KPICard;
}

export const MetricCard: React.FC<MetricCardProps> = ({ kpiData }) => {
  const { openKPIOverlay } = useOverlayStore();

  const handleCardClick = () => {
    openKPIOverlay(kpiData);
  };

  const getValueClass = (direction: "up" | "down" | "neutral" | "flat") => {
    return direction === "up"
      ? "metric-label-positive"
      : direction === "down"
      ? "metric-label-negative"
      : "metric-label-neutral"; // 'neutral' and 'flat' both use neutral styling
  };

  const formatMetricValue = (
    value: string | number | null,
    isPercentage: boolean = false
  ) => {
    if (value === null || value === undefined) return "No Data";
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(numValue)) return "No Data";
    const formattedValue = numValue >= 0 ? `+${numValue}` : `${numValue}`;
    return isPercentage ? `${formattedValue}%` : formattedValue;
  };

  // Format the main KPI value based on unit
  const formatKPIValue = (
    value: number | null | undefined,
    unit: string
  ): string => {
    if (value === null || value === undefined) return "No Data";

    switch (unit) {
      case "thousand_usd":
        return `$${value.toFixed(2)}K`;
      case "million_usd":
        return `$${value.toFixed(2)}M`;
      case "percent":
        return `${value.toFixed(1)}%`;
      case "points":
        return value.toFixed(2);
      case "usd":
        return `$${value.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
      default:
        return String(value);
    }
  };

  const getIcons = () => {
    switch (kpiData.title) {
      case "Net Sales Comp (Weekly)":
      case "Net Sales Comp (Monthly)":
      case "Net Sales Comp (QTD)":
      case "Net Sales":
        return <img src={netSalesComp} alt="Net Sales Comp" />;
      case "REVV overall score":
      case "REVV Overall Score":
      case "Promo Share":
        return <img src={revvOverallScore} alt="REVV Overall Score" />;
      case "NRR audit average":
      case "NRR Audit Average":
      case "Margin":
        return <img src={nrrAuditAverage} alt="NRR Audit Average" />;
      case "Labor SPH (Sales Per Hour)":
      case "Returns":
        return <img src={laborSph} alt="Labor SPH (Sales Per Hour)" />;
      default:
        return (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
          </svg>
        );
    }
  };

  return (
    <div
      className="metric-card"
      onClick={handleCardClick}
      style={{ cursor: "pointer" }}
    >
      {/* Icon */}
      <div className="metric-icon">{getIcons()}</div>

      {/* Content */}
      <div className="metric-content">
        {/* Heading */}
        <div className="metric-heading">
          <h3 className="metric-title">{kpiData.title}</h3>
        </div>

        {/* Value */}
        <div className="metric-value">
          <div className="metric-number">
            {formatKPIValue(kpiData.value, kpiData.unit)}
          </div>
          {kpiData.metrics.length > 0 &&
            kpiData.metrics.map((metric, index) => (
              <div key={index} className="metric-metadata">
                <div className="metric-wow-label">{metric.label} :</div>
                <div
                  className={`metric-wow-value ${getValueClass(
                    metric.direction
                  )}`}
                >
                  {formatMetricValue(
                    metric.value,
                    kpiData.title.toLowerCase().includes("comp") ||
                      kpiData.title.toLowerCase().includes("sales")
                  )}
                </div>
              </div>
            ))}
          {/* <div className="metric-metadata">
            
            <div className="metric-wow-label">WoW% :</div>
            <div className={`metric-wow-value ${getValueClass(wowDirection)}`}>
              {formatMetricValue(wowValue, kpiData.title.toLowerCase().includes('comp') || kpiData.title.toLowerCase().includes('sales'))}
            </div>
            <div className="metric-ly-label">Vs LY% :</div>
            <div className={`metric-ly-value ${getValueClass(lyDirection)}`}>
              {formatMetricValue(lyValue, kpiData.title.toLowerCase().includes('comp') || kpiData.title.toLowerCase().includes('sales'))}
            </div>
          </div> */}
        </div>
      </div>

      {/* Graph - positioned absolutely */}
      <div className="metric-graph">
        <img src={graphIcon} alt="Graph" />
      </div>
    </div>
  );
};
