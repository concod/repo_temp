import React from "react";
import { useNavigate } from "react-router-dom";
import { MetricCard } from "./MetricCard";
import { PriorityActionGrid } from "./PriorityActionGrid/PriorityActionGrid";
import { NegativeCustomerThemes } from "./NegativeCustomerThemes";
import { Performance } from "./Performance";
import { StoreDetails } from "./StoreDetails";
import { FloatingInputBar } from "./FloatingInputBar";
import { useAuthStore } from "../../store/authStore";
import type { KPICard } from "../../types/dashboard.types";
import { Banner } from "./Banner";
import negativeIcon from "../../assets/arrowdown-red.svg";
import neutralIcon from "../../assets/smiley-blue.svg";
import positiveIcon from "../../assets/arrowup-green.svg";
import { Overlay } from "../Layout/Overlay/Overlay";
import { ErrorBoundary } from "../ErrorBoundary";
import { useDateRangeStore } from "../../store/dateRangeStore";
import { useFetchDashboard } from "../../hooks/useFetchDashboard";

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { district, userName } = useAuthStore();
  const { startDate, endDate } = useDateRangeStore();
  const {
    data: dashboardData,
    loading,
    error,
  } = useFetchDashboard(
    district || "Test",
    startDate || new Date(),
    endDate || new Date()
  );

  const handleStoreDeepDive = (storeId?: string) => {
    navigate("/apps/psp-storehub/store-deep-dive", {
      state: { selectedStoreId: storeId },
    });
  };

  // Transform API data to MetricCard format
  const transformKpiToMetricCard = (kpi: KPICard) => {
    const metrics = Array.isArray(kpi?.metrics) ? kpi.metrics : [];

    // Extract WoW and LY metrics from the metrics array
    const wowMetric = metrics.find((m) =>
      m?.label?.toLowerCase().includes("wow")
    );
    const lyMetric = metrics.find((m) =>
      m?.label?.toLowerCase().includes("ly")
    );

    // Format WoW and LY values - ensure they're numbers or null
    const wowValue =
      wowMetric?.value !== null && wowMetric?.value !== undefined
        ? typeof wowMetric.value === "number"
          ? wowMetric.value
          : parseFloat(String(wowMetric.value))
        : null;

    const lyValue =
      lyMetric?.value !== null && lyMetric?.value !== undefined
        ? typeof lyMetric.value === "number"
          ? lyMetric.value
          : parseFloat(String(lyMetric.value))
        : null;

    return {
      kpiData: kpi,
      wowValue,
      wowDirection: wowMetric?.direction || "neutral",
      lyValue,
      lyDirection: lyMetric?.direction || "neutral",
    };
  };

  // Loading state
  if (loading) {
    return (
      <div className="dashboard">
        <div className="dashboard-welcome">
          <h1 className="dashboard-title">Loading Dashboard...</h1>
        </div>
        <div className="metrics-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="metric-card-wrapper">
              <div className="metric-card loading-skeleton">
                <div className="skeleton-icon"></div>
                <div className="skeleton-content">
                  <div className="skeleton-title"></div>
                  <div className="skeleton-value"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="dashboard">
        <div className="dashboard-welcome">
          <h1 className="dashboard-title">
            Failed to load dashboard data, please try again later.
          </h1>
        </div>
      </div>
    );
  }

  // No data state
  if (!dashboardData) {
    return (
      <div className="dashboard">
        <div className="dashboard-welcome">
          <h1 className="dashboard-title">No Data Available</h1>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="dashboard">
        {/* Welcome Section */}
        <div className="dashboard-welcome">
          <h1 className="dashboard-title">
            Welcome Back,{" "}
            <span className="dashboard-title-name">{userName}</span>
          </h1>
        </div>
        <Banner
          title={dashboardData?.overallSummary?.title}
          description={dashboardData?.overallSummary?.body}
        />

        {/* Metrics Grid */}
        <div className="metrics-grid">
          {dashboardData.kpiCards
            .map((kpi) => {
              try {
                // Validate kpi before transformation
                if (!kpi || !kpi.id) {
                  console.warn("Invalid KPI card data:", kpi);
                  return null;
                }

                const transformedMetric = transformKpiToMetricCard(kpi);
                return (
                  <div key={kpi.id} className="metric-card-wrapper">
                    <MetricCard {...transformedMetric} />
                  </div>
                );
              } catch (error) {
                console.error("Error rendering KPI card:", error, kpi);
                // Return a placeholder or skip this card instead of crashing
                return (
                  <div
                    key={kpi?.id || `error-${Math.random()}`}
                    className="metric-card-wrapper"
                  >
                    <div className="metric-card error-card">
                      <div className="metric-content">
                        <h3 className="metric-title">Error loading metric</h3>
                        <div className="metric-value">
                          Unable to display this metric
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
            })
            .filter(Boolean)}
        </div>

        {/* Priority Action Metrics Row */}
        <div className="priority-action-metrics">
          <PriorityActionGrid
            onStoreClick={handleStoreDeepDive}
            stores={dashboardData.allStores.stores}
          />
        </div>

        <div className="secondary-metrics">
          <NegativeCustomerThemes
            title={dashboardData.topNegativeThemes.title}
            subtitle={dashboardData.topNegativeThemes.subtitle}
            items={dashboardData.topNegativeThemes.items}
            gradientStart="#FF4B4B"
            gradientEnd="#FFF4E3"
            icon={<img src={negativeIcon} alt="Negative" />}
            iconBackground="#FFCBCB"
          />
          <NegativeCustomerThemes
            title={dashboardData.topNeutralThemes.title}
            subtitle={dashboardData.topNeutralThemes.subtitle}
            items={dashboardData.topNeutralThemes.items}
            gradientStart="#3649C6"
            gradientEnd="#ECEEFD"
            icon={<img src={neutralIcon} alt="Neutral" />}
            iconBackground="#BCE2F1"
          />
          <NegativeCustomerThemes
            title={dashboardData.topPositiveThemes.title}
            subtitle={dashboardData.topPositiveThemes.subtitle}
            items={dashboardData.topPositiveThemes.items}
            gradientStart="#26734B"
            gradientEnd="#EBF7F1"
            icon={<img src={positiveIcon} alt="Positive" />}
            iconBackground="#CEF0CB"
          />
          {/* <Performance
            data={dashboardData.performanceChart}
          /> */}
        </div>
        <div className="graph-metrics">
          <Performance data={dashboardData.performanceChart} />
          <StoreDetails allStores={dashboardData.allStores} />
        </div>

        <FloatingInputBar />
        <Overlay />
      </div>
    </ErrorBoundary>
  );
};
