import React, { useState, useEffect } from "react";
import { MetricCard } from "./MetricCard";
import { PspStoreHubService } from "../../services/PspStoreHubService";
import { FloatingInputBar } from "./FloatingInputBar";
import { useDashboardStore } from "../../store/dashboardStore";
import type {
  DashboardData,
  InventoryRisk,
  KPICard,
} from "../../types/dashboard.types";
import { Overlay } from "../Layout/Overlay/Overlay";
import { ErrorBoundary } from "../ErrorBoundary";
import { Dialog } from "../../../../../components/Modal";
import {
  useAuthStore,
  AUTH_KEY,
} from "../../../agent-launcher/store/authStore";

export const Dashboard: React.FC = () => {
  const {
    setDashboardData: saveToStore,
    setLoading: setStoreLoading,
    setError: setStoreError,
    hasCachedData,
    getCachedDashboardData,
  } = useDashboardStore();
  const { userName } = useAuthStore();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pspService = new PspStoreHubService();
  const [inventoryRisk, setInventoryRisk] = useState<InventoryRisk | null>(
    null
  );
  const [activeTab, setActiveTab] = useState<"stores" | "products">("stores");

  // const handleStoreDeepDive = (storeId?: string) => {
  //   navigate('/apps/psp-storehub/store-deep-dive', {
  //     state: { selectedStoreId: storeId }
  //   });
  // };

  // Fetch dashboard data on component mount
  useEffect(() => {
    const fetchDashboardData = async () => {
      // Check if we have cached data first
      if (hasCachedData()) {
        const cachedData = getCachedDashboardData();
        if (cachedData) {
          setDashboardData(cachedData);
          setLoading(false);
          setError(null);
          return; // Use cached data, skip API call
        }
      }

      // If no cached data, fetch from API
      try {
        setLoading(true);
        setStoreLoading(true);
        setError(null);
        setStoreError(null);
        const districtId = "Test";
        const data = await pspService.getDashboardData(districtId);
        setDashboardData(data);
        // Save to Zustand store for sharing with other components and caching
        saveToStore(data);
      } catch (err) {
        if (err instanceof Error && err.message === "UNAUTHORIZED") {
          localStorage.removeItem(AUTH_KEY);
          window.location.href = "/apps/agent-studio/";
          return;
        }
        console.error("Failed to fetch dashboard data:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load dashboard data";
        setError(errorMessage);
        setStoreError(errorMessage);
      } finally {
        setLoading(false);
        setStoreLoading(false);
      }
    };

    fetchDashboardData();
  }, [
    saveToStore,
    setStoreLoading,
    setStoreError,
    hasCachedData,
    getCachedDashboardData,
  ]);

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
        {/* <Banner title={dashboardData?.overallSummary?.title} description={dashboardData?.overallSummary?.body} /> */}

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

        {/* Store Signals */}
        <div className="store-signal-card">
          <div className="store-signal-card__header">
            <h4 className="store-signal-card__title">Today's Store Signals</h4>
            <p className="store-signal-card__subheading">
              Auto-detected risk and opportunities
            </p>
          </div>

          <ul className="store-signal-card__list">
            {dashboardData.storeSignals.map((item, index) => (
              <li key={index} className="store-signal-card__list-item">
                <div className="icon-wrapper">
                  <i className="fa-solid fa-bolt-lightning"></i>
                </div>
                <span className="item-text">{item.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="risks">
          <h4 className="risks__title">Active Risks and Alerts</h4>

          <div className="risks__container">
            {dashboardData.activeAlerts.map((risk) => (
              <div
                key={risk.id}
                className={`risk-card severity-${risk.severity}`}
                onClick={() => setInventoryRisk(risk)}
              >
                <div className="risk-card__header">
                  <div className="risk-card__title-group">
                    <h3 className="risk-card__title-group--title">
                      {risk.title}
                    </h3>
                    <span
                      className={`risk-card__title-group--badge ${risk.severity}`}
                    >
                      {risk.severity}
                    </span>
                  </div>
                </div>

                <div className="risk-card__body">
                  <p className="summary">{risk.summary}</p>
                  <p className="top-driver">
                    Top driver: {risk.topDriver.label}
                    <span className="value"> (≈ ${risk.topDriver.value})</span>
                  </p>
                </div>

                <div className="risk-card__footer">
                  <span className="value-at-risk">${risk.valueAtRisk}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Priority Action Metrics Row */}
        {/* <div className="priority-action-metrics">
          <PriorityActionGrid 
              onStoreClick={handleStoreDeepDive}
              stores={dashboardData.allStores.stores}
            />
      </div> */}

        {/* <div className="secondary-metrics">
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
            iconBackground='#BCE2F1'
          />
          <NegativeCustomerThemes
            title={dashboardData.topPositiveThemes.title}
            subtitle={dashboardData.topPositiveThemes.subtitle}
            items={dashboardData.topPositiveThemes.items}
            gradientStart="#26734B"
            gradientEnd="#EBF7F1"
            icon={<img src={positiveIcon} alt="Positive" />}
            iconBackground='#CEF0CB'
          />
      </div> */}
        {/* <div className="graph-metrics">
        <Performance
            data={dashboardData.performanceChart}
          />
        <StoreDetails />
      </div> */}

        <FloatingInputBar />
        <Overlay />
        <Dialog
          open={!!inventoryRisk}
          setOpen={() => {
            setInventoryRisk(null);
            setActiveTab("stores");
          }}
        >
          <Dialog.Content className="risk-summary">
            <div className="risk-summary--header">
              <div className="risk-summary--title-area">
                <h4 className="risk-summary--title">{inventoryRisk?.title}</h4>
                <p className="risk-summary--subtitle">
                  {inventoryRisk?.summary}
                </p>
              </div>
              <button
                className="risk-summary--close-btn"
                onClick={() => {
                  setInventoryRisk(null);
                  setActiveTab("stores");
                }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div
              className={`risk-summary--highlight severity-${inventoryRisk?.severity}`}
            >
              <span className="risk-summary--highlight-label">
                Total at risk
              </span>
              <span className="risk-summary--highlight-value">
                ${inventoryRisk?.valueAtRisk}
              </span>
            </div>

            <div className="risk-summary--tabs">
              <button
                className={`risk-summary--tab-btn ${
                  activeTab === "stores" ? "active" : ""
                }`}
                onClick={() => setActiveTab("stores")}
              >
                Stores ({inventoryRisk?.details.byStore.length})
              </button>
              <button
                className={`risk-summary--tab-btn ${
                  activeTab === "products" ? "active" : ""
                }`}
                onClick={() => setActiveTab("products")}
              >
                Products ({inventoryRisk?.details.byProduct.length})
              </button>
            </div>

            <div className="risk-summary--content">
              <ul className="risk-summary--list">
                {(activeTab === "stores"
                  ? inventoryRisk?.details.byStore
                  : inventoryRisk?.details.byProduct
                )?.map((item, i) => {
                  // Type narrowing for rendering logic
                  const isStore = "storeName" in item;
                  return (
                    <li key={i} className="risk-summary--item">
                      <div className="risk-summary--item-info">
                        <span className="risk-summary--item-name">
                          {isStore ? item.storeName : item.productName}
                        </span>
                        <span className="risk-summary--item-sub">
                          {isStore
                            ? `${item.skuCount} SKUs • ${item.category}`
                            : `${item.category} • ${item.affectedStores.length} Stores affected`}
                        </span>
                      </div>
                      {/* <div
                        className={`risk-summary--item-amount severity-${inventoryRisk?.severity}`}
                      >
                        <span className="risk-summary--item-dot"></span>
                        {isStore ? "$12,000" : "$8,000"}
                      </div> */}
                    </li>
                  );
                })}
              </ul>
            </div>
          </Dialog.Content>
          <Dialog.Overlay />
        </Dialog>
      </div>
    </ErrorBoundary>
  );
};
