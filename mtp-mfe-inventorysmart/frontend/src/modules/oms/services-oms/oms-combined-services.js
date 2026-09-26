import { combineReducers } from "redux";
import orderingCommonService from "./common/ordering-common-services";
import viewManagementReducer from "../shared/ViewManagement/slices/viewManagement.slice";
import orderRepositoryService from "../services-oms/Order-Repository/order-repository-service";
import poRebalanceService from "./PO-Rebalance/po-rebalance-service";
import createNewOrderService from "./Create-New-Order/create-new-order-service";
import offCycleOrderService from "./Create-New-Order/off-cycle-order-service";
import reportsExpediteOrdersService from "./Reports/expedite-orders";
import reportsLateOrdersService from "./Reports/late-orders";
import reportsVendorProjectionsService from "./Reports/vendor-projections-service";
import reportsVendorProjectionsForecastService from "./Reports/vendor-projections-forecasts-service";
import reportsVendorProjectionsOrdersService from "./Reports/vendor-projections-orders-service";
import reportsVendorProjectionsReceiptsService from "./Reports/vendor-projections-receipts-service";
import omsOrderingAlertsService from "./Decision-Dashboard/ordering-alerts-service";
import omsAlertsActionsService from "./Decision-Dashboard/alerts-actions-service";
import orderManagementService from "./Order-Management/order-management-service";
import orderManagementVendorToStoreService from "./Order-Management/order-management-vendor-to-store-service";
import { matrixSummaryReducer } from "./Order-Management/matrix-summary-services/matrix-summary-combined-services";
import orderingConstraintsService from "./Constraints/constraints-services";
import orderingDashboardService from "./Decision-Dashboard/ordering-decision-dashboard-service";
import orderModuleConfiguratorService from "./Ordering-Configurator/ordering-configurator-service.js";
import expediteOrdersService from "./Decision-Dashboard/expedite-order-service";
import { orderManagementTableReducer } from "../pages-oms/OrderManagement/slices/index";

export const omsReducer = combineReducers({
  orderingCommonService,
  createNewOrderService,
  offCycleOrderService,
  expediteOrdersService,
  omsAlertsActionsService,
  omsOrderingAlertsService,
  orderRepositoryService,
  poRebalanceService,
  reportsExpediteOrdersService,
  reportsLateOrdersService,
  reportsVendorProjectionsService,
  reportsVendorProjectionsForecastService,
  reportsVendorProjectionsOrdersService,
  reportsVendorProjectionsReceiptsService,
  orderManagementService,
  orderManagementVendorToStoreService,
  matrixSummaryReducer,
  orderingConstraintsService,
  orderingDashboardService,
  orderModuleConfiguratorService,
  orderManagementViewManagement: viewManagementReducer,
  orderManagementTableService: orderManagementTableReducer,
});
