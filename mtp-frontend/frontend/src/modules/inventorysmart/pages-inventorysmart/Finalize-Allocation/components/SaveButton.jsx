import { Button } from "@mui/material";
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
    } catch {
      displaySnackMessages(ERROR_MESSAGE, "error");
    } finally {
      props.setMoveToTiageLoader(false);
    }
  };
  return (
    <>
      <InvalidAllocation resposne={storeViewResposne} />
      <Button
        variant="contained"
        color="primary"
        className={props.classes.button}
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
  return {
    finalized:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .finalized,
    allocationCode:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .allocationCode,
    originalAllocationCode:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .originalAllocationCode,
  };
};

const mapDispatchToProps = (dispatch) => ({
  saveAllocation: (payload) => dispatch(saveAllocation(payload)),
  setMoveToTiageLoader: (payload) => dispatch(setMoveToTiageLoader(payload)),
  addSnack: (snack) => dispatch(addSnack(snack)),
});

export default connect(mapStateToProps, mapDispatchToProps)(SaveButton);
