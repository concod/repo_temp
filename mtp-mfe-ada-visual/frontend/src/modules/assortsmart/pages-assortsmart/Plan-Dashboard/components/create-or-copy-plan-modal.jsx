import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Button,
  Grid,
  Typography,
} from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { Close } from "@mui/icons-material";
import { useEffect, useState } from "react";
import PlanFilterData from "./plan-filter-data";
import { addSnack } from "../../../../../core/actions/snackbarActions";
import { connect } from "react-redux";
import {
  calculateNoOfWeeks,
  getFiltersRespArr,
} from "../../../utils-assortsmart/utilityFunctions";
import {
  getAllAccessTypeData,
  getFilterAccessibleValues,
} from "core/Utils/filter-accessible-data";
import LoadingOverlay from "../../../../../core/Utils/Loader/loader";
import { useHistory } from "react-router";
import {
  OMNI_MAPPING_SCREEN,
  ASSORT_CLUSTER_DASHBOARD,
  PLAN,
  CREATE_HINDSIGHT_VIEW,
} from "modules/assortsmart/constants-assortsmart/routesContants";
import { CLUSTER } from "modules/clusterSmart/constants-clustersmart/routesConstants";
import {
  validatePlanAPI,
  createPlanAPI,
  getPlanLevels,
  setPlanLevels,
  getPlanDetails,
  copyAssortPlan,
  getBopTagData,
  setBopTagData,
  getSeasonOptions,
} from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import {
  createClusterPlan,
  getClusterPlanDetails,
  setClusterPlanDetails,
} from "modules/clusterSmart/services-clustersmart/ClusterPlan/cluster-plan-service";
import { getStoreChannels } from "modules/assortsmart/services-assortsmart/Clustering/Cluster-Input/cluster-input-service";
import {
  refreshPlans,
  setOmniLoader,
} from "modules/assortsmart/services-assortsmart/OmniChannel/omni-channel-service";
import {
  common,
  Dashboard,
  createCoreChoiceLevels,
  coreChoicePlanLevels,
} from "modules/assortsmart/constants-assortsmart/stringContants";
import {
  planDefaultValues,
  onDropsChange,
  extractDropsArr,
  generateFilterConfig,
  removeL2NameFromPlanAttributes,
  getSelectedL2NameArray,
  configureParams,
  handleSeasonValueChange,
  handleYearValueChange,
  handleBOPPlansData,
  handleLevelsChange,
  handleChannelChange,
  createAllDoorCcPayload,
  createPlanPayload,
  validatePlanPayload,
} from "./common-plan-functions";
import findIndex from "lodash/findIndex";
import { useStyles as sharedStyles } from "core/Utils/styles/assortSmartUsestyles";
import { getAllFilters, getCombinedFiltersValues } from "core/actions/filterAction";
import { cloneDeep } from "lodash";
import moment from "moment";
import {
  createCoreChoiceConfiguration,
  getCoreChoiceTableData,
  setCoreChoiceTableData,
  setCoreChoiceLoader,
} from "modules/assortsmart/services-assortsmart/CoreChoiceConfiguration/core-choice-configuration-service";
import { fetchClusterDashboardTableData } from "modules/clusterSmart/services-clustersmart/ClusterPlan/cluster-plan-service";
import { Add, Delete } from "@mui/icons-material";

const useStyles = makeStyles({
  dialog: {
    "& .MuiDialog-paperWidthLg": {
      maxWidth: "85rem",
      overflowY: "inherit",
      position: "absolute",
      top: 0,
      borderRadius: "0.6rem",
      marginTop: "1%",
    },
  },
  content: {
    padding: "0",
    overflowY: "inherit",
  },
  noOfWeeksText: {
    margin: "1rem 1.5rem",
  },
});
const PlanModal = (props) => {
  const [createOrCopyModal_loader, setcreateOrCopyModal_loader] = useState(
    false
  ); //seperate Loader variable for create plan Modal
  const [planFilterConfig, setplanFilterConfig] = useState([]);
  const [planFilterConfigSelection, setplanFilterConfigSelection] = useState(
    {}
  );
  const [noOfWeeks, setnoOfWeeks] = useState(-1);
  const [isEdited, setisEdited] = useState(false);
  const [defaultValues, setDefaultValues] = useState("");
  const classes = useStyles();
  const history = useHistory();
  const sharedClasses = sharedStyles();
  const [channelOptions, setChannelOptions] = useState([]);
  const [subChannelOptions, setSubChannelOptions] = useState([]);
  const [multiSelectCol, setMultiSelectCol] = useState([]);
  // In case l2_name is hidden, inorder to call product api while selecting l1_name we are setting all the fileds to sepearate variable
  const [planFilterConfigWithL2Name, setPlanFilterConfigWithL2Name] = useState(
    []
  );
  const [clusterPlanData, setClusterPlanData] = useState([]);
  const [addedFieldCount, setAddedFieldCount] = useState(1);
  const location = history.location.pathname;
  let hide_l2_name = props.screenConfiguration?.dashboard?.hide_l2_name;

  const displayMessage = (msg, type, onClose) => {
    props.addSnack({
      message: msg,
      options: {
        variant: type,
        ...(onClose && { onClose: onClose }),
      },
    });
    setcreateOrCopyModal_loader(false);
  };

  const getCopyPlanInfo = async (copyPlanId) => {
    //Once the copy plan Id is fetched, fetch the plan Info
    let copyPlanResp = {};
    if (
      location.includes("cluster-dashboard") ||
      location.includes("cluster-smart")
    ) {
      copyPlanResp = await props.getClusterPlanDetails(copyPlanId);
    } else {
      copyPlanResp = await props.getPlanDetails(
        copyPlanId,
        props.screenConfiguration?.common?.endpoint_project_name || "assort"
      );
    }
    return copyPlanResp?.data?.data;
  };

  const configurePlanFilters = async (
    createPlanFilterConfig,
    createPlanFilterResponse
  ) => {
    if (
      location.includes("cluster-dashboard") ||
      location.includes("cluster-smart")
    ) {
      createPlanFilterConfig.forEach((filter) => {
        if (filter.accessor === "assort_year_value") {
          // Start year from 2019 for assort_year option dropdown incase of cluster plan
          let startYear = 2019;
          let pastYearArray = [];
          while (startYear < filter.options[0]?.value) {
            pastYearArray.push({
              label: startYear,
              value: startYear,
              id: startYear,
            });
            startYear++;
          }
          // Remove future year's for assort_year option dropdown incase of cluster plan
          filter.options = filter.options.filter(
            (data) => data.value <= moment().year()
          );
          filter.options.unshift(...pastYearArray);
        }
        if (filter.accessor === "assort_selling_period_value") {
          filter.startYear = 2019;
        }
      });
    }
    if (history.location.pathname.includes("alldoor")) {
      createPlanFilterResponse?.data?.data.forEach((data) => {
        if (data.is_multiple_selection) {
          if (data.column_name === "l5_name") {
            multiSelectCol.push("l3_name");
          } else {
            multiSelectCol.push(data.column_name);
          }
          setMultiSelectCol(multiSelectCol);
        }
      });
    }
    setcreateOrCopyModal_loader(false);
    setPlanFilterConfigWithL2Name(
      filterAccessibleValues(createPlanFilterConfig)
    );
    if (hide_l2_name && !location.includes("alldoor")) {
      // In case l2_name is hidden from fields, set all the l2_name options to planFilterConfigSelection
      let l2_name = getSelectedL2NameArray(createPlanFilterConfig);
      planFilterConfigSelection["l2_name"] = l2_name;
      createPlanFilterConfig = removeL2NameFromPlanAttributes(
        createPlanFilterConfig
      );
    }
    let channelIndex = findIndex(
      createPlanFilterConfig,
      (item) => item.accessor === "channel"
    );
    if (channelIndex !== -1) {
      let channelResponse = await props.getCombinedFiltersValues({
        application_code: appCode,
        attributes: [
          {
            attribute_name: "channel",
            dimension: "store",
          },
        ],
        filter_type: "cascaded",
      });
      let channelList = channelResponse?.data?.data?.channel || [];
      let options = channelList.map((item) => {
        return {
          label: item,
          value: item,
          id: item,
        };
      });
      createPlanFilterConfig[channelIndex].options = options;
      setChannelOptions(options);
    }
    let bopIndex = findIndex(
      createPlanFilterConfig,
      (item) => item.accessor === "bop_tag_plan_code"
    );
    if (bopIndex !== -1 && props.type === "copy") {
      createPlanFilterConfig.splice(bopIndex, 1);
    }
    if (
      location.includes("cluster-smart") ||
      location.includes("cluster-dashboard")
    ) {
      planFilterConfigSelection["weightage"] = 100;
    }
    return createPlanFilterConfig;
  };

  const configureCopyPlanFilters = async (
    createPlanFilterConfig,
    copyPlanData
  ) => {
    let planDefaults = props.isWedgeScreen
      ? planDefaultValues(
          { ...props.planData, season: parseInt(props.planData.season_id) },
          createPlanFilterConfig,
          props.screenConfiguration?.common?.drop_key
        )
      : planDefaultValues(
          copyPlanData,
          createPlanFilterConfig,
          props.screenConfiguration?.common?.drop_key
        );
    setplanFilterConfigSelection(planDefaults);
    planDefaults["assort_year_value"] = parseInt(
      planDefaults["assort_year_value"]
    );
    let channelIndex = findIndex(
      createPlanFilterConfig,
      (item) => item.accessor === "channel"
    );
    if (channelIndex !== -1) {
      let channelResponse = await props.getCombinedFiltersValues({
        application_code: appCode,
        attributes: [
          {
            attribute_name: "channel",
            dimension: "store",
          },
        ],
        filter_type: "cascaded",
      });
      let channelList = channelResponse?.data?.data?.channel || [];
      let options = channelList.map((item) => {
        return {
          label: item,
          value: item,
          id: item,
        };
      });
      createPlanFilterConfig[channelIndex].options = options;
      setChannelOptions(options);
    }

    let subChannelIndex = findIndex(
      createPlanFilterConfig,
      (item) => item.column_name === "sub_channel"
    );
    if (subChannelIndex !== -1) {
      let subChannelResponse = await props.getCombinedFiltersValues({
        application_code: appCode,
        attributes: [
          {
            attribute_name: "sub_channel",
            dimension: "store",
          },
        ],
        filter_type: "cascaded",
        filters: [
          {
            attribute_name: "channel",
            dimension: "store",
            filter_id: "channel",
            filter_type: "cascaded",
            operator: "in",
            values: Array.isArray(planDefaults["channel"])
              ? planDefaults["channel"]
              : [planDefaults["channel"]],
          },
        ],
      });
      if (subChannelResponse?.data?.status) {
        let subChannelList = subChannelResponse?.data?.data?.sub_channel || [];
        let options = subChannelList.map((item) => {
          return {
            label: item,
            value: item,
            id: item,
          };
        });

        createPlanFilterConfig[subChannelIndex].options = options;
      }
    }
    //To get season values for selected year on copy plan/omni create plan if plan created from 2-3 screen
    if (copyPlanData?.selling_period?.length > 0) {
      copyPlanData.selling_period.map(async (period, index) => {
        let seasonData = await props.getSeasonOptions({
          filters: [
            {
              attribute_name: "year",
              value: [
                parseInt(planDefaults[`assort_year_value${index || ""}`]),
              ],
              operator: "=",
            },
          ],
        });
        const weeksCount = calculateNoOfWeeks(
          planDefaults[`assort_selling_period_value${index || ""}`][0],
          planDefaults[`assort_selling_period_value${index || ""}`][1]
        );
        setnoOfWeeks(weeksCount);
        //To show selected season value
        createPlanFilterConfig.forEach((item) => {
          if (item.accessor === `assort_season_value${index || ""}`) {
            item.options = seasonData?.data.data.map((data) => {
              return {
                value: data.season_code,
                label: data.name,
                id: data.season_code,
              };
            });
          }
        });
      });
    } else {
      let seasonData = await props.getSeasonOptions({
        filters: [
          {
            attribute_name: "year",
            value: [parseInt(planDefaults["assort_year_value"])],
            operator: "=",
          },
        ],
      });
      const weeksCount = calculateNoOfWeeks(
        planDefaults["assort_selling_period_value"][0],
        planDefaults["assort_selling_period_value"][1]
      );
      setnoOfWeeks(weeksCount);
      //To show selected season value
      createPlanFilterConfig.forEach((item) => {
        if (item.accessor === "assort_season_value") {
          item.options = seasonData?.data.data.map((data) => {
            return {
              value: data.season_code,
              label: data.name,
              id: data.season_code,
            };
          });
        }
      });
    }
    if (
      location?.includes("plan-dashboard") &&
      !location?.includes("alldoor")
    ) {
      let filtersArray = [];
      filtersArray.push({
        attribute_name: "l0_name",
        operator: "in",
        filter_type: "cascaded",
        values: copyPlanData["l0_name"],
      });
      filtersArray.push({
        filter_type: "non-cascaded",
        attribute_name: "steps",
        operator: "in",
        dimension: "Product",
        values: ["1.3"],
      });
      filtersArray.push({
        attribute_name: "channel",
        operator: "in",
        filter_type: "cascaded",
        values: planDefaults["channel"],
      });
      filtersArray.push({
        attribute_name: "sub_channel",
        operator: "in",
        filter_type: "cascaded",
        values: planDefaults["sub_channel"],
      });
      let body = {
        filters: filtersArray,
        status: 0,
        meta: {},
      };
      let clusterPlanRes = await props.fetchClusterDashboardTableData(
        body,
        1,
        -1
      );
      let clusterOptions = clusterPlanRes?.data?.data.map((item) => {
        return {
          label: item.name,
          value: item.cluster_plan_code,
          id: item.cluster_plan_code,
        };
      });
      let clusterPlanFeildIndex = findIndex(
        createPlanFilterConfig,
        (item) => item.column_name === "cluster_plan_code"
      );
      if (clusterPlanFeildIndex !== -1) {
        createPlanFilterConfig[clusterPlanFeildIndex].options = clusterOptions;
      }
    }
    return createPlanFilterConfig;
  };

  useEffect(() => {
    const fetchData = async () => {
      setcreateOrCopyModal_loader(true);
      const levelResp = await props.getPlanLevels();
      const filterData = levelResp.data.data["level_info"];
      props.setPlanLevels(filterData);
      const copyPlanData =
        props.type === "copy" ? await getCopyPlanInfo(props.copyPlanData) : [];
      let param = configureParams(location, props);
      const createPlanFilterResponse = await props.getAllFilters(param);
      let createPlanFilterConfig = [];
      if (createPlanFilterResponse?.data?.status) {
        createPlanFilterConfig = await generateFilterConfig(
          createPlanFilterResponse?.data?.data,
          props.type,
          props.userAccessList,
          props.isWedgeScreen,
          location
        );
      }
      if (props.type === "copy" || props.isWedgeScreen) {
        let multiRowArr = [
          "assort_year_value",
          "assort_season_value",
          "assort_selling_period_value",
          "weightage",
        ];
        if (copyPlanData && copyPlanData?.selling_period?.length > 1) {
          let addedField = createPlanFilterConfig.filter((filter) =>
            multiRowArr.includes(filter.accessor)
          );
          let fixedField = addedField;
          copyPlanData?.selling_period.map((period, index) => {
            addedField = cloneDeep(fixedField);
            if (index) {
              addedField.map((field) => {
                field.accessor = field?.accessor + index;
                field.column_name = field?.column_name + index;
              });
              createPlanFilterConfig.push(...addedField);
            }
          });
        }
        createPlanFilterConfig = await configureCopyPlanFilters(
          createPlanFilterConfig,
          copyPlanData
        );
        setcreateOrCopyModal_loader(false);
        setPlanFilterConfigWithL2Name(
          filterAccessibleValues(createPlanFilterConfig)
        );
      } else {
        createPlanFilterConfig = await configurePlanFilters(
          createPlanFilterConfig,
          createPlanFilterResponse
        );
      }
      createPlanFilterConfig.map((config) => {
        if (config.column_name === "weightage") {
          config.value_type = "percentage";
        }
      });
      setplanFilterConfig(filterAccessibleValues(createPlanFilterConfig));
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filterAccessibleValues = (planFilterConfig) => {
    let allCreateAccess = getAllAccessTypeData(props.accessData, "create");
    return getFilterAccessibleValues(planFilterConfig, allCreateAccess);
  };

  const handleChange = async (updatedCreateOrCopySelectionData, id, type) => {
    let updatedPlanFilterConfig = cloneDeep(planFilterConfig);
    if (id === "add_fields") {
      if (type === "add") {
        setAddedFieldCount(addedFieldCount + 1);
        let planConfig = cloneDeep(updatedPlanFilterConfig);
        updatedPlanFilterConfig.map((filter) => {
          if (filter.accessor === "weightage") {
            filter.isDisabled = false;
          }
        });
        // Push new row with fields assort_year_value, assort_season_value, assort_selling_period_value, weightage inside updatedPlanFilterConfig
        let addedField = planConfig.filter(
          (filter) =>
            filter.accessor === `assort_year_value` ||
            filter.accessor === `assort_season_value` ||
            filter.accessor === `assort_selling_period_value` ||
            filter.accessor === `weightage`
        );
        addedField.map((field) => {
          field["accessor"] = `${field.accessor}${addedFieldCount + 1}`;
          field["column_name"] = `${field.accessor}${addedFieldCount + 1}`;
          field["isDisabled"] = false;
        });
        updatedPlanFilterConfig.push(...addedField);
        updatedCreateOrCopySelectionData[
          `assort_selling_period_value${addedFieldCount + 1}`
        ] = [null, null];
        updatedCreateOrCopySelectionData[`weightage${addedFieldCount + 1}`] = 0;
        setplanFilterConfigSelection(updatedCreateOrCopySelectionData);
        setDefaultValues(updatedCreateOrCopySelectionData);
      }
      if (type.includes("delete_")) {
        let index = type.split("delete_weightage")?.[1]
          ? type.split("delete_weightage")?.[1]
          : "";
        // Delete selected row
        updatedPlanFilterConfig = updatedPlanFilterConfig.filter(
          (filter) =>
            filter.accessor !== `assort_year_value${index}` &&
            filter.accessor !== `assort_season_value${index}` &&
            filter.accessor !== `assort_selling_period_value${index}` &&
            filter.accessor !== `weightage${index}`
        );
        let multiRowArr = [
          "assort_year_value",
          "assort_season_value",
          "assort_selling_period_value",
          "weightage",
        ];
        let indexOfMultiRow;
        let checkNoOfSellingPeriodRows = cloneDeep(
          updatedPlanFilterConfig
        ).filter((filter) => filter.accessor.includes(`weightage`));
        // In case of one row, make weightage as disabled with 100% , and changed accessor value to initial
        if (checkNoOfSellingPeriodRows?.length === 1) {
          indexOfMultiRow = checkNoOfSellingPeriodRows?.[0]?.["accessor"].split(
            "weightage"
          )?.[1]
            ? checkNoOfSellingPeriodRows?.[0]?.["accessor"].split(
                "weightage"
              )?.[1]
            : "";
          updatedPlanFilterConfig.map((filter) => {
            filter.accessor = filter.accessor.includes("assort_year_value")
              ? "assort_year_value"
              : filter.accessor.includes("assort_season_value")
              ? "assort_season_value"
              : filter.accessor.includes("assort_selling_period_value")
              ? "assort_selling_period_value"
              : filter.accessor.includes("weightage")
              ? "weightage"
              : filter.accessor;
            if (multiRowArr.includes(filter.accessor)) {
              updatedCreateOrCopySelectionData[filter.accessor] =
                updatedCreateOrCopySelectionData[
                  `${filter.accessor}${indexOfMultiRow}`
                ];
            }
            if (filter.accessor.includes("weightage")) {
              filter.isDisabled = true;
              updatedCreateOrCopySelectionData[filter.accessor] = 100;
            }
          });
        }
        Object.keys(updatedCreateOrCopySelectionData).map((key) => {
          if (checkNoOfSellingPeriodRows?.length === 1) {
            if (
              (key.includes("assort_year_value") ||
                key.includes("assort_season_value") ||
                key.includes("assort_selling_period_value") ||
                key.includes("weightage")) &&
              key !== "assort_year_value" &&
              key !== "assort_season_value" &&
              key !== "assort_selling_period_value" &&
              key !== "weightage"
            ) {
              delete updatedCreateOrCopySelectionData[key];
            }
          } else if (multiRowArr.includes(key)) {
            delete updatedCreateOrCopySelectionData[
              `${key}${indexOfMultiRow || index}`
            ];
          }
        });
      }
      setplanFilterConfigSelection(updatedCreateOrCopySelectionData);
      setDefaultValues(updatedCreateOrCopySelectionData);
      setplanFilterConfig(updatedPlanFilterConfig);
      return;
    }

    if (id === "assort_selling_period_value") {
      const weeksCount = calculateNoOfWeeks(
        updatedCreateOrCopySelectionData[id][0],
        updatedCreateOrCopySelectionData[id][1]
      );
      setnoOfWeeks(weeksCount);
    }
    if (id === "assort_drop_value") {
      const updatedFieldSelectedData = onDropsChange(
        updatedCreateOrCopySelectionData[id],
        planFilterConfig,
        planFilterConfigSelection,
        props.screenConfiguration
      );
      updatedPlanFilterConfig = filterAccessibleValues(
        updatedFieldSelectedData[1]
      );
      setplanFilterConfigSelection(updatedFieldSelectedData[0]);
    }
    if (id !== "assort_drop_value") {
      setplanFilterConfigSelection(updatedCreateOrCopySelectionData);
    }
    if (id.includes("assort_season_value")) {
      setcreateOrCopyModal_loader(true);
      await handleSeasonValueChange(
        updatedCreateOrCopySelectionData,
        id,
        location,
        setnoOfWeeks,
        setplanFilterConfigSelection,
        setDefaultValues,
        props
      );
      setcreateOrCopyModal_loader(false);
    }
    if (
      !location.includes("omnichannel") &&
      !location.includes("alldoor") &&
      !location.includes("cluster-smart") &&
      !location.includes("cluster-dashboard")
    ) {
      if (
        updatedCreateOrCopySelectionData.l0_name &&
        (id === "l0_name" || id === "sub_channel")
      ) {
        let filtersArray = [
          {
            attribute_name: "l0_name",
            operator: "in",
            filter_type: "cascaded",
            values: [updatedCreateOrCopySelectionData["l0_name"]],
          },
          {
            filter_type: "non-cascaded",
            attribute_name: "steps",
            operator: "in",
            dimension: "Product",
            values: ["1.3"],
          },
        ];
        if (
          updatedCreateOrCopySelectionData.channel &&
          updatedCreateOrCopySelectionData.sub_channel
        ) {
          filtersArray.push({
            attribute_name: "channel",
            operator: "in",
            filter_type: "non-cascaded",
            values: updatedCreateOrCopySelectionData["channel"],
          });
          filtersArray.push({
            attribute_name: "sub_channel",
            operator: "in",
            filter_type: "non-cascaded",
            values: updatedCreateOrCopySelectionData["sub_channel"],
          });
          let body = {
            filters: filtersArray,
            status: 0,
            meta: {},
          };
          let clusterPlanRes = await props.fetchClusterDashboardTableData(
            body,
            1,
            -1
          );
          let clusterOptions = clusterPlanRes?.data?.data.map((item) => {
            return {
              label: item.name,
              value: item.cluster_plan_code,
              id: item.cluster_plan_code,
            };
          });
          let clusterPlanFeildIndex = findIndex(
            planFilterConfig,
            (item) => item.column_name === "cluster_plan_code"
          );
          if (clusterPlanFeildIndex !== -1) {
            updatedPlanFilterConfig[
              clusterPlanFeildIndex
            ].options = clusterOptions;
          }
        }
      }
    }
    if (id.includes("assort_year_value")) {
      let index = !id.split("assort_year_value")?.[1]
        ? ""
        : id.split("assort_year_value")?.[1];
      let formValues = cloneDeep(updatedCreateOrCopySelectionData);
      formValues[`assort_season_value${index}`] = "";
      formValues[`assort_selling_period_value${index}`][0] = null;
      formValues[`assort_selling_period_value${index}`][1] = null;
      setplanFilterConfigSelection(formValues);
      setDefaultValues(formValues);
      //Populate benchmark year plan options on change of year for plan creation on dashboard
      updatedPlanFilterConfig = await handleYearValueChange(
        updatedCreateOrCopySelectionData,
        id,
        updatedPlanFilterConfig,
        location,
        planFilterConfig,
        props
      );
    }
    if (
      Dashboard.__Non_Hierarchy_Fields.indexOf(id) === -1 &&
      !id.includes("drop_") &&
      !id.includes("launch_")
    ) {
      let non_heirarchy_fields = id.includes("assort_year_value")
        ? "assort_year_value"
        : id.includes("assort_season_value")
        ? "assort_season_value"
        : id.includes("assort_selling_period_value")
        ? "assort_selling_period_value"
        : id.includes("weightage")
        ? "weightage"
        : id;
      let index = !id.split(non_heirarchy_fields)?.[1]
        ? null
        : id.split(non_heirarchy_fields)?.[1];
      if (!index) {
        //get bop plans data when any of the hierarchy values changes & season value is present already
        updatedPlanFilterConfig = await handleBOPPlansData(
          updatedCreateOrCopySelectionData,
          updatedPlanFilterConfig,
          location,
          planFilterConfig,
          props
        );
        updatedPlanFilterConfig = await handleLevelsChange(
          updatedCreateOrCopySelectionData,
          id,
          updatedPlanFilterConfig,
          location,
          planFilterConfig,
          createCoreChoiceLevels,
          hide_l2_name,
          setplanFilterConfigSelection,
          planFilterConfigWithL2Name,
          setcreateOrCopyModal_loader,
          channelOptions,
          subChannelOptions,
          props
        );
        setplanFilterConfig(filterAccessibleValues(updatedPlanFilterConfig));
      }
    }

    if (id === "channel") {
      updatedPlanFilterConfig = await handleChannelChange(
        updatedCreateOrCopySelectionData,
        id,
        updatedPlanFilterConfig,
        planFilterConfig,
        setplanFilterConfigSelection,
        setDefaultValues,
        setSubChannelOptions,
        appCode,
        props,
        location
      );
    }
    if (id === "reference_period") {
      if (updatedCreateOrCopySelectionData[id] === "Compare Year") {
        updatedCreateOrCopySelectionData["compare_season_value"] = "";
        updatedCreateOrCopySelectionData["compare_year_value"] = "";
        setplanFilterConfigSelection(updatedCreateOrCopySelectionData);
      }
    }
    if (id === "compare_year_value") {
      let seasonResponse = await props.getSeasonOptions({
        filters: [
          {
            attribute_name: "year",
            value: [updatedCreateOrCopySelectionData[id]],
            operator: "=",
          },
        ],
      });
      if (seasonResponse?.data?.status) {
        updatedPlanFilterConfig.forEach((item) => {
          if (item.accessor === "compare_season_value") {
            let seasonOptions = [];
            seasonResponse?.data?.data.forEach((opt) => {
              let seasonDate = new Date(opt.season_start_date);
              let currentDate = new Date();
              if (seasonDate < currentDate) {
                seasonOptions.push({
                  label: opt.name,
                  value: opt.attribute_value.incremental_id,
                  id: opt.attribute_value.incremental_id,
                });
              } else if (
                !location.includes("cluster-smart") &&
                !location.includes("cluster-dashboard")
              ) {
                seasonOptions.push({
                  label: opt.name,
                  value: opt.attribute_value.incremental_id,
                  id: opt.attribute_value.incremental_id,
                });
              }
            });
            item.options = seasonOptions;
          }
        });
      }
    }
    if (
      id === "cluster_plan_code" &&
      props.screenConfiguration?.common?.endpoint_project_name ===
        "assort-smart"
    ) {
      setcreateOrCopyModal_loader(true);
      let clusterPlanData = await props.getClusterPlanDetails(
        updatedCreateOrCopySelectionData[id]
      );
      setcreateOrCopyModal_loader(false);
      setClusterPlanData(clusterPlanData?.data?.data);
    }
    setplanFilterConfig(updatedPlanFilterConfig);
    if (!isEdited) {
      setisEdited(true);
    }
  };

  const handleCreatePlan = async (createResp) => {
    if (planFilterConfigSelection.assort_selling_period_value.length > 0) {
      let planDate = planFilterConfigSelection.assort_selling_period_value[1].toDate();
      if (moment(planDate).isBefore(new Date())) {
        displayMessage("Plan created for past date", "warning");
      }
    }
    const createdPlanId = createResp.data.data.plan_code;
    setplanFilterConfigSelection({});
    setnoOfWeeks(-1);
    if (props.isWedgeScreen) {
      displayMessage("Plan created successfully", "success", async () => {
        try {
          props.setOmniLoader(true);
          const reqBody = {
            omni_plan_code: createdPlanId,
            plan_code: [props.planData?.plan_code],
            refresh_flag: false,
          };
          const refreshPlanData = await props.refreshPlans(
            reqBody,
            props.screenConfiguration?.common?.endpoint_project_name || "assort"
          );
          if (refreshPlanData?.data.status) {
            displayMessage(refreshPlanData.data.message, "success");
          }
        } catch (error) {
          displayMessage("Omni Refresh plans failed", "error");
        }
        props.setOmniLoader(false);
        history.push(`${OMNI_MAPPING_SCREEN}/${createdPlanId}`, {
          location: "wedgeScreen",
        });
      });
    } else {
      displayMessage("Plan created successfully", "success");
      if (location.includes("omnichannel")) {
        history.push(`${OMNI_MAPPING_SCREEN}/${createdPlanId}`, {
          location: "dashboard",
        });
      } else {
        history.push(`${PLAN}/${createdPlanId}`);
      }
    }
    setcreateOrCopyModal_loader(false);
    props.handleClose(createdPlanId);
  };

  const onCreatePlan = async () => {
    setcreateOrCopyModal_loader(true);
    try {
      let requiredFieldsError = false;
      [...planFilterConfig].forEach((item) => {
        if (
          item.required &&
          (!planFilterConfigSelection[item.accessor] ||
            (item.accessor.includes("weightage") &&
              planFilterConfigSelection[item.accessor] === ""))
        ) {
          requiredFieldsError = true;
        }
      });
      if (requiredFieldsError) {
        displayMessage("Please fill all the required fields", "error");
        setcreateOrCopyModal_loader(false);
        requiredFieldsError = false;
        return;
      }
      let compareSeasonValue = "";
      if (planFilterConfigSelection.compare_season_value) {
        let compareSeasonResponse = await props.getSeasonOptions({
          filters: [
            {
              attribute_name: "incremental_id",
              value: [planFilterConfigSelection.compare_season_value],
              prefix: "attribute_value",
              operator: "=",
            },
          ],
        });
        if (compareSeasonResponse?.data?.status) {
          compareSeasonValue = compareSeasonResponse?.data?.data?.[0]?.name;
        }
      }
      if (history.location.pathname.includes("alldoor")) {
        setcreateOrCopyModal_loader(false);
        try {
          props.setCoreChoiceLoader(true);
          const reqBody = await createAllDoorCcPayload(
            planFilterConfigSelection,
            coreChoicePlanLevels,
            multiSelectCol,
            props
          );
          const createCoreChoice = await props.createCoreChoiceConfiguration(
            reqBody,
            props.screenConfiguration?.common?.endpoint_project_name || "assort"
          );
          if (createCoreChoice.data.message === "Created successfully") {
            displayMessage(
              "All-door choice configuration created succesfully",
              "success"
            );
            props.setCoreChoiceTableData([]);
            const coreChoiceData = await props.getCoreChoiceTableData(
              {
                filters: [],
              },
              props.screenConfiguration?.common?.endpoint_project_name ||
                "assort"
            );
            props.setCoreChoiceTableData(coreChoiceData.data.data.data);
            props.handleClose();
          } else {
            displayMessage(createCoreChoice.data.message, "error");
          }
        } catch (error) {
          displayMessage(
            "All-door choice configuration creation failed",
            "error"
          );
        }
        props.setCoreChoiceLoader(false);
      } else {
        let drops = [noOfWeeks];
        if (planFilterConfigSelection["assort_drop_value"] > 1) {
          drops = extractDropsArr(
            planFilterConfigSelection,
            props.screenConfiguration?.common?.drop_key
          );
          const total = drops.reduce((a, b) => a + b, 0);
          if (total !== noOfWeeks) {
            displayMessage(
              "Drops should be within the selling period",
              "error"
            );
            setcreateOrCopyModal_loader(false);
            return;
          }
        }
        requiredFieldsError = false;
        const reqBody = await createPlanPayload(
          planFilterConfigSelection,
          drops,
          location,
          hide_l2_name,
          props
        );
        if (location.includes("plan-dashboard")) {
          reqBody["data_pull_source"] =
            planFilterConfigSelection.reference_data === "Actual"
              ? "actual"
              : "plan";
          reqBody["compare_season"] = compareSeasonValue
            ? compareSeasonValue
            : "";
        }
        if (planFilterConfigSelection.bop_tag_plan_code) {
          reqBody.bop_tag_plan_code =
            planFilterConfigSelection.bop_tag_plan_code;
        }
        if (location.includes("omnichannel") || props.isWedgeScreen) {
          reqBody["special_classification"] = "omnichannel";
        }
        if (
          location.includes("cluster-smart") ||
          location.includes("cluster-dashboard")
        ) {
          let sellingPeriod = [];
          let totalWeightage = 0;
          let isWeightage = false;
          Object.keys(planFilterConfigSelection).map((key) => {
            if (key.includes("assort_selling_period_value")) {
              let index = key.split("assort_selling_period_value")?.[1]
                ? key.split("assort_selling_period_value")?.[1]
                : "";
              sellingPeriod.push({
                end_date: planFilterConfigSelection[
                  `assort_selling_period_value${index}`
                ][1].format("YYYY-MM-DD"),
                start_date: planFilterConfigSelection[
                  `assort_selling_period_value${index}`
                ][0].format("YYYY-MM-DD"),
                weightage: planFilterConfigSelection[`weightage${index}`],
                season: planFilterConfigSelection[`assort_season_name${index}`],
                season_id:
                  planFilterConfigSelection?.[`assort_season_value${index}`]
                    ? planFilterConfigSelection[`assort_season_value${index}`]
                    : 0,
              });
              totalWeightage =
                totalWeightage +
                parseInt(planFilterConfigSelection[`weightage${index}`]);
            }
            if (key.includes("weightage")) {
              isWeightage = true;
            }
          });
          if (isWeightage) {
            reqBody["selling_period"] = sellingPeriod;
            delete reqBody["selling_period_sdate"];
            delete reqBody["selling_period_edate"];
            if (totalWeightage !== 100) {
              displayMessage("Total Weightages should add upto 100%", "error");
              setcreateOrCopyModal_loader(false);
              return;
            }
          }
        }
        if (
          location.includes("cluster-smart") ||
          location.includes("cluster-dashboard")
        ) {
          try {
            reqBody["selected_attribute"] =
              props.screenConfiguration?.["1.1"]?.selected_attributes;
            const createCluster = await props.createClusterPlan(reqBody);
            if (createCluster?.data?.data?.status) {
              const planId = createCluster?.data?.data?.plan_code;
              displayMessage("Cluster plan created successfully", "success");
              setcreateOrCopyModal_loader(false);
              props.handleClose(planId);
              if (location.includes("cluster-dashboard")) {
                history.push(`${ASSORT_CLUSTER_DASHBOARD}/cluster/${planId}`);
              } else {
                history.push(`${CLUSTER}/${planId}`);
              }
            } else {
              displayMessage(createCluster?.data?.data?.message, "error");
            }
          } catch (error) {
            displayMessage("Creation of cluster plan failed", "error");
          }
        } else {
          if (
            props.screenConfiguration?.common?.endpoint_project_name ===
            "assort-smart"
          ) {
            let payload = validatePlanPayload(
              planFilterConfigSelection,
              clusterPlanData
            );
            const validateResp = await props.validatePlanAPI(
              payload,
              props.screenConfiguration?.common?.endpoint_project_name ||
                "assort"
            );
            if (validateResp?.data?.data?.status) {
              const createResp = await props.createPlanAPI(
                reqBody,
                props.screenConfiguration?.common?.endpoint_project_name ||
                  "assort"
              );
              if (createResp?.data?.data?.status) {
                await handleCreatePlan(createResp);
              } else {
                setcreateOrCopyModal_loader(false);
                displayMessage(createResp?.data?.data?.message, "error");
              }
            } else {
              displayMessage(validateResp?.data?.data?.message, "error");
            }
          } else {
            const createResp = await props.createPlanAPI(
              reqBody,
              props.screenConfiguration?.common?.endpoint_project_name ||
                "assort"
            );
            if (createResp?.data?.data?.status) {
              await handleCreatePlan(createResp);
            } else {
              setcreateOrCopyModal_loader(false);
              displayMessage(createResp?.data?.data?.message, "error");
            }
          }
        }
      }
    } catch (err) {
      displayMessage("Plan creation Failed", "error");
      setcreateOrCopyModal_loader(false);
    }
  };

  const onCopyPlan = async () => {
    const assortCopyPlanBody = {};
    // Integration with copy Plan API
    try {
      setcreateOrCopyModal_loader(true);
      let endpoint =
        props.screenConfiguration?.common?.endpoint_project_name || "assort";
      if (
        history.location.pathname.includes("cluster-smart") ||
        history.location.pathname.includes("cluster-dashboard")
      ) {
        endpoint = "cluster-smart";
        assortCopyPlanBody.cluster_plan_code = props.copyPlanData;
        assortCopyPlanBody.cluster_plan_name =
          planFilterConfigSelection["cluster_name"];
      } else {
        assortCopyPlanBody.plan_code = props.copyPlanData;
        assortCopyPlanBody.plan_name = planFilterConfigSelection["plan_name"];
      }
      const copyResp = await props.copyAssortPlan(assortCopyPlanBody, endpoint);
      if (copyResp?.data?.data?.status) {
        displayMessage("Plan copied successfully", "success");
        props.handleClose();
        if (props.plansTableInstance?.current?.api) {
          //If the plansTable is currently at page 1, manually trigger the
          //fetching the updated data by preparing the reqBody
          props.plansTableInstance.current.api.deselectAll(); //Deselect the selected row after copying
          props.plansTableInstance.current.api?.refreshServerSideStore({
            purge: true,
          });
          return;
        }
        //If the plansTable is not at the first page, move the page Index to 0
        //Internally it will call the manuallCallBack as there is change in page
        //This will update the table data
        props.plansTableInstance.current.api.paginationGoToPage(0);
      } else {
        //False - display the respective message of failure
        displayMessage(copyResp?.data?.data?.message, "error");
      }
    } catch (error) {
      //Display error message
      displayMessage("something went wrong", "error");
    }
  };

  const renderForm = (formData, item) => {
    let checkNoOfSellingPeriodRows = planFilterConfig.filter((filter) =>
      filter?.accessor?.includes(`weightage`)
    );
    return (
      <div className={sharedClasses.dashboardFilterContainer}>
        {checkNoOfSellingPeriodRows?.length !== 1 && (
          <IconButton color="primary" size="small">
            <Delete
              onClick={() =>
                handleChange(formData, "add_fields", `delete_${item.accessor}`)
              }
            />
          </IconButton>
        )}
        {item.accessor ===
          checkNoOfSellingPeriodRows[checkNoOfSellingPeriodRows.length - 1]
            ?.accessor &&
          checkNoOfSellingPeriodRows?.length < 5 && (
            <IconButton color="primary" size="small">
              <Add
                onClick={() => handleChange(formData, "add_fields", "add")}
              />
            </IconButton>
          )}
      </div>
    );
  };

  let styleOrChoice =
    props.screenConfiguration?.common.plan_step_names_assort?.["2.2"] ===
    "Depth & Style"
      ? "Style"
      : "choice";

  const getCreateScreenTitle = () => {
    if (props.type === "copy") {
      return "Copy a Plan";
    }
    return history.location.pathname.includes("alldoor")
      ? `Create a All-door ${styleOrChoice} Configuration`
      : history.location.pathname.includes("cluster-smart") ||
        history.location.pathname.includes("cluster-dashboard")
      ? "Create a Cluster"
      : "Create a Plan";
  };

  const assortAppIndex = findIndex(
    props.applicationCodesList,
    (item) => item.name === "AssortSmart"
  );
  const appCode =
    props.applicationCodesList?.[assortAppIndex]?.application_code || 2;

  return (
    <>
      <Dialog
        id="assortCreatePlanModal"
        maxWidth={"lg"}
        aria-labelledby="customized-dialog-title"
        fullWidth={true}
        disableEscapeKeyDown={true}
        open={props.open}
        classes={{ root: classes.dialog }}
      >
        <DialogTitle id="assortCreatePlanModalTitle">
          <Grid
            container
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="h5">{getCreateScreenTitle()}</Typography>
            <IconButton
              color="primary"
              aria-label="close"
              onClick={props.handleClose}
              size="large"
            >
              <Close />
            </IconButton>
          </Grid>
        </DialogTitle>
        <DialogContent
          id="assortCreatePlanModalContent"
          classes={{
            root: classes.content,
          }}
        >
          <LoadingOverlay loader={createOrCopyModal_loader}>
            <PlanFilterData
              screen_name={"create_plan"}
              planAttributes={[...planFilterConfig]}
              selectedData={planFilterConfigSelection}
              handleChange={handleChange}
              defaultValues={defaultValues}
              omniChannel={props.isWedgeScreen}
              location={location}
              renderForm={
                (history.location.pathname.includes("cluster-smart") ||
                  history.location.pathname.includes("cluster-dashboard")) &&
                props.type !== "copy"
                  ? renderForm
                  : null
              }
            />
            {noOfWeeks !== -1 && (
              <Typography
                id="assortCreatePlanNoOfWeeksText"
                className={classes.noOfWeeksText}
              >
                Number of weeks - {noOfWeeks} weeks
              </Typography>
            )}
          </LoadingOverlay>
        </DialogContent>

        <DialogActions>
          <Button
            variant="outlined"
            color="primary"
            onClick={props.handleClose}
            id="assortCreatePlanCancelBtn"
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={props.type === "copy" ? onCopyPlan : onCreatePlan}
            id="assortCreatePlanSavelBtn"
            color="primary"
            className={sharedClasses.smallPrimaryButton}
          >
            {props.type === "copy" ? "Copy" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
const mapStateToProps = (store) => {
  return {
    levels: store.assortsmartReducer.planDashboardReducer.planLevels,
    userAccessList:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.userAccessList,
    screenConfiguration:
      store.assortsmartReducer.commonAssortReducer.screenConfiguration,
    applicationCodesList: store.filterReducer.applicationCodesList,
  };
};
const mapActionsToProps = {
  addSnack,
  validatePlanAPI,
  createPlanAPI,
  getPlanLevels,
  setPlanLevels,
  getPlanDetails,
  copyAssortPlan,
  getBopTagData,
  setBopTagData,
  getAllFilters,
  getSeasonOptions,
  refreshPlans,
  setOmniLoader,
  getStoreChannels,
  createCoreChoiceConfiguration,
  getCoreChoiceTableData,
  setCoreChoiceTableData,
  setCoreChoiceLoader,
  createClusterPlan,
  getClusterPlanDetails,
  setClusterPlanDetails,
  fetchClusterDashboardTableData,
  getCombinedFiltersValues,
};
export default connect(mapStateToProps, mapActionsToProps)(PlanModal);
