import React, { useEffect, useState } from "react";
import { connect, useDispatch } from "react-redux";
import { Tabs } from "impact-ui-v3";
import LostSalesComponent from "./Lost-Sales";
import StoreStockDrillDownComponent from "./Store-Stock-Drilldown";
import { isEmpty } from "lodash";
import {
  REPORT_SCREEN_TABS,
  REPORTS_CACHE,
} from "../../constants-inventorysmart/stringConstants";
import ExcessInventoryComponent from "./Excess-Inventory";
import ForecastAccuracy from "./Forecast-Accuracy/index";
import DailyAllocationSummary from "./Daily-Allocation-Summary";
import AllocationDeepDive from "./Allocation-Deep-Dive";
import AllocationReadiness from "./Readiness";
import InStockComponent from "./In-Stock";
import NewStoresTrackingComponent from "./New-Stores-Tracking";
import { getCoreFiscalCalendar } from "core/actions/inventoryAction";
import {
  setFiscalCalendarData,
  getModuleBasedTenantConfig,
} from "../../services-inventorysmart/common/inventory-smart-common-services";
import { displaySnackMessages } from "../inventorysmart-utility";
import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  setKeyValueInCache,
  clearActiveModuleCache,
} from "../../services-inventorysmart/active-module-common-service";
import {
  setAllocationReportsConfiguration,
  setAllocationReportsLoader,
} from "modules/inventorysmart/services-inventorysmart/Allocation-Reports/allocation-reports-common-service";
import { 
  setNoOfButtonsNextToTab,
} from "../../services-inventorysmart/common/inventory-smart-common-services.js";
import LoadingOverlay from "core/Utils/Loader/loader";
import DCOutboundProjection from "./DC-Outbound-Projection";
import { 
  ALLOCATION_REPORTS_MODULE,
  LOST_SALES_MODULE,
  FORECAST_ACCURACY_MODULE,
  EXCESS_INVENTORY_MODULE,
  DAS_REPORTS_MODULE,
  DEEP_DIVE_REPORTS_MODULE,
  READINESS_MODULE,
  IN_STOCK_MODULE,
  DC_OUTBOUND_REPORTS_MODULE,
  NEW_STORE_TRACKING_MODULE,
  STORE_STOCK_DRILL_DOWN_MODULE
} from "./CustomHooks/moduleConstants";
import FetchModuleWrapper from "./CustomHooks/FetchModuleWrapper";
import { formatModuleName } from "../../utils-inventorysmart/utilityFunctions";

const AllocationReportingComponent = (props) => {
  //destructure props...
  const {
    setAllocationReportsConfiguration,
    allocationReportsConfiguration,
  } = props;

  const dispatch = useDispatch();
  const [tabValue, setTabValue] = useState(null);
  const [, setEnableDownload] = useState(false);
  const [tabsList, setTabsList] = useState([]);
  const [allocationReportsLoader, setAllocationReportsLoader] = useState(true);

  // Fetch allocation reports configuration on mount
  useEffect(() => {
    const fetchAllocationReportsConfig = async () => {
      try {
        setAllocationReportsLoader(true);
        const configResponse = await dispatch(
          getModuleBasedTenantConfig({
            module_name: formatModuleName(ALLOCATION_REPORTS_MODULE),
          })
        );
        setAllocationReportsConfiguration(configResponse);
        setAllocationReportsLoader(false);
      } catch (e) {
        displaySnackMessages(ERROR_MESSAGE, "error");
        setAllocationReportsLoader(false);
      }
    };

    // Only fetch if config is empty
    if (isEmpty(allocationReportsConfiguration)) {
      fetchAllocationReportsConfig();
    } else {
      setAllocationReportsLoader(false);
    }
  }, []); // Run only on mount

  useEffect(() => {
    const newTabsList = [];
    REPORT_SCREEN_TABS.forEach((tabOption) => {
      if (
        allocationReportsConfiguration?.inventorysmart_allocation_report?.visible?.includes(
          tabOption.value
        )
      ) {
        newTabsList.push({ ...tabProps(tabOption) });
      }
    });
    setTabsList(newTabsList);

    return () => {
      // Cleaing Cache on Module UnMount.
      props.clearActiveModuleCache(REPORTS_CACHE);
      props.setNoOfButtonsNextToTab(undefined);
    };
  }, [
    allocationReportsConfiguration,
  ]);

  useEffect(() => {
    const getFiscalCalendarData = async () => {
      try {
        const getFinancialCalendarData = await getCoreFiscalCalendar();
        props.setFiscalCalendarData(getFinancialCalendarData?.data?.data);
      } catch (e) {
        displaySnackMessages(ERROR_MESSAGE, "error", props);
      }
    };
    getFiscalCalendarData();
  }, []);

  useEffect(() => {
    if (!isEmpty(allocationReportsConfiguration)) {
      /** Download Excel If Enabled For A Client */
      const enableDownload =
        allocationReportsConfiguration?.inventorysmart_allocation_report?.visible?.indexOf(
          "download_reports"
        ) !== -1;
      setEnableDownload(enableDownload);
      let defaultActiveReport =
        allocationReportsConfiguration?.inventorysmart_allocation_report
          ?.defaultActiveReport;
      if (defaultActiveReport) {
        setTabValue(defaultActiveReport);
      } else {
        setTabValue("lost_sales");
      }
    }
  }, [allocationReportsConfiguration]);

  useEffect(() => {
    props.setNoOfButtonsNextToTab(undefined);
    
    return () => {
      props.setNoOfButtonsNextToTab(undefined);
    };
  }, [tabValue]);

  useEffect(() => {
    const tabFilterConfigMap = {
      "lost_sales": "lostSalesFilterConfiguration",
      "lost_sales_with_graph": "lostSalesFilterConfiguration",
      "excess_inventory": "excessInvFilterConfiguration", 
      "forecast_accuracy": "forecastAccuracyFilterConfiguration",
      "daily_allocation_summary": "dailyAllocationFilterConfiguration",
      "deep_dive": "allocationDeepDiveFilterConfiguration",
      "readiness": "readinessFilterConfiguration",
      "in_stock": "inStockFilterConfiguration",
      "dc_outbound_projection": "dcOutboundProjectionFilterConfiguration",
      "new_stores_tracking": "newStoresTrackingFilterConfiguration",
      "store_stock": "Inventorysmart Store Stock Drill Down"
    };
    
    const currentFilterConfigKey = tabFilterConfigMap[tabValue];
    const hasFiltersApplied = currentFilterConfigKey && 
      props.filterDashboardConfiguration?.[currentFilterConfigKey]?.appliedFilterData?.dependencyData?.length > 0;
    
    props.setNoOfButtonsNextToTab(hasFiltersApplied ? 1 : undefined);
  }, [props.filterDashboardConfiguration, tabValue]);

  const handleChangeTabValue = (_event, newValue) => {
    setTabValue(newValue);
  };

  const tabProps = (tabOption) => {
    return {
      id: `simple-tab-${tabOption?.label}`,
      label: tabOption?.label,
      value: tabOption?.value,
      "aria-controls": `simple-tabpanel-${tabOption?.label}`,
    };
  };

  const calculateTabWidth = () => {
    if (props.no_of_buttons_next_to_tab === undefined) return "100%";
    if (props.no_of_buttons_next_to_tab === 1) return `calc(100% - 140px)`;
    return `calc(100% - ${140 + (props.no_of_buttons_next_to_tab - 1) * 142}px)`;
  };

  const renderTabComponents = () => {
    const ReportsMapper = {
      store_stock: (
        <FetchModuleWrapper module_name={STORE_STOCK_DRILL_DOWN_MODULE}>
          <StoreStockDrillDownComponent />
        </FetchModuleWrapper>
      ),
      lost_sales: (
        <FetchModuleWrapper module_name={LOST_SALES_MODULE}>
          <LostSalesComponent />
        </FetchModuleWrapper>
      ),
      lost_sales_with_graph: (
        <FetchModuleWrapper module_name={LOST_SALES_MODULE}>
          <LostSalesComponent />
        </FetchModuleWrapper>
      ),

      forecast_accuracy: (
        <FetchModuleWrapper module_name={FORECAST_ACCURACY_MODULE}>
          <ForecastAccuracy />
        </FetchModuleWrapper>
      ),
      excess_inventory: (
        <FetchModuleWrapper module_name={EXCESS_INVENTORY_MODULE}>
        <ExcessInventoryComponent/>
        </FetchModuleWrapper>

      ),
      daily_allocation_summary: (
        <FetchModuleWrapper module_name={DAS_REPORTS_MODULE}>
          <DailyAllocationSummary />
        </FetchModuleWrapper>
      ),
      deep_dive: (
        <FetchModuleWrapper module_name={DEEP_DIVE_REPORTS_MODULE}>
          <AllocationDeepDive />
        </FetchModuleWrapper>
      ),
      readiness: (
        <FetchModuleWrapper module_name={READINESS_MODULE}>
          <AllocationReadiness />
        </FetchModuleWrapper>
      ),
      in_stock:(
        <FetchModuleWrapper module_name={IN_STOCK_MODULE}>
          <InStockComponent />
        </FetchModuleWrapper>
      ),
      dc_outbound_projection: (
        <FetchModuleWrapper module_name={DC_OUTBOUND_REPORTS_MODULE}>
          <DCOutboundProjection />
        </FetchModuleWrapper>
      ),
      new_stores_tracking:(
        <FetchModuleWrapper module_name={NEW_STORE_TRACKING_MODULE}>
          <NewStoresTrackingComponent />
        </FetchModuleWrapper>
      )
    };
  

    let tablePanel = tabsList.map((thisTab) => {
      let tabValue = thisTab?.value;
      return <div>{ReportsMapper[tabValue]}</div>;
    });
    return tablePanel;
  };

  return (
    <>
      {allocationReportsLoader ? (
        <LoadingOverlay loader={true} spinner></LoadingOverlay>
      ) : (
        <FetchModuleWrapper 
          module_name={ALLOCATION_REPORTS_MODULE}
        >
          <div>
            {tabsList.length > 0 && tabValue && (
              <Tabs 
                sx={{ width: calculateTabWidth() }}
                value={tabValue}
                onChange={(_event, newValue) =>
                  handleChangeTabValue(_event, newValue)
                }
                tabNames={[...tabsList]}
                tabPanels={renderTabComponents()}
              />
            )}
          </div>
        </FetchModuleWrapper>
      )}
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    inventorysmartScreenConfig:
      store.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig,
    inventorysmartModulesPermission:
      store.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
    cache: store.inventorysmartReducer?.activeModulesCacheService?.cache,
    allocationReportsConfiguration:
      store.inventorysmartReducer?.allocationReportsCommonService
        ?.allocationReportsConfiguration,
    no_of_buttons_next_to_tab:
      store.inventorysmartReducer?.inventorySmartCommonService
        ?.no_of_buttons_next_to_tab,
    filterDashboardConfiguration: store.filterReducer?.filterDashboardConfiguration,
  };
};
const mapDispatchToProps = (dispatch) => {
  return {
    setFiscalCalendarData: (body) => dispatch(setFiscalCalendarData(body)),
    setKeyValueInCache: (keyValuePair) =>
      dispatch(setKeyValueInCache(keyValuePair)),
    clearActiveModuleCache: (module) =>
      dispatch(clearActiveModuleCache(module)),
    setAllocationReportsConfiguration: (payload) =>
      dispatch(setAllocationReportsConfiguration(payload)),
    setAllocationReportsLoader: (payload) =>
      dispatch(setAllocationReportsLoader(payload)),
    setNoOfButtonsNextToTab: (value) =>
      dispatch(setNoOfButtonsNextToTab(value)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AllocationReportingComponent);
