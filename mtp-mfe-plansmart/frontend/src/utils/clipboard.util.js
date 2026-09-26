import { get } from "lodash";
import { editableValidation } from "../components/planSmart/CellRenderer/cellRenderer.util";
import { budgetTableCopyPasteApi } from "../pages/PlanningScreen/components/BudgetTable/apis/budgetTable.api";
import handleVarianceChange from "../pages/PlanningScreen/budgetTableCalculation/handleVarianceChange.util";
import isVarianceChanged from "../pages/PlanningScreen/budgetTableCalculation/common/isVarianceChanged.util";
import { addSnack } from "actions/snackbarActions";
import { SNACK_VARIANT } from "constants/toast.constant";
import { INVALID_PASTE_ERROR } from "./constants";
import { handleApiResponse } from "../pages/PlanningScreen/components/BudgetTable/budgetTable.util";

const processClipboardValues = ({
  tableRef,
  params: clipboardParams,
  clipboardStaticParams: {
    planKpiConfig,
    currentVersion,
    valueByColumnValueKey,
    varianceList,
    varianceMapping,
    editMode,
    planActualizedWeeks,
    planDetails,
    tableRowDataRef,
    lockedCellRef
  },
  calculationUUID,
  dispatch,
  rowDataInxMapping
}) => {
  //Number format of copied details
  const sourceCellDetails = clipboardParams.data.map((row) =>
    row?.map((copyValue) => Number(copyValue.replace(/[^0-9.-]+/g, "")))
  );

  const copyPastePayload = [];

  //Table rows details
  const tableRowsData = clipboardParams?.api?.rowModel?.rowsToDisplay;

  const visibleColumns = tableRef.current.columnApi.getAllDisplayedColumns();

  //Selected cell details
  const destinationCellRangeDetail = clipboardParams?.api?.getCellRanges()[0];
  const destinationRows = tableRowsData?.slice(
    destinationCellRangeDetail?.startRow?.rowIndex,
    destinationCellRangeDetail?.endRow?.rowIndex + 1
  );
  const selectedColumns = destinationCellRangeDetail?.columns;

  //find index of the selected column from visible columns
  const selectedColumnsStartIndex = visibleColumns.findIndex(
    (column) => column.colDef.accessor === selectedColumns[0].colDef.accessor
  );

  const destinationColumns = visibleColumns.slice(
    selectedColumnsStartIndex,
    selectedColumnsStartIndex + sourceCellDetails[0].length
  );

  destinationRows.forEach((selectedRow, selectedRowIndex) => {
    const rowIndex = get(selectedRow, "data.index", -1);

    destinationColumns.forEach((selectedColumn, columnIndex) => {
      const params = {
        colDef: selectedColumn.colDef,
        data: selectedRow.data,
        editMode,
        varianceList,
        valueByColumnValueKey,
        varianceMapping,
        planActualizedWeeks,
        planDetails
      };

      const metricKey = get(selectedRow, "data.metric_key", "");
      const kpiConfig = get(planKpiConfig, metricKey);

      const { shouldRenderInputCell, displayStaticValue } = editableValidation(
        params,
        kpiConfig,
        {
          currentVersion
        }
      );

      const isContributionCol = get(
        selectedColumn.colDef,
        "extra.contribution",
        false
      );

      if (shouldRenderInputCell && !displayStaticValue && !isContributionCol) {
        const updatedValue = sourceCellDetails[selectedRowIndex]?.[columnIndex];

        const context = {
          varianceList: varianceList,
          changedCellData: {
            user_entered_value: updatedValue
          },
          changedRow: selectedRow.data,
          rowDataInxMapping: rowDataInxMapping,
          valueByColumnValueKey: valueByColumnValueKey,
          changedColumnDef: selectedColumn?.colDef,
          rowData: get(tableRowDataRef, "current", []) || [],
          varianceMapping: varianceMapping,
          currentVersion: currentVersion,
          initialRowData: get(tableRowDataRef, "current", []) || []
        };

        const isVariance = isVarianceChanged.call(context, {
          row: selectedRow.data
        });

        const payload = {
          columnId: selectedColumn?.colDef?.accessor,
          planCode: planDetails?.plan_code,
          module: "pre-season",
          lockedCells: lockedCellRef.current,
          trackBudgetTableChanges: [],
          columnDefs: [],
          session_id: calculationUUID
        };

        if (isVariance) {
          const {
            changedRowInx,
            changedCellData
          } = handleVarianceChange.call(context, { calcOnServer: true });

          payload.changedRowInx = changedRowInx;
          payload.changedCellData = changedCellData;
        } else {
          payload.changedRowInx = rowIndex;
          payload.changedCellData = {
            user_entered_value: updatedValue
          };
        }

        copyPastePayload.push(payload);
      }
    });
  });
  const tableRows = get(tableRowDataRef, "current", []) || [];

  if (copyPastePayload.length === 0) {
    dispatch(
      addSnack({
        message: INVALID_PASTE_ERROR,
        options: {
          variant: SNACK_VARIANT.ERROR
        }
      })
    );

    handleApiResponse({
      result: {},
      tableRows,
      tableRef,
      dispatch
    });
    return;
  }

  const payload = {
    pastePayload: copyPastePayload,
    planCode: planDetails.plan_code
  };

  budgetTableCopyPasteApi(payload, {
    tableRowDataRef,
    tableRef,
    tableRows,
    dispatch
  });
};

export const processCopiedData = ({
  params,
  planKpiConfig,
  varianceMapping
}) => {
  const metricKey = get(params, "node.data.metric_key", "");
  const version = get(params, "node.data.plan_version", "");
  const kpiConfig = get(planKpiConfig, metricKey, {});

  const symbol = kpiConfig.symbol || "";
  const isVariance = varianceMapping.hasOwnProperty(version);

  if (typeof params.value === "number") {
    if (isVariance) return `${params.value}%`;
    return symbol === "%"
      ? `${params.value}${symbol}`
      : `${symbol}${params.value}`;
  }

  return "";
};

export default processClipboardValues;
