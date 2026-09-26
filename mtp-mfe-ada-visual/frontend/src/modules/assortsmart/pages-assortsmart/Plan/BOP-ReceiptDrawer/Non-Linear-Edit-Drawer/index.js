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
} from "@mui/material";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import CloseIcon from "@mui/icons-material/Close";
import Download from "@mui/icons-material/Download";
import LoadingOverlay from "core/Utils/Loader/loader";
import { withRouter } from "react-router-dom";
import { connect } from "react-redux";
import { Button } from "@mui/material";
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
} from "../../../../constants-assortsmart/stringContants";
import { getL3OptData } from "modules/assortsmart/services-assortsmart/Plan/Plan-Initial/plan-initial-service";
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

const NonLinearEditDrawerRootComponent = (props) => {
  const [depthChecked, setDepthChecked] = useState(false);
  const [choiceChecked, setChoiceChecked] = useState(false);
  const [type, setType] = useState("NLE");
  const [groupedDrops, setGroupedDrops] = useState(null);
  const [selectedDropData, setSelectedDropData] = useState(null);
  const [NLEChangesColumns, setNLEChangesColumns] = useState([]);
  const [NLEChangeRowData, setNLEChangeRowData] = useState([]);
  const [NLEChangesGroupedDrops, setNLEChangesGroupedDrops] = useState(null);
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
  const [nonLinearEditColumns, setNonLinearEditColumns] = useState([]);
  const [formData, setFormData] = useState({});
  const [initialValue, setInitialValue] = useState([]);
  const [isPenValueChanged, setIspenValueChanged] = useState(false);
  const [levelsOptions, setLevelsOptions] = useState({});
  const [levelSelected, setLevelSelected] = useState({});
  const [isL3DataChanged, setIsL3DataChanged] = useState(false)
  const classes = useStyles();
  const linearEditClasses = linearEditStyles();
  const NLEDownload = useRef(null);
  let formValues = useRef({});
  formValues.current = formData;
  const NLEResetData = useRef({});
  const [isResetDisabled, setIsResetDisabled] = useState(true);
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
    let NLEData = cloneDeep(NLEChangeRowData)
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
        `${props.screenConfiguration?.common?.drop_key || "drops"}_count`
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
          `${props.screenConfiguration?.common?.drop_key || "drops"}_count`
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
        `${props.screenConfiguration?.common?.drop_key || "drops"}_count`
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
        `${props.screenConfiguration?.common?.drop_key || "drops"}_count`
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
    let nonLinearResponse = await props.getL3OptData(
      payload,
      props.screenConfiguration?.common?.endpoint_project_name || "assort"
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
          nonLinearData[
            props.screenConfiguration?.common?.drop_key || "drop"
          ] = attributeFormatter(
            nonLinearData[props.screenConfiguration?.common?.drop_key || "drop"]
          )  || "-";
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
          nonLinearData[
            props.screenConfiguration?.common?.drop_key || "drop"
          ] = attributeFormatter(
            nonLinearData[props.screenConfiguration?.common?.drop_key || "drop"]
          )  || "-";
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
      setNonLinearEditColumns(cols);
    }
  };

  useEffect(() => {
    fetchL3Details();
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
    } else if (initialValue.length > 1) {
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
      props.screenConfiguration?.common?.endpoint_project_name || "assort"
    );
    if (updateNLEResponse?.data?.status) {
      fetchL3Details(loadingRequired);
      return true;
    }
    return false;
  };

  const onOptimise = async () => {
    if (depthChecked || choiceChecked) {
      try {
        let loadingRequired = true;
        let isUpdateSucess = await updateNLEData(loadingRequired);
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
          payload.non_linear_edit = depthChecked ? "depth_only" : "choice_only";
          payload.update_steps = getUpdateStep();
          let NLEres = await props.nonLinearEdit(
            payload,
            props.screenConfiguration?.common?.endpoint_project_name || "assort"
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
    }
  };

  useEffect(() => {
    if (
      NLEChangeFilteredData?.length &&
      isDropPlan(
        props.planDetails?.data,
        `${props.screenConfiguration?.common?.drop_key || "drops"}_count`
      )
    ) {
      let drops = groupBy(
        NLEChangeFilteredData,
        props.screenConfiguration?.common?.drop_key || "drop"
      );
      setNLEChangesGroupedDrops(drops);
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
    return cols;
  };

  const nonLinearChangesReplaceData = async (action) => {
    try {
      props.setLoading(true);
      let payload = {
        plan_code: props.planDetails?.data?.plan_code,
        replace_data: action,
        update_steps: getUpdateStep(),
        plan_sub_step: getActivePlanStep() === "2.4" || props.showWedge ? "wedge_table" : "depth_choice_table"
      };
      let nonLinearChangesResponse = await props.nonLinearReplaceData(
        payload,
        props.screenConfiguration?.common?.endpoint_project_name || "assort"
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
        `${props.screenConfiguration?.common?.drop_key || "drops"}_count`
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
        `${props.screenConfiguration?.common?.drop_key || "drops"}_count`
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
      levelsOptions.l2_name = l2ValuesOpt;
      formValues.current.l2_name = l2ValuesOpt[0]?.label;
      selectedValue.l2_name = l2ValuesOpt[0];
      setLevelsOptions(levelsOptions);
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
        `${props.screenConfiguration?.common?.drop_key || "drops"}_count`
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
      const tableData = type === "NLE" ? nonLinearEditData : NLEChangeRowData;
      return externalFilterMultipleLevel(
        node,
        formValues.current,
        tableData,
        props.planDetails?.data,
        formData,
        type,
        props.screenConfiguration
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nonLinearEditData, NLEChangeRowData, formValues.current]
  );

  const handleReset = () => {
    const resetData = NLEResetData.current;
    setNonLinearEditData(cloneDeep(resetData));
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
          <Typography variant="h3">
            {type === "Hindsight"
              ? "Hindsight pop-up after amending budget on NLE "
              : "Update Budget"}
          </Typography>
          <IconButton aria-label="close" size="large">
            <CloseIcon onClick={() => props.onToggleNonLinearEdit(false)} />
          </IconButton>
        </Grid>
      </DialogTitle>
      <DialogContent className={classes.contentBody}>
        <Grid container direction="row" className={classes.dialogGrid}>
          <LoadingOverlay loader={props.loading}>
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
                {Object.keys(props.levelsJson).map((levelKey) => {
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
                        type === "Hindsight" ? HindsightformFields : formFields
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
                {NLEChangesGroupedDrops && (
                  <div>
                    <PlanDropTabViewComponent
                      groupedDrops={groupedDrops}
                      onChangeTab={setSelectedNLEChangesDropData}
                      selectedTab={selectedDropData}
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
                        optimizationLevels.includes("carryover") ? true : false
                      }
                      autoGroupColumnDef={autoGroupColumnDef}
                      getDataPath={getSubrowPath}
                      uniqueRowId={"uniqueId"}
                      sideBar={false}
                      pagination={false}
                      adjustTableHeight={
                        NLEFilteredData?.length && NLEFilteredData?.length <= 2
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
  updateL3OptData: (payload, endpoint) =>
    dispatch(updateL3OptData(payload, endpoint)),
  nonLinearEdit: (payload, endpoint) =>
    dispatch(nonLinearEdit(payload, endpoint)),
  nonLinearReplaceData: (payload, endpoint) =>
    dispatch(nonLinearReplaceData(payload, endpoint)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  getL3OptData: (payload, endpoint) =>
    dispatch(getL3OptData(payload, endpoint)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(NonLinearEditDrawerRootComponent));
