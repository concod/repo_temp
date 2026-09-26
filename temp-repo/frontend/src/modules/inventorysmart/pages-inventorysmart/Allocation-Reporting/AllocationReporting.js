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

const AllocationReportingComponent = (props) => {
  const [tabValue, setTabValue] = useState(null);
  const [enableDownload, setEnableDownload] = useState(false);

  const globalClasses = globalStyles();

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
        props.inventorysmartScreenConfig.dynamicLabels.article === "SKU"
      ) {
        setTabValue("model_stock_deep_dive");
      } else {
        setTabValue("store_stock");
      }
    }
  }, [props.inventorysmartScreenConfig]);

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
    return {
      id: `simple-tab-${tabOption?.label}`,
      label: tabOption?.label,
      value: tabOption?.value,
      "aria-controls": `simple-tabpanel-${tabOption?.label}`,
    };
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
        {REPORT_SCREEN_TABS.map(
          (tabOption) =>
            !props.inventorysmartScreenConfig?.inventorysmart_allocation_report?.drillDown?.hidden?.includes(
              tabOption.value
            ) && <Tab {...tabProps(tabOption)} />
        )}
      </Tabs>
      {renderTabComponents()}
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
  };
};

export default connect(mapStateToProps, null)(AllocationReportingComponent);
