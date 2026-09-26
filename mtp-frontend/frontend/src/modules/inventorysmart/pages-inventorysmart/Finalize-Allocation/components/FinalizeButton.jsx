import { Button } from "@mui/material";
import { addSnack } from "core/actions/snackbarActions";
import { cloneDeep, isEmpty } from "lodash";
import {
  API_SUCCESS_MESSAGE_FINALIZE,
  API_SUCCESS_MESSAGE_FINALIZE_RL,
  CASE_PACK_ERROR_MESSAGE,
  ERROR_MESSAGE,
  PARTIAL_ARTICLE_SELECT_MSG_FOR_PO,
  PO_PARTIAL_ALLOCATION_FINALIZE_ERROR_MSG,
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
import { Prompt } from "impact-ui";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import { setAutoDashboardLoad } from "modules/inventorysmart/services-inventorysmart/Decision-Dashboard/decision-dashboard-services";

const FinalizeButton = (props) => {
  const [storeViewResposne, setStoreViewResposne] = useState({});
  const [checkCrossCountry, setCheckCrossCountry] = useState(true);
  const [finalizeAlert, setFinalizeAlert] = useState(false);
  const [warningCount, setWarningCount] = useState(0);
  const [counter, setCounter] = useState(0);

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

  const uploadXML = async (p_output) => {
    try {
      let l_uploadableFiles =
        props?.inventorysmartScreenConfig?.finalize?.upload;
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
          displaySnackMessages("Error in Uploading Files!!", "error");
        });
    } catch {}
  };
  const check100Push = (columnData, summaryData) => {
    let updatedCol = cloneDeep(columnData);
    const result = updatedCol
      .filter((item) => item.extra?.net_dc_available_check === true)
      .map((item) => item.sub_headers.map((subHeader) => subHeader.column_name))
      .flat();

    const sum = result.reduce((total, item) => {
      return total + (summaryData[item] || 0); // If the key doesn't exist, default to 0
    }, 0);

    return sum === 0;
}

  const checkVCPQError = (obj) => {
    if (counter > 0) {
      return;
    } else {
      for (const key in obj) {
        if (obj[key] === true) {
          setCounter(prevCounter => prevCounter + 1);
          displaySnackMessages(CASE_PACK_ERROR_MESSAGE, "info");
          break;
        }
      }
    }
  };

  const handleFinalizeClick = async () => {
    try {
      if (props.loaderSetter) {
        props.loaderSetter(true);
      } else {
        props.setMoveToTiageLoader(true);
      }
      if (props.planType === "PO" ) {
        if (props.selectedArticles && props?.articleSummaryData?.no_style_color !== props.selectedArticles?.length) {
          displaySnackMessages(PARTIAL_ARTICLE_SELECT_MSG_FOR_PO, "error");
          return;
        }

        if (!check100Push(props.articleSummaryColumnData, props.articleSummaryData) && warningCount === 0) {
          displaySnackMessages(PO_PARTIAL_ALLOCATION_FINALIZE_ERROR_MSG, "info");
          setWarningCount(prev => prev + 1);
          return;
        }
        checkVCPQError(props.vcpqErrorData);
      }

      // status will be fethced from tenent_attribute after demo
      let l_triageResponse = await props.changePlanStatus({
        allocation_code: props.originalAllocationCode
          ? props.originalAllocationCode
          : props.allocationCode || props.autoAllocationCodeFromDashboard,
        ...(props.selectedArticles ||
        props.articles ||
        props.autoAllocationArticlesFromDashboard
          ? {
              article:
                props.selectedArticles ||
                props.articles ||
                props.autoAllocationArticlesFromDashboard,
            }
          : {}),
        edited_allocation_code: props.originalAllocationCode
          ? props.allocationCode
          : null,
        status: 3,
        ...(props.inventorysmartScreenConfig?.finalize?.checkCrossCountry
          ? { check_cross_country: checkCrossCountry,
            // key added for rl eu to ignore cross_country validation
            ignore_cross_country : !props.inventorysmartScreenConfig?.isCrossCountryAllowed }
          : {}),
        ...(props.inventorysmartScreenConfig?.finalize?.reCreateAllocation
          ? { check_reallocation: true }
          : {}),
      });

      if (l_triageResponse.data?.data?.display_error) {
        setStoreViewResposne(l_triageResponse.data);
        if (!props.inventorysmartScreenConfig?.finalize?.reCreateAllocation) {
          props.setAllocationCode(null);
          let l_allocationCodeCopy = props.allocationCode;
          props.setAllocationCode(l_allocationCodeCopy);
        }
      }

      if (
        l_triageResponse.data.status &&
        !l_triageResponse.data?.data?.display_error
      ) {
        props.setFinalized(true);
        const client = props.inventorysmartScreenConfig?.client || "";
        const SUCCESS_MESSAGE = (client === "_NA" || client === "_EU") ? API_SUCCESS_MESSAGE_FINALIZE_RL : API_SUCCESS_MESSAGE_FINALIZE; 
        displaySnackMessages(SUCCESS_MESSAGE, "success");
        if (props.reloadDashboard) {
          props.setAutoDashboardLoad(true);
        }
        if (!isEmpty(l_triageResponse.data.data.output)) {
          props.setDownloadPlan(l_triageResponse.data.data.output);
          uploadXML(l_triageResponse.data.data.output);
        }
      }
    } catch(err) {
      console.log(">>>>>>", err)
      displaySnackMessages(ERROR_MESSAGE, "error");
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

  return (
    <>
      <InvalidAllocation
        resposne={storeViewResposne}
        onCancelCallBack={onCancelCallBack}
        inventorysmartScreenConfig={props.inventorysmartScreenConfig}
        autoAllocationCodeFromDashboard={props.autoAllocationCodeFromDashboard}
      />
      {(!props.finalized || props.autoAllocationCodeFromDashboard) && (
        <Button
          variant="contained"
          color="primary"
          className={props.classes.button}
          id="finalizeBtn"
          onClick={() => handleAlert()}
          disabled={
            !props.autoAllocationCodeFromDashboard &&
            (props.disabledForViewOnlyAccess ||
              props.editAllocatedQtyLoader ||
              // !props.storeDetialsTableDataForFinalize ||
              props.finalized) || ( !props.autoAllocationCodeFromDashboard && props.articleSummaryData.length <= 0)
          }
        >
          {props?.inventorysmartScreenConfig?.finalize?.btnLabel || "Finalize"}
        </Button>
      )}
      <Prompt
        isOpen={finalizeAlert}
        title="Confirm Finalize"
        subHeading={`Once the allocation is finalized, any changes made to the selected or all ${dynamicLabelsBasedOnTenant(
          "article"
        )} cannot be reversed. Are you sure?`}
        infoList={[]}
        primaryButtonProps={{
          children: common.__ConfirmBtnText,
          onClick: () => {
            handleFinalizeClick();
            setFinalizeAlert(false);
          },
        }}
        tertiaryButtonProps={{
          children: common.__RejectBtnText,
          onClick: () => setFinalizeAlert(false),
        }}
      />
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    finalized:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .finalized,
    storeDetialsTableDataForFinalize:
      store.inventorysmartReducer.inventorySmartFinalizeProductViewService
        .storeDetialsTableDataForFinalize,
    allocationCode:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .allocationCode,
    originalAllocationCode:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .originalAllocationCode,
    editAllocatedQtyLoader:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .editAllocatedQtyLoader,
    articles:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .articles,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    isAlertNeeded:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig.finalize.isAlertNeeded,
    selectedArticles:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .selectedArticles,
    planType:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .planType,
    articleSummaryData:
      store.inventorysmartReducer.inventorySmartFinalizeProductViewService
        .articleSummaryData,
    articleSummaryColumnData:
      store.inventorysmartReducer.inventorySmartFinalizeProductViewService
        .articleSummaryColumnData,
    vcpqErrorData:
      store.inventorysmartReducer.inventorySmartFinalizeProductViewService
        .vcpqErrorData,
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
});

export default connect(mapStateToProps, mapDispatchToProps)(FinalizeButton);
