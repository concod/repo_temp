import { combineReducers } from "redux";
import inventorySmartDashboardService from "./Decision-Dashboard/decision-dashboard-services";
import inventorySmartCreateAllocationService from "./Create-Allocation/create-allocation-services";
import inventorySmartStoreInventoryService from "./Decision-Dashboard/store-inventory-services";
import inventorySmartStoreInventoryAlertsService from "./StoreInventoryAlerts/store-inventory-alerts-service";
import inventorySmartOrderAlertsService from "./StoreInventoryAlerts/store-order-alerts-service";
import inventorySmartAlertsActionService from "./StoreInventoryAlerts/alerts-actions-service";
import inventorySmartStoreForecastAlerts from "./StoreInventoryAlerts/store-forecast-alerts-service";
import productProfileDashboardReducer from "./Product-Profile/product-profile-dashboard-service";
import createProductProfileReducer from "./Product-Profile/create-product-profile-service";
import productRuleService from "./Product-Profile/product-rule-services";
import inventorySmartConstraints from "./Constraints/constraints-services";
import inventorySmartKPIService from "./KPI-Matrix/kpi-services";
import inventorySmartFinalizeStoreViewService from "./Finalize/store-view-services";
import inventorySmartFinalizeProductViewService from "./Finalize/product-view-services";
import inventorySmartFinalizeStoreCapacityService from "./Finalize/store-capacity-service";
import inventorySmartOrderBatchingService from "./Order-Batching/order-batching-services";
import inventorySmartOrderBatchingSummaryService from "./Order-Batching/order-batching-summary-services";
import inventorySmartLostSalesService from "./Allocation-Reports/lost-sales-service";
import inventorySmartDropShipService from "./Allocation-Reports/drop-ship-service";
import inventorySmartOrdersService from "./Allocation-Reports/vendor-projections-orders-service";
import inventorySmartForecastService from "./Allocation-Reports/vendor-projections-forecasts-service";
import inventorySmartExpediteOrdersService from "./Allocation-Reports/expedite-orders";
import inventorySmartLateOrdersService from "./Allocation-Reports/late-orders";
import inventorySmartOMSFutureReceiptsService from "./Allocation-Reports/future-receipts-reports";
import inventorySmartPastAllocationService from "./View-Past-Allocation/view-past-allocation";
import inventorySmartExcessInventoryService from "./Allocation-Reports/excess-inventory-service";
import inventorySmartCommonService from "./common/inventory-smart-common-services";
import inventorySmartDailyAllocationService from "./Allocation-Reports/daily-allocation-service";
import inventoryStoreStockDrillDownService from "./Allocation-Reports/store-stock-drill-down-service";
import inventoryAllocationDeepDiveService from "./Allocation-Reports/allocation-deep-dive-service";
import inventoryForecastedUnitsService from "./Allocation-Reports/forecasted-units-service";
import inventoryAdditionalReportsService from "./Allocation-Reports/additional-reports-service";
import inventoryFutureReceiptsReportsService from "./Allocation-Reports/future-receipts-service";
import inventoryModelStockDeepDiveService from "./Allocation-Reports/model-stock-deep-dive-service";
import inventoryForecastReportsService from "./Allocation-Reports/forecast-reports-service";
import inventoryInStockService from "./Allocation-Reports/in-stock-service";
import inventorySmartExcessInventoryReportService from "./Allocation-Reports/excess-inventory-fiscal-week-list-service";
import inventorySmartNewStoreDemandConstraintsService from "./New-Store/demand-constraints";
import inventorySmartNewStoreDetailsService from "./New-Store/new-store-details";
import inventorySmartSisterStoreMappingService from "./New-Store/sister-store-mapping";
import inventorySmartOrderManagementService from "./Order-Management/order-management-service";
import inventorySmartOrderRepositoryService from "./Order-Repository/order-repository-service";
import inventoryIntentionalMinReportsService from "./Allocation-Reports/intentional-min-reports-service";
import inventoryCreateNewOrderService from "./Create-New-Order/create-new-order-service";
import inventorySmartNewStoreDashboardService from "./New-Store/new-store-dashboard";
import inventorySmartNewStoreApprovalFlowService from "./New-Store/new-store-approval-flow";
import inventorySmartNewStoreReleaseFlowService from "./New-Store/new-store-release-flow";
import inventorySmartProductSupersessionService from "./Product-Supersession/product-supersession-service";
import inventorySmartProductSupersessionSummaryService from "./Product-Supersession/product-supersession-summary-service";
import inventorySmartProductSupersessionCreateMappingService from "./Product-Supersession/product-supersession-create-mapping-service";
import inventorySmartProductSupersessionReviewMappingService from "./Product-Supersession/product-supersession-review-mapping-service";
import inventorySmartProductStoreInventorySourceMappingService from "./Product-Store-Inventory-Source-Mapping/product-store-inventory-source-mapping-service";
import inventorySmartStoreDcConfigService from "./Store-DC-Configuration/store-dc-configuration";
import inventorySmartStoreCapacityService from "./Store-Capacity/store-capacity-services";
import inventorySmartDCAvailabilityReportService from "./Allocation-Reports/dc-availability-report-service";
import inventorySmartForecastVarianceReportService from "./Allocation-Reports/variance-in-forecast-service";
import inventorySmartForwardLookingAllocationService from "./Allocation-Reports/forward-looking-allocation-service";
import inventorySmartOMSForecastAccuracyService from "./Allocation-Reports/forecast-accuracy-service";

export const inventorysmartReducer = combineReducers({
  inventorySmartDashboardService,
  inventorySmartKPIService,
  inventorySmartCreateAllocationService,
  inventorySmartStoreInventoryService,
  inventorySmartStoreInventoryAlertsService,
  inventorySmartOrderAlertsService,
  productProfileDashboardReducer,
  createProductProfileReducer,
  productRuleService,
  inventorySmartConstraints,
  inventorySmartFinalizeStoreViewService,
  inventorySmartFinalizeProductViewService,
  inventorySmartFinalizeStoreCapacityService,
  inventorySmartOrderBatchingService,
  inventorySmartOrderBatchingSummaryService,
  inventorySmartLostSalesService,
  inventorySmartDropShipService,
  inventorySmartOrdersService,
  inventorySmartForecastService,
  inventorySmartExpediteOrdersService,
  inventorySmartLateOrdersService,
  inventorySmartOMSFutureReceiptsService,
  inventorySmartPastAllocationService,
  inventorySmartExcessInventoryService,
  inventorySmartCommonService,
  inventorySmartStoreForecastAlerts,
  inventorySmartDailyAllocationService,
  inventoryStoreStockDrillDownService,
  inventoryAllocationDeepDiveService,
  inventorySmartAlertsActionService,
  inventoryInStockService,
  inventoryForecastedUnitsService,
  inventoryAdditionalReportsService,
  inventoryFutureReceiptsReportsService,
  inventoryModelStockDeepDiveService,
  inventoryForecastReportsService,
  inventorySmartExcessInventoryReportService,
  inventorySmartNewStoreDemandConstraintsService,
  inventorySmartNewStoreDetailsService,
  inventorySmartSisterStoreMappingService,
  inventorySmartOrderManagementService,
  inventorySmartOrderRepositoryService,
  inventoryIntentionalMinReportsService,
  inventoryCreateNewOrderService,
  inventorySmartNewStoreDashboardService,
  inventorySmartNewStoreApprovalFlowService,
  inventorySmartNewStoreReleaseFlowService,
  inventorySmartProductSupersessionService,
  inventorySmartProductSupersessionSummaryService,
  inventorySmartProductSupersessionCreateMappingService,
  inventorySmartProductSupersessionReviewMappingService,
  inventorySmartProductStoreInventorySourceMappingService,
  inventorySmartStoreDcConfigService,
  inventorySmartStoreCapacityService,
  inventorySmartDCAvailabilityReportService,
  inventorySmartForecastVarianceReportService,
  inventorySmartForwardLookingAllocationService,
  inventorySmartOMSForecastAccuracyService,
});
