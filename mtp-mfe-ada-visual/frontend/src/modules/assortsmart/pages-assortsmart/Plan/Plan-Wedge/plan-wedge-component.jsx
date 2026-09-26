import React, { useEffect, useMemo, useRef, useState } from "react";
import AgGridTable from "core/Utils/agGrid";
import SortComponent from "core/Utils/agGrid/column-component/sortComponent";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import StyledChip from "core/Utils/chip/StyledChip";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import { addSnack } from "core/actions/snackbarActions";
import { Prompt } from "impact-ui";
import { cloneDeep, find, groupBy, isArray } from "lodash";
import InfoComponent from "modules/assortsmart/pages-assortsmart/Plan/Plan-Initial/IP-details-component";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import * as planInitialServiceActions from "modules/assortsmart/services-assortsmart/Plan/Plan-Initial/plan-initial-service";
import * as planWedgeServiceActions from "modules/assortsmart/services-assortsmart/Plan/Plan-Wedge/plan-wedge-service";
import moment from "moment";
import { connect } from "react-redux";
import { useHistory, withRouter } from "react-router-dom";
import { bindActionCreators } from "redux";
import {
  PLAN_STEP_BGCOLOR_MAPPER,
  Plan,
  common,
  newVsCarryOverOptions,
  DEFAULT_IMAGE_LINK,
} from "../../../constants-assortsmart/stringContants";
import {
  getWedgeData,
  set2_3_Loader,
  setPlanMetricsData,
  setWedgeAttributeData,
  setWedgeData,
  setWedgeFiltersData,
  updateWedgeData,
  imageGenWedgeMapping,
  addWedgeAttribute,
} from "../../../services-assortsmart/Plan/Plan-Wedge/plan-wedge-service";
import {
  assortAgGridCustomCellRenderer,
  filterView,
  getPlanPayload,
  isChannelMultiple,
  isColumnIdContainsChannel,
  isDropPlan,
} from "../../../utils-assortsmart/utilityFunctions";
import PlanDropTabViewComponent from "../plan-drop-tab-view-component";
import {
  checkIfSetContainsChoice,
  displaySnackMessage,
  editChoiceLevelTotalUnits,
  formatChoiceTableDataGrouping,
  recalculateTotalQty,
  wedgeDataPlotting,
} from "./plan-wedge-functions";
import { Add, ArrowBack } from "@mui/icons-material";
import { Button, TextField, Tooltip } from "@mui/material";
import { withStyles } from "@mui/styles";
import globalStyles from "core/Styles/globalStyles";

const CustomizedTooltip = withStyles({
  tooltip: {
    backgroundColor: "#FFFFFF",
    width: "15rem",
    boxShadow: "0px 0px 4px 4px rgba(0,0,0,0.2)",
  },
})(Tooltip);

const customGroupHeader = (
  params,
  props,
  classes,
  openModal,
  setOpenModal,
  showAddNewAttributeOption,
  showAddNewAttributeField,
  setShowAddNewAttributeField,
  selectedAttributeOption,
  setSelectedAttributeOption,
  submitAddNewAttribute,
  newAttributeRef
) => {
  const globalClasses = globalStyles();
  let options = [];
  props.unmappedWedgeAttributes.map((obj) =>
    options.push({
      label: obj.attribute_name,
      value: obj.attribute_value?.[0] || "",
    })
  );
  return (
    <React.Fragment>
      <span>{params.displayName}</span>
      <CustomizedTooltip
        open={openModal}
        arrow
        title={
          <div style={{ height: showAddNewAttributeField ? "" : "22rem" }}>
            {showAddNewAttributeField && (
              <div
                className={`${globalClasses.fullWidth} ${globalClasses.layoutAlignEnd}`}
              >
                <Button
                  onClick={() => {
                    setShowAddNewAttributeField(false);
                    newAttributeRef.current = [];
                  }}
                >
                  <ArrowBack />
                </Button>
              </div>
            )}
            <div>
              {showAddNewAttributeField ? (
                <div className={`${classes.TextField}`}>
                  <label
                    className={classes.inputLabel}
                  >{`Attribute Name`}</label>
                  <TextField
                    onChange={(e) =>
                      (newAttributeRef.current[0] = {
                        ...newAttributeRef.current[0],
                        label: e.target.value,
                      })
                    }
                  />
                  <label
                    className={classes.inputLabel}
                  >{`Attribute Value`}</label>
                  <TextField
                    onChange={(e) =>
                      (newAttributeRef.current[0] = newAttributeRef.current[0] = {
                        ...newAttributeRef.current[0],
                        value: e.target.value,
                      })
                    }
                  />
                </div>
              ) : (
                filterView(
                  "Attributes",
                  "attributes",
                  options,
                  setSelectedAttributeOption,
                  selectedAttributeOption,
                  classes.groupHeaderFilterView,
                  classes.inputLabel,
                  true,
                  false,
                  showAddNewAttributeOption,
                  true
                )
              )}
            </div>
            <div className={classes.groupHeaderButtonView}>
              <Button
                variant="contained"
                onClick={() => submitAddNewAttribute()}
              >
                Submit
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  setOpenModal(false);
                  setShowAddNewAttributeField(false);
                  newAttributeRef.current = [];
                  setSelectedAttributeOption("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        }
      >
        <Button onClick={() => setOpenModal(true)}>
          <Add />
        </Button>
      </CustomizedTooltip>
    </React.Fragment>
  );
};

const PlanWedgeComponent = (props) => {
  const [columns, setColumns] = useState([]);
  const [attributeList, setAttributeList] = useState([]);
  const [wedgeTableData, setWedgeTableData] = useState([]);
  const [showMOQMessage, setShowMOQMessage] = useState(false);
  const [moqMessage, setMoqMessage] = useState("");
  const [wedgeSelectedDropTableData, setWedgeSelectedDropTableData] = useState(
    []
  );
  const [attributesForStylesJson, setAttributesForStylesJson] = useState({});
  const [stylesForattributesJson, setStylesForattributesJson] = useState({});
  const [totalStyleCount, setTotalStyleCount] = useState(0);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [uniqueClusterData, setUniqueClusterData] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [showAddNewAttributeField, setShowAddNewAttributeField] = useState(
    false
  );
  const [selectedAttributeOption, setSelectedAttributeOption] = useState("");
  const history = useHistory();
  const classes = useStyles();
  const AGInstance = useRef({});
  let filters = useRef({});
  let propsRef = useRef({});
  let selectedAttributeRef = useRef([]);
  let newAttributeRef = useRef([]);
  let selectedPageIndex = useRef(0);

  useEffect(() => {
    propsRef.current = props;
    selectedAttributeRef.current = selectedAttributeOption;
  }, [
    props.planMetricsData?.[0]?.attribute_list,
    props.wedgeAttributeData,
    props.planDetails?.data,
    props.planSetupDropsData,
    props.selectedL3FilterValue,
    props.selectedDropData,
    props.uniqueClusterList,
    props.finalWedgeData,
    props.l3MinQtyJson,
    props.addSnack,
    props.flowList,
    props.choiceSetDetails,
    props.setShowPackModal,
    props.callWedge,
    props.statusImageMap,
    selectedAttributeOption,
    props.screenConfiguration,
  ]);

  useEffect(() => {
    if (Object.keys(attributesForStylesJson)?.length > 0) {
      setTotalStyleCount(Object.keys(attributesForStylesJson)?.length);
    }
  }, [attributesForStylesJson]);

  useEffect(() => {
    if (
      props.selectedL1FilterValue &&
      props.selectedL2FilterValue &&
      props.selectedL3FilterValue &&
      attributeList?.length
    ) {
      let selectedL3 = isArray(props.selectedL3FilterValue)
        ? props.selectedL3FilterValue.map((obj) => obj.value)
        : props.selectedL3FilterValue?.value
        ? [props.selectedL3FilterValue?.value]
        : [];
      filters.current = {
        ...filters.current,
        selectedL1FilterValue: props.selectedL1FilterValue?.value,
        selectedL2FilterValue: props.selectedL2FilterValue?.value,
        selectedL3FilterValue: selectedL3,
        selectedChoiceCarryoverFlag: props.selectedChoiceCarryoverFlag?.value,
      };
      AGInstance.current.api?.refreshServerSideStore({ purge: true });
    }
  }, [
    props.selectedL1FilterValue,
    props.selectedL2FilterValue,
    props.selectedL3FilterValue?.value,
    props.selectedChoiceCarryoverFlag,
    attributeList,
  ]);

  useEffect(() => {
    const getDownloadDetails = async () => {
      props.set2_3_Loader(true);
      if (
        props.screenConfiguration?.["2.3"]?.assort_wedge_download === "multiple"
      ) {
        props.setDownloadAtL3(true);
      }
    };
    getDownloadDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      props.setWedgeFiltersData([]);
      props.setWedgeData([]);
      props.setPlanMetricsData([]);
      props.setWedgeAttributeData([]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (
      isDropPlan(
        props.planDetails?.data,
        `${props.screenConfiguration?.common?.drop_key || "drops"}_count`
      )
    ) {
      filters.current = {
        ...filters.current,
        [props.screenConfiguration?.common?.drop_key || "drop"]: [
          `${props.screenConfiguration?.common?.drop_key || "drops"}_1`,
        ],
      };
    }
  }, [props.planDetails?.data]);

  useEffect(() => {
    if (props.selectedDropData?.length) {
      filters.current = {
        ...filters.current,
        [props.screenConfiguration?.common?.drop_key || "drop"]: [
          props.selectedDropData,
        ],
      };
    }
  }, [props.selectedDropData]);

  useEffect(() => {
    if (wedgeTableData?.length && uniqueClusterData?.length) {
      props.setUniqueClusterListWedge(uniqueClusterData);
      props.receiveWedgeTableData(
        wedgeTableData,
        uniqueClusterData,
        "choice_level"
      );
    }
  }, [wedgeTableData, uniqueClusterData]);

  useEffect(() => {
    if (props.choiceWedgeColumn?.length) {
      let wedgeColumns = setOptionsForAttribute(
        cloneDeep(props.choiceWedgeColumn)
      );
      // NOTE: will remove once changes are added in db
      wedgeColumns.map((col) => {
        if (col.column_name === "image_name_url") {
          col.is_editable = true;
          col.extra.hideToolTip = true;
        }
      });
      wedgeColumns = agGridColumnFormatter(
        wedgeColumns,
        props.columnHeaderJson,
        null,
        null,
        null,
        history.location.pathname.includes("view")
      );
      wedgeColumns.forEach((col) => {
        if (
          col.column_name === "all_door_choice" &&
          props.l3MinQtyJson[props.selectedL3FilterValue?.value] === 0
        ) {
          col.is_hidden = true;
          col.sub_headers.forEach((sub) => {
            sub.is_hidden = true;
          });
        }
        if (col.column_name === "clusters" && col.sub_headers?.length) {
          col.sub_headers.forEach((clusters) => {
            if (
              props.storeEligibilityData?.length ||
              props.screenConfiguration?.common?.show_store_eligiblity
            ) {
              clusters.headerComponent = InfoComponent;
            }
          });
        }
        if (col.accessor === "choice_name") {
          col = renderHighlightChoiceName(col);
        }
        if (col.accessor === "drop_name" || col.accessor === "launch_name") {
          col.filter = isDropPlan(
            props.planDetails?.data,
            `${props.screenConfiguration?.common?.drop_key || "drops"}_count`
          )
            ? "agTextColumnFilter"
            : "";
        }
        if (
          col.accessor === "choice_name" &&
          isDropPlan(
            props.planDetails?.data,
            `${props.screenConfiguration?.common?.drop_key || "drops"}_count`
          )
        ) {
          col.is_hidden = true;
        }
        // NOTE: HOTFIX for width issue (will be removed later)
        if (col.accessor === "attributes") {
          col.sub_headers.forEach((attribute) => {
            attribute.extra = {
              ...attribute?.extra,
              width: attribute.width,
            };
          });
          if (props.screenConfiguration?.["2.3"].show_additional_attribute) {
            col.headerGroupComponent = (params) =>
              customGroupHeader(
                params,
                props,
                classes,
                openModal,
                setOpenModal,
                showAddNewAttributeOption,
                showAddNewAttributeField,
                setShowAddNewAttributeField,
                selectedAttributeOption,
                setSelectedAttributeOption,
                submitAddNewAttribute,
                newAttributeRef
              );
          }
        }
        if (col.accessor === "total_qty" && col.is_editable === false) {
          col.cellRenderer = (data) => {
            return Math.round(data.value);
          };
        }
        if (col.column_name === "image_name_url") {
          col.editable = false;
        }
      });
      setColumns(wedgeColumns);
      let wedgeHeader = wedgeColumns.filter(
        (col) =>
          col.column_name !== "drop" &&
          col.column_name !== "launch" &&
          !col.checkboxSelection
      );
      props.getWedgeHeadersForExcelDownload(wedgeHeader);
    }
  }, [
    props.choiceWedgeColumn,
    props.choiceSetDetails,
    props.wedgeAttributeData,
    props.unmappedWedgeAttributes,
    openModal,
    showAddNewAttributeField,
    selectedAttributeOption,
  ]);

  useEffect(() => {
    if (props.wedgeFiltersData?.length && props.isDownload) {
      callUpdateChoiceWedgeData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.wedgeFiltersData, props.isDownload]);

  useEffect(() => {
    if (props.wedgeAttributeData?.length) {
      let tempAttributeList = props.wedgeAttributeData.map((attrJson) => {
        return `attributes_${attrJson.attribute_name}`;
      });
      tempAttributeList.push(...["lock_choice", "flow_to_next_season"]);
      setAttributeList(tempAttributeList);
      //props.setCallWedge(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.wedgeAttributeData]);

  useEffect(() => {
    if (props.callUpdateChoiceWedge) {
      callUpdateChoiceWedgeData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.callUpdateChoiceWedge]);

  useEffect(() => {
    if (props.callWedge) {
      props.set2_3_Loader(true);
      selectedPageIndex.current = 0;
      AGInstance.current.api?.refreshServerSideStore({ purge: true });
      props.setCallWedge(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.callWedge]);

  useEffect(() => {
    if (
      isDropPlan(
        props.planDetails?.data,
        `${props.screenConfiguration?.common?.drop_key || "drops"}_count`
      ) &&
      props.screenConfiguration?.common?.endpoint_project_name !==
        "assort-smart"
    ) {
      props.fetchPlanSetupDrops();
    }
  }, [props.planDetails]);

  useEffect(() => {
    if (
      props.selectedDropData &&
      isDropPlan(
        props.planDetails?.data,
        `${props.screenConfiguration?.common?.drop_key || "drops"}_count`
      ) &&
      AGInstance?.current?.api
    ) {
      var hardcodedFilter = {
        [`${props.screenConfiguration?.common?.drop_key || "drop"}_name`]: {
          type: "equals",
          filter: props.selectedDropData,
        },
      };
      AGInstance.current.api.setFilterModel(hardcodedFilter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.selectedDropData, AGInstance]);

  useEffect(() => {
    if (
      props.selectedDropData &&
      AGInstance?.current?.api &&
      wedgeSelectedDropTableData?.length
    ) {
      let rowData = formatChoiceTableDataGrouping(
        props,
        wedgeTableData,
        props.selectedDropData
      );
      setWedgeSelectedDropTableData(rowData);
      AGInstance.current.api.refreshCells({
        update: rowData,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.selectedDropData]);

  const setOptionsForAttribute = (colArray) => {
    colArray.forEach((col) => {
      if (
        col.column_name === "lock_choice" ||
        col.column_name === "flow_to_next_season" ||
        col.column_name === "carry_over_prev_season" ||
        col.column_name === "size" ||
        col.column_name === "gwp" ||
        col.column_name === "delete_choice" ||
        col.column_name === "all_door_choice" ||
        col.column_name === "dropship_choice" ||
        col.column_name === "marketing_choice_count" ||
        col.column_name === "big_tall_size" ||
        col.column_name === "marketing_cc"
      ) {
        col.options = props.generateOptions(Plan.__Lock_Choice_Option);
      } else if (attributeList.includes(col.column_name)) {
        let col_key = col.column_name.split("attributes_");
        let attributeOptions =
          find(props.wedgeAttributeData || [], {
            attribute_name: col_key[1],
          }) || [];
        col.options = props.generateOptions(attributeOptions?.attribute_value);
      } else if (col.column_name === "new_vs_carryover") {
        const options = newVsCarryOverOptions;
        col.options = props.generateOptions(options);
      } else if (col.column_name === "size_curve") {
        let sizeCurveOptions =
          props.wedgeFiltersData[0]?.l2FilterValue?.[0]?.size_curve_list || [];
        col.options =
          sizeCurveOptions?.length > 0
            ? props.generateOptions(sizeCurveOptions)
            : [];
      }
      if (col.sub_headers?.length) {
        setOptionsForAttribute(col.sub_headers);
      }
    });
    return colArray;
  };
  const submitAddNewAttribute = async () => {
    let attribute = {};
    if (newAttributeRef.current?.length) {
      newAttributeRef.current.map((obj, index) => {
        attribute[obj.label] = obj.value;
      });
    }
    if (selectedAttributeRef.current?.length) {
      selectedAttributeRef.current.map((obj, index) => {
        attribute[obj.label] = obj.value;
      });
    }
    let payload = {
      data: [
        {
          plan_code: props.planDetails?.data?.plan_code,
          attribute_value: attribute,
        },
      ],
    };
    props.set2_3_Loader(true);
    setOpenModal(false);
    let response = await props.addWedgeAttribute(
      payload,
      props.screenConfiguration?.common?.endpoint_project_name || "assort"
    );
    if (response.data.status) {
      setShowAddNewAttributeField(false);
      selectedAttributeRef.current = [];
      newAttributeRef.current = [];
      setSelectedAttributeOption("");
      await props.callWedgeAttributeData();
      props.setCallWedge(true);
    }
  };

  const generateDownloadData = async () => {
    try {
      let planData = cloneDeep(props.planDetails.data);
      let payload = {
        filters: [
          {
            attribute_name: "plan_code",
            value: [planData["plan_code"]],
            operator: "in",
          },
        ],
      };
      if (
        props.screenConfiguration?.common?.show_style_level ||
        props.screenConfiguration?.common?.endpoint_project_name ===
          "assort-smart"
      ) {
        payload.filters.push({
          attribute_name: "wedge_level",
          value: ["choice_level"],
          prefix: "levels",
          operator: "in",
        });
      }
      let sort = [];
      if (
        props.screenConfiguration?.common?.show_style_level ||
        props.screenConfiguration?.common?.endpoint_project_name ===
          "assort-smart"
      ) {
        sort = [
          {
            column: "l0_name",
            order: "asc",
          },
          {
            column: "l1_name",
            order: "asc",
          },
          {
            column: "l2_name",
            order: "asc",
          },
          {
            column: "l3_name",
            order: "asc",
          },
          {
            column: "order_of_choice",
            order: "asc",
          },
        ];
      } else {
        sort = [
          {
            column: "order_of_choice",
            order: "asc",
          },
          {
            column: "channel_qty",
            order: "asc",
          },
          {
            column: "l3_name",
            order: "asc",
          },
        ];
      }
      payload.pagination = {
        sort: sort,
        search: [],
        range: [],
        limit: null,
      };
      let wedgeResponse = await props.getWedgeData(
        payload,
        props.screenConfiguration?.common?.endpoint_project_name || "assort"
      );
      if (wedgeResponse?.data?.status) {
        let wedgeData = wedgeDataPlotting(
          props,
          wedgeResponse?.data?.data?.data,
          props.planMetricsData?.[0]?.attribute_list,
          props.wedgeAttributeData,
          props.planDetails?.data,
          setAttributesForStylesJson,
          setStylesForattributesJson,
          "choice_level"
        );
        let multipleChannelWedgeData = [];
        if (isChannelMultiple(props.planDetails?.data)) {
          wedgeData.forEach((obj) => {
            props.planMetricsData?.[0]?.channel?.[obj.l3_name].forEach(
              (chanKey) => {
                obj = cloneDeep(obj);
                obj["channels"] = chanKey;
                obj["total_qty"] = obj[`${chanKey}_units`];
                obj["forecasted_qty"] = obj[`${chanKey}_forecasted_qty`];
                obj["st"] = obj[`${chanKey}_st`];
                obj["avg_wk_cnt_ty"] = obj[`${chanKey}_avg_wk_cnt_ty`];
                if (obj.subRows?.length > 0) {
                  obj.subRows.forEach((sub) => {
                    sub["channels"] = chanKey;
                    sub["total_qty"] = sub[`${chanKey}_units`];
                    sub["forecasted_qty"] = sub[`${chanKey}_forecasted_qty`];
                    sub["st"] = sub[`${chanKey}_st`];
                    sub["avg_wk_cnt_ty"] = sub[`${chanKey}_avg_wk_cnt_ty`];
                  });
                }
                multipleChannelWedgeData.push(obj);
              }
            );
          });
          wedgeData = multipleChannelWedgeData;
        }
        let wedgeDownloadData = [];
        wedgeData.forEach((data) => {
          wedgeDownloadData.push(data);
          if (data?.subRows?.length) {
            wedgeDownloadData.push(...data.subRows);
          }
        });
        props.setWedgeDataForDownload(wedgeDownloadData);
      }
    } catch (err) {
      props.set2_3_Loader(false);
      displaySnackMessage(
        "Fetching wedge details for download failed",
        "error",
        props.addSnack
      );
    }
  };

  const renderHighlightChoiceName = (column) => {
    column.cellRenderer = (params) => {
      let styledChip;
      props.planDetails.data.channel.map((chanKey) => {
        if (params.data.total_qty < params.data[chanKey + "_moq"]) {
          styledChip = (
            <StyledChip
              label={params?.value}
              color={PLAN_STEP_BGCOLOR_MAPPER["incomplete"]}
            />
          );
        }
      });
      return styledChip ? styledChip : params.value;
    };
    return column;
  };

  const updateWedgeTableDataOnBlur = async (
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
    let columnId = column.colId;
    let oldValue = initialValue;
    let row = data;
    let tempData = [];
    let attributeKey = [];
    let styleUpdateMessage = false;
    //storing the keys of attribute columns
    propsRef?.current?.wedgeAttributeData &&
      propsRef?.current?.wedgeAttributeData.map((attr) => {
        attributeKey.push(attr.attribute_name);
        return null;
      });
    let parentTotalQty = 0;
    let childTotalQtyObj = {};
    let childFlowPerObj = {};
    let childQtyOldValueObj = {};
    let channelChildTotal = {};
    let subRowChannelValues = {};
    let updatedParentRow,
      updatedChildRows = [];
    let channelColumnId = columnId.includes("_units")
      ? columnId.split("_units")[0]
      : "";
    let forecastedColumnId = columnId.includes("_forecasted_qty")
      ? columnId.split("_forecasted_qty")?.[0]
      : "";
    let msgFlag = true;
    props.setIsChoiceWedgeChanged(true);
    AGInstance.current.api.forEachNode((eachRow, index) => {
      let expanded = eachRow.expanded;
      eachRow = eachRow.data;
      let forecastedQtyEdited = false;
      childFlowPerObj = cloneDeep(childFlowPerObj);
      if (
        eachRow.uniqueID === row.uniqueID &&
        (columnId === "forecasted_qty" ||
          columnId === "st" ||
          columnId === "total_qty" ||
          columnId.includes("_units") ||
          columnId.includes("clusters") ||
          columnId.includes("forecasted_qty"))
      ) {
        if (oldValue !== newValue) {
          let choice = props.editedChoiceUnits;
          choice.push(row.choice_name);
          props.setEditedChoiceUnits(choice);
        }
        if (
          (columnId === "total_qty" || columnId.includes("_units")) &&
          !oldValue
        ) {
          displaySnackMessage(
            "Please Enter cluster units more than 0 to reflect the values",
            "error",
            props.addSnack
          );
          props.setIsScaleUpDownDisabled(true);
        }
      }
      if (eachRow.uniqueID === row.uniqueID && oldValue !== newValue) {
        props.setEnableUpdateStyleBtn(true);
      }
      if (columnId === "st" && eachRow.uniqueID === row.uniqueID) {
        eachRow["st"] = newValue < 0 ? 0 : newValue > 100 ? 100 : newValue;
        newValue = newValue < 0 ? 0 : newValue > 100 ? 100 : newValue;
      }
      if (
        (columnId === "forecasted_qty" ||
          columnId.includes("_forecasted_qty") ||
          columnId === "st") &&
        eachRow.parent_wedge_id === row.parent_wedge_id
      ) {
        if (forecastedColumnId !== "") {
          oldValue = eachRow[`${forecastedColumnId}_units`];
        } else {
          oldValue = eachRow.total_qty;
        }
        let value,
          changedValue = initValue;
        if (columnId === "st") {
          changedValue = newValue < 0 ? 0 : newValue > 100 ? 100 : newValue;
        }
        if (
          eachRow.hierarchy.length === 1 &&
          eachRow.hierarchy?.[0] === eachRow.choice_name
        ) {
          value = changedValue;
        } else {
          value = !isDropPlan(
            props.planDetails?.data,
            `${props.screenConfiguration?.common?.drop_key || "drops"}_count`
          )
            ? changedValue
            : eachRow["drop_flow_perc"] * changedValue;
          eachRow[
            `${
              forecastedColumnId === "" ? "" : `${forecastedColumnId}_`
            }forecasted_qty`
          ] = value;
        }
        let updateValue =
          eachRow.uniqueID === row.uniqueID
            ? initValue
            : columnId === "forecasted_qty" ||
              columnId.includes("forecasted_qty")
            ? eachRow[
                `${
                  forecastedColumnId === "" ? "" : `${forecastedColumnId}_`
                }forecasted_qty`
              ]
            : eachRow.st;
        let totalQty =
          columnId === "forecasted_qty" || columnId.includes("forecasted_qty")
            ? (updateValue / eachRow.st) * 100
            : (eachRow[
                `${
                  forecastedColumnId === "" ? "" : `${forecastedColumnId}_`
                }forecasted_qty`
              ] /
                updateValue) *
              100;
        if (forecastedColumnId !== "") {
          eachRow[`${forecastedColumnId}_units`] = totalQty;
        } else {
          eachRow.total_qty = totalQty;
        }
        newValue = totalQty;
        forecastedQtyEdited = true;
      }
      if (
        (columnId === "total_qty" ||
          columnId.includes("_units") ||
          forecastedQtyEdited) &&
        eachRow.parent_wedge_id === row.parent_wedge_id
      ) {
        let columnID =
          columnId === "forecasted_qty" ||
          columnId.includes("forecasted_qty") ||
          columnId === "st"
            ? "total_qty"
            : columnId;
        // Calculate the total of subRows based on channel
        if (eachRow?.subRows) {
          eachRow.subRows.map((subRow) => {
            channelChildTotal[columnID] =
              subRow[columnID] + (channelChildTotal[columnID] || 0);
            subRowChannelValues[`${columnID}_${subRow.flow_name}`] =
              subRow[columnID];
          });
        }
        // Recalulate the flow percentage for the changed column ID
        if (!eachRow?.subRows && channelChildTotal[columnID]) {
          let value =
            eachRow.uniqueID === row.uniqueID && !row?.subRows
              ? newValue
              : subRowChannelValues[
                  `${columnID}_${
                    eachRow[
                      `${
                        props.screenConfiguration?.common?.flow_key || "flow"
                      }_name`
                    ]
                  }`
                ]
              ? subRowChannelValues[
                  `${columnID}_${
                    eachRow[
                      `${
                        props.screenConfiguration?.common?.flow_key || "flow"
                      }_name`
                    ]
                  }`
                ]
              : forecastedColumnId !== ""
              ? eachRow[`${forecastedColumnId}_units`]
              : eachRow.total_qty;
          let calculatedPen = value / channelChildTotal[columnID];
          childFlowPerObj[
            `${channelColumnId}${
              eachRow[
                `${props.screenConfiguration?.common?.flow_key || "flow"}_name`
              ]
            }`
          ] = calculatedPen;
          eachRow.drop_flow_perc = calculatedPen;
        }
        // Getting old values for parent and child rows
        if (row?.subRows && !columnId.includes("_units")) {
          parentTotalQty =
            columnId === "forecasted_qty" || columnId.includes("forecasted_qty")
              ? forecastedColumnId !== ""
                ? eachRow[`${forecastedColumnId}_units`]
                : eachRow.total_qty
              : newValue || 0;
          if (
            propsRef.current?.planMetricsData?.[0]?.channel?.[eachRow.l3_name]
              ?.length > 1 &&
            columnId.includes("_forecasted_qty")
          ) {
            propsRef.current?.planMetricsData?.[0]?.channel?.[
              eachRow.l3_name
            ].map((chn) => {
              if (chn === forecastedColumnId) {
                row.subRows.forEach((subRow) => {
                  childQtyOldValueObj[
                    subRow[
                      `${
                        props.screenConfiguration?.common?.flow_key || "flow"
                      }_name`
                    ]
                  ] = subRow[`${forecastedColumnId}_units`];
                });
              }
            });
          } else {
            row.subRows.map((subRow) => {
              childQtyOldValueObj[
                subRow[
                  `${
                    props.screenConfiguration?.common?.flow_key || "flow"
                  }_name`
                ]
              ] = subRow.total_qty;
            });
          }
        } else if (
          eachRow.hierarchy.length === 1 &&
          eachRow.hierarchy?.[0] === row.choice_name
        ) {
          parentTotalQty = columnId.includes("_units")
            ? eachRow[columnId]
            : eachRow.total_qty;
          if (
            isDropPlan(
              props.planDetails?.data,
              `${props.screenConfiguration?.common?.drop_key || "drops"}_count`
            )
          ) {
            eachRow.subRows.forEach((subRow) => {
              childQtyOldValueObj[
                subRow[
                  `${
                    props.screenConfiguration?.common?.flow_key || "flow"
                  }_name`
                ]
              ] = columnId.includes("_units")
                ? subRow[columnId]
                : columnId.includes("_forecasted_qty")
                ? subRow[`${forecastedColumnId}_units`]
                : subRow.total_qty;
            });
          }
        } else {
          if (
            eachRow[
              `${props.screenConfiguration?.common?.flow_key || "flow"}_name`
            ] ===
              row[
                `${props.screenConfiguration?.common?.flow_key || "flow"}_name`
              ] &&
            eachRow.uniqueID === row.uniqueID &&
            oldValue
          ) {
            eachRow[columnId] = initValue;
          }
          if (!oldValue && eachRow.uniqueID === row.uniqueID) {
            eachRow[columnId] = oldValue;
          }
          childTotalQtyObj[
            eachRow[
              `${props.screenConfiguration?.common?.flow_key || "flow"}_name`
            ]
          ] = columnId.includes("_units")
            ? eachRow[columnId]
            : eachRow.total_qty;
        }
        if (
          ((newValue === 0 &&
            eachRow?.dropship_choice === "No" &&
            eachRow.uniqueID === row.uniqueID &&
            !isDropPlan(
              props.planDetails?.data,
              `${props.screenConfiguration?.common?.drop_key || "drops"}_count`
            )) ||
            (isDropPlan(props.planDetails?.data) &&
              eachRow?.subRows &&
              newValue === 0 &&
              eachRow?.dropship_choice === "No" &&
              eachRow.uniqueID === row.uniqueID)) &&
          !columnId.includes("_units")
        ) {
          eachRow[columnId] = oldValue;
          eachRow["delete_choice"] = "Yes";
          setShowDeleteConfirmDialog(true);
          return;
        } else if (
          (newValue && newValue !== 0) ||
          (isDropPlan(
            props.planDetails?.data,
            `${props.screenConfiguration?.common?.drop_key || "drops"}_count`
          ) &&
            !row?.subRows)
        ) {
          if (eachRow?.subRows && !expanded) {
            let newRow = [eachRow];
            eachRow.subRows.map((subRow) => {
              newRow.push(subRow);
            });
            let parent;
            newRow.map((data) => {
              let updatedClusterValue = editChoiceLevelTotalUnits(
                row,
                data,
                oldValue,
                newValue,
                parentTotalQty,
                childTotalQtyObj,
                childFlowPerObj,
                childQtyOldValueObj,
                columnId,
                AGInstance,
                channelColumnId,
                forecastedColumnId,
                propsRef.current,
                displaySnackMessage
              );
              Object.keys(updatedClusterValue).map((key) => {
                data[key] = updatedClusterValue[key];
              });
              if (data?.subRows) {
                updatedParentRow = data;
                data["subRows"] = [];
                parent = data;
              } else {
                updatedChildRows.push(data);
                parent?.["subRows"].push(data);
              }
            });
            Object.keys(parent).map((key) => {
              eachRow[key] = parent[key];
            });
          } else {
            let updatedClusterValue = editChoiceLevelTotalUnits(
              row,
              eachRow,
              oldValue,
              newValue,
              parentTotalQty,
              childTotalQtyObj,
              childFlowPerObj,
              childQtyOldValueObj,
              columnId,
              AGInstance,
              channelColumnId,
              forecastedColumnId,
              propsRef.current,
              displaySnackMessage
            );
            Object.keys(updatedClusterValue).map((key) => {
              eachRow[key] = updatedClusterValue[key];
            });
            if (eachRow?.subRows) {
              updatedParentRow = eachRow;
            } else {
              updatedChildRows.push(cloneDeep(eachRow));
            }
          }
        }
      }
      if (
        columnId.includes("clusters") &&
        propsRef.current.l3MinQtyJson[row?.l3_name] > newValue &&
        msgFlag &&
        eachRow?.[
          `${props.screenConfiguration?.common?.flow_key || "flow"}_name`
        ] === "-"
      ) {
        msgFlag = false;
        displaySnackMessage(
          "Depth is going below min depth for updated choice",
          "warning",
          props.addSnack
        );
      }
      if (
        !columnId.includes("clusters") &&
        columnId !== "forecasted_qty" &&
        !columnId.includes("forecasted_qty") &&
        columnId !== "st" &&
        columnId !== "delete_choice" &&
        eachRow.uniqueID === row.uniqueID
      ) {
        eachRow[columnId] = newValue;
      }
      if (
        columnId === "dropship_choice" &&
        newValue === "Yes" &&
        eachRow.uniqueID === row.uniqueID
      ) {
        props.dropShipChoices.push({
          l0_name: eachRow.l0_name,
          l1_name: eachRow.l1_name,
          l2_name: eachRow.l2_name,
          l3_name: eachRow.l3_name,
          choice_name: eachRow.choice_name,
          channel: props.planDetails?.data?.channel[0],
          sub_channel: props.planDetails?.data?.channel[0],
        });
        props.setDropShipChoices(props.dropShipChoices);
      }
      // Distributing updated parent clusters data to child clusters based on percentage flow
      if (columnId.includes("clusters") && row?.subRows) {
        if (row.uniqueID === eachRow.uniqueID) {
          eachRow[columnId] = newValue;
        } else {
          let PerKeyExist = Object.keys(childFlowPerObj).includes(
            eachRow.hierarchy[1]
          );
          if (PerKeyExist) {
            let value =
              childFlowPerObj[`${channelColumnId}${eachRow.hierarchy[1]}`] *
              newValue;
            eachRow[columnId] = value;
          }
        }
      }
      if (
        (columnId === "total_qty" || columnId.includes("_units")) &&
        eachRow.uniqueID === row.uniqueID
      ) {
        if (columnId === "total_qty") {
          eachRow[`forecasted_qty`] = (eachRow.st / 100) * eachRow.total_qty;
        } else {
          eachRow[`${channelColumnId}_forecasted_qty`] =
            (eachRow.st / 100) * eachRow[`${channelColumnId}_units`];
        }
      }
      if (
        eachRow.uniqueID === row.uniqueID &&
        columnId === "delete_choice" &&
        newValue === "Yes"
      ) {
        let selectedChoice = checkIfSetContainsChoice(
          propsRef.current.choiceSetDetails,
          data
        );
        if (selectedChoice?.length) {
          eachRow[columnId] = "No";
          return displaySnackMessage(
            "To delete choice,should be removed from set",
            "warning",
            props.addSnack
          );
        }
      }
      if (
        (row.uniqueID === eachRow.uniqueID && columnId.includes("clusters")) ||
        (!columnId.includes("clusters") && eachRow.uniqueID === row.uniqueID)
      ) {
        if (
          columnId !== "forecasted_qty" &&
          !columnId.includes("forecasted_qty") &&
          columnId !== "st" &&
          columnId !== "delete_choice"
        ) {
          eachRow[columnId] = newValue;
        }
        if (!columnId.includes("clusters_") && columnId !== "total_qty") {
          eachRow.subRows &&
            eachRow.subRows.map((ele) => {
              ele[columnId] = newValue;
              return null;
            });
        }
        //Update the updated_at value of changed cluster to current date, each time cluster quantity is changed
        if (columnId.includes("clusters_")) {
          let isAllDoorChoice = "Yes";
          let totalDoorCount = 0;
          let channelTotalDoorCount = 0;
          let channel = columnId.split("clusters_")?.[1].split(" ")?.[0];
          for (let index = 0; index < eachRow.totalClusters; index++) {
            let clusterValue = eachRow["cluster_display_name" + (index + 1)];
            if (
              propsRef.current.l3MinQtyJson[eachRow.l3_name] >
              eachRow["clusters_" + clusterValue]
            ) {
              isAllDoorChoice = "No";
            }
            //Update updated_at for the changed cluster, assign changed cluster's updated_at value to overall updated_at
            if (
              clusterValue === eachRow["cluster_display_name" + (index + 1)]
            ) {
              eachRow["updated_at" + (index + 1)] = moment().format(
                "MM-DD-YYYY"
              );
              eachRow.updated_at = eachRow["updated_at" + (index + 1)];
              if (propsRef.current.l3MinQtyJson[eachRow.l3_name] !== 0) {
                eachRow["all_door_choice"] = isAllDoorChoice;
              }
            }
            // calculate all door count
            if (isChannelMultiple(props.planDetails?.data)) {
              if (
                eachRow["clusters_" + clusterValue] &&
                eachRow[`channel${index + 1}`] === channel
              ) {
                channelTotalDoorCount =
                  channelTotalDoorCount + eachRow[`store_count${index + 1}`];
              }
            }
            if (eachRow["clusters_" + clusterValue]) {
              totalDoorCount =
                totalDoorCount + eachRow[`store_count${index + 1}`];
            }
          }
          eachRow["total_door_count"] = totalDoorCount;
          eachRow[channel + "_door_count"] = channelTotalDoorCount;
          if (
            eachRow["dropship_choice"] === "Yes" &&
            newValue > 0 &&
            newValue !== row[columnId]
          ) {
            eachRow["dropship_choice"] = "No";
          }
        }

        if (columnId === "all_door_choice" && newValue === "Yes") {
          for (let index = 0; index < eachRow.totalClusters; index++) {
            let clusterValue = eachRow["cluster_display_name" + (index + 1)];
            //if all door choice is yes then all cluster qty should have minimum quantity
            if (
              propsRef.current.l3MinQtyJson[eachRow.l3_name] >
              eachRow["clusters_" + clusterValue]
            ) {
              //assign all clusters with minimum quantity
              eachRow["clusters_" + clusterValue] =
                propsRef.current.l3MinQtyJson[eachRow.l3_name];
            }
          }
          eachRow["dropship_choice"] = "No";
        }
        if (
          columnId.includes("clusters_") ||
          (columnId === "all_door_choice" && newValue === "Yes")
        ) {
          recalculateTotalQty(
            eachRow,
            oldValue,
            columnId,
            setShowDeleteConfirmDialog,
            props
          );
        }
        let attrCombo = "";
        //concatinating the attr for this row
        attributeKey.forEach((attr) => {
          attrCombo = attrCombo + eachRow[`attributes_${attr}`];
        });
        //if any attr column got changed
        if (
          columnId.includes("attributes") &&
          !props.screenConfiguration["2.3"].style_msg_not_required
        ) {
          //checking if the style id is present for the updated attr combo
          if (stylesForattributesJson[attrCombo]?.length > 0) {
            //updating the style id according to the updated attr combo
            eachRow.style_id = stylesForattributesJson[attrCombo][0];
            styleUpdateMessage = true;
          } else {
            //if there are no styles for updated attr combo
            let styleSplit = eachRow.style_id.split("Style---");
            //generating new style id from the total style count for this new combo
            eachRow.style_id =
              styleSplit[0] + "Style---" + (totalStyleCount + 1);
            // new style is getting added in both the json's
            attributesForStylesJson[eachRow.style_id] = attrCombo;
            setAttributesForStylesJson(attributesForStylesJson);
            if (stylesForattributesJson[attrCombo]?.length > 0) {
              stylesForattributesJson[attrCombo].push(eachRow.style_id);
            } else {
              stylesForattributesJson[attrCombo] = [eachRow.style_id];
            }
            setStylesForattributesJson(stylesForattributesJson);
            setTotalStyleCount(totalStyleCount + 1);
            styleUpdateMessage = true;
          }
        }
        //if style id got changed
        if (columnId === "style_id") {
          //checking whether this is a new style
          if (!attributesForStylesJson[eachRow.style_id]) {
            //adding this new style to both the json's
            attributesForStylesJson[eachRow.style_id] = attrCombo;
            setAttributesForStylesJson(attributesForStylesJson);
            if (stylesForattributesJson[attrCombo]?.length > 0) {
              stylesForattributesJson[attrCombo].push(eachRow.style_id);
            } else {
              stylesForattributesJson[attrCombo] = [eachRow.style_id];
            }
            setStylesForattributesJson(stylesForattributesJson);
            setTotalStyleCount(totalStyleCount + 1);
            //if the style id already exsits
          } else if (attributesForStylesJson[eachRow.style_id] !== attrCombo) {
            //if style id attr combo and current attr combo not same then throwing error
            // eachRow.style_id = initialValue;
            displaySnackMessage(
              "One style can't have multiple attribute combination",
              "error",
              props.addSnack
            );
          }
        }
      } else {
        eachRow.subRows &&
          eachRow.subRows.map((subRow, subIndex) => {
            if (subRow.uniqueID === row.uniqueID) {
              subRow[columnId] = newValue;
              // updating subrow with newValue
              if (!columnId.includes("clusters_")) {
                let arr = [];
                eachRow.subRows &&
                  eachRow.subRows.map((ele) => {
                    ele = cloneDeep(ele);
                    if (
                      ele[
                        `${
                          props.screenConfiguration?.common?.flow_key || "flow"
                        }_name`
                      ] ===
                      row[
                        `${
                          props.screenConfiguration?.common?.flow_key || "flow"
                        }_name`
                      ]
                    ) {
                      ele[columnId] = newValue;
                    }
                    arr.push(ele);
                    return ele;
                  });
                eachRow.subRows = arr;
              }
              let subRowTotalQuantity = 0;
              let subRowChannelUnits = {};
              for (let i = 0; i < eachRow.totalClusters; i++) {
                let chanKey = subRow[`channel${i + 1}`];
                if (subRowChannelUnits[chanKey]) {
                  subRowChannelUnits[chanKey] +=
                    (subRow["cluster_qty" + (i + 1)] || 0) *
                    (subRow["store_count" + (i + 1)] || 0);
                } else {
                  subRowChannelUnits[chanKey] =
                    (subRow["cluster_qty" + (i + 1)] || 0) *
                    (subRow["store_count" + (i + 1)] || 0);
                }
                subRowTotalQuantity =
                  subRowTotalQuantity +
                  (subRow[
                    `clusters_${subRow["cluster_display_name" + (i + 1)]}`
                  ] || 0) *
                    (subRow["store_count" + (i + 1)] || 0);
              }
              subRow.total_qty = subRowTotalQuantity;
              subRow[
                `${
                  forecastedColumnId === "" ? "" : `${forecastedColumnId}_`
                }forecasted_qty`
              ] = (subRow.st / 100) * subRowTotalQuantity;
              if (
                columnId.includes("clusters_") ||
                columnId.includes("total_qty") ||
                columnId.includes("_units")
              ) {
                let clusterTotal = 0,
                  overAllTotal = 0,
                  channelQty = 0;
                let channelKey = "";
                let channel = isColumnIdContainsChannel(
                  columnId,
                  props.planDetails?.data
                );
                if (channel && columnId.includes("clusters_")) {
                  channelKey = `${channel}_units`;
                }
                eachRow.subRows = cloneDeep(eachRow.subRows);
                for (let i = 0; i < eachRow.subRows.length; i++) {
                  if (
                    columnId.includes("_units") &&
                    !oldValue &&
                    eachRow.subRows[i].uniqueID === row.uniqueID &&
                    eachRow.subRows[i][
                      `${
                        props.screenConfiguration?.common?.flow_key || "flow"
                      }_name`
                    ] ===
                      row[
                        `${
                          props.screenConfiguration?.common?.flow_key || "flow"
                        }_name`
                      ]
                  ) {
                    eachRow.subRows[i][columnId] = oldValue;
                  }
                  let subrow = cloneDeep(eachRow.subRows[i]);
                  overAllTotal += subrow["total_qty"];
                  clusterTotal += subrow[columnId];
                  if (channelKey) {
                    channelQty += subRow[channelKey];
                  }
                }
                eachRow.total_qty = overAllTotal;
                eachRow[columnId] = clusterTotal;
                if (channelKey) {
                  eachRow[channelKey] = channelQty;
                }
              }
            }
            return null;
          });
      }
      tempData.push(eachRow);
    });
    if (
      styleUpdateMessage &&
      !props.screenConfiguration["2.3"].style_msg_not_required
    ) {
      displaySnackMessage(
        "Style Id updated according to attributes",
        "success",
        props.addSnack
      );
    }
    if (
      isDropPlan(
        props.planDetails?.data,
        `${props.screenConfiguration?.common?.drop_key || "drops"}_count`
      ) &&
      (columnId.includes("clusters_") ||
        columnId.includes("total_qty") ||
        columnId.includes("_units") ||
        columnId === "forecasted_qty" ||
        columnId.includes("forecasted_qty") ||
        columnId === "st")
    ) {
      tempData.map((eachRow) => {
        if (
          eachRow?.subRows &&
          eachRow?.choice_name === updatedParentRow?.choice_name
        ) {
          eachRow["subRows"] = updatedChildRows;
          eachRow = cloneDeep(eachRow);
          let clusterTotalObj = {};
          //Calculating total of child clusters w.r.t column
          updatedChildRows.map((childRow) => {
            Object.keys(childRow).map((key) => {
              if (key.includes("clusters_")) {
                clusterTotalObj[key] =
                  (clusterTotalObj[key] || 0) + childRow[key];
              }
            });
          });
          // Setting total cluster data to parent cluster
          Object.keys(clusterTotalObj).map((key) => {
            eachRow[key] = clusterTotalObj[key];
          });
          // Setting child row data to subrow
          eachRow.subRows.map((subRow, index) => {
            subRow["total_qty"] = updatedChildRows[index]["total_qty"];
          });
        }
        // Distributing updated parent total_qty data to child total_qty based on percentage flow
        if (eachRow.parent_wedge_id === row.parent_wedge_id) {
          let subRowTotalQuantity = 0;
          for (let i = 0; i < eachRow.totalClusters; i++) {
            subRowTotalQuantity =
              subRowTotalQuantity +
              (eachRow[
                `clusters_${eachRow["cluster_display_name" + (i + 1)]}`
              ] || 0) *
                (eachRow["store_count" + (i + 1)] || 0);
          }
          eachRow.total_qty = subRowTotalQuantity;
          // Calculate total of channel units parent row based on child rows
          let channelQty = 0;
          let channel = isColumnIdContainsChannel(
            columnId,
            props.planDetails?.data
          );
          let flowSubRow = [];
          if (eachRow?.subRows) {
            tempData.forEach((data) => {
              if (
                (columnId.includes("_units") ||
                  columnId.includes("_forecasted_qty")) &&
                data.parent_wedge_id === row.parent_wedge_id
              ) {
                if (data.subRows?.length > 0) {
                  flowSubRow = [];
                  let parentTotalQty = 0;
                  let parentTotalForecastedQty = 0;
                  data.subRows.map((subRow) => {
                    let totalChannelQty = {};
                    propsRef.current?.planMetricsData?.[0]?.channel?.[
                      data.l3_name
                    ].map((chn) => {
                      for (var i = 1; i <= subRow.cluster_count; i++) {
                        if (subRow[`cluster_display_name${i}`].includes(chn)) {
                          totalChannelQty[`${chn}_units`] =
                            (totalChannelQty[`${chn}_units`] || 0) +
                            subRow[
                              `clusters_${subRow[`cluster_display_name${i}`]}`
                            ] *
                              subRow[`store_count${i}`];
                        }
                      }
                    });
                    let totalQty = 0;
                    let totalForecasetedQty = 0;
                    Object.keys(totalChannelQty).map((key) => {
                      subRow[key] = totalChannelQty[key];
                      totalQty = totalQty + totalChannelQty[key];
                    });
                    subRow[
                      `${channelColumnId || forecastedColumnId}_forecasted_qty`
                    ] =
                      (subRow.st / 100) *
                      subRow[`${channelColumnId || forecastedColumnId}_units`];
                    Object.keys(subRow).map((key) => {
                      if (key.includes("_forecasted_qty")) {
                        totalForecasetedQty = totalForecasetedQty + subRow[key];
                      }
                    });
                    subRow["total_qty"] = totalQty;
                    subRow["forecasted_qty"] = totalForecasetedQty;
                    parentTotalQty = parentTotalQty + totalQty;
                    parentTotalForecastedQty =
                      parentTotalForecastedQty + totalForecasetedQty;
                    flowSubRow.push(subRow);
                  });
                  data["total_qty"] = parentTotalQty;
                  data["forecasted_qty"] = parentTotalForecastedQty;
                } else {
                  let totalChannelQty = {};
                  propsRef.current?.planMetricsData?.[0]?.channel?.[
                    data.l3_name
                  ].map((chn) => {
                    for (var i = 1; i <= data.cluster_count; i++) {
                      if (data[`cluster_display_name${i}`].includes(chn)) {
                        totalChannelQty[`${chn}_units`] =
                          (totalChannelQty[`${chn}_units`] || 0) +
                          data[`clusters_${data[`cluster_display_name${i}`]}`] *
                            data[`store_count${i}`];
                      }
                    }
                  });
                  let totalQty = 0;
                  let totalForecasetedQty = 0;
                  Object.keys(totalChannelQty).map((key) => {
                    data[key] = totalChannelQty[key];
                    totalQty = totalQty + totalChannelQty[key];
                  });
                  data[
                    `${channelColumnId || forecastedColumnId}_forecasted_qty`
                  ] =
                    (data.st / 100) *
                    data[`${channelColumnId || forecastedColumnId}_units`];
                  Object.keys(data).map((key) => {
                    if (key.includes("_forecasted_qty")) {
                      totalForecasetedQty = totalForecasetedQty + data[key];
                    }
                  });
                  data["total_qty"] = totalQty;
                  data["forecasted_qty"] = totalForecasetedQty;
                }
              }
            });
            if (
              propsRef.current?.planMetricsData?.[0]?.channel?.[data.l3_name]
                ?.length > 1 &&
              channel &&
              columnId.includes("clusters_")
            ) {
              eachRow[`${channel}_units`] = channelQty;
            }
            eachRow["subRows"] = flowSubRow;
          }
          if (channelColumnId !== "") {
            eachRow[`${channelColumnId}_forecasted_qty`] =
              (eachRow.st / 100) * eachRow[`${channelColumnId}_units`];
          } else {
            eachRow[`forecasted_qty`] = (eachRow.st / 100) * eachRow.total_qty;
          }
        }
        if (
          eachRow?.choice_name === updatedParentRow?.choice_name &&
          !eachRow?.subRows &&
          columnId.includes("_units")
        ) {
          let channelClusterTotalObj = {},
            clusterStoreCount = {};
          // calculating store count
          Object.keys(eachRow).map((key) => {
            if (key.includes("cluster_code")) {
              // Get store count for particular clusters
              let split = key.split("cluster_code");
              if (channelColumnId === eachRow[`channel${[split?.[1]]}`]) {
                clusterStoreCount[
                  `clusters_${eachRow[`cluster_display_name${split?.[1]}`]}`
                ] = eachRow[`store_count${split?.[1]}`];
              }
            }
          });
          // Calculating total of child clusters w.r.t column and channels
          Object.keys(eachRow).map((key) => {
            if (key.includes("clusters_") && columnId.includes("_units")) {
              channelClusterTotalObj[`${channelColumnId}_units`] =
                (channelClusterTotalObj[`${channelColumnId}_units`] || 0) +
                (eachRow[key] || 0) * (clusterStoreCount[key] || 0);
            }
          });
          // Setting total cluster data of the channels
          Object.keys(channelClusterTotalObj).map((key) => {
            eachRow[key] = channelClusterTotalObj[key];
          });
        }
      });
    }
    AGInstance.current.api.refreshCells({
      update: tempData,
    });
    validateWedgeData(tempData);
    props.receiveWedgeTableData(
      tempData,
      propsRef?.current?.uniqueClusterList,
      "choice_level"
    );
  };

  const validateWedgeData = (tableData) => {
    props.setWedgeValidationMsg("");
    tableData.map((node) => {
      propsRef.current.wedgeAttributeData.map((attributeData) => {
        if (!node["attributes_" + attributeData?.attribute_name]) {
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
      validateWedgeData(wedgeSelectedDropTableData);
      const reqBody = {
        plan_wedge_data: props.finalWedgeData,
        is_completed: false,
        is_scaling: false,
        is_update_plan_step: false,
        plan_sub_step: "wedge_table",
        is_value_changed: props.isChoiceWedgeChanged,
      };
      if (
        props.screenConfiguration?.common?.show_style_level ||
        props.screenConfiguration?.common?.endpoint_project_name ===
          "assort-smart"
      ) {
        reqBody["wedge_level"] = "choice_level";
      }
      const updateResponse = await props.updateWedgeData(
        reqBody,
        props.screenConfiguration?.common?.endpoint_project_name || "assort"
      );
      if (updateResponse?.data.status) {
        if (props.statusImageMap) {
          props.callImageWedgeMap();
        }
        props.setIsChoiceWedgeChanged(false);
        props.setSelectedDropData(val);
        filters.current = {
          ...filters.current,
          [props.screenConfiguration?.common?.drop_key || "drop"]: [val],
        };
        props.setWedgeData([]);
        props.setCallPackData(true);
        AGInstance.current.api?.refreshServerSideStore({ purge: true });
      }
    }
  };

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
    let limit = 0,
      sort = [];
    if (selectedPageIndex?.current !== pageIndex) {
      let reqBody = {
        plan_wedge_data: propsRef?.current?.finalWedgeData,
        is_completed: false,
        is_scaling: false,
        is_update_plan_step: false,
        plan_sub_step: "wedge_table",
        is_value_changed: props.isChoiceWedgeChanged,
      };
      if (
        props.screenConfiguration?.common?.endpoint_project_name ===
        "assort-smart"
      ) {
        reqBody["wedge_level"] = "choice_level";
      }
      const updateResponse = await props.updateWedgeData(
        reqBody,
        props.screenConfiguration?.common?.endpoint_project_name || "assort"
      );
      if (updateResponse?.data.status) {
        if (propsRef.current.statusImageMap) {
          props.callImageWedgeMap();
        }
      }
      props.setIsChoiceWedgeChanged(false);
      selectedPageIndex.current = pageIndex;
    }

    let planData = cloneDeep(props.planDetails?.data);
    planData.l1_name = [
      filters.current.selectedL1FilterValue || planData["l1_name"][0],
    ];
    planData.l2_name = [
      filters.current.selectedL2FilterValue || planData["l2_name"][0],
    ];
    planData.l3_name = filters.current.selectedL3FilterValue;
    let payload = getPlanPayload(planData, props.planLevels);
    let drop = filters.current[
      props.screenConfiguration?.common?.drop_key || "drop"
    ]
      ? filters.current[props.screenConfiguration?.common?.drop_key || "drop"]
      : isDropPlan(
          propsRef?.current?.planDetails?.data,
          `${props.screenConfiguration?.common?.drop_key || "drops"}_count`
        )
      ? [`${props.screenConfiguration?.common?.drop_key || "drops"}_1`]
      : ["-"];
    payload.filters.push(
      {
        attribute_name: "l3_name",
        value: planData["l3_name"],
        prefix: "levels",
        operator: "in",
      },
      {
        attribute_name: props.screenConfiguration?.common?.drop_key || "drop",
        value: drop,
        prefix: "levels",
        operator: "in",
      }
    );
    const reqBody = {
      filters: payload.filters,
    };
    pageIndex = pageIndex || 0;
    let flowListLength =
      filters.current.selectedChoiceCarryoverFlag === "Carryover" &&
      props.screenConfiguration?.common?.show_style_level
        ? isDropPlan(
            propsRef?.current?.planDetails?.data,
            `${props.screenConfiguration?.common?.drop_key || "drops"}_count`
          )
          ? propsRef?.current?.flowList[drop]?.length
          : 1
        : isDropPlan(
            propsRef?.current?.planDetails?.data,
            `${props.screenConfiguration?.common?.drop_key || "drops"}_count`
          )
        ? propsRef?.current?.flowList[drop]?.length
        : 1;
    // Calculate total
    let multipleChannelCluster = {};
    propsRef?.current?.planMetricsData?.[0]?.channel[
      filters?.current?.selectedL3FilterValue?.[0]
    ].forEach((channel) => {
      multipleChannelCluster[channel] = [];
      propsRef?.current?.planMetricsData?.[0]?.cluster_code.forEach(
        (cluster) => {
          if (!isChannelMultiple(props.planDetails?.data)) {
            multipleChannelCluster[channel].push(cluster);
          } else if (cluster.includes(channel)) {
            multipleChannelCluster[channel].push(cluster);
          }
        }
      );
    });
    let multipleChannelTotalClusterFlow = 0;
    Object.values(multipleChannelCluster).map((val) => {
      multipleChannelTotalClusterFlow =
        multipleChannelTotalClusterFlow + val.length * flowListLength;
    });
    limit = 10 * (multipleChannelTotalClusterFlow || 1);
    if (
      props.screenConfiguration?.common?.show_style_level ||
      props.screenConfiguration?.common?.endpoint_project_name ===
        "assort-smart"
    ) {
      sort = manualbody?.sort?.length
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
            {
              column: "channel_qty",
              order: "asc",
            },
            {
              column: "l3_name",
              order: "asc",
            },
          ];
      reqBody.filters.push({
        attribute_name: "wedge_level",
        value: ["choice_level"],
        prefix: "levels",
        operator: "in",
      });
      reqBody.filters.push({
        attribute_name: "choice_carryover_flag",
        value:
          props.screenConfiguration?.common?.endpoint_project_name ===
            "assort-smart" &&
          !props.screenConfiguration?.common?.show_style_level
            ? ["New"]
            : filters.current.selectedChoiceCarryoverFlag
            ? [filters.current.selectedChoiceCarryoverFlag]
            : ["Carryover"],
        prefix: "attribute_value",
        operator: "in",
      });
    } else {
      sort = [
        {
          column: "order_of_choice",
          order: "asc",
        },
        {
          column: "channel_qty",
          order: "asc",
        },
        {
          column: "l3_name",
          order: "asc",
        },
      ];
    }

    let pagination = {
      sort: sort,
      search: [],
      range: [],
      limit: {
        limit: limit,
        page: pageIndex + 1,
      },
    };

    reqBody.pagination = pagination;

    try {
      props.set2_3_Loader(true);
      pageIndex = pageIndex || 0;
      let wedgeResponse = await props.getWedgeData(
        reqBody,
        props.screenConfiguration?.common?.endpoint_project_name || "assort"
      );
      if (wedgeResponse?.data?.status) {
        props.setWedgeColumn(wedgeResponse?.data?.data?.columns);
        props.set2_3_Loader(false);
        props.setWedgeData(wedgeResponse?.data?.data?.data);
      }
      let data = wedgeDataPlotting(
        props,
        wedgeResponse?.data?.data?.data,
        propsRef?.current?.planMetricsData?.[0]?.attribute_list,
        propsRef?.current?.wedgeAttributeData,
        propsRef?.current?.planDetails?.data,
        setAttributesForStylesJson,
        setStylesForattributesJson,
        "choice_level"
      );
      let uniqueClusterData = wedgeResponse?.data?.data?.data
        .map((p) => p.cluster_display_name)
        .filter(
          (cluster_display_name, index, arr) =>
            arr.indexOf(cluster_display_name) === index
        )
        .sort();
      if (props.planMetricsData?.[0]?.choice_msg_list) {
        props.planMetricsData[0].choice_msg_list.forEach((msg) => {
          if (msg !== "") {
            setShowMOQMessage(true);
            setMoqMessage(msg.split(":")[1]);
          }
        });
      }
      let rowData = formatChoiceTableDataGrouping(
        props,
        data,
        propsRef.current.selectedDropData
      );
      setUniqueClusterData(uniqueClusterData);
      props.setDisableNext(false);
      props.setShowReceiptDrawer(true);
      props.setWedgeTableData(data);
      setWedgeTableData(data);
      setWedgeSelectedDropTableData(rowData);
      validateWedgeData(rowData);
      return {
        data: rowData,
        totalCount: Math.round(
          (wedgeResponse?.data?.data?.total_records / limit) * 10
        ),
      };
    } catch (error) {
      //Error handling
      props.set2_3_Loader(false);
    }
  };

  const handleDeleteChoice = (val) => {
    if (val) {
      props.handleDeleteChoicePopup();
    } else {
      // In case user selects No, Make delete choice also as No
      let tempData = [];
      AGInstance.current.api.forEachNode((node) => {
        node = node.data;
        node["delete_choice"] = "No";
        tempData.push(node);
      });
      AGInstance.current.api.refreshCells({
        update: tempData,
      });
      props.receiveWedgeTableData(
        tempData,
        props.uniqueClusterList,
        "choice_level"
      );
    }
  };

  const callUpdateChoiceWedgeData = async () => {
    try {
      set2_3_Loader(true);
      const reqBody = {
        plan_wedge_data: props.finalWedgeData,
        is_completed: true,
        is_scaling: false,
        is_update_plan_step: false,
        plan_sub_step: "wedge_table",
        is_value_changed: props.isChoiceWedgeChanged,
      };
      if (props.screenConfiguration?.common?.show_style_level) {
        reqBody["wedge_level"] = "choice_level";
      }
      const updateResponse = await props.updateWedgeData(
        reqBody,
        props.screenConfiguration?.common?.endpoint_project_name || "assort"
      );
      if (updateResponse?.data.status) {
        props.setCallUpdateChoiceWedge(false);
        props.setIsChoiceWedgeChanged(false);
        if (props.statusImageMap) {
          props.callImageWedgeMap();
        }
        if (props.isDownload) {
          generateDownloadData();
        } else {
          AGInstance.current.api?.refreshServerSideStore({ purge: true });
        }
      }
    } catch (error) {
      set2_3_Loader(false);
      displaySnackMessage("Update wedge failed", "error", props.addSnack);
    }
    set2_3_Loader(false);
  };

  // NOTE: Incase of type "str" and all_door_choice, onBlur and onChange is not getting called.
  // Setting data using onCellValueChanged for type "str" columns
  const updateWedgeTableDataOnChange = (params) => {
    const { newValue, oldValue, colDef } = params;
    let columnId = colDef.column_name;
    let row = params.data;
    let tempRowData = [];
    let groupSetByName = [];
    AGInstance.current.api.forEachNode((eachRow, index) => {
      eachRow = eachRow.data;
      if (eachRow.uniqueID === row.uniqueID) {
        if (
          colDef.type === "str" ||
          columnId === "delete_choice" ||
          columnId === "all_door_choice" ||
          columnId === "flow_to_next_season" ||
          columnId === "dropship_choice"
        ) {
          eachRow[columnId] = newValue;
        }
        if (columnId === "all_door_choice" && newValue === "Yes") {
          for (let index = 0; index < eachRow.totalClusters; index++) {
            let clusterValue = eachRow["cluster_display_name" + (index + 1)];
            //if all door choice is yes then all cluster qty should have minimum quantity
            if (
              propsRef.current.l3MinQtyJson[eachRow.l3_name] >
              eachRow["clusters_" + clusterValue]
            ) {
              //assign all clusters with minimum quantity
              eachRow["clusters_" + clusterValue] =
                propsRef.current.l3MinQtyJson[eachRow.l3_name];
            }
          }
          eachRow["dropship_choice"] = "No";
          recalculateTotalQty(
            eachRow,
            oldValue,
            columnId,
            setShowDeleteConfirmDialog,
            props
          );
        }
        if (
          columnId === "dropship_choice" &&
          newValue === "Yes" &&
          eachRow.uniqueID === row.uniqueID
        ) {
          props.dropShipChoices.push({
            l0_name: eachRow.l0_name,
            l1_name: eachRow.l1_name,
            l2_name: eachRow.l2_name,
            l3_name: eachRow.l3_name,
            choice_name: eachRow.choice_name,
            channel: props.planDetails?.data?.channel[0],
            sub_channel: props.planDetails?.data?.channel[0],
          });
          props.setDropShipChoices(props.dropShipChoices);
        }
        if (columnId.includes("attributes")) {
          let split = columnId.split("attributes_")?.[1];
          eachRow[split] = newValue;
          eachRow[columnId] = newValue;
          eachRow?.subRows?.length &&
            eachRow?.subRows.forEach((subRow) => {
              subRow[columnId] = newValue;
              subRow[split] = newValue;
            });
        }
        if (
          (columnId.includes("attributes") ||
            columnId === "article_number" ||
            columnId === "style_name" ||
            columnId === "style_no" ||
            columnId === "color_code" ||
            columnId === "color_name") &&
          propsRef.current.screenConfiguration.common.show_product_image
          //   &&
          // row.style_des &&
          // row.style_des !== ""
        ) {
          eachRow["is_image_mapped"] = "False";
          eachRow["image_name_url"] = DEFAULT_IMAGE_LINK;
          props.setStatusImageMap(true);
        }
        if (columnId === "delete_choice" && newValue === "Yes") {
          let selectedChoice = checkIfSetContainsChoice(
            propsRef.current.choiceSetDetails,
            row
          );
          if (selectedChoice?.length) {
            eachRow["delete_choice"] = "No";
            displaySnackMessage(
              "To delete choice, it should be removed from set",
              "warning",
              props.addSnack
            );
          }
        }
        if (columnId === "lock_choice") {
          groupSetByName = propsRef.current.choiceSetDetails
            .filter(
              (choice) =>
                choice.set_name &&
                choice.set_name === eachRow.set_name &&
                choice.set_name !== ""
            )
            .map((obj) => obj.choice_name);
        }
        if (columnId === "map_style") {
          if (newValue) {
            let selectedRows = props.selectedChoices;
            selectedRows.push(eachRow);
            props.setSelectedChoices(selectedRows);
          } else {
            let selectedRows = props.selectedChoices.filter(
              (row) => row.choice_name !== eachRow.choice_name
            );
            props.setSelectedChoices(selectedRows);
          }
        }
      } else if (
        columnId === "delete_choice" &&
        eachRow.parent_wedge_id === row.parent_wedge_id
      ) {
        if (newValue === "Yes") {
          let selectedChoice = checkIfSetContainsChoice(
            propsRef.current.choiceSetDetails,
            row
          );
          if (selectedChoice?.length) {
            eachRow["delete_choice"] = "No";
            displaySnackMessage(
              "To delete choice, it should be removed from set",
              "warning",
              props.addSnack
            );
          } else {
            eachRow[columnId] = newValue;
          }
        } else {
          eachRow[columnId] = newValue;
        }
      }
      tempRowData.push(eachRow);
    });

    tempRowData.map((rowData) => {
      if (
        columnId === "lock_choice" &&
        groupSetByName.includes(rowData.choice_name)
      ) {
        rowData[columnId] = newValue;
      }
    });
    AGInstance.current.api.refreshCells({
      update: tempRowData,
    });

    validateWedgeData(tempRowData);

    // Remove special character from cell values
    tempRowData.map((data) => {
      Object.keys(data).map((key) => {
        data[key] =
          data[key] && key === columnId && colDef.type === "str"
            ? data[key].replace(/\$|\%|\'/g, "")
            : data[key];
      });
    });
    props.receiveWedgeTableData(
      tempRowData,
      propsRef?.current?.uniqueClusterList,
      "choice_level"
    );
  };

  const renderHighlightChoiceNameForGroupedColumn = (data) => {
    let styledChip;
    props.planDetails.data.channel.map((chanKey) => {
      if (data.total_qty < data[chanKey + "_moq"]) {
        styledChip = (
          <StyledChip
            label={data.choice_name}
            color={PLAN_STEP_BGCOLOR_MAPPER["incomplete"]}
          />
        );
      }
    });
    return styledChip ? styledChip : data.choice_name;
  };

  const loadTableInstance = (params) => {
    AGInstance.current = params;
    if (
      isDropPlan(
        props.planDetails?.data,
        `${props.screenConfiguration?.common?.drop_key || "drops"}_count`
      )
    ) {
      let selectedDrop = Object.keys(
        groupBy(
          wedgeTableData,
          `${props.screenConfiguration?.common?.drop_key || "drop"}_name`
        )
      )[0];
      var hardcodedFilter = {
        [`${props.screenConfiguration?.common?.drop_key || "drop"}_name`]: {
          type: "equals",
          filter: selectedDrop,
        },
      };
      AGInstance.current.api.setFilterModel(hardcodedFilter);
    }
    AGInstance.current.columnApi.setColumnVisible(
      `${props.screenConfiguration?.common?.flow_key || "flow"}_name`,
      false
    );
  };

  const autoGroupColumnDef = {
    headerName: "Choice Name",
    hide: true,
    pinned: "left",
    cellRendererParams: {
      suppressCount: true,
    },
    headerComponent: SortComponent,
    width: 200,
    type: "str",
    valueGetter: (ins) => {
      return ins?.data?.[
        `${props.screenConfiguration?.common?.flow_key || "flow"}_name`
      ] !== "-"
        ? ins?.data?.[
            `${props.screenConfiguration?.common?.flow_key || "flow"}_name`
          ]
        : renderHighlightChoiceNameForGroupedColumn(ins?.data);
    },
  };

  const showAddNewAttributeOption = (
    <div
      className={classes.createSetOptDiv}
      onClick={() => setShowAddNewAttributeField(true)}
    >
      <span className={classes.createAddNewOpt}>{"Add new attribute"}</span>
    </div>
  );

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
        onBlur={updateWedgeTableDataOnBlur}
        onCellValueChanged={updateWedgeTableDataOnChange}
        treeData={
          isDropPlan(
            props.planDetails?.data,
            `${props.screenConfiguration?.common?.drop_key || "drops"}_count`
          )
            ? true
            : false
        }
        customCellRenderer={(cellProps) =>
          assortAgGridCustomCellRenderer(
            cellProps,
            "wedge_table",
            null,
            propsRef.current,
            null,
            null,
            props.screenConfiguration
          )
        }
        autoGroupColumnDef={
          isDropPlan(
            props.planDetails?.data,
            `${props.screenConfiguration?.common?.drop_key || "drops"}_count`
          )
            ? autoGroupColumnDef
            : {}
        }
        rowSelection="multiple"
        uniqueRowId={"uniqueID"}
        sideBar={false}
        tableId={"wedge-table"}
        serverSideStoreType={"partial"}
        cacheBlockSize={10}
        adjustTableHeight={true}
        skipHeaderOnAutoSize={true}
      />
      <Prompt
        isOpen={showDeleteConfirmDialog}
        title="Delete Choice"
        subHeading="Assigning 0 units to a choice will get the choice deleted from wedge. Do you want to continue?"
        infoList={[]}
        primaryButtonProps={{
          children: common.__ConfirmBtnText,
          onClick: () => {
            handleDeleteChoice(true);
            setShowDeleteConfirmDialog(false);
          },
        }}
        tertiaryButtonProps={{
          children: common.__RejectBtnText,
          onClick: () => {
            handleDeleteChoice(false);
            setShowDeleteConfirmDialog(false);
          },
        }}
        variant="error"
      />
      {showMOQMessage && <p className={classes.clusterNotes}>{moqMessage}</p>}
    </>
  );
};

const mapStateToProps = (state) => {
  return {
    planDetails: planDashboardServiceActions.planDetailsDataSelector(state),
    wedgeData: planWedgeServiceActions.wedgeDataSelector(state),
    planLevels: planDashboardServiceActions.planLevelsDataSelector(state),
    wedgeAttributeData: planWedgeServiceActions.wedgeAttributeDataSelector(
      state
    ),
    planMetricsData: planWedgeServiceActions.planMetricsDataSelector(state),
    columnHeaderJson: planDashboardServiceActions.columnHeaderJsonSelector(
      state
    ),
    wedgeFiltersData: planWedgeServiceActions.wedgeFiltersDataSelector(state),
    drops_count: planDashboardServiceActions.planDetailsDataSelector(state)
      ?.data?.drops_count,
    l3MinQtyJson: planWedgeServiceActions.l3MinQtyJsonSelector(state),
    storeEligibilityData: planInitialServiceActions.ClusterStoreEligibilitySelector(
      state
    ),
    screenConfiguration:
      state.assortsmartReducer.commonAssortReducer.screenConfiguration,
    planSetupDropsData:
      state.assortsmartReducer.planWedgeReducer.planSetupDropsData?.data?.data,
  };
};

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators(
    {
      setPlanMetricsData,
      setWedgeFiltersData,
      setWedgeData,
      updateWedgeData,
      getWedgeData,
      imageGenWedgeMapping,
      addWedgeAttribute,
      setWedgeAttributeData,
      set2_3_Loader,
      addSnack,
    },
    dispatch
  );
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(PlanWedgeComponent));
