import { Button } from "impact-ui-v3";
import { addSnack } from "core/actions/snackbarActions";
import {
  API_SUCCESS_MESSAGE_SAVE,
  ERROR_MESSAGE,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  saveAllocation,
  setMoveToTiageLoader,
} from "modules/inventorysmart/services-inventorysmart/Finalize/store-view-services";
import React, { useState } from "react";
import { connect } from "react-redux";
import InvalidAllocation from "./InvalidAllocation";

const SaveButton = (props) => {
  const [storeViewResposne, setStoreViewResposne] = useState({});

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };
  const handleFinalizeClick = async () => {
    try {
      props.setMoveToTiageLoader(true);
      let l_triageResponse = await props.saveAllocation({
        allocation_code: props.originalAllocationCode
          ? props.originalAllocationCode
          : props.allocationCode,
        edited_allocation_code: props.originalAllocationCode
          ? props.allocationCode
          : null,
        status: 2,
      });
      setStoreViewResposne(l_triageResponse.data);

      if (
        l_triageResponse.data.status &&
        !l_triageResponse.data?.data?.display_error
      ) {
        displaySnackMessages(API_SUCCESS_MESSAGE_SAVE, "success");
      }
    } catch (e) {
      const errObj = e?.response?.data;
      if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
      else displaySnackMessages(ERROR_MESSAGE, "error");
    } finally {
      props.setMoveToTiageLoader(false);
    }
  };
  return (
    <>
      <InvalidAllocation resposne={storeViewResposne} />
      <Button
        variant="primary"
        style={{marginLeft:'5px'}}
        id="saveBtn"
        onClick={handleFinalizeClick}
        disabled={
          props.disabledForViewOnlyAccess || !props.originalAllocationCode
        }
      >
        Save
      </Button>
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
    allocationCode: storeView.allocationCode,
    originalAllocationCode: storeView.originalAllocationCode,
  };
};

const mapDispatchToProps = (dispatch) => ({
  saveAllocation: (payload) => dispatch(saveAllocation(payload)),
  setMoveToTiageLoader: (payload) => dispatch(setMoveToTiageLoader(payload)),
  addSnack: (snack) => dispatch(addSnack(snack)),
});

export default connect(mapStateToProps, mapDispatchToProps)(SaveButton);
