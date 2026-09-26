import globalStyles from "core/Styles/globalStyles";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import InventoryDashboardAlerts from "./InventoryDashboardAlerts";
import KPI from "../../KPI";
import {
  INVENTORY_SUBMODULES_NAMES,
  SCREENS_LIST_MAP,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { connect } from "react-redux";
import { isActionAllowedOnSubModule } from "../../inventorysmart-utility";

const InventoryDashboardForecastData = function (props) {
  const globalClasses = globalStyles();

  const canTakeActionOnModules = (subModuleName, action) => {
    return isActionAllowedOnSubModule(
      props.inventorysmartModulesPermission,
      props.module,
      subModuleName,
      action
    );
  };

  return (
    <>
      {canTakeActionOnModules(
        INVENTORY_SUBMODULES_NAMES.INVENTORY_DASHBOARD_FORECAST_KPI,
        "view"
      ) && (
        <div className={globalClasses.marginVertical1rem}>
          <CustomAccordion label="KPIs">
            <KPI
              screen={SCREENS_LIST_MAP.INVENTORYSMART_DASHBOARD_FORECAST}
              showDateFilter={false}
            />
          </CustomAccordion>
        </div>
      )}
      {props.inventorysmartScreenConfig?.dashboard?.drillDown?.hidden?.indexOf(
        "forecast_alerts"
      ) === -1 &&
        canTakeActionOnModules(
          INVENTORY_SUBMODULES_NAMES.INVENTORY_DASHBOARD_FORECAST_ALERTS,
          "view"
        ) && (
          <InventoryDashboardAlerts
            screen={SCREENS_LIST_MAP.INVENTORYSMART_DASHBOARD_FORECAST}
            canEdit={canTakeActionOnModules(
              INVENTORY_SUBMODULES_NAMES.INVENTORY_DASHBOARD_FORECAST_ALERTS,
              "edit"
            )}
            canDelete={canTakeActionOnModules(
              INVENTORY_SUBMODULES_NAMES.INVENTORY_DASHBOARD_FORECAST_ALERTS,
              "delete"
            )}
            canCreate={canTakeActionOnModules(
              INVENTORY_SUBMODULES_NAMES.INVENTORY_DASHBOARD_FORECAST_ALERTS,
              "create"
            )}
          />
        )}
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    inventorysmartModulesPermission:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartModulesPermission,
  };
};

export default connect(mapStateToProps, null)(InventoryDashboardForecastData);
