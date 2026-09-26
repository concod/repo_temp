import React, { forwardRef, useEffect } from "react";
import AgGridComponent from "core/Utils/agGrid";
import {
  columnDataHandler,
  onMultiplierChange,
  onAdjustedUserForecastChange,
} from "./helper";
import { useDispatch, useSelector } from "react-redux";
import colours from "core/Styles/colours";
import { addSnack } from "core/actions/snackbarActions";
import {
  INVALID_MULTIPLIER_VALUE,
  INVALID_ADJUSTED_USER_FORECAST_VALUE,
} from "modules/ada/constants-ada/stringContants";
import globalStyles from "core/Styles/globalStyles";
import { numberFormattingWithCommas } from "modules/ada/utils-ada/utilityFunctions";
import { removeToolPanelById } from "modules/ada/utils-ada/utilityFunctions";

const ForecastMultiplier = (props, ref) => {
  const {
    activeKey,
    columnData,
    rowData,
    historicColumnData,
    id,
    isCalledFromMFPDashboard,
    setIsMultiplierChanged,
    isAdjustedUserForecastEdited,
    isSummaryTable,
  } = props;

  const { forecastMultiplierInstance } = ref;

  const globalClasses = globalStyles();

  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );
  const [columns, setColumns] = React.useState([]);

  useEffect(() => {
    if (!columnData?.length) return;

    const newColumns = columnDataHandler(
      columnData,
      historicColumnData,
      forecastMultiplierInstance?.current?.api?.getColumnState?.() // optional: fetch current column state
    );

    setColumns(newColumns);

    if (forecastMultiplierInstance?.current?.api) {
      forecastMultiplierInstance?.current?.api.setColumnDefs(newColumns);
    }
  }, [columnData, historicColumnData]);

  const dispatch = useDispatch();

  const loadTableInstance = (params) => {
    forecastMultiplierInstance.current = params;
  };

  const multiplier_tooltip =
    adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
      ?.isMultiplierRoundOff;

  const multiplierDecimalToShow =
    adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
      ?.decimalConfig?.multiplier;

  const isMultiplierRoundOff =
    adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
      ?.isMultiplierRoundOff;

  const forecastMultiplierTableRoundOff =
    adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
      ?.decimalConfig?.ForecastMultiplier;

  const adjustedForecastHiddden =
    adaReducer?.clientConfig?.attribute_value?.show_features
      ?.show_ia_adjusted_forecast === false;

  const enableCommaFormatting =
    adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
      ?.numberFormatting?.enableCommaFormatting === true;

  const actualsRoundoff =
    adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
      ?.decimalConfig?.actuals;
  const customActualsLabel =
    adaReducer?.clientConfig?.attribute_value?.show_features
      ?.custom_actuals_label || "Actuals";

  const onForecastMultiplierValueChange = (_, row, column, isChanged) => {
    if (!isChanged) return;

    if (row?.row === "adjusted_forecast") {
      let updatedRow = JSON.parse(JSON.stringify(row));
      let isMultiplierReset = false;
      if (row[column.colId] < 0) {
        updatedRow[column.colId] = 1;
        isMultiplierReset = true;
        dispatch(
          addSnack({
            message: INVALID_ADJUSTED_USER_FORECAST_VALUE,
            options: {
              variant: "info",
            },
          })
        );
      }
      onAdjustedUserForecastChange(
        updatedRow,
        column,
        forecastMultiplierInstance,
        id,
        dispatch,
        isMultiplierReset
      );
    }
    if (row?.row === "multiplier") {
      let updatedRow = JSON.parse(JSON.stringify(row));
      let isMultiplierReset = false;
      if (row[column.colId] < 0) {
        updatedRow[column.colId] = 1;
        isMultiplierReset = true;
        dispatch(
          addSnack({
            message: INVALID_MULTIPLIER_VALUE,
            options: {
              variant: "info",
            },
          })
        );
      }

      onMultiplierChange(
        updatedRow,
        column,
        forecastMultiplierInstance,
        id,
        dispatch,
        isMultiplierReset
      );
    }
    setIsMultiplierChanged((prev) => prev + 1);
  };

  const getRowStyle = (params) => {
    if (
      isAdjustedUserForecastEdited
        ? params?.data?.row !== "multiplier" &&
          params?.data?.row !== "adjusted_forecast"
        : params?.data?.row !== "multiplier" || isCalledFromMFPDashboard
    ) {
      if (multiplier_tooltip) {
        return { background: colours.alabaster };
      } else {
        return { background: colours.alabaster, pointerEvents: "none" };
      }
    }
  };

  function doesExternalFilterPass(node) {
    return node.data.row === "forecast" && adjustedForecastHiddden
      ? false
      : true;
  }

  function isExternalFilterPresent() {
    return true;
  }

  function checkIfCellIsDisabled(cellProps) {
    const column_name = cellProps?.colDef?.id;
    if (column_name === "forecast_multiplier") return false;

    if (cellProps?.colDef?.disabled) return false;

    const predictedColumnNames = adaReducer?.xAxisStaticDates?.fiscal_ids || [];
    if (
      predictedColumnNames?.includes(column_name) ||
      predictedColumnNames?.includes(+column_name)
    ) {
      if (
        cellProps?.data?.row === "multiplier" ||
        (isAdjustedUserForecastEdited &&
          cellProps?.data?.row === "adjusted_forecast")
      ) {
        return false;
      }
      return true;
    }
    return true;
  }

  const getRoundOffValue = (val) => {
    if (val === "roundOff") {
      return 0;
    } else if (val === "roundOfftoOneDecimals") {
      return 1;
    } else if (val === "roundOfftoTwoDecimals") {
      return 2;
    } else if (val === "roundOfftoThreeDecimals") {
      return 3;
    }
    return 0;
  };

  function renderCells(cellProps, globalClasses) {
    const formatter = cellProps.colDef.formatter;
    let roundOffValue;
    if (cellProps.colDef.formatter == "") {
      roundOffValue =
        adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
          ?.decimalConfig?.ForecastMultiplier;
    } else {
      roundOffValue = getRoundOffValue(formatter);
    }

    let isIAZero = false;

    let columnId = cellProps?.colDef?.id;
    let row = cellProps?.data?.row;

    forecastMultiplierInstance?.current?.api?.forEachNode((node) => {
      if (
        row === "multiplier" &&
        node.data.row === "forecast" &&
        node.data[columnId] === 0
      ) {
        isIAZero = true;
      }
    });

    const isEmpty =
      cellProps?.value === null ||
      cellProps?.value === undefined ||
      cellProps?.value === "-" ||
      isIAZero;

    // for empty cells
    if (isEmpty) {
      cellProps.column.getColDef().tooltipValueGetter = (params) => {
        if (!params.value) {
          return "";
        }
        return Number(params.value).toFixed(2);
      };
      return (
        <div
          style={{
            height: "100%",
            width: "100%",
          }}
        >
          <div
            style={{
              height: "100%",
              width: "100%",
              cursor: "default",
              pointerEvents: "auto",
              textAlign: "right",
            }}
          >
            -
          </div>
        </div>
      );
    }

    // for disabled  cells
    if (
      (typeof cellProps.colDef.disabled === "function" &&
        cellProps.colDef.disabled(cellProps.data, cellProps.colDef)) ||
      cellProps.colDef.disabled === true
    ) {
      return (
        <div>{numberFormattingWithCommas(cellProps.value, roundOffValue)}</div>
      );
    }

    if (isSummaryTable && cellProps.colDef.id !== "forecast_multiplier") {
      return (
        <div>{numberFormattingWithCommas(cellProps.value, roundOffValue)}</div>
      );
    }

    return null;
  }

  return (
    <>
      <AgGridComponent
        onFirstDataRender={(params) => {
          removeToolPanelById(params.api, "format-columns");
        }}
        minWidth={200}
        rowdata={rowData}
        loadTableInstance={loadTableInstance}
        sizeColumnsToFitFlag
        showSearchModalBtn={false}
        columns={columns}
        uniqueRowId={"row"}
        pagination={false}
        onBlur={onForecastMultiplierValueChange}
        key={activeKey}
        getRowStyle={getRowStyle}
        isExternalFilterPresent={isExternalFilterPresent}
        doesExternalFilterPass={doesExternalFilterPass}
        defaultTextFieldViewOnly={enableCommaFormatting}
        customCellRenderer={(cellProps) => {
          // adding this customCellRenderer for making multiplier roundoff value different from other rows in forecast multiplier table
          if (isMultiplierRoundOff) {
            if (cellProps?.data?.row === "multiplier") {
              cellProps.data.roundOffTo = multiplierDecimalToShow;
            }
          }

          const renderedCell = renderCells(cellProps, globalClasses);
          if (renderedCell) return renderedCell;

          // actuals needs to shown as whole number for VS
          if (
            cellProps.colDef.id !== "forecast_multiplier" &&
            typeof actualsRoundoff === "number" &&
            (cellProps?.data?.row === "Last year Actuals" ||
              cellProps?.data?.row === customActualsLabel)
          ) {
            return (
              <p
                className={globalClasses.fakeInputStyle}
                style={{
                  background: colours.gallery,
                  pointerEvents: "none",
                  border: "none",
                }}
              >
                {numberFormattingWithCommas(cellProps?.value, actualsRoundoff)}
              </p>
            );
          }
        }}
      />
    </>
  );
};

export default forwardRef(ForecastMultiplier);
