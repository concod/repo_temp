import React, { useState, useEffect } from "react";
import globalStyles from "core/Styles/globalStyles";
import { isEmpty } from "lodash";
import { Tab, Tabs } from "@mui/material";
import { connect } from "react-redux";
import { isActionAllowedOnSubModule } from "core/Utils/utils";
import {
  OMS_ORDERING_SUBMODULES_NAMES,
  OMS_ORDERING_DASHBOARD_TABS,
  OMS_DECISION_DASHBOARD_SCREENNAME_KEY,
} from "modules/oms/constants-oms/stringConstants";
import OrderingKPIWrapper from "./Ordering-KPI/OrderingKPIWrapper";
import OrderingVendorStoreAlerts from "./OrderingVendorStoreAlerts";
import { useStyles } from "modules/oms/styles-oms/orderingCustomStyles";

const VendorStoreDashboardTab = function (props) {
  const [tabValue, setTabValue] = useState("store");
  const [reloadKpi, setReloadKpi] = useState(false);

  const classes = useStyles();

  const dashboardAccess = props.userAccess?.find(
    (item) => item.screen === OMS_DECISION_DASHBOARD_SCREENNAME_KEY
  );
  const hasKPIAccess = dashboardAccess?.isKPIs || true;
  const hasAlertsAccess = dashboardAccess?.isAlerts || true;

  const canTakeActionOnModules = (subModuleName, action) => {
    return isActionAllowedOnSubModule(
      props.inventorysmartModulesPermission,
      props.module,
      subModuleName,
      action
    );
  };

  return (
    <div className={classes.vendorDCDashboardTabWrapper}>
      {hasKPIAccess &&
        !props.screenConfig?.hideKpis &&
        canTakeActionOnModules(
          OMS_ORDERING_SUBMODULES_NAMES.OMS_DASHBOARD_OMS_VENDOR_STORE_KPI,
          "view"
        ) && (
          <OrderingKPIWrapper
            screen={OMS_ORDERING_DASHBOARD_TABS.ORDERING_DASHBOARD_ORDER}
            showDateFilter={false}
            reloadKpi={reloadKpi}
            setReloadKpi={setReloadKpi}
            tabValue={tabValue}
            isCalledFromVendorStore={true}
          />
        )}

      {hasAlertsAccess &&
        !props.screenConfig?.hideAlerts &&
        canTakeActionOnModules(
          OMS_ORDERING_SUBMODULES_NAMES.OMS_DASHBOARD_OMS_VENDOR_STORE_ALERTS,
          "view"
        ) && (
          <OrderingVendorStoreAlerts
            screen={
              OMS_ORDERING_DASHBOARD_TABS.ORDERING_DASHBOARD_ORDER_VENDOR_STORE
            }
            canEdit={canTakeActionOnModules(
              OMS_ORDERING_SUBMODULES_NAMES.OMS_DASHBOARD_OMS_VENDOR_STORE_ALERTS,
              "edit"
            )}
            canDelete={canTakeActionOnModules(
              OMS_ORDERING_SUBMODULES_NAMES.OMS_DASHBOARD_OMS_VENDOR_STORE_ALERTS,
              "delete"
            )}
            canCreate={canTakeActionOnModules(
              OMS_ORDERING_SUBMODULES_NAMES.OMS_DASHBOARD_OMS_VENDOR_STORE_ALERTS,
              "create"
            )}
          />
        )}
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    inventorysmartModulesPermission:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartModulesPermission,
    screenConfig:
      store.omsReducer.orderingCommonService?.orderingVendorToStoreConfig
        ?.decision_dashboard,
    userAccess:
      store.omsReducer.orderingCommonService.orderingUserAccess.vendor_store,
  };
};

const mapDispatchToProps = (dispatch) => ({});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(VendorStoreDashboardTab);
