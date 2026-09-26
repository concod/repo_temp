/** Budget hierarchy badge colours — mirrors HighLevelSummaryTable.jsx */
export function getBadgeSxForBudgetHierarchy(budgetHierarchy) {
  const value = budgetHierarchy != null ? String(budgetHierarchy).trim() : "";
  if (value.toLowerCase() === "mixed") {
    return {
      background: "#EDF7F8 !important",
      "& .MuiChip-label": { color: "#3B898D !important" },
    };
  }
  if (value.toUpperCase() === "NA") {
    return {
      background: "#F2F3F4 !important",
      "& .MuiChip-label": { color: "#5F6673 !important" },
    };
  }
  return {
    background: "#F6EDFD !important",
    "& .MuiChip-label": { color: "#931CE3 !important" },
  };
}
