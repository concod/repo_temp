import React, { useState, useMemo, useCallback } from "react";
import { BottomSheet, Tabs, Badge } from "impact-ui-v3";
import ViolationsTable from "./ViolationsTable";
import AllocationPlansTable from "./AllocationPlansTable";
import AllocationCodesPanel from "./AllocationCodesPanel";
import {
  ATA_BOTTOM_SHEET_TITLE,
  VIOLATIONS_TAB_LABEL,
  ALLOCATION_PLANS_TAB_LABEL,
} from "./ata-constants";
import { useATAStyles } from "./ata-styles";
import "./ata-styles.css";

/**
 * ATA (Available To Allocate) Exceedance Check Component.
 * Renders a BottomSheet with two tabs:
 *  1. Style-Color / Pack / Source (Violations)
 *  2. Allocation Plans
 *
 * Clicking "+X" on allocation codes hides the BottomSheet and opens
 * a right-side Panel. Closing the Panel re-shows the BottomSheet.
 */
const AvailableToAllocate = ({
  open,
  onClose,
  ataData,
  onAutoAdjust,
  onFinalizePlans,
  onReviewRecommendation,
  displaySnackMessages,
}) => {
  const classes = useATAStyles();
  const [activeTab, setActiveTab] = useState("violations");
  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedCodes, setSelectedCodes] = useState([]);
  const [autoAdjustLoading, setAutoAdjustLoading] = useState(false);
  const [localAtaData, setLocalAtaData] = useState(null);

  const currentData = localAtaData || ataData;
  const violations = currentData?.violations || [];
  const allocationPlans = currentData?.allocation_plans || [];
  const counts = currentData?.counts || { violations: 0, allocation_plans: 0 };

  const handleTabChange = (_event, newValue) => {
    setActiveTab(newValue);
  };

  // Open the panel and hide the BottomSheet
  const handleViewAllCodes = useCallback((codes) => {
    setSelectedCodes(codes);
    setPanelOpen(true);
  }, []);

  // Close the panel and re-show the BottomSheet
  const handlePanelClose = useCallback(() => {
    setPanelOpen(false);
  }, []);

  /**
   * Called by ViolationsTable Save button.
   * Calls the auto-adjust API and refreshes both tabs with the response.
   * Returns true on success so ViolationsTable can reset adjust mode.
   */
  const handleAutoAdjust = useCallback(
    async (violationKeys, adjustAll = false) => {
      if (!onAutoAdjust) return false;
      try {
        setAutoAdjustLoading(true);
        const responseData = await onAutoAdjust(violationKeys, adjustAll);
        if (responseData) {
          setLocalAtaData(responseData);
          displaySnackMessages?.("Auto-adjust applied successfully", "success");
          return true;
        }
        return false;
      } catch (err) {
        displaySnackMessages?.("Error applying auto-adjust", "error");
        return false;
      } finally {
        setAutoAdjustLoading(false);
      }
    },
    [onAutoAdjust, displaySnackMessages]
  );

  // Add a unique row id to violations for ag-grid
  const violationsWithId = useMemo(() => {
    return violations.map((row, index) => ({
      ...row,
      violation_row_id: `violation_${index}`,
    }));
  }, [violations]);

  // Append review_action to each allocation plan row (not provided by BE)
  const allocationPlansWithAction = useMemo(() => {
    return allocationPlans.map((plan) => ({
      ...plan,
      review_action: plan.review_action || "Review recommendation >",
    }));
  }, [allocationPlans]);

  const tabNames = useMemo(
    () => [
      {
        label: (
          <span className={classes.tabLabel}>
            {VIOLATIONS_TAB_LABEL}
            <Badge
              label={String(counts.violations)}
              variant="subtle"
              color="info"
              size="small"
            />
          </span>
        ),
        value: "violations",
      },
      {
        label: (
          <span className={classes.tabLabel}>
            {ALLOCATION_PLANS_TAB_LABEL}
            <Badge
              label={String(counts.allocation_plans)}
              variant="subtle"
              color="warning"
              size="small"
            />
          </span>
        ),
        value: "allocation_plans",
      },
    ],
    [counts]
  );

  const tabPanels = useMemo(
    () => [
      <ViolationsTable
        violations={violationsWithId}
        onViewAllCodes={handleViewAllCodes}
        onAutoAdjust={handleAutoAdjust}
        autoAdjustLoading={autoAdjustLoading}
        displaySnackMessages={displaySnackMessages}
      />,
      <AllocationPlansTable
        allocationPlans={allocationPlansWithAction}
        onFinalizePlans={onFinalizePlans}
        onReviewRecommendation={onReviewRecommendation}
        displaySnackMessages={displaySnackMessages}
      />,
    ],
    [violationsWithId, allocationPlansWithAction, handleViewAllCodes, handleAutoAdjust, autoAdjustLoading, displaySnackMessages, onFinalizePlans, onReviewRecommendation]
  );

  return (
    <>
      <BottomSheet
        open={open && !panelOpen}
        onClose={onClose}
        title={ATA_BOTTOM_SHEET_TITLE}
        size="medium"
        className="ata-bottom-sheet"
      >
        <Tabs
          onChange={handleTabChange}
          orientation="horizontal"
          tabNames={tabNames}
          tabPanels={tabPanels}
          value={activeTab}
        />
      </BottomSheet>
      <AllocationCodesPanel
        open={panelOpen}
        onClose={handlePanelClose}
        codes={selectedCodes}
      />
    </>
  );
};

export default AvailableToAllocate;
