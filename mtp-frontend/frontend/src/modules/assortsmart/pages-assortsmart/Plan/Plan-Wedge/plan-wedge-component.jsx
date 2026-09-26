import React, { useEffect, useMemo, useRef, useState } from "react";
import AgGridTable from "core/Utils/agGrid";
import SortComponent from "core/Utils/agGrid/column-component/sortComponent";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import StyledChip from "core/Utils/chip/StyledChip";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import { addSnack } from "core/actions/snackbarActions";
import { Prompt } from "impact-ui";
import { cloneDeep, find, groupBy, isArray, isEmpty, max } from "lodash";
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
  PLAN_WEDGE_TABLE_COLUMNS,
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
  recalculateChoiceClusterTotalQty,
  recalculateChoiceLevelTotalQty,
  recalculateTotalQty,
  wedgeDataPlotting,
} from "./plan-wedge-functions";
import { Add, ArrowBack } from "@mui/icons-material";
import { Button, TextField, Tooltip } from "@mui/material";
import { withStyles } from "@mui/styles";
import globalStyles from "core/Styles/globalStyles";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";

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
  props.unmappedWedgeAttributes.map((obj, index) =>
    options.push({
      label: obj.attribute_name,
      value: obj.attribute_value?.[0] || `empty_${index}`,
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
  const [isDispalyMOQMessage, setIsDispalyMOQMessage] = useState(false);
  const [cacheSize, setCacheSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const history = useHistory();
  const classes = useStyles();
  const AGInstance = useRef({});
  let filters = useRef({});
  let propsRef = useRef({});
  let selectedAttributeRef = useRef([]);
  let newAttributeRef = useRef([]);
  let selectedPageIndex = useRef(0);
  let selectedImage = useRef(null);
  let showPaginationPageSize = useRef(true);
  let wedgeAttributeRef = useRef(null);
  wedgeAttributeRef.current = props.wedgeAttributeData;
  const isView = history.location.pathname.includes("view");

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
        `${
          props.screenConfiguration?.common?.drop_key.includes("drop")
            ? "drops"
            : props.screenConfiguration?.common?.drop_key || "drops"
        }_count`
      )
    ) {
      filters.current = {
        ...filters.current,
        [props.screenConfiguration?.common?.drop_key || "drop"]: [
          `${
            props.screenConfiguration?.common?.drop_key.includes("drop")
              ? "drops"
              : props.screenConfiguration?.common?.drop_key || "drops"
          }_1`,
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
        if (col.column_name === "headers_door_group") {
          col.sub_headers.forEach((sub) => {
            sub.maxWidth = "200";
          });
        }
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
            `${
              props.screenConfiguration?.common?.drop_key.includes("drop")
                ? "drops"
                : props.screenConfiguration?.common?.drop_key || "drops"
            }_count`
          )
            ? "agTextColumnFilter"
            : "";
        }
        if (
          col.accessor === "choice_name" &&
          isDropPlan(
            props.planDetails?.data,
            `${
              props.screenConfiguration?.common?.drop_key.includes("drop")
                ? "drops"
                : props.screenConfiguration?.common?.drop_key || "drops"
            }_count`
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
          if (
            props.screenConfiguration?.["2.3"].show_additional_attribute &&
            !history.location.pathname.includes("view")
          ) {
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
        if (col.column_name === "hero_status") {
          col.cellStyle = (params) => {
            if (
              params?.data?.["is_hero_status_change"]?.toLowerCase() === "true"
            ) {
              return { backgroundColor: "rgb(255, 243, 234)" };
            }
            return null;
          };
        }
        if (col.column_name === "program") {
          col.cellStyle = (params) => {
            if (params?.data?.["is_program_change"]?.toLowerCase() === "true") {
              return { backgroundColor: "rgb(255, 243, 234)" };
            }
            return null;
          };
        }
        if (col.column_name === "subbrand") {
          col.cellStyle = (params) => {
            if (
              params?.data?.["is_subbrand_change"]?.toLowerCase() === "true"
            ) {
              return { backgroundColor: "rgb(255, 243, 234)" };
            }
            return null;
          };
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
        `${
          props.screenConfiguration?.common?.drop_key.includes("drop")
            ? "drops"
            : props.screenConfiguration?.common?.drop_key || "drops"
        }_count`
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
        `${
          props.screenConfiguration?.common?.drop_key.includes("drop")
            ? "drops"
            : props.screenConfiguration?.common?.drop_key || "drops"
        }_count`
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
        if (
          col.column_name === "flow_to_next_season" &&
          props.screenConfiguration?.common?.endpoint_project_name === "assort"
        ) {
          col.options = props.generateOptions(Plan.__Flow_To_Next_option);
        } else {
          col.options = props.generateOptions(Plan.__Lock_Choice_Option);
        }
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
        attribute[obj.label] = obj.value.includes("empty") ? "" : obj.value;
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
      props.screenConfiguration?.common?.endpoint_project_name || "assort",
      props.planDetails?.data?.plan_code
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
        props.screenConfiguration?.common?.endpoint_project_name || "assort",
        props.planDetails?.data?.plan_code
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
                obj["total_door_count"] = obj[`${chanKey}_door_count`];
                obj["st"] = obj[`${chanKey}_st`];
                obj["avg_wk_cnt_ty"] = obj[`${chanKey}_avg_wk_cnt_ty`];
                if (obj.subRows?.length > 0) {
                  obj.subRows.forEach((sub) => {
                    sub["channels"] = chanKey;
                    sub["total_qty"] = sub[`${chanKey}_units`];
                    sub["forecasted_qty"] = sub[`${chanKey}_forecasted_qty`];
                    sub["total_door_count"] = sub[`${chanKey}_door_count`];
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
        if (
          isDropPlan(
            props.planDetails?.data,
            `${
              props.screenConfiguration?.common?.drop_key.includes("drop")
                ? "drops"
                : props.screenConfiguration?.common?.drop_key || "drops"
            }_count`
          ) &&
          params?.data?.[chanKey + "_units"] < params?.data?.[chanKey + "_moq"]
        ) {
          styledChip = (
            <StyledChip
              label={replaceSpecialCharacter(params?.value)}
              color={PLAN_STEP_BGCOLOR_MAPPER["incomplete"]}
            />
          );
        } else if (params.data.total_qty < params.data[chanKey + "_moq"]) {
          styledChip = (
            <StyledChip
              label={replaceSpecialCharacter(params?.value)}
              color={PLAN_STEP_BGCOLOR_MAPPER["incomplete"]}
            />
          );
        }
      });

      return styledChip ? styledChip : replaceSpecialCharacter(params.value);
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
    let columnId = column.colDef.accessor;
    let oldValue = initialValue;
    let row = data;
    let tempData = [];
    let channelColumnId = columnId.includes("_units")
      ? columnId.split("_units")[0]
      : columnId.includes("_forecasted_qty")
      ? columnId.split("_forecasted_qty")?.[0]
      : columnId.includes("_aps")
      ? columnId.split("_aps")?.[0]
      : columnId.includes("_reg_weeks")
      ? columnId.split("_reg_weeks")?.[0]
      : columnId.includes("_st")
      ? columnId.split("_st")?.[0]
      : null;
    let parentTotalQty = 0;
    let styleUpdateMessage = false;
    let msgFlag = true;
    props.setIsChoiceWedgeChanged(true);
    let attributeKey = [];
    //storing the keys of attribute columns
    propsRef?.current?.wedgeAttributeData &&
      propsRef?.current?.wedgeAttributeData.map((attr) => {
        attributeKey.push(attr.attribute_name);
        return null;
      });

    if (
      columnId === PLAN_WEDGE_TABLE_COLUMNS.color_code ||
      columnId === PLAN_WEDGE_TABLE_COLUMNS.style_no ||
      columnId.includes("commercial")
    ) {
      props.setIsStyleColorChanged(true);
    }

    AGInstance.current.api.forEachNode((eachRow, index) => {
      let expanded = eachRow.expanded;
      eachRow = eachRow.data;
      if (eachRow.choice_name === row.choice_name) {
        let isSingleChannel = false;
        if (
          columnId === PLAN_WEDGE_TABLE_COLUMNS.color_code ||
          columnId === PLAN_WEDGE_TABLE_COLUMNS.style_no
        ) {
          if (!newValue && !eachRow.is_changed) {
            eachRow.is_changed = true;
            eachRow.market_style_changed_count += 1;
          } else if (
            eachRow.style_no &&
            eachRow.color_code &&
            !eachRow.is_changed
          ) {
            eachRow.is_changed = true;
            eachRow.market_style_changed_count += 1;
          }
          eachRow?.subRows?.length &&
            eachRow.is_changed &&
            eachRow?.subRows.forEach((subRow) => {
              subRow.market_style_changed_count =
                eachRow.market_style_changed_count;
            });
        }
        if (oldValue !== newValue) {
          let choice = props.editedChoiceUnits;
          choice.push(row.choice_name);
          props.setEditedChoiceUnits(choice);
          props.setEnableUpdateStyleBtn(true);
        }
        if (
          ((newValue === 0 &&
            eachRow?.dropship_choice === "No" &&
            !isDropPlan(
              props.planDetails?.data,
              `${
                props.screenConfiguration?.common?.drop_key.includes("drop")
                  ? "drops"
                  : props.screenConfiguration?.common?.drop_key || "drops"
              }_count`
            ) &&
            columnId.includes("total_qty")) ||
            (isDropPlan(props.planDetails?.data) &&
              eachRow?.subRows &&
              newValue === 0 &&
              eachRow?.dropship_choice === "No" &&
              eachRow.uniqueID === row.uniqueID)) &&
          columnId.includes("total_qty")
        ) {
          eachRow[columnId] = oldValue;
          eachRow["delete_choice"] = "Yes";
          setShowDeleteConfirmDialog(true);
          return;
        }
        if (columnId.includes("_aps") && eachRow.uniqueID === row.uniqueID) {
          eachRow[`${channelColumnId}_forecasted_qty`] =
            newValue *
            eachRow[`${channelColumnId}_reg_weeks`] *
            eachRow[`${channelColumnId}_door_count`];
        }
        if (
          (columnId === "total_qty" || columnId.includes("_units")) &&
          eachRow.uniqueID === row.uniqueID &&
          !oldValue
        ) {
          eachRow[columnId] = oldValue;
          displaySnackMessage(
            "Please Enter cluster units more than 0 to reflect the values",
            "error",
            props.addSnack
          );
          props.setIsScaleUpDownDisabled(true);
        }
        if (columnId === "st") {
          eachRow["st"] = newValue < 0 ? 0 : newValue > 100 ? 100 : newValue;
          newValue = newValue < 0 ? 0 : newValue > 100 ? 100 : newValue;
        }
        if (columnId.includes("_st") && eachRow.uniqueID === row.uniqueID) {
          eachRow[`${channelColumnId}_units`] =
            eachRow[`${channelColumnId}_forecasted_qty`] /
            parseFloat(newValue / 100);
          eachRow[`${channelColumnId}_inventory`] =
            eachRow[`${channelColumnId}_units`] +
            parseFloat(eachRow[`${channelColumnId}_bop_unit`] || 0);
          eachRow?.subRows?.length &&
            eachRow?.subRows.forEach((subRow) => {
              subRow[`${channelColumnId}_units`] =
                subRow[`${channelColumnId}_forecasted_qty`] /
                parseFloat(newValue / 100);
              subRow[columnId] = newValue;
              subRow[`${channelColumnId}_inventory`] =
                subRow[`${channelColumnId}_units`] +
                parseFloat(subRow[`${channelColumnId}_bop_unit`] || 0);
            });
        }
        // New calculations
        if (columnId.includes("reg_weeks")) {
          let editedChannel = columnId.includes("_reg_weeks")
            ? channelColumnId + "_"
            : "";
          if (!editedChannel) {
            Object.keys(eachRow).forEach((key) => {
              if (key.includes("_reg_weeks")) {
                channelColumnId = key.split("_reg_weeks")[0];
              }
            });
            isSingleChannel = true;
          }
          if (
            (row.flow_name === "-" && eachRow.flow_name === "-") ||
            (row.flow_name !== "-" && eachRow.uniqueID === row.uniqueID)
          ) {
            eachRow[`${channelColumnId}_forecasted_qty`] =
              eachRow[`${channelColumnId}_aps`] *
              newValue *
              eachRow[`${channelColumnId}_door_count`];
            eachRow[`${channelColumnId}_units`] =
              eachRow[`${channelColumnId}_forecasted_qty`] /
              (eachRow[`${editedChannel}st`] / 100);
            if (!editedChannel) {
              eachRow["forecasted_qty"] =
                eachRow[`${channelColumnId}_aps`] *
                newValue *
                eachRow[`${channelColumnId}_door_count`];
              eachRow["total_qty"] =
                eachRow["forecasted_qty"] / (eachRow["st"] / 100);
            }
          }
        }
        if (
          columnId.includes("forecasted_qty") &&
          eachRow.uniqueID === row.uniqueID
        ) {
          eachRow[columnId] = newValue;
          let editedChannel = columnId.includes("_forecasted_qty")
            ? channelColumnId + "_"
            : "";
          eachRow[`${editedChannel}st`] = columnId.includes("_forecasted_qty")
            ? newValue / eachRow[`${channelColumnId}_units`]
            : eachRow["forecasted_qty"] / eachRow["total_qty"];
          eachRow[`${editedChannel}st`] = eachRow[`${editedChannel}st`] * 100;
          eachRow[`${editedChannel}aps`] =
            eachRow[`${editedChannel}forecasted_qty`] /
            eachRow[`${editedChannel}avg_wk_cnt_ty`] /
            eachRow[`${editedChannel}door_count`];
          eachRow?.subRows?.length &&
            eachRow?.subRows.forEach((subRow) => {
              subRow[`${channelColumnId}_forecasted_qty`] =
                subRow[`${channelColumnId}_units`] *
                parseFloat(eachRow[`${editedChannel}st`] / 100);
              subRow[`${editedChannel}st`] = eachRow[`${editedChannel}st`];
              subRow[`${editedChannel}aps`] =
                subRow[`${editedChannel}forecasted_qty`] /
                subRow[`${editedChannel}avg_wk_cnt_ty`] /
                subRow[`${editedChannel}door_count`];
            });
        }
        if (columnId === "total_qty" || columnId.includes("_units")) {
          let editedChannel = columnId.includes("_units")
            ? channelColumnId + "_"
            : "";
          eachRow[`${editedChannel}aps`] =
            eachRow[`${editedChannel}forecasted_qty`] /
            eachRow[`${editedChannel}avg_wk_cnt_ty`] /
            eachRow["total_store_count"];
          props.setIsScaleUpDownDisabled(false);
        }
        if (
          channelColumnId &&
          (columnId.includes("_units") ||
            columnId.includes("_aps") ||
            columnId.includes("reg_weeks") ||
            columnId.includes("_st")) &&
          !columnId.includes("commercial")
        ) {
          props.setIsScaleUpDownDisabled(false);
          if (eachRow?.subRows) {
            parentTotalQty = columnId.includes("_forecasted_qty")
              ? eachRow[columnId] / eachRow["st"]
              : columnId.includes("_aps") || columnId.includes("reg_weeks")
              ? eachRow[`${channelColumnId}_forecasted_qty`] /
                (eachRow[`${channelColumnId}_st`] / 100)
              : eachRow[`${channelColumnId}_units`];
          }
          if (eachRow?.subRows && !expanded) {
            let newRow = [eachRow];
            eachRow.subRows.map((subRow) => {
              newRow.push(subRow);
            });
            let parent;
            newRow.forEach((data) => {
              if (!columnId.includes("_st")) {
                let result = recalculateChoiceLevelTotalQty(
                  data,
                  columnId,
                  oldValue,
                  setShowDeleteConfirmDialog,
                  propsRef.current
                );
                if (result?.isDeleteChoice) {
                  parentTotalQty = oldValue;
                }
                let updatedClusterValue = editChoiceLevelTotalUnits(
                  row,
                  data,
                  oldValue,
                  newValue,
                  parentTotalQty,
                  columnId,
                  channelColumnId,
                  propsRef.current,
                  displaySnackMessage
                );
                Object.keys(updatedClusterValue).forEach((key) => {
                  return (data[key] = updatedClusterValue[key]);
                });
              }
              if (data?.subRows) {
                data["subRows"] = [];
                parent = data;
              } else {
                parent?.["subRows"].push(data);
              }
            });
            Object.keys(parent).forEach((key) => {
              return (eachRow[key] = parent[key]);
            });
          } else {
            let result = recalculateChoiceLevelTotalQty(
              eachRow,
              columnId,
              oldValue,
              setShowDeleteConfirmDialog,
              propsRef.current
            );
            if (result?.isDeleteChoice) {
              parentTotalQty = oldValue;
            }
            let updatedClusterValue = editChoiceLevelTotalUnits(
              row,
              eachRow,
              oldValue,
              newValue,
              parentTotalQty,
              columnId,
              channelColumnId,
              propsRef.current,
              displaySnackMessage,
              isSingleChannel
            );
            Object.keys(updatedClusterValue).forEach((key) => {
              return (eachRow[key] = updatedClusterValue[key]);
            });
            // if (
            //   isDropPlan(
            //     propsRef?.current?.planDetails?.data,
            //     `${
            //       props.screenConfiguration?.common?.drop_key.includes("drop")
            //         ? "drops"
            //         : props.screenConfiguration?.common?.drop_key || "drops"
            //     }_count`
            //   ) &&
            //   eachRow?.subRows
            // ) {
            //   let flowTotalQty = 0,
            //     flowTotalForecastedQty = 0;
            //   eachRow.subRows.map((subRow) => {
            //     flowTotalQty =
            //       flowTotalQty + subRow[`${channelColumnId}_units`];
            //     flowTotalForecastedQty =
            //       flowTotalForecastedQty +
            //       subRow[`${channelColumnId}_forecasted_qty`];
            //   });
            //   if (columnId.includes("_units")) {
            //     eachRow[`${channelColumnId}_units`] = flowTotalQty;
            //     eachRow[`${channelColumnId}_forecasted_qty`] =
            //       flowTotalQty * (eachRow["st"] / 100);
            //   }
            //   if (columnId.includes("_forecasted_qty")) {
            //     eachRow[`${channelColumnId}_units`] =
            //       (flowTotalForecastedQty * 100) / eachRow["st"];
            //     eachRow[
            //       `${channelColumnId}_forecasted_qty`
            //     ] = flowTotalForecastedQty;
            //   }
            // }
          }
        }
        if (
          columnId.includes("clusters_") &&
          eachRow.choice_name === row.choice_name
        ) {
          if (eachRow.uniqueID === row.uniqueID) {
            eachRow[columnId] = newValue;
          }
          let totalCluster = 0;
          eachRow?.subRows?.map((subRow) => {
            totalCluster = totalCluster + subRow[columnId];
          });
          if (row?.subRows && eachRow?.subRows) {
            eachRow.subRows.map((subRow) => {
              subRow[columnId] = newValue * subRow.drop_flow_perc;
              recalculateChoiceClusterTotalQty(
                subRow,
                columnId,
                oldValue,
                setShowDeleteConfirmDialog,
                propsRef.current
              );
            });
          } else if (eachRow?.subRows) {
            eachRow[columnId] = totalCluster;
          }
          recalculateChoiceClusterTotalQty(
            eachRow,
            columnId,
            oldValue,
            setShowDeleteConfirmDialog,
            propsRef.current
          );
          if (
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
          //Update the updated_at value of changed cluster to current date, each time cluster quantity is changed
          let isAllDoorChoice = "Yes";
          let totalDoorCount = 0;
          let channelTotalDoorCount = 0;
          let clusterDoorGroup = {};
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
                clusterDoorGroup[channel + "_door_group"] =
                  (clusterDoorGroup[channel + "_door_group"]
                    ? clusterDoorGroup[channel + "_door_group"] + ","
                    : "") + eachRow["cluster_display_name" + (index + 1)];
              }
            }
            if (eachRow["clusters_" + clusterValue]) {
              totalDoorCount =
                totalDoorCount + eachRow[`store_count${index + 1}`];
            }
          }
          eachRow["total_door_count"] = totalDoorCount;
          eachRow[channel + "_door_count"] = channelTotalDoorCount;
          eachRow[channel + "_door_group"] =
            clusterDoorGroup[channel + "_door_group"];
          if (
            eachRow["dropship_choice"] === "Yes" &&
            newValue > 0 &&
            newValue !== row[columnId]
          ) {
            eachRow["dropship_choice"] = "No";
          }
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
        if (columnId.includes("commercial")) {
          eachRow[columnId] = newValue;
          eachRow?.subRows?.length &&
            eachRow?.subRows.forEach((subRow) => {
              subRow[columnId] = newValue;
            });
        }
      }
      eachRow[`${channelColumnId}_previous_units`] =
        eachRow[`${channelColumnId}_units`];
      tempData.push(eachRow);
    });
    // Calculate channel wise total for Units, forecasted_qty, aps
    if (
      isChannelMultiple(props?.planDetails?.data) &&
      (columnId.includes("_units") ||
        columnId.includes("forecasted_qty") ||
        columnId.includes("_aps") ||
        columnId.includes("reg_weeks") ||
        columnId.includes("st"))
    )
      tempData.forEach((rowData) => {
        if (rowData.choice_name === row.choice_name && rowData?.subRows) {
          let totalObj = {};
          propsRef?.current?.planMetricsData?.[0]?.channel[
            rowData.l3_name
          ].forEach((channel) => {
            totalObj[channel + "_units"] = 0;
            totalObj[channel + "_forecasted_qty"] = 0;
            totalObj[channel + "_aps"] = 0;
            totalObj[channel + "_inventory"] = 0;
            totalObj[channel + "_reg_weeks"] = [];
          });
          rowData.subRows.forEach((subRow) => {
            Object.keys(totalObj).forEach((key) => {
              if (key.includes("reg_weeks")) {
                totalObj[key].push(subRow[key]);
              } else if (!key.includes("_aps")) {
                totalObj[key] = totalObj[key] + subRow[key];
                rowData[key] = totalObj[key];
              }
            });
          });
          if (columnId.includes("reg_weeks")) {
            rowData[columnId] = Math.max(...totalObj[columnId]);
          }
          if (columnId.includes("_aps")) {
            let channel = columnId.split("_aps")?.[0];
            rowData[channel + "_aps"] =
              totalObj[channel + "_forecasted_qty"] /
              rowData[channel + "_reg_weeks"] /
              rowData[channel + "_door_count"];
          }
          // Recalculating Drop flow perc
          rowData.subRows.forEach((subRow) => {
            subRow[`${channelColumnId}_drop_flow_perc`] =
              subRow[`${channelColumnId}_units`] /
              totalObj[`${channelColumnId}_units`];
            recalculateChoiceLevelTotalQty(
              subRow,
              columnId,
              oldValue,
              null,
              propsRef.current
            );
          });
          recalculateChoiceLevelTotalQty(
            rowData,
            columnId,
            oldValue,
            null,
            propsRef.current
          );
        } else if (
          rowData.choice_name === row.choice_name &&
          !isDropPlan(
            propsRef?.current?.planDetails?.data,
            `${
              props.screenConfiguration?.common?.drop_key.includes("drop")
                ? "drops"
                : props.screenConfiguration?.common?.drop_key || "drops"
            }_count`
          )
        ) {
          recalculateChoiceLevelTotalQty(
            rowData,
            columnId,
            oldValue,
            null,
            propsRef.current
          );
        }
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
      let updateResponse = {};
      if (!isView) {
        const reqBody = {
          plan_wedge_data: props.finalWedgeData,
          is_completed: false,
          is_scaling: false,
          is_update_plan_step: false,
          plan_sub_step: "wedge_table",
          is_market_style_change: false,
          is_value_changed: props.isChoiceWedgeChanged,
          is_style_color_value_change: props.isStyleColorChanged,
        };
        if (
          props.screenConfiguration?.common?.show_style_level ||
          props.screenConfiguration?.common?.endpoint_project_name ===
            "assort-smart"
        ) {
          reqBody["wedge_level"] = "choice_level";
        }
        updateResponse = await props.updateWedgeData(
          reqBody,
          props.screenConfiguration?.common?.endpoint_project_name || "assort",
          props.planDetails?.data?.plan_code
        );
      }
      props.setIsStyleColorChanged(false);
      if (updateResponse?.data?.status) {
        displaySnackMessage(
          updateResponse?.data?.data?.message || updateResponse?.data?.message,
          updateResponse?.data?.data?.message_type,
          props.addSnack
        );
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
      if (isView) {
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

  const manualCallBack = async (manualbody, pageIndex, params, pageSize) => {
    if (
      !(
        filters.current.selectedL1FilterValue &&
        filters.current.selectedL2FilterValue &&
        (filters.current.selectedL3FilterValue?.length ||
          props.screenConfiguration?.common?.final_level === "l2_name")
      )
    ) {
      return {
        data: [],
        totalCount: 0,
      };
    }
    let limit = 0,
      sort = [],
      manualbodySort = [];
    if (selectedPageIndex?.current !== pageIndex) {
      let reqBody = {
        plan_wedge_data: propsRef?.current?.finalWedgeData,
        is_completed: false,
        is_scaling: false,
        is_update_plan_step: false,
        plan_sub_step: "wedge_table",
        is_market_style_change: false,
        is_value_changed: props.isChoiceWedgeChanged,
        is_style_color_value_change: props.isStyleColorChanged,
      };
      if (
        props.screenConfiguration?.common?.endpoint_project_name ===
        "assort-smart"
      ) {
        reqBody["wedge_level"] = "choice_level";
      }
      const updateResponse = await props.updateWedgeData(
        reqBody,
        props.screenConfiguration?.common?.endpoint_project_name || "assort",
        props.planDetails?.data?.plan_code
      );
      props.setIsStyleColorChanged(false);
      if (updateResponse?.data.status) {
        displaySnackMessage(
          updateResponse?.data?.data?.message || updateResponse?.data?.message,
          updateResponse?.data?.data?.message_type,
          props.addSnack
        );
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
      : ["-"];
    if (props.screenConfiguration?.common?.final_level === "l2_name") {
      payload.filters.push({
        attribute_name: "l2_name",
        value: planData["l2_name"],
        prefix: "levels",
        operator: "in",
      });
    } else {
      payload.filters.push({
        attribute_name: "l3_name",
        value: planData["l3_name"],
        prefix: "levels",
        operator: "in",
      });
    }
    payload.filters.push({
      attribute_name: props.screenConfiguration?.common?.drop_key || "drop",
      value: drop,
      prefix: "levels",
      operator: "in",
    });
    const reqBody = {
      filters: payload.filters,
    };
    pageIndex = pageIndex || 0;
    let flowListLength = isDropPlan(
      propsRef?.current?.planDetails?.data,
      `${
        props.screenConfiguration?.common?.drop_key.includes("drop")
          ? "drops"
          : props.screenConfiguration?.common?.drop_key || "drops"
      }_count`
    )
      ? propsRef?.current?.flowList[drop]?.length
      : 1;
    // Calculate total
    let multipleChannelCluster = {};
    let finalLevelValue =
      props.screenConfiguration?.common?.final_level === "l2_name"
        ? filters?.current?.selectedL2FilterValue
        : filters?.current?.selectedL3FilterValue?.[0];
    propsRef?.current?.planMetricsData?.[0]?.channel[finalLevelValue].forEach(
      (channel) => {
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
      }
    );
    let multipleChannelTotalClusterFlow = 0;
    Object.values(multipleChannelCluster).map((val) => {
      multipleChannelTotalClusterFlow =
        multipleChannelTotalClusterFlow + val.length * flowListLength;
    });
    limit = (pageSize || 10) * (multipleChannelTotalClusterFlow || 1);
    if (manualbody?.sort) {
      manualbodySort = manualbody.sort.filter(
        (obj) => obj.column !== "ag-Grid-AutoColumn"
      );
    }
    if (
      props.screenConfiguration?.common?.show_style_level ||
      props.screenConfiguration?.common?.endpoint_project_name ===
        "assort-smart"
    ) {
      sort = manualbody?.sort?.length
        ? manualbodySort
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
      if (manualbody?.sort?.length) {
        sort = [
          {
            column: "order_of_choice",
            order: "asc",
          },
        ];
        sort.push(...manualbodySort);
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
    if (pageSize) {
      setCacheSize(pageSize);
    }
    try {
      props.set2_3_Loader(true);
      pageIndex = pageIndex || 0;
      let wedgeResponse = await props.getWedgeData(
        reqBody,
        props.screenConfiguration?.common?.endpoint_project_name || "assort",
        props.planDetails?.data?.plan_code
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
        .map((p) => p.cluster_display_name || p.cluster_code)
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
      // Highlight cell -> not valid style no or style code
      rowData.forEach((obj) => {
        let highlightCellArray = [];
        props.planDetails?.data?.channel.forEach((chan) => {
          if (
            obj?.[chan + "_is_style_color_valid"]?.toLowerCase() === "false"
          ) {
            let column = [
              `commercial_style_${chan}_style_no`,
              `commercial_style_${chan}_color_code`,
            ];
            highlightCellArray.push(...highlightCellArray, ...column);
          }
          if (obj?.[chan + "_is_price_change"]?.toLowerCase() === "true") {
            highlightCellArray.push(
              ...highlightCellArray,
              `${chan}_actual_msrp`
            );
          }
          if (obj?.[chan + "_is_cost_change"]?.toLowerCase() === "true") {
            highlightCellArray.push(...highlightCellArray, `${chan}_cost`);
          }
        });
        if (obj?.["is_style_name_change"]?.toLowerCase() === "true") {
          highlightCellArray.push(...highlightCellArray, "style_name");
        }
        if (obj?.["is_color_name_change"]?.toLowerCase() === "true") {
          highlightCellArray.push(...highlightCellArray, "color_name");
        }
        if (obj?.["is_hero_status_change"]?.toLowerCase() === "true") {
          highlightCellArray.push(...highlightCellArray, "hero_status");
        }
        if (obj?.["is_program_change"]?.toLowerCase() === "true") {
          highlightCellArray.push(...highlightCellArray, "program");
        }
        if (obj?.["is_subbrand_change"]?.toLowerCase() === "true") {
          highlightCellArray.push(...highlightCellArray, "subbrand");
        }
        obj["highlightCellArray"] = highlightCellArray;
        obj?.subRows?.forEach((subRow) => {
          subRow["highlightCellArray"] = highlightCellArray;
          subRow["totalClusters"] = obj.totalClusters;
        });
      });
      let total_count = Math.round(
        (wedgeResponse?.data?.data?.total_records / limit) * 10
      );
      setTotalCount(total_count);
      return {
        data: rowData,
        totalCount: total_count,
      };
    } catch (error) {
      //Error handling
      props.set2_3_Loader(false);
    }
  };

  useEffect(() => {
    if (wedgeTableData?.length <= 10) {
      showPaginationPageSize.current = false;
    }
  }, [wedgeTableData]);

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
      props.set2_3_Loader(true);
      if (!isView) {
        const reqBody = {
          plan_wedge_data: props.finalWedgeData,
          is_completed: true,
          is_scaling: false,
          is_update_plan_step: false,
          is_market_style_change: props.callIntegrateMapData,
          plan_sub_step: "wedge_table",
          is_value_changed: props.callIntegrateMapData
            ? props.callIntegrateMapData
            : props.isChoiceWedgeChanged,
          is_style_color_value_change: props.isStyleColorChanged,
        };
        if (props.screenConfiguration?.common?.show_style_level) {
          reqBody["wedge_level"] = "choice_level";
        }
        const updateResponse = await props.updateWedgeData(
          reqBody,
          props.screenConfiguration?.common?.endpoint_project_name || "assort",
          props.planDetails?.data?.plan_code
        );
        props.setIsStyleColorChanged(false);
        if (updateResponse?.data.status) {
          displaySnackMessage(
            updateResponse?.data?.data?.message ||
              updateResponse?.data?.message,
            updateResponse?.data?.data?.message_type,
            props.addSnack
          );
          if (
            props?.callIntegrateMapData &&
            props?.screenConfiguration["dashboard"]?.call_map_style_data
          ) {
            const mapStyleDataResponse = await props.mapStyleData({
              plan_code: props?.planDetails?.data?.plan_code,
            });
            props.setCallIntegrateMapData(false);
            if (mapStyleDataResponse?.data?.data?.status) {
              displaySnackMessage(
                mapStyleDataResponse?.data?.data?.message,
                "success",
                props.addSnack
              );
            } else if (
              !mapStyleDataResponse?.data?.data?.status &&
              !isEmpty(mapStyleDataResponse)
            ) {
              displaySnackMessage(
                mapStyleDataResponse?.data?.data?.message,
                "error",
                props.addSnack
              );
            }
          }
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
      }
      if (isView) {
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
      props.set2_3_Loader(false);
      props.setCallUpdateChoiceWedge(false);
      displaySnackMessage("Update wedge failed", "error", props.addSnack);
    }
    props.set2_3_Loader(false);
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
          columnId.includes("attributes") ||
          columnId === "article_number" ||
          columnId === "style_name" ||
          columnId === "style_no" ||
          columnId === "color_code" ||
          columnId === "color_name" ||
          columnId.includes("commercial") ||
          columnId.includes("_cost") ||
          columnId.includes("_actual_msrp")
          //   &&
          // row.style_des &&
          // row.style_des !== ""
        ) {
          if (
            propsRef.current.screenConfiguration.common.show_product_image &&
            !(columnId.includes("_cost") || columnId.includes("_actual_msrp"))
          ) {
            eachRow["is_image_mapped"] = "False";
            eachRow["image_name_url"] = DEFAULT_IMAGE_LINK;
            props.setStatusImageMap(true);
          }
          if (!columnId.includes("attributes")) {
            eachRow[columnId] = newValue;
            let channelColumnId = columnId.includes("_cost")
              ? columnId.split("_cost")[0]
              : columnId.includes("_actual_msrp")
              ? columnId.split("_actual_msrp")?.[0]
              : null;
            if (
              (columnId.includes("_cost") ||
                columnId.includes("_actual_msrp")) &&
              channelColumnId === "US" &&
              propsRef?.current?.planMetricsData?.[0]?.channel?.[
                eachRow.l3_name
              ].includes("ECOMM")
            ) {
              let col = columnId.includes("_cost")
                ? columnId.split("cost")?.[1]
                : columnId.includes("actual_msrp");
              eachRow["ECOMM_" + col] = newValue;
            }
            eachRow?.subRows?.length &&
              eachRow?.subRows.forEach((subRow) => {
                subRow[columnId] = newValue;
                let channelColumnId = columnId.includes("_cost")
                  ? columnId.split("_cost")[0]
                  : columnId.includes("_actual_msrp")
                  ? columnId.split("_actual_msrp")?.[0]
                  : null;
                if (
                  (columnId.includes("_cost") ||
                    columnId.includes("_actual_msrp")) &&
                  channelColumnId === "US" &&
                  propsRef?.current?.planMetricsData?.[0]?.channel?.[
                    eachRow.l3_name
                  ].includes("ECOMM")
                ) {
                  let col = columnId.includes("_cost")
                    ? columnId.split("cost")?.[1]
                    : columnId.includes("actual_msrp");
                  eachRow["ECOMM_" + col] = newValue;
                }
              });
          }
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
        if (
          (props.screenConfiguration?.["2.3"]?.auto_populate_article_id &&
            columnId === PLAN_WEDGE_TABLE_COLUMNS.color_code) ||
          columnId === PLAN_WEDGE_TABLE_COLUMNS.style_no
        ) {
          if (eachRow.style_no && eachRow.color_code) {
            eachRow.article_number = `${eachRow.style_no}-${eachRow.color_code}`;
            eachRow?.subRows?.length &&
              eachRow?.subRows.forEach((subRow) => {
                subRow.article_number = `${subRow.style_no}-${subRow.color_code}`;
              });
          } else {
            eachRow.article_number = "";
            eachRow?.subRows?.length &&
              eachRow?.subRows.forEach((subRow) => {
                subRow.article_number = "";
              });
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
      // if (
      //   (columnId === "style_no" || columnId === "color_code") &&
      //   eachRow.uniqueID === row.uniqueID
      // ) {
      //   eachRow["style_name"] = "";
      //   eachRow["color_name"] = "";
      //   eachRow?.subRows?.length &&
      //     eachRow?.subRows.forEach((subRow) => {
      //       subRow["style_name"] = "";
      //       subRow["color_name"] = "";
      //     });
      // }
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
        return key;
      });
      return data;
    });
    props.receiveWedgeTableData(
      tempRowData,
      propsRef?.current?.uniqueClusterList,
      "choice_level"
    );
  };

  const renderHighlightChoiceNameForGroupedColumn = (data) => {
    let styledChip;
    let isQtyLow = false;
    props.planDetails.data.channel.map((chanKey) => {
      if (
        isDropPlan(
          props.planDetails?.data,
          `${
            props.screenConfiguration?.common?.drop_key.includes("drop")
              ? "drops"
              : props.screenConfiguration?.common?.drop_key || "drops"
          }_count`
        ) &&
        data[chanKey + "_units"] < data[chanKey + "_moq"]
      ) {
        isQtyLow = true;
        styledChip = (
          <StyledChip
            label={replaceSpecialCharacter(data.choice_name)}
            color={PLAN_STEP_BGCOLOR_MAPPER["incomplete"]}
          />
        );
      } else if (data.total_qty < data[chanKey + "_moq"]) {
        isQtyLow = true;
        styledChip = (
          <StyledChip
            label={replaceSpecialCharacter(data.choice_name)}
            color={PLAN_STEP_BGCOLOR_MAPPER["incomplete"]}
          />
        );
      }
    });
    // if (data?.is_style_color_valid?.toLowerCase() === "false") {
    //   styledChip = (
    //     <StyledChip
    //       label={replaceSpecialCharacter(data.choice_name)}
    //       color={PLAN_STEP_BGCOLOR_MAPPER["incomplete"]}
    //     />
    //   );
    // }
    setIsDispalyMOQMessage(isQtyLow);
    return styledChip ? styledChip : replaceSpecialCharacter(data.choice_name);
  };

  const loadTableInstance = (params) => {
    AGInstance.current = params;
    if (
      isDropPlan(
        props.planDetails?.data,
        `${
          props.screenConfiguration?.common?.drop_key.includes("drop")
            ? "drops"
            : props.screenConfiguration?.common?.drop_key || "drops"
        }_count`
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
    width: 300,
    type: "str",
    valueGetter: (ins) => {
      return ins?.data?.[
        `${props.screenConfiguration?.common?.flow_key || "flow"}_name`
      ] !== "-"
        ? replaceSpecialCharacter(
            ins?.data?.[
              `${props.screenConfiguration?.common?.flow_key || "flow"}_name`
            ]
          )
        : renderHighlightChoiceNameForGroupedColumn(ins?.data);
    },
  };

  const showAddNewAttributeOption = (
    <div
      className={classes.createSetOptDiv}
      onClick={() => setShowAddNewAttributeField(true)}
      onFocus={() => {}}
    >
      <span className={classes.createAddNewOpt}>{"Add new attribute"}</span>
    </div>
  );

  const onSelectionChanged = (event, attr) => {
    // fetch all selected rows
    let wedgeAtrJson = [];
    wedgeAttributeRef.current.forEach((attr) => {
      wedgeAtrJson.push(attr.attribute_name);
    });
    let selections = event.api.getSelectedRows().map((item) => {
      let obj = {};
      wedgeAtrJson.forEach((attr) => {
        obj[attr] = item[`attributes_${attr}`];
      });
      obj.color_name = item.color_name;
      return obj;
    });
    props.setWedgeSelectedRow(selections);
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
        manualCallBack={(body, pageIndex, params, pageSize) =>
          manualCallBack(body, pageIndex, params, pageSize)
        }
        rowModelType="serverSide"
        childKey={"subRows"}
        loadTableInstance={loadTableInstance}
        onBlur={updateWedgeTableDataOnBlur}
        onCellValueChanged={updateWedgeTableDataOnChange}
        onImageClick={(image) => {
          selectedImage.current = image;
          AGInstance?.current?.api.refreshCells({
            force: true,
            suppressFlash: false,
          });
        }}
        treeData={
          isDropPlan(
            props.planDetails?.data,
            `${
              props.screenConfiguration?.common?.drop_key.includes("drop")
                ? "drops"
                : props.screenConfiguration?.common?.drop_key || "drops"
            }_count`
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
            props.screenConfiguration,
            selectedImage
          )
        }
        autoGroupColumnDef={
          isDropPlan(
            props.planDetails?.data,
            `${
              props.screenConfiguration?.common?.drop_key.includes("drop")
                ? "drops"
                : props.screenConfiguration?.common?.drop_key || "drops"
            }_count`
          )
            ? autoGroupColumnDef
            : {}
        }
        rowSelection="multiple"
        selectAllHeaderComponent={true}
        onRowSelected
        uniqueRowId={"uniqueID"}
        sideBar={false}
        tableId={"wedge-table"}
        serverSideStoreType={"partial"}
        cacheBlockSize={cacheSize}
        paginationPageSize={cacheSize}
        adjustTableHeight={true}
        skipHeaderOnAutoSize={true}
        showPaginationPageSize={showPaginationPageSize.current}
        PaginationComponent={(params) =>
          showPaginationPageSize.current ? (
            <PaginationComponent {...params} />
          ) : null
        }
        statusBar={{
          statusPanels: [
            {
              statusPanel: "PaginationComponent",
              align: "right",
            },
          ],
        }}
        onSelectionChanged={(event) =>
          onSelectionChanged(event, props.wedgeAttributeData)
        }
        staticColId={true}
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
      {isDispalyMOQMessage && (
        <p className={classes.clusterNotes}>
          Choices with quantity below MOQ have been highlighted
        </p>
      )}
    </>
  );
};

const PaginationComponent = (params) => {
  const [pageSize, setPageSize] = useState(params.api.paginationGetPageSize());
  const classes = useStyles();
  const globalClasses = globalStyles();
  const pageSizeOptions = [10, 20, 30];
  const handleChangePageSize = async (e) => {
    const value = Number(e.target.value);
    setPageSize(value);
    params.api.paginationSetPageSize(value);
    let body = {
      search: [],
      range: [],
      sort: [],
    };
    let page = 0;
    let rowData = await params.api.gridOptionsWrapper.gridOptions.manualCallBack(
      body,
      page,
      params,
      value
    );
  };
  return (
    <div className={`${globalClasses.flexRow} ${globalClasses.marginAround}`}>
      <label
        className={classes.inputLabel || "drop-down-label"}
      >{`Page Size: `}</label>
      <Select
        labelId="page-size"
        id="page-size"
        value={pageSize}
        onChange={handleChangePageSize}
        className={classes.customePageSize}
      >
        {pageSizeOptions.map((pageSize) => {
          return <MenuItem value={pageSize}>{pageSize}</MenuItem>;
        })}
      </Select>
    </div>
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
      mapStyleData: planDashboardServiceActions.mapStyleData,
    },
    dispatch
  );
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(PlanWedgeComponent));
