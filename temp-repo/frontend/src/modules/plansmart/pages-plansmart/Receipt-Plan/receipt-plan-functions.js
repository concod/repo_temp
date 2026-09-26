import {
  checkFormatOfNumber,
  setInputFormatForColumn,
} from "../plansmart-budget-table/budget-table-functions";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { displayRowsForReceiptPlanning } from "modules/plansmart/utils-plansmart";
import { nonEditableCell } from "core/Utils/agGrid/table-functions";
import { plansmartNonEditableCell } from "../plansmart-utility";

const calculatedKpisFormula = {
  rec_rcpt_units: "inv_required",
  rec_rcpt_aur: "bop_aur",
  rec_rcpt_auc: "bop_auc",
  rec_rcpt_dollars: "rec_rcpt_aur*rec_rcpt_units",
  rec_rcpt_cost: "rec_rcpt_auc*rec_rcpt_units",
  rec_wos: "(bop_units+rec_rcpt_units)/(qty)",
};

export const getColumns = (columnsConfig, initialKpiValues, uniqueKpis) => {
  let columns = agGridColumnFormatter(columnsConfig);
  columns.forEach((column, index) => {
    if (column.extra.is_total) {
      return Object.assign(column, {
        valueGetter: (params) => totalValueGetter(params),
      });
    }
    if (column?.column_name === "reference") {
      return Object.assign(column, {
        valueGetter: (params) => params?.data?.referenceLabel,
      });
    }
    if (column.column_name !== "kpiGroup" && column.column_name !== "KPIs") {
      return Object.assign(column, {
        valueGetter: (params) =>
          calculateKpis(params, uniqueKpis, initialKpiValues),
      });
    }
  });
  return columns;
};

const calculateKpis = (params, uniqueKpis, initialKpiValues) => {
  let rowData = params.api.getModel().gridOptionsWrapper.gridOptions.rowData;
  let column = params?.column?.colId;

  const metricWithoutBucket = params.data.metricWithoutBucket;
  const reference = params.data.reference;

  if (Object.keys(calculatedKpisFormula).includes(metricWithoutBucket)) {
    const formula = calculatedKpisFormula[metricWithoutBucket];
    if (reference === "current") {
      const splitFormula = formula
        .replace(" ", "")
        ?.split(/([\+\-\*\(\)\[\]\/])/);

      let formulaToEval = "";

      splitFormula.map((param) => {
        if (uniqueKpis.current.includes(param)) {
          const value = rowData.find((row) => {
            return row.id === param + `_current`;
          })[column];

          formulaToEval = formulaToEval.concat(value);
        } else {
          formulaToEval = formulaToEval.concat(param);
        }
      });

      const value = checkFormatOfNumber(eval(formulaToEval));
      params.data[column] = value;

      //saving values of recommended kpis to use as initial values for final kpis
      const finalKpi = metricWithoutBucket.replace("rec_", "final_");

      initialKpiValues.current = {
        ...initialKpiValues.current,
        [`${finalKpi}_current_${column}`]: value,
      };

      return value;
    } else if (reference === "variance") {
      const compareValue = rowData.find((row) => {
        return row.id === metricWithoutBucket + `_compare`;
      })[column];
      const currentValue = rowData.find((row) => {
        return row.id === metricWithoutBucket + `_current`;
      })[column];

      const value = checkFormatOfNumber(
        ((currentValue - compareValue) / compareValue) * 100
      );

      params.data[column] = value;

      return value;
    }
  }

  // finding the recommended kpi equivalent of the final kpi so that it can be searched in the kpi
  const recommendedKpi = metricWithoutBucket.replace("final_", "rec_");

  if (Object.keys(calculatedKpisFormula).includes(recommendedKpi)) {
    if (reference === "current") {
      const value =
        initialKpiValues.current[`${metricWithoutBucket}_current_${column}`];

      // removing value after setting it initially
      delete initialKpiValues.current[
        `${metricWithoutBucket}_current_${column}`
      ];
      if (value) {
        params.data[column] = value;
        return value;
      }
    }
    if (reference === "variance") {
      const compareValue = rowData.find((row) => {
        return row.id === metricWithoutBucket + `_compare`;
      })[column];
      const currentValue = rowData.find((row) => {
        return row.id === metricWithoutBucket + `_current`;
      })[column];

      const value = checkFormatOfNumber(
        ((currentValue - compareValue) / compareValue) * 100
      );

      params.data[column] = value;

      return value;
    }
  }

  return params?.data?.[column];
};

const totalValueGetter = (params) => {
  let allRowData = params.api.getModel().gridOptionsWrapper.gridOptions.rowData;

  const month = params.colDef.extra.month;
  let column = params?.column?.colId;
  const rowData = params.data;
  const metricWithoutBucket = params.data.metricWithoutBucket;

  if (rowData.reference === "variance") {
    const compareValue = allRowData.find((row) => {
      return row.id === metricWithoutBucket + `_compare`;
    })[column];
    const currentValue = allRowData.find((row) => {
      return row.id === metricWithoutBucket + `_current`;
    })[column];

    const updatedVariance = checkFormatOfNumber(
      ((currentValue - compareValue) / compareValue) * 100
    );

    params.data[column] = updatedVariance;

    return updatedVariance;
  }

  //calculating grand total
  if (params.colDef.id === "total") {
    const totalColumns = params.api.columnModel.columnDefs.filter((column) => {
      if (
        !column.extra.is_total &&
        column.column_name !== "kpiGroup" &&
        column.column_name !== "reference" &&
        column.column_name !== "KPIs"
      ) {
        return column;
      }
    });

    const grandTotalValue = totalColumns.reduce((total, column) => {
      return total + rowData[column.id];
    }, 0);

    params.data[column] = grandTotalValue;

    return grandTotalValue;
  }

  //calculating month total
  const weekColumns = params.api.columnModel.columnDefs.filter((column) => {
    if (column.extra.month === month && !column.extra.is_total) {
      return column;
    }
  });

  const totalValue = weekColumns.reduce((total, column) => {
    return total + rowData[column.id];
  }, 0);

  params.data[column] = totalValue;

  return totalValue;
};

export const updateVariance = (api, kpi, columnID, updatedValue) => {
  const varianceRowNode = api.getRowNode(`${kpi}_variance`);

  const compareValue = api.getRowNode(`${kpi}_compare`).data[columnID];
  const currentValue = updatedValue
    ? updatedValue
    : api.getRowNode(`${kpi}_current`).data[columnID];

  const value = checkFormatOfNumber(
    ((currentValue - compareValue) / compareValue) * 100
  );

  varianceRowNode.setDataValue(columnID, value);
};

export const updateCurrent = (api, kpi, columnID, updatedValue) => {
  const currentRowNode = api.getRowNode(`${kpi}_current`);

  const compareValue = api.getRowNode(`${kpi}_compare`).data[columnID];
  const varianceValue = updatedValue
    ? updatedValue
    : api.getRowNode(`${kpi}_variance`).data[columnID];

  const value = checkFormatOfNumber(
    varianceValue * (compareValue / 100) + compareValue
  );

  currentRowNode.setDataValue(columnID, value);
};

export const parseReceiptKpisGroupsData = (
  metricGroups,
  uniqueKpis,
  ref_col_mapping
) => {
  let parsedMetrics = [];
  Object.keys(metricGroups).forEach((metricGroup) => {
    parsedMetrics.push(
      ...parseReceiptKpisData(
        metricGroups[metricGroup],
        metricGroup,
        uniqueKpis,
        ref_col_mapping
      )
    );
  });

  return parsedMetrics;
};

const parseReceiptKpisData = (
  metrics,
  metricGroup,
  uniqueKpis,
  ref_col_mapping
) => {
  const parsedMetrics = [];
  Object.keys(metrics).forEach((metricKey) => {
    const referenceInfo = parseReferenceData(
      metrics[metricKey],
      metricGroup,
      metricKey,
      ref_col_mapping
    );
    if (!uniqueKpis.current.includes(metricKey)) {
      uniqueKpis.current.push(metricKey);
    }

    parsedMetrics.push(...referenceInfo);
  });
  return parsedMetrics;
};

const parseReferenceData = (
  metric,
  metricGroup,
  metricsKey,
  ref_col_mapping
) => {
  let metricData = [];

  Object.keys(metric).forEach((ref) => {
    if (displayRowsForReceiptPlanning.includes(ref)) {
      metricData.push({
        ...metric[ref],
        metricWithoutBucket: metricsKey,
        reference: ref,
        kpiGroup: metricGroup,
        referenceLabel: ref_col_mapping[ref],
        id: `${metricsKey}_${ref}`,
        KPIs: metric.label,
        initialCalc: true,
      });
    }
  });

  return metricData;
};

export const customCellRenderer = (metrics_with_formatter, params) => {
  const editableKpis = [
    "final_rcpt_units",
    "final_rcpt_dollars",
    "final_rcpt_aur",
    "final_rcpt_cost",
    "final_rcpt_auc",
    "final_wos",
  ];

  if (!editableKpis.includes(params.data.metricWithoutBucket)) {
    const column = {
      ...setInputFormatForColumn(metrics_with_formatter, params),
      is_editable: false,
    };
    return (
      plansmartNonEditableCell(column, params, metrics_with_formatter)(params) +
      " "
    );
  }
  if (params.data.reference === "compare") {
    return plansmartNonEditableCell(
      params.colDef,
      params,
      metrics_with_formatter
    )(params);
  }
};

export const editReceiptKpi = (
  _event,
  row,
  column,
  _isChanged,
  _value,
  initialValue,
  _cellData,
  uniqueKpis,
  tableRef,
  formulas
) => {
  if (!_isChanged) return;
  const api = tableRef.current.api;
  const columnID = column.colId;
  const reference = row.reference;

  const updatedKPI = row.metricWithoutBucket;

  if (reference === "variance") {
    updateCurrent(api, updatedKPI, columnID, _value);
  }

  if (reference === "current") {
    updateVariance(api, updatedKPI, columnID, _value);
  }

  const dependentKpiMap = formulas[updatedKPI];

  dependentKpiMap &&
    Object.keys(dependentKpiMap).map((dependentKpi) => {
      const formula = formulas[updatedKPI][dependentKpi];
      const rowID = dependentKpi + `_${reference}`;
      const rowNode = api.getRowNode(rowID);

      const splitFormula = formula
        .replace(" ", "")
        ?.split(/([\+\-\*\(\)\[\]\/])/);

      let formulaToEval = "";

      splitFormula.map((param) => {
        if (uniqueKpis.current.includes(param)) {
          const value = api.getRowNode(`${param}_current`).data[columnID];
          formulaToEval = formulaToEval.concat(value);
        } else {
          formulaToEval = formulaToEval.concat(param);
        }
      });
      //updating current
      const updatedValue = checkFormatOfNumber(eval(formulaToEval));
      rowNode.setDataValue(columnID, updatedValue);

      updateVariance(api, dependentKpi, columnID, updatedValue);
    });
};
