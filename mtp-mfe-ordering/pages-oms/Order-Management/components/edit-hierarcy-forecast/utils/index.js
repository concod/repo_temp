const getErrorHighlightFlagForKpi = (kpi) => {
  // Checks if KPI is MOQ
  return kpi === "min_order_quantity_style";
};

export const getErrorHighlightCellStyle = (selectedKpi, params) => {
  const errorHighlightFlag = getErrorHighlightFlagForKpi(selectedKpi);

  if (!errorHighlightFlag) {
    return;
  }

  const { column, data } = params;
  const { colId } = column;
  const [columnName, _subColumnName] = colId?.split?.(".") || [];
  const weekData = data[columnName];
  const { order_quantity_eaches, adjusted, Kpi: kpi } = weekData || {};
  const orderQty = order_quantity_eaches ?? adjusted; // if order_quantity_eaches present then compare MOQ with it else with orderQty

  const areOrderQtyAndKpiNumbers =
    typeof orderQty === "number" && typeof kpi === "number";
  const isOrderQtyLessThanKpi = orderQty < kpi;

  if (areOrderQtyAndKpiNumbers && isOrderQtyLessThanKpi) {
    return {
      backgroundColor: "#F6CCCC",
    };
  }
};
