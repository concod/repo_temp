import { Button } from "@mui/material";
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
import { Prompt } from "impact-ui";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";

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
        // article: props.articles,
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
          ? { check_cross_country: checkCrossCountry }
          : {}),
      });

      if (l_triageResponse.data?.data?.display_error) {
        setStoreViewResposne(l_triageResponse.data);
        props.setAllocationCode(null);
        let l_allocationCodeCopy = props.allocationCode;
        props.setAllocationCode(l_allocationCodeCopy);
      }

      if (
        l_triageResponse.data.status &&
        !l_triageResponse.data?.data?.display_error
      ) {
        props.setFinalized(true);
        displaySnackMessages(API_SUCCESS_MESSAGE_FINALIZE, "success");
        if (!isEmpty(l_triageResponse.data.data.output)) {
          props.setDownloadPlan(l_triageResponse.data.data.output);
          uploadXML(l_triageResponse.data.data.output);
        }
      }
    } catch {
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
              props.finalized)
          }
        >
          Finalize
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
});

export default connect(mapStateToProps, mapDispatchToProps)(FinalizeButton);
