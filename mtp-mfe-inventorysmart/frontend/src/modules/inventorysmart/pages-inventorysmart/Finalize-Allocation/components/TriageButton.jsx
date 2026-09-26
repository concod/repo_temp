import { Button, Prompt, useTranslation } from "impact-ui-v3";
import { addSnack } from "core/actions/snackbarActions";
import {
  DASHBOARD,
} from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  changePlanStatus,
  clearNotification,
  setMoveToTiageLoader,
  moveToOrderBatchingStatus,
} from "modules/inventorysmart/services-inventorysmart/Finalize/store-view-services";
import {
  setSelectedFilters,
  setInventorysmartOrderBatchingFilterDependency,
} from "modules/inventorysmart/services-inventorysmart/Order-Batching/order-batching-services";
import React, { useState, useEffect, useCallback } from "react";
import { connect } from "react-redux";
import InvalidAllocation from "./InvalidAllocation";
import { setFinalizeToDashboardReload } from "modules/inventorysmart/services-inventorysmart/Decision-Dashboard/decision-dashboard-services";
import { useNavigate } from "react-router-dom-v5-compat";

/**
 * @description Determines whether the "Move to Order Batching" action should be
 * disabled for a PO-based allocation. PO-based allocations.
 */
const isPOFinaliseDisabled = (disablePOFinalise, planType) =>
  Boolean(disablePOFinalise) &&
  planType === "PO";

const TriageButton = (props) => {
  const [storeViewResposne, setStoreViewResposne] = useState({});
  const [disableTriageButton, setDisableTriageButton] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const getButtonLabel = () =>
    t("inventorysmart.moveToOrderBatching", {
      module_label: props?.orderBatchingModuleLabel || "Order Batching",
    });

  const fetchMoveToOrderBatchingStatus = useCallback(async () => {
    try {
      props.setMoveToTiageLoader(true);
      let response = await props.moveToOrderBatchingStatus(
        props.allocationCode
      );
      setDisableTriageButton(response.data?.data?.is_disable);
    } catch (e) {
      handleErrorMessage(e);
    } finally {
      props.setMoveToTiageLoader(false);
    }
  }, [props.setMoveToTiageLoader, props.moveToOrderBatchingStatus, props.allocationCode]);

  useEffect(() => {
    if (props.renderToggleSummary && props.selectedOption) {
      fetchMoveToOrderBatchingStatus();
    }
  }, [props.renderToggleSummary, props.selectedOption]);

  // Disable Move to Order Batching for PO-based allocations (config driven),
  // even when the status API is not invoked for the current view.
  useEffect(() => {
    if (isPOFinaliseDisabled(props.finalizeAllocationConfig?.disablePOFinalise, props.planType)) {
      setDisableTriageButton(true);
    }
  }, [props.finalizeAllocationConfig, props.planType]);

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message || errObj?.display_error)
      displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(ERROR_MESSAGE, "error");
    props.setMoveToTiageLoader(false);
  };

  const getArticlePayload = () => {
    if (props.planType === "Auto Allocation") {
      if (props.selectedArticles?.length > 0) {
        return { article: props.selectedArticles };
      } else if (props.articlesParams?.length > 0) {
        return { article: props.articlesParams };
      }
      return {};
    } else {
      if (props.selectedArticles?.length > 0) {
        return { article: props.selectedArticles };
      }
      return props.articlesParams?.length > 0
        ? { article: props.articlesParams }
        : {};
    }
  };

  const handleOrderTriageClick = async () => {
    try {
      props.setMoveToTiageLoader(true);
      setShowDialog(false);
      let l_triageResponse = await props.changePlanStatus({
        allocation_code: props.originalAllocationCode
          ? props.originalAllocationCode
          : props.allocationCode,
        ...getArticlePayload(),
        edited_allocation_code: props.originalAllocationCode
          ? props.allocationCode
          : null,
        status: 2,
        plan_type: props?.planType,
        check_reallocation: true,
      });
      setStoreViewResposne(l_triageResponse.data);
      if (l_triageResponse.data?.status) {
        if (l_triageResponse.data?.data?.reallocate) {
          props.setShowTables && props.setShowTables(false);
          props.updatePlanStatusResponse &&
            props.updatePlanStatusResponse(l_triageResponse.data);
        } else if (!l_triageResponse.data?.data?.display_error && !l_triageResponse.data?.data?.reallocate) {
          props.finalizeAllocationConfig?.clearNotification &&
            (await props.clearNotification({
              event_id: new URLSearchParams(window.location.search).get(
                "allocation_code"
              ),
              delete_type: "soft_delete",
            }));
          props.setSelectedFilters(props.selectedFilters);
          props.setInventorysmartOrderBatchingFilterDependency(
            props.inventorySmartFinalizeFilterDependency
          );
          props.setFinalizeToDashboardReload(true);
          setTimeout(() => {
            navigate(`${DASHBOARD}`);
          }, 1000);
        } else if (
        l_triageResponse.data?.data?.display_error &&
        !l_triageResponse.data?.data?.reallocate
      ) {
        displaySnackMessages(l_triageResponse.data?.data?.message, "error");
      }
      } else {
        displaySnackMessages(l_triageResponse.data?.data?.message, "error");
      }
    } catch (e) {
      handleErrorMessage(e);
      setStoreViewResposne({}); // Clear response on error
      props.setMoveToTiageLoader(false);
    }
    finally {
      props.setMoveToTiageLoader(false);
    }
  };

  const showMoveToOrderBatchingPrompt = () => {
    setShowDialog(true);
  };

  return (
    <>
      <Button
        style={{ marginLeft: "5px" }}
        variant="priamry"
        id="triageBtn"
        onClick={
          props.renderToggleSummary
            ? showMoveToOrderBatchingPrompt
            : handleOrderTriageClick
        }
        disabled={
          props.disabledForViewOnlyAccess ||
          props.editAllocatedQtyLoader ||
          props.planStatus === "Moved to Order Batching" ||
          props.planStatus === "Moved to Allocation Batching" ||
          disableTriageButton
        }
      >
        {getButtonLabel()}
      </Button>
      <Prompt
        isOpen={showDialog}
        title={getButtonLabel()}
        children={t("inventorysmart.moveToOrderBatchingConfirm", {
          module_label: props?.orderBatchingModuleLabel || "Order Batching",
        })}
        primaryButtonLabel="Yes"
        onPrimaryButtonClick={() => {
          handleOrderTriageClick();
        }}
        secondaryButtonLabel="No"
        onSecondaryButtonClick={() => {
          setShowDialog(false);
        }}
        variant="warning"
      />
    </>
  );
};

const mapStateToProps = (store) => {
  const finalizeAllocationConfig =
    store?.inventorysmartReducer?.inventorySmartCommonService
      ?.inventorysmartFinalizeAllocationConfig;
  const isNewProductFlow = finalizeAllocationConfig?.enableNewFinalizeFlowProductView;
  const isNewStoreFlow = finalizeAllocationConfig?.enableNewFinalizeFlowStoreView;
  const isAnyNewFlow = isNewProductFlow || isNewStoreFlow;
  const oldStoreView =
    store.inventorysmartReducer.inventorySmartFinalizeStoreViewService;
  const newStoreView =
    store.inventorysmartReducer.inventorySmartNewFlowStoreViewService;
  const storeView = isAnyNewFlow ? newStoreView : oldStoreView;

  return {
    selectedFilters:
      store.inventorysmartReducer.inventorySmartFinalizeProductViewService
        .selectedFilters,
    planStatus: storeView.planStatus,
    articles: storeView.articles,
    storeDetialsTableDataForFinalize:
      store.inventorysmartReducer.inventorySmartFinalizeProductViewService
        .storeDetialsTableDataForFinalize,
    allocationCode: storeView.allocationCode,
    originalAllocationCode: storeView.originalAllocationCode,
    inventorySmartFinalizeFilterDependency:
      store.inventorysmartReducer.inventorySmartFinalizeProductViewService
        .inventorySmartFinalizeFilterDependency,
    editAllocatedQtyLoader: oldStoreView.editAllocatedQtyLoader,
    selectedArticles: storeView.selectedArticles,
    planType: storeView?.planType,
    renderToggleSummary:
      finalizeAllocationConfig?.drillDown?.renderToggleSummary,
    finalizeAllocationConfig,
    orderBatchingModuleLabel:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.orderBatchingConfig?.module_label,
  };
};

const mapDispatchToProps = (dispatch) => ({
  changePlanStatus: (payload) => dispatch(changePlanStatus(payload)),
  clearNotification: (payload) => dispatch(clearNotification(payload)),
  setMoveToTiageLoader: (payload) => dispatch(setMoveToTiageLoader(payload)),
  setSelectedFilters: (payload) => dispatch(setSelectedFilters(payload)),
  setInventorysmartOrderBatchingFilterDependency: (payload) =>
    dispatch(setInventorysmartOrderBatchingFilterDependency(payload)),
  addSnack: (snack) => dispatch(addSnack(snack)),
  setFinalizeToDashboardReload: (payload) =>
    dispatch(setFinalizeToDashboardReload(payload)),
  moveToOrderBatchingStatus: (payload) =>
    dispatch(moveToOrderBatchingStatus(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(TriageButton);
