import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";
import { cloneDeep, groupBy, isEmpty, uniqBy } from "lodash";
import { addSnack } from "core/actions/snackbarActions";
import {
  assortAgGridCustomCellRenderer,
  isDropPlan,
  externalFilterLevelsChannelSubChannel,
  getFilteredFooter,
} from "../../../utils-assortsmart/utilityFunctions";
import PlanDropTabViewComponent from "../plan-drop-tab-view-component";
import {
  getDepthChoiceData,
  set2_2_Loader,
  updateDepthChoiceData,
} from "modules/assortsmart/services-assortsmart/Plan/Plan-Depth-Choice/depth-choice-service";
import AgGridTable from "core/Utils/agGrid";
import {
  getChoiceTotalFooterRow,
  getDepthAndChoiceTableData,
  getTotalChoiceCountOfRow,
  recalculateTotal,
  updateChoiceValues,
  handleUpdateValidation,
} from "./depth-choice-functions";
import { bindActionCreators } from "redux";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import * as planDepthChoiceServiceActions from "modules/assortsmart/services-assortsmart/Plan/Plan-Depth-Choice/depth-choice-service";

const DepthOrChoiceComponent = (props) => {
  const [depthrChoiceTableData, setDepthrChoiceTableData] = useState([]);
  const [groupedDrops, setGroupedDrops] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [clusterData, setClusterData] = useState([]);
  const [totalFooter, setTotalFooter] = useState([]);
  const [filteredFooter, setFilteredFooter] = useState([]);
  const tableInstance = useRef({});
  const classes = useStyles();
  let formData = cloneDeep(props.formData);
  useEffect(() => {
    if (depthrChoiceTableData?.length) {
      if (
        isDropPlan(
          props.planDetails?.data,
          `${props.screenConfiguration?.common?.drop_key || "drops"}_count`
        )
      ) {
        let drops = groupBy(
          depthrChoiceTableData,
          props.screenConfiguration?.common?.drop_key || "drop"
        );
        setGroupedDrops(drops);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depthrChoiceTableData]);

  useEffect(() => {
    setDepthrChoiceTableData([]);
    setTableData([]);
    generateTableData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.depthChoiceData]);

  useEffect(() => {
    if (
      props.selectedDropData &&
      isDropPlan(
        props.planDetails?.data,
        `${props.screenConfiguration?.common?.drop_key || "drops"}_count`
      ) &&
      tableInstance?.current?.api
    ) {
      var hardcodedFilter = {
        [props.screenConfiguration?.common?.drop_key || "drop"]: {
          type: "equals",
          filter: props.selectedDropData,
        },
      };
      tableInstance.current.api.setFilterModel(hardcodedFilter);
      return () => {};
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.selectedDropData, tableInstance]);

  useEffect(() => {
    formData = props.formData;
    if (tableInstance?.current?.api) {
      tableInstance.current.api.onFilterChanged();
    }
  }, [props.formData, tableInstance]);

  const generateTableData = () => {
    setDepthrChoiceTableData([]);
    setTableData([]);

    let tempDepthChoiceTableData =
      props.depthOrChoice === "choice"
        ? cloneDeep(props.depthChoiceData?.choice_data)
        : cloneDeep(props.depthChoiceData?.depth_data);

    if (tempDepthChoiceTableData?.length) {
      const uniqClusters = uniqBy(tempDepthChoiceTableData, "cluster_code");
      setClusterData(uniqClusters);
      let uniqueClusterData = tempDepthChoiceTableData
        .map((p) => p.cluster_display_name)
        .filter(
          (cluster_display_name, index, arr) =>
            arr.indexOf(cluster_display_name) === index
        )
        .sort();
      uniqueClusterData = uniqueClusterData?.map((data) => data?.toLowerCase());
      props.setUniqueClusterList(uniqueClusterData);
      let budgetData = getDepthAndChoiceTableData(
        tempDepthChoiceTableData,
        props
      );
      if (props.depthOrChoice === "choice") {
        getTotalChoiceCountOfRow(budgetData, uniqueClusterData);
        setGroupedDrops(null);
        setDepthrChoiceTableData(budgetData);
        if (budgetData?.[0]?.carryover_flag) {
          budgetData = recalculateTotal(
            budgetData,
            "total_style_count_ty",
            props.screenConfiguration
          );
          budgetData = recalculateTotal(
            budgetData,
            "total_choice_count_ty",
            props.screenConfiguration
          );
        }
        setTotalFooter(
          getChoiceTotalFooterRow(budgetData, uniqueClusterData, props)
        );
        setTableData(budgetData);
      } else {
        setTableData(budgetData);
        setGroupedDrops(null);
        setDepthrChoiceTableData(budgetData);
      }
    }
  };

  useEffect(() => {
    if (totalFooter?.length > 0) {
      let formValue = {};
      if (!isEmpty(props.selectedChannel)) {
        formValue.channel = props.selectedChannel?.value;
      }
      if (!isEmpty(props.levelSelected)) {
        Object.keys(props.levelSelected).forEach((level) => {
          formValue[level] = props.levelSelected?.[level]?.value;
        });
      }
      if (props.selectedDropData) {
        formValue[props.screenConfiguration?.common?.drop_key || "drop"] =
          props.selectedDropData;
      }
      setFilteredFooter(getFilteredFooter(totalFooter, formValue));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    totalFooter,
    props.selectedDropData,
    JSON.stringify(props.selectedChannel),
    JSON.stringify(props.levelSelected),
  ]);

  const updateDepthChoiceTable = (
    _,
    rowData,
    column,
    isChanged,
    value,
    initialValue,
    uniqueClusterList
  ) => {
    let changedIds = props.changedMasterIds;
    let columnId = column.colId;
    let row = rowData;
    let keysplit = columnId.split("_ty");
    let index = 0;
    props.setIsDepthChoiceChanged(true);
    if (columnId.includes("ty")) {
      handleUpdateValidation(columnId, rowData, value);
    }
    uniqueClusterList.forEach((_data, ind) => {
      if (
        rowData?.[`cluster_display_name${ind + 1}`]?.toLowerCase() ===
        keysplit[0]
      ) {
        index = ind;
      }
    });
    changedIds.push(row?.[`plan_cls_depth_id${index + 1}`]);
    let isValidUpdate = true;
    if (
      columnId.includes("_ty") &&
      props.depthOrChoice === "choice" &&
      columnId !== "total_style_count_ty"
    ) {
      //IN 2-2 CC table whenever we change cluster column ty value it shouldn't exceed threshold and max_cc
      //Threshold will be calculated from ly value of same cluster in order to get the column id of ly we are replaing "t" with "l"
      const choiceKey = columnId.replace("ty", "ly");
      const threshold =
        row.cc_threshold &&
        Math.round(parseInt(row[choiceKey]) * row.cc_threshold);
      let max_cc;
      if (row.max_cc && threshold) {
        max_cc =
          parseInt(row.max_cc) < threshold ? parseInt(row.max_cc) : threshold;
      } else if (row.max_cc) {
        max_cc = parseInt(row.max_cc);
      } else {
        max_cc = threshold;
      }
      if (max_cc && value > max_cc) {
        isValidUpdate = false;
        const msg = "Choice count value cannot be more than ";
        props.addSnack({
          message: msg + `${max_cc}`,
          options: {
            variant: "error",
          },
        });
      }
    }
    if (isValidUpdate) {
      row[columnId] = value;
    }
    if (columnId.includes("_ty")) {
      let tempData = [];
      tableInstance.current.api.forEachNode((node) => {
        if (node.data.l3_name !== "Total") {
          //removing footer column since it will be recalculated below
          tempData.push(node.data);
        }
      });
      setTableData([]);
      if (row.carryover_flag === "New") {
        tempData = recalculateTotal(
          tempData,
          columnId,
          props.screenConfiguration
        );
      }
      if (props.depthOrChoice === "choice") {
        setTotalFooter(
          getChoiceTotalFooterRow(tempData, uniqueClusterList, props)
        );
        updateChoiceValues(
          columnId,
          row,
          value,
          initialValue,
          tempData,
          uniqueClusterList,
          changedIds,
          setTotalFooter,
          optimizationLevels,
          props
        );
        setTableData(tempData);
      } else {
        setTableData(tempData);
      }
      tableInstance.current.api.refreshCells({
        update: tempData,
        force: true,
        suppressFlash: false,
      });
    }
    if (isValidUpdate) {
      props.enableRecalculateBtn(false);
    }
    tableInstance.current.api.onFilterChanged();
  };

  useEffect(() => {
    if (tableData?.length) {
      props.handleNextDepthChoice();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableData]);

  const loadTableInstance = (params) => {
    tableInstance.current = params;
    props.setRTinstance(tableInstance);
    if (
      isDropPlan(
        props.planDetails?.data,
        `${props.screenConfiguration?.common?.drop_key || "drops"}_count`
      )
    ) {
      let selectedDrop = props.selectedDropData
        ? props.selectedDropData
        : Object.keys(
            groupBy(
              tableData,
              props.screenConfiguration?.common?.drop_key || "drop"
            )
          )[0];
      var hardcodedFilter = {
        [props.screenConfiguration?.common?.drop_key || "drop"]: {
          type: "equals",
          filter: selectedDrop,
        },
      };
      tableInstance.current.api.setFilterModel(hardcodedFilter);
    }
  };

  const isExternalFilterPresent = useCallback(() => {
    // if formData is not empty, then we are filtering
    let levelsFilter = false;
    Object.keys(props.levelsJson).forEach((level) => {
      if (props.planDetails?.data?.[level]?.length > 1)
        return (levelsFilter = true);
    });
    return levelsFilter;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doesExternalFilterPass = useCallback(
    //whenever channel or sub channel, levels changes data get filtered here
    (node) => {
      return externalFilterLevelsChannelSubChannel(
        node,
        tableData,
        formData,
        props.planDetails?.data,
        props.levelsJson
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [formData, tableData]
  );

  let optimizationLevels =
    props.screenConfiguration["2.1"]?.budget_optimization_level;

  const getSubrowPath = useMemo(() => {
    return (data) => {
      return data.hierarchy;
    };
  }, []);

  const autoGroupColumnDef = {
    headerName: props.columnHeaderJson["l3_name"],
    hide: true,
    cellRendererParams: {
      suppressCount: true,
    },
    pinned: "left",
    width: 200,
    type: "attribute",
    valueGetter: (props) =>
      props?.data?.hierarchy?.length > 1
        ? props?.data?.hierarchy?.[1]
        : props?.data?.l3_name,
  };

  return (
    <>
      {groupedDrops && (
        <div>
          <PlanDropTabViewComponent
            groupedDrops={groupedDrops}
            onChangeTab={props.setSelectedDropData}
            selectedTab={props.selectedDropData}
          />
        </div>
      )}
      {props.columns?.length > 0 && tableData?.length > 0 && (
        <div className={clusterData.length <= 3 ? classes.depthTableWidth : ""}>
          <AgGridTable
            columns={props.columns || []}
            rowdata={tableData || []}
            loadTableInstance={loadTableInstance}
            onBlur={(e, data, column, isChanged, value, initialValue) =>
              updateDepthChoiceTable(
                e,
                data,
                column,
                isChanged,
                value,
                initialValue,
                props.uniqueClusterList
              )
            }
            customCellRenderer={(cellProps) =>
              props.depthOrChoice === "choice"
                ? assortAgGridCustomCellRenderer(cellProps, `choice-table`)
                : assortAgGridCustomCellRenderer(cellProps, `depth-table`)
            }
            isExternalFilterPresent={isExternalFilterPresent}
            doesExternalFilterPass={doesExternalFilterPass}
            uniqueRowId={"uniqueID"}
            sideBar={false}
            pagination={false}
            tableId={`${props.depthOrChoice}-table`}
            sizeColumnsToFitFlag={true}
            treeData={optimizationLevels.includes("carryover") ? true : false}
            getDataPath={getSubrowPath}
            autoGroupColumnDef={autoGroupColumnDef}
            adjustTableHeight={true}
            pinnedBottomRowData={
              props.depthOrChoice === "choice" ? filteredFooter : []
            }
          />
        </div>
      )}
      {tableData?.length === 0 && (
        <div className={clusterData.length <= 3 ? classes.depthTableWidth : ""}>
          <AgGridTable
            columns={props.columns || []}
            rowdata={tableData || []}
            uniqueRowId={"uniqueID"}
            sideBar={false}
            pagination={false}
            tableId={`${props.depthOrChoice}-table`}
          />
        </div>
      )}
    </>
  );
};

const mapStateToProps = (state) => {
  return {
    planDetails: planDashboardServiceActions.planDetailsDataSelector(state),
    depthChoiceData: planDepthChoiceServiceActions.depthChoiceDataSelector(
      state
    ),
    levelsJson: planDashboardServiceActions.levelsJsonDataSelector(state),
    screenConfiguration:
      state.assortsmartReducer.commonAssortReducer.screenConfiguration,
    columnHeaderJson: planDashboardServiceActions.columnHeaderJsonSelector(
      state
    ),
  };
};

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators(
    {
      getDepthChoiceData,
      set2_2_Loader,
      updateDepthChoiceData,
      addSnack,
    },
    dispatch
  );
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(DepthOrChoiceComponent));
