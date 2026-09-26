
const flattenStyleColorTree = (items, planId, planName, rows, parentStyleColorName) => {
  if (!Array.isArray(items)) return;
  items.forEach((styleColor) => {
    rows.push({
      planId: planId ?? "",
      planName: planName ?? "",
      parentStyleColorName: parentStyleColorName || "",
      styleColorName: styleColor.styleColorName ?? "",
      categoryTag: styleColor.categoryTag ?? "",
      storeCount: styleColor.storeCount ?? "",
      impactUnits: styleColor.impactUnits ?? "",
      issue: styleColor.issue || "",
    });
    if (Array.isArray(styleColor.nestedStyleColors?.items)) {
      flattenStyleColorTree(
        styleColor.nestedStyleColors.items,
        planId,
        planName,
        rows,
        styleColor.styleColorName
      );
    }
  });
};

export const flattenPlanStyleColors = (data) => {
  const plans = data?.content?.directory?.plans?.items;
  const rows = [];
  if (!Array.isArray(plans)) return rows;
  plans.forEach((plan) => {
    flattenStyleColorTree(plan.styleColors?.items, plan.planId, plan.planName, rows);
  });
  return rows;
};

export const PLAN_STYLE_COLOR_CSV_HEADERS = [
  { label: "Plan ID", key: "planId" },
  { label: "Plan Name", key: "planName" },
  { label: "Parent Style Color", key: "parentStyleColorName" },
  { label: "Style Color", key: "styleColorName" },
  { label: "Category", key: "categoryTag" },
  { label: "No Of Stores", key: "storeCount" },
  { label: "Impact Units", key: "impactUnits" },
  { label: "Issue", key: "issue" },
];

// ---- dc_sourcing ------------------------------------------------------------
export const flattenDcSourcingStyleColors = (data) => {
  const plans = data?.content?.directory?.plans?.items;
  const rows = [];
  if (!Array.isArray(plans)) return rows;
  plans.forEach((plan) => {
    (plan.styleColors?.items || []).forEach((styleColor) => {
      const pos = Array.isArray(styleColor.targetDispatchPos) ? styleColor.targetDispatchPos : [];
      rows.push({
        planId: plan.planId ?? "",
        planName: plan.planName ?? "",
        styleColorName: styleColor.styleColorName ?? "",
        issue: styleColor.issue || "",
        sourcingDcId: styleColor.sourcingDcId ?? "",
        targetDispatchPos: pos
          .map((po) => po.poNumber || po.id || "")
          .filter(Boolean)
          .join("; "),
      });
    });
  });
  return rows;
};

export const DC_SOURCING_CSV_HEADERS = [
  { label: "Plan ID", key: "planId" },
  { label: "Plan Name", key: "planName" },
  { label: "Style Color", key: "styleColorName" },
  { label: "Issue", key: "issue" },
  { label: "Sourcing DC", key: "sourcingDcId" },
  { label: "Target Dispatch POs", key: "targetDispatchPos" },
];

// ---- pack_rounding -----------------------------------------------------------
export const flattenPackIssues = (data) => {
  const items = data?.content?.packIssues?.items;
  if (!Array.isArray(items)) return [];
  return items.map((issue) => ({
    packId: issue.packId ?? "",
    styleColorName: issue.styleColorName ?? "",
    issue: issue.issue || "",
    demandUnits: issue.demandUnits ?? "",
    allocatedUnits: issue.allocatedUnits ?? "",
    affectedStoreCount: issue.affectedStoreCount ?? "",
    packSizeUnits: issue.packSizeUnits ?? "",
  }));
};

export const PACK_ISSUE_CSV_HEADERS = [
  { label: "Pack ID", key: "packId" },
  { label: "Style Color", key: "styleColorName" },
  { label: "Issue", key: "issue" },
  { label: "Demand Units", key: "demandUnits" },
  { label: "Allocated Units", key: "allocatedUnits" },
  { label: "Affected Stores", key: "affectedStoreCount" },
  { label: "Pack Size Units", key: "packSizeUnits" },
];

// ---- store_capacity ----------------------------------------------------------
export const flattenStoreCapacityRows = (data, tabKey) => {
  const tabs = data?.content?.tabs;
  const tab = Array.isArray(tabs) ? tabs.find((t) => t.key === tabKey) : null;
  const items = tab?.rows?.items;
  if (!Array.isArray(items)) return [];

  if (tabKey === "storeInventoryHealth") {
    return items.map((row) => ({
      storeId: row.storeId ?? "",
      storeName: row.storeName ?? "",
      planId: row.planId ?? "",
      statusBadge: row.statusBadge || "",
      styleColorsTotal: row.styleColorsTotal ?? "",
      understockedCount: row.understockedCount ?? "",
      understockedPct: row.understockedPct ?? "",
      healthyCount: row.healthyCount ?? "",
      healthyPct: row.healthyPct ?? "",
      overstockedCount: row.overstockedCount ?? "",
      overstockedPct: row.overstockedPct ?? "",
    }));
  }

  return items.map((row) => ({
    storeId: row.storeId ?? "",
    storeName: row.storeName ?? "",
    planId: row.planId ?? "",
    storeStatus: row.storeStatus || "",
    fwosWeeks: row.fwosWeeks ?? "",
    capacityUnits: row.capacityUnits ?? "",
    allocatedUnits: row.allocatedUnits ?? "",
    breachPct: row.breachPct ?? "",
    unmetUnits: row.unmetUnits ?? "",
    revenueAtRisk: row.revenueAtRisk ?? "",
  }));
};

export const CAPACITY_BREACH_CSV_HEADERS = [
  { label: "Store ID", key: "storeId" },
  { label: "Store Name", key: "storeName" },
  { label: "Plan ID", key: "planId" },
  { label: "Status", key: "storeStatus" },
  { label: "FWOS Weeks", key: "fwosWeeks" },
  { label: "Capacity Units", key: "capacityUnits" },
  { label: "Allocated Units", key: "allocatedUnits" },
  { label: "Breach %", key: "breachPct" },
  { label: "Unmet Units", key: "unmetUnits" },
  { label: "Revenue At Risk", key: "revenueAtRisk" },
];

export const STORE_INVENTORY_HEALTH_CSV_HEADERS = [
  { label: "Store ID", key: "storeId" },
  { label: "Store Name", key: "storeName" },
  { label: "Plan ID", key: "planId" },
  { label: "Status", key: "statusBadge" },
  { label: "Style Colors Total", key: "styleColorsTotal" },
  { label: "Understocked Count", key: "understockedCount" },
  { label: "Understocked %", key: "understockedPct" },
  { label: "Healthy Count", key: "healthyCount" },
  { label: "Healthy %", key: "healthyPct" },
  { label: "Overstocked Count", key: "overstockedCount" },
  { label: "Overstocked %", key: "overstockedPct" },
];
