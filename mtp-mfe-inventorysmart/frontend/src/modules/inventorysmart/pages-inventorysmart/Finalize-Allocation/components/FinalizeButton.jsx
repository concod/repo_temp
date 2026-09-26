import { Button } from "impact-ui-v3";
import { addSnack } from "core/actions/snackbarActions";
import { isEmpty } from "lodash";
import {
  API_SUCCESS_MESSAGE_FINALIZE,
  ERROR_MESSAGE,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  changePlanStatus,
  setAllocationCode,
  setDownloadPlan,
  setFinalized,
  setMoveToTiageLoader,
  uploadInv,
  uploadPO,
} from "modules/inventorysmart/services-inventorysmart/Finalize/store-view-services";
import React, { useState } from "react";
import { connect } from "react-redux";
import { generateXMLDataForDownload } from "..";
import InvalidAllocation from "./InvalidAllocation";
import { common } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { Prompt } from "impact-ui-v3";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import { setAutoDashboardLoad } from "modules/inventorysmart/services-inventorysmart/Decision-Dashboard/decision-dashboard-services";
import { autoFinalizeOrderBatchingData } from "modules/inventorysmart/services-inventorysmart/Order-Batching/order-batching-services";

const FinalizeButton = (props) => {
  const [storeViewResposne, setStoreViewResposne] = useState({});
  const [checkCrossCountry, setCheckCrossCountry] = useState(true);
  const [finalizeAlert, setFinalizeAlert] = useState(false);

  const uploadMapping = {
    po: props.uploadPO,
    invn: props.uploadInv,
  };

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
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(ERROR_MESSAGE, "error");
  };

  const getArticlePayload = () => {
    //temporary change for DG to enable partial finalize for normal allocation isPartialFinalizeEnabledForNormalAllocation
    if (props.planType === "Auto Allocation" || props.isPartialFinalizeEnabledForNormalAllocation) {
      if (props.selectedArticles?.length > 0) {
        return { article: props.selectedArticles };
      } else if (props.articlesParams?.length > 0) {
        return { article: props.articlesParams };
      } else if (props.autoAllocationArticlesFromDashboard?.length > 0) {
        return { article: props.autoAllocationArticlesFromDashboard };
      }
      return {};
    } else {
      if (props.selectedArticles?.length > 0) {
        return { article: props.selectedArticles };
      }
      return props.articlesParams?.length > 0
        ? { article: props.articlesParams }
        : props.autoAllocationArticlesFromDashboard?.length > 0
        ? { article: props.autoAllocationArticlesFromDashboard }
        : {};
    }
  };

  const uploadXML = async (p_output) => {
    try {
      let l_uploadableFiles =
        props?.finalizeAllocationConfig?.upload;
      let l_apis = [];
      let l_xmlData = generateXMLDataForDownload(p_output);
      for (let i of l_uploadableFiles) {
        l_apis.push(p_output[i] ? uploadMapping[i](l_xmlData[i]) : null);
      }
      Promise.all(l_apis)
        .then((values) => {
          displaySnackMessages("Files Uploaded Successfully!!", "success");
        })
        .catch((error) => {
          handleErrorMessage(error);
        });
    } catch (error) {
      handleErrorMessage(error);
    }
  };

  const handleFinalizeClick = async () => {
    try {
      if (props.loaderSetter) {
        props.loaderSetter(true);
      } else {
        props.setMoveToTiageLoader(true);
      }
      // status will be fethced from tenent_attribute after demo
      let l_triageResponse = await props.changePlanStatus({
        allocation_code: props.originalAllocationCode
          ? props.originalAllocationCode
          : props.allocationCode || props.autoAllocationCodeFromDashboard,
        ...getArticlePayload(),
        edited_allocation_code: props.originalAllocationCode
          ? props.allocationCode
          : null,
        status: 3,
        ...(props.finalizeAllocationConfig?.checkCrossCountry
          ? { check_cross_country: checkCrossCountry }
          : {}),
        check_reallocation: true,
        plan_type: props?.planType,
      });
      if (!l_triageResponse.data?.status && l_triageResponse.data?.show_message) {
        setStoreViewResposne(l_triageResponse.data);
        displaySnackMessages(l_triageResponse.data?.message, "error");
        if (!props.finalizeAllocationConfig?.reCreateAllocation) {
          props.setAllocationCode(null);
          let l_allocationCodeCopy = props.allocationCode;
          props.setAllocationCode(l_allocationCodeCopy);
        }
      }
      if (l_triageResponse.data?.status) {
        !l_triageResponse.data?.data?.reallocate && props.setFinalized(true);
        if(l_triageResponse.data?.data?.reallocate){
          props.setShowTables && props.setShowTables(false);
          props.updatePlanStatusResponse && props.updatePlanStatusResponse(l_triageResponse.data);
        }
        if (props.reloadDashboard) {
          props.setAutoDashboardLoad(true);
        }
        if (props.finalizeDownstreamEnabled) {
          const autoFinalizeResponse = await props.autoFinalizeOrderBatchingData(
            {
              payload: [
                {
                  allocation_code:
                    l_triageResponse.data?.data?.allocation_code ||
                    props.allocationCode,
                },
              ],
            }
          );
        }

        l_triageResponse.data?.data?.display_error && !l_triageResponse.data?.data?.reallocate && displaySnackMessages(l_triageResponse.data?.data?.message, "error");
        
        !l_triageResponse.data?.data?.reallocate && !l_triageResponse.data?.data?.display_error && displaySnackMessages(API_SUCCESS_MESSAGE_FINALIZE, "success");

        if (!isEmpty(l_triageResponse.data.data.output)) {
          props.setDownloadPlan(l_triageResponse.data.data.output);
          uploadXML(l_triageResponse.data.data.output);
        }
      }
      // didn't requied, but keeping for future reference
      // if (
      //   !l_triageResponse.data?.data?.status &&
      //   l_triageResponse.data?.data?.message
      // ) {
      //   displaySnackMessages(l_triageResponse.data.data.message, "info");
      // }
    } catch (e) {
      handleErrorMessage(e);
    } finally {
      if (props.loaderSetter) {
        props.loaderSetter(false);
      }
      props.setMoveToTiageLoader(false);
    }
  };
  const handleAlert = () => {
    if (props.isAlertNeeded) setFinalizeAlert(true);
    else handleFinalizeClick();
  };
  const onCancelCallBack = () => {
    setCheckCrossCountry(false);
  };
  const promptPrimaryBtn = () => {
    handleFinalizeClick();
    setFinalizeAlert(false);
  };

  const promptSecondaryBtn = () => setFinalizeAlert(false);
  return (
    <>
      {(!props.finalized || props.autoAllocationCodeFromDashboard) && (
        <Button
          variant="primary"
          style={{ marginLeft: "5px" }}
          id="finalizeBtn"
          onClick={() => handleAlert()}
          disabled={
            (!props.autoAllocationCodeFromDashboard &&
              (props.disabledForViewOnlyAccess ||
                props.editAllocatedQtyLoader ||
                // !props.storeDetialsTableDataForFinalize ||
                props.finalized)) ||
            props?.resposne?.data?.reallocate
          }
        >
          {props?.finalizeAllocationConfig?.btnLabel || "Finalize"}
        </Button>
      )}
      <Prompt
        isOpen={finalizeAlert}
        title="Confirm Finalize"
        children={
          <div>
            {`You are finalizing ${props?.finalizeAllocationConfig?.isPartialFinalizeEnabled ? 'only the selected' : 'all'} ${dynamicLabelsBasedOnTenant("article").toLowerCase()}s in the allocation plan. After finalization, you will not be able to modify the allocation plan. Are you sure you want to continue?`}
          </div>
        }
        infoList={[]}
        variant="info"
        primaryButtonLabel={common.__ConfirmBtnText}
        onPrimaryButtonClick={promptPrimaryBtn}
        secondaryButtonLabel={common.__RejectBtnText}
        onSecondaryButtonClick={promptSecondaryBtn}
        handleClose={promptSecondaryBtn}
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
    finalized: oldStoreView.finalized,
    storeDetialsTableDataForFinalize:
      store.inventorysmartReducer.inventorySmartFinalizeProductViewService
        .storeDetialsTableDataForFinalize,
    allocationCode: storeView.allocationCode,
    originalAllocationCode: storeView.originalAllocationCode,
    editAllocatedQtyLoader: oldStoreView.editAllocatedQtyLoader,
    articles: storeView.articles,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    finalizeAllocationConfig,
    isAlertNeeded: finalizeAllocationConfig?.isAlertNeeded,
    finalizeDownstreamEnabled: finalizeAllocationConfig?.finalizeDownstreamEnabled,
    selectedArticles: storeView.selectedArticles,
    planType: storeView?.planType,
    isPartialFinalizeEnabledForNormalAllocation:
      finalizeAllocationConfig?.isPartialFinalizeEnabledForNormalAllocation,
  };
};

const mapDispatchToProps = (dispatch) => ({
  changePlanStatus: (payload) => dispatch(changePlanStatus(payload)),
  setMoveToTiageLoader: (payload) => dispatch(setMoveToTiageLoader(payload)),
  setFinalized: (payload) => dispatch(setFinalized(payload)),
  setDownloadPlan: (payload) => dispatch(setDownloadPlan(payload)),
  addSnack: (snack) => dispatch(addSnack(snack)),
  uploadPO: (payload) => dispatch(uploadPO(payload)),
  uploadInv: (payload) => dispatch(uploadInv(payload)),
  setAllocationCode: (payload) => dispatch(setAllocationCode(payload)),
  setAutoDashboardLoad: (payload) => dispatch(setAutoDashboardLoad(payload)),
  autoFinalizeOrderBatchingData: (payload) =>
    dispatch(autoFinalizeOrderBatchingData(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(FinalizeButton);
