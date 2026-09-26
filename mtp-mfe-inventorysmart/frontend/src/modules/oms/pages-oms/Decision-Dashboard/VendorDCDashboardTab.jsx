import React, { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import { connect } from "react-redux";
import { isEqual } from "lodash";
import { ButtonGroup } from "impact-ui-v3";
import { isActionAllowedOnSubModule } from "core/Utils/utils";
import { tenantConfigApiCache } from "core/actions/tenantConfigActions";
import {
  OMS_ORDERING_SUBMODULES_NAMES,
  OMS_ORDERING_DASHBOARD_TABS,
  OMS_DECISION_DASHBOARD_SCREENNAME_KEY,
} from "modules/oms/constants-oms/stringConstants";
import { DECISION_DASHBOARD_VENDOR_DC_VARIANTS_CONFIG } from "modules/oms/constants-oms/apiConstants";
import OrderingKPIWrapper from "./Ordering-KPI/OrderingKPIWrapper";
import OrderingVendorDCAlerts from "./OrderingVendorDCAlerts";
import DcFilter from "modules/oms/pages-oms/common/DcFilter";
import { mergeOmsDcIntoFilters } from "modules/oms/utils-oms/oms-utility";
import {
  clearOrderingDashboardDcState,
  setSelectedFilters as setOrderingSelectedFilters,
  setVendorDcVariants,
  setSelectedVendorDcVariantKey,
} from "modules/oms/services-oms/Decision-Dashboard/ordering-decision-dashboard-service";
import {
  resolveVendorDcVariants,
  resolveSelectedVendorDcVariantKey,
  resolveVendorDcApiFlags,
} from "./utils/resolveVendorDcVariants.util";
import { useStyles } from "modules/oms/styles-oms/orderingCustomStyles";

const VendorDCDashboardTab = function (props) {
  const [tabValue] = useState("store");
  const [reloadKpi, setReloadKpi] = useState(false);

  const classes = useStyles();

  const dashboardAccess = props.userAccess?.find(
    (item) => item.screen === OMS_DECISION_DASHBOARD_SCREENNAME_KEY
  );
  const hasKPIAccess = dashboardAccess?.isKPIs || true;
  const hasAlertsAccess = dashboardAccess?.isAlerts || true;

  // Until TAM resolves, treat as silent v2 so the tab never blanks on a loader gate.
  const vendorDcVariants =
    props.vendorDcVariants?.length > 0
      ? props.vendorDcVariants
      : resolveVendorDcVariants(null);
  const selectedVariantKey =
    props.vendorDcVariants?.length > 0
      ? props.selectedVendorDcVariantKey || "v2"
      : "v2";
  const showVariantSubtabs = (props.vendorDcVariants || []).length > 1;
  const dashboardApiFlags = resolveVendorDcApiFlags(selectedVariantKey);

  const canTakeActionOnModules = (subModuleName, action) => {
    return isActionAllowedOnSubModule(
      props.inventorysmartModulesPermission,
      props.module,
      subModuleName,
      action
    );
  };

  useEffect(() => {
    let cancelled = false;
    const loadVariants = async () => {
      try {
        const response = await props.tenantConfigApiCache(1, {
          attribute_name: DECISION_DASHBOARD_VENDOR_DC_VARIANTS_CONFIG,
        });
        if (cancelled) {
          return;
        }
        const rawValue = response?.data?.data?.[0]?.attribute_value;
        const variants = resolveVendorDcVariants(rawValue);
        props.setVendorDcVariants(variants);
        props.setSelectedVendorDcVariantKey(
          resolveSelectedVendorDcVariantKey(variants)
        );
      } catch (error) {
        if (cancelled) {
          return;
        }
        const variants = resolveVendorDcVariants(null);
        props.setVendorDcVariants(variants);
        props.setSelectedVendorDcVariantKey(
          resolveSelectedVendorDcVariantKey(variants)
        );
      }
    };
    loadVariants();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const merged = mergeOmsDcIntoFilters(
      props.orderingDashboardSelectedFilters,
      props.orderingDashboardSelectedDcs
    );
    if (!isEqual(merged, props.orderingDashboardSelectedFilters || [])) {
      props.setOrderingSelectedFilters(merged);
    }
  }, [
    props.orderingDashboardSelectedFilters,
    props.setOrderingSelectedFilters,
  ]);

  useEffect(() => {
    const clearDc = props.clearOrderingDashboardDcState;
    return () => {
      clearDc();
    };
  }, [props.clearOrderingDashboardDcState]);

  const handleVariantChange = (_event, selectedOption) => {
    const nextKey =
      typeof selectedOption === "string"
        ? selectedOption
        : selectedOption?.value;
    if (!nextKey || nextKey === selectedVariantKey) {
      return;
    }
    props.setSelectedVendorDcVariantKey(nextKey);
  };

  const variantButtonOptions = vendorDcVariants.map((entry) => ({
    label: entry.label,
    value: entry.key,
  }));

  return (
    <div className={classes.vendorDCDashboardTabWrapper}>
      <Box
        sx={{
          position: "absolute",
          top: 0,
          right: 0,
          height: "36px",
          display: "flex",
          alignItems: "center",
          pr: 1,
        }}
      >
        <DcFilter
          variant="ordering_decision_dashboard"
          dashboardApiFlags={dashboardApiFlags}
        />
      </Box>

      {showVariantSubtabs && (
        <Box sx={{ display: "flex", justifyContent: "center", gap: 1 }}>
          <ButtonGroup
            onChange={handleVariantChange}
            options={variantButtonOptions}
            selectedOption={selectedVariantKey}
          />
        </Box>
      )}

      {hasKPIAccess &&
        !props.screenConfig?.hideKpis &&
        canTakeActionOnModules(
          OMS_ORDERING_SUBMODULES_NAMES.OMS_DASHBOARD_ORDER_KPI,
          "view"
        ) && (
          <OrderingKPIWrapper
            key={`kpi-${selectedVariantKey}`}
            screen={OMS_ORDERING_DASHBOARD_TABS.ORDERING_DASHBOARD_ORDER}
            showDateFilter={false}
            reloadKpi={reloadKpi}
            setReloadKpi={setReloadKpi}
            tabValue={tabValue}
            dashboardApiFlags={dashboardApiFlags}
          />
        )}

      {hasAlertsAccess &&
        !props.screenConfig?.hideAlerts &&
        canTakeActionOnModules(
          OMS_ORDERING_SUBMODULES_NAMES.OMS_DASHBOARD_ORDER_ALERTS,
          "view"
        ) && (
          <OrderingVendorDCAlerts
            key={`alerts-${selectedVariantKey}`}
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
            dashboardApiFlags={dashboardApiFlags}
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
      store.omsReducer.orderingCommonService.orderingScreensConfig
        ?.decision_dashboard,
    userAccess:
      store.omsReducer.orderingCommonService.orderingUserAccess.vendor_dc,
    orderingDashboardSelectedFilters:
      store.omsReducer.orderingDashboardService.selectedFilters,
    orderingDashboardSelectedDcs:
      store.omsReducer.orderingDashboardService.orderingDashboardSelectedDcs,
    vendorDcVariants:
      store.omsReducer.orderingDashboardService.vendorDcVariants,
    selectedVendorDcVariantKey:
      store.omsReducer.orderingDashboardService.selectedVendorDcVariantKey,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setOrderingSelectedFilters: (payload) =>
    dispatch(setOrderingSelectedFilters(payload)),
  clearOrderingDashboardDcState: () =>
    dispatch(clearOrderingDashboardDcState()),
  tenantConfigApiCache: (applicationCode, queryParams) =>
    dispatch(tenantConfigApiCache(applicationCode, queryParams)),
  setVendorDcVariants: (payload) => dispatch(setVendorDcVariants(payload)),
  setSelectedVendorDcVariantKey: (payload) =>
    dispatch(setSelectedVendorDcVariantKey(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(VendorDCDashboardTab);
