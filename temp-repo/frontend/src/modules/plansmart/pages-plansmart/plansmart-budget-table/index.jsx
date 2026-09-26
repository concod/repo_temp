import React, { useRef, useEffect } from "react";
import { connect } from "react-redux";
import { Box, Chip, Stack } from "@mui/material";
import AgGridComponent from "core/Utils/agGrid";
import get from "lodash/get";
import {
  noEditableCustomCellRender,
  customCellRenderer,
  lockCellApi,
  lockCellCustomConditionFn,
  onChangeCalculation,
  setInputFormatForColumn,
  fetchMetricsFormulaForEditableMetrics,
  editableFormulas,
  getRowsOpenByDefaultCustomFunction,
} from "./budget-table-functions";
import { gridOptions } from "modules/plansmart/BudgetTableColDef";
import "ag-grid-enterprise";
import AddHideMetrics from "./ShowHideMetrics";
import PivotView from "./PivotView";
import { withRouter } from "react-router";
import { cloneDeep, omit, round } from "lodash";
import {
  getColumnExtra,
  getFlattenColumn,
} from "modules/plansmart/utils-plansmart/ConstantFunctions";
import {
  PRE_SEASON_STATUS_CODES,
  plan_stage,
  webWorkerColOmitObjList,
} from "modules/plansmart/constants-plansmart/stringConstants";
import colours from "core/Styles/colours";
import { customTabFunction } from "modules/plansmart/utils-plansmart";
import { planSmartMetricConfigSelector } from "modules/plansmart/services-plansmart/BudgetPlanTable/budget-plan-table-service";
import { plansmartBudgetTableInputValidation } from "../plansmart-utility";

const RemovePlan = ({ comparePlanList, handleRemoveVersion }) => {
  return (
    <Box p={2}>
      <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
        {comparePlanList.map((data) => (
          <Chip label={data.name} onDelete={() => handleRemoveVersion(data)} />
        ))}
      </Stack>
    </Box>
  );
};

const PlanSmartBudgetTable = (props) => {
  let {
    planBudgetData,
    planBudgetColumns,
    setBudgetTableRef,
    prevSelectedPlans,
    comparePlanTableData,
    handleRemoveVersion,
    showSnackMessage,
    setHiddenMetrics,
    hiddenMetrics,
    skuViewMode,
    pivotViewMode,
    payloadUpdateBudgetTable,
    setPayloadUpdateBudgetTable,
    tabData,
    filtersForRows,
    planCode,
    editableMetricFormulas,
    setPlansmartBudgetTableLoader,
    planDetails,
    weekLevelKeys,
    trackColHidden,
    setTrackColHidden,
    bucket_keys,
    setStackOfInstances,
    stackOfInstances,
    currIdxForStack,
    setCurIdxStack,
    bucketSelection,
    calculationWorker,
    plansmartConfigs,
    setPlanBudgetData,
    payloadUpdateBudgetTableRef,
    onFirstDataRender,
    isMonthView,
    agTableRef,
    planSmartBudgetUpdateLoader,
    plansmartBudgetTableLoader,
    kpiListSkipDependentEditableFlow,
    lastActiveCell,
    setLastActiveCell,
  } = props;

  useEffect(() => {
    if (setBudgetTableRef) setBudgetTableRef(agTableRef);
  }, [agTableRef?.current]);

  useEffect(() => {
    if (!skuViewMode) {
      let instances = stackOfInstances;
      // This condition to update the stack with initial budget table data if stack is empty
      if (
        !plansmartBudgetTableLoader &&
        !planSmartBudgetUpdateLoader &&
        instances.length === 0 &&
        planBudgetData?.length > 0
      ) {
        instances.push(cloneDeep(planBudgetData));
        setStackOfInstances([...instances]);

        if (Object.keys(lastActiveCell || {}).length > 0) {
          setTimeout(() => {
            agTableRef?.current?.api?.ensureIndexVisible(
              lastActiveCell?.rowIndex + 1,
              "top"
            );
            agTableRef?.current?.api?.ensureColumnVisible(
              lastActiveCell?.column?.colId,
              "middle"
            );
            agTableRef?.current?.api?.setFocusedCell(
              lastActiveCell?.rowIndex,
              lastActiveCell?.column?.colId
            );
            setLastActiveCell({});
          }, [1000]);
        }
      }
    }
  }, [planBudgetData, planSmartBudgetUpdateLoader, plansmartBudgetTableLoader]);

  function isExternalFilterPresent() {
    return true;
  }

  function doesExternalFilterPass(node) {
    let isHidden = node.data.hide || node.data.hideReference;
    if (bucketSelection) {
      isHidden = isHidden || node.data.hideBucket;
    }
    return isHidden ? false : true;
  }

  const selectedPlansList = comparePlanTableData?.filter(
    (data) => prevSelectedPlans.indexOf(data.plan_code) > -1
  );

  const loadTableInstance = (instance) => {
    instance?.columnApi?.setColumnsVisible(trackColHidden, false);
    setColumnToolPanelLayout();
  };

  const setColumnToolPanelLayout = () => {
    if (!isMonthView) {
      return;
    }
    var columnToolPanel = agTableRef.current.api.getToolPanelInstance(
      "columns"
    );
    const layout = [];

    let childLayout = [];
    const getLayout = (columns) => {
      let parent = [];
      columns.forEach((column) => {
        //saving reference at the start of the recursion of the current parent
        parent = childLayout;

        if (column.children && column.dimension === "dimension") {
          // to skip KPI/Metrics, Reference and kpi category column
          if (layout.length === 3) {
            childLayout = {
              headerName: column.label,
              children: [],
            };

            layout.push(childLayout);
            getLayout(column.children);
          } else {
            const newChild = {
              headerName: column.label,
              children: [],
            };
            childLayout?.children?.push(newChild);
            childLayout = newChild;
            getLayout(column.children);
          }
        } else {
          if (childLayout.children && column.extra.is_total) {
            childLayout.children.push({
              field: column.column_name,
            });
          } else if (column.dimension === "Plan") {
            layout.push({
              field: column.column_name,
            });
          }
        }
        // switch back to the parent when the sub tree is evaluated
        childLayout = parent;
      });
    };

    getLayout(planBudgetColumns);

    columnToolPanel.setColumnLayout(layout);
  };

  const onColumnVisible = (instance) => {
    const allColumns = instance.columnApi.getAllColumns();
    const displayedColumns = instance.columnApi.getAllDisplayedColumns();
    const hiddenColumnsWithObj = allColumns.filter(
      ({ colId }) =>
        !displayedColumns.find((dispCol) => dispCol.colId === colId)
    );
    const hiddenColumns = hiddenColumnsWithObj.map((column) => column.colId);
    setTrackColHidden(hiddenColumns);
  };

  // this function is to know that particular row is editable or not
  const isEditableRow = (data) => {
    let rowsWithoutEditablerenderer = ["compare", "variance_fcst"];
    let editableForIafRows = ["forcasted"];
    if (
      rowsWithoutEditablerenderer.indexOf(data?.reference) > -1 ||
      data?.comparePlan ||
      data?.metric?.includes("total_") ||
      editableForIafRows.indexOf(data?.reference) > -1
    ) {
      return false;
    }
    return true;
  };

  // this function call will happen when do paste operation
  const processDataFromClipboard = (params, bucket_keys) => {
    /**
     * data will be  2d array of copied data. each row represents particular metric data row node
     * each column represents a month
     */
    agTableRef.current.api.showLoadingOverlay();
    const agTableLoader = setTimeout(() => {
      agTableRef.current.api.hideOverlay();
    }, 10000);
    /**
     * TODO: Validate the context of below regexp
     */
    // const regex = /^-?\d+(\.\d+)?\s*[%$]?$/;
    // const copiedDetails = [
    //   params.data[0].map(
    //     (copyValue) => {
    //       console.log(regex.test(copyValue) && Number(copyValue.replace(/[^0-9\.-]+/g, "")))
    //      if(regex.test(copyValue))
    //       return  Number(copyValue.replace(/[^0-9\.-]+/g, ""))
    //     }
    //   ),
    // ];
    const copiedDetails = [
      params.data[0].map((copyValue) =>
        Number(copyValue.replace(/[^0-9\.-]+/g, ""))
      ),
    ];
    const rowsData = get(params, "api.rowModel.rowsToDisplay", []);
    // get current selected rows and columns details for paste operation
    const cellRangeDetail = params.api.getCellRanges()[0];
    const selectedCols = cellRangeDetail.columns;
    // here to get the selected rows for paste operation
    const selectedRows = rowsData.slice(
      cellRangeDetail.startRow.rowIndex,
      cellRangeDetail.endRow.rowIndex + 1
    );
    const valuesList = [];
    const updatedRowNodes = [];
    const totalColumns = [];
    const isCopiedSrcPerc = params.data[0].every(
      (currVal) => currVal.indexOf("%") > -1
    );
    for (let rowInx = 0; rowInx < selectedRows.length; rowInx++) {
      const rowData = selectedRows[rowInx];
      updatedRowNodes.push(rowData);
      // condition to skip the non editable row

      for (let colInx = 0; colInx < selectedCols.length; colInx++) {
        const cellDetail = customCellRenderer(
          plansmartConfigs.metrics_with_formatter,
          { column: selectedCols[colInx], data: rowData.data },
          planDetails?.status_txt
        );
        if (cellDetail?.type) {
          const colDefData = selectedCols[colInx];
          const leafColumns = (
            getFlattenColumn(colDefData, agTableRef?.current) || []
          ).map((columnObj) => omit(columnObj, webWorkerColOmitObjList));
          const copiedData = copiedDetails[rowInx]?.[colInx];
          leafColumns.forEach((columnObj) => {
            if (columnObj.extra.is_total) {
              totalColumns.push(columnObj.accessor);
            }
          });

          // check selected row and column have data in the copied data or not
          if (colDefData.colDef.is_editable) {
            const oldValue = rowData?.data?.[colDefData.colId];
            const targetDetail = setInputFormatForColumn(
              plansmartConfigs.metrics_with_formatter,
              { column: colDefData, data: rowData.data },
              false
            );
            const updatedValue =
              rowData?.data?.reference.includes("variance") ||
              targetDetail?.type === "percentage"
                ? isCopiedSrcPerc
                  ? Number(copiedData)
                  : Number(copiedData) * 100
                : Number(copiedData);
            rowData.setDataValue(colDefData.colId, updatedValue);

            valuesList.push({
              data: rowData?.data,
              column: omit(colDefData.colDef, webWorkerColOmitObjList),
              columnExtra: getColumnExtra(colDefData),
              leafColumns: leafColumns,
              oldValue: oldValue,
              tempValue: updatedValue,
              previousValue: oldValue,
            });
          }
        }
      }
    }
    calculationWorker.postMessage({
      plansmartConfigs,
      editableMetricFormulas,
      payloadForBudgetTableData: payloadUpdateBudgetTableRef.current,
      rowData: agTableRef?.current?.props?.rowData,
      bucket_keys,
      isChanged: true,
      valuesList,
      kpiListSkipDependentEditableFlow,
    });
    calculationWorker.onmessage = (e) => {
      const resultObj = e.data;
      let instances = stackOfInstances;
      if (
        Object.keys(resultObj.payloadForBudgetTableData?.metrics).length > 0
      ) {
        let newPayloadUpdateBudgetTable = cloneDeep(payloadUpdateBudgetTable);

        Object.keys(resultObj.payloadForBudgetTableData.metrics).forEach(
          (metric) => {
            newPayloadUpdateBudgetTable.metrics[metric] = {
              ...payloadUpdateBudgetTable.metrics[metric],
              ...resultObj.payloadForBudgetTableData.metrics[metric],
            };
          }
        );

        setPayloadUpdateBudgetTable(newPayloadUpdateBudgetTable);
        instances?.push(cloneDeep(resultObj.rowData));
        resultObj.flashCellList.forEach((node) => {
          const agNode = agTableRef.current.api.getRowNode(node.uniqueId);
          updatedRowNodes.push(agNode);
        });
        // Adding the latest updated instance to our stack of instances.
        setStackOfInstances([...instances]);
        // Pointing to the last instance in stack, which is nothing but our current instance
        setCurIdxStack(stackOfInstances.length - 1);
        // agTableRef?.current?.api?.setRowData(resultObj.rowData);
        setPlanBudgetData(resultObj.rowData);
        clearTimeout(agTableLoader);
        agTableRef.current.api.hideOverlay();
        agTableRef.current.api.flashCells({
          columns: resultObj.updatedColumn.concat(totalColumns),
          rowNodes: updatedRowNodes,
        });
        agTableRef.current.api.refreshCells({
          force: true,
        });
      } else {
        agTableRef.current.api.hideOverlay();
      }
    };
  };

  //this for while do copy operation
  const processCellForClipboard = (params) => {
    let inputAttribute = setInputFormatForColumn(
      props?.metrics_with_formatter,
      { column: params.column, data: params.node.data },
      true
    );

    return inputAttribute === "%" ||
      params?.node?.data?.reference.includes("variance")
      ? `${params.value}%`
      : params.value;
  };

  const handleCalculation = (
    data,
    column,
    isChanged,
    value,
    agTableRef,
    editableMetricFormulas,
    initialValue,
    payloadUpdateBudgetTable,
    initValue,
    bucket_keys
  ) => {
    let metricKey = data?.metricWithoutBucket;
    let metrics_with_formatter = plansmartConfigs.metrics_with_formatter;
    let toBeRoundedCompared =
      metrics_with_formatter[metricKey]?.formatter ===
        "roundOfftoTwoDecimals" ||
      metrics_with_formatter[metricKey]?.formatter === "roundOfftoOneDecimals"
        ? (isChanged && data[column?.field] !== value) || initialValue !== value
        : (isChanged && round(data[column?.field]) !== value) ||
          round(initialValue) !== round(value);
    if (!toBeRoundedCompared) {
      return;
    }
    // agTableRef.current.api.showLoadingOverlay();
    const agTableLoader = setTimeout(() => {
      agTableRef.current.api.hideOverlay();
    }, 10000);
    const leafColumns = (
      getFlattenColumn(column, agTableRef?.current) || []
    ).map((columnObj) => omit(columnObj, webWorkerColOmitObjList));
    const columnObj = omit(column.colDef, webWorkerColOmitObjList);
    const valuesList = JSON.parse(
      JSON.stringify([
        {
          data,
          column: columnObj,
          columnExtra: getColumnExtra(column),
          leafColumns: leafColumns,
          oldValue: initialValue,
          tempValue: value,
          previousValue: initValue,
        },
      ])
    );

    calculationWorker.postMessage({
      plansmartConfigs,
      editableMetricFormulas,
      payloadForBudgetTableData: payloadUpdateBudgetTableRef.current,
      rowData: agTableRef?.current?.props?.rowData,
      bucket_keys,
      isChanged,
      valuesList,
      toBeRoundedCompared,
      kpiListSkipDependentEditableFlow,
    });
    calculationWorker.onmessage = (e) => {
      const resultObj = e.data;
      if (
        Object.keys(resultObj.payloadForBudgetTableData?.metrics).length > 0
      ) {
        setPayloadUpdateBudgetTable(resultObj.payloadForBudgetTableData);
        const updatedRowNodes = [
          agTableRef.current.api.getRowNode(data.uniqueId),
        ];
        let instances = stackOfInstances;
        instances?.push(cloneDeep(resultObj.rowData));
        resultObj.flashCellList.forEach((node) => {
          const agNode = agTableRef.current.api.getRowNode(node.uniqueId);
          updatedRowNodes.push(agNode);
        });
        // Adding the latest updated instance to our stack of instances.
        setStackOfInstances([...instances]);
        // Pointing to the last instance in stack, which is nothing but our current instance
        setCurIdxStack(stackOfInstances.length - 1);
        // agTableRef?.current?.api?.setRowData(resultObj.rowData);
        setPlanBudgetData(resultObj.rowData);
        const totalColumns = [];
        leafColumns.forEach((columnObj) => {
          if (columnObj.extra.is_total) {
            totalColumns.push(columnObj.accessor);
          }
        });
        clearTimeout(agTableLoader);
        agTableRef.current.api.hideOverlay();
        agTableRef.current.api.flashCells({
          columns: resultObj.updatedColumn.concat(totalColumns),
          rowNodes: updatedRowNodes,
        });
        agTableRef.current.api.refreshCells({
          force: true,
        });
      } else {
        agTableRef.current.api.hideOverlay();
      }
    };
  };

  const getRowData = (params, columnName) => {
    return params?.data?.[columnName];
  };

  const getRowStyle = (params) => {
    let is_edit_metric =
      PRE_SEASON_STATUS_CODES.indexOf(plan_stage?.[planDetails?.status_txt]) >
      -1
        ? "pre_season"
        : "in_season";
    if (
      plansmartConfigs?.metrics_with_formatter?.[
        params?.data?.metricWithoutBucket
      ]?.is_default_editable?.[is_edit_metric]?.[params.data?.reference] &&
      !params?.data?.comparePlan
    )
      return { background: colours.aliceBlue };
  };
  return (
    <>
      {selectedPlansList?.length > 0 && (
        <RemovePlan
          comparePlanList={selectedPlansList}
          handleRemoveVersion={(planDetails) =>
            handleRemoveVersion(planDetails)
          }
        />
      )}
      <AgGridComponent
        props={props}
        groupHeaderHeight={0}
        applyBudgetTableFormatting={true}
        metrics_with_formatter={props.metrics_with_formatter}
        skipAutoSizeColumn={isMonthView ? true : false} // setting width manually for month view
        skipAutoSizeColumnOnSideBarAction={true}
        onFirstDataRender={(params) => onFirstDataRender(params, props)}
        tableRef={agTableRef}
        rowdata={planBudgetData}
        rowModelType={props.rowModelType}
        serverSideStoreType={props.serverSideStoreType}
        cacheBlockSize={props.cacheBlockSize}
        loadTableInstance={loadTableInstance}
        suppressRowTransform={true}
        columns={planBudgetColumns}
        gridOptions={gridOptions}
        isCellLockable={!skuViewMode}
        lockCellApi={(cellProps, isLocked) =>
          lockCellApi(cellProps, isLocked, agTableRef)
        }
        lockCellCustomConditionFn={lockCellCustomConditionFn}
        groupDisplayType={"groupRows"}
        customSideBar={[
          {
            id: "show_hide_category",
            labelDefault: "Show/Hide metrics",
            labelKey: "show_hide_metrics",
            iconKey: "menu",
            toolPanel: AddHideMetrics,
            height: 600,
            minHeight: 600,
            maxHeight: 600,
            toolPanelParams: {
              onChange: true,
              tableRef: agTableRef,
              showSnackMessage,
              setHiddenMetrics,
              hiddenMetrics,
              groupKeys: ["category", "bucket_category"],
              bucketSelection: bucketSelection,
              setColumnToolPanelLayout,
            },
          },
        ]}
        isExternalFilterPresent={isExternalFilterPresent}
        doesExternalFilterPass={doesExternalFilterPass}
        onBlur={(
          e,
          data,
          column,
          isChanged,
          initValue,
          initialValue,
          cellData,
          value
        ) => {
          props.onBlur
            ? props.onBlur(
                e,
                data,
                column,
                isChanged,
                value,
                initialValue,
                cellData
              )
            : handleCalculation(
                data,
                column,
                isChanged,
                value,
                agTableRef,
                editableMetricFormulas,
                initialValue,
                payloadUpdateBudgetTable,
                initValue,
                bucket_keys
              );
        }}
        rowHeight={30}
        noEditableCustomCellRender={
          !skuViewMode
            ? (params) =>
                noEditableCustomCellRender(props.metrics_with_formatter, params)
            : undefined
        }
        customCellRenderer={(cellProps) =>
          skuViewMode
            ? null
            : customCellRenderer(
                props.metrics_with_formatter,
                cellProps,
                planDetails?.status_txt,
                weekLevelKeys,
                bucket_keys
              )
        }
        uniqueRowId={props.uniqueRowId || "uniqueId"}
        pagination={props.pagination || false}
        getCustomInputAttribute={(cellProps) =>
          !skuViewMode &&
          setInputFormatForColumn(
            props.metrics_with_formatter,
            cellProps,
            false,
            bucket_keys
          )
        }
        optionsForContextMenu={["csvExport"]}
        groupRowRendererParams={{
          suppressCount: true,
        }}
        showSaveTableConfig={false}
        isGroupOpenByDefault={(params, cellProps) => {
          return true;
        }}
        customColumnMenu={props.customColumnMenu || true}
        chooseCustomCellRenderForPlansmart={true}
        onColumnVisible={onColumnVisible}
        sideBar={props.sideBar}
        enableRangeSelection={true}
        processDataFromClipboard={(params) =>
          processDataFromClipboard(params, bucket_keys)
        }
        processCellForClipboard={processCellForClipboard}
        manualCallBack={props.manualCallBack}
        getRowData={getRowData}
        rowGroupPanelShow={"always"}
        rowDragManaged={true}
        animateRows={true}
        sortable={false}
        enableCustomRowHeight={true}
        columnToolPanelParams={{
          suppressSyncLayoutWithGrid: true,
          // prevents columns being reordered from the columns tool panel
          suppressColumnMove: true,
        }}
        getRowStyle={getRowStyle}
        // suppressRowVirtualisation={true}
        // suppressColumnVirtualisation={true}
        valueCache={true}
        customTabFunction={(event, column, instance) => {
          return customTabFunction(
            column,
            instance,
            event,
            props?.metrics_with_formatter,
            planDetails
          );
        }}
        budgetTableInputValidation={plansmartBudgetTableInputValidation}
      />
    </>
  );
};
const mapStateToProps = (store) => {
  return {
    editableMetricFormulas: get(
      store,
      "plansmartReducer.planBudgetTableReducer.editableMetricFormulas",
      {}
    ),
    plansmartConfigs: get(
      store,
      "plansmartReducer.planBudgetTableReducer.plansmartConfigs",
      {}
    ),
    metrics_with_formatter: planSmartMetricConfigSelector(store),
    planSmartBudgetUpdateLoader: get(
      store,
      "plansmartReducer.planBudgetTableReducer.planSmartBudgetUpdateLoader",
      false
    ),
    plansmartBudgetTableLoader: get(
      store,
      "plansmartReducer.planBudgetTableReducer.plansmartBudgetTableLoader",
      false
    ),
  };
};

export default connect(mapStateToProps)(withRouter(PlanSmartBudgetTable));
