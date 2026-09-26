import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { makeStyles } from "@mui/styles";
import { isEmpty, cloneDeep } from "lodash";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import Loader from "core/Utils/Loader/loader";
import { setFilterConfiguration } from "core/actions/filterAction";
import { addSnack } from "core/actions/snackbarActions";
import { formattedFilterConfiguration } from "core/commonComponents/coreComponentScreen/utils";
import {
  IS_OVERRIDEN_CORE_BUTTON_WIDTH,
  IS_OVERRIDEN_CORE_BUTTON_PLACEMENT,
} from "core/constants";
import { useTranslation } from "impact-ui-v3";
import { ERROR_MESSAGE } from "../../constants-inventorysmart/stringConstants";
import {
  setDCTransferConfigurationLoader,
  setDCTransferConfigurationFilterConfiguration,
  setDCTransferConfigurationAppliedFilters,
  setDCTransferConfigurationTableName,
  resetDCTransferConfiguration,
  createDCTransferConfiguration,
  fetchDCTransferConfigurationFilterConfiguration,
} from "../../services-inventorysmart/DC-Transfer-Configuration/dc-transfer-configuration-service";
import {
  fetchFilterOptions,
  getFilterDimensions,
  displaySnackMessages,
} from "../inventorysmart-utility";
import {
  DC_TRANSFER_CONFIGURATION_FILTER_CONFIG_KEY,
  DC_TRANSFER_CONFIGURATION_FILTER_SCREEN_NAME,
} from "./constants";
import DCTransferConfigurationTable from "./components/DCTransferConfigurationTable";

const useStyles = makeStyles(() => ({
  contentContainer: {
    minHeight: "500px",
    paddingBottom: "150px",
  },
}));

const getConfigurationTableNameFromResponse = (response) =>
  response?.data?.data?.table_name || "";

const DCTransferConfiguration = (props) => {
  const { t } = useTranslation();
  const classes = useStyles();
  const filterScreenName =
    props.screenName || DC_TRANSFER_CONFIGURATION_FILTER_SCREEN_NAME;
  const [showTable, setShowTable] = useState(false);
  const [filterAppliedTrigger, setFilterAppliedTrigger] = useState(0);

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
        props.setDCTransferConfigurationLoader(true);
        const response =
          await props.fetchDCTransferConfigurationFilterConfiguration();
        props.setDCTransferConfigurationFilterConfiguration(
          response?.data?.data || []
        );
      } catch (error) {
        handleErrorMessage(error);
      } finally {
        props.setDCTransferConfigurationLoader(false);
      }
    };

    const loadInitialData = async () => {
      try {
        if (
          props?.filterDashboardConfiguration?.filterConfig?.[0]
            ?.originalFilterDashboardData
        ) {
          props.setDCTransferConfigurationFilterConfiguration(
            props.filterDashboardConfiguration.filterConfig[0]
              .originalFilterDashboardData
          );
        } else {
          await getInitialFilterConfiguration();
        }
      } catch (error) {
        handleErrorMessage(error);
        props.setDCTransferConfigurationLoader(false);
      }
    };

    loadInitialData();

    return () => {
      props.resetDCTransferConfiguration();
    };
  }, [props.module]);

  useEffect(() => {
    const loadFilterOptions = async () => {
      if (
        isEmpty(props.filterDashboardConfiguration) &&
        !isEmpty(props.dcTransferConfigurationFilterConfiguration)
      ) {
        props.setDCTransferConfigurationLoader(true);
        try {
          const requiredFilterObjParams = {
            allFilters: cloneDeep(props.dcTransferConfigurationFilterConfiguration),
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
            DC_TRANSFER_CONFIGURATION_FILTER_CONFIG_KEY,
            filterConfigData,
            filterScreenName
          );

          props.setFilterConfiguration(filterConfig);
        } catch (error) {
          handleErrorMessage(error);
        } finally {
          props.setDCTransferConfigurationLoader(false);
        }
      }
    };

    loadFilterOptions();
  }, [
    props.dcTransferConfigurationFilterConfiguration,
    props.savedFilterSelection,
  ]);

  const applyFilters = async (dependencyData) => {
    try {
      props.setDCTransferConfigurationLoader(true);
      props.setDCTransferConfigurationAppliedFilters({
        filters: dependencyData || [],
      });

      const creationResponse = await props.createDCTransferConfiguration({
        filters: dependencyData || [],
        is_dc_transfer_configured: true,
      });

      if (!creationResponse?.data?.status) {
        displaySnackMessages(
          creationResponse?.data?.message || ERROR_MESSAGE,
          "error",
          props
        );
        setShowTable(false);
        props.setDCTransferConfigurationTableName("");
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
        props.setDCTransferConfigurationTableName("");
        return;
      }

      props.setDCTransferConfigurationTableName(tableName);
      setShowTable(true);
      setFilterAppliedTrigger((prev) => prev + 1);
    } catch (error) {
      handleErrorMessage(error);
      setShowTable(false);
      props.setDCTransferConfigurationTableName("");
    } finally {
      props.setDCTransferConfigurationLoader(false);
    }
  };

  const onFilterDashboardClick = (dependencyData) => {
    applyFilters(dependencyData);
  };

  return (
    <div style={{ marginTop: IS_OVERRIDEN_CORE_BUTTON_PLACEMENT }}>
      <CoreComponentScreen
        IscoreButtonWidth={IS_OVERRIDEN_CORE_BUTTON_WIDTH}
        showFilterDashboard={true}
        filterConfigKey={DC_TRANSFER_CONFIGURATION_FILTER_CONFIG_KEY}
        onApplyFilter={onFilterDashboardClick}
        contained={false}
        screenName={filterScreenName}
        autoHideFilterButton={true}
      >
        <Loader loader={props.dcTransferConfigurationLoader}>
          <div className={classes.contentContainer}>
            {showTable && props.configurationTableName ? (
              <DCTransferConfigurationTable
                key={props.configurationTableName}
                tableName={props.configurationTableName}
                filterAppliedTrigger={filterAppliedTrigger}
              />
            ) : null}
          </div>
        </Loader>
      </CoreComponentScreen>
    </div>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer, filterReducer } = store;
  return {
    dcTransferConfigurationLoader:
      inventorysmartReducer?.dcTransferConfigurationService?.loader,
    dcTransferConfigurationFilterConfiguration:
      inventorysmartReducer?.dcTransferConfigurationService?.filterConfiguration,
    configurationTableName:
      inventorysmartReducer?.dcTransferConfigurationService
        ?.configurationTableName,
    filterDashboardConfiguration:
      filterReducer.filterDashboardConfiguration[
        DC_TRANSFER_CONFIGURATION_FILTER_CONFIG_KEY
      ],
    savedFilterSelection: filterReducer.savedFilterSelection,
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
  setDCTransferConfigurationLoader: (payload) =>
    dispatch(setDCTransferConfigurationLoader(payload)),
  setDCTransferConfigurationFilterConfiguration: (payload) =>
    dispatch(setDCTransferConfigurationFilterConfiguration(payload)),
  setDCTransferConfigurationAppliedFilters: (payload) =>
    dispatch(setDCTransferConfigurationAppliedFilters(payload)),
  setDCTransferConfigurationTableName: (payload) =>
    dispatch(setDCTransferConfigurationTableName(payload)),
  resetDCTransferConfiguration: () =>
    dispatch(resetDCTransferConfiguration()),
  setFilterConfiguration: (payload) =>
    dispatch(setFilterConfiguration(payload)),
  createDCTransferConfiguration: (payload) =>
    dispatch(createDCTransferConfiguration(payload)),
  fetchDCTransferConfigurationFilterConfiguration: () =>
    dispatch(fetchDCTransferConfigurationFilterConfiguration()),
});

export default connect(mapStateToProps, mapDispatchToProps)(DCTransferConfiguration);
