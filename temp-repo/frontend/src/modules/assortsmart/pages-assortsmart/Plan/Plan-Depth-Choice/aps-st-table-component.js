import React, { useState, useEffect, useRef, useCallback } from "react";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";
import { Button } from "@mui/material";
import { cloneDeep, groupBy, uniqBy, isEmpty } from "lodash";
import { useHistory } from "react-router";
//import agGridColumnFormatter from "Utils/agGrid/column-formatter";
//import { apsStColumn } from "./aps-st-col-config"
import { getColumnsAg } from "core/actions/tableColumnActions";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import { addSnack } from "core/actions/snackbarActions";
import {
  getApsStData,
  setApsStData,
  set2_2_Loader,
  updateL3ApsStData,
  updateClusterApsStData,
  optimizeApsSt,
  optimizeDepthChoice,
} from "../../../services-assortsmart/Plan/Plan-Depth-Choice/depth-choice-service";
import {
  calculateNoOfWeeks,
  getPlanPayload,
  isWholesalePlan,
  attributeFormatter,
  isDropPlan,
  isChannelMultiple,
  externalFilterLevelsChannelSubChannel,
  scrollIntoView,
  getDefaultChannelValue,
} from "../../../utils-assortsmart/utilityFunctions";
import {
  getClusterUpdatePayload,
  getL3UpdatePayload,
} from "./depth-choice-functions";
import { updatePlanAPI } from "modules/assortsmart/services-assortsmart/Clustering/Cluster-Input/cluster-input-service";
import PlanDropTabViewComponent from "../plan-drop-tab-view-component";
import AgGridTable from "core/Utils/agGrid";
import {
  getOptimizeApsStPayload,
  handleRegWksValidation,
  optimizeDepthChoicePayload,
  updateApsstPayload,
} from "./aps-st-table-functions";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import * as planDepthChoiceServiceActions from "modules/assortsmart/services-assortsmart/Plan/Plan-Depth-Choice/depth-choice-service";
import { bindActionCreators } from "redux";
import SetallForm from "core/Utils/agGrid/setall-form";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { groupByCustom } from "core/Utils/formatter";

const ApsStComponent = (props) => {
  const [apsStColumns, setApsStColumns] = useState([]);
  const [apsStTableData, setApsStTableData] = useState([]);
  const [groupedDrops, setGroupedDrops] = useState(null);
  const [apsTableColumns, setApsTableColumns] = useState({});
  const [showSetAllPopup, setShowSetAllPopup] = useState(false);
  const [clusterCodes, setClusterCodes] = useState([]);
  const [isValueChanged, setIsValueChanged] = useState(false);

  const history = useHistory();
  const isView = history.location.pathname.includes("view");
  const classes = useStyles();
  const apsTableInstance = useRef({});
  let formData = props.formData;
  const coreChoice = useRef({});

  useEffect(() => {
    let planData = props.planDetails?.data;
    const fetchData = async () => {
      props.set2_2_Loader(true);
      try {
        let planCode = props.planDetails?.data?.plan_code;
        let AssortNLE = parseInt(localStorage.getItem("AssortNLE"));
        if (
          props.initialLoadDepthChoice &&
          !props.fromDashboardScreen_2_2 &&
          planCode !== AssortNLE 
        ) {
          let payload = getOptimizeApsStPayload(props);
          let apsStResponse = await props.optimizeApsSt(
            payload,
            props.screenConfiguration?.common?.endpoint_project_name || "assort"
          );
          if (apsStResponse?.data?.status) {
            fetchApsSt(planData);
          }
        } else {
          fetchApsSt(planData);
        }
      } catch (err) {
        props.set2_2_Loader(false);
        props.addSnack({
          message: "Fetching APS ST details failed",
          options: {
            variant: "error",
          },
        });
      }
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    formData = props.formData;
    if (apsTableInstance?.current?.api) {
      apsTableInstance.current.api.onFilterChanged();
    }
  }, [props.formData, apsTableInstance]);

  useEffect(() => {
    coreChoice.current = props.coreChoice;
    if (
      isDropPlan(
        props.planDetails?.data,
        `${props.screenConfiguration?.common?.drop_key || "drops"}_count`
      )
    ) {
      if (!isEmpty(apsTableColumns)) {
        let tableColumns = cloneDeep(apsTableColumns);
        const dropKeys = Object.keys(groupedDrops);
        //update "All Door CC" column is_hidden property false/true when all door cc is enabled/disabled for the selected drop
        dropKeys.forEach((drop) => {
          if (drop === props.selectedDropData) {
            let cols = cloneDeep(tableColumns["instance" + drop.split(" ")[1]]);
            cols.forEach((col) => {
              if (col.accessor === "all_door_cc") {
                col.is_hidden = !props.coreChoice ? true : false;
              }
            });
            tableColumns["instance" + drop.split(" ")[1]] = cols;
          }
        });
        setApsTableColumns(tableColumns);
      }
    } else {
      //Update "All Door CC" column is_hidden property for non-drop plans
      if (apsStColumns.length) {
        const apstTableCols = cloneDeep(apsStColumns);
        apstTableCols.forEach((col) => {
          if (col.accessor === "all_door_cc") {
            col.is_hidden = !props.coreChoice ? true : false;
          }
          setApsStColumns(apstTableCols);
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.coreChoice]);

  useEffect(() => {
    if (
      apsStTableData?.length &&
      isDropPlan(
        props.planDetails?.data,
        `${props.screenConfiguration?.common?.drop_key || "drops"}_count`
      )
    ) {
      let drops = groupBy(
        apsStTableData,
        props.screenConfiguration?.common?.drop_key || "drop"
      );
      setGroupedDrops(drops);
      let tableColumns = {},
        dropKeys = Object.keys(drops);
      //Setting aps table columns for each drop instance
      dropKeys.forEach((drop) => {
        tableColumns["instance" + drop.split(" ")[1]] = apsStColumns;
      });
      setApsTableColumns(tableColumns);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apsStTableData]);

  useEffect(() => {
    if (
      apsStTableData &&
      props.selectedDropData &&
      apsTableInstance?.current?.api &&
      isDropPlan(
        props.planDetails?.data,
        `${props.screenConfiguration?.common?.drop_key || "drops"}_count`
      )
    ) {
      var hardcodedFilter = {
        [props.screenConfiguration?.common?.drop_key || "drop"]: {
          type: "equals",
          filter: props.selectedDropData,
        },
      };
      apsTableInstance.current.api.setFilterModel(hardcodedFilter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apsTableInstance?.current?.api, props.selectedDropData, apsStTableData]);

  useEffect(() => {
    if (props.checkSetAllValidation) {
      setAllValidate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.checkSetAllValidation]);

  useEffect(() => {
    if (props.callUpdateApsData) {
      //NOTE: Will uncomment in case it cause some other issue
      // props.setSelectedDropData(null);
      updateApsSt();
    }
  }, [props.callUpdateApsData]);

  useEffect(() => {
    if (!showSetAllPopup) {
      props.setCheckSetAllValidation(false);
    }
  }, [showSetAllPopup]);

  const fetchApsSt = async (planData) => {
    props.set2_2_Loader(true);
    let payload = getPlanPayload(planData, props.planLevels);
    if (isChannelMultiple(props.planDetails?.data)) {
      payload.filters.push({
        attribute_name: "channel",
        value: [formData?.channel_list || getDefaultChannelValue([], planData)],
        prefix: "levels",
        operator: "in",
      });
    }
    let response = await props.getApsStData(
      payload,
      props.screenConfiguration?.common?.endpoint_project_name || "assort"
    );
    let apsData = response?.data?.data;
    if (apsData?.data?.length) {
      let apstTableCols = [];
      let allDoorCcEnabled = uniqBy(
        response?.data?.data?.data,
        "all_door_cc_enabled"
      );
      allDoorCcEnabled = allDoorCcEnabled[0]?.all_door_cc_enabled;
      if (apsData?.columns?.length) {
        let cols = agGridColumnFormatter(
          apsData?.columns,
          props.columnHeaderJson,
          {},
          true,
          null,
          history.location.pathname.includes("view")
        );
        apstTableCols = cloneDeep(cols);
        apstTableCols.forEach((col) => {
          if (
            col.accessor === props.screenConfiguration?.common?.drop_key ||
            "drop"
          ) {
            col.filter = "agTextColumnFilter";
          }
          if (col.accessor === "reg_wks") {
            col.sub_headers.forEach((sub_col) => {
              if (sub_col.accessor === "reg_wks_ty") {
                sub_col["isDataValidate"] = true;
              }
            });
          }
          if (col.accessor === "all_door_cc") {
            col.is_hidden = !props.coreChoice ? true : false;
          }
        });
        setApsStColumns(apstTableCols);
        props.setCoreChoice(props.coreChoice);
      }
      apsData.data.forEach((item) => {
        item.reg_wks_ty = item.avg_wk_cnt_ty;
        item.reg_wks_ly = item.avg_wk_cnt_ly;
      });
    }
    props.setApsStData(response?.data?.data);
    let tableData = [];
    let drop = props.screenConfiguration?.common?.drop_key || "drop";
    let groupedData = groupByCustom({
      Group: response?.data?.data?.data,
      By: ["l3_name", drop],
    });
    let clusterData = [];
    groupedData.map((obj) => {
      let tempData = { ...obj[0] };
      clusterData = [];
      obj.map((attri_value) => {
        let clusterCode = (attri_value?.["cluster_code"]).toLowerCase();
        tempData[`aps_${clusterCode}_ly`] =
          attri_value.attribute_value["aps_ly"];
        tempData[`aps_${clusterCode}_ty`] =
          attri_value.attribute_value["aps_ty"];
        tempData[`st_${clusterCode}_ly`] = attri_value.attribute_value["st_ly"];
        tempData[`st_${clusterCode}_ty`] =
          attri_value.attribute_value["st_ty"] * (isView ? 1 : 100);
        tempData[`reg_wks_${clusterCode}_ly`] =
          attri_value.attribute_value["avg_wk_cnt_ly"];
        tempData[`reg_wks_${clusterCode}_ty`] = Math.round(
          attri_value.attribute_value["avg_wk_cnt_ty"]
        );
        tempData[`qty_${clusterCode}_ty`] =
          attri_value.attribute_value["qty_ty"];
        tempData[`moq_${clusterCode}`] = attri_value.attribute_value["moq"];
        tempData[`plan_clu_aps_id_${clusterCode}`] =
          attri_value.plan_clu_aps_id;
        tempData[`receipt_index_${clusterCode}`] =
          attri_value.attribute_value["receipt_index"];
        tempData[
          props.screenConfiguration?.common?.drop_key || "drop"
        ] = attributeFormatter(
          attri_value[props.screenConfiguration?.common?.drop_key || "drop"]
        );
        tempData["aps_total_ly"] = attri_value["aps_ly"];
        tempData["aps_total_ty"] = attri_value["aps_ty"];
        tempData["st_total_ly"] = attri_value["st_ly"];
        tempData["st_total_ty"] = attri_value["st_ty"] * (isView ? 1 : 100);
        tempData.uniqID =
          attri_value.l3_name + attri_value.l2_name + attri_value.l1_name;
        clusterData.push(clusterCode);
      });
      tableData.push(tempData);
      setClusterCodes(clusterData);
    });
    getTotalRegWeeksOfRow(tableData, clusterData);
    setApsStTableData(tableData);
    props.setParameterTableData(tableData);
    if (!props.showDepthChoiceComponent) {
      props.set2_2_Loader(false);
    }
  };

  const onUpdateApsSt = () => {
    props.setDisableNext(true);
    props.showDepthChoiceTable(false);
    props.setShowDepthChoiceComponent(false);
    props.setEnableRecalculateChoiceBtn(true);
    props.setEnableRecalculateDepthBtn(true);
    scrollIntoView("choice-table");
    props.setInitialLoadWedge(true);
    props.setInitialLoadFinalize(true);
    props.setFromDashboardScreen_2_3(false);
    props.setFromDashboardScreen_2_4(false);
    updateApsSt(true);
  };

  useEffect(() => {
    if (props.isAPSsave) {
      updateApsSt();
      props.setIsSave(false);
    }
  }, [props.isAPSsave]);

  const updateApsSt = async (callOptimizeDepthChoice) => {
    props.set2_2_Loader(true);
    let details = props.planDetails.data;
    let payloadData = [];
    if (props.apsStData?.data?.length) {
      payloadData = updateApsstPayload(
        props.apsStData?.data,
        apsTableInstance,
        clusterCodes,
        props
      );
    }
    if (payloadData?.length) {
      let deltaTY = getClusterUpdatePayload(
        payloadData,
        details.plan_code.toString(),
        props.planLevels,
        props.screenConfiguration
      );
      let L3Payload = getL3UpdatePayload(
        payloadData,
        details.plan_code.toString()
      );
      props.setCallUpdateApsData(false);
      try {
        let clusterUpdateResponse = await props.updateClusterApsStData(
          {
            number_of_weeks: calculateNoOfWeeks(
              details.selling_period_sdate,
              details.selling_period_edate
            ),
            cluster_aps_st_data: deltaTY,
            is_value_changed: isValueChanged,
          },
          props.screenConfiguration?.common?.endpoint_project_name || "assort"
        );
        let L3UpdateResponse = await props.updateL3ApsStData(
          {
            cluster_l3_aps_st_data: [...L3Payload],
            is_value_changed: isValueChanged,
          },
          props.screenConfiguration?.common?.endpoint_project_name || "assort"
        );
        if (
          clusterUpdateResponse.status &&
          L3UpdateResponse.status &&
          callOptimizeDepthChoice
        ) {
          setIsValueChanged(false);
          let planData = props.planDetails?.data;
          fetchApsSt(planData);
          let payload = optimizeDepthChoicePayload(planData, props);
          let optimizeDepthChoiceResponse = await props.optimizeDepthChoice(
            payload,
            props.screenConfiguration?.common?.endpoint_project_name || "assort"
          );
          if (optimizeDepthChoiceResponse.status) {
            props.setFromDashboardScreen_2_2(true);
            props.showDepthChoiceTable(true);
          } else {
            props.set2_2_Loader(false);
          }
        } else if (clusterUpdateResponse.status && L3UpdateResponse.status) {
          setIsValueChanged(false);
          let planData = props.planDetails?.data;
          fetchApsSt(planData);
          props.set2_2_Loader(false);
        } else {
          props.addSnack({
            message: `Something went wrong`,
            options: {
              variant: "error",
            },
          });
          props.set2_2_Loader(false);
        }
      } catch (err) {
        props.addSnack({
          message: `Something went wrong`,
          options: {
            variant: "error",
          },
        });
        props.set2_2_Loader(false);
      }
    }
  };

  const updateApsTableData = (
    _,
    row,
    column,
    isChanged,
    value,
    initialValue
  ) => {
    let colId = column.colId;
    let colData = row[colId];
    setIsValueChanged(true);
    if (
      colId === "max_cc" &&
      parseInt(colData) < parseInt(row.all_door_cc) &&
      coreChoice.current
    ) {
      props.addSnack({
        message: `Max ${styleOrChoice} count cannot be lesser than All door ${styleOrChoice} count`,
        options: {
          variant: "error",
        },
      });
    }
    if (colId === "min_cc" && parseInt(colData) > parseInt(row.max_cc)) {
      props.addSnack({
        message: `Min ${styleOrChoice} count cannot be greater than Max ${styleOrChoice} count`,
        options: {
          variant: "error",
        },
      });
    }
    let isValid = true;
    if (colId.includes("reg_wks_")) {
      let data = {
        reg_wks_ty: value,
      };
      isValid = handleRegWksValidation(data, props, props.planDetails);
      if (!isValid) {
        row[colId] = initialValue;
      }
    }
    let tempData = [];
    if (colId.includes("reg_wks_") && colId !== "reg_wks_total_ty" && isValid) {
      getTotalRegWeeksOfRow([row], clusterCodes);
    } else {
      apsTableInstance.current.api.forEachNode((eachRow) => {
        eachRow = eachRow.data;
        if (eachRow.plan_clu_aps_id === row.plan_clu_aps_id) {
          if (colId === "reg_wks_total_ty" && isValid) {
            clusterCodes.forEach((code) => {
              eachRow[`reg_wks_${code}_ty`] = colData;
            });
          }
          if (colId === "aps_total_ty") {
            clusterCodes.forEach((code) => {
              eachRow[`aps_${code}_ty`] =
                initialValue && initialValue > 0
                  ? (colData / initialValue) * eachRow[`aps_${code}_ty`]
                  : colData;
            });
          }
          if (colId.includes("aps_") && colId !== "aps_total_ty") {
            let num = 0;
            let totalClusterQty = 0;
            clusterCodes.forEach((code) => {
              num = num + eachRow[`aps_${code}_ty`] * eachRow[`qty_${code}_ty`];
              totalClusterQty = totalClusterQty + eachRow[`qty_${code}_ty`];
            });
            eachRow["aps_total_ty"] = num / totalClusterQty;
          }
          if (colId.includes("st_") && colId !== "st_total_ty") {
            let num = 0;
            let totalClusterQty = 0;
            clusterCodes.forEach((code) => {
              num = num + eachRow[`st_${code}_ty`] * eachRow[`qty_${code}_ty`];
              totalClusterQty = totalClusterQty + eachRow[`qty_${code}_ty`];
            });
            eachRow["st_total_ty"] = num / totalClusterQty;
          }
          if (colId === "st_total_ty") {
            if (colData < 0 || colData > 100) {
              props.addSnack({
                message: `ST should be more than 0 and less than 100`,
                options: {
                  variant: "error",
                },
              });
            } else {
              clusterCodes.forEach((code) => {
                eachRow[`st_${code}_ty`] = colData;
              });
            }
          }
        }
        tempData.push(eachRow);
      });
      setApsStTableData(tempData);
    }
    apsTableInstance.current.api.refreshCells({
      force: true,
      suppressFlash: false,
    });
  };

  const getTotalRegWeeksOfRow = (data, uniqueClusterList) => {
    //This function returns highest value in that row
    data.forEach((row) => {
      row = getMaxRegWeeks(row, uniqueClusterList);
    });
    return data;
  };

  const getMaxRegWeeks = (row, uniqueClusterList) => {
    let tempTY = [],
      tempLY = [];
    uniqueClusterList.forEach((cluster) => {
      if (row[`reg_wks_${cluster}_ty`]) {
        tempTY.push(row[`reg_wks_${cluster}_ty`]);
      } else {
        tempTY.push(0);
      }
      if (row[`reg_wks_${cluster}_ly`]) {
        tempLY.push(row[`reg_wks_${cluster}_ly`]);
      } else {
        tempLY.push(0);
      }
    });
    row.reg_wks_total_ty = Math.max(...tempTY);
    row.reg_wks_total_ly = Math.max(...tempLY);
    return row;
  };

  const loadTableInstance = (params) => {
    apsTableInstance.current = params;
    if (
      isDropPlan(
        props.planDetails?.data,
        `${props.screenConfiguration?.common?.drop_key || "drops"}_count`
      )
    ) {
      let selectedDrop = Object.keys(
        groupBy(
          apsStTableData,
          props.screenConfiguration?.common?.drop_key || "drop"
        )
      )[0];
      var hardcodedFilter = {
        [props.screenConfiguration?.common?.drop_key || "drop"]: {
          type: "equals",
          filter: selectedDrop,
        },
      };
      apsTableInstance.current.api.setFilterModel(hardcodedFilter);
    }
  };

  const onSetAllApply = (data) => {
    let rowNodes = apsTableInstance.current.api.getSelectedNodes();
    rowNodes.forEach((item) => {
      const rowNode = apsTableInstance.current.api.getRowNode(item.id);
      Object.keys(data).forEach((attribute) => {
        if (data[attribute] !== undefined) {
          if (attribute.includes("total_ty")) {
            let col = attribute.split("total_ty")?.[0];
            Object.keys(item?.data).map((key) => {
              if (
                key.includes("_ty") &&
                key.includes(col) &&
                !(key.includes(`${col}ty`) || key.includes(`${col}total_ty`))
              ) {
                rowNode.setDataValue(key, data[attribute]);
              }
            });
          }
          rowNode.setDataValue(attribute, data[attribute]);
        }
      });
    });
    apsTableInstance.current.api.flashCells({ rowNodes });
    apsTableInstance.current.api.deselectAll();
    props.setCheckSetAllValidation(false);
    setShowSetAllPopup(false);
  };

  const isExternalFilterPresent = useCallback(() => {
    // if formData is not empty, then we are filtering
    let levelsFilter = false;
    Object.keys(props.levelsJson).forEach((level) => {
      if (props.planDetails?.data?.[level]?.length > 1)
        return (levelsFilter = true);
    });
    return isWholesalePlan(props.planDetails?.data) || levelsFilter
      ? true
      : false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doesExternalFilterPass = useCallback(
    //whenever channel or sub channel changes data get filtered here
    (node) => {
      return externalFilterLevelsChannelSubChannel(
        node,
        apsStTableData,
        formData,
        props.planDetails?.data,
        props.levelsJson
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [formData, apsStTableData]
  );

  const setAllValidate = () => {
    if (apsTableInstance.current.api.getSelectedNodes().length) {
      setShowSetAllPopup(true);
    } else {
      props.setCheckSetAllValidation(false);
      props.addSnack({
        message: `Please select at least one ${props.columnHeaderJson["l3_name"]}`,
        options: {
          variant: "error",
        },
      });
    }
  };
  const getEditableNothiddenCols = (columns) => {
    let ediatbleCols = [];
    columns.forEach((data) => {
      if (data.sub_headers?.length > 0) {
        ediatbleCols.push(...getEditableNothiddenCols(data.sub_headers));
      } else if (
        !data.is_hidden &&
        data.is_editable &&
        (data.column_name.includes("total_ty") ||
          data.column_name === "max_cc" ||
          data.column_name === "cc_threshold" ||
          data.column_name === "moq")
      ) {
        ediatbleCols.push(data);
      }
    });
    return ediatbleCols;
  };
  let styleOrChoice =
    props.screenConfiguration?.common.plan_step_names_assort?.["2.2"] ===
    "Depth & Style"
      ? "Style"
      : "choice";
  const getSetAllFields = () => [...getEditableNothiddenCols(apsStColumns)];
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
      {showSetAllPopup &&
        apsStTableData?.length > 0 &&
        !history.location.pathname.includes("view") && (
          <SetallForm
            rowdata={apsStTableData}
            selectedRowIds={apsTableInstance.current.api.getSelectedNodes()}
            onApply={onSetAllApply}
            fields={getSetAllFields()}
            handleModalClose={setShowSetAllPopup}
            handleValidation={(formData, propsData) =>
              handleRegWksValidation(
                formData,
                propsData,
                props.planDetails,
                props.coreChoice
              )
            }
          />
        )}
      {apsStTableData?.length > 0 && apsStColumns?.length > 0 && (
        <div>
          <AgGridTable
            columns={
              isDropPlan(
                props.planDetails?.data,
                `${
                  props.screenConfiguration?.common?.drop_key || "drops"
                }_count`
              )
                ? props.selectedDropData &&
                  (apsTableColumns[
                    "instance" + props.selectedDropData.split(" ")[1]
                  ] ||
                    [])
                : apsStColumns
            }
            rowdata={apsStTableData || []}
            loadTableInstance={loadTableInstance}
            sizeColumnsToFitFlag
            skipAutoSizeColumn
            showSetAll={false}
            onBlur={updateApsTableData}
            selectAllHeaderComponent={true}
            uniqueRowId={"plan_l3_aps_id"}
            isExternalFilterPresent={isExternalFilterPresent}
            doesExternalFilterPass={doesExternalFilterPass}
            handleValidation={(formData, propsData) =>
              handleRegWksValidation(
                formData,
                propsData,
                props.planDetails,
                props.coreChoice
              )
            }
            sideBar={false}
            pagination={false}
            tableId={"aps-st-table"}
            adjustTableHeight={true}
          />
          {!history.location.pathname.includes("view") && (
            <div className={classes.rightAlignButtonAssort}>
              <Button
                variant="contained"
                color="primary"
                className={classes.button}
                id="optimize-depth-choice"
                onClick={() => onUpdateApsSt()}
              >
                Optimize
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );
};

const mapStateToProps = (state) => {
  return {
    apsStData: planDepthChoiceServiceActions.apsStDataSelector(state),
    planLevels: planDashboardServiceActions.planLevelsDataSelector(state),
    planDetails: planDashboardServiceActions.planDetailsDataSelector(state),
    columnHeaderJson: planDashboardServiceActions.columnHeaderJsonSelector(
      state
    ),
    screenConfiguration:
      state.assortsmartReducer.commonAssortReducer.screenConfiguration,
    levelsJson: planDashboardServiceActions.levelsJsonDataSelector(state),
  };
};

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators(
    {
      getApsStData,
      setApsStData,
      set2_2_Loader,
      updateL3ApsStData,
      updateClusterApsStData,
      optimizeApsSt,
      optimizeDepthChoice,
      updatePlanAPI,
      addSnack,
    },
    dispatch
  );
};
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(ApsStComponent));
