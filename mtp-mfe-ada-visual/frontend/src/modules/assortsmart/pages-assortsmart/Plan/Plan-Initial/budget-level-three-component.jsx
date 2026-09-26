import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { Button } from "@mui/material";
import AgGridTable from "core/Utils/agGrid";
import SortComponent from "core/Utils/agGrid/column-component/sortComponent";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import { pollingService } from "core/Utils/functions/helpers/errorhandler-helpers";
import { BUDGET_POLL } from "modules/assortsmart/constants-assortsmart/apiConstants";
import { addSnack } from "core/actions/snackbarActions";
import { Prompt } from "impact-ui";
import { cloneDeep, groupBy } from "lodash";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import * as planInitialServiceActions from "modules/assortsmart/services-assortsmart/Plan/Plan-Initial/plan-initial-service";
import { connect } from "react-redux";
import { useHistory, withRouter } from "react-router-dom";
import { bindActionCreators } from "redux";
import { common } from "../../../constants-assortsmart/stringContants";
import {
  deleteL3,
  getL3OptData,
  set2_1_Loader,
  setL2OptData,
  setL3OptData,
  updateL3OptData,
  getCarryoverOptimizeL3Data,
} from "../../../services-assortsmart/Plan/Plan-Initial/plan-initial-service";
import {
  assortAgGridCustomCellRenderer,
  externalFilterLevelTwoSubchannel,
  getPlanPayload,
  isChannelMultiple,
  isDropPlan,
  isWholesalePlan,
  scrollIntoView,
  setEdiableFalse,
  getOptimiseL3Payload,
} from "../../../utils-assortsmart/utilityFunctions";
import PlanDropTabViewComponent from "../plan-drop-tab-view-component";
import BudgetLevelThreeChartComponent from "./budget-level-three-chart-component";
import { fetchL2Details, fetchL3Details } from "./budget-level-three-functions";
import { updateL3RowData } from "./plan-initial-functions";

const BudgetLevelThreeComponent = (props) => {
  const [level3Columns, setLevel3Columns] = useState([]);
  const [groupedDrops, setGroupedDrops] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [callOptimizationTask, setCallOptimizationTask] = useState(false);
  const firstTimeRenderL2 = useRef(true);
  const firstTimeRenderL3 = useRef(true);
  const propsRef = useRef(props);

  const history = useHistory();
  const isView = history.location.pathname.includes("view") || false;
  const classes = useStyles();
  const planCode = props.match.params.planCode;
  let formData = props.formData;
  const level3FilteredData = props.budgetL3Instance?.current?.api
    ?.getModel()
    ?.rootNode.childrenAfterAggFilter?.map((node) => node.data);
  let optimizationLevels =
    props.screenConfiguration["2.1"]?.budget_optimization_level;

  useEffect(() => {
    formData = props.formData;
    if (props.budgetL3Instance?.current?.api) {
      props.budgetL3Instance.current.api.onFilterChanged();
    }
  }, [props.formData]);

  useEffect(() => {
    const updateDetailsFetch = async () => {
      if (props.initialValue.length === 1) {
        props.set2_1_Loader(true);
        let isUpdateSucess = await props.updateL3Data();
        if (isUpdateSucess) {
          fetchL3Details(planCode, props, false, formData);
        }
      } else if (props.initialValue.length > 1) {
        fetchL3Details(planCode, props, false, formData);
      }
    };
    updateDetailsFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.initialValue]);

  useEffect(() => {
    propsRef.current = props;
  }, [props.selectedDropData]);

  useEffect(() => {
    if (
      props.level3TableData?.length &&
      isDropPlan(
        props.planDetails?.data,
        `${props.screenConfiguration?.common?.drop_key || "drops"}_count`
      ) &&
      !groupedDrops
    ) {
      let drops = groupBy(
        props.level3TableData,
        props.screenConfiguration?.common?.drop_key || "drop"
      );
      setGroupedDrops(drops);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.level3TableData]);

  const handleHiddenColumns = (col, show_style_level) => {
    switch (props.currentTableLevel) {
      // If optimizationLevels is l2_name, show l2_name col and hide l3_name col
      case "l2_name":
        col.is_hidden =
          col.column_name === "l2_name" && !show_style_level
            ? false
            : col.column_name === "l3_name"
            ? true
            : col.column_name === "delete" && isView
            ? true
            : col.is_hidden;
        break;
      // If optimizationLevels is l3_name, show l3_name col and hide l2_name col
      case "l3_name":
        col.is_hidden =
          col.column_name === "l3_name" && !show_style_level
            ? false
            : col.column_name === "l2_name"
            ? true
            : col.column_name === "delete" && isView
            ? true
            : col.is_hidden;
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    const fetchL3Data = async () => {
      if (
        props.currentTableLevel === "l3_name" &&
        ((props.levelTwoSelected?.value &&
          props.planDetails?.data?.l2_name?.length > 1) ||
          props.planDetails?.data?.l2_name?.length <= 1) &&
        //if the plan has multiple l1 and default l1 is also present or it has only one l1
        ((props.levelOneSelected?.value &&
          props.planDetails?.data?.l1_name?.length > 1) ||
          props.planDetails?.data?.l1_name?.length <= 1)
      ) {
        let loader = props.showClusterLevel ? true : false;
        if (
          props.currentTableLevel === "l3_name" &&
          props.level3TableData?.length &&
          !firstTimeRenderL3.current &&
          props.optimizationLevel === "l3_name"
        ) {
          const isUpdateSuccess = await props.updateL3Data(
            props.currentTableLevel,
            false
          );
          if (isUpdateSuccess) {
            await fetchL3Details(planCode, props, loader);
          }
        } else {
          await fetchL3Details(planCode, props, loader);
          firstTimeRenderL3.current = false;
        }
      }
    };
    fetchL3Data();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.levelTwoSelected]);

  useEffect(() => {
    const fetchL2Data = async () => {
      if (
        props.currentTableLevel === "l2_name" &&
        ((props.levelOneSelected?.value &&
          props.planDetails?.data?.l1_name?.length > 1) ||
          props.planDetails?.data?.l1_name?.length <= 1)
      ) {
        if (props.level3TableData?.length && !firstTimeRenderL2.current) {
          const isUpdateSuccess = await props.updateL3Data(
            props.currentTableLevel,
            false
          );
          if (isUpdateSuccess) {
            await fetchL2Details(planCode, props, true);
          }
        } else {
          await fetchL2Details(planCode, props);
          firstTimeRenderL2.current = false;
        }
      }
    };
    if (Object.keys(props.columnHeaderJson)?.length) {
      props.set2_1_Loader(true);
      props.setDisableNext(true);
      fetchL2Data();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(props.columnHeaderJson), props.levelOneSelected]);

  // Filter table data based on selected drop
  useEffect(() => {
    if (
      props.selectedDropData &&
      isDropPlan(
        props.planDetails?.data,
        `${props.screenConfiguration?.common?.drop_key || "drops"}_count`
      ) &&
      props.budgetL3Instance?.current?.api &&
      props.level3TableData?.length > 0
    ) {
      var hardcodedFilter = {
        [props.screenConfiguration?.common?.drop_key || "drop"]: {
          type: "equals",
          filter: props.selectedDropData,
        },
      };
      props.budgetL3Instance.current.api.setFilterModel(hardcodedFilter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    props.selectedDropData,
    props.budgetL3Instance?.current?.api,
    props.level3TableData,
  ]);

  const onL3PollingSucess = () => {
    props.addSnack({
      message: `Successfully optimized ${props.columnHeaderJson?.l3_name} details`,
      options: {
        variant: "success",
      },
    });
    props.set2_1_Loader(false);
    fetchL3Details(planCode, props, false, formData);
    if (props.isLevel2Required && props.currentTableLevel === "l2_name") {
      props.setShowLevel3(true);
    } else props.setShowClusterLevel(true);
  };
  const onL3PollingFailure = (data) => {
    props.addSnack({
      message: data.message,
      options: {
        variant: "error",
      },
    });
    props.setShowLevel3(false);
    props.set2_1_Loader(false);
    props.setShowClusterLevel(false);
  };

  const fetchOptimizeL3Data = async () => {
    try {
      const planDetailsData = props.planDetails?.data;
      let optimisePayload = getOptimiseL3Payload(planDetailsData);
      if (planDetailsData.data_pull_source) {
        optimisePayload.data_pull_source = planDetailsData.data_pull_source;
      }
      if (planDetailsData.comapre_season) {
        optimisePayload.comapre_season = planDetailsData.comapre_season;
      }
      optimisePayload.optimization_level = ["l3_name"];
      let plan_sub_step = "optimization_table_l3_name";
      if (optimizationLevels.includes("carryover")) {
        plan_sub_step = optimizationLevels.slice(2)?.[0]
          ? `optimization_table_${optimizationLevels.slice(2)?.[0]}`
          : "optimization_table_l3_name";
      } else {
        plan_sub_step = optimizationLevels.slice(1)?.[0]
          ? `optimization_table_${optimizationLevels.slice(1)?.[0]}`
          : "optimization_table_l3_name";
      }
      optimisePayload.plan_sub_step = plan_sub_step;
      const optimizeResponse = await props.getCarryoverOptimizeL3Data(
        optimisePayload
      );
      if (optimizeResponse?.data?.data?.status) {
        const reqId = optimizeResponse?.data?.data?.task_id;
        //Poll to the server till we receive the response
        pollingService(
          `${BUDGET_POLL}${reqId}`,
          onL3PollingSucess,
          onL3PollingFailure
        );
        props.addSnack({
          message: "Please wait for sometime till we process!",
          options: {
            variant: "success",
          },
        });
      } else {
        props.addSnack({
          message: `Optimising ${props.columnHeaderJson?.l3_name} details failed`,
          options: {
            variant: "error",
          },
        });
        props.set2_1_Loader(false);
      }
    } catch (error) {
      props.set2_1_Loader(false);
      props.addSnack({
        message: "Something went wrong",
        options: {
          variant: "error",
        },
      });
    }
  };

  const onClusterOptimise = async (currentTableLevel) => {
    props.setDisableNext(true);
    props.setLevel3TableData([]);
    props.setShowClusterLevel(false);
    props.setShowReviewAcrossDropsTable(false);
    props.setInitialLoadDepthChoice(true);
    props.setInitialLoadWedge(true);
    props.setInitialLoadFinalize(true);
    props.setFromDashboardScreen_2_2(false);
    props.setFromDashboardScreen_2_3(false);
    props.setFromDashboardScreen_2_4(false);
    props.setOptimizationLevel(currentTableLevel);
    if (props.isLevel2Required && props.currentTableLevel === "l2_name") {
      props.setShowLevel3(false);
    }
    let showTotalPenError = false;
    props.footerRow?.forEach((total) => {
      if (
        (total?.penetration_ty < 99 || total?.penetration_ty > 101) &&
        total?.penetration_ty > 0
      ) {
        showTotalPenError = true;
      }
    });

    props.clearSelectedRows();
    if (showTotalPenError) {
      props.addSnack({
        message: "Penetration exceeding/less than 100%",
        options: {
          variant: "warning",
        },
      });
    }
    props.set2_1_Loader(true);
    scrollIntoView("budget-cluster-table");
    if (!(formData?.channel_list?.length > 1)) {
      let isUpdateSuccess = await props.updateL3Data(
        props.currentTableLevel,
        true
      );
      if (isUpdateSuccess) {
        if (
          callOptimizationTask &&
          props.currentTableLevel === "l2_name" &&
          props.screenConfiguration?.common?.endpoint_project_name ===
            "assort-smart"
        ) {
          fetchOptimizeL3Data();
        } else {
          fetchL3Details(planCode, props, false, formData);
          if (props.isLevel2Required && props.currentTableLevel === "l2_name") {
            props.setShowLevel3(true);
          } else props.setShowClusterLevel(true);
        }
      }
    } else {
      fetchL3Details(planCode, props, false, formData);
      if (props.isLevel2Required && props.currentTableLevel === "l2_name") {
        props.setShowLevel3(true);
      } else props.setShowClusterLevel(true);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      let l3Column = cloneDeep(props.commonLevelCol);
      l3Column.forEach((col) => {
        handleHiddenColumns(
          col,
          props.screenConfiguration?.common?.endpoint_project_name ===
            "assort-smart"
        );
      });
      //Adding icon on Receipt units to handle copy op feature for CK
      l3Column.forEach((col) => {
        if (
          col.accessor ===
          (props.screenConfiguration?.common?.drop_key || "drop")
        ) {
          col.filter = "agTextColumnFilter";
        }
        if (col.Header === "RCPTS Units") {
          //popover icon needs to be added for ck as op column will be visible only for ck
          if (col.columns.length === 3) {
            col.show_info_icon = true;
          }
        }
        if (
          col.accessor ===
          (props.screenConfiguration?.common?.drop_key || "drop")
        ) {
          // For footer row removing drop value
          col.cellRenderer = (data) => {
            if (data?.data?.l3_name === "Total") {
              return null;
            }
            return data.value;
          };
        }
      });
      if (!isView) {
        l3Column.unshift({
          headerCheckboxSelection: true,
          checkboxSelection: true,
          is_frozen: true,
          order_of_display: 1,
        });
      }
      setLevel3Columns(l3Column);
    };
    if (props.formData?.channel_list?.length > 1) {
      let columns = setEdiableFalse(level3Columns);
      columns = agGridColumnFormatter(
        cloneDeep(columns || []),
        props.columnHeaderJson,
        null,
        null,
        null,
        history.location.pathname.includes("view")
      );
      setLevel3Columns(columns);
    } else if (props.commonLevelCol?.length) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.formData, props.commonLevelCol]);

  const onSelectionChanged = (event) => {
    // fetch all selected rows
    let selectedRows = event.api.getSelectedRows();
    let filteredSelectedRows = selectedRows.filter(
      (data) =>
        data[props.screenConfiguration?.common?.drop_key || "drop"] ===
        (propsRef.current.selectedDropData || "-")
    );
    props.setDeleteRow(filteredSelectedRows);
    if (
      isDropPlan(
        props.planDetails?.data,
        `${props.screenConfiguration?.common?.drop_key || "drops"}_count`
      ) && !optimizationLevels.includes("carryover")
    ) {
      props.budgetL3Instance.current.api.forEachNode((node) => {
        if (
          node.data[props.screenConfiguration?.common?.drop_key || "drop"] !==
          propsRef.current.selectedDropData
        ) {
          node.selected = false;
        }
      });
    }
  };

  const loadTableInstance = (params) => {
    props.budgetL3Instance.current = params;
    props.setRTinstance(props.budgetL3Instance);
    if (
      isDropPlan(
        props.planDetails?.data,
        `${props.screenConfiguration?.common?.drop_key || "drops"}_count`
      )
    ) {
      let selectedDrop =
        props.selectedDropData ||
        Object.keys(
          groupBy(
            props.level3TableData,
            props.screenConfiguration?.common?.drop_key || "drop"
          )
        )[0];
      var hardcodedFilter = {
        [props.screenConfiguration?.common?.drop_key || "drop"]: {
          type: "equals",
          filter: selectedDrop,
        },
      };
      props.budgetL3Instance.current.api.setFilterModel(hardcodedFilter);
    }
  };

  useEffect(() => {
    if (props.selectedDropData && props.budgetL3Instance?.current?.api) {
      let tempData = [];
      props.budgetL3Instance.current.api.forEachNode((eachRow) => {
        let item = cloneDeep(eachRow.data);
        if (item.lock) {
          item.lock = false;
        }
        tempData.push(item);
      });
      props.setLevel3TableData(tempData);
      props.budgetL3Instance.current.api.refreshCells({
        update: tempData,
        force: true,
        suppressFlash: false,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.selectedDropData]);

  const isExternalFilterPresent = useCallback(() => {
    // filter incase of wholesale plan and mulitple channels
    return isWholesalePlan(props.planDetails?.data) ||
      isChannelMultiple(props.planDetails?.data) ||
      props.planDetails?.data?.l2_name?.length > 1 ||
      props.planDetails?.data?.l1_name?.length > 1
      ? true
      : false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doesExternalFilterPass = useCallback(
    (node) => {
      return externalFilterLevelTwoSubchannel(
        node,
        props.selectedDropData,
        props.level3TableData,
        formData,
        props.planDetails?.data,
        props.screenConfiguration
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [formData, props.level3TableData, props.selectedDropData]
  );

  const updateL3TableData = (
    eventData,
    data,
    column,
    isChanged,
    value,
    initialValue
  ) => {
    let setTableData =
      props.currentTableLevel === "l2_name"
        ? props.setDynamicL2TableData
        : props.setLevel3TableData;
    let isLevelOneDropdownRequired =
      props.planDetails?.data?.l1_name?.length > 1 ? true : false;
    let isLevelTwoDropdownRequired =
      props.planDetails?.data?.l2_name?.length > 1 &&
      props.currentTableLevel === "l3_name"
        ? true
        : false;
    let columnId = column.colId;
    if (
      props.currentTableLevel === "l2_name" &&
      (columnId === "penetration_ty" || columnId === "budget_ty")
    ) {
      setCallOptimizationTask(true);
    }
    updateL3RowData(
      eventData,
      data,
      column,
      isChanged,
      value,
      initialValue,
      props.budgetL3Instance,
      props,
      props.selectedDropData,
      props.getTotalFooterRow,
      setTableData,
      props.setIsL3DataChanged,
      isLevelOneDropdownRequired,
      isLevelTwoDropdownRequired,
      props.currentTableLevel,
      props.setIspenValueChanged
    );
  };

  const getSubrowPath = useMemo(() => {
    return (data) => {
      return data.hierarchy;
    };
  }, []);

  const autoGroupColumnDef = {
    headerName: props.columnHeaderJson[props.currentTableLevel],
    hide: true,
    cellRendererParams: {
      suppressCount: true,
    },
    pinned: "left",
    headerComponent: SortComponent,
    width: 200,
    type: "attribute",
    valueGetter: (props) =>
      props?.data?.hierarchy?.length > 1
        ? props?.data?.hierarchy?.[1]
        : props?.data?.[props?.data?.l3_name ? "l3_name" : "l2_name"],
  };

  return (
    <>
      {groupedDrops &&
        Object.keys(groupedDrops).length >= 1 &&
        props.level3View === "table" &&
        !optimizationLevels.includes("carryover") && (
          <div>
            <PlanDropTabViewComponent
              groupedDrops={groupedDrops}
              onChangeTab={props.setSelectedDropData}
              selectedTab={props.selectedDropData}
            />
          </div>
        )}
      {props.level3View === "table" && (
        <AgGridTable
          columns={level3Columns || []}
          rowdata={props.level3TableData || []}
          loadTableInstance={loadTableInstance}
          onBlur={(e, data, column, isChanged, value, initialValue) =>
            updateL3TableData(e, data, column, isChanged, value, initialValue)
          }
          customCellRenderer={(cellProps) =>
            assortAgGridCustomCellRenderer(cellProps, "budget-level3-table")
          }
          isExternalFilterPresent={isExternalFilterPresent}
          doesExternalFilterPass={doesExternalFilterPass}
          uniqueRowId={"uniqueId"}
          sideBar={false}
          pagination={false}
          tableId={
            props.currentTableLevel === "l2_name"
              ? "budget-level2-table"
              : "budget-level3-table"
          }
          treeData={optimizationLevels.includes("carryover") ? true : false}
          getDataPath={getSubrowPath}
          autoGroupColumnDef={autoGroupColumnDef}
          pinnedBottomRowData={props.footerRow}
          adjustTableHeight={
            level3FilteredData?.length && level3FilteredData?.length <= 2
              ? true
              : false
          }
          onSelectionChanged={onSelectionChanged}
        />
      )}
      {props.level3View === "chart" && props.level3TableData?.length > 0 && (
        <BudgetLevelThreeChartComponent
          budgetL3ChartDetails={
            props.currentTableLevel === "l3_name"
              ? props.l3OptData
              : props.l2OptData
          }
          budgetL3ChartData={props.level3TableData}
          columnHeaderJson={props.columnHeaderJson}
          chartMetrics={level3Columns}
          planDetails={props.planDetails?.data}
          currentTableLevel={props.currentTableLevel}
          formData={formData}
          screenConfiguration={props.screenConfiguration}
          optimizationLevels={optimizationLevels}
        />
      )}
      {props.level3TableData?.length &&
      !history.location.pathname.includes("view") ? (
        <div className={classes.rightAlignButtonAssort}>
          <Button
            variant="contained"
            color="primary"
            className={classes.button}
            onClick={() => onClusterOptimise(props.currentTableLevel)}
            disabled={props.level3TableData?.length > 0 ? false : true}
            id="optimise for cluster"
          >
            {props.currentTableLevel === "l2_name"
              ? `Optimize for ${props?.columnHeaderJson?.l3_name || ""}`
              : "Optimize for Cluster Split"}
          </Button>
        </div>
      ) : null}

      <Prompt
        isOpen={props.showDeleteDialog}
        title="Confirm Delete"
        subHeading={`Are you sure you want to delete ${
          props.deleteRow?.length > 0
            ? props.deleteRow.map((row, index) => row.original_l3_name || row.l2_name)
            : ""
        } ?`}
        infoList={[]}
        primaryButtonProps={{
          children: common.__ConfirmBtnText,
          onClick: () => {
            props.onDeleteClick(props.showDeleteDialog);
            props.setShowDeleteDialog(false);
          },
        }}
        tertiaryButtonProps={{
          children: common.__RejectBtnText,
          onClick: () => props.setShowDeleteDialog(false),
        }}
        variant="error"
      />
    </>
  );
};

const mapStateToProps = (state) => {
  return {
    screenConfiguration:
      state.assortsmartReducer.commonAssortReducer.screenConfiguration,
    l3OptData: planInitialServiceActions.budgetLevelThreeTableDataSelector(
      state
    ),
    l2OptData: planInitialServiceActions.budgetLevelTwoTableDataSelector(state),
    levelsJson: planDashboardServiceActions.levelsJsonDataSelector(state),
    planDetails: planDashboardServiceActions.planDetailsDataSelector(state),
    columnHeaderJson: planDashboardServiceActions.columnHeaderJsonSelector(
      state
    ),
    planLevels: state.assortsmartReducer.planDashboardReducer.planLevels,
  };
};

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators(
    {
      getL3OptData,
      setL3OptData,
      setL2OptData,
      set2_1_Loader,
      updateL3OptData,
      addSnack,
      deleteL3,
      getCarryoverOptimizeL3Data,
    },
    dispatch
  );
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(BudgetLevelThreeComponent));
