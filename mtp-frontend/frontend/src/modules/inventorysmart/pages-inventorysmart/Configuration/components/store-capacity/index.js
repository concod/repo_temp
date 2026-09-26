import { useEffect, useState } from "react";
import { connect } from "react-redux";
import {
  getFilterConfiguration,
  setInventorysmartFilterLoader,
  setIsFiltersValid,
} from "modules/inventorysmart/services-inventorysmart/Decision-Dashboard/decision-dashboard-services";
import Loader from "core/Utils/Loader/loader";

import { addSnack } from "core/actions/snackbarActions";
import { cloneDeep, isEmpty } from "lodash";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import { formattedFilterConfiguration } from "core/commonComponents/coreComponentScreen/utils";
import { setFilterConfiguration } from "core/actions/filterAction";
import {
  fetchFilterConfig,
  filtersPayload,
  fetchFilterOptions,
  getFilterDimensions,
} from "../../../inventorysmart-utility";
import ConstraintsTables from "./capacity-table";
import {
  APP_NAME,
  ERROR_MESSAGE,
  FULL_ACCESS_PERMISSIONS_LIST,
  ROLES_ACCESS_MODULES_MAPPING,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  setInventorySmartModulesPermissions,
} from "modules/inventorysmart/services-inventorysmart/common/inventory-smart-common-services";
import {
  setStoreCapacityFilterDependency,
  setStoreCapacityLoader,
} from "modules/inventorysmart/services-inventorysmart/Store-Capacity/store-capacity-services";
import { getModuleLevelAccessUtility } from "core/actions/userAccessActions";

const StoreAllocation = (props) => {
  const [filters, setFilters] = useState([]);
  const [filterDependency, setFilterDependency] = useState([]);
  const [filterPayload, setFilterPayload] = useState([]);
  const [isFiltersValid, updateIsFiltersValid] = useState(false);

  const onFilterDashboard = async (elements, dependency) => {
    const payload = filtersPayload(elements, dependency, true);
    payload.reqBody = payload.reqBody.filter(
      (item) =>
        ["sale_type", "store_capacity"].indexOf(item.attribute_name) === -1
    );

    setFilterPayload(dependency);
    updateIsFiltersValid(payload.isValid);
  };

  useEffect(() => {
    if (props.inventorysmartScreenConfig) {
      const fetchModulesAccess = async () => {
        try {
          // props.setInventorySmartPermissionLoader(true);
          props.setStoreCapacityLoader(true);
          // props.module is fetched  from routes
          const moduleName = props?.module;
          const subModules = ROLES_ACCESS_MODULES_MAPPING[props?.module] || [];

          let rolesBasedModulesPermission = {};

          // identifying if its for vb or signet
          if (props.inventorysmartScreenConfig.roleBasedAccess) {
            let accessDataResponse = await getModuleLevelAccessUtility({
              app: APP_NAME,
              module: subModules,
            })();
            rolesBasedModulesPermission = Object.fromEntries(
              Object.entries(accessDataResponse).map(([module, actions]) => [
                module,
                Object.keys(actions),
              ])
            );
          } else {
            subModules.map(async (subModule) => {
              rolesBasedModulesPermission[
                subModule
              ] = FULL_ACCESS_PERMISSIONS_LIST;
            });
          }
          props?.setInventorySmartModulesPermissions({
            [moduleName]: rolesBasedModulesPermission,
          });
        } catch (error) {
          displaySnackMessages(ERROR_MESSAGE, "error");
        } finally {
          props.setStoreCapacityLoader(false);
        }
      };
      fetchModulesAccess();
    }
  }, [props.inventorysmartScreenConfig]);

  useEffect(() => {
    const fetchData = async () => {
      props.setStoreCapacityLoader(true);
      try {
        //fetch the filter levels
        let response = await fetchFilterConfig("store_capacity_configuration");
        setFilters(response);
        props.setStoreCapacityLoader(false);
      } catch (error) {
        props.setStoreCapacityLoader(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (
      !filters ||
      filters?.length === 0 ||
      isEmpty(props.inventorysmartScreenConfig)
    ) {
      return;
    }
    getFiltersOptions(props.savedFilterSelection);
  }, [filters, props.inventorysmartScreenConfig]);

  const getFiltersOptions = async (selected, current) => {
    try {
      props.setStoreCapacityLoader(true);
      const selectedFilters = cloneDeep(
        props.inventorysmartConstraintsFilterDependency
      );
      let requiredFilterObjParams = {
        allFilters: filters || [],
        appliedFilters: selectedFilters,
        current: current,
        rolesBasedAccess: props.inventorysmartScreenConfig?.roleBasedAccess,
        screenName: props.screenName,
        tenantFilterUamConfig: props.tenantFilterUamConfig,
      };
      const response = await fetchFilterOptions(requiredFilterObjParams);
      if (
        isEmpty(props.filterDashboardConfiguration) ||
        props?.filterDashboardConfiguration?.isRedirectedFromDifferentPage
      ) {
        const filterConfigData = [
          {
            filterDashboardData: response,
            expectedFilterDimensions: getFilterDimensions(response),
            isCrossDimensionFilter: true,
            screen_name: props.screenName,
            saved_filter_screen_name: "store_capacity_configuration",
          },
        ];
        const filterConfig = formattedFilterConfiguration(
          "storeCapacityFilterConfiguration",
          filterConfigData,
          "Store Capacity",
          selectedFilters
        );
        props.setFilterConfiguration(filterConfig);
      }
    } catch (error) {
      displaySnackMessages("Error while fetching options", "error");
    } finally {
      props.setStoreCapacityLoader(false);
    }
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const onFilterDashboardClick = (dependencyData, filterData) => {
    onFilterDashboard(filterData, dependencyData);
  };

  return (
    <>
      <CoreComponentScreen
        showPageRoute={false}
        showPageHeader={true}
        showFilterDashboard={true}
        doNotUpdateDefaultValue={false}
        filterDependency={filterDependency}
        filterConfigKey={"storeCapacityFilterConfiguration"}
        onApplyFilter={onFilterDashboardClick}
        contained={true}
      />
      <Loader loader={props.storeCapacityLoader} minHeight={"260px"}>
        {isFiltersValid && (
          <ConstraintsTables
            filterDependency={filterPayload}
            selectedFilters={filterPayload}
            {...props}
          />
        )}
      </Loader>
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    storeCapacityLoader:
      store.inventorysmartReducer.inventorySmartStoreCapacityService
        .storeCapacityLoader,

    inventorysmartConstraintsFilterDependency:
      store.inventorysmartReducer.inventorySmartStoreCapacityService
        .storeCapacityFilterDependency,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "storeCapacityFilterConfiguration"
      ],
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
    savedFilterSelection: store.filterReducer.savedFilterSelection,
  };
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
  getFilterConfiguration: (payload) =>
    dispatch(getFilterConfiguration(payload)),
  setStoreCapacityLoader: (payload) =>
    dispatch(setStoreCapacityLoader(payload)),
  setIsFiltersValid: (payload) => dispatch(setIsFiltersValid(payload)),
  setInventorysmartFilterLoader: (payload) =>
    dispatch(setInventorysmartFilterLoader(payload)),
  setStoreCapacityFilterDependency: (body) =>
    dispatch(setStoreCapacityFilterDependency(body)),
  setInventorySmartModulesPermissions: (payload) =>
    dispatch(setInventorySmartModulesPermissions(payload)),
  setFilterConfiguration: (filterConfiguration) =>
    dispatch(setFilterConfiguration(filterConfiguration)),
});

export default connect(mapStateToProps, mapDispatchToProps)(StoreAllocation);
