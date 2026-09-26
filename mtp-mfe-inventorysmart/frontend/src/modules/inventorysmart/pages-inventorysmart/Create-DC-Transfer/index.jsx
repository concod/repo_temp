import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom-v5-compat";
import { connect } from "react-redux";
import { makeStyles } from "@mui/styles";
import { isEmpty, cloneDeep } from "lodash";
import { Stepper, Button } from "impact-ui-v3";
import globalStyles from "core/Styles/globalStyles";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import Loader from "core/Utils/Loader/loader";
import { setFilterConfiguration } from "core/actions/filterAction";
import { addSnack } from "core/actions/snackbarActions";
import { formattedFilterConfiguration } from "core/commonComponents/coreComponentScreen/utils";
import {
  IS_OVERRIDEN_CORE_BUTTON_WIDTH,
} from "core/constants";
import { useTranslation } from "impact-ui-v3";
import { ERROR_MESSAGE } from "../../constants-inventorysmart/stringConstants";
import {
  CREATE_DC_TRANSFER,
  DASHBOARD,
} from "../../constants-inventorysmart/routesConstants";
import {
  setCreateDcTransferLoader,
  setCreateDcTransferFilterConfiguration,
  setCreateDcTransferAppliedFilters,
  setCreateDcTransferFiltersApplied,
  setCreateDcTransferConfigurationTableName,
  resetCreateDcTransfer,
} from "../../services-inventorysmart/Create-DC-Transfer/create-dc-transfer-service";
import {
  createDCTransferConfiguration,
} from "../../services-inventorysmart/DC-Transfer-Configuration/dc-transfer-configuration-service";
import {
  fetchFilterConfig,
  fetchFilterOptions,
  getFilterDimensions,
  displaySnackMessages,
} from "../inventorysmart-utility";
import {
  CREATE_DC_TRANSFER_FILTER_CONFIG_KEY,
  CREATE_DC_TRANSFER_FILTER_SCREEN_NAME,
} from "./constants";
import CreateDcTransferConfigurationTable from "./components/CreateDcTransferConfigurationTable";
import DcTransferOptimizationScreen from "./components/DcTransferOptimizationScreen";
import { calculateDcTransferOptimizationDetails } from "./optimizationUtils";

const useStyles = makeStyles(() => ({
  filterSection: {
    marginTop: "-44px",
  },
  contentContainer: {
    minHeight: "400px",
    paddingTop: "16px",
  },
  stepperRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginTop: "4px",
    marginBottom: "8px",
  },
  stepperContainer: {
    width: "100%",
    maxWidth: "720px",
  },
  placeholderStep: {
    minHeight: "400px",
    paddingTop: "16px",
  },
  stickyFooterRight: {
    justifyContent: "flex-end",
    gap: "16px",
    padding: "16px 24px",
  },
}));

const getConfigurationTableNameFromResponse = (response) =>
  response?.data?.data?.table_name || "";

const CreateDcTransfer = (props) => {
  const { t } = useTranslation();
  const classes = useStyles();
  const globalClasses = globalStyles();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const filterScreenName = CREATE_DC_TRANSFER_FILTER_SCREEN_NAME;
  const activeStep = parseInt(searchParams.get("step"), 10) || 0;
  const [showTable, setShowTable] = useState(false);
  const [filterAppliedTrigger, setFilterAppliedTrigger] = useState(0);
  const [selectedRows, setSelectedRows] = useState([]);
  const [showOptimizationScreen, setShowOptimizationScreen] = useState(false);
  const [optimizationDetails, setOptimizationDetails] = useState({
    products: 0,
    stores: 0,
    days: 0,
    dataPoints: "-",
  });

  const breadcrumbsList = [
    {
      label: "Home",
      to: "/home",
    },
    {
      label: "Create DC Transfer",
    },
  ];

  const steps = [
    {
      label: "Select product & set configuration",
    },
    {
      label: "Transfer recommendations",
    },
  ];

  const handleErrorMessage = (error) => {
    const errObj = error?.response?.data;
    if (errObj?.show_message) {
      displaySnackMessages(errObj?.message, "error", props);
    } else {
      displaySnackMessages(ERROR_MESSAGE, "error", props);
    }
  };

  useEffect(() => {
    const getInitialFilterConfiguration = async () => {
      try {
        props.setCreateDcTransferLoader(true);
        const response = await fetchFilterConfig(filterScreenName);
        props.setCreateDcTransferFilterConfiguration(response);
      } catch (error) {
        handleErrorMessage(error);
      } finally {
        props.setCreateDcTransferLoader(false);
      }
    };

    const loadInitialData = async () => {
      try {
        if (
          props?.filterDashboardConfiguration?.filterConfig?.[0]
            ?.originalFilterDashboardData
        ) {
          props.setCreateDcTransferFilterConfiguration(
            props.filterDashboardConfiguration.filterConfig[0]
              .originalFilterDashboardData
          );
        } else {
          await getInitialFilterConfiguration();
        }
      } catch (error) {
        handleErrorMessage(error);
        props.setCreateDcTransferLoader(false);
      }
    };

    loadInitialData();

    return () => {
      props.resetCreateDcTransfer();
    };
  }, [props.module]);

  useEffect(() => {
    const loadFilterOptions = async () => {
      if (
        isEmpty(props.filterDashboardConfiguration) &&
        !isEmpty(props.createDcTransferFilterConfiguration)
      ) {
        props.setCreateDcTransferLoader(true);
        try {
          const requiredFilterObjParams = {
            allFilters: cloneDeep(props.createDcTransferFilterConfiguration),
            appliedFilters: props.savedFilterSelection || [],
            current: [],
            rolesBasedAccess: props?.inventorysmartScreenConfig?.roleBasedAccess,
            screenName: filterScreenName,
            tenantFilterUamConfig: props?.tenantFilterUamConfig,
          };
          const response = await fetchFilterOptions(requiredFilterObjParams);

          const filterConfigData = [
            {
              filterDashboardData: response,
              expectedFilterDimensions: getFilterDimensions(response),
              isCrossDimensionFilter: true,
              screen_name: filterScreenName,
            },
          ];

          const filterConfig = formattedFilterConfiguration(
            CREATE_DC_TRANSFER_FILTER_CONFIG_KEY,
            filterConfigData,
            filterScreenName
          );

          props.setFilterConfiguration(filterConfig);
        } catch (error) {
          handleErrorMessage(error);
        } finally {
          props.setCreateDcTransferLoader(false);
        }
      }
    };

    loadFilterOptions();
  }, [
    props.createDcTransferFilterConfiguration,
    props.savedFilterSelection,
  ]);

  const applyFilters = async (dependencyData) => {
    if (activeStep === 1) {
      props.setCreateDcTransferAppliedFilters({
        filters: dependencyData || [],
      });
      props.setCreateDcTransferFiltersApplied(true);
      return;
    }

    try {
      props.setCreateDcTransferLoader(true);
      props.setCreateDcTransferAppliedFilters({
        filters: dependencyData || [],
      });

      const creationResponse = await props.createDCTransferConfiguration({
        filters: dependencyData || [],
        is_dc_transfer_configured: false,
      });

      if (!creationResponse?.data?.status) {
        displaySnackMessages(
          creationResponse?.data?.message || ERROR_MESSAGE,
          "error",
          props
        );
        setShowTable(false);
        props.setCreateDcTransferConfigurationTableName("");
        props.setCreateDcTransferFiltersApplied(false);
        return;
      }

      const tableName = getConfigurationTableNameFromResponse(creationResponse);

      if (!tableName) {
        displaySnackMessages(
          t("inventorysmart.noTableConfigurationFoundForSelectedFilters"),
          "info",
          props
        );
        setShowTable(false);
        props.setCreateDcTransferConfigurationTableName("");
        props.setCreateDcTransferFiltersApplied(false);
        return;
      }

      props.setCreateDcTransferConfigurationTableName(tableName);
      props.setCreateDcTransferFiltersApplied(true);
      setShowTable(true);
      setFilterAppliedTrigger((prev) => prev + 1);
    } catch (error) {
      handleErrorMessage(error);
      setShowTable(false);
      props.setCreateDcTransferConfigurationTableName("");
      props.setCreateDcTransferFiltersApplied(false);
    } finally {
      props.setCreateDcTransferLoader(false);
    }
  };

  const onFilterDashboardClick = (dependencyData) => {
    applyFilters(dependencyData);
  };

  const handleSelectionChange = (selectedRowsData) => {
    setSelectedRows(selectedRowsData || []);
  };

  const clearAllData = () => {
    setShowTable(false);
    setFilterAppliedTrigger(0);
    setSelectedRows([]);
    setShowOptimizationScreen(false);
    setOptimizationDetails({
      products: 0,
      stores: 0,
      days: 0,
      dataPoints: "-",
    });
    props.resetCreateDcTransfer();
  };

  const handleCreateDcTransfer = async () => {
    if (!selectedRows.length) {
      return;
    }

    try {
      props.setCreateDcTransferLoader(true);

      // Create DC transfer API will be wired here later.
      setShowOptimizationScreen(true);
      setOptimizationDetails(
        calculateDcTransferOptimizationDetails(selectedRows)
      );
      displaySnackMessages(
        "DC transfer recommendation optimisation started. You will be notified once complete.",
        "success",
        props
      );
    } catch (error) {
      handleErrorMessage(error);
    } finally {
      props.setCreateDcTransferLoader(false);
    }
  };

  const handleCreateNewDcTransfer = () => {
    clearAllData();
    navigate(`${CREATE_DC_TRANSFER}?step=0`);
  };

  const handleReturnToDashboard = () => {
    clearAllData();
    navigate(DASHBOARD);
  };

  const hasAppliedFilterDependency =
    props.appliedFilters?.filters?.length > 0;

  const showPageBody =
    showTable &&
    props.configurationTableName &&
    hasAppliedFilterDependency;

  return (
    <div
      className={`${globalClasses.paddingAroundNew} ${globalClasses.mainContainerBody}`}
    >
      <div className={globalClasses.breadcrumbPadding}>
        <HeaderBreadCrumbs options={breadcrumbsList} />
      </div>
      {showOptimizationScreen ? (
        <DcTransferOptimizationScreen
          heading="Optimisation running for recommendation"
          description="It'll take several minutes. You'll get notification once optimisation is completed."
          primaryButtonLabel="Create new DC transfer"
          onPrimaryButtonClick={handleCreateNewDcTransfer}
          secondaryButtonLabel="Return to Dashboard"
          onSecondaryButtonClick={handleReturnToDashboard}
          optimizationData={optimizationDetails}
        />
      ) : (
        <>
          <div className={classes.filterSection}>
            <CoreComponentScreen
              IscoreButtonWidth={IS_OVERRIDEN_CORE_BUTTON_WIDTH}
              showFilterDashboard={true}
              filterConfigKey={CREATE_DC_TRANSFER_FILTER_CONFIG_KEY}
              onApplyFilter={onFilterDashboardClick}
              contained={false}
              screenName={filterScreenName}
              autoHideFilterButton={true}
            >
              <Loader loader={props.createDcTransferLoader}>
                {showPageBody && (
                  <div
                    className={`${globalClasses.tabsContainerBody}`}
                    style={{
                      maxHeight: `calc(100vh - ${
                        260 - (props.isFilterStripVisible ? 0 : 60)
                      }px)`,
                    }}
                  >
                    <div className={classes.stepperRow}>
                      <div className={classes.stepperContainer}>
                        <Stepper steps={steps} activeStep={activeStep} />
                      </div>
                    </div>

                    {activeStep === 1 ? (
                      <div className={classes.placeholderStep} />
                    ) : (
                      <div className={classes.contentContainer}>
                        {showTable && props.configurationTableName && (
                          <CreateDcTransferConfigurationTable
                            key={props.configurationTableName}
                            tableName={props.configurationTableName}
                            filterAppliedTrigger={filterAppliedTrigger}
                            onSelectionChange={handleSelectionChange}
                          />
                        )}
                      </div>
                    )}
                  </div>
                )}
              </Loader>
            </CoreComponentScreen>
          </div>

          {showPageBody && showTable && activeStep === 0 && (
            <div
              className={`${globalClasses.stickyFooter} ${classes.stickyFooterRight}`}
            >
              <Button
                variant="primary"
                onClick={handleCreateDcTransfer}
                disabled={selectedRows.length === 0}
                size="large"
              >
                Create DC Transfer &gt;
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer, filterReducer } = store;
  return {
    createDcTransferLoader:
      inventorysmartReducer?.createDcTransferService?.loader,
    createDcTransferFilterConfiguration:
      inventorysmartReducer?.createDcTransferService?.filterConfiguration,
    appliedFilters:
      inventorysmartReducer?.createDcTransferService?.appliedFilters,
    configurationTableName:
      inventorysmartReducer?.createDcTransferService?.configurationTableName,
    filterDashboardConfiguration:
      filterReducer.filterDashboardConfiguration[
        CREATE_DC_TRANSFER_FILTER_CONFIG_KEY
      ],
    savedFilterSelection: filterReducer.savedFilterSelection,
    isFilterStripVisible: filterReducer.isFilterStripVisible,
    inventorysmartScreenConfig:
      inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig,
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer?.userRoleManagementReducer
        ?.tenantUamConfig?.filter_uam,
  };
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (snack) => dispatch(addSnack(snack)),
  setCreateDcTransferLoader: (payload) =>
    dispatch(setCreateDcTransferLoader(payload)),
  setCreateDcTransferFilterConfiguration: (payload) =>
    dispatch(setCreateDcTransferFilterConfiguration(payload)),
  setCreateDcTransferAppliedFilters: (payload) =>
    dispatch(setCreateDcTransferAppliedFilters(payload)),
  setCreateDcTransferFiltersApplied: (payload) =>
    dispatch(setCreateDcTransferFiltersApplied(payload)),
  setCreateDcTransferConfigurationTableName: (payload) =>
    dispatch(setCreateDcTransferConfigurationTableName(payload)),
  resetCreateDcTransfer: () => dispatch(resetCreateDcTransfer()),
  setFilterConfiguration: (payload) =>
    dispatch(setFilterConfiguration(payload)),
  createDCTransferConfiguration: (payload) =>
    dispatch(createDCTransferConfiguration(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(CreateDcTransfer);
