import React, { useState, useEffect } from "react";
import { cloneDeep, isEmpty } from "lodash";
import Loader from "core/Utils/Loader/loader";
import { addSnack } from "core/actions/snackbarActions";
import {
  setStockDrillDownFilterConfigurationStore,
  setStockDrillDownFilterConfigurationBand,
  clearStoreStockDrillDownStates,
  setStockDrillDownTableLoader,
  getStoreStockStoreTableData,
  getStoreStockBandTableData,
  getStoreStockCartersTableData,
  getStoreStockArticleStoreData
} from "../../../services-inventorysmart/Allocation-Reports/store-stock-drill-down-service";
import {
  ERROR_MESSAGE
} from "../../../constants-inventorysmart/stringConstants";
import {
  fetchFilterConfig,
  fetchFilterOptions,
  getFilterDimensions,
} from "../../inventorysmart-utility";
import StoreStockDrillDownViewTableComponent from "./store-stock-drilldown-table-view";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import {
  formattedFilterConfiguration,
  getActiveEntityFilter,
} from "core/commonComponents/coreComponentScreen/utils";
import { setFilterConfiguration } from "core/actions/filterAction";
import globalStyles from "core/Styles/globalStyles";
import { IS_OVERRIDEN_CORE_BUTTON_WIDTH,IS_OVERRIDEN_CORE_BUTTON_PLACEMENT } from "config/constants";
import { STORE_STOCK_DRILL_DOWN_MODULE, STORE_STOCK_SCREEN_NAME } from "../CustomHooks/moduleConstants";
import { useReportingStyles } from "../reportingStyles";
import { connect } from "react-redux";
import { getStoreStockStoreProductViewTableData } from "modules/inventorysmart/services-inventorysmart/Allocation-Reports/store-stock-drill-down-service";

const StoreStockDrillDownComponent = (props) => {
  const reportingClasses = useReportingStyles();
  const [showTable, setShowTable] = useState(false);
  const [filterDependency, setFilterDependency] = useState([]);
  const globalClasses = globalStyles();
  const store_stock_config = props.moduleConfig?.[STORE_STOCK_DRILL_DOWN_MODULE];
  const no_radios = store_stock_config?.disable_radio_for_store_stock_drilldown ?? false;
  const buttonGroupOptions = store_stock_config?.store_stock_button_group_options ?? [];
  const [radioVal, setRadioVal] = useState(store_stock_config?.store_stock_button_group_options?.[0]?.value ?? "store");

  const configKey = "Inventorysmart Store Stock Drill Down";
  const tableConfigKey = no_radios ? "Inventorysmart Store Stock Drill Down" : `Report Store Stock ${radioVal}`;

  // Ensure table shows with existing filters when switching tabs
  useEffect(() => {
    if (filterDependency && filterDependency.length > 0) {
      setShowTable(true);
    }
  }, [radioVal]);
  
  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };
  const handleChangeRadioVal = (value) => {
    setRadioVal(value);
  };

  const handleErrorMessage = (e) => {
      const errObj = e?.response?.data;
      if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
      else displaySnackMessages(ERROR_MESSAGE, "error");
    };
  
  useEffect(() => {
    const getInitialFilterConfiguration = async () => {
      try {
        let response = await fetchFilterConfig( tableConfigKey );
        props.setStockDrillDownFilterConfigurationStore(response);
      } catch (e) {
        handleErrorMessage(e);
      }
    };
    if (
      props.filterDashboardConfiguration &&
      props?.filterDashboardConfiguration?.filterConfig?.[0]
        ?.originalFilterDashboardData
    ) {
      props.setStockDrillDownFilterConfigurationStore(
        props?.filterDashboardConfiguration?.filterConfig?.[0]
          ?.originalFilterDashboardData
      );
      return;
    }
    getInitialFilterConfiguration();
    return () => props.clearStoreStockDrillDownStates();
  }, [radioVal, configKey]);
  
  useEffect(() => {
    if (
      isEmpty(props.filterDashboardConfiguration) &&
      !isEmpty(props.stockDrillDownFilterConfigurationStore)
    ) {
      const getFilterValues = async (selected, current) => {
        try {
          let requiredFilterObjParams = {
            allFilters: cloneDeep(props.stockDrillDownFilterConfigurationStore) || [],
            appliedFilters: selected,
            current: current,
            rolesBasedAccess: props.inventorysmartScreenConfig?.roleBasedAccess,
            screenName: tableConfigKey,
            customDependency: [
              getActiveEntityFilter("product"),
              getActiveEntityFilter("store"),
            ],
            tenantFilterUamConfig: props.tenantFilterUamConfig,
          };
          const response = await fetchFilterOptions(requiredFilterObjParams);

          const filterConfigData = [
            {
              filterDashboardData: [...response],
              expectedFilterDimensions: getFilterDimensions([...response]),
              isCrossDimensionFilter: true,
              screen_name: STORE_STOCK_SCREEN_NAME,
            },
          ];
          const filterConfig = formattedFilterConfiguration(
            configKey,
            filterConfigData,
            tableConfigKey,
          );
          props.setFilterConfiguration(filterConfig);
        } catch (err) {
          handleErrorMessage(err);
        }
      };
      getFilterValues(props.savedFilterSelection);
    }
  }, [props.stockDrillDownFilterConfigurationStore, props.savedFilterSelection, configKey]);


  const applyFilters = async (_filterElements, dependency) => {
    setFilterDependency(dependency);
    setShowTable(true);
  };

  const onFilterDashboardClick = (dependencyData, filterData) => {
    setShowTable(false);
    applyFilters(filterData, dependencyData);
  };

  const getAdditionalProps = () => {

    const additionalProps = {
      "store": {
        getRowData: props.getStoreStockStoreTableData,
        table_name :  `report_store_stock_drilldown_${radioVal}`,
        radioVal: radioVal,
        setRadioVal : setRadioVal
       },
       "store_band": {
          getRowData: props.getStoreStockBandTableData,
          table_name : `report_store_stock_drilldown_${radioVal}`,
          radioVal: radioVal,
          setRadioVal : setRadioVal
       },
       "product_store_view" : {
        getRowData: props.getStoreStockArticleStoreTableData,
        table_name :  `report_store_stock_drilldown_article_store`,
        radioVal: radioVal,
        setRadioVal : setRadioVal
       },
       "product_view": {
        getRowData: props.getStoreStockStoreTableData,
        table_name :  `report_store_stock_drilldown_store`,
        radioVal: radioVal,
        setRadioVal : setRadioVal
       },
       "ssd_product_view":{
        getRowData: props.getStoreStockStoreProductViewTableData,
        table_name :  `report_store_stock_drilldown_product_view`,
        radioVal: radioVal,
        setRadioVal : setRadioVal
       },
       "ssd_product_store_view":{
        getRowData: props.getStoreStockStoreTableData,
        table_name :  `report_store_stock_drilldown_store`,
        radioVal: radioVal,
        setRadioVal : setRadioVal
       }
    }
    return additionalProps[radioVal]
    
}

  return (
    <>
    {radioVal !== "store_band" ?  <div style={{marginTop:IS_OVERRIDEN_CORE_BUTTON_PLACEMENT}}>
      <CoreComponentScreen
        IscoreButtonWidth = {IS_OVERRIDEN_CORE_BUTTON_WIDTH}
           showFilterDashboard={true}
           filterConfigKey={configKey}
           onApplyFilter={onFilterDashboardClick}
           contained={false}
           autoHideFilterButton={true}
           customClassName={reportingClasses.filterSectionSpacing}
    >
      <Loader loader={props.stockDrillDownTableLoader}>    
    {showTable && <StoreStockDrillDownViewTableComponent
      setStockDrillDownTableLoader={props.setStockDrillDownTableLoader}
      displaySnackMessages={displaySnackMessages}
      filterDependency = {filterDependency}
      buttonGroupOptions = {buttonGroupOptions}
      handleChangeRadioVal={handleChangeRadioVal}
      {...getAdditionalProps()}
    />}
    
    </Loader>
    </CoreComponentScreen></div> :   <div style={{marginTop:IS_OVERRIDEN_CORE_BUTTON_PLACEMENT}}>
      <CoreComponentScreen
        IscoreButtonWidth = {IS_OVERRIDEN_CORE_BUTTON_WIDTH}
           showFilterDashboard={true}
           filterConfigKey={configKey}
           onApplyFilter={onFilterDashboardClick}
           contained={false}
           autoHideFilterButton={true}
           customClassName={reportingClasses.filterSectionSpacing}
    >
      <Loader loader={props.stockDrillDownTableLoader}>    
    {showTable && <StoreStockDrillDownViewTableComponent
      setStockDrillDownTableLoader={props.setStockDrillDownTableLoader}
      displaySnackMessages={displaySnackMessages}
      filterDependency = {filterDependency}
      buttonGroupOptions = {buttonGroupOptions}
      handleChangeRadioVal={handleChangeRadioVal}
      {...getAdditionalProps()}
    />}
    
    </Loader>
    </CoreComponentScreen>
    </div>
}  
    </>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer, filterReducer } = store;
  return {
    moduleConfig: inventorysmartReducer?.allocationReportsCommonService?.moduleConfig,
    stockDrillDownTableLoader:
      inventorysmartReducer.inventoryStoreStockDrillDownService
        .stockDrillDownTableLoader,
    stockDrillDownTableData:
      inventorysmartReducer.inventoryStoreStockDrillDownService
        .stockDrillDownTableData,
    inventorysmartScreenConfig:
      store.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig,

    // Local Store Band Filter configs
    stockDrillDownFilterConfigurationStore:
      inventorysmartReducer.inventoryStoreStockDrillDownService
        .stockDrillDownFilterConfigurationStore,
    stockDrillDownFilterConfigurationBand:
      inventorysmartReducer.inventoryStoreStockDrillDownService
        .stockDrillDownFilterConfigurationBand,

    // From Filter Reducer
    filterDashboardConfigurationStore:
      filterReducer.filterDashboardConfiguration[
        `storeStockDrillDownFilterConfiguration-store`
      ],

    filterDashboardConfigurationBand:
      filterReducer.filterDashboardConfiguration[
        `storeStockDrillDownFilterConfiguration-store_band`
      ],
    filterDashboardConfiguration:
      filterReducer.filterDashboardConfiguration[
        `Inventorysmart Store Stock Drill Down`
      ],
    savedFilters: filterReducer.savedFilterSelection,
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
    allocationReportsConfiguration:
      inventorysmartReducer?.allocationReportsCommonService
        ?.allocationReportsConfiguration,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    setStockDrillDownTableLoader: (body) =>
      dispatch(setStockDrillDownTableLoader(body)),
    setStockDrillDownFilterConfigurationStore: (body) =>
      dispatch(setStockDrillDownFilterConfigurationStore(body)),
    setStockDrillDownFilterConfigurationBand: (body) =>
      dispatch(setStockDrillDownFilterConfigurationBand(body)),
    clearStoreStockDrillDownStates: (body) =>
      dispatch(clearStoreStockDrillDownStates(body)),
    setFilterConfiguration: (filterConfiguration) =>
      dispatch(setFilterConfiguration(filterConfiguration)),
    getStoreStockStoreTableData: (filterConfiguration) =>
      dispatch(getStoreStockStoreTableData(filterConfiguration)),
    getStoreStockStoreProductViewTableData: (newData) => 
      dispatch(getStoreStockStoreProductViewTableData(newData)),
    getStoreStockBandTableData: (filterConfiguration) =>
      dispatch(getStoreStockBandTableData(filterConfiguration)),
    getStoreStockCartersTableData: (filterConfiguration) =>
      dispatch(getStoreStockCartersTableData(filterConfiguration)),
    getStoreStockArticleStoreTableData: (filterConfiguration) =>
      dispatch(getStoreStockArticleStoreData(filterConfiguration)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(StoreStockDrillDownComponent);
