import { Button } from "@mui/material";
import { addSnack } from "core/actions/snackbarActions";
import { ORDER_BATCHING } from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  changePlanStatus,
  setMoveToTiageLoader,
} from "modules/inventorysmart/services-inventorysmart/Finalize/store-view-services";
import {
  setSelectedFilters,
  setInventorysmartOrderBatchingFilterDependency,
} from "modules/inventorysmart/services-inventorysmart/Order-Batching/order-batching-services";
import React, { useState } from "react";
import { connect } from "react-redux";
import InvalidAllocation from "./InvalidAllocation";

const TriageButton = (props) => {
  const [storeViewResposne, setStoreViewResposne] = useState({});

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const handleOrderTriageClick = async () => {
    try {
      props.setMoveToTiageLoader(true);
      // status will be fethced from tenent_attribute after demo
      let l_triageResponse = await props.changePlanStatus({
        allocation_code: props.originalAllocationCode
          ? props.originalAllocationCode
          : props.allocationCode,
        // article: props.articles,
        ...(props.selectedArticles || props.articles
          ? { article: props.selectedArticles || props.articles }
          : {}),
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
        props.setSelectedFilters(props.selectedFilters);
        props.setInventorysmartOrderBatchingFilterDependency(
          props.inventorySmartFinalizeFilterDependency
        );
        setTimeout(() => {
          props.history.push(`${ORDER_BATCHING}`);
        }, 1000);
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
        id="triageBtn"
        onClick={handleOrderTriageClick}
        disabled={
          props.disabledForViewOnlyAccess || props.editAllocatedQtyLoader
        }
      >
        Go to Order Batching
      </Button>
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    selectedFilters:
      store.inventorysmartReducer.inventorySmartFinalizeProductViewService
        .selectedFilters,
    articles:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .articles,
    storeDetialsTableDataForFinalize:
      store.inventorysmartReducer.inventorySmartFinalizeProductViewService
        .storeDetialsTableDataForFinalize,
    allocationCode:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .allocationCode,
    originalAllocationCode:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .originalAllocationCode,
    inventorySmartFinalizeFilterDependency:
      store.inventorysmartReducer.inventorySmartFinalizeProductViewService
        .inventorySmartFinalizeFilterDependency,
    editAllocatedQtyLoader:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .editAllocatedQtyLoader,
    selectedArticles:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .selectedArticles,
  };
};

const mapDispatchToProps = (dispatch) => ({
  changePlanStatus: (payload) => dispatch(changePlanStatus(payload)),
  setMoveToTiageLoader: (payload) => dispatch(setMoveToTiageLoader(payload)),
  setSelectedFilters: (payload) => dispatch(setSelectedFilters(payload)),
  setInventorysmartOrderBatchingFilterDependency: (payload) =>
    dispatch(setInventorysmartOrderBatchingFilterDependency(payload)),
  addSnack: (snack) => dispatch(addSnack(snack)),
});

export default connect(mapStateToProps, mapDispatchToProps)(TriageButton);
