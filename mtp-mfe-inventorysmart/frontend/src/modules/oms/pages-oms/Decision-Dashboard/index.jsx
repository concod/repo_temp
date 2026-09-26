import React, { useEffect } from "react";
import { connect, useDispatch } from "react-redux";
import Loader from "core/Utils/Loader/loader";
import VendorDCDashboardTab from "modules/oms/pages-oms/Decision-Dashboard/VendorDCDashboardTab";
import VendorStoreDashboardTab from "modules/oms/pages-oms/Decision-Dashboard/VendorStoreDashboardTab";
import { setSelectedFilters as setOrderingSelectedFilters } from "modules/oms/services-oms/Decision-Dashboard/ordering-decision-dashboard-service";
import { resetOrderManagementState } from "modules/oms/services-oms/Order-Management/order-management-service";
import { resetOrderManagementVendorToStoreState } from "modules/oms/services-oms/Order-Management/order-management-vendor-to-store-service";

const OMSDecisionDashboard = (props) => {
  const dispatch = useDispatch();
  const { orderingSelectedFilters, decisionDashboardScreenConfig } = props;

  const FILTER_ATTRIBUTES_TO_REMOVE =
    decisionDashboardScreenConfig?.filter_attributes_to_remove || [];

  useEffect(() => {
    const selected = orderingSelectedFilters;
    if (!selected) return;

    let cleaned = selected;
    let hasChanged = false;

    if (Array.isArray(selected)) {
      cleaned = selected.filter(
        (filter) =>
          !FILTER_ATTRIBUTES_TO_REMOVE.includes(filter?.attribute_name)
      );
      hasChanged = cleaned.length !== selected.length;
    }

    if (hasChanged) {
      dispatch(setOrderingSelectedFilters(cleaned));
    }

    dispatch(resetOrderManagementState());
    dispatch(resetOrderManagementVendorToStoreState());
  }, [orderingSelectedFilters, decisionDashboardScreenConfig]);

  if (!props.orderingRoleConfigSuccess) {
    return (
      <Loader
        loader={true}
        popUp={false}
        children={null}
        minHeight={null}
        gridLoader={false}
        text={"Loading"}
        showingLoadingOnTop={false}
        isCustomLoader={false}
        size={null}
        showSkeleton={false}
        customZIndex={null}
        applyDefaultCenterStyle
      />
    );
  }

  if (props.variant === "vendor_store") {
    return (
      <VendorStoreDashboardTab
        tabValue={props.tabValue}
        module={props.module}
      />
    );
  }

  return (
    <VendorDCDashboardTab tabValue={props.tabValue} module={props.module} />
  );
};

const mapStateToProps = (store) => ({
  orderingRoleConfigSuccess:
    store.omsReducer?.orderingCommonService?.orderingRoleConfigSuccess,
  decisionDashboardScreenConfig:
    store.omsReducer.orderingCommonService.orderingScreensConfig
      .decision_dashboard,
  orderingSelectedFilters:
    store.omsReducer?.orderingDashboardService?.selectedFilters,
});

export default connect(mapStateToProps)(OMSDecisionDashboard);
