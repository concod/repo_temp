import { combineReducers } from "redux";
import uamConfiguratorService from "./ModuleAccessManagement/uam-configurator-service";
import productProfileDashboardReducer from "./Product-Profile/product-profile-dashboard-service";
import createProductProfileReducer from "./Product-Profile/create-product-profile-service";
import inventorySmartCommonService from "./common/inventory-smart-common-services";
import inventorySmartConfigurationService from "./Configuration/inventory-smart-configuration-services";
import rulesConstraintsReducer from "./Rules-Contraints/rules-contraints-services";
import exceptionConstraintsReducer from "./Exception-Constriants/exception-constraint-services";
import productRuleService from "./Product-Profile/product-rule-services";
import planConfigurationService from "./Plan-Configuration/plan-configuration-service";
import storeTransferConfigurationService from "./Store-Transfer-Configuration/store-transfer-configuration-service";
import dcTransferConfigurationService from "./DC-Transfer-Configuration/dc-transfer-configuration-service";
import createDcTransferService from "./Create-DC-Transfer/create-dc-transfer-service";
import createStoreTransferService from "./Create-Store-Transfer/create-store-transfer-service";
import createTransferRecommendationsService from "./Create-Transfer-Recommendations-S2S/create-transfer-recommendations-service";
import inventorySmartProductSupersessionService from "./Product-Supersession/product-supersession-service";
import inventorySmartProductSupersessionSummaryService from "./Product-Supersession/product-supersession-summary-service";
import inventorySmartProductSupersessionCreateMappingService from "./Product-Supersession/product-supersession-create-mapping-service";
import inventorySmartProductSupersessionReviewMappingService from "./Product-Supersession/product-supersession-review-mapping-service";
import inventorySmartRetailEventsService from "./Retail-Events/retail-events-service";
import inventorySmartFinalizeStoreViewService from "./Finalize/store-view-services";
import inventorySmartFinalizeProductViewService from "./Finalize/product-view-services";
import inventorySmartFinalizeStoreCapacityService from "./Finalize/store-capacity-service";
import inventorySmartNewFlowStoreViewService from "./Finalize/new-flow-store-view-services";
import inventorySmartNewFlowProductViewService from "./Finalize/new-flow-product-view-services";
import inventorySmartCreateAllocationService from "./Create-Allocation/create-allocation-services";
import inventorySmartDashboardService from "./Decision-Dashboard/decision-dashboard-services";
import inventorySmartStoreInventoryService from "./Decision-Dashboard/store-inventory-services";
import inventorySmartOrderBatchingService from "./Order-Batching/order-batching-services";
import inventorySmartOrderBatchingSummaryService from "./Order-Batching/order-batching-summary-services";
import inventorySmartOrderBatchingS2SService from "./Order-Batching/order-batching-s2s-services";
import inventorySmartPastAllocationService from "./View-Past-Allocation/view-past-allocation";
import inventorySmartKPIService from "./KPI-Matrix/kpi-services";
import inventorySmartStoreForecastAlerts from "./StoreInventoryAlerts/store-forecast-alerts-service";
import inventorySmartStoreInventoryAlertsService from "./StoreInventoryAlerts/store-inventory-alerts-service";
import allocationReportsCommonService from "./Allocation-Reports/allocation-reports-common-service";
import inventorySmartLostSalesService from "./Allocation-Reports/lost-sales-service";
import inventoryStoreStockDrillDownService from "./Allocation-Reports/store-stock-drill-down-service";
import inventorySmartExcessInventoryService from "./Allocation-Reports/excess-inventory-report-services";
import inventorySmartAlertsActionService from "./StoreInventoryAlerts/alerts-actions-service";
import inventorySmartDailyAllocationService from "./Allocation-Reports/daily-allocation-service";
import inventorySmartForecastAccuracyService from "./Allocation-Reports/forecast-accuracy-service";
import inventorySmartDcOutboundProjectionService from "./Allocation-Reports/dc-outbound-projection-service";
import inventorySmartReadinessReportService from "./Allocation-Reports/readiness-report-service";
import inventorySmartInStockService from "./Allocation-Reports/in-stock-report-services";
import inventorySmartConstraints from "./Constraints/constraints-services";
import inventorySmartNewStoreDetailsService from "./New-Store/new-store-details";
import inventorySmartNewStoreDashboardService from "./New-Store/new-store-dashboard";
import inventorySmartSisterStoreMappingService from "./New-Store/sister-store-mapping";
import dcStoreStrategyReducer from "./DC-Store-Policy/dc-store-strategy";
import dcStoreNetworkReducer from "./DC-Store-Network/dc-store-network";
import autoAllocationRulesService from "./AutoAllocationRules/auto-allocation-rules-service";
import createAutoAllocationRulesService from "./AutoAllocationRules/create-auto-allocation-rules-service";
import autoAllocationSchedulerService from "./AutoAllocationRules/auto-allocation-scheduler-service";
import createDCStoreStrategyRulesService from "./DcStoreStrategyRules/create-dc-store-strategy-rules-service";
import dcStoreStrategyRulesService from "./DcStoreStrategyRules/dc-store-strategy-rules-service";
import inventoryAllocationDeepDiveService from "./Allocation-Reports/allocation-deep-dive-service";
import activeModulesCacheService from "./active-module-common-service";
import inventorySmartNewStoreApprovalFlowService from "./New-Store/new-store-approval-flow";
import inventorySmartNewStoreReleaseFlowService from "./New-Store/new-store-release-flow";
import inventorySmartDcTransferConstraints from "./DC-Transfer-Constraints/dc-transfer-constraints-service";
import inventorySmartDcServiceLevelsService from "./DC-Service-Levels/dc-service-levels-service";
import inventorySmartDcTransferService from "./DC-TO-DC/dc-to-dc-landing-page-service.js";
import remodelStoreAttributesService from "./Remodel-Store/remodel-store-attributes";
import remodelStoreApprovalFlowService from "./Remodel-Store/remodel-store-approval-flow";
import remodelStoreReleaseFlowService from "./Remodel-Store/remodel-store-release-flow";
import remodelStoreManageDemandService from "./Remodel-Store/remodel-store-manage-demand";
import inventorySmartRemodelStoreDashboardService from "./Remodel-Store/remodel-store-dashboard";
import inventorySmartNewStoresTrackingService from "./Allocation-Reports/new-stores-tracking-services";

import storeTransferRuleService from "./Store-Transfer-Rule/store-transfer-rule";
import kpiConfiguratorService from "./KPI-Configurator/kpi-configurator-service";
import inventorySmartCreateKpiService from "./KPI-Configurator/create-kpi-service";
import productStatusReducer from "./Product-Store-Status/product-status-service";
import dcStatusReducer from "./DC-Status/dc-status-service";
import ruleGroupService from "./Rule-Group-Constraints/rule-group-services";

export const inventorysmartReducer = combineReducers({
  productProfileDashboardReducer,
  createProductProfileReducer,
  inventorySmartCommonService,
  inventorySmartConfigurationService,
  rulesConstraintsReducer,
  exceptionConstraintsReducer,
  productRuleService,
  planConfigurationService,
  storeTransferConfigurationService,
  dcTransferConfigurationService,
  createDcTransferService,
  createStoreTransferService,
  createTransferRecommendationsService,
  inventorySmartProductSupersessionService,
  inventorySmartProductSupersessionSummaryService,
  inventorySmartProductSupersessionCreateMappingService,
  inventorySmartProductSupersessionReviewMappingService,
  inventorySmartRetailEventsService,
  inventorySmartFinalizeStoreViewService,
  inventorySmartFinalizeProductViewService,
  inventorySmartFinalizeStoreCapacityService,
  inventorySmartNewFlowStoreViewService,
  inventorySmartNewFlowProductViewService,
  inventorySmartCreateAllocationService,
  inventorySmartDashboardService,
  inventorySmartStoreInventoryService,
  inventorySmartOrderBatchingService,
  inventorySmartOrderBatchingSummaryService,
  inventorySmartOrderBatchingS2SService,
  inventorySmartPastAllocationService,
  inventorySmartKPIService,
  inventorySmartStoreForecastAlerts,
  inventorySmartStoreInventoryAlertsService,
  allocationReportsCommonService,
  inventorySmartLostSalesService,
  inventoryStoreStockDrillDownService,
  inventorySmartExcessInventoryService,
  inventorySmartForecastAccuracyService,
  inventorySmartDcOutboundProjectionService,
  inventorySmartReadinessReportService,
  inventorySmartInStockService,
  inventorySmartAlertsActionService,
  inventorySmartDailyAllocationService,
  inventoryAllocationDeepDiveService,
  inventorySmartConstraints,
  inventorySmartNewStoreDetailsService,
  inventorySmartNewStoreDashboardService,
  inventorySmartSisterStoreMappingService,
  dcStoreStrategyReducer,
  dcStoreNetworkReducer,
  autoAllocationRulesService,
  createAutoAllocationRulesService,
  autoAllocationSchedulerService,
  createDCStoreStrategyRulesService,
  dcStoreStrategyRulesService,
  activeModulesCacheService,
  inventorySmartNewStoreApprovalFlowService,
  inventorySmartNewStoreReleaseFlowService,
  remodelStoreAttributesService,
  remodelStoreApprovalFlowService,
  remodelStoreReleaseFlowService,
  inventorySmartDcTransferConstraints,
  inventorySmartDcServiceLevelsService,
  inventorySmartDcTransferService,
  remodelStoreManageDemandService,
  inventorySmartRemodelStoreDashboardService,
  inventorySmartNewStoresTrackingService,
  storeTransferRuleService,
  kpiConfiguratorService,
  inventorySmartCreateKpiService,
  productStatusReducer,
  dcStatusReducer,
  ruleGroupService,
  uamConfiguratorService,
});
