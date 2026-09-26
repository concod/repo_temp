import { useEffect, useState } from "react";
import { connect } from "react-redux";
import {
  fetchFilterConfig,
  fetchFilterOptions,
  filtersPayload,
  getFilterDimensions,
} from "../inventorysmart-utility";
import classNames from "classnames";
import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import globalStyles from "core/Styles/globalStyles";
import { addSnack } from "core/actions/snackbarActions";
import { cloneDeep, isEmpty } from "lodash";
import StoreDcConfigurationTable from "./components/StoreDcConfigTable";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import {
  setInventorysmartStoreDcConfigFilterLoader,
  setSelectedFilters,
  setIsFiltersValid,
  setInventorysmartStoreDcConfigFilterElements,
  setInventorysmartStoreDcConfigFilterDependency,
  resetStoreDcConfigState,
} from "modules/inventorysmart/services-inventorysmart/Store-DC-Configuration/store-dc-configuration";
import { setFilterConfiguration } from "core/actions/filterAction";
import { formattedFilterConfiguration } from "core/commonComponents/coreComponentScreen/utils";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";

const StoreDcConfiguration = (props) => {
  const globalClasses = globalStyles();

  const [filters, setFilters] = useState([]);

  const onFilterDashboardClick = (dependencyData, filterData) => {
    props.setInventorysmartStoreDcConfigFilterDependency(filterData);
    const payload = filtersPayload(
      filterData || props.inventorysmartStoreDcConfigFilterDependency,
      dependencyData || props.inventorysmartStoreDcConfigFilterElements,
      true
    );
    let l_modifiedPayload = payload.reqBody
      ?.filter((filter) => filter.values?.length)
      ?.map((filteredFilter) => {
        return {
          ...filteredFilter,
          dimension: filteredFilter?.["dimension"].toLowerCase(),
        };
      });
    let l_isValid = filterData?.filter((val) => val.is_mandatory);
    props.setIsFiltersValid(payload.isValid || isEmpty(l_isValid));
    props.setSelectedFilters(l_modifiedPayload);
  };

  const getFiltersOptions = async (selected, current) => {
    try {
      props.setInventorysmartStoreDcConfigFilterLoader(true);
      const selectedFilters = selected;
      let requiredFilterObjParams = {
        allFilters: filters || [],
        appliedFilters: selectedFilters,
        current: current,
        rolesBasedAccess: props.inventorysmartScreenConfig?.roleBasedAccess,
        screenName: props.screenName,
        tenantFilterUamConfig: props.tenantFilterUamConfig,
      };
      const response = await fetchFilterOptions(requiredFilterObjParams);

      if (isEmpty(props.filterDashboardConfiguration)) {
        const filterConfigData = [
          {
            filterDashboardData: response,
            expectedFilterDimensions: getFilterDimensions(response),
            isCrossDimensionFilter: true,
            screen_name: props.screenName,
            saved_filter_screen_name:
              "Inventorysmart Store Lead Time Configuration",
          },
        ];

        const filterConfig = formattedFilterConfiguration(
          "storeDcConfiguration",
          filterConfigData,
          "Store Dc Configuration"
        );
        props.setFilterConfiguration(filterConfig);
      }
      let filterElements = cloneDeep(response);
      props.setInventorysmartStoreDcConfigFilterElements(filterElements);
    } catch (error) {
      displaySnackMessages(ERROR_MESSAGE, "error");
    } finally {
      props.setInventorysmartStoreDcConfigFilterLoader(false);
    }
  };

  useEffect(() => {
    if (!filters || filters?.length === 0) {
      return;
    }
    getFiltersOptions(props.savedFilterSelection);
  }, [filters]);

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        props.setInventorysmartStoreDcConfigFilterLoader(true);
        const response = await fetchFilterConfig("store mapping");
        setFilters(response);
      } catch (error) {
        props.setInventorysmartStoreDcConfigFilterLoader(false);
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };
    fetchFilters();

    return () => {
      props.resetStoreDcConfigState();
    };
  }, []);

  const displaySnackMessages = (message, variance, onClose) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
        ...(onClose && { onClose: onClose }),
      },
    });
  };

  return (
    <>
      <CoreComponentScreen
        showPageRoute={false}
        showPageHeader={true}
        showFilterDashboard={true}
        filterConfigKey={"storeDcConfiguration"}
        onApplyFilter={onFilterDashboardClick}
        contained={true}
      >
        {props.isFiltersValid && (
          <div
            className={classNames(
              globalClasses.filterWrapper,
              globalClasses.marginVertical1rem
            )}
          >
            <CustomAccordion label="DC Lead Time">
              <StoreDcConfigurationTable />
            </CustomAccordion>
          </div>
        )}
      </CoreComponentScreen>
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    inventorysmartStoreDcConfigFilterLoader:
      store.inventorysmartReducer.inventorySmartStoreDcConfigService
        .inventorysmartStoreDcConfigFilterLoader,
    isFiltersValid:
      store.inventorysmartReducer.inventorySmartStoreDcConfigService
        .isFiltersValid,
    inventorysmartStoreDcConfigFilterDependency:
      store.inventorysmartReducer.inventorySmartStoreDcConfigService
        .inventorysmartStoreDcConfigFilterDependency,
    inventorysmartStoreDcConfigFilterElements:
      store.inventorysmartReducer.inventorySmartStoreDcConfigService
        .inventorysmartStoreDcConfigFilterElements,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration["storeDcConfiguration"],
    savedFilterSelection: store.filterReducer.savedFilterSelection,
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setInventorysmartStoreDcConfigFilterLoader: (payload) =>
    dispatch(setInventorysmartStoreDcConfigFilterLoader(payload)),
  setSelectedFilters: (payload) => dispatch(setSelectedFilters(payload)),
  setIsFiltersValid: (payload) => dispatch(setIsFiltersValid(payload)),
  setInventorysmartStoreDcConfigFilterElements: (payload) =>
    dispatch(setInventorysmartStoreDcConfigFilterElements(payload)),
  setInventorysmartStoreDcConfigFilterDependency: (payload) =>
    dispatch(setInventorysmartStoreDcConfigFilterDependency(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  resetStoreDcConfigState: () => dispatch(resetStoreDcConfigState()),
  setFilterConfiguration: (filterConfiguration) =>
    dispatch(setFilterConfiguration(filterConfiguration)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(StoreDcConfiguration);
