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
import OrderingVendorDCAlerts from "./OrderingVendorDCAlerts";
import { useStyles } from "modules/oms/styles-oms/orderingCustomStyles";

const VendorDCDashboardTab = function (props) {
  const [tabValue, setTabValue] = useState("store");
  const [reloadKpi, setReloadKpi] = useState(false);

  const globalClasses = globalStyles();
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
          OMS_ORDERING_SUBMODULES_NAMES.OMS_DASHBOARD_ORDER_KPI,
          "view"
        ) && (
          <OrderingKPIWrapper
            screen={OMS_ORDERING_DASHBOARD_TABS.ORDERING_DASHBOARD_ORDER}
            showDateFilter={false}
            reloadKpi={reloadKpi}
            setReloadKpi={setReloadKpi}
            tabValue={tabValue}
          />
        )}

      {hasAlertsAccess &&
        !props.screenConfig?.hideAlerts &&
        canTakeActionOnModules(
          OMS_ORDERING_SUBMODULES_NAMES.OMS_DASHBOARD_ORDER_ALERTS,
          "view"
        ) && (
          <OrderingVendorDCAlerts
            screen={OMS_ORDERING_DASHBOARD_TABS.ORDERING_DASHBOARD_ORDER}
            canEdit={canTakeActionOnModules(
              OMS_ORDERING_SUBMODULES_NAMES.OMS_DASHBOARD_ORDER_ALERTS,
              "edit"
            )}
            canDelete={canTakeActionOnModules(
              OMS_ORDERING_SUBMODULES_NAMES.OMS_DASHBOARD_ORDER_ALERTS,
              "delete"
            )}
            canCreate={canTakeActionOnModules(
              OMS_ORDERING_SUBMODULES_NAMES.OMS_DASHBOARD_ORDER_ALERTS,
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
      store.omsReducer.orderingCommonService.screenConfig?.decision_dashboard,
    userAccess:
      store.omsReducer.orderingCommonService.orderingUserAccess.vendor_dc,
  };
};

const mapDispatchToProps = (dispatch) => ({});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(VendorDCDashboardTab);
