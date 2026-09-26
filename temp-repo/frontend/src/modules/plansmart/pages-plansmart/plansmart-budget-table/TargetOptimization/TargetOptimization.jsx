import React, { useEffect, useState, useRef } from "react";
import { connect } from "react-redux";
import { cloneDeep } from "lodash";

import { Box, Button, Drawer, IconButton, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import makeStyles from "@mui/styles/makeStyles";
import globalStyles from "core/Styles/globalStyles";
import colours from "core/Styles/colours";
import clsx from "clsx";

import LoadingOverlay from "core/Utils/Loader/loader";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import CellRenderer from "core/Utils/agGrid/cellRenderer";

import { isWeekNumber } from "modules/plansmart/utils-plansmart/ConstantFunctions";
import { decimalsFormatter } from "core/Utils/formatter";
import { pxToRem } from "core/Utils/functions/utils";

import {
  fetchPlanningScreenRecalculateTableColDef,
  recalculateTableColDefSelector,
  recalculateTableColDefLoaderSelector,
} from "modules/plansmart/services-plansmart/BudgetPlanTable/budget-plan-table-service";

import { checkFormatOfNumber } from "../budget-table-functions";

import { ACCESSORS, TARGET_OPTIMIZATION_CONSTS } from "../constants";

const TargetOptimization = (props) => {
  const {
    isOpen,
    onClose,
    agTableRef,
    addSnack,
    disableAllOptions,
    filtersForRows,
    pivotViewMode,
    planBudgetData,
    planDetails,
    updateConstraintFilterReq,
    viewMode,
    recalculateTableColDef,
    recalculateTableColDefLoader,
    fetchRecalculateTableColDefReq,
  } = props;
  const classes = useStyles();
  const globalClasses = globalStyles();

  const recalculateTableInstance = useRef([]);
  const [formData, setFormData] = useState(
    props.defaultData ? props.defaultData : {}
  );
  const [targetData, setTargetData] = useState();
  const [recalculateLoader, setRecalculateLoader] = useState(false);
  const [isSourceChanged, setIsSourceChanged] = useState(false);
  const [isForecastValuesPresent, setIsForecastValuesPresent] = useState(false);

  const [columns, setColumns] = useState([]);
  const [rowData, setRowData] = useState([
    {
      empty: "",
      parameters: TARGET_OPTIMIZATION_CONSTS.TABLE_ROW_HEADER_1,
      priority: 1,
      targetValue: 0,
      thresholdPercValue: 0,
      uniqueId: "margin",
    },
    {
      empty: "",
      parameters: TARGET_OPTIMIZATION_CONSTS.TABLE_ROW_HEADER_2,
      priority: 2,
      targetValue: 0,
      thresholdPercValue: 0,
      uniqueId: "revenue_growth",
    },
  ]);

  const init = () => {
    const allColumns = agTableRef.current?.columnApi?.columnModel?.gridColumns;
    let fcstTotalSalesTotal = 0;
    let fcstTotalMarginTotal = 0;
    let lyTotalSalesTotal = 0;

    if (!planBudgetData || planBudgetData?.length === 0) return;
    const [fcstTotalSales] = planBudgetData?.filter(
      (metricData) =>
        metricData?.reference === "forcasted" &&
        metricData?.metric === "total_sales"
    );
    const [fcstTotalMargin] = planBudgetData?.filter(
      (metricData) =>
        metricData?.reference === "forcasted" &&
        metricData?.metric === "total_margin"
    );
    if (!fcstTotalSales || !fcstTotalMargin || !allColumns) {
      setIsForecastValuesPresent(false);
      return;
    } else {
      setIsForecastValuesPresent(true);
    }
    const [lyTotalSales = {}] = planBudgetData?.filter(
      (metricData) =>
        metricData?.reference === "compare" &&
        metricData?.metric === "total_sales"
    );
    const lyTotalSalesNode = agTableRef.current?.api.getRowNode(
      lyTotalSales?.uniqueId
    );
    const fcstTotalSalesNode = agTableRef.current?.api.getRowNode(
      fcstTotalSales?.uniqueId
    );
    const fcstTotalMarginNode = agTableRef.current?.api.getRowNode(
      fcstTotalMargin?.uniqueId
    );

    const lyTotalSalesGrandTotal = agTableRef.current?.api?.getValue(
      "total",
      lyTotalSalesNode
    );

    allColumns?.forEach((column) => {
      if (isWeekNumber(column.colId)) {
        const lyTotalSalesValue = agTableRef.current?.api?.getValue(
          column.colId,
          lyTotalSalesNode
        );
        const fcstTotalSalesValue = agTableRef.current?.api?.getValue(
          column.colId,
          fcstTotalSalesNode
        );
        const fcstTotalMarginValue = agTableRef.current?.api?.getValue(
          column.colId,
          fcstTotalMarginNode
        );

        lyTotalSalesTotal = lyTotalSalesValue + lyTotalSalesTotal;
        fcstTotalSalesTotal = fcstTotalSalesValue + fcstTotalSalesTotal;
        fcstTotalMarginTotal = fcstTotalMarginValue + fcstTotalMarginTotal;
      }
    });
    setRowData([
      {
        empty: "",
        parameters: TARGET_OPTIMIZATION_CONSTS.TABLE_ROW_HEADER_1,
        priority: 1,
        targetValue: decimalsFormatter(
          {
            value: (fcstTotalMarginTotal / fcstTotalSalesTotal) * 100,
            is_negative_value_allowed: true,
          },
          2
        ),
        thresholdPercValue: 0,
        uniqueId: "margin",
      },
      {
        empty: "",
        parameters: TARGET_OPTIMIZATION_CONSTS.TABLE_ROW_HEADER_2,
        priority: 2,
        targetValue: decimalsFormatter(
          {
            value:
              ((fcstTotalSalesTotal - lyTotalSalesTotal) / lyTotalSalesTotal) *
              100,
            is_negative_value_allowed: true,
          },
          2
        ),
        thresholdPercValue: 0,
        uniqueId: "revenue_growth",
      },
    ]);
    setTargetData({
      gross_margin_per: checkFormatOfNumber(
        fcstTotalMarginTotal / fcstTotalSalesTotal
      ),
      revenue_growth_per: checkFormatOfNumber(
        (fcstTotalSalesTotal - lyTotalSalesTotal) / lyTotalSalesTotal
      ),
      eop_variance: 0,
      revenue_total: lyTotalSalesGrandTotal,
    });
  };

  useEffect(() => {
    if (recalculateTableColDef.length > 0) {
      const dragColumn = [
        {
          header: "",
          rowDrag: true,
          column_name: "empty",
          width: 10,
        },
      ];
      setColumns(
        agGridColumnFormatter(
          dragColumn.concat(cloneDeep(recalculateTableColDef))
        )
      );
    }
  }, [recalculateTableColDef]);

  useEffect(() => {
    if (isOpen) {
      fetchRecalculateTableColDefReq();
      init();
    }
  }, [isOpen]);

  useEffect(() => {
    const obj = {
      gross_margin_per:
        "" +
        decimalsFormatter({ value: targetData?.gross_margin_per * 100 }, 2),
      revenue_growth_per:
        "" +
        decimalsFormatter(
          {
            value: targetData?.revenue_growth_per * 100,
            is_negative_value_allowed: true,
          },
          2
        ),
      eop_variance:
        "" +
        decimalsFormatter(
          {
            value: targetData?.eop_variance * 100,
            is_negative_value_allowed: true,
          },
          2
        ),
      revenue_total:
        "" +
        decimalsFormatter({
          value: targetData?.revenue_total,
        }),
    };

    setFormData(obj);
  }, [targetData]);

  useEffect(() => {
    if (!isForecastValuesPresent) {
      setTargetData(null);
    }
  }, [isForecastValuesPresent]);

  const onRowDragMove = () => {
    recalculateTableInstance?.current?.api?.rowModel?.rowsToDisplay.forEach(
      (rowVal) => {
        rowVal.data.priority = rowVal.rowIndex + 1;

        if (
          rowVal.data.uniqueId === TARGET_OPTIMIZATION_CONSTS.MARGIN &&
          !isSourceChanged
        ) {
          setIsSourceChanged(rowVal.rowIndex + 1 > 1);
        }
      }
    );
    recalculateTableInstance.current.api.refreshCells({
      force: true,
    });
  };

  const loadTableInstance = (params) => {
    recalculateTableInstance.current = params;
  };

  const getTargetConstraintList = () => {
    const list = [];

    recalculateTableInstance?.current?.api?.rowModel?.rowsToDisplay.forEach(
      (rowDetails) => {
        list.push({
          filter_type: "non-cascaded",
          attribute_name: ACCESSORS[rowDetails?.data?.uniqueId],
          operator: "in",
          priority: rowDetails?.data?.priority,
          thresholdValues: ACCESSORS[rowDetails?.data?.uniqueId]
            ? [rowDetails?.data?.thresholdPercValue / 100]
            : [],
          values: ACCESSORS[rowDetails?.data?.uniqueId]
            ? [parseFloat(rowDetails?.data?.targetValue) / 100]
            : [],
        });
      }
    );

    return list;
  };

  const isRecalculateOptionDisabled = () => {
    if (
      disableAllOptions ||
      viewMode ||
      !targetData ||
      !isForecastValuesPresent
    ) {
      return true;
    }
  };

  const isEditingSourceModified = () => {
    let isSourceModified = false;
    const updatedValues = getTargetConstraintList();

    if (updatedValues.length > 0) {
      updatedValues.forEach((field) => {
        if (!isSourceModified) {
          isSourceModified =
            decimalsFormatter(
              {
                value: field?.values[0] * 100,
                is_negative_value_allowed: true,
              },
              2
            ) !== Number(formData[field.attribute_name]);
        }
      });
    }

    setIsSourceChanged(isSourceModified);
  };

  const onCellValueChanged = (params) => {
    const {
      colDef: { accessor },
      newValue,
    } = params;

    if (accessor === TARGET_OPTIMIZATION_CONSTS.THRESHOLD_PERC) {
      setIsSourceChanged(newValue !== 0);
    } else {
      if (newValue) {
        isEditingSourceModified();
      }
    }
  };

  const handleRecalculate = async () => {
    setRecalculateLoader(true);

    try {
      const targetConstraintList = getTargetConstraintList();

      const productHierarchyFilters = [];
      Object.keys(filtersForRows).map((tabKey) => {
        if (filtersForRows[tabKey] && filtersForRows[tabKey].length > 0) {
          productHierarchyFilters.push({
            filter_type: "non-cascaded",
            operator: "in",
            attribute_name: tabKey,
            values: filtersForRows[tabKey],
          });
        }
      });
      const totalFilter = [
        {
          filter_type: "non-cascaded",
          operator: "in",
          attribute_name: ACCESSORS["eop"],
          values: [targetData[ACCESSORS["eop"]]],
        },
        {
          filter_type: "non-cascaded",
          operator: "in",
          attribute_name: ACCESSORS["revenueTotal"],
          values: [targetData[ACCESSORS["revenueTotal"]]],
        },
      ];
      const reqBody = {
        filters: productHierarchyFilters
          .concat(targetConstraintList)
          .concat(totalFilter),
      };

      const updateConstraintFilterResp = await updateConstraintFilterReq(
        planDetails?.plan_code,
        reqBody
      );
      if (updateConstraintFilterResp.data.status) {
        addSnack({
          message: "Recalculated Successfully",
          options: {
            variant: "success",
          },
        });
        setRecalculateLoader(false);
        setIsSourceChanged(false);
      } else {
        addSnack({
          message:
            "Recalculation initiated, We will notify you once it is successful",
          options: {
            variant: "info",
          },
        });
        setRecalculateLoader(false);
        setIsSourceChanged(false);
      }
    } catch (err) {
      addSnack({
        message: "Something went wrong while recalculate",
        options: {
          variant: "error",
        },
      });
      setRecalculateLoader(false);
    }
  };

  const handleClose = () => {
    setIsSourceChanged(false);
    onClose();
  };

  return (
    <Drawer
      open={isOpen}
      anchor="right"
      variant="permanent"
      className={clsx(classes.drawer, {
        [classes.drawerOpen]: isOpen,
        [globalClasses.zeroWidth]: !isOpen,
      })}
      classes={{
        paper: clsx(
          {
            [classes.drawerOpen]: isOpen,
            [globalClasses.zeroWidth]: !isOpen,
          },
          classes.drawer
        ),
      }}
    >
      <LoadingOverlay
        loader={recalculateTableColDefLoader || recalculateLoader}
      >
        <div className={classes.header}>
          <Typography
            color={colours.black}
            sx={{
              fontWeight: 600,
              fontSize: "0.875rem",
            }}
            variant="body1"
          >
            {TARGET_OPTIMIZATION_CONSTS.RECALCULATE_HEADER}
          </Typography>
          <IconButton aria-label="close" onClick={handleClose}>
            <CloseIcon />
          </IconButton>
        </div>
        <div className={classes.body}>
          <Typography
            color={colours.black}
            sx={{
              fontWeight: 600,
              fontSize: "0.875rem",
            }}
            variant="body1"
          >
            {TARGET_OPTIMIZATION_CONSTS.SET_PARAMETERS_HEADER}
          </Typography>

          <Box mt={2} mb={2}>
            {!pivotViewMode && !recalculateTableColDefLoader && (
              <AgGridComponent
                rowdata={rowData}
                columns={columns}
                pagination={false}
                sideBar={false}
                rowDragManaged={true}
                animateRows={true}
                onCellValueChanged={onCellValueChanged}
                onRowDragMove={onRowDragMove}
                customCellRenderer={(cellProps) => {
                  return (
                    <CellRenderer
                      cellData={cellProps}
                      column={{
                        ...cellProps.column,
                        type: "percentage",
                        disabled:
                          !targetData ||
                          disableAllOptions ||
                          viewMode ||
                          !isForecastValuesPresent,
                      }}
                    />
                  );
                }}
                loadTableInstance={loadTableInstance}
                uniqueRowId={"uniqueId"}
              />
            )}
            {!pivotViewMode &&
              !isForecastValuesPresent &&
              !recalculateTableColDefLoader && (
                <span className={classes.forecastError}>
                  {TARGET_OPTIMIZATION_CONSTS.IAF_VERSION_ERROR}
                </span>
              )}
          </Box>
        </div>

        <div className={classes.footer}>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            variant="contained"
            disabled={isRecalculateOptionDisabled() || !isSourceChanged}
            onClick={handleRecalculate}
          >
            Recalculate
          </Button>
        </div>
      </LoadingOverlay>
    </Drawer>
  );
};

const mapState = (state) => {
  return {
    recalculateTableColDef: recalculateTableColDefSelector(state),
    recalculateTableColDefLoader: recalculateTableColDefLoaderSelector(state),
  };
};

const mapDispatch = (dispatch) => {
  return {
    fetchRecalculateTableColDefReq: () =>
      dispatch(fetchPlanningScreenRecalculateTableColDef()),
  };
};

export default connect(mapState, mapDispatch)(TargetOptimization);

const useStyles = makeStyles((theme) => ({
  drawer: {
    flexShrink: 0,
    whiteSpace: "nowrap",
    backgroundColor: theme.palette.common.white,
  },
  drawerOpen: {
    width: 886,
    height: "calc(100% - 105px)",
    right: 50,
    top: 105,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    padding: `${pxToRem(12)} ${pxToRem(20)}`,
    borderBottom: "1px solid #EFEFEF",
    alignItems: "center",
    fontWeight: 600,
    height: 40,
  },
  footer: {
    display: "flex",
    justifyContent: "flex-end",
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: colours.catskillWhite,
    width: "100%",
    padding: `${pxToRem(12)} ${pxToRem(20)}`,
  },
  body: {
    marginTop: "0.75rem",
    padding: `${pxToRem(12)} ${pxToRem(20)}`,
  },
  forecastError: {
    color: theme.palette.error.main,
    marginTop: pxToRem(4),
  },
}));

//TO: DEFAULT FORECAST
// useEffect(() => {
//   recalculateTableInstance?.current?.api?.rowModel?.rowsToDisplay.forEach(
//     (rowVal) => {
//       rowVal.data.priority = defaultForecastToggled
//         ? "-"
//         : rowVal.rowIndex + 1;
//       rowVal.data.targetValue = defaultForecastToggled ? "-" : "";
//       rowVal.data.thresholdPercValue = defaultForecastToggled ? "-" : "";
//     }
//   );
//   recalculateTableInstance?.current?.api?.refreshCells({
//     force: true,
//   });
// }, [defaultForecastToggled]);
{
  /* 
//TO: DEFAULT FORECAST
<FormControlLabel
    style={{ marginLeft: "4px" }}
    control={
      <Switch
        checked={defaultForecastToggled}
        onChange={() =>
          setDefaultForecastToggled(!defaultForecastToggled)
        }
      />
    }
    label="Set as default forecast"
    labelPlacement="start"
  /> 
*/
}

//TO: DEFAULT FORECAST
// const [defaultForecastToggled, setDefaultForecastToggled] = useState(false);
