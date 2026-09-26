import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Typography,
  Checkbox,
  Button,
} from "@mui/material";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import CloseIcon from "@mui/icons-material/Close";
import Download from "@mui/icons-material/Download";
import LoadingOverlay from "core/Utils/Loader/loader";
import { withRouter } from "react-router-dom";
import { connect } from "react-redux";
import makeStyles from "@mui/styles/makeStyles";
import {
  getPayloadForL3,
  updateNLEL3RowData,
} from "../../Plan-Initial/plan-initial-functions";
import {
  nonLinearEdit,
  nonLinearReplaceData,
} from "modules/assortsmart/services-assortsmart/Plan/Plan-Finalize/plan-finalize-service";
import { updateL3OptData } from "modules/assortsmart/services-assortsmart/Plan/Plan-Initial/plan-initial-service";
import {
  assortAgGridCustomCellRenderer,
  getPlanPayload,
  isDropPlan,
  isWholesalePlan,
  isChannelMultiple,
  attributeFormatter,
  getL3OptPayload,
  setEdiableFalse,
  filterView,
  externalFilterMultipleLevel,
  getDefaultChannelValue,
} from "../../../../utils-assortsmart/utilityFunctions";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { addSnack } from "core/actions/snackbarActions";
import {
  common,
  PARAMETERS_FORM,
  nleRevampMetrics,
  Plan,
  nleChoiceOption,
} from "../../../../constants-assortsmart/stringContants";
import {
  getL3OptData,
  getNLEOptData,
  updateNLEV2OptData,
} from "modules/assortsmart/services-assortsmart/Plan/Plan-Initial/plan-initial-service";
import PlanDropTabViewComponent from "../../plan-drop-tab-view-component";
import { groupBy, cloneDeep, isEmpty, isArray } from "lodash";
import { getColumnsAg } from "core/actions/tableColumnActions";
import AgGridTable from "core/Utils/agGrid";
import Form from "core/Utils/form";
import { downloadExcelLink } from "core/Utils/csv-download";
import {
  numbersWithComma,
  dollarFormatter,
  groupByCustom,
} from "core/Utils/formatter";
import SortComponent from "core/Utils/agGrid/column-component/sortComponent";
import { configureLevels } from "modules/assortsmart/pages-assortsmart/Plan-Dashboard/components/common-plan-functions";
import { getNumberFromKey } from "../../Plan-Wedge/optimization-constraint-table-functions";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";

const linearEditStyles = makeStyles(() => ({
  nonLinearEditingCheckBox: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "left",
    marginTop: "10px",
  },
  nonLinearScaleButton: {
    marginTop: "10px",
    marginLeft: "10rem",
  },
  nonLinearDivMargin: {
    marginTop: "0.20rem",
    marginLeft: "10px",
  },
  nonLinearConfirmDiv: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "0.625rem",
  },
}));

const getLabel = (type) => {
  return type === "Hindsight"
    ? "Hindsight pop-up after amending budget on NLE "
    : "Update Budget";
};

const nleFormulas = {
  calculateRevenueFromPenetration: (penetrationObj, key) =>
    penetrationObj["total_receipt$"] *
    (penetrationObj[`${key}_penetration_ty`] / 100),
  calculatePenetrationFromRevenue: (revenueObj, key) =>
    revenueObj[`${key}_receipt$`] / revenueObj["total_receipt$"],
  calculatePenetrationFlows: (
    penetrationObj,
    key,
    unlockPercent,
    lockPercent
  ) =>
    (penetrationObj[`${key}_penetration_ty`] / unlockPercent) *
    (100 - lockPercent),
  calculateRevenueFlowOnQtrChange: (revenueObj, key, oldVal, newVal) =>
    revenueObj[`${key}_receipt$`] * (newVal / oldVal),
  calculateRevenueFlowOnTotalChange: (revenueObj, key, oldVal, newVal) =>
    revenueObj[`${key}_receipt$`] +
    (revenueObj[`${key}_receipt$`] * ((newVal - oldVal) / oldVal) * 100) / 100,
  calculateRevenueFlowOnRowTotalChange: (revenueObj, key, oldVal, newVal) =>
    (revenueObj[`${key}_receipt$`] * (newVal / oldVal) * 100) / 100,
  calculateQuantityFlowOnChange: (quantityObj, key, unitPrice) =>
    unitPrice ? quantityObj[`${key}_receipt$`] / unitPrice : 0,
  calculateRevenueFlowOnQtyChange: (revenueObj, key, unitPrice) =>
    revenueObj[`${key}_receipts_quantity_ty`] * unitPrice,
};

const NonLinearEditDrawerRootComponent = (props) => {
  const [depthChecked, setDepthChecked] = useState(false);
  const [choiceChecked, setChoiceChecked] = useState(false);
  const [type, setType] = useState("NLE");
  const [groupedDrops, setGroupedDrops] = useState(null);
  const [selectedDropData, setSelectedDropData] = useState(null);
  const [NLEgroupedDrops, setNLEGroupedDrops] = useState(null);
  const [NLEChangesColumns, setNLEChangesColumns] = useState([]);
  const [NLEChangeRowData, setNLEChangeRowData] = useState([]);
  const [selectedNLEChangesDropData, setSelectedNLEChangesDropData] = useState(
    null
  );
  const [formFields, setFormFields] = useState(null);
  const [HindsightformFields, setHindsightFormFields] = useState(null);
  const NonLinearAGInstance = useRef({});
  const HindsightAGInstance = useRef({});
  const [excelHeaders, setExcelHeaders] = useState([]);
  const [excelDataDownload, setExcelDataDownload] = useState([]);
  const [channelSelected, setChannelSelected] = useState("");
  const [NLEChangeFilteredData, setNLEChangeFilteredData] = useState([]);
  const [nonLinearEditData, setNonLinearEditData] = useState([]);
  const [nonLinearEditDataV2, setNonLinearEditDataV2] = useState([]);
  const [nonLinearEditResDataV2, setNonLinearEditResDataV2] = useState([]);
  const [nonLinearEditColumns, setNonLinearEditColumns] = useState([]);
  const [nonLinearEditColumnsV2, setNonLinearEditColumnsV2] = useState([]);
  const [formData, setFormData] = useState({});
  const [initialValue, setInitialValue] = useState([]);
  const [isPenValueChanged, setIspenValueChanged] = useState(false);
  const [levelsOptions, setLevelsOptions] = useState({});
  const [levelSelected, setLevelSelected] = useState({});
  const [isL3DataChanged, setIsL3DataChanged] = useState(false);
  const classes = useStyles();
  const linearEditClasses = linearEditStyles();
  const NLEDownload = useRef(null);
  let formValues = useRef({});
  formValues.current = formData;
  const NLEResetData = useRef({});
  const NLEResetDataV2 = useRef({});
  const [isResetDisabled, setIsResetDisabled] = useState(true);

  const metricOptions = Object.entries(nleRevampMetrics).map(([key, value]) => {
    return {
      id: key,
      value: key,
      label: value,
    };
  });
  const nleRevamp = props.screenConfiguration.common.NLE_revamp;
  const nleMetricsRef = useRef();
  const nleChannelRef = useRef();

  const NLEFilteredData = NonLinearAGInstance?.current?.api
    ?.getModel()
    ?.rootNode.childrenAfterAggFilter?.map((node) => node.data);
  const NLEReplaceFilteredData = HindsightAGInstance?.current?.api
    ?.getModel()
    ?.rootNode.childrenAfterAggFilter?.map((node) => node.data);

  useEffect(() => {
    if (props.channelSelected) {
      setChannelSelected(props.selectedChannel);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getNLEHeadersData = (columnData) => {
    let headers = [];
    columnData?.length &&
      columnData.forEach((data) => {
        headers.push({ label: data["headerName"], key: data["id"] });
      });
    if (
      props.screenConfiguration?.common?.endpoint_project_name ===
      "assort-smart"
    ) {
      headers.splice(1, 0, { label: "", key: "carryover_flag" });
    }
    setExcelHeaders(headers);
  };

  const getNLEExcelData = (NLEChangeRowData) => {
    const excelData = [];
    let NLEData = cloneDeep(NLEChangeRowData);
    NLEData?.forEach((data) => {
      for (const key in data) {
        if (key === "receipts_delta") {
          data[key] = dollarFormatter({ value: data[key] }, 0);
        } else if (key.includes("choice") || key.includes("depth")) {
          data[key] = numbersWithComma({ value: data[key] }, 0);
        }
      }
      excelData.push(data);
    });
    setExcelDataDownload(excelData);
  };

  const handleEventChange = (event, type) => {
    if (type === "depth") {
      setDepthChecked(event.target.checked);
      setChoiceChecked(false);
    } else {
      setChoiceChecked(event.target.checked);
      setDepthChecked(false);
    }
  };

  useEffect(() => {
    return () => {
      setNonLinearEditData([]);
      setNLEChangeRowData([]);
    };
  }, []);

  useEffect(() => {
    if (
      nonLinearEditData?.length &&
      isDropPlan(
        props.planDetails?.data,
        `${
          props.screenConfiguration?.common?.drop_key.includes("drop")
            ? "drops"
            : props.screenConfiguration?.common?.drop_key || "drops"
        }_count`
      )
    ) {
      let drops = groupBy(
        nonLinearEditData,
        props.screenConfiguration?.common?.drop_key || "drop"
      );
      setGroupedDrops(drops);
    }
    if (nonLinearEditData?.length && isWholesalePlan(props.planDetails?.data)) {
      let filteredData = nonLinearEditData.filter(
        (data) => data.l3_name !== "Total"
      );
      let sub_channel = groupBy(filteredData, "sub_channel");
      let channelOpt = Object.keys(sub_channel).map((data) => {
        return {
          label: data,
          value: data,
          id: data,
        };
      });
      PARAMETERS_FORM[0].options = channelOpt;
      formValues.current.sub_channel_list = channelOpt?.[0]?.label;
      if (!isChannelMultiple(props.planDetails?.data)) {
        delete PARAMETERS_FORM[1];
      }
      setFormFields(PARAMETERS_FORM);
    }
    if (
      nonLinearEditData?.length &&
      isChannelMultiple(props.planDetails?.data) &&
      !(formData?.channel_list?.length > 0)
    ) {
      let channelOpt = props.planDetails.data.channel.map((chan) => {
        return {
          label: chan,
          value: chan,
          id: chan,
        };
      });
      formValues.current.channel_list = [
        getDefaultChannelValue(channelOpt, props.planDetails?.data)?.label,
      ];
      PARAMETERS_FORM[1].options = channelOpt;
      PARAMETERS_FORM[1].isMulti = true;
      if (!isWholesalePlan(props.planDetails?.data)) {
        delete PARAMETERS_FORM[0];
      }
      setFormFields(PARAMETERS_FORM);
      setFormData(formValues.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonLinearEditData]);

  useEffect(() => {
    if (
      NLEChangeRowData?.length &&
      isDropPlan(
        props.planDetails?.data,
        `${
          props.screenConfiguration?.common?.drop_key.includes("drop")
            ? "drops"
            : props.screenConfiguration?.common?.drop_key || "drops"
        }_count`
      )
    ) {
      let groupedData = groupBy(
        NLEChangeRowData,
        props.screenConfiguration?.common?.drop_key || "drop"
      );
      setNLEGroupedDrops(groupedData);
    }
  }, [NLEChangeRowData]);

  useEffect(() => {
    if (NLEChangeRowData?.length) {
      if (isChannelMultiple(props.planDetails?.data)) {
        let channelOpt = props.planDetails.data.channel.map((chan) => {
          return {
            label: chan,
            value: chan,
            id: chan,
          };
        });
        formValues.current.channel_list = [
          getDefaultChannelValue(channelOpt, props.planDetails?.data)?.label,
        ];
        PARAMETERS_FORM[1].options = channelOpt;
        PARAMETERS_FORM[1].isMulti = false;
      }
      if (!isWholesalePlan(props.planDetails?.data)) {
        delete PARAMETERS_FORM[0];
      }
      setHindsightFormFields(PARAMETERS_FORM);
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
        let drops = Object.keys(
          groupBy(
            NLEChangeRowData,
            props.screenConfiguration?.common?.drop_key || "drop"
          )
        );
        //TO set hindsight popup drop same as nle popup selected drop on first load
        let selectedDrop = selectedDropData
          ? drops.filter((drop) => {
              //To get drop number from selected drop name i.e Drops 1 or drops_1
              return drop.includes(
                selectedDropData?.split(" ")[1] ||
                  selectedDropData?.split("_")[1]
              );
            })[0]
          : drops[0];
        formValues.current = {
          ...formData,
          [props.screenConfiguration?.common?.drop_key || "drop"]: selectedDrop,
        };
      }
      setFormData(formValues.current);
      HindsightAGInstance.current.api.onFilterChanged();
      setFormData(formValues.current);
      getNLEHeadersData(NLEChangesColumns);
      getNLEExcelData(NLEChangeRowData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [NLEChangeRowData]);

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
      NonLinearAGInstance?.current?.api
    ) {
      if (selectedDropData) {
        formValues.current = {
          ...formData,
          [props.screenConfiguration?.common?.drop_key ||
          "drop"]: selectedDropData,
        };
        setFormData(formValues.current);
      }
      NonLinearAGInstance.current.api.onFilterChanged();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDropData]);

  useEffect(() => {
    if (
      selectedNLEChangesDropData &&
      isDropPlan(
        props.planDetails?.data,
        `${
          props.screenConfiguration?.common?.drop_key.includes("drop")
            ? "drops"
            : props.screenConfiguration?.common?.drop_key || "drops"
        }_count`
      ) &&
      HindsightAGInstance?.current?.api
    ) {
      formValues.current = {
        ...formData,
        [props.screenConfiguration?.common?.drop_key ||
        "drop"]: selectedNLEChangesDropData,
      };
      setFormData(formValues.current);
      HindsightAGInstance.current.api.onFilterChanged();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNLEChangesDropData, HindsightAGInstance, NLEChangeRowData]);

  const getUpdateStep = () => {
    return props.activeStep >= 2.4 ||
      (props.activeStep === 2.3 && props.isWedgeOpen)
      ? ["depth_choice", "wedge"]
      : ["depth_choice"];
  };

  const getOptimizationLevel = () => {
    return props.activeStep === 2.2 ||
      props.activeSubStep === "optimization_constraint_table" ||
      props?.planDetails?.data?.plan_sub_step ===
        "optimization_constraint_table"
      ? "depth_choice"
      : props.activeStep === 2.3
      ? "wedge"
      : "size_review";
  };

  const fetchL3Details = async (loadingRequired) => {
    let payload = getL3OptPayload(
      props.planDetails?.data,
      formData,
      false,
      props,
      true
    );
    payload.filters.push({
      attribute_name: "optimization_level",
      operator: "in",
      value: ["l3_optimization"],
      prefix: "levels",
    });
    payload.filters.push({
      attribute_name: "drop",
      operator: "in",
      value: ["Total", "-"],
      prefix: "levels",
    });
    let nonLinearResponse = await props.getL3OptData(
      payload,
      props.screenConfiguration?.common?.endpoint_project_name || "assort",
      props.planDetails?.data?.plan_code
    );
    if (nonLinearResponse?.data?.status) {
      const levelsData = configureLevels(
        props.planDetails?.data,
        props.levelsJson,
        nonLinearResponse?.data?.data?.data
      );
      setLevelsOptions(levelsData?.options);
      if (isEmpty(levelSelected) && nonLinearResponse?.data?.data?.data) {
        setLevelSelected(levelsData?.selectedValue);
        //Configure formdata for levels
        Object.keys(props.levelsJson).forEach((level) => {
          if (!isEmpty(levelsData?.selectedValue?.[level])) {
            formValues.current[level] =
              levelsData?.selectedValue?.[level]?.label;
          }
        });
        setFormData(formValues.current);
      }
      let tableData = [];
      if (
        props.screenConfiguration?.common?.endpoint_project_name ===
        "assort-smart"
      ) {
        tableData = nonLinearResponse.data.data.data.map((nonLinearData) => {
          nonLinearData.original_penetration_ty = nonLinearData.penetration_ty;
          nonLinearData.penetration_old_ty = nonLinearData.penetration_ty;
          if (!(formData?.channel_list?.length > 1)) {
            nonLinearData.penetration_ty = nonLinearData.penetration_ty * 100;
          }
          nonLinearData.air_old_ty = nonLinearData.air_ty;
          nonLinearData.aur_old_ty = nonLinearData.aur_ty;
          nonLinearData.budget_old_ty = nonLinearData.budget_ty;
          nonLinearData[props.screenConfiguration?.common?.drop_key || "drop"] =
            attributeFormatter(
              nonLinearData[
                props.screenConfiguration?.common?.drop_key || "drop"
              ]
            ) || "-";
          nonLinearData.receipts_quantity_ty = Math.round(
            nonLinearData.receipts_quantity_ty
          );
          nonLinearData.receipts_quantity_old_ty =
            nonLinearData.receipts_quantity_ty;
          nonLinearData["hierarchy"] = [
            nonLinearData?.l1_name +
              nonLinearData?.l2_name +
              nonLinearData?.l3_name,
          ];
          if (nonLinearData.carryover_flag !== "Total") {
            //plotings the subRows
            nonLinearData.hierarchy.push(nonLinearData.carryover_flag);
            nonLinearData.parent_col = "carryover_flag";
          }
          nonLinearData.uniqueId =
            nonLinearData.l3_name +
            nonLinearData[
              props.screenConfiguration?.common?.drop_key || "drop"
            ] +
            nonLinearData.sub_channel +
            nonLinearData.l2_name +
            nonLinearData?.l1_name +
            nonLinearData?.carryover_flag;
          return nonLinearData;
        });
      } else {
        tableData = nonLinearResponse.data.data.data.map((nonLinearData) => {
          nonLinearData.original_penetration_ty = nonLinearData.penetration_ty;
          nonLinearData.penetration_old_ty = nonLinearData.penetration_ty;
          if (!(formData?.channel_list?.length > 1)) {
            nonLinearData.penetration_ty = nonLinearData.penetration_ty * 100;
          }
          nonLinearData.air_old_ty = nonLinearData.air_ty;
          nonLinearData.aur_old_ty = nonLinearData.aur_ty;
          nonLinearData.budget_old_ty = nonLinearData.budget_ty;
          nonLinearData[props.screenConfiguration?.common?.drop_key || "drop"] =
            attributeFormatter(
              nonLinearData[
                props.screenConfiguration?.common?.drop_key || "drop"
              ]
            ) || "-";
          nonLinearData.receipts_quantity_ty = Math.round(
            nonLinearData.receipts_quantity_ty
          );
          nonLinearData.receipts_quantity_old_ty =
            nonLinearData.receipts_quantity_ty;
          nonLinearData.uniqueId =
            nonLinearData?.l1_name +
            nonLinearData.l2_name +
            nonLinearData.l3_name +
            nonLinearData?.channel +
            nonLinearData.sub_channel +
            nonLinearData[
              props.screenConfiguration?.common?.drop_key || "drop"
            ] +
            nonLinearData.plan_bud_opt_id;
          return nonLinearData;
        });
      }
      if (!loadingRequired) {
        props.setLoading(false);
      }
      props.setRTinstance(null);
      // Get total of all the rows
      props.getTotalFooterRow(tableData, props);
      setNonLinearEditData(tableData);
      NLEResetData.current = cloneDeep(tableData);
      await fetchColumns();
    }
  };
  const fetchColumns = async () => {
    let cols = await getColumnsAg(
      "table_name=non_linear_edit",
      props.columnHeaderJson,
      true
    )();
    if (cols.length) {
      cols.forEach((col) => {
        if (col.column_name === "drop") {
          col.label = props.screenConfiguration?.common?.drop_key || "Drop";
          col.column_name =
            props.screenConfiguration?.common?.drop_key || "drop";
        }
      });
      cols = agGridColumnFormatter(cols, props.columnHeaderJson);
      setNonLinearEditColumns(cols);
    }
  };

  useEffect(() => {
    if (nleRevamp) {
      fetchNleOptDataV2();
    } else {
      fetchL3Details();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (formData?.channel_list?.length > 1) {
      let columns = setEdiableFalse(nonLinearEditColumns);
      columns = agGridColumnFormatter(
        cloneDeep(columns || []),
        props.columnHeaderJson
      );
      setNonLinearEditColumns(columns);
    } else if (formData?.channel_list) {
      fetchColumns();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData]);

  useEffect(() => {
    if (initialValue.length === 1) {
      let loadingRequired = false;
      updateNLEData(loadingRequired);
    } else if (initialValue.length > 1 && !nleRevamp) {
      fetchL3Details();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValue]);

  const updateNLEData = async (loadingRequired) => {
    props.setLoading(true);
    let tempData = [];
    NonLinearAGInstance.current.api.forEachNode((row) => {
      if (row.data.l3_name !== "Total") {
        tempData.push(row.data);
      }
    });
    let instance = {
      data: tempData,
    };
    let updateNLEResponse = await props.updateL3OptData(
      {
        ...getPayloadForL3(
          instance,
          props.levelsJson,
          true,
          [],
          props.screenConfiguration
        ),
        is_update_plan_step: "false",
        optimization_level: "l3_optimization",
        is_cluster_pen_ty: isPenValueChanged,
        is_value_changed: true,
        plan_code: props.planDetails?.data?.plan_code,
      },
      props.screenConfiguration?.common?.endpoint_project_name || "assort",
      props.planDetails?.data?.plan_code
    );
    if (updateNLEResponse?.data?.status) {
      fetchL3Details(loadingRequired);
      return true;
    }
    return false;
  };

  const onOptimise = async () => {
    try {
      let loadingRequired = true;
      let isUpdateSucess = false;
      if (nleRevamp) {
        isUpdateSucess = await updateNLEV2Data();
      } else {
        isUpdateSucess = await updateNLEData(loadingRequired);
      }
      if (isUpdateSucess) {
        let planData = props.planDetails?.data;
        let payload = getPlanPayload(planData, props.planLevels, true);
        payload.filters.push({
          attribute_name: "sub_channel",
          prefix: "levels",
          value: isWholesalePlan(planData)
            ? common.__sub_channel_wholesale
            : planData.channel,
          operator: "in",
        });
        payload.compare_type = planData.compare_year;
        payload.run_size_curve_flag = false;
        payload.update_steps = getUpdateStep();
        let non_linear_edit = [];
        if (nleRevamp) {
          NonLinearAGInstance.current.api.forEachNode((row) => {
            if (
              row.data.l3_name !== "Total" &&
              (row.data.drop !== "Total" || row.data.flow === "-")
            ) {
              Object.keys(row.data).forEach((key) => {
                if (
                  key.includes("_receipts_quantity_ty") &&
                  !key.includes("old_") &&
                  !key.includes("qtr") &&
                  !key.includes("total_")
                ) {
                  let flowID = key.split("flow_")?.[1]?.split("_")?.[0];
                  let dropNumber = getNumberFromKey(
                    attributeFormatter(row?.data?.drop),
                    "Drops "
                  );
                  if (parseInt(flowID) >= parseInt(dropNumber) || !flowID) {
                    let flowName = flowID ? "flow_" + flowID : "-";
                    non_linear_edit.push({
                      l0_name: row.data.l0_name,
                      l1_name: row.data.l1_name,
                      l2_name: row.data.l2_name,
                      l3_name: row.data.l3_name,
                      channel: row.data.channel,
                      sub_channel: row.data.sub_channel,
                      nle:
                        row.data.apply_on === "Depth"
                          ? "depth_only"
                          : "choice_only",
                      drop: row.data.drop === "Total" ? "-" : row.data.drop,
                      flow: flowName,
                      receipts_quantity_old_ty:
                        row.data[`old_${flowName}_receipts_quantity_ty`] || 0,
                      budget_old_ty: row.data[`old_${flowName}_receipt$`] || 0,
                      receipts_quantity_ty:
                        row.data[`${flowName}_receipts_quantity_ty`] || 0,
                      budget_ty: row.data[`${flowName}_receipt$`] || 0,
                    });
                  }
                }
              });
            }
          });
        } else {
          non_linear_edit = depthChecked ? "depth_only" : "choice_only";
        }
        payload.non_linear_edit = non_linear_edit;
        let NLEres = await props.nonLinearEdit(
          payload,
          props.screenConfiguration?.common?.endpoint_project_name || "assort",
          props.planDetails?.data?.plan_code
        );
        setNLEChangeRowData([]);
        setNLEChangeFilteredData([]);
        if (NLEres?.data?.data) {
          props.addSnack({
            message: NLEres?.data?.data?.message,
            options: {
              variant: "success",
            },
          });
          fetchNLEChanges(NLEres.data.data.summary);
        }
      }
    } catch (error) {
      props.addSnack({
        message: "Failed  to updated details",
        options: {
          variant: "error",
        },
      });
      props.setLoading(false);
    }
  };

  useEffect(() => {
    if (
      NLEChangeFilteredData?.length &&
      isDropPlan(
        props.planDetails?.data,
        `${
          props.screenConfiguration?.common?.drop_key.includes("drop")
            ? "drops"
            : props.screenConfiguration?.common?.drop_key || "drops"
        }_count`
      )
    ) {
      let drops = groupBy(
        NLEChangeFilteredData,
        props.screenConfiguration?.common?.drop_key || "drop"
      );
      setNLEGroupedDrops(drops);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [NLEChangeFilteredData]);

  const fetchNLEChanges = async (rowData) => {
    setType("Hindsight");
    let cols = await fetchNLEChangesColumns();
    if (cols.length) {
      setNLEChangesColumns(cols);
      let tempData = rowData.map((item) => {
        if (
          props.screenConfiguration?.common?.endpoint_project_name ===
          "assort-smart"
        ) {
          item["hierarchy"] = [item?.l1_name + item?.l2_name + item?.l3_name];
          if (item.carryover_flag && item.carryover_flag !== "Total") {
            //plotings the subRows
            item.hierarchy.push(item.carryover_flag);
            item.parent_col = "carryover_flag";
          }
          item.uniqueId =
            item.l1_name +
            item.l2_name +
            item.l3_name +
            item.channel +
            item.sub_channel +
            item[props.screenConfiguration?.common?.drop_key || "drop"] +
            item.carryover_flag;
        } else {
          item.uniqueId =
            item.l1_name +
            item.l2_name +
            item.l3_name +
            item.channel +
            item.sub_channel +
            item[props.screenConfiguration?.common?.drop_key || "drop"];
        }
        item[props.screenConfiguration?.common?.drop_key || "drop"] =
          attributeFormatter(
            item[props.screenConfiguration?.common?.drop_key || "drop"]
          ) || "-";
        item["l3_name"] = replaceSpecialCharacter(item.l3_name);
        return item;
      });
      setNLEChangeRowData(tempData);
      setNLEChangeFilteredData(tempData);
      if (HindsightAGInstance?.current?.api) {
        HindsightAGInstance?.current?.api.refreshCells({
          force: true,
          suppressFlash: false,
        });
      }
      props.setLoading(false);
    }
  };

  const fetchNLEChangesColumns = async () => {
    let cols = await getColumnsAg(
      "table_name=updated_budget_NLE",
      props.columnHeaderJson,
      true
    )();
    cols.forEach((col) => {
      if (col.column_name === "drop") {
        col.label = props.screenConfiguration?.common?.drop_key || "Drop";
        col.column_name = props.screenConfiguration?.common?.drop_key || "drop";
      }
    });
    cols = agGridColumnFormatter(cols, props.columnHeaderJson);
    return cols;
  };

  const nonLinearChangesReplaceData = async (action) => {
    try {
      props.setLoading(true);
      let payload = {
        plan_code: props.planDetails?.data?.plan_code,
        replace_data: action,
        update_steps: getUpdateStep(),
        plan_sub_step:
          getActivePlanStep() === "2.4" || props.showWedge
            ? "wedge_table"
            : "depth_choice_table",
      };
      let nonLinearChangesResponse = await props.nonLinearReplaceData(
        payload,
        props.screenConfiguration?.common?.endpoint_project_name || "assort",
        props.planDetails?.data?.plan_code
      );
      if (nonLinearChangesResponse) {
        props.setLoading(false);
        if (action) {
          localStorage.setItem("AssortNLE", props.planDetails?.data?.plan_code);
          window.location.reload();
        } else {
          props.onToggleNonLinearEdit(false);
        }
      }
    } catch (error) {
      props.setLoading(false);
      props.addSnack({
        message: "NLE Replace data failed",
        options: {
          variant: "error",
        },
      });
    }
  };

  const updateNLEV2Data = async () => {
    props.setLoading(true);
    let tempData = [];
    NonLinearAGInstance.current.api.forEachNode((row) => {
      if (row.data.l3_name !== "Total") {
        tempData.push(row.data);
      }
    });
    let payloadArray = [];
    tempData.forEach((data) => {
      const response = [];
      // Iterate through each flow and quarter
      if (
        data.flow &&
        data.drop !== "-" &&
        isDropPlan(
          props.planDetails?.data,
          `${
            props.screenConfiguration?.common?.drop_key.includes("drop")
              ? "drops"
              : props.screenConfiguration?.common?.drop_key || "drops"
          }_count`
        )
      ) {
        for (const quarter of data.total) {
          for (const flow of data[quarter]) {
            const flowNumber = flow.split("_")[1];
            const quarterNumber = quarter.split("qtr")[1];
            const responseObject = {
              plan_code: data.plan_code,
              filters: {
                l0_name: data.l0_name,
                l1_name: data.l1_name,
                l2_name: data.l2_name,
                l3_name: data.l3_name,
                sub_channel: data.sub_channel,
                drop: data.drop,
                channel: data.channel,
                flow: flow,
                optimization_level: "l3_optimization",
              },
              attribute_value: {
                drop_penetration_ty: data.drop_penetration_ty,
                drop_receipt_quantity_ty: data.drop_receipt_quantity_ty,
                penetration_ty:
                  data[`flow_${flowNumber}_penetration_ty`] / 100 || 0,
                aur_ty: data.aur_ty || 0,
                quarter: parseInt(quarterNumber),
                receipts_quantity_ty:
                  data[`flow_${flowNumber}_receipts_quantity_ty`] || 0,
                budget_ty: data[`flow_${flowNumber}_receipt$`] || 0,
                budget_old_ty: data[`old_flow_${flowNumber}_receipt$`] || 0,
                aur_old_ty: data[`old_flow_${flowNumber}_aur_ty`] || 0,
                penetration_old_ty:
                  data[`old_flow_${flowNumber}_penetration_ty`] / 100 || 0,
                receipts_quantity_old_ty:
                  data[`old_flow_${flowNumber}_receipts_quantity_ty`] || 0,
              },
            };
            response.push(responseObject);
          }
        }
      } else if (data.flow) {
        const responseObject = {
          plan_code: data.plan_code,
          filters: {
            l0_name: data.l0_name,
            l1_name: data.l1_name,
            l2_name: data.l2_name,
            l3_name: data.l3_name,
            sub_channel: data.sub_channel,
            drop: "-",
            channel: data.channel,
            flow: data.flow,
            optimization_level: "l3_optimization",
          },
          attribute_value: {
            drop_penetration_ty: data.drop_penetration_ty,
            drop_receipt_quantity_ty: data.drop_receipt_quantity_ty,
            penetration_ty: data[`${data.flow}_penetration_ty`] / 100 || 0,
            aur_ty: data.aur_ty || 0,
            quarter: data.quarter,
            receipts_quantity_ty:
              data[`${data.flow}_receipts_quantity_ty`] || 0,
            budget_ty: data[`${data.flow}_receipt$`] || 0,
            budget_old_ty: data[`old_${data.flow}_receipt$`] || 0,
            aur_old_ty: data[`old_${data.flow}_aur_ty`] || 0,
            penetration_old_ty:
              data[`old_${data.flow}_penetration_ty`] / 100 || 0,
            receipts_quantity_old_ty:
              data[`old_${data.flow}_receipts_quantity_ty`] || 0,
          },
        };
        response.push(responseObject);
      }
      payloadArray.push(...response);
    });
    let updateNLEResponse = await props.updateNLEV2OptData(
      {
        nle_data: payloadArray,
        plan_code: props.planDetails?.data?.plan_code,
      },
      props.screenConfiguration?.common?.endpoint_project_name || "assort",
      props.planDetails?.data?.plan_code
    );
    if (updateNLEResponse?.data?.status) {
      let loadingRequired = true;
      fetchNleOptDataV2(loadingRequired);
      return true;
    }
    return false;
  };

  const getActivePlanStep = () => {
    return Object.keys(props.planStepNames).find(
      (key) => props.planStepNames[key] === props.activeScreenName
    );
  };
  const loadTableInstance = (params) => {
    NonLinearAGInstance.current = params;
    props.setRTinstance(NonLinearAGInstance);
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
          nonLinearEditData,
          props.screenConfiguration?.common?.drop_key || "drop"
        )
      )[0];
      formValues.current = {
        ...formData,
        [props.screenConfiguration?.common?.drop_key || "drop"]: selectedDrop,
      };
      setFormData(formValues.current);
      NonLinearAGInstance.current.api.onFilterChanged();
    }
  };
  const loadHindsightTableInstance = (params) => {
    HindsightAGInstance.current = params;
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
      let drops = Object.keys(
        groupBy(
          NLEChangeRowData,
          props.screenConfiguration?.common?.drop_key || "drop"
        )
      );
      //TO set hindsight popup drop same as nle popup selected drop on first load
      let selectedDrop = selectedDropData
        ? drops.filter((drop) => {
            //To get drop number from selected drop name i.e Drops 1 or drops_1
            return drop.includes(
              selectedDropData?.split(" ")[1] || selectedDropData?.split("_")[1]
            );
          })[0]
        : drops[0];
      formValues.current = {
        ...formData,
        [props.screenConfiguration?.common?.drop_key || "drop"]: selectedDrop,
      };
      setFormData(formValues.current);
      HindsightAGInstance.current.api.onFilterChanged();
    }
  };

  const handleNonLinearEditFilterChange = async (
    updatedFormData,
    id,
    field,
    e,
    initialValue
  ) => {
    formValues.current = { ...formData, ...updatedFormData };
    setFormData(formValues.current);
    if (id === "channel_list") {
      //onChange of channel if previous value was single channel then we need to call update api for that we need initial data
      formValues.current.channel_list = isArray(formValues.current.channel_list)
        ? formValues.current.channel_list
        : [formValues.current.channel_list];
      setInitialValue(initialValue);
    }
    if (type === "Hindsight") {
      HindsightAGInstance.current.api.onFilterChanged();
    } else {
      NonLinearAGInstance.current.api.onFilterChanged();
    }
  };

  const handleLevelsChange = (option, key) => {
    const selectedValue = levelSelected;
    selectedValue[key.filter_id] = option;
    formValues.current = { ...formData };
    formValues.current[key.filter_id] = option?.label;
    if (key.filter_id === "l1_name") {
      let l2ValuesOpt = [];
      const groupByProperties = ["l1_name", "l2_name"];
      const groupResult = groupByCustom({
        Group: type === "Hindsight" ? NLEChangeRowData : nonLinearEditData,
        By: groupByProperties,
      });
      groupResult.forEach((item) => {
        let filter = item.filter((itm) => itm.l1_name === option?.label);
        if (filter?.length) {
          l2ValuesOpt.push({
            label: filter[0]?.l2_name,
            value: filter[0]?.l2_name,
            id: filter[0]?.l2_name,
          });
        }
      });
      let options = levelsOptions;
      options.l2_name = l2ValuesOpt;
      formValues.current.l2_name = l2ValuesOpt[0]?.label;
      selectedValue.l2_name = l2ValuesOpt[0];
      setLevelsOptions(options);
    }
    setFormData(formValues.current);
    setLevelSelected(selectedValue);
    if (type === "Hindsight") {
      HindsightAGInstance.current.api.onFilterChanged();
    } else {
      NonLinearAGInstance.current.api.onFilterChanged();
    }
  };

  const isExternalFilterPresent = useCallback(() => {
    // if formData is not empty, then we are filtering
    return isWholesalePlan(props.planDetails?.data) ||
      isDropPlan(
        props.planDetails?.data,
        `${
          props.screenConfiguration?.common?.drop_key.includes("drop")
            ? "drops"
            : props.screenConfiguration?.common?.drop_key || "drops"
        }_count`
      ) ||
      props.planDetails?.data?.l2_name?.length > 1 ||
      props.planDetails?.data?.l1_name?.length > 1 ||
      isChannelMultiple(props.planDetails?.data)
      ? true
      : false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doesExternalFilterPass = useCallback(
    //whenever channel or sub channel changes data gets filtered here
    (node) => {
      const tableData =
        type === "Hindsight"
          ? NLEChangeRowData
          : nleRevamp
          ? nonLinearEditDataV2
          : nonLinearEditData;
      return externalFilterMultipleLevel(
        node,
        formValues.current,
        tableData,
        props.planDetails?.data,
        formData,
        type,
        props.screenConfiguration,
        nleRevamp,
        nleChannelRef.current
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      nonLinearEditData,
      NLEChangeRowData,
      formValues.current,
      nleChannelRef.current,
    ]
  );

  const handleReset = () => {
    const resetData = nleRevamp ? NLEResetDataV2.current : NLEResetData.current;
    if (nleRevamp) {
      generateTotalRows(cloneDeep(resetData));
    } else {
      setNonLinearEditData(cloneDeep(resetData));
    }
    setIsResetDisabled(true);
  };

  const getSubrowPath = useMemo(() => {
    return (data) => {
      return data.hierarchy;
    };
  }, []);

  const autoGroupColumnDef = {
    headerName: "",
    hide: true,
    cellRendererParams: {
      suppressCount: true,
    },
    headerComponent: SortComponent,
    width: 200,
    type: "attribute",
    valueGetter: (props) => {
      return props?.data?.hierarchy?.length > 1
        ? props?.data?.hierarchy?.[1]
        : props?.data?.carryover_flag;
    },
  };

  let optimizationLevels =
    props.screenConfiguration["2.1"]?.budget_optimization_level;

  const generateUniqueIdforNle = (nle_row, key) => {
    return `${nle_row.l1_name}~${nle_row.l2_name}~${nle_row.l3_name}~${key}~${nle_row.quarter}~${nle_row.channel}~${nle_row.sub_channel}`;
  };

  const generateTotalRows = (data, isEdit) => {
    const qtr_pattern = /^qtr\d+_/;
    const flow_pattern = /^flow_\d+_/;
    const nleUpdatedRowData = [];
    // Total row
    const totall3Object = {
      l3_name: "Total",
    };
    let groupedFlowData = groupByCustom({
      Group: data,
      By: ["l3_name", "channel"],
    });
    groupedFlowData.forEach((l3Data) => {
      // Sub total row
      const totalDropValueObj = {
        drop: "Total",
      };
      const editedl3Data = l3Data.map((dropData) => {
        if (dropData.l3_name !== "Total" && dropData.drop !== "Total") {
          Object.keys(dropData).forEach((key) => {
            if (
              flow_pattern.test(key) ||
              qtr_pattern.test(key) ||
              key.startsWith("total_")
            ) {
              if (key === "total_penetration_ty") {
                // sub total and total row values for total column in pen%
                totalDropValueObj[key] = 1;
                if (dropData.channel === nleChannelRef?.current?.value) {
                  totall3Object[key] = 1;
                }
              } else {
                // calculate sub total and total row values for flow and qtr columns
                totalDropValueObj[key] =
                  (totalDropValueObj[key] || 0) + dropData[key];
                if (dropData.channel === nleChannelRef?.current?.value) {
                  totall3Object[key] =
                    (totall3Object[key] || 0) + dropData[key];
                }
              }
            }
            if (
              [
                "l3_name",
                "channel",
                "plan_code",
                "apply_on",
                "uniqueId",
              ].includes(key)
            ) {
              // add necessary fields to sub total and total row
              totalDropValueObj[key] = dropData[key];
              if (
                (key !== "l3_name" && key !== "channel") ||
                (key === "channel" &&
                  dropData.channel === nleChannelRef?.current?.value)
              )
                totall3Object[key] = dropData[key];
            }
            totalDropValueObj.uniqueId = generateUniqueIdforNle(
              dropData,
              "drop_total"
            );
            if (dropData.channel === nleChannelRef?.current?.value) {
              totall3Object.uniqueId = generateUniqueIdforNle(
                dropData,
                "l3_total"
              );
            }
          });
        } else if (dropData.l3_name === "Total") {
          // update total row on table update
          return totall3Object;
        } else {
          // update sub total row on table update
          return totalDropValueObj;
        }
        return dropData;
      });
      Object.keys(totalDropValueObj).forEach((key) => {
        const qtr_flow_key =
          key.match(qtr_pattern, "")?.[0]?.slice(0, -1) ||
          key.match(flow_pattern, "")?.[0]?.slice(0, -1);
        if (qtr_flow_key) {
          // update sub total and total rows for pen%
          totalDropValueObj[
            `${qtr_flow_key}_penetration_ty`
          ] = nleFormulas.calculatePenetrationFromRevenue(
            totalDropValueObj,
            qtr_flow_key
          );
          if (totalDropValueObj.channel === nleChannelRef?.current?.value) {
            totall3Object[
              `${qtr_flow_key}_penetration_ty`
            ] = nleFormulas.calculatePenetrationFromRevenue(
              totall3Object,
              qtr_flow_key
            );
          }
        }
      });
      if (!isEdit) {
        // add sub total row to l3 groups
        nleUpdatedRowData.push(...l3Data, totalDropValueObj);
      } else {
        nleUpdatedRowData.push(...editedl3Data);
      }
    });
    // add total row
    !isEdit && nleUpdatedRowData.push(totall3Object);
    setNonLinearEditDataV2(nleUpdatedRowData);
  };

  const setNleRowData = (nleRowData, channel = nleChannelRef.current) => {
    let groupedData = groupByCustom({
      Group: nleRowData,
      By: ["l3_name", "drop", "channel"],
    });
    let nle_table = [];
    groupedData.forEach((nle_data) => {
      let nle_row = {};
      let prev_qtr = 0;
      nle_data.forEach((nle_obj) => {
        Object.entries(nle_obj).forEach(([key, value]) => {
          if (
            (key === "receipt$" ||
              key === "flow_receipts_quantity_ty" ||
              key === "flow_penetration_ty" ||
              key === "aur_ty") &&
            ((nle_obj.l3_name !== "Total" && nle_obj.flow !== "-") ||
              !isDropPlan(
                props.planDetails?.data,
                `${
                  props.screenConfiguration?.common?.drop_key.includes("drop")
                    ? "drops"
                    : props.screenConfiguration?.common?.drop_key || "drops"
                }_count`
              ))
          ) {
            const metric_key = key.includes("flow_")
              ? key.split("flow_")[1]
              : key === "aur_ty"
              ? "aur_ty"
              : "receipt$";
            // add all flows data into single drop row object
            nle_row[`${nle_obj.flow}_${metric_key}`] =
              nle_obj[key] * (metric_key === "penetration_ty" ? 100 : 1) || 0;
            nle_row[`old_${nle_obj.flow}_${metric_key}`] =
              nle_obj[key] * (metric_key === "penetration_ty" ? 100 : 1) || 0;
            //if (key !== "flow_penetration_ty") {
            // calculate qtr and total values from flows for revenue and quantity
            nle_row[`qtr${nle_obj.quarter}_${metric_key}`] =
              (nle_row[`qtr${nle_obj.quarter}_${metric_key}`] || 0) +
              nle_obj[key];
            nle_row[`total_${metric_key}`] =
              (nle_row[`total_${metric_key}`] || 0) + nle_obj[key];
            //}
          }
        });

        // set arrays of flow and qtr columns available in a drop
        nle_row["qtr" + nle_obj.quarter] ??= [];
        nle_row["qtr" + nle_obj.quarter].push(nle_obj.flow);
        nle_row["total"] ??= [];
        prev_qtr !== nle_obj.quarter &&
          nle_row["total"].push(`qtr${nle_obj.quarter}`);
        nle_row.apply_on = nle_obj?.apply_on || "Depth";
        nle_row.uniqueId = generateUniqueIdforNle(
          nle_obj,
          nle_obj[props.screenConfiguration?.common?.drop_key || "drop"]
        );
        nle_row[props.screenConfiguration?.common?.drop_key || "drop"] =
          nle_obj[props.screenConfiguration?.common?.drop_key || "drop"] === "-"
            ? "Total"
            : nle_obj.drop;
        prev_qtr = nle_obj.quarter;
      });

      nle_row.total?.forEach((qtr) => {
        // calculate pen% qtr and total data
        nle_row[
          `${qtr}_penetration_ty`
        ] = nleFormulas.calculatePenetrationFromRevenue(nle_row, qtr);
        nle_row["total_penetration_ty"] = 1;
      });
      if (Object.keys(nle_row).length) {
        nle_table.push({ ...nle_data[0], ...nle_row });
      }
    });
    NLEResetDataV2.current = cloneDeep(nle_table);
    generateTotalRows(nle_table);
  };

  const setNleColData = (nleColResponse, value = nleMetricsRef.current) => {
    const NleColumnData = nleColResponse.map((colData) => {
      const nleEditColsPattern = /(flow_\d+)|(qtr\d+)|(total)/;
      if (nleEditColsPattern.test(colData.column_name)) {
        colData.sub_headers.forEach((subColData) => {
          // display only current selected metrics table
          if (subColData.column_name.includes(value.id)) {
            subColData.is_hidden = false;
          } else {
            subColData.is_hidden = true;
          }
          // NOTE: Will be removed later
          if (subColData.column_name.includes("receipt$")) {
            subColData.extra = {};
          }
        });
      }
      return colData;
    });
    agGridColumnFormatter(NleColumnData, props.columnHeaderJson);
    NleColumnData.forEach((col) => {
      if (col.column_name === "apply_on") {
        col.options = nleChoiceOption;
      }
    });
    setNonLinearEditColumnsV2(NleColumnData);
  };

  useEffect(() => {
    NonLinearAGInstance?.current?.api?.refreshCells({
      force: true,
      suppressFlash: false,
    });
  }, [nonLinearEditDataV2]);

  useEffect(() => {
    if (isChannelMultiple(props.planDetails.data)) {
      let options = props.planDetails.data?.channel.map((value) => {
        return {
          value: value,
          label: value,
          id: value,
        };
      });
      options = options.filter(
        (option) => !Plan.__Ecom_Channel.includes(option.value)
      );
      let defaultChannel = getDefaultChannelValue(
        options,
        props.planDetails?.data
      );
      nleChannelRef.current = defaultChannel;
      formValues.current = defaultChannel;
    } else {
      const chanValue = props.planDetails.data?.channel?.[0];
      let selectedChannel = {
        value: chanValue,
        label: chanValue,
        id: chanValue,
      };
      nleChannelRef.current = selectedChannel;
      formValues.current = selectedChannel;
    }
    nleMetricsRef.current = metricOptions[0];
  }, [props.planDetails?.data]);

  const fetchNleOptDataV2 = async (loadingRequired) => {
    let payload = {
      filters: [
        {
          attribute_name: "plan_code",
          value: [props.planDetails?.data?.plan_code],
          operator: "in",
        },
      ],
      optimization_level: getOptimizationLevel(),
    };
    let nleResponse = await props.getNLEOptData(
      payload,
      props.screenConfiguration?.common?.endpoint_project_name || "assort",
      props.planDetails?.data?.plan_code
    );
    setNonLinearEditResDataV2(nleResponse.data.data.data);

    setNleRowData(nleResponse.data.data.data, nleChannelRef.current);
    setNleColData(nleResponse.data.data.columns);
    if (!loadingRequired) {
      props.setLoading(false);
    }
  };

  const onMetricChange = (value) => {
    nleMetricsRef.current = {
      id: value.id,
      label: value.label,
      value: value.value,
    };
    setNleColData(nonLinearEditColumnsV2, value);
  };

  const onChannelChange = (value) => {
    let selectedChannel = {
      id: value.id,
      label: value.label,
      value: value.value,
    };
    nleChannelRef.current = selectedChannel;
    formValues.current = selectedChannel;
    if (type === "Hindsight") {
      formValues.current = {
        id: value.id,
        label: value.label,
        value: value.value,
      };
      setFormData(formValues.current);
      HindsightAGInstance.current.api.onFilterChanged();
    } else {
      setNleRowData(nonLinearEditResDataV2, value);
    }
  };

  const handleNleTableOnBlur = (
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
    if (isChanged) {
      let newValue = initValue;
      let columnId = column.colId;
      setIsResetDisabled(false);
      const updatedRowData = [];
      const metric_key = `${nleMetricsRef.current.id}_ty`;
      const isQtrColUpdate = column.colId.startsWith("qtr");
      const isTotalColUpdate = column.colId.startsWith("total_");
      let isTotalRowChanged = false;
      NonLinearAGInstance.current.api.forEachNode((node) => {
        if (
          ((data.drop === "Total" && data.l3_name === node.data.l3_name) ||
            data.l3_name === "Total") &&
          data.channel === node.data.channel &&
          ((node.data.drop !== "Total" &&
            node.data.l3_name !== "Total" &&
            isDropPlan(
              props.planDetails?.data,
              `${
                props.screenConfiguration?.common?.drop_key.includes("drop")
                  ? "drops"
                  : props.screenConfiguration?.common?.drop_key || "drops"
              }_count`
            )) ||
            !isDropPlan(
              props.planDetails?.data,
              `${
                props.screenConfiguration?.common?.drop_key.includes("drop")
                  ? "drops"
                  : props.screenConfiguration?.common?.drop_key || "drops"
              }_count`
            ))
        ) {
          let key = columnId.includes("qtr")
            ? "qtr"
            : (data.flow !== "-" && data.l3_name !== "Total") ||
              columnId.includes("flow_")
            ? "flow_"
            : "-";
          let id = columnId.split(key)?.[1]?.split("_")?.[0];
          let columnName = columnId.includes("total") ? "total" : key + id;
          let oldValue = initialValue;
          let newValue = value;
          if (data.flow !== "-" || data.l3_name === "Total") {
            node.data[columnId] =
              nleFormulas.calculateRevenueFlowOnRowTotalChange(
                node.data,
                columnName,
                oldValue,
                newValue
              ) || 0;
            isTotalRowChanged = true;
          } else {
            let colName = columnId.split("total")?.[1];
            node.data[key + colName] = newValue;
            node.data[columnId] = newValue;
            node.data[columnName + "_receipts_quantity_ty"] = node.data[
              key + "_aur_ty"
            ]
              ? newValue / node.data[key + "_aur_ty"]
              : 0;
            node.data[key + "_receipts_quantity_ty"] = node.data[
              key + "_aur_ty"
            ]
              ? newValue / node.data[key + "_aur_ty"]
              : 0;
          }
        }
        if (
          ((data.drop === node.data.drop && node.data.drop !== "Total") ||
            isTotalRowChanged) &&
          ((data.l3_name === node.data.l3_name &&
            node.data.l3_name !== "Total") ||
            (isTotalRowChanged && columnId.includes("total_") && data.l3_name === "Total")) &&
          data.channel === node.data.channel
        ) {
          if (!isTotalRowChanged) {
            node.data[columnId] = newValue;
          }
          let totalRevenue = 0;
          let totalQuantity = 0;
          node.data?.["total"]?.forEach((qtr) => {
            let qtrRevenue = 0;
            let qtrQuantity = 0;
            node.data[qtr].forEach((flow) => {
              let auc_value =
                node.data[`${flow}_receipt$`] /
                node.data[`${flow}_receipts_quantity_ty`];
              if (metric_key === "receipt$_ty") {
                if (isTotalColUpdate) {
                  // recalculate revenue flow values on total col change
                  node.data[
                    `${flow}_receipt$`
                  ] = nleFormulas.calculateRevenueFlowOnTotalChange(
                    node.data,
                    flow,
                    initialValue,
                    value
                  );
                }
                if (isQtrColUpdate && column.colId.includes(qtr)) {
                  // recalculate revenue flow values on qtr col change
                  node.data[
                    `${flow}_receipt$`
                  ] = nleFormulas.calculateRevenueFlowOnQtrChange(
                    node.data,
                    flow,
                    initialValue,
                    value
                  );
                }
              } else if (metric_key === "penetration_ty") {
                if (`${flow}_penetration_ty` !== column.colId) {
                  // recalculate flow values to rescale pen%
                  node.data[
                    `${flow}_penetration_ty`
                  ] = nleFormulas.calculatePenetrationFlows(
                    node.data,
                    flow,
                    100 - initialValue,
                    value
                  );
                }
                // recalculate revenue flows based on pen% values
                node.data[
                  `${flow}_receipt$`
                ] = nleFormulas.calculateRevenueFromPenetration(
                  node.data,
                  flow
                );
              }
              if (
                metric_key === "receipt$_ty" ||
                metric_key === "penetration_ty"
              ) {
                // recalculate quantity flow values on revenue or pen% change
                node.data[
                  `${flow}_receipts_quantity_ty`
                ] = nleFormulas.calculateQuantityFlowOnChange(
                  node.data,
                  flow,
                  node.data[flow + "_aur_ty"]
                );
              } else if (metric_key === "receipts_quantity_ty") {
                // recalculate revenue flow values on quantity change
                node.data[
                  `${flow}_receipt$`
                ] = nleFormulas.calculateRevenueFlowOnQtyChange(
                  node.data,
                  flow,
                  node.data[flow + "_aur_ty"]
                );
              }
              // recalculate qtr col values for revenue & quantity
              qtrRevenue += node.data[`${flow}_receipt$`];
              qtrQuantity += node.data[`${flow}_receipts_quantity_ty`];
            });
            node.data[`${qtr}_receipt$`] = qtrRevenue;
            node.data[`${qtr}_receipts_quantity_ty`] = qtrQuantity;
            // recalculate total col value for revenue & quantity
            totalRevenue += qtrRevenue;
            totalQuantity += qtrQuantity;
          });
          node.data["total_receipt$"] = totalRevenue;
          node.data["total_receipts_quantity_ty"] = totalQuantity;
          node?.data?.["total"]?.forEach((qtr) => {
            if (
              metric_key === "receipt$_ty" ||
              metric_key === "receipts_quantity_ty"
            ) {
              node.data[qtr].forEach((flow) => {
                // recalculcate pen flow values on revenue/quantity change
                node.data[`${flow}_penetration_ty`] =
                  nleFormulas.calculatePenetrationFromRevenue(node.data, flow) *
                  100;
              });
            }
            // recalculate pen qtr values
            node.data[
              `${qtr}_penetration_ty`
            ] = nleFormulas.calculatePenetrationFromRevenue(node.data, qtr);
          });
        }
        if (columnId === "apply_on") {
          setNleColData(nonLinearEditColumnsV2);
        }
        updatedRowData.push(node.data);
      });
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
        generateTotalRows(updatedRowData, true);
      } else {
        setNonLinearEditDataV2(updatedRowData);
      }
    }
  };

  const handleNleTableOnChange = (params) => {
    const { newValue, oldValue, colDef } = params;
    let columnId = colDef.column_name;
    let row = params.data;
    NonLinearAGInstance.current.api.forEachNode((node) => {
      if (columnId === "apply_on") {
        if (
          (row.drop === "Total" && row.l3_name === node.data.l3_name) ||
          row.l3_name === "Total" ||
          ((row.drop.includes("drop") || row.l3_name !== "Total") &&
            row.drop === node.data.drop &&
            row.l3_name === node.data.l3_name)
        ) {
          node.data[columnId] = newValue;
          setNleColData(nonLinearEditColumnsV2);
        }
      }
    });
  };

  return (
    <Dialog
      maxWidth={"lg"}
      aria-labelledby="customized-dialog-title"
      open={true}
      fullWidth={true}
      onClose={() => props.onToggleNonLinearEdit(false)}
    >
      <DialogTitle id="customized-dialog-title">
        <Grid
          container
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          classes={{ root: classes.dialog }}
        >
          <Typography variant="h3">{getLabel(type)}</Typography>
          <IconButton aria-label="close" size="large">
            <CloseIcon onClick={() => props.onToggleNonLinearEdit(false)} />
          </IconButton>
        </Grid>
      </DialogTitle>
      <DialogContent className={classes.contentBody}>
        <Grid container direction="row" className={classes.dialogGrid}>
          <LoadingOverlay loader={props.loading}>
            {!nleRevamp && (
              <div>
                <div className={linearEditClasses.nonLinearEditingCheckBox}>
                  <div className={"drop-down-label drop-down-label-margin"}>
                    {type === "Hindsight"
                      ? "The budget update caused the following changes:"
                      : "Select metric to be changed:"}
                  </div>
                  {type === "NLE" && (
                    <>
                      <div>
                        <Checkbox
                          checked={depthChecked}
                          onChange={(event) => {
                            handleEventChange(event, "depth");
                          }}
                          color="primary"
                        />
                        Depth Only
                      </div>
                      <div>
                        <Checkbox
                          checked={choiceChecked}
                          onChange={(event) => {
                            handleEventChange(event, "choice");
                          }}
                          color="primary"
                        />
                        Choice Only
                      </div>
                    </>
                  )}
                  {Object.keys(props.levelsJson).forEach((levelKey) => {
                    return (
                      levelsOptions[levelKey]?.length > 0 &&
                      filterView(
                        props.columnHeaderJson?.[levelKey],
                        levelKey,
                        levelsOptions[levelKey],
                        handleLevelsChange,
                        levelSelected[levelKey],
                        classes.formContainer,
                        classes.inputLabel
                      )
                    );
                  })}
                  {((type === "Hindsight" &&
                    HindsightformFields &&
                    NLEChangeRowData?.length > 0) ||
                    (type === "NLE" &&
                      formFields &&
                      nonLinearEditData?.length > 0)) && (
                    <div className={linearEditClasses.nonLinearDivMargin}>
                      <Form
                        layout={"vertical"}
                        maxFieldsInRow={1}
                        handleChange={handleNonLinearEditFilterChange}
                        fields={
                          type === "Hindsight"
                            ? HindsightformFields
                            : formFields
                        }
                        updateDefaultValue={false}
                        defaultValues={formData}
                        handleDropdownClose={true}
                      ></Form>
                    </div>
                  )}
                  {type === "Hindsight" && (
                    <div className={classes.rightEnd}>
                      <Button
                        variant="outlined"
                        color="primary"
                        title={"Non Linear Edit Download"}
                        className={classes.marginTop10}
                        onClick={() => {
                          NLEDownload.current.link.click();
                        }}
                      >
                        <Download />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
            {type === "Hindsight" ? (
              <>
                {NLEChangeRowData.length > 0 && (
                  <>
                    {downloadExcelLink(
                      excelDataDownload,
                      `NonLinearEdit_sheet_${props.planDetails?.data?.["name"]}`,
                      NLEDownload,
                      excelHeaders,
                      "",
                      ""
                    )}
                  </>
                )}
                {props.channelOptions.length >= 1 &&
                  filterView(
                    "Channel",
                    "Channel",
                    props.channelOptions,
                    onChannelChange,
                    nleChannelRef.current,
                    classes.formContainer,
                    classes.inputLabel,
                    false,
                    false,
                    "",
                    true
                  )}
                {NLEgroupedDrops && (
                  <div>
                    <PlanDropTabViewComponent
                      groupedDrops={NLEgroupedDrops}
                      onChangeTab={setSelectedNLEChangesDropData}
                      selectedTab={selectedNLEChangesDropData}
                    />
                  </div>
                )}
                <AgGridTable
                  rowdata={NLEChangeRowData || []}
                  columns={NLEChangesColumns || []}
                  loadTableInstance={loadHindsightTableInstance}
                  isExternalFilterPresent={isExternalFilterPresent}
                  doesExternalFilterPass={doesExternalFilterPass}
                  treeData={
                    optimizationLevels.includes("carryover") ? true : false
                  }
                  autoGroupColumnDef={autoGroupColumnDef}
                  getDataPath={getSubrowPath}
                  adjustTableHeight={
                    NLEReplaceFilteredData?.length &&
                    NLEReplaceFilteredData?.length <= 2
                      ? true
                      : false
                  }
                  uniqueRowId={"uniqueId"}
                />
                <div className={linearEditClasses.nonLinearConfirmDiv}>
                  <div className={"drop-down-label"}>
                    Do you want to proceed further with the suggested changes
                    and redirect to the{" "}
                    {getActivePlanStep() === "2.4" || props.showWedge
                      ? "wedge screen"
                      : "Depth & choice screen"}
                    ?
                  </div>
                  <div>
                    <Button
                      variant="contained"
                      color="primary"
                      className={classes.button}
                      onClick={() => nonLinearChangesReplaceData(true)}
                    >
                      Yes
                    </Button>
                    <Button
                      variant="outlined"
                      color="primary"
                      className={classes.button}
                      onClick={() => nonLinearChangesReplaceData(false)}
                    >
                      No
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {nleRevamp ? (
                  <>
                    <div className={classes.nleDropdownContainer}>
                      {props.channelOptions.length >= 1 &&
                        filterView(
                          "Channel",
                          "Channel",
                          props.channelOptions,
                          onChannelChange,
                          nleChannelRef.current,
                          classes.formContainer,
                          classes.inputLabel,
                          false,
                          false,
                          "",
                          true
                        )}
                      {filterView(
                        "Metric",
                        "metric",
                        metricOptions,
                        onMetricChange,
                        nleMetricsRef.current,
                        classes.formContainer,
                        classes.inputLabel,
                        false,
                        false,
                        "",
                        true
                      )}
                    </div>
                    <AgGridTable
                      rowdata={nonLinearEditDataV2 || []}
                      columns={nonLinearEditColumnsV2 || []}
                      enableRowSpan={true}
                      rowSpanColumn={["l3_name"]}
                      getRowData={(params, columnName) =>
                        params?.data?.[columnName]
                      }
                      customCellRenderer={(cellProps) =>
                        assortAgGridCustomCellRenderer(
                          cellProps,
                          "nle-revamp-table"
                        )
                      }
                      noEditableCustomCellRender={(cellProps) => {
                        const { data, colDef, column } = cellProps;
                        if (cellProps.column.colId.startsWith("qtr")) {
                          return (
                            Math.round(
                              cellProps.value *
                                (cellProps.column.colId.includes(
                                  "penetration_ty"
                                )
                                  ? 100
                                  : 1)
                            ) || "0"
                          );
                        }
                        if (cellProps.column.colId === "drop") {
                          return attributeFormatter(cellProps?.value);
                        }
                      }}
                      loadTableInstance={loadTableInstance}
                      onBlur={handleNleTableOnBlur}
                      onCellValueChanged={handleNleTableOnChange}
                      isExternalFilterPresent={isExternalFilterPresent}
                      doesExternalFilterPass={doesExternalFilterPass}
                      uniqueRowId={"uniqueId"}
                      sideBar={false}
                      pagination={false}
                    />
                    <div className={classes.textCenter}>
                      <Button
                        variant="contained"
                        color="primary"
                        className={classes.button}
                        onClick={() => onOptimise()}
                        id="optimise"
                        disabled={nleChannelRef.current ? false : true}
                      >
                        Optimize
                      </Button>
                      <Button
                        variant="outlined"
                        color="primary"
                        className={classes.button}
                        onClick={() => handleReset()}
                        id="resetNLE"
                        disabled={isResetDisabled ? true : false}
                      >
                        Reset
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    {nonLinearEditColumns.length > 0 && (
                      <React.Fragment>
                        {groupedDrops &&
                          Object.keys(groupedDrops).length >= 1 &&
                          !optimizationLevels.includes("carryover") && (
                            <div>
                              <PlanDropTabViewComponent
                                groupedDrops={groupedDrops}
                                onChangeTab={setSelectedDropData}
                              />
                            </div>
                          )}
                        <AgGridTable
                          rowdata={nonLinearEditData || []}
                          columns={nonLinearEditColumns || []}
                          customCellRenderer={(cellProps) =>
                            assortAgGridCustomCellRenderer(
                              cellProps,
                              "NonLinearEditTable"
                            )
                          }
                          loadTableInstance={loadTableInstance}
                          onBlur={(
                            e,
                            data,
                            column,
                            isChanged,
                            value,
                            initialValue
                          ) => {
                            setIsResetDisabled(false);
                            updateNLEL3RowData(
                              e,
                              data,
                              column,
                              isChanged,
                              value,
                              initialValue,
                              NonLinearAGInstance,
                              props,
                              selectedDropData,
                              props.getTotalFooterRow,
                              setNonLinearEditData,
                              setIspenValueChanged,
                              setIsL3DataChanged
                            );
                          }}
                          isExternalFilterPresent={isExternalFilterPresent}
                          doesExternalFilterPass={doesExternalFilterPass}
                          treeData={
                            optimizationLevels.includes("carryover")
                              ? true
                              : false
                          }
                          autoGroupColumnDef={autoGroupColumnDef}
                          getDataPath={getSubrowPath}
                          uniqueRowId={"uniqueId"}
                          sideBar={false}
                          pagination={false}
                          adjustTableHeight={
                            NLEFilteredData?.length &&
                            NLEFilteredData?.length <= 2
                              ? true
                              : false
                          }
                        />
                        <div className={classes.textCenter}>
                          <Button
                            variant="contained"
                            color="primary"
                            className={classes.button}
                            onClick={() => onOptimise()}
                            id="optimise"
                            disabled={
                              (depthChecked || choiceChecked) &&
                              (!formData?.channel_list ||
                                formData?.channel_list?.length <= 1)
                                ? false
                                : true
                            }
                          >
                            Optimize
                          </Button>
                          <Button
                            variant="outlined"
                            color="primary"
                            className={classes.button}
                            onClick={() => handleReset()}
                            id="resetNLE"
                            disabled={isResetDisabled ? true : false}
                          >
                            Reset
                          </Button>
                        </div>
                      </React.Fragment>
                    )}
                  </>
                )}
              </>
            )}
          </LoadingOverlay>
        </Grid>
      </DialogContent>
    </Dialog>
  );
};

const mapStateToProps = (store) => {
  return {
    planDetails: store.assortsmartReducer.planDashboardReducer.planDetails,
    columnHeaderJson:
      store.assortsmartReducer.planDashboardReducer.columnHeaderJson,
    levelsJson: store.assortsmartReducer.planDashboardReducer.levelsJson,
    planLevels: store.assortsmartReducer.planDashboardReducer.planLevels,
    activeScreenName:
      store.assortsmartReducer.commonAssortReducer.activeScreenName,
    planStepNames: store.assortsmartReducer.commonAssortReducer.planStepNames,
    showWedge: store.assortsmartReducer.planWedgeReducer.showWedge,
    screenConfiguration:
      store.assortsmartReducer.commonAssortReducer.screenConfiguration,
  };
};

const mapDispatchToProps = (dispatch) => ({
  updateL3OptData: (payload, endpoint, objID) =>
    dispatch(updateL3OptData(payload, endpoint, objID)),
  nonLinearEdit: (payload, endpoint, objID) =>
    dispatch(nonLinearEdit(payload, endpoint, objID)),
  nonLinearReplaceData: (payload, endpoint, objID) =>
    dispatch(nonLinearReplaceData(payload, endpoint, objID)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  getL3OptData: (payload, endpoint, objID) =>
    dispatch(getL3OptData(payload, endpoint, objID)),
  getNLEOptData: (payload, endpoint, objID) =>
    dispatch(getNLEOptData(payload, endpoint, objID)),
  updateNLEV2OptData: (payload, endpoint, objID) =>
    dispatch(updateNLEV2OptData(payload, endpoint, objID)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(NonLinearEditDrawerRootComponent));
