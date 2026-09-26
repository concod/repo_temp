import { useEffect, useState } from "react";
import globalStyles from "../../../../core/Styles/globalStyles";
import { connect } from "react-redux";
import { Box } from "@mui/system";
import { cloneDeep } from "lodash";
// Lazy load the components
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import AllocationReporting from "./AllocationReporting";
import { addSnack } from "core/actions/snackbarActions";
import {
  ALLOCATION_REPORT_HEADER_TAB,
  ERROR_MESSAGE,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { ButtonGroup } from "impact-ui-v3";

import { OMS_REPORTS_HEADER_TABS } from "modules/oms/constants-oms/stringConstants";
import { setIsCalledFromVendorStore } from "modules/oms/services-oms/Reports/vendor-projections-service";
import OMSReports from "modules/oms/pages-oms/Reports/OrderingReports";

const ProductConfiguration = (props) => {
  const paths = [
    {
      label: "Home",
      to: "/home",
    },
    {
      label: "Reporting",
      to: "#",
    },
  ];
  const globalClasses = globalStyles();

  const [reportsHeaderTab, setReportsHeaderTab] = useState([]);
  const [hideHeaderTab, setHideHeaderTab] = useState(false);
  const [selectedTab, setSelectedTab] = useState("allocation_reporting");

  const handleTabChange = (event, newValue) => {
    props.setIsCalledFromVendorStore(newValue === "reports_oms_vendor_store");
    setSelectedTab(newValue);
  };

  useEffect(() => {
    props.setIsCalledFromVendorStore(
      selectedTab === "reports_oms_vendor_store"
    );
  }, [selectedTab]);

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  // To hide & rename the OMS tab from OMS Config
  useEffect(() => {
    try {
      const hiddenModules =
        props?.inventorysmartOmsScreenConfig?.hiddenModules || [];
      let tabs = cloneDeep(OMS_REPORTS_HEADER_TABS).filter(
        (tab) => !hiddenModules.includes(tab.value)
      );

      const omsReportScreens = props?.inventorysmartOmsScreenConfig?.screenName;
      if (omsReportScreens?.length) {
        tabs = tabs.filter((tab) => omsReportScreens.includes(tab.value));
      }

      tabs.forEach((tab) => {
        const tabName =
          props?.inventorysmartOmsScreenConfig?.module_screens_info?.[tab.value]
            ?.tabName;
        if (tabName) {
          tab.label = tabName;
        }
      });

      const finalTabs = [...ALLOCATION_REPORT_HEADER_TAB, ...tabs];
      setReportsHeaderTab(finalTabs);
    } catch (error) {
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  }, [props?.inventorysmartOmsScreenConfig]);

  const renderTabComponents = () => {
    const configKey = JSON.stringify(
      props?.inventorysmartOmsScreenConfig?.module_screens_info
    );

    switch (selectedTab) {
      case "allocation_reporting":
        return <AllocationReporting {...props} />;
      case "reports_oms":
        return (
          <OMSReports
            key={`reports_oms_${configKey}`}
            {...props}
            selectedTab={selectedTab}
            variant="reports_oms"
          />
        );
      case "reports_oms_vendor_store":
        return (
          <OMSReports
            key={`vendor_store_${configKey}`}
            {...props}
            selectedTab={selectedTab}
            variant="vendor_store"
          />
        );
      default:
        return null;
    }
  };

  useEffect(() => {
    try {
      //if Allocation Reporting is hidden in IS Config
      const isHiddenInAllocationReport = props.inventorysmartScreenConfig?.inventorysmart_allocation_report?.drillDown?.hidden?.includes(
        "allocation_reporting"
      );
      if (isHiddenInAllocationReport) {
        setSelectedTab("reports_oms");
      }

      //If OMS is hidden in either IS or OMS Config, hide the header tab
      const isOMSHiddenInISConfig = props.inventorysmartScreenConfig?.inventorysmart_allocation_report?.drillDown?.hidden?.includes(
        "reports_oms"
      );
      const isOMSHiddenInOmsConfig = props?.inventorysmartOmsScreenConfig?.hiddenModules?.includes(
        "reports_oms"
      );
      const isOMSEnabled = props.inventorysmartOmsScreenConfig?.is_oms_enabled;

      if (isOMSHiddenInISConfig || isOMSHiddenInOmsConfig || !isOMSEnabled) {
        setSelectedTab("allocation_reporting");
        setHideHeaderTab(true);
      }
      if (!isOMSHiddenInOmsConfig && isOMSEnabled) {
        setHideHeaderTab(false);
      }
    } catch (error) {
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  }, [props.inventorysmartScreenConfig, props.inventorysmartOmsScreenConfig]);

  const getReportHeaderOptions = () => {
    let options = reportsHeaderTab.filter((tabOption) => {
      return !props.inventorysmartScreenConfig?.inventorysmart_allocation_report?.drillDown?.hidden?.includes(
        tabOption.value
      );
    });
    return options;
  };

  return (
    <div className={globalClasses.paddingAroundNew}>
      <div className={globalClasses.breadcrumbPadding}>
        <HeaderBreadCrumbs options={paths} />
      </div>
      {hideHeaderTab ? (
        <Box
          sx={{ width: "100%", typography: "body1" }}
          className={`${globalClasses.marginTop}`}
        >
          <AllocationReporting {...props} />
        </Box>
      ) : (
        <>
          {reportsHeaderTab.length > 0 && (
            <>
              <Box
                sx={{ width: "100%", typography: "body1" }}
                className={`${globalClasses.centerAlign} ${globalClasses.marginBottom}`}
              >
                <ButtonGroup
                  onChange={handleTabChange}
                  options={getReportHeaderOptions()}
                  selectedOption={selectedTab}
                />
              </Box>
              {renderTabComponents()}
            </>
          )}
        </>
      )}
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    inventorysmartOmsScreenConfig:
      store.omsReducer?.orderingCommonService?.orderingModuleConfig,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    setIsCalledFromVendorStore: (value) =>
      dispatch(setIsCalledFromVendorStore(value)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ProductConfiguration);
