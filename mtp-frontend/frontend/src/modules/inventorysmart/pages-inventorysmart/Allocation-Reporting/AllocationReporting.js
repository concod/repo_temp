import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { Tabs, Tab } from "@mui/material";
import globalStyles from "core/Styles/globalStyles";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import LostSalesComponent from "./Lost-Sales";
import ExcessInventoryComponent from "./Excess-Inventory";
import ExcessInvenoryFiscalWeekList from "./Excess-Inventory-Report";
import DailyAllocationSummary from "./Daily-Allocation-Summary";
import { REPORT_SCREEN_TABS } from "../../constants-inventorysmart/stringConstants";
import ModelStockDeepDiveComponent from "./Model-Stock-Deep-Dive";
import ForecastReportsComponent from "./Forecast-Reports";
import StoreStockDrillDownComponent from "./Store-Stock-Drilldown";
import AllocationDeepDiveComponent from "./Allocation-Deep-Dive";
import ForecastedUnitsComponent from "./Forecasted-Units";
import AdditionalReportsComponent from "./Additional-Reports";
import FutureReceiptsComponent from "./Future-Receipts";
import InStockComponent from "./In-Stock";
import IntentionalMinReportsComponent from "./Intentional-Min-Reports";
import { isEmpty } from "lodash";
import DCAvailabilityReportComponent from "./DC-Availability-Report";
import VarianceForecastComponent from "./Variance-Forecast";
import ForwardLookingAllocationComponent from "./Forward-Looking-Report";
import { allocationReportingTabModulePermissionMap } from "./config/tabConfig";
import { getTabItemVisibility } from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";
import {
  getInventorySmartAttributes,
  setInventorySmartReportsGBQConfig
} from "../../services-inventorysmart/common/inventory-smart-common-services";
import Tooltip from "@mui/material/Tooltip";

const AllocationReportingComponent = (props) => {
  const {
    inventorysmartScreenConfig,
    inventorysmartModulesPermission,
    module,
  } = props;

  const [tabValue, setTabValue] = useState(null);
  const [enableDownload, setEnableDownload] = useState(false);
  const [tabsList, setTabsList] = useState([]);

  const globalClasses = globalStyles();

  useEffect(() => {
    const newTabsList = REPORT_SCREEN_TABS.map((tabOption) => {
      if (
        props.inventorysmartScreenConfig?.inventorysmart_allocation_report?.drillDown?.hidden?.includes(
          tabOption.value
        )
      ) {
        return null;
      }

      const { value } = tabOption;
      const tabPermissions = allocationReportingTabModulePermissionMap[value];
      const displayFlag = getTabItemVisibility(
        inventorysmartModulesPermission[module],
        tabPermissions
      );

      if (!displayFlag) {
        return null;
      }

      return <Tab {...tabProps(tabOption)} />;
    });

    setTabsList(newTabsList);
  }, [inventorysmartScreenConfig, inventorysmartModulesPermission, module]);

  useEffect(() => {
    if (!isEmpty(props.inventorysmartScreenConfig)) {
      /** Download Excel If Enabled For A Client */
      const enableDownload =
        props.inventorysmartScreenConfig?.inventorysmart_allocation_report?.drillDown?.hidden?.indexOf(
          "download_reports"
        ) === -1;
      setEnableDownload(enableDownload);
      let defaultActiveReport =
        props.inventorysmartScreenConfig?.inventorysmart_allocation_report
          ?.drillDown?.defaultActiveReport;

      if (defaultActiveReport) {
        setTabValue(defaultActiveReport);
      } else if (
        props.inventorysmartScreenConfig?.dynamicLabels?.article === "SKU" && !props.inventorysmartReportsGBQConfig?.value
      ) {
        setTabValue("model_stock_deep_dive");
      } else if(props.inventorysmartReportsGBQConfig?.value){
        setTabValue("lost_sales")
      }
      else {
        setTabValue("store_stock");
      }
    }
  }, [props.inventorysmartScreenConfig, props.inventorysmartReportsGBQConfig]);

  useEffect(()=>{
    const reportsConfigGBQBased=async()=>{
    let config = await props.getInventorySmartAttributes(
      1,
      "reports_gbq_based"
    );
    props.setInventorySmartReportsGBQConfig(config?.data?.data[0]?.attribute_value)
  }
  reportsConfigGBQBased()
  },[])

  const homeIcon = [
    {
      label: "Allocation Reporting",
      id: 1,
    },
  ];

  const handleChangeTabValue = (_event, newValue) => {
    setTabValue(newValue);
  };

  const tabProps = (tabOption) => {
    const label = tabOption.label;
    const reportsScreenTabsTooltipInfo = props?.inventorysmartScreenConfig?.dashboard?.reportsScreenTabsTooltipInfo || [];
    const toolTipInfo = reportsScreenTabsTooltipInfo.find(
      (tab) => tab.label === label
    )?.toolTipInfo || "";
  
    const tabProps = {
      id: `simple-tab-${label}`,
      value: tabOption.value,
      "aria-controls": `simple-tabpanel-${label}`,
    };
    
    tabProps.label = toolTipInfo ? (
      <Tooltip title={toolTipInfo} arrow>
        <span>{label}</span>
      </Tooltip>
    ) : (
      <span>{label}</span>
    );
  
    return tabProps;
  };

  const renderTabComponents = () => {
    switch (tabValue) {
      case "model_stock_deep_dive":
        return (
          <ModelStockDeepDiveComponent
            enableDownload={enableDownload}
            screenName={props.screenName}
          />
        );
      case "store_stock_rl":
      case "store_stock":
        return (
          <StoreStockDrillDownComponent
            enableDownload={enableDownload}
            screenName={props.screenName}
          />
        );
      case "in_stock":
        return (
          <InStockComponent
            enableDownload={enableDownload}
            screenName={props.screenName}
          />
        );
      case "lost_sales":
        return (
          <LostSalesComponent
            enableDownload={enableDownload}
            screenName={props.screenName}
          />
        );
      case "lost_sales_with_fiscal_calendar":
        return (
          <LostSalesComponent
            hideGraphComponent
            showFiscalCalendar
            enableDownload={enableDownload}
            screenName={props.screenName}
          />
        );
      case "excess_inv":
        return <ExcessInventoryComponent screenName={props.screenName} />;
      case "excess_report":
        return <ExcessInvenoryFiscalWeekList screenName={props.screenName} />;
      case "deep_dive":
        return (
          <AllocationDeepDiveComponent
            screenName={props.screenName}
            enableDownload={enableDownload}
          />
        );
      case "daily_allocation":
        return (
          <DailyAllocationSummary
            enableDownload={enableDownload}
            screenName={props.screenName}
          />
        );
      case "forecasted_units":
        return <ForecastedUnitsComponent screenName={props.screenName} />;
      case "additional_reports":
        return <AdditionalReportsComponent screenName={props.screenName} />;
      case "future_receipts":
        return <FutureReceiptsComponent screenName={props.screenName} />;
      case "forecast_reports":
        return (
          <ForecastReportsComponent
            enableDownload={enableDownload}
            screenName={props.screenName}
          />
        );
      case "intentional_min_reports":
        return (
          <IntentionalMinReportsComponent
            screenName={props.screenName}
            enableDownload={enableDownload}
          />
        );
      case "dc_availability_report":
        return (
          <DCAvailabilityReportComponent
            screenName={props.screenName}
            enableDownload={enableDownload}
          />
        );
      case "forecast_variance_report":
        return (
          <VarianceForecastComponent
            screenName={props.screenName}
            enableDownload={enableDownload}
          />
        );
      case "forward_looking_report":
        return (
          <ForwardLookingAllocationComponent
            screenName={props.screenName}
            enableDownload={enableDownload}
          />
        );
      default:
        return;
    }
  };

  return (
    <>
      <Tabs
        value={tabValue}
        onChange={handleChangeTabValue}
        aria-label="allocation-reports-tab"
      >
        {tabsList}
      </Tabs>
      {renderTabComponents()}
    </>
  );
};

const mapDispatchToProps = (dispatch) => ({
  getInventorySmartAttributes: (applicationCode, attributeName) =>
    dispatch(getInventorySmartAttributes(applicationCode, attributeName)),
  setInventorySmartReportsGBQConfig: (payload)=>
    dispatch(setInventorySmartReportsGBQConfig(payload)),
  
});

const mapStateToProps = (store) => {
  return {
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    inventorysmartModulesPermission:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartModulesPermission,
    inventorysmartReportsGBQConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartReportsGBQConfig
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(AllocationReportingComponent);
