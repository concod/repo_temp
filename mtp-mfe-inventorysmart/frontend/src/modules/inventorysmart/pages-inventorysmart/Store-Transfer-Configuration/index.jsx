import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import { Typography, Box, Paper, Grid } from "@mui/material";
import { makeStyles } from "@mui/styles";
import globalStyles from "core/Styles/globalStyles";
import { Button, useTranslation } from "impact-ui-v3";
import Loader from "core/Utils/Loader/loader";
import { addSnack } from "core/actions/snackbarActions";
import { isEmpty, cloneDeep, isNull } from "lodash";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import { setFilterConfiguration } from "core/actions/filterAction";
import StoreTransferConfigTable from "./components/StoreTransferConfigTable";
import { IS_OVERRIDEN_CORE_BUTTON_WIDTH,IS_OVERRIDEN_CORE_BUTTON_PLACEMENT } from "core/constants";

import {
  setStoreTransferConfigLoader,
  setStoreTransferConfigData,
  resetStoreTransferConfig,
  setStoreTransferFilterConfiguration,
  saveStoreTransferFiltersState,
  getStoreTransferList,
  saveStoreTransferConfiguration,
  setStoreTransferSetAll,
  setStoreTransferModuleConfig,
} from "../../services-inventorysmart/Store-Transfer-Configuration/store-transfer-configuration-service";

import {
  fetchFilterConfig,
  fetchFilterOptions,
  getFilterDimensions,
  getActiveFilterCustomDependency,
  displaySnackMessages,
} from "../inventorysmart-utility";

import { formattedFilterConfiguration } from "core/commonComponents/coreComponentScreen/utils";

import {
  ERROR_MESSAGE,
  tableConfigurationMetaData,
  STORE_TRANSFER_CONFIG_CACHE,
} from "../../constants-inventorysmart/stringConstants";

import { setKeyValueInCache } from "../../services-inventorysmart/active-module-common-service";
import { getModuleBasedTenantConfig } from "../../services-inventorysmart/common/inventory-smart-common-services";

const useStyles = makeStyles(() => ({
  stickyFooterRight: {
    justifyContent: "flex-end",
    padding: "16px 24px",
  },
  contentContainer: {
    minHeight: "500px",
    paddingBottom: "150px",
  },
}));

function StoreTransferConfiguration(props) {
  const { t } = useTranslation();
  const globalClasses = globalStyles();
  const classes = useStyles();
  const [tableName, setTableName] = useState("");
  const [showTable, setShowTable] = useState(false);
  const [editedRows, setEditedRows] = useState(new Map());
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [filterAppliedTrigger, setFilterAppliedTrigger] = useState(0);

  const storeTransferConfig = props.storeTransferModuleConfig?.store_transfer_config;
  const uniqueRowIdentifierKey = storeTransferConfig?.uniqueRowIdentifierKey || "article";

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) {
      displaySnackMessages(errObj?.message, "error", props);
    } else {
      displaySnackMessages(ERROR_MESSAGE, "error", props);
    }
  };

  // Fetch module-based tenant configuration
  useEffect(() => {
    const fetchModuleConfigs = async () => {
      // Skip if config already exists
      if (props.storeTransferModuleConfig) {
        return;
      }

      try {
        props.setStoreTransferConfigLoader(true);

        let response = null;
        if (
          props.cache[STORE_TRANSFER_CONFIG_CACHE] &&
          props.cache[STORE_TRANSFER_CONFIG_CACHE]["store-transfer-config"]
        ) {
          response =
            props.cache[STORE_TRANSFER_CONFIG_CACHE]["store-transfer-config"];
        } else {
          response = await props.getModuleBasedTenantConfig({
            module_name: "store-transfer-config",
            screen_name: props.screenName,
          });
          props.setKeyValueInCache({
            key: "store-transfer-config",
            value: response,
            module: STORE_TRANSFER_CONFIG_CACHE,
            persist: true,
          });
        }
        props.setStoreTransferModuleConfig(response);
      } catch (e) {
        handleErrorMessage(e);
      } finally {
        props.setStoreTransferConfigLoader(false);
      }
    };
    fetchModuleConfigs();
  }, []);

  useEffect(() => {
    const getInitialFilterConfiguration = async () => {
      try {
        props.setStoreTransferConfigLoader(true);
        let response = await fetchFilterConfig(props.screenName);
        props.setStoreTransferFilterConfiguration(response);
        props.setStoreTransferConfigLoader(false);
      } catch (e) {
        props.setStoreTransferConfigLoader(false);
        handleErrorMessage(e);
      }
    };

    const loadInitialData = async () => {
      try {
        if (
          props?.filterDashboardConfiguration?.filterConfig?.[0]
            ?.originalFilterDashboardData
        ) {
          props.setStoreTransferFilterConfiguration(
            props.filterDashboardConfiguration.filterConfig[0]
              .originalFilterDashboardData
          );
        } else {
          await getInitialFilterConfiguration();
        }
      } catch (error) {
        displaySnackMessages(ERROR_MESSAGE, "error", props);
        props.setStoreTransferConfigLoader(false);
      }
    };

    loadInitialData();

    return () => {
      props.resetStoreTransferConfig();
    };
  }, [props.module]);

  useEffect(() => {
    const onLoad = async () => {
      if (
        isEmpty(props.filterDashboardConfiguration) &&
        !isEmpty(props.storeTransferFilterConfiguration)
      ) {
        props.setStoreTransferConfigLoader(true);
        const getFilterValues = async (selected, current) => {
          try {
            let requiredFilterObjParams = {
              allFilters: cloneDeep(props.storeTransferFilterConfiguration),
              appliedFilters: selected || [],
              current: current || [],
              rolesBasedAccess:
                props?.inventorysmartScreenConfig?.roleBasedAccess,
              screenName: props.screenName,
              tenantFilterUamConfig: props?.tenantFilterUamConfig,
            };
            const response = await fetchFilterOptions(requiredFilterObjParams);

            const filterDataWithCustomFilter = response;

            const filterConfigData = [
              {
                filterDashboardData: filterDataWithCustomFilter,
                expectedFilterDimensions: getFilterDimensions(
                  filterDataWithCustomFilter
                ),
                isCrossDimensionFilter: true,
                screen_name: props.screenName,
              },
            ];

            const filterConfig = formattedFilterConfiguration(
              "storeTransferFilterConfiguration",
              filterConfigData,
              props.screenName
            );

            props.setFilterConfiguration(filterConfig);

            props.setStoreTransferConfigLoader(false);
          } catch (e) {
            props.setStoreTransferConfigLoader(false);
            handleErrorMessage(e);
          }
        };

        getFilterValues(props.savedFilterSelection);
      }
    };

    onLoad();
  }, [props.storeTransferFilterConfiguration, props.savedFilterSelection]);

  const applyFilters = async (_filterElements, dependency, filterDates) => {
    try {
      props.setStoreTransferConfigLoader(true);

      let selectedFilters = {
        filters: dependency || [],
      };

      props.saveStoreTransferFiltersState(selectedFilters);

      const requestBody = {
        filters: dependency || [],
        store_store_transfer_flow: false,
      };

      const listResponse = await props.getStoreTransferList(requestBody);

      if (!listResponse?.data?.data?.table_name) {
        displaySnackMessages(
          t("inventorysmart.noTableConfigurationFoundForSelectedFilters"),
          "info",
          props
        );
        props.setStoreTransferConfigLoader(false);
        return;
      }

      const tableNameFromAPI = listResponse?.data?.data?.table_name;
      setTableName(tableNameFromAPI);
      setShowTable(true);

      setFilterAppliedTrigger((prev) => prev + 1);

      props.setStoreTransferConfigLoader(false);
    } catch (e) {
      props.setStoreTransferConfigLoader(false);
      handleErrorMessage(e);
    }
  };

  const onFilterDashboardClick = (dependencyData, filterData) => {
    applyFilters(filterData, dependencyData);
  };

  const getCustomDependencyFilter = async (dependency) => {
    return getActiveFilterCustomDependency(dependency, "active", "product");
  };

  const handleSave = async () => {
    try {
      props.setStoreTransferConfigLoader(true);

      if (editedRows.size > 0) {
        const setAllPromises = Array.from(editedRows.values()).map(
          async (editedRow) => {
            const rowIdentifier = editedRow[uniqueRowIdentifierKey];
            const { changes } = editedRow;

            const storeTransferAttributes = Object.entries(changes).map(
              ([columnName, value]) => {
                let attributeName = columnName;
                let attributeValue = value;
                if (columnName === "transfer_rule") {
                  attributeName = "transfer_rule_id";
                }

                return {
                  attribute_name: attributeName,
                  attribute_value: attributeValue,
                };
              }
            );

            const payload = {
              meta: {
                ...tableConfigurationMetaData.meta,
                limit: { limit: 10, page: 1 },
              },
              filters:
                props?.filterDashboardConfiguration?.appliedFilterData
                  ?.dependencyData || [],
              excluded_rows: [],
              row_update: [rowIdentifier],
              store_transfer: [storeTransferAttributes],
              table_name: tableName,
            };

            return props.setStoreTransferSetAll(payload);
          }
        );

        const setAllResults = await Promise.allSettled(setAllPromises);

        const failedCalls = setAllResults.filter(
          (result) =>
            result?.status === "rejected" || !result?.value?.data?.status
        );

        if (failedCalls.length > 0) {
          displaySnackMessages(
            t("inventorysmart.failedToUpdateRows", {
              count: failedCalls.length,
            }),
            "error",
            props
          );
          props.setStoreTransferConfigLoader(false);
          return;
        }

        displaySnackMessages(
          setAllResults?.[0]?.value?.data?.message ||
            t("inventorysmart.storeTransferConfigurationUpdatedSuccessfully"),
          "success",
          props
        );
      }
      const savePayload = {
        filters:
          props?.filterDashboardConfiguration?.appliedFilterData
            ?.dependencyData || [],
        meta: {
          ...tableConfigurationMetaData.meta,
          limit: { limit: 10, page: 1 },
        },
        table_name: tableName,
      };
      const saveResponse = await props.saveStoreTransferConfiguration(
        savePayload
      );
      if (saveResponse?.data?.status) {
        displaySnackMessages(
          saveResponse?.data?.message ||
            t("inventorysmart.storeTransferConfigurationSavedSuccessfully"),
          "success",
          props
        );

        setEditedRows(new Map());
        setRefreshTrigger((prev) => prev + 1);
      } else {
        displaySnackMessages(
          saveResponse?.data?.message ||
            t("inventorysmart.failedToSaveConfiguration"),
          "error",
          props
        );
        props.setStoreTransferConfigLoader(false);
        return;
      }
    } catch (error) {
      handleErrorMessage(error);
    } finally {
      props.setStoreTransferConfigLoader(false);
    }
  };

  return (
    <div style={{marginTop:IS_OVERRIDEN_CORE_BUTTON_PLACEMENT}}>
    <CoreComponentScreen
      IscoreButtonWidth = {IS_OVERRIDEN_CORE_BUTTON_WIDTH}
      showFilterDashboard={true}
      filterConfigKey="storeTransferFilterConfiguration"
      onApplyFilter={onFilterDashboardClick}
      contained={false}
      customDependencyValue={getCustomDependencyFilter}
      screenName={props.screenName}
    >
      <Loader loader={props.storeTransferConfigLoader}>
        <div className={classes.contentContainer}>
          {showTable && (
            <StoreTransferConfigTable
              tableName={tableName}
              filters={
                props?.filterDashboardConfiguration?.appliedFilterData
                  ?.dependencyData
              }
              onEditedRowsChange={setEditedRows}
              refreshTrigger={refreshTrigger}
              filterAppliedTrigger={filterAppliedTrigger}
              uniqueRowIdentifierKey={uniqueRowIdentifierKey}
              storeTransferConfig={storeTransferConfig}
            />
          )}
        </div>
      </Loader>

      {showTable && (
        <div
          className={`${globalClasses.stickyFooter} ${classes.stickyFooterRight}`}
        >
          <Button variant="primary" onClick={handleSave} size="large">
             {t("inventorysmart.save")}
          </Button>
        </div>
      )}
    </CoreComponentScreen>
    </div>
  );
}

const mapStateToProps = (store) => {
  const { inventorysmartReducer, filterReducer } = store;
  return {
    storeTransferConfigLoader:
      inventorysmartReducer?.storeTransferConfigurationService
        ?.storeTransferConfigLoader,
    storeTransferFilterConfiguration:
      inventorysmartReducer?.storeTransferConfigurationService
        ?.storeTransferFilterConfiguration,
    filterDashboardConfiguration:
      filterReducer.filterDashboardConfiguration[
        "storeTransferFilterConfiguration"
      ],
    savedFilterSelection: filterReducer.savedFilterSelection,
    inventorysmartModulesPermission:
      inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
    inventorysmartScreenConfig:
      inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig,
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer?.userRoleManagementReducer
        ?.tenantUamConfig?.filter_uam,
    storeTransferModuleConfig:
      inventorysmartReducer?.storeTransferConfigurationService
        ?.storeTransferModuleConfig,
    cache: store.inventorysmartReducer?.activeModulesCacheService?.cache,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    setStoreTransferConfigLoader: (payload) =>
      dispatch(setStoreTransferConfigLoader(payload)),
    setStoreTransferConfigData: (payload) =>
      dispatch(setStoreTransferConfigData(payload)),
    resetStoreTransferConfig: () => dispatch(resetStoreTransferConfig()),
    setStoreTransferFilterConfiguration: (payload) =>
      dispatch(setStoreTransferFilterConfiguration(payload)),
    saveStoreTransferFiltersState: (payload) =>
      dispatch(saveStoreTransferFiltersState(payload)),
    setFilterConfiguration: (filterConfiguration) =>
      dispatch(setFilterConfiguration(filterConfiguration)),
    getStoreTransferList: (payload) => dispatch(getStoreTransferList(payload)),
    saveStoreTransferConfiguration: (payload) =>
      dispatch(saveStoreTransferConfiguration(payload)),
    setStoreTransferSetAll: (payload) =>
      dispatch(setStoreTransferSetAll(payload)),
    setStoreTransferModuleConfig: (payload) =>
      dispatch(setStoreTransferModuleConfig(payload)),
    getModuleBasedTenantConfig: (payload) =>
      dispatch(getModuleBasedTenantConfig(payload)),
    setKeyValueInCache: (payload) => dispatch(setKeyValueInCache(payload)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(StoreTransferConfiguration);
