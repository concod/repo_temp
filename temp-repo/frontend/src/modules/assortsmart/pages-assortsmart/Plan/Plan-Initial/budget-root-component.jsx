import React, { useEffect, useState, useRef } from "react";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";
import { Grid, Card, Typography, Button } from "@mui/material";
import { Switch } from "impact-ui";
import TableChartIcon from "@mui/icons-material/TableChart";
import BarChartIcon from "@mui/icons-material/BarChart";
import { cloneDeep, compact, groupBy, isEmpty, uniqBy } from "lodash";
import { useHistory } from "react-router";
import AddIcon from "@mui/icons-material/Add";
import { addSnack } from "core/actions/snackbarActions";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import BudgetLevelComponent from "./budget-level-two-component";
import BudgetLevelThreeComponent from "./budget-level-three-component";
import BudgetClusterComponent from "./budget-cluster-component";
import CreateNewLevelThreeModal from "./create-new-level-three-modal";
import ClusterScaleUpDown from "./cluster-scale-up-down";
import BudgetScaleUpDown from "./budget-scale-up-down";
import {
  Plan,
  common,
} from "modules/assortsmart/constants-assortsmart/stringContants";
import LoadingOverlay from "core/Utils/Loader/loader";
import globalStyles from "core/Styles/globalStyles";
import {
  isWholesalePlan,
  filterView,
  isChannelMultiple,
  getDefaultChannelValue,
  channelContainsTotal,
  isDropPlan,
  getFilteredFooter,
  getOptimiseL3Payload,
  attributeFormatter,
  getPlanPayload,
} from "modules/assortsmart/utils-assortsmart/utilityFunctions";
import {
  updateClusterOptData,
  updateL3OptData,
  deleteL3,
  set2_1_Loader,
  getL3OptData,
  setL3OptData,
  setL2OptData,
  updateBudgetL2Data,
} from "../../../services-assortsmart/Plan/Plan-Initial/plan-initial-service";
import Form from "core/Utils/form";
import {
  SUB_CHANNEL_FORM,
  CHANNEL_FORM,
} from "modules/assortsmart/constants-assortsmart/stringContants";
import {
  getClusterUpdateData,
  getSubRowTotal,
} from "./budget-cluster-functions";
import {
  fetchL3Details,
  getTotalFooterRow,
} from "./budget-level-three-functions";
import { getUpdateBudgetPayload } from "./budget-level-two-functions";
import { bindActionCreators } from "redux";
import * as planInitialServiceActions from "modules/assortsmart/services-assortsmart/Plan/Plan-Initial/plan-initial-service";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import * as commonAssortServiceActions from "modules/assortsmart/services-assortsmart/common-assort-service";
import { getPayloadForL3 } from "./plan-initial-functions";
import LevelTwoBudgetScaleUpDown from "./level-two-budget-scale-up-down";
import ReviewTarget from "./review-target-table-component";
import BudgetCarryoverSelectionComponent from "./budget-carryover-selection-component";
import DropFlowConfiguration from "./drop-flow-configuration";
import ReviewAcrossDropsTable from "./review-across-drops-component";
import { Delete, Save } from "@mui/icons-material";

const BudgetCompoenent = (props) => {
  const [showCreateLevelThree, setShowCreateLevelThree] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState([]);
  const [showLevel3, setShowLevel3] = useState(false);
  const [level2RTinstance, setLevel2RTinstance] = useState(null);
  const [level2TableData, setLevel2TableData] = useState([]);
  const [level3RTinstance, setLevel3RTinstance] = useState(null);
  const [level3TableData, setLevel3TableData] = useState([]);
  const [dynamicL2TableData, setDynamicL2TableData] = useState([]);
  const [level3View, setLevel3View] = useState("table");
  const [clusterRTinstance, setClusterRTinstance] = useState(null);
  const [clusterTableData, setClusterTableData] = useState([]);
  const [showClusterLevel, setShowClusterLevel] = useState(false);
  const [clusterLevelView, setClusterLevelView] = useState("table");
  const [uniqueClusterList, setUniqueClusterList] = useState([]);
  const [optimisePayload, setOptimisePayload] = useState({});
  const [showLoader, setShowLoader] = useState(false);
  const [togglePen, setTogglePen] = useState("total");
  const [selectedSubChannel, setSelectedSubChannel] = useState({});
  const [subChannelOptions, setSubChannelOptions] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState({});
  const [channelOptions, setChannelOptions] = useState([]);
  const [budgetClusterTableData, setBudgetClusterTableData] = useState([]);
  const [selectedDropData, setSelectedDropData] = useState(null);
  const [subChannelFormFields, setSubChannelFormFields] = useState([]);
  const [formData, setFormData] = useState({});
  const [initialValue, setInitialValue] = useState(false);
  const [isL3DataChanged, setIsL3DataChanged] = useState(false);
  const [monthMappingList, setMonthMappingList] = useState({});
  const [monthArray, setMonthArray] = useState([]);
  const l3AGInstance = useRef({});
  const dynamicL2AGInstance = useRef({});
  const [showLevel2, setShowLevel2] = useState(false);
  const [isLevel2Required, setIsLevel2Required] = useState(false);
  const [level2View, setLevel2View] = useState("table");
  const [dynamicL2RTinstance, setDynamicL2RTinstance] = useState(null);
  const [levelTwoSelected, setLevelTwoSelected] = useState({});
  const [levelTwoOptions, setLevelTwoOptions] = useState([]);
  const [levelOneSelected, setLevelOneSelected] = useState({});
  const [levelOneOptions, setLevelOneOptions] = useState([]);
  const [carryoverOptData, setCarryoverOptData] = useState([]);
  const [showDropFlowConfiguration, setShowDropFlowConfiguration] = useState(
    false
  );
  const [levelThreeOptions, setLevelThreeOptions] = useState([]);
  const [showReviewAcrossDropsTable, setShowReviewAcrossDropsTable] = useState(
    false
  );
  const [callCarryOverData, setCallCarryOverData] = useState(false);
  const [totalL2Footer, setL2Footer] = useState([]);
  const [totalL3Footer, setL3Footer] = useState([]);
  const [filteredL3Footer, setFilteredL3Footer] = useState([]);
  const [filteredL2Footer, setFilteredL2Footer] = useState([]);
  const [commonLevelCol, setCommonLevelCol] = useState([]);
  const [isPenValueChanged, setIspenValueChanged] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteRow, setDeleteRow] = useState([]);
  const [optimizationLevel, setOptimizationLevel] = useState("");
  const [filteredClusterFooter, setFilteredClusterFooter] = useState([]);
  const [callUpdateLevelTable, setCallUpdateLevelTable] = useState(false);
  const [callUpdateClusterTable, setCallUpdateClusterTable] = useState(false);
  const [isClusterChanged, setIsClusterChanged] = useState(false);
  const [filterChanged, setFilterChanged] = useState(false);
  const [percentageView, setPercentageView] = useState(false);

  const history = useHistory();
  const isView = history.location.pathname.includes("view");
  const ClusterAGInstance = useRef({});
  const classes = useStyles();
  const globalClasses = globalStyles();
  let optimizationLevels =
    props.screenConfiguration["2.1"]?.budget_optimization_level;
  let showCreateNew = props.screenConfiguration["2.1"]?.show_create_new;
  let planSubstep =
    props.planDetails?.data?.plan_step === 2.1
      ? props.planDetails?.data?.plan_sub_step
        ? props.planDetails?.data?.plan_sub_step
        : optimizationLevels.includes("carryover")
        ? "review_target"
        : "l2_budget_table"
      : isDropPlan(
          props.planDetails?.data,
          `${props.screenConfiguration?.common?.drop_key || "drops"}_count`
        )
      ? "review_drop"
      : "optimization_table_cluster";
  const callLevel3Or2Columns = async () => {
    let cols = await getColumnsAg(
      "table_name=plan_l3_opt",
      props.columnHeaderJson,
      null,
      null,
      history.location.pathname.includes("view")
    )();
    setCommonLevelCol(cols);
  };

  useEffect(() => {
    if (props.planDetails.status) {
      const planDetailsData = props.planDetails?.data;
      let optimisePayload = getOptimiseL3Payload(planDetailsData);
      setOptimisePayload(optimisePayload);
    }
  }, [props.planDetails]);

  useEffect(() => {
    if (
      planSubstep === "optimization_table_l2_name" ||
      planSubstep === "optimization_table_l3_name" ||
      planSubstep === "optimization_table_cluster" ||
      planSubstep === "review_drop"
    ) {
      setShowLevel3(true);
      if (optimizationLevels.includes("l1_name")) {
        setShowLevel2(true);
      }
    }

    if (!props.initialLoadBudgetComponent || props.fromDashboardScreen_2_1) {
      setShowClusterLevel(true);
      setShowLevel3(true);
      if (optimizationLevels.includes("l1_name")) {
        setShowLevel2(true);
        setIsLevel2Required(true);
      }
      setShowLoader(true);
    } else {
      if (props.initialLoadBudgetComponent) {
        props.setInitialLoadBudgetComponent(false);
      }
      if (optimizationLevels.includes("l1_name")) {
        setShowLevel2(false);
        setIsLevel2Required(true);
      }
    }
    props.setDisableNext(true);
    props.setShowReceiptDrawer(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if ((showLevel2 || showLevel3) && !commonLevelCol?.length) {
      callLevel3Or2Columns();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showLevel2, showLevel3]);

  useEffect(() => {
    if (
      (props.budgetL2Data?.data ||
        props.screenConfiguration["2.1"]?.hide_carry_over ||
        (optimizationLevels.includes("carryover") && carryoverOptData?.data)) &&
      (props.l3OptData?.data ||
        (optimizationLevels.includes("l1_name") && props.l2OptData?.data)) &&
      props.clusterOptGraphData?.data &&
      props.clusterOptData
    ) {
      setShowLoader(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    props.budgetL2Data,
    props.l3OptData,
    props.l2OptData,
    props.clusterOptGraphData,
    props.clusterOptData,
  ]);

  useEffect(() => {
    setIspenValueChanged(false);
  }, [props.l3OptData]);

  useEffect(() => {
    //Populate dynamic level2 table data
    setIsL3DataChanged(false);
    if (props.l2OptData?.data?.data?.length) {
      setDynamicL2TableData([]);
      let subChannels = uniqBy(props.l2OptData?.data?.data, "sub_channel");
      let subChannelOpt = subChannels?.map((item) => {
        return {
          label: item.sub_channel,
          value: item.sub_channel,
          id: item.sub_channel,
        };
      });
      let l2Values = uniqBy(props.l2OptData?.data?.data, "l2_name");
      let l2ValuesOpt = l2Values?.map((item) => {
        return {
          label: item.l2_name,
          value: item.l2_name,
          id: item.l2_name,
        };
      });
      setLevelTwoOptions(l2ValuesOpt);
      setLevelTwoSelected(l2ValuesOpt[0]);
      setSelectedSubChannel(subChannelOpt[0]);
      setSubChannelOptions(subChannelOpt);
      let tableData = [];
      if (optimizationLevels.includes("carryover")) {
        tableData = cloneDeep(props.l2OptData.data?.data).map((item) => {
          if (!(formData.channel_list?.length > 1)) {
            item.penetration_ty =
              Math.round(item.penetration_ty * (isView ? 100 : 10000)) / 100;
          }
          item[props.screenConfiguration?.common?.drop_key || "drop"] = item[
            props.screenConfiguration?.common?.drop_key || "drop"
          ]
            ? item[props.screenConfiguration?.common?.drop_key || "drop"]
            : "_";
          item.receipts_quantity_op = item.receipts_quantity_op
            ? item.receipts_quantity_op
            : 0;
          item.hierarchy = [item.l1_name + item.l2_name];
          if (item.carryover_flag !== "Total") {
            //plotings the subRows
            item.hierarchy.push(item.carryover_flag);
            item.parent_col = "carryover_flag";
          }
          item.uniqueId =
            item.l1_name +
            item.l2_name +
            item.l3_name +
            item[props.screenConfiguration?.common?.drop_key || "drop"] +
            item.channel +
            item.sub_channel +
            item.carryover_flag;
          return item;
        });
      } else {
        tableData = cloneDeep(props.l2OptData.data?.data).map((item) => {
          if (!(formData.channel_list?.length > 1)) {
            item.penetration_ty =
              Math.round(item.penetration_ty * (isView ? 100 : 10000)) / 100;
          }
          item[props.screenConfiguration?.common?.drop_key || "drop"] = item[
            props.screenConfiguration?.common?.drop_key || "drop"
          ]
            ? item[props.screenConfiguration?.common?.drop_key || "drop"]
            : "_";
          item.receipts_quantity_op = item.receipts_quantity_op
            ? item.receipts_quantity_op
            : 0;
          item.uniqueId =
            item.l1_name +
            item.l2_name +
            item.l3_name +
            item[props.screenConfiguration?.common?.drop_key || "drop"] +
            item.channel +
            item.sub_channel;

          return item;
        });
      }
      //Populate channel filter dropdown options in case of wholesale plan or plan having multiple channels
      let formFields = [];
      let formValue = formData;
      if (isWholesalePlan(props.planDetails?.data)) {
        let sub_channel = groupBy(tableData, "sub_channel");
        let subchannelOpt = Object.keys(sub_channel).map((data) => {
          return {
            label: data,
            value: data,
            id: data,
          };
        });
        formValue.sub_channel_list = subchannelOpt?.[0]?.label;
        let subChannelFields = SUB_CHANNEL_FORM;
        subChannelFields.options = subchannelOpt;
        formFields.push(subChannelFields);
      }
      if (
        isChannelMultiple(props.planDetails?.data) &&
        !(formData?.channel_list?.length > 0)
      ) {
        let channelOpt = props.planDetails.data.channel.map((channelData) => {
          return {
            label: channelData,
            value: channelData,
            id: channelData,
          };
        });
        let defaultChannel = getDefaultChannelValue(
          channelOpt,
          props.planDetails?.data
        );
        formValue.channel_list = [defaultChannel?.label];
        let channelFields = CHANNEL_FORM;
        channelFields.options = channelOpt;
        channelFields.isMulti = true;
        formFields.push(channelFields);
      }

      setFormData(formValue);
      if (!isEmpty(formFields)) {
        setSubChannelFormFields(formFields);
      }
      setDynamicL2TableData(tableData);
    } else {
      let formValue = formData;
      let formFields = subChannelFormFields;
      if (
        isChannelMultiple(props.planDetails?.data) &&
        !(formData?.channel_list?.length > 0)
      ) {
        let channelOpt = props.planDetails.data.channel.map((channelData) => {
          return {
            label: channelData,
            value: channelData,
            id: channelData,
          };
        });
        let defaultChannel = getDefaultChannelValue(
          channelOpt,
          props.planDetails?.data
        );
        formValue.channel_list = [defaultChannel?.label];
        let channelFields = CHANNEL_FORM;
        channelFields.options = channelOpt;
        channelFields.isMulti = true;
        formFields.push(channelFields);
      }

      setFormData(formValue);
      if (!isEmpty(formFields)) {
        setSubChannelFormFields(formFields);
      }
      setDynamicL2TableData([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.l2OptData]);

  useEffect(() => {
    if (props.reviewTargetData?.length) {
      let formValue = formData;
      let isLevelOneDropdownRequired =
        props.planDetails?.data?.l1_name?.length > 1 ? true : false;
      let l1Values = uniqBy(props.reviewTargetData, "l1_name");
      let l1ValuesOpt = l1Values?.map((item) => {
        return {
          label: item.l1_name,
          value: item.l1_name,
          id: item.l1_name,
        };
      });
      if (!levelOneSelected?.value && isLevelOneDropdownRequired) {
        formValue.l1_name = l1ValuesOpt[0]?.label;
        setLevelOneSelected(l1ValuesOpt[0]);
      }
      setLevelOneOptions(l1ValuesOpt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.reviewTargetData]);

  useEffect(() => {
    setL2Footer([]);
    setFilteredL2Footer([]);
    if (dynamicL2TableData?.length > 0) {
      let isLevelOneDropdownRequired =
        props.planDetails?.data?.l1_name?.length > 1;
      let l2Footer = getTotalFooterRow(
        dynamicL2TableData,
        props,
        isLevelOneDropdownRequired
      );
      setL2Footer(l2Footer);
      setFilteredL2Footer(l2Footer);
    } else {
      setL2Footer([]);
      setFilteredL2Footer([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dynamicL2TableData]);

  useEffect(() => {
    setL3Footer([]);
    setFilteredL3Footer([]);
    if (level3TableData?.length > 0) {
      let isLevelOneDropdownRequired =
        props.planDetails?.data?.l1_name?.length > 1 ? true : false;
      let isLevelTwoDropdownRequired =
        props.planDetails?.data?.l2_name?.length > 1 ? true : false;
      let l3Footer = getTotalFooterRow(
        level3TableData,
        props,
        isLevelOneDropdownRequired,
        isLevelTwoDropdownRequired
      );
      setL3Footer(l3Footer);
      let formValue = cloneDeep(formData);
      setFilteredL3Footer(getFilteredFooter(l3Footer, formValue));
    } else {
      setL3Footer([]);
      setFilteredL3Footer([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level3TableData]);

  useEffect(() => {
    setIsL3DataChanged(false);
    const L3TableData = props.l3OptData?.data;
    const L2TableData = props.l2OptData?.data;
    if (
      L3TableData?.data?.length &&
      (!isLevel2Required || (isLevel2Required && L2TableData?.data?.length))
    ) {
      setLevel3TableData([]);
      let formValue = formData;

      let subChannels = props.isLevel2Required
        ? uniqBy(L2TableData?.data, "sub_channel")
        : uniqBy(L3TableData?.data, "sub_channel");
      let subChannelOpt = subChannels?.map((item) => {
        return {
          label: item.sub_channel,
          value: item.sub_channel,
          id: item.sub_channel,
        };
      });
      setSelectedSubChannel(subChannelOpt[0]);
      setSubChannelOptions(subChannelOpt);
      const l3Values = uniqBy(L3TableData?.data, "l3_name");
      const l3ValuesOpt = l3Values?.map((item) => {
        return {
          label: item.l3_name,
          value: item.l3_name,
          id: item.l3_name,
        };
      });
      setLevelThreeOptions(l3ValuesOpt);
      let tableData = [];
      if (
        props.screenConfiguration?.common?.endpoint_project_name ===
        "assort-smart"
      ) {
        //checking if we are ging with the new flow mapping is different for both
        tableData = cloneDeep(L3TableData?.data).map((item) => {
          if (!(formData.channel_list?.length > 1)) {
            item.penetration_ty =
              Math.round(item.penetration_ty * (isView ? 100 : 10000)) / 100;
          }
          item[props.screenConfiguration?.common?.drop_key || "drop"] = item[
            props.screenConfiguration?.common?.drop_key || "drop"
          ]
            ? item[props.screenConfiguration?.common?.drop_key || "drop"]
            : "_";
          item.receipts_quantity_op = item.receipts_quantity_op
            ? item.receipts_quantity_op
            : 0;
          item.hierarchy = [item.l1_name + item.l2_name + item.l3_name];
          if (item.carryover_flag !== "Total") {
            //plotings the subRows
            item.hierarchy.push(item.carryover_flag);
            item.parent_col = "carryover_flag";
          }
          item["original_l3_name"] = item.l3_name;
          item["l3_name"] = item.new_l3_flag
            ? `${item["l3_name"]}  **`
            : item.l3_name;
          item.uniqueId =
            item.l3_name +
            item[props.screenConfiguration?.common?.drop_key || "drop"] +
            item.sub_channel +
            item.l2_name +
            item.l1_name +
            item.carryover_flag;
          return item;
        });
      } else {
        tableData = cloneDeep(L3TableData?.data).map((item) => {
          if (!(formData.channel_list?.length > 1)) {
            item.penetration_ty =
              Math.round(item.penetration_ty * (isView ? 100 : 10000)) / 100;
          }
          item[props.screenConfiguration?.common?.drop_key || "drop"] = item[
            props.screenConfiguration?.common?.drop_key || "drop"
          ]
            ? item[props.screenConfiguration?.common?.drop_key || "drop"]
            : "_";
          item["original_l3_name"] = item.l3_name;
          item["l3_name"] = item.new_l3_flag
            ? `${item["l3_name"]}  **`
            : item.l3_name;
          item.receipts_quantity_op = item.receipts_quantity_op
            ? item.receipts_quantity_op
            : 0;
          item.uniqueId =
            item.l3_name +
            item[props.screenConfiguration?.common?.drop_key || "drop"] +
            item.sub_channel +
            item.l2_name +
            item.l1_name;
          return item;
        });
      }
      //Populate channel filter dropdown options in case of wholesale plan or plan having multiple channels
      let formFields = [];
      if (isWholesalePlan(props.planDetails?.data)) {
        let sub_channel = groupBy(tableData, "sub_channel");
        let subchannelOpt = Object.keys(sub_channel).map((data) => {
          return {
            label: data,
            value: data,
            id: data,
          };
        });
        formValue.sub_channel_list = subchannelOpt?.[0]?.label;
        let subChannelFeilds = SUB_CHANNEL_FORM;
        subChannelFeilds.options = subchannelOpt;
        formFields.push(subChannelFeilds);
      }
      if (
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
        let defaultChannel = getDefaultChannelValue(
          channelOpt,
          props.planDetails?.data
        );
        formValue.channel_list = [defaultChannel?.label];
        let channelFeilds = CHANNEL_FORM;
        channelFeilds.options = channelOpt;
        channelFeilds.isMulti = true;
        formFields.push(channelFeilds);
      }
      setFormData(formValue);
      if (!isEmpty(formFields)) {
        setSubChannelFormFields(formFields);
      }
      setLevel3TableData(tableData);
    } else if (L3TableData?.status) {
      setLevel3TableData([]);
    } else {
      setLevel3TableData([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.l3OptData, props.l2OptData]);

  useEffect(() => {
    if (isChannelMultiple(props.planDetails?.data) && props.planDetails?.data) {
      let channelOpt = props.planDetails?.data?.channel?.map((item) => {
        return {
          label: item,
          value: item,
          id: item,
        };
      });

      setSelectedChannel(
        getDefaultChannelValue(channelOpt, props.planDetails?.data)
      );
      setChannelOptions(channelOpt);
    }
    if (props.planDetails?.data?.l1_name?.length > 1) {
      let l1Values = props.planDetails?.data?.l1_name?.map((item) => {
        return {
          label: item,
          value: item,
          id: item,
        };
      });
      setLevelOneOptions(l1Values);
      setLevelOneSelected(l1Values[0]);
    }
    if (
      (!props.initialLoadBudgetComponent ||
        props.fromDashboardScreen_2_1 ||
        props.planDetails?.data?.plan_sub_step === "review_drop") &&
      isDropPlan(
        props.planDetails?.data,
        `${props.screenConfiguration?.common?.drop_key || "drops"}_count`
      ) &&
      optimizationLevels.includes("carryover")
    ) {
      setShowReviewAcrossDropsTable(true);
    }
    if (
      props?.planDetails?.data?.plan_sub_step === "optimization_table_l2_name"
    ) {
      setShowLevel2(true);
    } else if (
      props?.planDetails?.data?.plan_sub_step === "optimization_table_l3_name"
    ) {
      setShowLevel2(true);
      setShowLevel3(true);
    } else if (
      props?.planDetails?.data?.plan_sub_step === "optimization_table_cluster"
    ) {
      setShowLevel2(true);
      setShowLevel3(true);
      setShowClusterLevel(true);
    } else if (props?.planDetails?.data?.plan_sub_step === "review_drop") {
      setShowLevel2(true);
      setShowLevel3(true);
      setShowClusterLevel(true);
      setShowReviewAcrossDropsTable(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.planDetails]);

  const handleClusterNext = () => {
    let temp = getClusterUpdateData(
      props,
      ClusterAGInstance,
      uniqueClusterList
    );
    props.sendClusterTableData({
      cluster_plan_data: [].concat.apply([], temp),
      is_value_changed: isClusterChanged,
    });
  };
  const getSelectedRowIds = (rowId) => {
    let items = selectedRowIds;
    if (selectedRowIds.length === 0) {
      items = [];
      //when no rows selected setting rowId directly to state
      items.push(rowId);
      setSelectedRowIds(items);
    } else {
      const index = items.indexOf(rowId);
      //getting the index of rowId
      if (index > -1) {
        //if rowId is already there we are removing that rowId from the List
        items.splice(index, 1);
      } else {
        //if rowId is not there we are pushing the rowId to the list
        items.push(rowId);
      }
      setSelectedRowIds(items);
    }
  };

  const clearSelectedRows = () => {
    setSelectedRowIds([]);
  };

  const hideClusterTable = () => {
    setShowClusterLevel(false);
    setShowReviewAcrossDropsTable(false);
  };

  const handleViewSwitch = (view) => {
    let viewState =
      view === "level2View"
        ? level2View
        : view === "level3View"
        ? level3View
        : clusterLevelView;
    return (
      <Grid Item>
        <Button
          variant={viewState === "table" ? "contained" : "outlined"}
          color="primary"
          id={`${view}-table`}
          onClick={() => {
            if (view === "level3View") {
              if (level3View !== "table") {
                setLevel3RTinstance(null);
              }
              setLevel3View("table");
            } else if (view === "level2View") {
              if (level2View !== "table") {
                setDynamicL2RTinstance(null);
              }
              setLevel2View("table");
            } else {
              if (clusterLevelView !== "table") {
                setClusterRTinstance(null);
              }
              setClusterLevelView("table");
            }
          }}
          title={Plan.__Table_View}
        >
          <TableChartIcon />
        </Button>

        <Button
          variant={viewState === "chart" ? "contained" : "outlined"}
          color="primary"
          id={`${view}-chart`}
          onClick={() => {
            if (view === "level3View") {
              setLevel3View("chart");
            } else if (view === "level2View") {
              setLevel2View("chart");
            } else {
              setClusterLevelView("chart");
            }
          }}
          title={Plan.__Chart_View}
        >
          <BarChartIcon />
        </Button>
      </Grid>
    );
  };

  const handleToggleChange = (e) => {
    if (e.target.checked) {
      setTogglePen("cluster");
    } else {
      setTogglePen("total");
    }
  };

  const handleChangeSubChannelFilter = (
    updatedFormData,
    id,
    field,
    e,
    initialValue
  ) => {
    if (id === "channel_list") {
      setInitialValue(initialValue);
    }
    setFormData(updatedFormData);
    level3RTinstance.current.api.onFilterChanged();
    setFilteredL3Footer(getFilteredFooter(totalL3Footer, updatedFormData));
  };

  const handleL1ValueChange = (option) => {
    setOptimizationLevel("l3_name");
    setLevelOneSelected(option);
    setFilterChanged(true);
  };

  const handleL2ValueChange = (option) => {
    setOptimizationLevel("l3_name");
    setLevelTwoSelected(option);
    setFilterChanged(true);
  };

  const handleChannelValueChange = (option) => {
    setSelectedChannel(option);
    setFilterChanged(true);
  };

  const handleSubChannelValueChange = (option) => {
    setSelectedSubChannel(option);
    setFilterChanged(true);
  };
  const updateL3Data = async (level, is_update_plan_step) => {
    let l3RowData = [];
    // Removing footer row
    if (isLevel2Required && level === "l2_name") {
      dynamicL2AGInstance.current.api.forEachNode((row) => {
        if (row.data.l3_name !== "Total") {
          l3RowData.push(row.data);
        }
      });
    } else {
      l3AGInstance.current.api.forEachNode((row) => {
        let rowData = cloneDeep(row.data);
        rowData["l3_name"] = rowData?.["l3_name"]?.split("  **")?.[0];
        if (row.data?.l3_name !== "Total") {
          l3RowData.push(rowData);
        }
      });
    }
    let l3Instance = {
      data: l3RowData,
    };
    let plan_sub_step = "optimization_table_cluster";
    if (level === "l2_name") {
      let index = optimizationLevels.findIndex((level) => level === "l2_name");
      plan_sub_step =
        `optimization_table_${optimizationLevels.slice(index + 1)?.[0]}` ||
        "optimization_table_cluster";
    }
    let updateL3Response = await props.updateL3OptData(
      {
        ...getPayloadForL3(
          l3Instance,
          props.levelsJson,
          false,
          level === "l2_name"
            ? props.l2OptData?.data?.data
            : props.l3OptData?.data?.data,
          props.screenConfiguration
        ),
        is_update_plan_step: is_update_plan_step || false,
        plan_sub_step: plan_sub_step,
        is_value_changed: isL3DataChanged,
        optimization_level:
          level === "l2_name" ? "l2_optimization" : "l3_optimization",
        is_cluster_pen_ty: level === "l2_name" ? false : isPenValueChanged,
        plan_code: props.planDetails?.data?.plan_code,
      },
      props.screenConfiguration?.common?.endpoint_project_name || "assort"
    );
    if (updateL3Response?.data?.status) {
      return true;
    } else {
      props.set2_1_Loader(false);
      return false;
    }
  };

  const onDropFlowConfiguration = () => {
    setShowDropFlowConfiguration(true);
  };

  const closeDropFlowConfiguration = () => {
    setShowDropFlowConfiguration(false);
  };

  useEffect(() => {
    if (selectedDropData) {
      setSelectedRowIds([]);
      let updateformData = formData;
      updateformData.drop = selectedDropData;
      setFilteredL3Footer(getFilteredFooter(totalL3Footer, formData));
      let l2FormData = {
        [props.screenConfiguration?.common?.drop_key ||
        "drop"]: selectedDropData,
      };
      if (formData.l1_name) {
        l2FormData.l1_name = formData.l1_name;
      }
      setFilteredL2Footer(getFilteredFooter(totalL2Footer, l2FormData));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDropData]);

  let dropOrLaunch = attributeFormatter(
    props.screenConfiguration?.common?.drop_key || "drop"
  );
  const onDeleteClick = async (currentTableLevel) => {
    props.set2_1_Loader(true);
      let data = [];
      let originalRow = {};
      deleteRow.map((node) => {
        originalRow = node;
        data.push(node[currentTableLevel === "l3_name" ? "original_l3_name" : currentTableLevel]);
      });
      let planData = cloneDeep(originalRow);
      planData[currentTableLevel] = data;
      let payload = getPlanPayload(planData, props.planLevels);
      if (currentTableLevel === "l3_name") {
        payload.filters.push({
          attribute_name: "l3_name",
          prefix: "levels",
          operator: "in",
          value: data,
        });
      }
      payload.filters.push({
        attribute_name: "channel",
        prefix: "levels",
        operator: "in",
        value: Array.isArray(planData.channel)
          ? planData.channel
          : [planData.channel],
      });
      // converting "Drop 1 " to "drop_1"
      if (isDropPlan(props.planDetails?.data)) {
        let dropData = planData?.drop.replace(" ", "_").toLowerCase();
        planData.drop = dropData;
        payload.filters.push({
          attribute_name: "drop",
          prefix: "levels",
          operator: "in",
          value: Array.isArray(planData.drop) ? planData.drop : [planData.drop],
        });
      }
      setIsL3DataChanged(false);
      let deleteResponse = await props.deleteL3(
        payload,
        props.screenConfiguration?.common?.endpoint_project_name || "assort"
      );
      if (deleteResponse?.data?.status) {
        fetchL3Details(
          props.planDetails?.data?.plan_code,
          { ...props, currentTableLevel, levelTwoSelected },
          false
        );
        props.addSnack({
          message: "Deleted Successfully",
          options: {
            variant: "success",
          },
        });
        setShowDeleteDialog(false);
      } else {
        props.set2_1_Loader(false);
      }
  };

  const updateLevelTable = () => {
    setCallUpdateLevelTable(true);
  };

  const updateLevelThreeTable = async (currentTableLevel) => {
    props.set2_1_Loader(true);
    let isUpdateSuccess = await updateL3Data(currentTableLevel, false);
    props.set2_1_Loader(false);
    if (isUpdateSuccess) {
      let planCode = props.planDetails?.data?.plan_code;
      fetchL3Details(
        planCode,
        { ...props, currentTableLevel },
        false,
        formData
      );
    }
  };

  const updateClusterTable = async () => {
    setCallUpdateClusterTable(true);
  };

  return (
    <>
      <LoadingOverlay loader={props.isLoading || showLoader} spinner>
        {optimizationLevels.includes("carryover") &&
        (planSubstep === "review_target" ||
          planSubstep === "optimization_table_l2_name" ||
          planSubstep === "optimization_table_l3_name" ||
          planSubstep === "optimization_table_cluster" ||
          planSubstep === "review_drop") ? (
          <Card className={globalClasses.paper}>
            <div className={classes.heading}>
              <Typography variant="h3">Review Targets</Typography>
              {channelOptions?.length > 1 &&
                filterView(
                  "Channel",
                  "channel",
                  channelOptions,
                  setSelectedChannel,
                  selectedChannel,
                  classes.formContainer,
                  classes.inputLabel
                )}
            </div>
            <ReviewTarget
              setCallCarryOverData={setCallCarryOverData}
              selectedChannel={selectedChannel}
              optimizationLevels={optimizationLevels}
              setShowLevel3={setShowLevel3}
              setShowLevel2={setShowLevel2}
              setShowClusterLevel={setShowClusterLevel}
              setInitialLoadDepthChoice={props.setInitialLoadDepthChoice}
              setInitialLoadWedge={props.setInitialLoadWedge}
              setInitialLoadFinalize={props.setInitialLoadFinalize}
              setFromDashboardScreen_2_2={props.setFromDashboardScreen_2_2}
              setFromDashboardScreen_2_3={props.setFromDashboardScreen_2_3}
              setFromDashboardScreen_2_4={props.setFromDashboardScreen_2_4}
              setShowReviewAcrossDropsTable={setShowReviewAcrossDropsTable}
            />
          </Card>
        ) : (
          (planSubstep === "l2_budget_table" ||
            planSubstep === "optimization_table_l2_name" ||
            planSubstep === "optimization_table_l3_name" ||
            planSubstep === "optimization_table_cluster" ||
            planSubstep === "review_drop") && (
            <Card className={globalClasses.paper}>
              <div className={classes.heading}>
                <Typography variant="h3">
                  {`${Plan.__Budget_Allocation
                    .concat(props.levelsJson?.[optimizationLevels?.[0]] || "")
                    .concat(common.__Multiple_Value)}`}
                </Typography>
                <div className={classes.rightEnd}>
                  <div className={classes.dFlex}>
                    <Switch
                      checked={percentageView ? true : false}
                      onChange={(e) => {
                        setPercentageView(!percentageView);
                      }}
                      disabled={level2TableData?.length ? false : true}
                      id="switch-size-percenatge-view"
                      leftLabel="Units"
                      rightLabel="Percentage"
                    />
                  </div>
                  {channelContainsTotal(props.planDetails?.data) &&
                    !history.location.pathname.includes("view") && (
                      <div className={`${classes.scaleBtn}`}>
                        <LevelTwoBudgetScaleUpDown
                          RTinstance={level2RTinstance}
                          monthMappingList={monthMappingList}
                          monthArray={monthArray}
                          setTableData={setLevel2TableData}
                        />
                      </div>
                    )}
                  {!history.location.pathname.includes("view") && (
                    <Button
                      variant="outlined"
                      color="primary"
                      id="save-l1"
                      onClick={() => updateLevelTable()}
                    >
                      <Save />
                    </Button>
                  )}
                </div>
              </div>

              <BudgetLevelComponent
                level2TableData={level2TableData}
                setLevel2TableData={setLevel2TableData}
                setShowLevel3={setShowLevel3}
                setShowClusterLevel={setShowClusterLevel}
                setDisableNext={props.setDisableNext}
                RTinstance={level2RTinstance}
                setRTinstance={setLevel2RTinstance}
                setOptimisePayload={setOptimisePayload}
                optimisePayload={optimisePayload}
                showLevel3={showLevel3}
                showLevel2={showLevel2}
                monthMappingList={monthMappingList}
                setMonthMappingList={setMonthMappingList}
                monthArray={monthArray}
                setMonthArray={setMonthArray}
                setShowLevel2={setShowLevel2}
                isLevel2Required={isLevel2Required}
                optimizationLevels={optimizationLevels}
                setShowReviewAcrossDropsTable={setShowReviewAcrossDropsTable}
                setInitialLoadDepthChoice={props.setInitialLoadDepthChoice}
                setInitialLoadWedge={props.setInitialLoadWedge}
                setInitialLoadFinalize={props.setInitialLoadFinalize}
                setFromDashboardScreen_2_2={props.setFromDashboardScreen_2_2}
                setFromDashboardScreen_2_3={props.setFromDashboardScreen_2_3}
                setFromDashboardScreen_2_4={props.setFromDashboardScreen_2_4}
                setCallUpdateLevelTable={setCallUpdateLevelTable}
                callUpdateLevelTable={callUpdateLevelTable}
                formData={formData}
                percentageView={percentageView}
              />
            </Card>
          )
        )}
        {optimizationLevels.slice(1)?.map((level) => {
          if (
            level === "carryover" &&
            !props.screenConfiguration["2.1"]?.hide_carry_over
          ) {
            return (
              <Card className={globalClasses.paper} id="budget-carryover-table">
                <div className={classes.heading}>
                  <Typography variant="h3">Carryover Selection</Typography>
                </div>
                <BudgetCarryoverSelectionComponent
                  setCarryoverOptData={setCarryoverOptData}
                  setShowLevel3={setShowLevel3}
                  setShowLoader={setShowLoader}
                  showLoader={showLoader}
                  callCarryOverData={callCarryOverData}
                  initialLoadBudgetComponent={props.initialLoadBudgetComponent}
                  getFilteredFooter={getFilteredFooter}
                  setShowLevel2={setShowLevel2}
                  setInitialLoadDepthChoice={props.setInitialLoadDepthChoice}
                  setInitialLoadWedge={props.setInitialLoadWedge}
                  setInitialLoadFinalize={props.setInitialLoadFinalize}
                  setFromDashboardScreen_2_2={props.setFromDashboardScreen_2_2}
                  setFromDashboardScreen_2_3={props.setFromDashboardScreen_2_3}
                  setFromDashboardScreen_2_4={props.setFromDashboardScreen_2_4}
                  planSubstep={planSubstep}
                />
              </Card>
            );
          } else {
            return (
              ((level === "l2_name" && showLevel2) ||
                (level === "l3_name" && showLevel3)) && (
                <Card
                  className={globalClasses.paper}
                  id={
                    level === "l2_name"
                      ? "budget-level-two-table"
                      : "budget-level-three-table"
                  }
                >
                  <div className={classes.heading}>
                    <Typography variant="h3">
                      {level === "l2_name"
                        ? (props?.columnHeaderJson?.l2_name || "").concat(
                            Plan.__Level3_Plan
                          )
                        : (props?.columnHeaderJson?.l3_name || "").concat(
                            Plan.__Level3_Plan
                          )}
                    </Typography>
                    {((level === "l2_name" && level2View === "table") ||
                      (level === "l3_name" && level3View === "table")) &&
                      levelOneOptions.length > 1 &&
                      filterView(
                        props.columnHeaderJson?.l1_name,
                        "l1_name",
                        levelOneOptions,
                        handleL1ValueChange,
                        levelOneSelected,
                        classes.formContainer,
                        classes.inputLabel
                      )}
                    {level === "l3_name" &&
                      level3View === "table" &&
                      levelTwoOptions.length > 0 &&
                      filterView(
                        props.columnHeaderJson?.l2_name,
                        "l2_name",
                        levelTwoOptions,
                        handleL2ValueChange,
                        levelTwoSelected,
                        classes.formContainer,
                        classes.inputLabel
                      )}
                    {((level === "l2_name" && level2View === "table") ||
                      (level === "l3_name" && level3View === "table")) && (
                      //subChannelFormFields &&
                      <div className={classes.formContainer}>
                        <Form
                          layout={"vertical"}
                          maxFieldsInRow={2}
                          handleChange={handleChangeSubChannelFilter}
                          fields={subChannelFormFields}
                          updateDefaultValue={false}
                          defaultValues={formData}
                          handleDropdownClose={true}
                        ></Form>
                      </div>
                    )}
                    <div className={classes.rightEnd}>
                      {((level === "l2_name" && level2View === "table") ||
                        (level === "l3_name" && level3View === "table")) &&
                      deleteRow?.length &&
                      !history.location.pathname.includes("view") ? (
                        <Button
                          variant="outlined"
                          color="primary"
                          id="delete"
                          onClick={() => setShowDeleteDialog(level)}
                          title={"Delete"}
                          className={
                            level === "l3_name" && classes.scaleUpDownBtn
                          }
                        >
                          <Delete />
                        </Button>
                      ) : null}
                      {((level === "l2_name" && level2View === "table") ||
                        (level === "l3_name" && level3View === "table")) &&
                        ((isChannelMultiple(props.planDetails?.data) &&
                          !(formData?.channel_list?.length > 1)) ||
                          !isChannelMultiple(props.planDetails?.data)) &&
                        !history.location.pathname.includes("view") && (
                          <>
                            {level === "l3_name" && (
                              <Button
                                variant="outlined"
                                color="primary"
                                id="create-new-l3"
                                onClick={() => setShowCreateLevelThree(true)}
                                title={Plan.__Create_New}
                              >
                                <AddIcon />
                              </Button>
                            )}
                            {!history.location.pathname.includes("view") && (
                              <BudgetScaleUpDown
                                RTinstance={
                                  level === "l2_name"
                                    ? dynamicL2RTinstance
                                    : level3RTinstance
                                }
                                selectedRowIds={selectedRowIds}
                                setTableData={(data) => {
                                  level === "l2_name"
                                    ? setDynamicL2TableData(data)
                                    : setLevel3TableData(data);
                                }}
                                hideClusterTable={hideClusterTable}
                                getSelectedRowIds={(rowId) =>
                                  getSelectedRowIds(rowId)
                                }
                                setDisableNext={props.setDisableNext}
                                addSnack={props.addSnack}
                                setSelectedRowIds={setSelectedRowIds}
                                getTotalFooterRow={getTotalFooterRow}
                                planDetails={props.planDetails}
                                setIsL3DataChanged={setIsL3DataChanged}
                                level={level}
                                screenConfiguration={props.screenConfiguration}
                                currentTableLevel={level}
                              />
                            )}
                          </>
                        )}
                      {!history.location.pathname.includes("view") && (
                        <Button
                          variant="outlined"
                          color="primary"
                          id={`save-${level}`}
                          onClick={() => updateLevelThreeTable(level)}
                          className={classes.scaleUpDownBtn}
                        >
                          <Save />
                        </Button>
                      )}
                      <div>
                        <Grid Item>
                          {handleViewSwitch(
                            "level" + level.slice(1, 2) + "View"
                          )}
                        </Grid>
                      </div>
                    </div>
                  </div>
                  <BudgetLevelThreeComponent
                    selectedRowIds={selectedRowIds}
                    getSelectedRowIds={(rowId) => getSelectedRowIds(rowId)}
                    clearSelectedRows={clearSelectedRows}
                    budgetL3Instance={
                      level === "l2_name" ? dynamicL2AGInstance : l3AGInstance
                    }
                    RTinstance={level3RTinstance}
                    setRTinstance={
                      level === "l2_name"
                        ? setDynamicL2RTinstance
                        : setLevel3RTinstance
                    }
                    level3TableData={
                      level === "l2_name" ? dynamicL2TableData : level3TableData
                    }
                    setDynamicL2TableData={(data) =>
                      setDynamicL2TableData(data)
                    }
                    setLevel3TableData={(data) => setLevel3TableData(data)}
                    hideClusterTable={hideClusterTable}
                    setShowClusterLevel={setShowClusterLevel}
                    setDisableNext={props.setDisableNext}
                    setOptimisePayload={setOptimisePayload}
                    setSelectedRowIds={setSelectedRowIds}
                    getTotalFooterRow={getTotalFooterRow}
                    setSelectedDropData={setSelectedDropData}
                    selectedDropData={selectedDropData}
                    formData={formData}
                    setFormData={setFormData}
                    updateL3Data={updateL3Data}
                    initialValue={initialValue}
                    setInitialValue={setInitialValue}
                    setIsL3DataChanged={setIsL3DataChanged}
                    level3View={level === "l2_name" ? level2View : level3View}
                    currentTableLevel={level}
                    isLevel2Required={isLevel2Required}
                    setShowLevel3={setShowLevel3}
                    levelOneOptions={levelOneOptions}
                    levelOneSelected={levelOneSelected}
                    levelTwoOptions={levelTwoOptions}
                    levelTwoSelected={levelTwoSelected}
                    setShowReviewAcrossDropsTable={
                      setShowReviewAcrossDropsTable
                    }
                    footerRow={
                      level === "l2_name" ? filteredL2Footer : filteredL3Footer
                    }
                    commonLevelCol={commonLevelCol}
                    setInitialLoadDepthChoice={props.setInitialLoadDepthChoice}
                    setInitialLoadWedge={props.setInitialLoadWedge}
                    setInitialLoadFinalize={props.setInitialLoadFinalize}
                    setFromDashboardScreen_2_2={
                      props.setFromDashboardScreen_2_2
                    }
                    setFromDashboardScreen_2_3={
                      props.setFromDashboardScreen_2_3
                    }
                    setFromDashboardScreen_2_4={
                      props.setFromDashboardScreen_2_4
                    }
                    optimisePayload={optimisePayload}
                    setIspenValueChanged={setIspenValueChanged}
                    showDeleteDialog={showDeleteDialog}
                    setShowDeleteDialog={setShowDeleteDialog}
                    setDeleteRow={setDeleteRow}
                    onDeleteClick={onDeleteClick}
                    setOptimizationLevel={setOptimizationLevel}
                    optimizationLevel={optimizationLevel}
                    showClusterLevel={showClusterLevel}
                    invalidL3Clusters={props.invalidL3Clusters}
                    deleteRow={deleteRow}
                  />
                </Card>
              )
            );
          }
        })}
        {showClusterLevel && (
          <Card className={globalClasses.paper} id="budget-cluster-table">
            <div className={classes.heading}>
              <Typography variant="h3">{Plan.__Cluster_Level_Plan}</Typography>
              {clusterLevelView === "table" &&
                levelOneOptions.length > 1 &&
                filterView(
                  props.columnHeaderJson?.l1_name,
                  "l1_name",
                  levelOneOptions,
                  handleL1ValueChange,
                  levelOneSelected,
                  classes.formContainer,
                  classes.inputLabel
                )}
              {clusterLevelView === "table" &&
                levelTwoOptions.length > 0 &&
                filterView(
                  props.columnHeaderJson?.l2_name,
                  "l2_name",
                  levelTwoOptions,
                  handleL2ValueChange,
                  levelTwoSelected,
                  classes.formContainer,
                  classes.inputLabel
                )}
              {clusterLevelView === "table" &&
                isChannelMultiple(props.planDetails?.data) &&
                filterView(
                  "Channel",
                  "channel",
                  channelOptions,
                  handleChannelValueChange,
                  selectedChannel,
                  classes.formContainer,
                  classes.inputLabel
                )}
              {clusterLevelView === "table" &&
                isWholesalePlan(props.planDetails?.data) &&
                filterView(
                  "Sub Channel",
                  "sub_channel",
                  subChannelOptions,
                  handleSubChannelValueChange,
                  selectedSubChannel,
                  classes.formContainer,
                  classes.inputLabel
                )}
              <div className={classes.rightEnd}>
                {!isWholesalePlan(props.planDetails?.data) &&
                  !history.location.pathname.includes("view") &&
                  clusterLevelView === "table" && (
                    <div
                      className={`${classes.rightEnd} ${globalClasses.layoutAlignCenter}`}
                    >
                      <Switch
                        id="cluster-toggle"
                        checked={togglePen === "total" ? false : true}
                        onChange={(e) => {
                          handleToggleChange(e);
                        }}
                        rightLabel="Edit total pen"
                        leftLabel="Edit cluster pen"
                      />
                    </div>
                  )}
                {clusterLevelView === "table" &&
                  !history.location.pathname.includes("view") && (
                    <div>
                      <ClusterScaleUpDown
                        RTinstance={clusterRTinstance}
                        uniqueClusterList={uniqueClusterList}
                        setTableData={(data) => setClusterTableData(data)}
                        getSubRowTotal={getSubRowTotal}
                        AGInstance={ClusterAGInstance}
                        handleClusterNext={handleClusterNext}
                        addSnack={props.addSnack}
                        screenConfiguration={props.screenConfiguration}
                        setFilteredClusterFooter={setFilteredClusterFooter}
                        filteredClusterFooter={filteredClusterFooter}
                      />
                    </div>
                  )}
                {!history.location.pathname.includes("view") && (
                  <Button
                    variant="outlined"
                    color="primary"
                    id="save-cluster"
                    className={classes.scaleUpDownBtn}
                    onClick={() => updateClusterTable()}
                  >
                    <Save />
                  </Button>
                )}
                {<Grid Item>{handleViewSwitch("clusterLevelView")}</Grid>}
              </div>
            </div>
            <BudgetClusterComponent
              RTinstance={clusterRTinstance}
              setRTinstance={setClusterRTinstance}
              clusterTableData={clusterTableData}
              setClusterTableData={(data) => setClusterTableData(data)}
              getSubRowTotal={getSubRowTotal}
              uniqueClusterList={uniqueClusterList}
              setUniqueClusterList={setUniqueClusterList}
              setDisableNext={props.setDisableNext}
              handleClusterNext={handleClusterNext}
              clusterLevelView={clusterLevelView}
              togglePen={togglePen}
              setTogglePen={setTogglePen}
              selectedSubChannel={selectedSubChannel}
              budgetClusterTableData={budgetClusterTableData}
              setBudgetClusterTableData={(data) =>
                setBudgetClusterTableData(data)
              }
              setSelectedDropData={setSelectedDropData}
              selectedDropData={selectedDropData}
              AGInstance={ClusterAGInstance}
              clusterData={props.clusterData}
              selectedChannel={selectedChannel}
              levelTwoOptions={levelTwoOptions}
              levelTwoSelected={levelTwoSelected}
              levelOneOptions={levelOneOptions}
              levelOneSelected={levelOneSelected}
              sendClusterTableData={props.sendClusterTableData}
              initialLoadBudgetComponent={props.initialLoadBudgetComponent}
              fromDashboardScreen_2_1={props.fromDashboardScreen_2_1}
              getFilteredFooter={getFilteredFooter}
              loading={props.isLoading}
              setFilteredClusterFooter={setFilteredClusterFooter}
              filteredClusterFooter={filteredClusterFooter}
              callUpdateClusterTable={callUpdateClusterTable}
              setCallUpdateClusterTable={setCallUpdateClusterTable}
              isClusterChanged={isClusterChanged}
              setIsClusterChanged={setIsClusterChanged}
              filterChanged={filterChanged}
              setFilterChanged={setFilterChanged}
            />
            {props.planDetails?.data?.[
              `${props.screenConfiguration?.common?.drop_key || "drops"}_count`
            ] > 1 &&
            optimizationLevels.includes("carryover") &&
            !history.location.pathname.includes("view") ? (
              <div className={classes.rightAlignButtonAssort}>
                <Button
                  variant="contained"
                  color="primary"
                  className={classes.button}
                  onClick={() => onDropFlowConfiguration()}
                  id="l3-drop-configuration"
                  disabled={clusterTableData?.length > 0 ? false : true}
                >
                  {dropOrLaunch} Configuration
                </Button>
              </div>
            ) : null}
          </Card>
        )}
        {showCreateLevelThree && (
          <CreateNewLevelThreeModal
            setShowCreateLevelThree={setShowCreateLevelThree}
            level3RTinstance={level3RTinstance}
            optimisePayload={optimisePayload}
            setShowClusterLevel={setShowClusterLevel}
            AGInstance={l3AGInstance}
            formData={formData}
            isLevel2Required={
              optimizationLevels?.length === 3 &&
              optimizationLevels.includes("l1_name")
                ? true
                : false
            }
            currentTableLevel={"l3_name"}
            setShowReviewAcrossDropsTable={setShowReviewAcrossDropsTable}
            dynamicL2TableData={dynamicL2TableData}
            isPenValueChanged={isPenValueChanged}
            levelTwoSelected={levelTwoSelected}
            levelOneSelected={levelOneSelected}
            isL3DataChanged={isL3DataChanged}
          ></CreateNewLevelThreeModal>
        )}
        {showDropFlowConfiguration && (
          <DropFlowConfiguration
            closeDropConfiguration={closeDropFlowConfiguration}
            drops_count={
              props.planDetails?.data?.[
                `${
                  props.screenConfiguration?.common?.drop_key || "drops"
                }_count`
              ]
            }
            optimisePayload={optimisePayload}
            showLevel3={props.showLevel3}
            setShowClusterLevel={setShowClusterLevel}
            levelThreeOptions={levelThreeOptions}
            setShowReviewAcrossDropsTable={setShowReviewAcrossDropsTable}
            setDisableNext={props.setDisableNext}
            clusterData={props.clusterData}
            setInitialLoadDepthChoice={props.setInitialLoadDepthChoice}
            setInitialLoadWedge={props.setInitialLoadWedge}
            setInitialLoadFinalize={props.setInitialLoadFinalize}
            setFromDashboardScreen_2_2={props.setFromDashboardScreen_2_2}
            setFromDashboardScreen_2_3={props.setFromDashboardScreen_2_3}
            setFromDashboardScreen_2_4={props.setFromDashboardScreen_2_4}
            invalidL3Clusters={props.invalidL3Clusters}
            isClusterChanged={isClusterChanged}
            setIsClusterChanged={setIsClusterChanged}
          />
        )}
        {showReviewAcrossDropsTable && (
          <ReviewAcrossDropsTable
            levelThreeOptions={levelThreeOptions}
            setDisableNext={props.setDisableNext}
          />
        )}
      </LoadingOverlay>
    </>
  );
};

const mapStateToProps = (state) => {
  return {
    isLoading: planInitialServiceActions.loader_2_1_Selector(state),
    budgetL2Data: planInitialServiceActions.budgetL2TableDataSelector(state),
    planDetails: planDashboardServiceActions.planDetailsDataSelector(state),
    l3OptData: planInitialServiceActions.budgetLevelThreeTableDataSelector(
      state
    ),
    l2OptData: planInitialServiceActions.budgetLevelTwoTableDataSelector(state),
    clusterOptData: planInitialServiceActions.budgetClusterOcrptTableDataSelector(
      state
    ),
    levelsJson: planDashboardServiceActions.levelsJsonDataSelector(state),
    columnHeaderJson: planDashboardServiceActions.columnHeaderJsonSelector(
      state
    ),
    clusterOptGraphData: planInitialServiceActions.budgetClusterOptGraphDataSelector(
      state
    ),
    screenConfiguration: commonAssortServiceActions.screenConfigurationSelector(
      state
    ),
    reviewTargetData: planInitialServiceActions.reviewTargetSelector(state),
    planLevels: planDashboardServiceActions.planLevelsDataSelector(state),
  };
};

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators(
    {
      addSnack,
      updateL3OptData,
      updateClusterOptData,
      updateBudgetL2Data,
      deleteL3,
      getL3OptData,
      setL3OptData,
      setL2OptData,
      set2_1_Loader,
    },
    dispatch
  );
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(BudgetCompoenent));
