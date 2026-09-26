import React from "react";
import { Badge, Button } from "impact-ui-v3";
import { getBadgeSxForBudgetHierarchy } from "../utils/budgetHierarchyBadge.util.js";
import {
  getPackIdFromDimensionPath,
  isPackSizeHierarchyRow,
} from "../utils/orderManagementPack.util.js";

// innerRenderer for the pinned hierarchy column (agGroupCellRenderer owns the
// expand/collapse chevron; this renders only the label portion).
//
// Budget-classification chip on the right when BE returns `budget_hierarchy`
// — shown at every hierarchy level (group rows and leaf), not only root.
export default function HierarchyCellRenderer(params) {
  const data = params?.data;
  const label = params?.value == null ? "" : params.value;
  const pivotOrder = params?.pivotOrder || [];
  const isPackRow = isPackSizeHierarchyRow(pivotOrder, data);
  const rowBudgetHierarchy = data?.budget_hierarchy;
  // TAM inv_oms_budget_config.hierarchy_badge.disabled (defaults ON).
  const showBudgetBadge =
    params?.showBudgetHierarchyBadge !== false &&
    Boolean(data) &&
    !data?.meta?.__isGrandTotal;
  const badgeLabel =
    rowBudgetHierarchy != null && rowBudgetHierarchy !== ""
      ? String(rowBudgetHierarchy)
      : "-";

  let content;
  if (isPackRow) {
    const packId =
      getPackIdFromDimensionPath(pivotOrder, data?.dimensionPath) || label;

    const handlePackClick = () => {
      if (typeof params.onPackClick === "function") params.onPackClick(data);
    };

    content = (
      <Button variant="url" onClick={handlePackClick} title="View Pack Details">
        {packId}
      </Button>
    );
  } else {
    content = <span>{label}</span>;
  }

  if (!showBudgetBadge) {
    return content;
  }

  return (
    <div
      ref={(el) => {
        if (el) {
          const groupValue = el.closest(".ag-group-value");
          if (groupValue && groupValue instanceof HTMLElement) {
            groupValue.style.flex = "1";
          }
        }
      }}
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        width: "100%",
      }}
    >
      {content}
      <div style={{ marginLeft: 8, flexShrink: 0 }}>
        <Badge
          label={badgeLabel}
          variant="subtle"
          size="small"
          sx={getBadgeSxForBudgetHierarchy(rowBudgetHierarchy)}
        />
      </div>
    </div>
  );
}
