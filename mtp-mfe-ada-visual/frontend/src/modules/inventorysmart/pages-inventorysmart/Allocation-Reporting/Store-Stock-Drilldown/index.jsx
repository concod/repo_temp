import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";

import { cloneDeep, isEmpty } from "lodash";

import { addSnack } from "core/actions/snackbarActions";
import globalStyles from "core/Styles/globalStyles";

import {
  setStockDrillDownTableData,
  setStockDrillDownFilterConfiguration,
  getStockDrillDownTableData,
  clearStoreStockDrillDownStates,
  getStockDrillDownSizeDetails,
  setStockDrillDownTableLoader,
  getStoreStockStoreTableData,
  getStoreStockSizeTableData,
} from "../../../services-inventorysmart/Allocation-Reports/store-stock-drill-down-service";
import {
  ERROR_MESSAGE,
  customStoreStockReportFilterConstant,
} from "../../../constants-inventorysmart/stringConstants";

import {
  fetchFilterConfig,
  fetchFilterOptions,
  getFilterDimensions,
  getActiveFilterCustomDependency,
} from "../../inventorysmart-utility";
import StoreStockDrillDownViewTableComponent from "./store-stock-drilldown-table-view";

import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import {
  formattedFilterConfiguration,
  getActiveEntityFilter,
} from "core/commonComponents/coreComponentScreen/utils";
import { setFilterConfiguration } from "core/actions/filterAction";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";

const StoreStockDrillDownComponent = (props) => {
  const globalClasses = globalStyles();
  const [
    showServerSideStoreStockDrillDownDetails,
    setShowServerSideStoreStockDrillDownDetails,
  ] = useState(false);
  const [renderTable, setRenderTable] = useState({});

  const onFilterDependency = useRef([]);

  useEffect(() => {
    const getInitialFilterConfiguration = async () => {
      try {
        // for puma pass a different filter config
        let storeStockFilterConfig = "";
        let fc_mappings =
          props.inventorysmartScreenConfig?.inventorysmart_allocation_report
            ?.drillDown?.fc_mapping;
        if (fc_mappings?.length) {
          storeStockFilterConfig = fc_mappings.filter(
            (item) => Object.keys(item)[0] === "store_stock_drill_down"
          );
        }
        let response = await fetchFilterConfig(
          storeStockFilterConfig?.length
            ? storeStockFilterConfig[0]?.store_stock_drill_down
            : "Inventorysmart Reportings "
        );
        props.setStockDrillDownFilterConfiguration(response);
      } catch (e) {
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };
    getInitialFilterConfiguration();
    return () => props.clearStoreStockDrillDownStates();
  }, [props.inventorysmartScreenConfig]);

  useEffect(() => {
    const getInitialFilterConfiguration = async () => {
      if (
        isEmpty(props.filterDashboardConfiguration) &&
        !isEmpty(props.stockDrillDownFilterConfiguration)
      ) {
        const getFilterValues = async (selected) => {
          try {
            let requiredFilterObjParams = {
              allFilters: cloneDeep(props.stockDrillDownFilterConfiguration),
              appliedFilters: selected,
              rolesBasedAccess:
                props.inventorysmartScreenConfig?.roleBasedAccess,
              screenName: props.screenName,
              customDependency: [
                getActiveEntityFilter("product"),
                getActiveEntityFilter("store"),
              ],
              tenantFilterUamConfig: props.tenantFilterUamConfig,
            };
            const response = await fetchFilterOptions(requiredFilterObjParams);

            let filterDataWithCustomFilter = [];
            if (dynamicLabelsBasedOnTenant("article") === "Material") {
              filterDataWithCustomFilter = [
                ...response,
                ...customStoreStockReportFilterConstant,
              ];
            } else {
              filterDataWithCustomFilter = [...response];
            }
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
              "storeStockDrillDownFilterConfiguration",
              filterConfigData,
              "Store Stock Drill Down Screen"
            );
            props.setFilterConfiguration(filterConfig);
          } catch (err) {
            displaySnackMessages(ERROR_MESSAGE, "error");
          }
        };
        getFilterValues(props.savedFilters);
      }
    };
    getInitialFilterConfiguration();
  }, [props.stockDrillDownFilterConfiguration, props.savedFilters]);

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const applyFilters = (_filterElements, dependency) => {
    let negationOHIndex = dependency.findIndex(
      (item) => item.attribute_name === "negative_inventory_oh"
    );
    if (negationOHIndex !== -1) {
      dependency = dependency.map((item) => {
        if (item.attribute_name === "negative_inventory_oh") {
          return {
            ...item,
            values: item.values.map((val) => {
              return val === "TRUE" ? true : false;
            }),
          };
        } else return item;
      });
    }
    let body = {
      filters: dependency,
    };
    setRenderTable(body);
    setShowServerSideStoreStockDrillDownDetails(true);
  };

  const onFilterDashboardClick = (dependencyData, filterData) => {
    setShowServerSideStoreStockDrillDownDetails(false);
    onFilterDependency.current = dependencyData;
    props.setStockDrillDownTableLoader(true);
    applyFilters(filterData, dependencyData);
  };

  const getCustomDependencyFilter = async (dependency) => {
    let storeStockFilterConfig = "";
    let fc_mappings =
      props.inventorysmartScreenConfig?.inventorysmart_allocation_report
        ?.drillDown?.fc_mapping;
    if (fc_mappings?.length) {
      storeStockFilterConfig = fc_mappings.filter(
        (item) => Object.keys(item)[0] === "store_stock_drill_down"
      );
    }
    if (storeStockFilterConfig?.length)
      return getActiveFilterCustomDependency(dependency, "active");
    else
      return getActiveFilterCustomDependency(dependency, "active", "product");
  };

  return (
    <>
      <CoreComponentScreen
        showFilterDashboard={true}
        filterConfigKey={"storeStockDrillDownFilterConfiguration"}
        onApplyFilter={onFilterDashboardClick}
        contained={true}
        customDependencyValue={getCustomDependencyFilter}
      />

      {showServerSideStoreStockDrillDownDetails && (
        <div className={globalClasses.filterWrapper}>
          <StoreStockDrillDownViewTableComponent
            setStockDrillDownTableLoader={props.setStockDrillDownTableLoader}
            displaySnackMessages={displaySnackMessages}
            getStockDrillDownTableData={props.getStockDrillDownTableData}
            getStockDrillDownSizeDetails={props.getStockDrillDownSizeDetails}
            renderTable={renderTable}
            inventorysmartScreenConfig={props.inventorysmartScreenConfig}
            getStoreStockSizeTableData={props.getStoreStockSizeTableData}
            getStoreStockStoreTableData={props.getStoreStockStoreTableData}
            stockDrillDownTableLoader={props.stockDrillDownTableLoader}
          />
        </div>
      )}
    </>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer, filterReducer } = store;
  return {
    stockDrillDownTableLoader:
      inventorysmartReducer.inventoryStoreStockDrillDownService
        .stockDrillDownTableLoader,
    stockDrillDownFilterConfiguration:
      inventorysmartReducer.inventoryStoreStockDrillDownService
        .stockDrillDownFilterConfiguration,
    stockDrillDownTableData:
      inventorysmartReducer.inventoryStoreStockDrillDownService
        .stockDrillDownTableData,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    filterDashboardConfiguration:
      filterReducer.filterDashboardConfiguration[
        "storeStockDrillDownFilterConfiguration"
      ],
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
    savedFilters: filterReducer.savedFilterSelection,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    setStockDrillDownTableLoader: (body) =>
      dispatch(setStockDrillDownTableLoader(body)),
    setStockDrillDownTableData: (body) =>
      dispatch(setStockDrillDownTableData(body)),
    setStockDrillDownFilterConfiguration: (body) =>
      dispatch(setStockDrillDownFilterConfiguration(body)),
    getStockDrillDownTableData: (body) =>
      dispatch(getStockDrillDownTableData(body)),
    clearStoreStockDrillDownStates: (body) =>
      dispatch(clearStoreStockDrillDownStates(body)),
    getStockDrillDownSizeDetails: (body) =>
      dispatch(getStockDrillDownSizeDetails(body)),
    setFilterConfiguration: (filterConfiguration) =>
      dispatch(setFilterConfiguration(filterConfiguration)),
    getStoreStockStoreTableData: (filterConfiguration) =>
      dispatch(getStoreStockStoreTableData(filterConfiguration)),
    getStoreStockSizeTableData: (filterConfiguration) =>
      dispatch(getStoreStockSizeTableData(filterConfiguration)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(StoreStockDrillDownComponent);
