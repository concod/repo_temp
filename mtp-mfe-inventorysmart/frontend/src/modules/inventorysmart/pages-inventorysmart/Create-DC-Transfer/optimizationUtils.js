import { DC_TRANSFER_CONFIGURATION_RULE_NAME_COLUMN } from "../DC-Transfer-Configuration/constants";

const getRuleIdFromRow = (row) => {
  const ruleNameValue = row?.[DC_TRANSFER_CONFIGURATION_RULE_NAME_COLUMN];
  if (ruleNameValue && typeof ruleNameValue === "object") {
    return ruleNameValue?.value ?? ruleNameValue?.label;
  }
  return row?.rule_id ?? row?.rule_name;
};

export const calculateDcTransferOptimizationDetails = (selectedRows) => {
  if (!selectedRows?.length) {
    return {
      products: 0,
      stores: 0,
      days: 0,
      dataPoints: "-",
    };
  }

  let totalProducts = 0;
  let totalStores = 0;
  let totalDays = 0;

  selectedRows.forEach((row) => {
    totalProducts += 1;

    if (row.total_stores != null) {
      totalStores += Number(row.total_stores) || 0;
    } else if (row.total_dcs != null) {
      totalStores += Number(row.total_dcs) || 0;
    }

    const poWindow = row.destination_dc_po_window;
    if (poWindow != null && poWindow !== "") {
      totalDays += Number(poWindow) || 0;
    } else if (getRuleIdFromRow(row)) {
      totalDays += 1;
    }
  });

  const dataPoints =
    totalProducts > 0 && totalStores > 0 && totalDays > 0
      ? totalProducts * totalStores * totalDays
      : "-";

  return {
    products: totalProducts,
    stores: totalStores,
    days: totalDays,
    dataPoints,
  };
};
