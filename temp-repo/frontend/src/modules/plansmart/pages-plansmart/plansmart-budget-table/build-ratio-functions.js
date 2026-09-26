import { common } from "../../constants-plansmart/stringConstants";
import { checkFormatOfNumber } from "./budget-table-functions";
const dependencyKpiMap = {
    dollar_build_ratio : "sales",
    qty_build_ratio: "qty"

}
export const calculateBuildRatio = (metric, params) => {
  let dependencyKpi = dependencyKpiMap[metric];
  const bucket = params.data.bucketKey;
  const reference = params.data.reference;
  const rowData = params.api.getModel().gridOptionsWrapper.gridOptions.rowData;
  let dependencyKpiData = rowData.filter(
    (m) =>
      m.metric === `${bucket}_${dependencyKpi}` && m.reference === reference
  )[0];
  let isTotal = params.column.colDef.extra.is_total;
  if (!isTotal) {
    return (
      checkFormatOfNumber(( dependencyKpiData[params.column.colId] /
        dependencyKpiData[params.column.colId - 1] || 0) * 100)
    );
  } else if (params.column.colDef.extra.month) {
    const months = common.__MonthList;
    const prevMonth =
      months[
        months.findIndex(
          (m) => m.toLowerCase() === params.column.colDef.extra.month
        ) - 1
      ];

    const prevMonthTotal = `${params.column.colDef.extra.year}_${prevMonth}_Total`;
    return (
      checkFormatOfNumber((dependencyKpiData[params.column.colId] /
        dependencyKpiData[prevMonthTotal] || 0) * 100)
    );
  }
};
