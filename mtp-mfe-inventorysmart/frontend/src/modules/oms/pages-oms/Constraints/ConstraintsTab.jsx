import React, { useState, useEffect } from "react";
import { Tabs } from "impact-ui-v3";
import { getTabItemVisibility } from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";
import { omsOrderingTabModulePermissionMap } from "modules/oms/pages-oms/common/omsTabConfig";
import Status from "modules/oms/pages-oms/Constraints/Status";
import SafetyStock from "modules/oms/pages-oms/Constraints/SafetyStock";
import OrderPolicy from "modules/oms/pages-oms/Constraints/OrderPolicy";
import Ordering from "modules/oms/pages-oms/Constraints/Ordering";
import DeliveryFilter from "modules/oms/pages-oms/Constraints/Delivery/DeliveryFilter";
import PoConversion from "modules/oms/pages-oms/Constraints/PoConversion";
import VendorDCPolicy from "modules/oms/pages-oms/Constraints/VendorDCPolicy";
import VendorConstraints from "modules/oms/pages-oms/Constraints/VendorConstraints";
import ShipmentConstraints from "modules/oms/pages-oms/Constraints/Shipment";
import { CONSTRAINTS_OMS_DELIVERY_SUBTAB } from "modules/oms/constants-oms/stringConstants";
import { useStyles } from "modules/oms/styles-oms/orderingCustomStyles";

const OMSTabPanel = ({
  tabProps,
  screenName,
  omsTabs,
  omsModuleConfig,
  inventorysmartModulesPermission,
  module,
  selectedSubTab,
  handleSubTabChange,
  selectedDeliveryTab,
  handleDeliveryTabChange,
  constraintsConfigs,
}) => {
  const classes = useStyles();
  const [isFilterApplied, setIsFilterApplied] = useState(false);

  useEffect(() => {
    setIsFilterApplied(false);
  }, [selectedSubTab, selectedDeliveryTab]);

  const handleTabChange = (event, newValue) => {
    setIsFilterApplied(false);
    handleSubTabChange(event, newValue);
  };

  const renderSubDeliveryTabComponents = (tabValue) => {
    switch (tabValue) {
      case "constraints_lead_time":
        return (
          <DeliveryFilter
            screenName={screenName}
            selectedTab={"Lead Time"}
            setIsFilterApplied={setIsFilterApplied}
          />
        );
      case "constraints_qc_time":
        return (
          <DeliveryFilter
            screenName={screenName}
            selectedTab={"Qc Time"}
            setIsFilterApplied={setIsFilterApplied}
          />
        );
      default:
        return null;
    }
  };

  const OMSDeliveryTabPanel = () => {
    const tabNames = CONSTRAINTS_OMS_DELIVERY_SUBTAB.map(
      (tabOption) =>
        !constraintsConfigs?.hidden?.includes(tabOption.value) && (
          <Tabs {...tabProps(tabOption)} />
        )
    );

    const tabPanels = tabNames.map((tabOption) =>
      renderSubDeliveryTabComponents(tabOption.props?.value)
    );

    return (
      <Tabs
        value={selectedDeliveryTab}
        onChange={handleDeliveryTabChange}
        aria-label="oms-constraints-delivery-tab"
        tabNames={tabNames}
        tabPanels={tabPanels}
      ></Tabs>
    );
  };

  const renderSubTabComponents = (tabValue) => {
    switch (tabValue) {
      case "constraints_status":
        return (
          <Status
            screenName={screenName}
            setIsFilterApplied={setIsFilterApplied}
          />
        );
      case "constraints_delivery":
        if (CONSTRAINTS_OMS_DELIVERY_SUBTAB.length === 1) {
          return (
            <DeliveryFilter
              screenName={screenName}
              selectedTab={CONSTRAINTS_OMS_DELIVERY_SUBTAB[0].label}
              setIsFilterApplied={setIsFilterApplied}
            />
          );
        }
        return <OMSDeliveryTabPanel />;
      case "constraints_ordering":
        return (
          <Ordering
            screenName={screenName}
            setIsFilterApplied={setIsFilterApplied}
          />
        );
      case "constraints_safety_stock":
        return (
          <SafetyStock
            screenName={screenName}
            setIsFilterApplied={setIsFilterApplied}
          />
        );
      case "constraints_order_policy":
        return (
          <OrderPolicy
            screenName={screenName}
            setIsFilterApplied={setIsFilterApplied}
          />
        );
      case "constraints_vendor_dc_policy":
        return (
          <VendorDCPolicy
            screenName={screenName}
            setIsFilterApplied={setIsFilterApplied}
          />
        );
      case "constraints_po_conversion":
        return (
          <PoConversion
            screenName={screenName}
            setIsFilterApplied={setIsFilterApplied}
          />
        );
      case "vendor_constraints":
        return (
          <VendorConstraints
            screenName={screenName}
            setIsFilterApplied={setIsFilterApplied}
          />
        );
      case "shipment_constraints":
        return (
          <ShipmentConstraints
            screenName={screenName}
            setIsFilterApplied={setIsFilterApplied}
          />
        );
      default:
        return null;
    }
  };

  const tabNames = omsTabs
    .map((tabOption) => {
      const omsSubTabName =
        omsModuleConfig?.module_screens_info?.inventorysmart_oms_constraints
          ?.subTabs?.[tabOption.value];

      if (omsSubTabName) {
        tabOption.label = omsSubTabName;
      }

      const { value } = tabOption;
      const tabPermissions = omsOrderingTabModulePermissionMap[value];
      const displayFlag = getTabItemVisibility(
        inventorysmartModulesPermission[module],
        tabPermissions
      );

      if (!displayFlag) {
        return null;
      }
      return tabOption;
    })
    .filter(Boolean);

  const tabPanels = tabNames.map((tabOption) =>
    renderSubTabComponents(tabOption.value)
  );

  return (
    <div
      className={
        isFilterApplied
          ? selectedSubTab === "vendor_constraints"
            ? classes.tabsWithFilterAndManageButtons
            : classes.tabsWithFilterButton
          : classes.tabsWithoutButton
      }
    >
      <Tabs
        value={selectedSubTab}
        onChange={handleTabChange}
        aria-label="oms-constraints-tab"
        tabNames={tabNames}
        tabPanels={tabPanels}
      ></Tabs>
    </div>
  );
};

export default OMSTabPanel;
