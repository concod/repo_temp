import { useEffect, useRef, useState } from "react";
import { Container, Typography, Paper } from "@mui/material";
import { connect } from "react-redux";
import AssortBreadCrumbs from "../assort-bread-crumbs";
import { useHistory } from "react-router";
import { configurePlanHierarchyLevels } from "../Plan-Dashboard/components/common-plan-functions";
import { getStoreChannels } from "modules/assortsmart/services-assortsmart/Clustering/Cluster-Input/cluster-input-service";
import { setScreenConfiguration } from "modules/assortsmart/services-assortsmart/common-assort-service";
import { getTenantConfigApplicationLevel } from "core/actions/tenantConfigActions";
import {
  getCoreChoiceTableColumns,
  getCoreChoiceTableData,
  setCoreChoiceLoader,
  setCoreChoiceTableColumns,
  setCoreChoiceTableData,
  createCoreChoiceFilters,
  DeleteCoreChoiceConfiguration,
} from "modules/assortsmart/services-assortsmart/CoreChoiceConfiguration/core-choice-configuration-service";
import {
  getSeasonOptions,
  getDashboardFilterLevels,
  getPlanLevels,
} from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import { Prompt } from "impact-ui";
import { isEmpty } from "lodash";
import {
  Dashboard,
  common,
} from "modules/assortsmart/constants-assortsmart/stringContants";
import { addSnack } from "core/actions/snackbarActions";
import {
  formatStringArray,
  getCoreChoiceFilterPayload,
  generateLevelJson,
} from "modules/assortsmart/utils-assortsmart/utilityFunctions";
import CoreChoiceConfigurationTable from "./all-door-choice-configuration-table";
import LoadinOverlay from "../../../../core/Utils/Loader/loader";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import globalStyles from "core/Styles/globalStyles";
import MappedUnmappedPlanModal from "./mapped-unmapped-plandetails-popup";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import DashboardActionButtons from "../Plan-Dashboard/components/dashboardActionButtons";
import { setFilterConfiguration } from "core/actions/filterAction";
import { formattedFilterConfiguration } from "core/commonComponents/coreComponentScreen/utils";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";

const CoreChoiceDashboard = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const [coreChoiceFilterConfig, setCoreChoiceFilterConfig] = useState([]);
  const [coreChoiceTableColumns, setCoreChoiceDashboardTableColumns] = useState(
    []
  );
  const [coreChoiceRTinstance, setCoreChoiceRTinstance] = useState([]);
  const [channelOptions, setChannelOptions] = useState([]);
  const [yearOptions, setYearOptions] = useState([]);
  const [showPlansPopup, setShowPlansPopup] = useState(false);
  const [planDetails, setPlanDetails] = useState([]);
  const [selectedPlans, setselectedPlans] = useState([]);
  const [showAllDoor, setShowAllDoor] = useState(true);
  const [mappedOrUnmapped, setMappedOrUnmapped] = useState("");
  const [showModal, setShowModal] = useState(false);
  const history = useHistory();
  const allDoorCCFilterRef = useRef({});

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const getCoreChoiceDashboardFilters = async () => {
    const levels = await configurePlanHierarchyLevels(
      "assort core choice dashboard filter"
    );
    const channels = await props.getStoreChannels();
    let filters = levels;
    filters.forEach((item) => {
      if (item.accessor === "channel") {
        item.options = formatStringArray(channels.data.data.channels);
        item.initialData = formatStringArray(channels.data.data.channels);
        setChannelOptions(formatStringArray(channels.data.data.channels));
      } else if (item.accessor === "year") {
        const optionsArray = formatStringArray(
          props.screenConfiguration?.dashboard?.assort_year_value || []
        );
        const currYear = new Date().getFullYear();
        const options = optionsArray.filter((item) => {
          return item.value >= currYear;
        });
        item.options = options;
        item.initialData = options;
        setYearOptions(options);
      }
    });
    if (isEmpty(props.filterDashboardConfiguration)) {
      const filterConfigData = [
        {
          filterSectionHeader: "All Door Choice Dashboard Filters",
          filterDashboardData: filters,
          isCrossDimensionFilter: true,
          onReset: onResetAllDoorChoice,
          screen_name: "All Door Choice"
        },
      ];
      const filterConfig = formattedFilterConfiguration(
        "assortAllDoorCCFilterConfiguration",
        filterConfigData,
        "All Door Choice"
      );
      props.setFilterConfiguration(filterConfig);
    }
    setCoreChoiceFilterConfig(filters);
  };

  useEffect(() => {
    getCoreChoiceDashboardFilters();
  }, [props.screenConfiguration]);

  const closePlansPopup = () => {
    setShowPlansPopup(false);
  };

  const handleMappedUnmappedPlans = (tableInfo) => {
    const mappedOrUnmappedColumn = tableInfo.column.column_name;
    const mappedOrUnmappedColumnLabel = tableInfo.column.headerName;
    const planName = tableInfo.cellData.data[mappedOrUnmappedColumn + "_plans"];
    setShowPlansPopup(true);
    setPlanDetails(planName);
    setMappedOrUnmapped(mappedOrUnmappedColumnLabel);
  };

  const onResetAllDoorChoice = async () => {
    props.setCoreChoiceLoader(true);
    props.setCoreChoiceTableData([]);
    const reqBody = {
      filters: [],
    };
    const coreChoiceData = await props.getCoreChoiceTableData(
      reqBody,
      props.screenConfiguration?.common?.endpoint_project_name || "assort"
    );
    props.setCoreChoiceTableData(coreChoiceData.data.data.data);
    props.setCoreChoiceLoader(false);
  };

  const fetchCoreChoiceTableData = async () => {
    props.setCoreChoiceTableData([]);
    const reqBody = {
      filters: [],
    };
    const coreChoiceData = await props.getCoreChoiceTableData(
      reqBody,
      props.screenConfiguration?.common?.endpoint_project_name || "assort"
    );
    props.setCoreChoiceTableData(coreChoiceData.data.data.data);
    props.setCoreChoiceLoader(false);
  };

  useEffect(() => {
    if (props.screenConfiguration?.common) {
      fetchCoreChoiceTableData();
    }
  }, [props.screenConfiguration]);

  const fetchCoreChoiceData = async () => {
    props.setCoreChoiceLoader(true);
    try {
      getCoreChoiceDashboardFilters();
      let configResp = await props.getTenantConfigApplicationLevel(2, {
        attribute_name: "assort_smart_screen_configuration",
      });
      if (configResp?.data?.status) {
        props.setScreenConfiguration(
          configResp?.data?.data?.[0]?.attribute_value
        );
      }
      const levels = await props.getPlanLevels();
      const levelsJson = generateLevelJson(levels?.data?.data);
      const columns = await props.getCoreChoiceTableColumns();
      let coreChoiceTableConfig = agGridColumnFormatter(
        columns.data.data,
        levelsJson
      );
      coreChoiceTableConfig.forEach((item) => {
        if (item.column_name === "mapped" || item.column_name === "unmapped") {
          //Added onclick function for mapped & unmapped plan columns to populate plan names in popup
          item.onClick = (tableInfo) => {
            handleMappedUnmappedPlans(tableInfo);
          };
          return item;
        }
      });
      setCoreChoiceDashboardTableColumns(coreChoiceTableConfig);
    } catch (error) {
      props.setCoreChoiceLoader(false);
      displaySnackMessages(
        "Fetching All-door choice configuration failed",
        "error"
      );
    }
  };

  const confirmDelete = async () => {
    props.setCoreChoiceLoader(true);
    let reqBody = {
      filters: [
        {
          attribute_name: "core_choice_id",
          value: selectedPlans.map((plan) => {
            return plan.core_choice_id;
          }),
          operator: "in",
        },
      ],
    };
    try {
      let res = {};

      res = await props.DeleteCoreChoiceConfiguration(
        reqBody,
        props.screenConfiguration?.common?.endpoint_project_name || "assort"
      );
      if (!res.data.status) {
        displaySnackMessages(
          "Unable to delete core choice configuration! Please try again",
          "error"
        );
      } else {
        displaySnackMessages(
          "Deleted core choice configuration successfully",
          "success"
        );
        setselectedPlans([]);
        setShowAllDoor(false);
        fetchCoreChoiceTableData();
      }
      props.setCoreChoiceLoader(false);
    } catch (error) {
      displaySnackMessages(
        "Unable to delete core choice configuration! Please try again",
        "error"
      );
    }
    props.setCoreChoiceLoader(false);
    setShowModal(false);
  };

  const onPlansDelete = async () => {
    //if no plans are selected, throw an error
    if (selectedPlans.length === 0) {
      displaySnackMessages(
        "Please select atleast one or more plans to delete",
        "error"
      );
      return;
    }
    setShowModal(true);
  };

  const closeDeleteConfirmPopUp = () => {
    setShowModal(false);
  };

  useEffect(() => {
    fetchCoreChoiceData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onFilterDashboardClick = (dependencyData) => {
    const filterData = {};
    dependencyData.forEach((data) => {
      filterData[data.filter_id] = data.values[0];
    });
    allDoorCCFilterRef.current = filterData;
    onCoreChoiceFilter();
  };

  const onCoreChoiceFilter = async () => {
    try {
      const filterPayload = getCoreChoiceFilterPayload(
        allDoorCCFilterRef.current
      );
      const reqBody = {
        filters: filterPayload,
      };
      props.setCoreChoiceTableData([]);
      const coreChoiceData = await props.getCoreChoiceTableData(
        reqBody,
        props.screenConfiguration?.common?.endpoint_project_name || "assort"
      );
      props.setCoreChoiceTableData(coreChoiceData.data.data.data);
    } catch (error) {
      props.setCoreChoiceLoader(false);
      displaySnackMessages("Fetching All-door choice data failed", "error");
    }
  };
  let styleOrChoice =
    props.screenConfiguration?.common?.plan_step_names_assort?.["2.2"] ===
    "Depth & Style"
      ? "Style"
      : "choice";

  return (
    <>
      <AssortBreadCrumbs planStep={0} location={history.location.pathname} />
      <Container maxWidth={false}>
        <div className={classes.root}>
          <CoreComponentScreen
            showFilterDashboard={true}
            filterConfigKey={"assortAllDoorCCFilterConfiguration"}
            onApplyFilter={onFilterDashboardClick}
            hideSavedFilterMsg={true}
            resetFilterChips={true}
            noUAMFilterDependency={true}
          />
        </div>
        <div>
          {coreChoiceTableColumns.length > 0 && (
            <>
              {showModal ? (
                <Prompt
                  isOpen={showModal}
                  title={Dashboard.__delete_confirm_header}
                  subHeading={Dashboard.__delete_confirm_text}
                  infoList={[]}
                  primaryButtonProps={{
                    children: common.__ConfirmBtnText,
                    onClick: () => confirmDelete(),
                  }}
                  tertiaryButtonProps={{
                    children: common.__RejectBtnText,
                    onClick: () => closeDeleteConfirmPopUp(),
                  }}
                  variant="error"
                />
              ) : null}

              <LoadinOverlay loader={props.loader}>
                <Paper elevation={3} className={globalClasses.paper}>
                  <div
                    className={`${classes.resultContainer} ${classes.typographyMarginBottom}`}
                  >
                    <Typography variant="h3">
                      All-door {styleOrChoice}
                    </Typography>
                    <DashboardActionButtons
                      filterData={coreChoiceFilterConfig}
                      selectedPlans={selectedPlans}
                      confirmDelete={confirmDelete}
                      onPlansDelete={onPlansDelete}
                    />
                  </div>
                  <CoreChoiceConfigurationTable
                    coreChoiceColumns={coreChoiceTableColumns}
                    coreChoiceTableData={props.coreChoiceTableData}
                    RTinstance={coreChoiceRTinstance}
                    setRTinstance={setCoreChoiceRTinstance}
                    setselectedPlans={setselectedPlans}
                    selectedPlans={selectedPlans}
                    showAllDoor={showAllDoor}
                    setShowAllDoor={setShowAllDoor}
                  />
                </Paper>
              </LoadinOverlay>
            </>
          )}
        </div>
        {showPlansPopup && (
          <MappedUnmappedPlanModal
            mappedOrUnmappedPlanDetails={planDetails}
            showPlansPopup={showPlansPopup}
            closeModal={closePlansPopup}
            mappedOrUnmapped={mappedOrUnmapped}
          />
        )}
      </Container>
    </>
  );
};

const mapStateToProps = (state) => {
  return {
    loader:
      state.assortsmartReducer.coreChoiceConfigurationReducer.coreChoiceLoading,
    coreChoiceTableData:
      state.assortsmartReducer.coreChoiceConfigurationReducer
        .coreChoiceTableData,
    userAccessList:
      state.tenantUserRoleMgmtReducer.userRoleManagementReducer.userAccessList,
    screenConfiguration:
      state.assortsmartReducer.commonAssortReducer.screenConfiguration,
    filterDashboardConfiguration:
      state.filterReducer.filterDashboardConfiguration[
        "assortAllDoorCCFilterConfiguration"
      ],
  };
};

const mapActionsToProps = {
  getCoreChoiceTableColumns,
  getCoreChoiceTableData,
  createCoreChoiceFilters,
  setCoreChoiceLoader,
  setCoreChoiceTableColumns,
  setCoreChoiceTableData,
  addSnack,
  getStoreChannels,
  getSeasonOptions,
  getDashboardFilterLevels,
  getTenantConfigApplicationLevel,
  setScreenConfiguration,
  getPlanLevels,
  setFilterConfiguration,
  DeleteCoreChoiceConfiguration,
};

export default connect(mapStateToProps, mapActionsToProps)(CoreChoiceDashboard);
