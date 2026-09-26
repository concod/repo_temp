import React, { useState } from "react";
import { motion } from "framer-motion";
import { Dropdown } from "./Dropdown";
import type { DropdownOption } from "./Dropdown";
import "./StoreDeepDive.scss";
import { StoreCard } from "./StoreCard";
import { StoreTable } from "./StoreTable";
import { TopComments } from "./TopComments";
import { useAuthStore } from "../../../store/authStore";
import { FloatingInputBar } from "../../Dashboard/FloatingInputBar";
import { Banner } from "../../Dashboard/Banner";
import { MetricCard } from "../../Dashboard/MetricCard";
import { Summary } from "../../Dashboard/Summary/Summary";
import { Badge } from "../../../../../shared/packages/ui";
import { useDistrictStore } from "../../../store/districtStore";
import { useFetchStoreData } from "../../../hooks/useFetchStoreData";
import { useDateRangeStore } from "../../../store/dateRangeStore";
import Error from "../../Utils/Error";

const getIcons = (iconName: string) => {
  switch (iconName) {
    case "nrr-audit":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
        >
          <path
            d="M12 2.25H3.75C2.925 2.25 2.25 2.925 2.25 3.75V14.25C2.25 15.075 2.925 15.75 3.75 15.75H14.25C15.075 15.75 15.75 15.075 15.75 14.25V6L12 2.25ZM14.25 14.25H3.75V3.75H11.25V6.75H14.25V14.25ZM5.25 12.75H12.75V11.25H5.25V12.75ZM9 5.25H5.25V6.75H9V5.25ZM5.25 9.75H12.75V8.25H5.25V9.75Z"
            fill="#0D152C"
          />
        </svg>
      );
    case "revv-deep-dive":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
        >
          <path
            d="M12.5025 9.8475C13.53 10.545 14.25 11.49 14.25 12.75V15H17.25V12.75C17.25 11.115 14.5725 10.1475 12.5025 9.8475Z"
            fill="#0D152C"
          />
          <path
            d="M11.25 9C12.9075 9 14.25 7.6575 14.25 6C14.25 4.3425 12.9075 3 11.25 3C10.8975 3 10.5675 3.075 10.2525 3.18C10.875 3.9525 11.25 4.935 11.25 6C11.25 7.065 10.875 8.0475 10.2525 8.82C10.5675 8.925 10.8975 9 11.25 9Z"
            fill="#0D152C"
          />
          <path
            d="M6.75 9C8.4075 9 9.75 7.6575 9.75 6C9.75 4.3425 8.4075 3 6.75 3C5.0925 3 3.75 4.3425 3.75 6C3.75 7.6575 5.0925 9 6.75 9ZM6.75 4.5C7.575 4.5 8.25 5.175 8.25 6C8.25 6.825 7.575 7.5 6.75 7.5C5.925 7.5 5.25 6.825 5.25 6C5.25 5.175 5.925 4.5 6.75 4.5Z"
            fill="#0D152C"
          />
          <path
            d="M6.75 9.75C4.7475 9.75 0.75 10.755 0.75 12.75V15H12.75V12.75C12.75 10.755 8.7525 9.75 6.75 9.75ZM11.25 13.5H2.25V12.7575C2.4 12.2175 4.725 11.25 6.75 11.25C8.775 11.25 11.1 12.2175 11.25 12.75V13.5Z"
            fill="#0D152C"
          />
        </svg>
      );
    case "inventory-action-plan":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
        >
          <path
            d="M3.1875 4.5H4.6875V6.75H12.1875V4.5H13.6875V8.25H15.1875V4.5C15.1875 3.675 14.5125 3 13.6875 3H10.5525C10.2375 2.13 9.4125 1.5 8.4375 1.5C7.4625 1.5 6.6375 2.13 6.3225 3H3.1875C2.3625 3 1.6875 3.675 1.6875 4.5V15C1.6875 15.825 2.3625 16.5 3.1875 16.5H7.6875V15H3.1875V4.5ZM8.4375 3C8.85 3 9.1875 3.3375 9.1875 3.75C9.1875 4.1625 8.85 4.5 8.4375 4.5C8.025 4.5 7.6875 4.1625 7.6875 3.75C7.6875 3.3375 8.025 3 8.4375 3Z"
            fill="#0D152C"
          />
          <path
            d="M15.1875 9.375L11.07 13.5L8.8125 11.25L7.6875 12.375L11.07 15.75L16.3125 10.5L15.1875 9.375Z"
            fill="#0D152C"
          />
        </svg>
      );
    case "action-plan":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
        >
          <path
            d="M9 1.5C4.86 1.5 1.5 4.86 1.5 9C1.5 13.14 4.86 16.5 9 16.5C13.14 16.5 16.5 13.14 16.5 9C16.5 4.86 13.14 1.5 9 1.5ZM9 15C5.6925 15 3 12.3075 3 9C3 5.6925 5.6925 3 9 3C12.3075 3 15 5.6925 15 9C15 12.3075 12.3075 15 9 15ZM12.4425 5.685L7.5 10.6275L5.5575 8.6925L4.5 9.75L7.5 12.75L13.5 6.75L12.4425 5.685Z"
            fill="#0D152C"
          />
        </svg>
      );
    case "net-sales":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
        >
          <path
            d="M3 2.25H15C15.4125 2.25 15.75 2.5875 15.75 3V15C15.75 15.4125 15.4125 15.75 15 15.75H3C2.5875 15.75 2.25 15.4125 2.25 15V3C2.25 2.5875 2.5875 2.25 3 2.25ZM3.75 14.25H14.25V3.75H3.75V14.25ZM6 12.75L9 9.75L11.25 12L13.5 9L14.25 9.75V12.75H6V12.75Z"
            fill="#0D152C"
          />
        </svg>
      );
    default:
      return null;
  }
};

interface StoreDeepDiveProps {
  onBack?: () => void;
}

export const StoreDeepDive: React.FC<StoreDeepDiveProps> = () => {
  const { district } = useAuthStore();
  const { stores } = useDistrictStore();
  const { startDate, endDate } = useDateRangeStore();

  const storeOptions: DropdownOption[] =
    stores.map((store) => ({
      value: store.store_id,
      label: store.store_name,
    })) || [];

  const getStoreNameById = (storeId: string): string | null => {
    if (!stores) return null;
    const store = stores.find((s) => s.store_id === storeId);
    return store?.store_name || null;
  };

  const initialStore = stores[0]?.store_id || "";
  const [selectedStore, setSelectedStore] = useState<string>(initialStore);

  const {
    data: storeDashboardData,
    loading,
    error,
  } = useFetchStoreData(
    district || "Miller",
    selectedStore,
    startDate || new Date(),
    endDate || new Date()
  );

  const handleStoreChange = (value: string | number) => {
    setSelectedStore(value as string);
  };

  const selectedStoreName = getStoreNameById(selectedStore) || selectedStore;

  const [activeTab, setActiveTab] = useState<
    "overall-summary" | "nrr-audit" | "revv-overall-score" | "net-sales"
  >("overall-summary");

  const getSummaryData = () => {
    // const splitSummary = (text: string): string[] => {
    //   if (!text) return [];
    //   // Split by sentences (period followed by space or end of string)
    //   return text.split(/\.\s+/).filter(s => s.trim().length > 0).map(s => s.trim() + (s.endsWith('.') ? '' : '.'));
    // };

    switch (activeTab) {
      case "overall-summary":
        return {
          labelTag: "AI generated summary",
          summaryItems: storeDashboardData?.overallSummary?.ai_insight || [],
        };
      case "revv-overall-score":
        return {
          labelTag: "AI generated summary",
          summaryItems:
            storeDashboardData?.person_analysis?.ai_summary?.items?.map(
              (item) => item.text
            ) || [],
        };
      case "nrr-audit":
        return {
          labelTag: "AI generated summary",
          summaryItems:
            storeDashboardData?.nrr_audit?.ai_summary?.items?.map(
              (item) => item.text
            ) || [],
        };
      case "net-sales":
        return {
          labelTag: "AI generated summary",
          summaryItems:
            storeDashboardData?.category_sales_performance?.ai_summary?.items?.map(
              (item) => item.text
            ) || [],
        };
      default:
        return {
          labelTag: "AI generated summary",
          summaryItems: [],
        };
    }
  };

  // Get content for left side based on active tab
  const getTabContent = () => {
    switch (activeTab) {
      case "overall-summary":
        return (
          <div className="tab-content-placeholder">Overall Summary Content</div>
        );
      case "nrr-audit":
        return (
          <StoreCard
            noData={false}
            tabs={false}
            title={storeDashboardData?.nrr_audit?.title || "NRR Audit"}
            icon={getIcons("nrr-audit")}
            content={
              <div className="store-table__container">
                {!storeDashboardData?.nrr_audit ||
                !storeDashboardData.nrr_audit.data_by_category ||
                storeDashboardData.nrr_audit.data_by_category.length === 0 ? (
                  <div className="store-table__empty">
                    No NRR audit data available
                  </div>
                ) : (
                  <div className="store-table__scroll-wrapper">
                    <table className="store-table__table store-table__nrr-audit">
                      <thead className="store-table__table-header">
                        <tr>
                          <th className="store-table__header-cell store-table__header-category">
                            Category
                          </th>
                          <th className="store-table__header-cell store-table__header-quarter">
                            Quarter
                          </th>
                          <th className="store-table__header-cell store-table__header-issue">
                            Issue
                          </th>
                          <th className="store-table__header-cell store-table__header-score">
                            Score
                          </th>
                          <th className="store-table__header-cell store-table__header-severity">
                            Severity
                          </th>
                          <th className="store-table__header-cell store-table__header-audit-date">
                            Audit Date
                          </th>
                        </tr>
                      </thead>
                      <tbody className="store-table__table-body">
                        {storeDashboardData.nrr_audit.data_by_category.map(
                          (categoryData) =>
                            categoryData.quarterly_data.map(
                              (quarter, qtrIdx) => (
                                <tr
                                  key={`${categoryData.category}-${quarter.quarter}-${qtrIdx}`}
                                  className={
                                    qtrIdx ===
                                    categoryData.quarterly_data.length - 1
                                      ? "store-table__category-last-row"
                                      : ""
                                  }
                                >
                                  {qtrIdx === 0 && (
                                    <td
                                      className="store-table__category-cell"
                                      rowSpan={
                                        categoryData.quarterly_data.length
                                      }
                                    >
                                      <div className="store-table__category-name">
                                        {categoryData.category}
                                      </div>
                                    </td>
                                  )}
                                  <td className="store-table__quarter">
                                    <div className="store-table__quarter-name">
                                      {quarter.quarter}
                                    </div>
                                    <div className="store-table__quarter-dates">
                                      {quarter.quarter_start_date} -{" "}
                                      {quarter.quarter_end_date}
                                    </div>
                                  </td>
                                  <td className="store-table__issue">
                                    {quarter.issue}
                                  </td>
                                  <td className="store-table__score">
                                    {quarter.score}
                                  </td>
                                  <td className="store-table__severity">
                                    <div>
                                      <Badge
                                        text={quarter.severity}
                                        className={
                                          quarter.severity.toLowerCase() ===
                                          "low"
                                            ? "minor"
                                            : quarter.severity.toLowerCase() ===
                                              "medium"
                                            ? "medium"
                                            : "high"
                                        }
                                      />
                                    </div>
                                  </td>
                                  <td className="store-table__audit-date">
                                    {quarter.audit_date}
                                  </td>
                                </tr>
                              )
                            )
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            }
          />
        );
      case "revv-overall-score":
        return (
          <>
            <StoreCard
              noData={false}
              tabs={false}
              title="REVV overall score"
              icon={getIcons("revv-deep-dive")}
              content={
                <StoreTable
                  data={storeDashboardData?.person_analysis?.persons}
                  loading={loading}
                />
              }
            />
            <TopComments
              data={storeDashboardData?.store_comments}
              loading={loading}
            />
          </>
        );
      case "net-sales":
        return (
          <StoreCard
            noData={false}
            tabs={false}
            title={
              storeDashboardData?.category_sales_performance?.title ||
              "Category-Wise Sales Performance"
            }
            icon={getIcons("net-sales")}
            content={
              <StoreTable
                data={storeDashboardData?.category_sales_performance?.data}
                loading={loading}
              />
            }
          />
        );
      default:
        return null;
    }
  };

  if (error) {
    return (
      <div className="dashboard">
        <Error message={error || "Failed to fetch store data"} />
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Header with Store Filter */}
      <motion.div
        className="dashboard-welcome"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="store-deep-dive-header">
          <div className="header-content">
            <h1 className="dashboard-title">
              Hey here is a deep dive of{" "}
              <span className="dashboard-title-name">{selectedStoreName}</span>
            </h1>
            {storeOptions.length === 0 ? (
              <div className="store-filter">
                <div className="store-dropdown-loading">
                  No stores available
                </div>
              </div>
            ) : (
              <div className="store-filter">
                <Dropdown
                  value={selectedStore}
                  options={storeOptions}
                  onChange={handleStoreChange}
                  placeholder="Select a store"
                  width="200px"
                  className="store-dropdown"
                />
              </div>
            )}
          </div>
        </div>
      </motion.div>
      {/* Loading Skeleton UI */}
      {loading ? (
        <>
          {/* Banner Skeleton */}
          <div
            className="loading-skeleton"
            style={{
              padding: "24px",
              marginBottom: "24px",
              borderRadius: "16px",
              height: "120px",
            }}
          >
            <div className="skeleton-content">
              <div
                className="skeleton-title"
                style={{ width: "40%", marginBottom: "12px" }}
              ></div>
              <div className="skeleton-title" style={{ width: "80%" }}></div>
              <div
                className="skeleton-title"
                style={{ width: "60%", marginTop: "8px" }}
              ></div>
            </div>
          </div>

          {/* Metrics Grid Skeleton */}
          <div className="metrics-grid">
            {[1, 2, 3].map((i) => (
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

          {/* Tabs Skeleton */}
          <div className="store-deep-dive-tabs-container">
            <div className="store-deep-dive-tabs">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="loading-skeleton"
                  style={{
                    height: "38px",
                    width: "120px",
                    borderRadius: "4px",
                  }}
                ></div>
              ))}
            </div>
            <div
              className={`store-deep-dive-tab-content ${
                activeTab === "overall-summary" ? "full-width" : ""
              }`}
            >
              {activeTab !== "overall-summary" && (
                <div className="store-deep-dive-content-left">
                  <div
                    className="loading-skeleton"
                    style={{ height: "400px", borderRadius: "16px" }}
                  ></div>
                </div>
              )}
              <div className="store-deep-dive-content-right">
                <div
                  className="loading-skeleton"
                  style={{ height: "400px", borderRadius: "16px" }}
                ></div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Banner */}
          {storeDashboardData?.overallSummary && (
            <Banner
              title={storeDashboardData.overallSummary.title}
              description={storeDashboardData.overallSummary.body}
            />
          )}

          {/* Metrics Grid */}
          {storeDashboardData?.kpiCards &&
            storeDashboardData.kpiCards.length > 0 && (
              <div className="metrics-grid">
                {storeDashboardData.kpiCards.map((kpi) => (
                  <div key={kpi.id} className="metric-card-wrapper">
                    <MetricCard kpiData={kpi} />
                  </div>
                ))}
              </div>
            )}

          {/* Tabs and Main Content */}
          <div className="store-deep-dive-tabs-container">
            {/* Tabs Navigation */}
            <div className="store-deep-dive-tabs">
              <button
                className={`store-deep-dive-tab ${
                  activeTab === "overall-summary" ? "active" : ""
                }`}
                onClick={() => setActiveTab("overall-summary")}
                type="button"
              >
                Overall summary
              </button>
              <button
                className={`store-deep-dive-tab ${
                  activeTab === "nrr-audit" ? "active" : ""
                }`}
                onClick={() => setActiveTab("nrr-audit")}
                type="button"
              >
                NRR audit
              </button>
              <button
                className={`store-deep-dive-tab ${
                  activeTab === "revv-overall-score" ? "active" : ""
                }`}
                onClick={() => setActiveTab("revv-overall-score")}
                type="button"
              >
                REVV overall score
              </button>
              <button
                className={`store-deep-dive-tab ${
                  activeTab === "net-sales" ? "active" : ""
                }`}
                onClick={() => setActiveTab("net-sales")}
                type="button"
              >
                Net sales
              </button>
            </div>

            {/* Tab Content - Two Column Layout */}
            <div
              className={`store-deep-dive-tab-content ${
                activeTab === "overall-summary" ? "full-width" : ""
              }`}
            >
              {/* Left Column - Main Content */}
              {activeTab !== "overall-summary" && (
                <div className="store-deep-dive-content-left">
                  {getTabContent()}
                </div>
              )}

              {/* Right Column - Summary */}
              <div className="store-deep-dive-content-right">
                <Summary
                  labelTag={getSummaryData().labelTag}
                  summaryItems={getSummaryData().summaryItems}
                />
              </div>
            </div>
          </div>
        </>
      )}
      {/* Chat Bar */}
      <FloatingInputBar />
    </div>
  );
};
