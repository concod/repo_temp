import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";
import AgGridTable from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { addSnack } from "core/actions/snackbarActions";
import {
  set2_3_Loader,
  getWedgeData,
  updateWedgeData,
  getReOptimizeWedge,
} from "../../../services-assortsmart/Plan/Plan-Wedge/plan-wedge-service";
import {
  assortAgGridCustomCellRenderer,
  getPlanPayload,
  isDropPlan,
  scrollIntoView,
} from "modules/assortsmart/utils-assortsmart/utilityFunctions";
import { cloneDeep, find, isArray } from "lodash";
import {
  displaySnackMessage,
  editStyleLevelTotalUnits,
  formatStyleTableDataGrouping,
  wedgeDataPlotting,
} from "./plan-wedge-functions";
import PlanDropTabViewComponent from "../plan-drop-tab-view-component";
import { Plan } from "modules/assortsmart/constants-assortsmart/stringContants";
import { Button } from "@mui/material";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import SortComponent from "core/Utils/agGrid/column-component/sortComponent";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import * as planWedgeServiceActions from "modules/assortsmart/services-assortsmart/Plan/Plan-Wedge/plan-wedge-service";
import { bindActionCreators } from "redux";

const StyleLevelWedgeComponent = (props) => {
  const [columns, setColumns] = useState([]);
  const [styleWedgeTableData, setStyleWedgeTableData] = useState([]);
  const [attributeList, setAttributeList] = useState([]);
  const [uniqueClusterData, setUniqueClusterData] = useState([]);
  const [isEdited, setEdited] = useState(false);
  const [callImageGen, setCallImageGen] = useState(false);
  const AGInstance = useRef({});
  const classes = useStyles();
  let filters = useRef({});
  let propsRef = useRef({});
  let selectedPageIndex = useRef(0);
  let styleWedgeTableDataRef = useRef([]);

  useEffect(() => {
    propsRef.current = props;
    styleWedgeTableDataRef.current = styleWedgeTableData;
  }, [
    props.planMetricsData?.[0]?.attribute_list,
    props.wedgeAttributeData,
    props.planDetails?.data,
    props.finalStyleWedgeData,
    props.uniqueClusterList,
    props.screenConfiguration,
    styleWedgeTableData,
  ]);

  useEffect(() => {
    if (props.selectedDropData?.length) {
      filters.current = {
        ...filters.current,
        [props.screenConfiguration?.common?.drop_key || "drop"]: [
          props.selectedDropData,
        ],
      };
    }
    if (props.selectedFlow?.value) {
      filters.current = {
        ...filters.current,
        [props.screenConfiguration?.common?.flow_key || "flow"]: [
          props.selectedFlow?.value,
        ],
      };
    }
  }, [props.selectedDropData, props.selectedFlow]);

  useEffect(() => {
    if (AGInstance?.current?.api) {
      AGInstance.current.api.onFilterChanged();
    }
  }, [props.selectedFlow, AGInstance]);

  useEffect(() => {
    if (props.wedgeAttributeData?.length) {
      let tempAttributeList = props.wedgeAttributeData.map((attrJson) => {
        return `attributes_${attrJson.attribute_name}`;
      });
      tempAttributeList.push(...["lock_choice", "flow_to_next_season"]);
      setAttributeList(tempAttributeList);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.wedgeAttributeData]);

  useEffect(() => {
    if (props.callUpdateStyleWedge) {
      callUpdateStyleWedgeData(false, true);
    }
  }, [props.callUpdateStyleWedge]);

  useEffect(() => {
    if (
      (props.selectedL1FilterValue &&
        props.selectedL2FilterValue &&
        props.selectedL3FilterValue &&
        attributeList?.length) ||
      props.updateStyleWedge
    ) {
      let selectedL3 = isArray(props.selectedL3FilterValue)
        ? props.selectedL3FilterValue.map((obj) => obj.value)
        : [props.selectedL3FilterValue?.value];
      filters.current = {
        ...filters.current,
        selectedL1FilterValue: props.selectedL1FilterValue?.value,
        selectedL2FilterValue: props.selectedL2FilterValue?.value,
        selectedL3FilterValue: selectedL3,
      };
      if (!props.callUpdateStyleWedge) {
        AGInstance.current.api?.refreshServerSideStore({ purge: true });
      }
    }
  }, [
    props.selectedL1FilterValue,
    props.selectedL2FilterValue,
    props.selectedL3FilterValue,
    attributeList,
    props.updateStyleWedge,
  ]);

  useEffect(() => {
    if (props.styleLevelColumn?.length) {
      let styleColumns = setOptionsForAttribute(
        cloneDeep(props.styleLevelColumn)
      );
      let column = agGridColumnFormatter(styleColumns, props.columnHeaderJson);
      setColumns(column);
    }
  }, [props.styleLevelColumn]);

  useEffect(() => {
    if (styleWedgeTableData?.length && uniqueClusterData?.length) {
      props.setUniqueClusterListWedge(uniqueClusterData);
      props.receiveWedgeTableData(
        styleWedgeTableData,
        uniqueClusterData,
        "style_level"
      );
    }
  }, [styleWedgeTableData, uniqueClusterData, AGInstance]);

  const manualCallBack = async (manualbody, pageIndex, params) => {
    if (
      !(
        filters.current.selectedL1FilterValue &&
        filters.current.selectedL2FilterValue &&
        filters.current.selectedL3FilterValue?.length
      )
    ) {
      return {
        data: [],
        totalCount: 0,
      };
    }
    if (selectedPageIndex?.current !== pageIndex) {
      await callUpdateStyleWedgeData(false, false);
      selectedPageIndex.current = pageIndex;
    }
    let limit;
    let planData = cloneDeep(props.planDetails?.data);
    planData.l1_name = [
      filters.current.selectedL1FilterValue || planData["l1_name"][0],
    ];
    planData.l2_name = [
      filters.current.selectedL2FilterValue || planData["l2_name"][0],
    ];
    planData.l3_name = filters.current.selectedL3FilterValue;
    let payload = getPlanPayload(planData, props.planLevels);
    payload.filters.push(
      {
        attribute_name: "l3_name",
        value: planData["l3_name"],
        prefix: "levels",
        operator: "in",
      },
      {
        attribute_name: props.screenConfiguration?.common?.drop_key || "drop",
        value: filters.current[
          props.screenConfiguration?.common?.drop_key || "drop"
        ]
          ? filters.current[
              props.screenConfiguration?.common?.drop_key || "drop"
            ]
          : isDropPlan(
              propsRef?.current?.planDetails?.data,
              `${
                props.screenConfiguration?.common?.drop_key.includes("drop")
                  ? "drops"
                  : props.screenConfiguration?.common?.drop_key || "drops"
              }_count`
            )
          ? [
              `${
                props.screenConfiguration?.common?.drop_key.includes("drop")
                  ? "drops"
                  : props.screenConfiguration?.common?.drop_key || "drops"
              }_1`,
            ]
          : ["-"],
        prefix: "levels",
        operator: "in",
      },
      {
        attribute_name: props.screenConfiguration?.common?.flow_key || "flow",
        value: filters.current[
          props.screenConfiguration?.common?.flow_key || "flow"
        ]
          ? filters.current?.[
              props.screenConfiguration?.common?.flow_key || "flow"
            ]
          : ["-"],
        prefix: "levels",
        operator: "in",
      },
      {
        attribute_name: "wedge_level",
        value: ["style_level"],
        prefix: "levels",
        operator: "in",
      }
    );
    pageIndex = pageIndex || 0;
    limit =
      10 * 3 * propsRef?.current?.planMetricsData?.[0]?.cluster_code?.length;
    let sort = manualbody?.sort?.length
      ? manualbody.sort
      : [
          {
            column: "order_of_style",
            order: "asc",
          },
          {
            column: "order_of_choice",
            order: "asc",
          },
        ];
    const reqBody = {
      filters: payload.filters,
      pagination: {
        sort: sort,
        search: [],
        range: [],
        limit: {
          limit: limit,
          page: pageIndex + 1,
        },
      },
    };

    try {
      props.set2_3_Loader(true);
      pageIndex = pageIndex || 0;
      let res = await props.getWedgeData(
        reqBody,
        props.screenConfiguration?.common?.endpoint_project_name || "assort",
        props.planDetails?.data?.plan_code
      );
      props.set2_3_Loader(false);
      props.setStyleLevelColumn(res?.data?.data?.columns);
      res?.data?.data?.data.map((wedgeData) => {
        wedgeData["style_id"] = wedgeData?.attribute_value?.style_id;
      });
      let data = wedgeDataPlotting(
        props,
        res.data?.data?.data,
        propsRef?.current?.planMetricsData?.[0]?.attribute_list,
        propsRef?.current?.wedgeAttributeData,
        propsRef?.current?.planDetails?.data,
        null,
        null,
        "style_level"
      );
      let uniqueClusterData = res.data?.data?.data
        .map((p) => p.cluster_display_name)
        .filter(
          (cluster_display_name, index, arr) =>
            arr.indexOf(cluster_display_name) === index
        )
        .sort();
      data.forEach((data) => {
        data["unique_id"] =
          data?.style_id +
          data[`${props.screenConfiguration?.common?.flow_key || "flow"}_name`];
        data["style_carryover_new"] = data.style_carryover_flag;
        data["style_color_carryover"] = data.choice_carryover_flag;
      });
      setUniqueClusterData(uniqueClusterData);
      setStyleWedgeTableData(cloneDeep(data));
      data = removeSubrows(data);
      let rowData = formatStyleTableDataGrouping(data);
      props.setWedgeStyleTableData(data);
      return {
        data: rowData,
        totalCount: Math.round((res?.data?.data?.total_records / limit) * 10),
      };
    } catch (error) {
      //Error handling
      displaySnackMessage("Something went wrong", "error", props.addSnack);
      props.set2_3_Loader(false);
      return {
        data: [],
        totalCount: 0,
      };
    }
  };

  const setOptionsForAttribute = (colArray) => {
    colArray.forEach((col) => {
      if (
        col.column_name === "lock_choice" ||
        col.column_name === "delete_choice" ||
        col.column_name === "all_door_choice"
      ) {
        col.options = props.generateOptions(Plan.__Lock_Choice_Option);
      } else if (attributeList.includes(col.column_name)) {
        let col_key = col.column_name.split("attributes_");
        let attributeOptions =
          find(props.wedgeAttributeData || [], {
            attribute_name: col_key[1],
          }) || [];
        col.options = props.generateOptions(attributeOptions?.attribute_value);
      }
      if (col.sub_headers?.length) {
        setOptionsForAttribute(col.sub_headers);
      }
    });
    return colArray;
  };

  const updateWedgeTableData = async (
    e,
    data,
    column,
    isChanged,
    value,
    initialValue,
    cellData,
    initValue,
    previousValue
  ) => {
    let newValue = initValue;
    let columnId = column.colDef.accessor;
    let oldValue = initialValue;
    let row = data;
    let tempData = [];
    let channelQuantity = {};
    let channelColumnId = columnId.includes("_forecasted_qty")
      ? columnId.split("_forecasted_qty")[0]
      : columnId.includes("clusters_")
      ? columnId.split("clusters_")?.[1].split(" ")?.[0]
      : "";
    props.setIsStyleWedgeChanged(true);
    AGInstance.current.api.forEachNode((eachRow, index) => {
      eachRow = eachRow.data;
      let forecastedQtyEdited = false;
      if (
        !row?.subRows &&
        row.style_id === eachRow.style_id &&
        eachRow.subRows
      ) {
        eachRow.subRows.map((subRow) => {
          if (subRow.uniqueID === row.uniqueID) {
            if (columnId === "st") {
              subRow["st"] = newValue < 0 ? 0 : newValue > 100 ? 100 : newValue;
              eachRow["st"] =
                newValue < 0 ? 0 : newValue > 100 ? 100 : newValue;
            } else {
              subRow[columnId] = newValue;
            }
          }
        });
        if (columnId === "color_count_ty") {
          eachRow?.subRows.forEach((subRow) => {
            if (subRow.choice_carryover_flag === "New") {
              subRow["is_color_count_changed"] = true;
            }
          });
        } else if (
          columnId.includes("_total_qty") ||
          columnId === "st" ||
          columnId.includes("_forecasted_qty") ||
          columnId.includes("clusters_")
        ) {
          eachRow?.subRows.forEach((subRow) => {
            if (subRow.choice_carryover_flag === "New") {
              subRow["is_qty"] = true;
            }
          });
        } else {
          eachRow["is_other_attribute_changed"] = true;
        }
      }
      if (eachRow.uniqueID === row.uniqueID) {
        if (oldValue !== newValue) {
          setEdited(true);
        }
        // Formulae:  total_qty * st = forecasted_qty
        if (columnId.includes("_forecasted_qty") || columnId === "st") {
          oldValue = eachRow[`${channelColumnId}_total_qty`];
          let totalQty = columnId.includes("_forecasted_qty")
            ? (newValue / eachRow.st) * 100
            : newValue
            ? (eachRow[`${channelColumnId}_forecasted_qty`] / newValue) * 100
            : 0;
          if (totalQty === 0) {
            eachRow[columnId] = initialValue;
            displaySnackMessage(
              `Sales units and ST%, both cannot be 0`,
              "error",
              props.addSnack
            );
            return;
          }
          eachRow[`${channelColumnId}_total_qty`] = totalQty || 0;
          newValue = totalQty;
          forecastedQtyEdited = true;
          eachRow["is_other_attribute_changed"] = true;
        }
        if (columnId.includes("_total_qty") || forecastedQtyEdited) {
          let updatedClusterValue = editStyleLevelTotalUnits(
            props,
            eachRow,
            oldValue,
            channelColumnId
          );
          Object.keys(updatedClusterValue).forEach((key) => {
            return (eachRow[key] = updatedClusterValue[key]);
          });
          eachRow["is_qty"] = true;
        } else if (columnId.includes("attributes_")) {
          let getInitialStyleRow = styleWedgeTableDataRef.current.filter(
            (obj) => obj.style_id === eachRow.style_id
          );
          if (getInitialStyleRow?.length && getInitialStyleRow?.[0]?.subRows) {
            getInitialStyleRow[0].subRows.map((subRow) => {
              if (
                subRow?.style_carryover_flag === "New" &&
                subRow?.choice_carryover_flag === "Carryover"
              ) {
                eachRow.subRows.push(subRow);
              }
            });
          }
          let split = columnId.split("attributes_")?.[1];
          eachRow[split] = newValue;
          eachRow[columnId] = newValue;
          eachRow?.subRows.forEach((subRow) => {
            subRow[columnId] = newValue;
            subRow[split] = newValue;
            subRow["is_product_attribute_changed"] = true;
          });
          eachRow["is_product_attribute_changed"] = true;
        } else if (
          columnId === "all_door_choice" ||
          columnId === "style_name" ||
          columnId === "style_des" ||
          columnId === "style_no" ||
          columnId === "merchant_pyramid" ||
          columnId === "pillar"
        ) {
          eachRow[columnId] = newValue;
          eachRow?.subRows.forEach((subRow) => {
            subRow[columnId] = newValue;
          });
        } else if (columnId.includes("clusters_")) {
          let totalQuantity = 0;
          for (let i = 0; i < eachRow.totalClusters; i++) {
            // calculating total quanity channel wise
            let chanKey = eachRow[`channel` + (i + 1)];
            if (channelQuantity[chanKey]) {
              //if already total quanity for that channel is present adding up with the exsisting
              channelQuantity[chanKey] +=
                eachRow[
                  `clusters_${eachRow["cluster_display_name" + (i + 1)]}`
                ] * eachRow["store_count" + (i + 1)];
            } else {
              //else assigning the channel with the qauntity
              channelQuantity[chanKey] =
                eachRow[
                  `clusters_${eachRow["cluster_display_name" + (i + 1)]}`
                ] * eachRow["store_count" + (i + 1)];
            }
            totalQuantity =
              totalQuantity +
              eachRow[`clusters_${eachRow["cluster_display_name" + (i + 1)]}`] *
                eachRow["store_count" + (i + 1)];
          }
          eachRow[`${channelColumnId}_total_qty`] = totalQuantity;
          eachRow[`${channelColumnId}_forecasted_qty`] =
            (eachRow.st / 100) * totalQuantity;
          eachRow["is_other_attribute_changed"] = true;
        } else {
          eachRow[columnId] = newValue;
          if (columnId === "color_count_ty") {
            eachRow["is_color_count_changed"] = true;
          } else {
            eachRow["is_other_attribute_changed"] = true;
          }
        }

        if (
          columnId === "style_des" &&
          propsRef.current.screenConfiguration.common.show_product_image
        ) {
          setCallImageGen(true);
        }
      }
      tempData.push(eachRow);
    });
    tempData.forEach((temp) => {
      if (temp.style_id === row.style_id && temp?.subRows) {
        let totalQty = 0,
          forecastedQty = 0,
          clusterTotal = {};
        temp.subRows.forEach((subRow) => {
          Object.keys(subRow).forEach((key) => {
            if (key.includes("clusters_") || key === "color_count_ty") {
              clusterTotal[key] = subRow[key] + (clusterTotal[key] || 0);
            }
            if (key.includes(`${channelColumnId}_total_qty`)) {
              totalQty = totalQty + subRow[`${channelColumnId}_total_qty`];
            }
            if (key.includes(`${channelColumnId}_forecasted_qty`)) {
              forecastedQty =
                forecastedQty + subRow[`${channelColumnId}_forecasted_qty`];
            }
            return;
          });
          return;
        });
        temp[`${channelColumnId}_total_qty`] = totalQty;
        temp[`${channelColumnId}_forecasted_qty`] = forecastedQty;
        Object.keys(clusterTotal).forEach((key) => {
          return (temp[key] = clusterTotal[key]);
        });
      }
      return temp;
    });
    tempData = tempData.filter((obj) => obj.subRows?.length);
    props.receiveWedgeTableData(
      cloneDeep(tempData),
      propsRef.current.uniqueClusterList,
      "style_level"
    );
    tempData = removeSubrows(tempData);
    AGInstance.current.api.refreshCells({
      update: tempData,
    });
    validateStyleWedgeData();
  };

  const removeSubrows = (tempData) => {
    tempData = tempData.filter((obj) => obj?.subRows?.length);
    // In case style_carryover_flag is New, don't add choice_carryover_flag for Carryover to the subRow
    tempData.map((obj) => {
      let filteredSubRow = obj.subRows.filter((subRow) => {
        return (
          subRow?.style_carryover_flag === "Carryover" ||
          (subRow?.style_carryover_flag === "New" &&
            subRow?.choice_carryover_flag !== "Carryover")
        );
      });
      obj.subRows = filteredSubRow;
    });
    return tempData;
  };

  const validateStyleWedgeData = () => {
    props.setWedgeValidationMsg("");
    AGInstance?.current?.api?.forEachNode((node) => {
      const rowData = node.data;
      props.wedgeAttributeData.map((attributeData) => {
        if (!rowData["attributes_" + attributeData?.attribute_name]) {
          props.setWedgeValidationMsg(
            "Attributes can't be empty. Please fill these fields to proceed further"
          );
          return 0;
        }
      });
    });
  };

  const onChangeDrop = async (val) => {
    if (props.selectedDropData !== val) {
      props.set2_3_Loader(true);
      props.setDisableNext(true);
      validateStyleWedgeData();
      const reqBody = {
        plan_wedge_data: props.finalStyleWedgeData,
        is_completed: false,
        is_scaling: false,
        is_market_style_change: false,
        is_value_changed: props.isStyleWedgeChanged,
      };
      if (props.screenConfiguration?.common?.show_style_level) {
        reqBody["wedge_level"] = "style_level";
      }
      const updateResponse = await props.updateWedgeData(
        reqBody,
        props.screenConfiguration?.common?.endpoint_project_name || "assort",
        props.planDetails?.data?.plan_code
      );
      if (updateResponse?.data.status) {
        props.setSelectedDropData(val);
        props.setIsStyleWedgeChanged(false);
        filters.current = {
          ...filters.current,
          [props.screenConfiguration?.common?.drop_key || "drop"]: [val],
        };
        props.setSelectedFlow({
          value: "-",
          label: "ALL",
          id: "-",
        });
        filters.current = {
          ...filters.current,
          [props.screenConfiguration?.common?.flow_key || "flow"]: ["-"],
        };
        props.setCallWedge(true);
        AGInstance.current.api?.refreshServerSideStore({ purge: true });
      }
    }
  };

  const callUpdateStyleWedgeData = async (reload, callRefresh) => {
    try {
      set2_3_Loader(true);
      scrollIntoView("choice-wedge-table");
      const reqBody = {
        plan_wedge_data: reload
          ? propsRef?.current?.finalStyleWedgeData
          : props.finalStyleWedgeData,
        is_completed: true,
        is_scaling: false,
        is_market_style_change: false,
        is_value_changed: props.isStyleWedgeChanged,
      };
      if (props.screenConfiguration?.common?.show_style_level) {
        reqBody["wedge_level"] = "style_level";
      }
      const updateResponse = await props.updateWedgeData(
        reqBody,
        props.screenConfiguration?.common?.endpoint_project_name || "assort",
        props.planDetails?.data?.plan_code
      );
      if (updateResponse?.data.status) {
        props.setCallUpdateStyleWedge(false);
        props.setIsStyleWedgeChanged(false);
        if (reload) {
          callStyleReoptimise();
        } else if (callRefresh) {
          AGInstance.current.api?.refreshServerSideStore({ purge: true });
        }
      }
    } catch (error) {
      set2_3_Loader(false);
      displaySnackMessage("Update style failed", "error", props.addSnack);
    }
    set2_3_Loader(false);
  };

  const callStyleReoptimise = async () => {
    try {
      let planData = cloneDeep(props.planDetails?.data);
      const reqBody = {
        filters: [
          {
            attribute_name: "plan_code",
            value: [planData.plan_code],
            operator: "in",
          },
          {
            attribute_name: "wedge_level",
            value: ["style_level"],
            prefix: "levels",
            operator: "in",
          },
          {
            attribute_name: "date",
            value: [
              `'${planData?.selling_period_sdate}' and '${planData?.selling_period_edate}'`,
            ],
            operator: "between",
          },
        ],
      };
      const response = await props.getReOptimizeWedge(
        reqBody,
        props.screenConfiguration?.common?.endpoint_project_name || "assort",
        props.planDetails?.data?.plan_code
      );
      if (response?.data.status) {
        if (callImageGen) {
          props.callImageWedgeMap();
        }
        props.setCallWedge(true);
        setEdited(false);
        setCallImageGen(false);
        AGInstance.current.api?.refreshServerSideStore({ purge: true });
        displaySnackMessage(
          "Update style successful",
          "success",
          props.addSnack
        );
      }
    } catch (error) {
      set2_3_Loader(false);
      displaySnackMessage("Update style failed", "error", props.addSnack);
    }
    set2_3_Loader(false);
  };

  const onSelectionChanged = (params) => {
    const { newValue, oldValue, colDef } = params;
    let selectedRows = [];
    let tempRowData = [];
    let columnId = colDef.column_name;
    let row = params.data;
    AGInstance.current.api.forEachNode((node) => {
      node = node.data;
      node?.select && selectedRows.push({ ...node, is_selected: true });
      if (node.uniqueID === row.uniqueID) {
        if (colDef.type === "str" || colDef.type === "list") {
          node[columnId] = newValue;
          node?.subRows?.length &&
            node?.subRows.forEach((subRow) => {
              subRow[columnId] = newValue;
            });
        }
      }
      tempRowData.push(node);
    });
    props.setSelectedStyleId(selectedRows);
    tempRowData = tempRowData.filter((obj) => obj.subRows?.length);
    props.receiveWedgeTableData(
      cloneDeep(tempRowData),
      propsRef.current.uniqueClusterList,
      "style_level"
    );
    tempRowData = removeSubrows(tempRowData);
    AGInstance.current.api.refreshCells({
      update: tempRowData,
    });
    validateStyleWedgeData();
  };

  const loadTableInstance = (params) => {
    AGInstance.current = params;
    validateStyleWedgeData();
  };

  const autoGroupColumnDef = {
    headerName: "Style Carryover/new",
    hide: true,
    cellRendererParams: {
      suppressCount: true,
    },
    headerComponent: SortComponent,
    width: 200,
    type: "str",
    valueGetter: (props) =>
      props?.data?.choice_carryover_flag !== "Total"
        ? props?.data?.choice_carryover_flag
        : props?.data?.style_id,
  };

  return (
    <>
      {props.groupedDrops && Object.keys(props.groupedDrops)?.length ? (
        <div>
          <PlanDropTabViewComponent
            groupedDrops={props.groupedDrops}
            onChangeTab={onChangeDrop}
            selectedTab={props.selectedDropData}
          />
        </div>
      ) : null}

      <AgGridTable
        columns={columns}
        manualCallBack={(body, pageIndex, params) =>
          manualCallBack(body, pageIndex, params)
        }
        rowModelType="serverSide"
        childKey={"subRows"}
        loadTableInstance={loadTableInstance}
        customCellRenderer={(cellProps) =>
          assortAgGridCustomCellRenderer(cellProps, "style_level_table")
        }
        onBlur={updateWedgeTableData}
        onCellValueChanged={onSelectionChanged}
        onRowSelected
        treeData={true}
        autoGroupColumnDef={autoGroupColumnDef}
        uniqueRowId={"unique_id"}
        sideBar={false}
        tableId={"style-table"}
        serverSideStoreType="partial"
        cacheBlockSize={10}
        adjustTableHeight={true}
        staticColId={true}
      />
      <div className={classes.rightAlignButtonAssort}>
        <Button
          variant="contained"
          color="primary"
          title={"Delete choice"}
          className={classes.button}
          disabled={!isEdited}
          onClick={() => callUpdateStyleWedgeData(true, false)}
        >
          Reoptimise
        </Button>
      </div>
    </>
  );
};

const mapStateToProps = (state) => {
  return {
    planDetails: planDashboardServiceActions.planDetailsDataSelector(state),
    planLevels: planDashboardServiceActions.planLevelsDataSelector(state),
    wedgeAttributeData: planWedgeServiceActions.wedgeAttributeDataSelector(
      state
    ),
    planMetricsData: planWedgeServiceActions.planMetricsDataSelector(state),
    columnHeaderJson: planDashboardServiceActions.columnHeaderJsonSelector(
      state
    ),
    wedgeFiltersData: planWedgeServiceActions.wedgeFiltersDataSelector(state),
    screenConfiguration:
      state.assortsmartReducer.commonAssortReducer.screenConfiguration,
    styleWedgeData: planWedgeServiceActions.styleWedgeDataSelector(state),
  };
};

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators(
    {
      getReOptimizeWedge,
      updateWedgeData,
      getWedgeData,
      set2_3_Loader,
      addSnack,
    },
    dispatch
  );
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(StyleLevelWedgeComponent));
