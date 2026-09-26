import globalStyles from "core/Styles/globalStyles";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import { useEffect, useState } from "react";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import InventoryDashboardAlerts from "./InventoryDashboardAlerts";
import KPI from "../../KPI";
import {
  DELETE_MESSAGE,
  INVENTORY_SUBMODULES_NAMES,
  SCREENS_LIST_MAP,
  SCREENS_SUBCOMPONENT_LIST_MAP,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { useHistory } from "react-router-dom";
import { connect } from "react-redux";
import {
  deletePlans,
  setInventorysmartDeletePlanLoader,
} from "modules/inventorysmart/services-inventorysmart/Decision-Dashboard/decision-dashboard-services";
import { addSnack } from "core/actions/snackbarActions";
import { isActionAllowedOnSubModule } from "../../inventorysmart-utility";

const InventoryDashboardOrderData = function (props) {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const history = useHistory();
  const [reloadKpi, setReloadKpi] = useState(false);

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
      <div className={globalClasses.marginVertical1rem}>
        <CustomAccordion label="KPIs" customClass={classes.customAccordion}>
          <KPI
            screen={SCREENS_LIST_MAP.INVENTORYSMART_DASHBOARD_ORDER}
            showDateFilter={
              props.inventorysmartScreenConfig?.dashboard?.subComponent ===
              SCREENS_SUBCOMPONENT_LIST_MAP.INVENTORYSMART_DASHBOARD_WITH_STORE_FORECAST_AND_ORDER
            }
            reloadKpi={reloadKpi}
            setReloadKpi={setReloadKpi}
          />
        </CustomAccordion>
      </div>
      <InventoryDashboardAlerts
        screen={SCREENS_LIST_MAP.INVENTORYSMART_DASHBOARD_ORDER}
        canEdit={canTakeActionOnModules(
          INVENTORY_SUBMODULES_NAMES.INVENTORY_DASHBOARD_ORDER_INVENTORY_ALERTS,
          "edit"
        )}
        canDelete={canTakeActionOnModules(
          INVENTORY_SUBMODULES_NAMES.INVENTORY_DASHBOARD_ORDER_INVENTORY_ALERTS,
          "delete"
        )}
        canCreate={canTakeActionOnModules(
          INVENTORY_SUBMODULES_NAMES.INVENTORY_DASHBOARD_ORDER_INVENTORY_ALERTS,
          "create"
        )}
        reloadKpi={reloadKpi}
        setReloadKpi={setReloadKpi}
      />
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

const mapDispatchToProps = (dispatch) => ({
  deletePlans: (payload) => dispatch(deletePlans(payload)),
  setInventorysmartDeletePlanLoader: (payload) =>
    dispatch(setInventorysmartDeletePlanLoader(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(InventoryDashboardOrderData);
