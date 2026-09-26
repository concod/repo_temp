import React, { useEffect, useRef, useState } from "react";
import { Button, Grid, Paper, Typography } from "@mui/material";

import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import { connect } from "react-redux";
import {
  bulkUpdateAllocatedUnits,
  getProductStoreSizeView,
  setAllocationCode,
  setOriginalAllocationCode,
  setProductStoreSizeViewLoader,
} from "modules/inventorysmart/services-inventorysmart/Finalize/store-view-services";
import { addSnack } from "core/actions/snackbarActions";
import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { getIgnoreAllocationCode } from "../../Create-Allocation/helperFunctions";
import {
  appendExcelDownloadData,
  fetchFilterChipsToDownload,
  prependExtraData,
} from "core/Utils/agGrid/table-functions";
import { isEmpty } from "lodash";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import globalStyles from "core/Styles/globalStyles";

const NewProductStoreSizeDetailsTableComponent = (props) => {
  const [
    productStoreSizeDetailsTableColumns,
    setProductStoreSizeDetailsTableColumns,
  ] = useState([]);
  const [
    productStoreSizeDetailsTableData,
    setProductStoreSizeDetailsTableData,
  ] = useState([]);
  const [
    downloadFormatChipsDependency,
    setDownloadFormatChipsDependency,
  ] = useState({});
  const [userEdits, setUserEditsForAllEdits] = useState({});
  const productStoreSizeDetailsTableInstance = useRef(null);
  const globalClasses = globalStyles();
  const classes = useStyles();
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

  const saveHandler = async () => {
    try {
      let l_requestToUpdateAllocatedQty = {};

      l_requestToUpdateAllocatedQty["allocation_code"] =
        props.originalAllocationCode || props.allocationCode;
      l_requestToUpdateAllocatedQty[
        "edited_allocation_code"
      ] = !props.originalAllocationCode ? null : props.allocationCode;
      l_requestToUpdateAllocatedQty["allocation_row"] = {
        [props.selectedArticle]: userEdits,
      };
      let l_rowData = [];
      productStoreSizeDetailsTableInstance.current?.api?.forEachNode((node) => {
        if (node.data) l_rowData.push(node.data);
      });
      // if (Object.values(l_rowData[0])?.some((el) => el < 0)) {
      //   displaySnackMessages(
      //     "The allocated eaches are more than the available units!!",
      //     "error"
      //   );
      //   return;
      // }
      let l_response = await props.bulkUpdateAllocatedUnits(
        l_requestToUpdateAllocatedQty,
        props.isV3?.includes("bulkEdit")
      );
      if (l_response?.data?.status) {
        props.resetProductStoreDetailsState();
        if (!props.originalAllocationCode) {
          props.setOriginalAllocationCode(props.allocationCode);
        }
        if (l_response?.data?.data?.allocation_code) {
          props.setAllocationCode(l_response?.data?.data?.allocation_code);
        } else {
          props.setAllocationCode(null);
          let l_allocationCodeCopy = props.allocationCode;
          props.setAllocationCode(l_allocationCodeCopy);
        }
        displaySnackMessages("Updated Successfully!!", "success");
      }
      setUserEditsForAllEdits({});
    } catch (err) {
      handleErrorMessage(err);
    }
  };
  const onBlur = async (_e, data, column, _, value, initialValue) => {
    let l_column = column.colId;
    setUserEditsForAllEdits((old) => {
      return {
        ...old,
        [data.store_code]: {
          [`${data.dc_code}__${data.packs_allocated}`]: data?.[l_column],
        },
      };
    });
  };
  useEffect(() => {
    props.allocationCode &&
      props.selectedStoreCode &&
      (async () => {
        let columns = [];
        try {
          props.setProductStoreSizeViewLoader(true);
          let l_response = await props.getProductStoreSizeView({
            allocation_code: props.allocationCode,
            ignore_allocation_code: getIgnoreAllocationCode(
              props.originalAllocationCode,
              props.allocationCode
            ),
            article: props.selectedArticle,
            plan_status: props.planStatus,
            plan_type: props.planType ? props?.planType : "",
            store_code: props.selectedStoreCode,
          });
          if (l_response.data.status) {
            let l_responseData = l_response.data.data;

            l_responseData.table_config = l_responseData.table_config.map(
              (item) => {
                if (
                  item.column_name === "allocated_quantity" &&
                  props.planStatus === "Finalized"
                ) {
                  item.is_editable = false;
                }
                if (item.column_name === "store_code") {
                  item.is_editable = props.tab === "store" ? true : false;
                }
                return item;
              }
            );
            let formattedColumns = agGridColumnFormatter(
              l_responseData.table_config,
              null,
              props.actionMap
            );
            setProductStoreSizeDetailsTableColumns(formattedColumns);
            setProductStoreSizeDetailsTableData(l_responseData.table_data);
          }
        } catch (err) {
          handleErrorMessage(err);
        } finally {
          props.setProductStoreSizeViewLoader(false);
        }
      })();
  }, [props.allocationCode, props.selectedArticle, props.selectedStoreCode]);

  const loadTableInstance = (params) => {
    productStoreSizeDetailsTableInstance.current = params;
  };

  const prependData = () => {
    if (!isEmpty(downloadFormatChipsDependency)) {
      let prependContentReq = prependExtraData(downloadFormatChipsDependency);
      return appendExcelDownloadData(prependContentReq);
    }
  };

  useEffect(() => {
    if (props.filterDashboardConfiguration?.dependencyData?.length) {
      let filterChips = fetchFilterChipsToDownload(
        props.filterDashboardConfiguration?.dependencyData
      );
      setDownloadFormatChipsDependency(filterChips);
    }
  }, [props.filterDashboardConfiguration]);
  return (
    <>
      {/* here to add the edit and view logic */}
      <Loader loader={props.productStoreSizeTableLoader}>
        <AgGridComponent
          columns={productStoreSizeDetailsTableColumns}
          rowdata={productStoreSizeDetailsTableData}
          loadTableInstance={loadTableInstance} // to make use of available grid api's
          uniqueRowId={"store_code"}
          downloadAsExcel={
            productStoreSizeDetailsTableData?.length ? true : false
          }
          suppressFieldDotNotation
          onBlur={onBlur}
          pagination={false}
          toPrependContent={props.excelDownloadMetaData}
          prependedContentDetails={prependData()}
        />
        {props.isStoreBand && props.planStatus !== "Finalized" && (
          <Grid
            container
            direction="row"
            justifyContent="center"
            alignItems="center"
            className={globalClasses.marginAround}
          >
            <Button
              variant="contained"
              color="primary"
              id="productSetAllBtn"
              disabled={
                props.disabledForViewOnlyAccess ||
                isEmpty(userEdits) ||
                props.finalized
              }
              className={classes.button}
              onClick={() => saveHandler()}
            >
              Save Grid Edit
            </Button>
          </Grid>
        )}
      </Loader>
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    productStoreSizeTableLoader:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .productStoreSizeTableLoader,
    allocationCode:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .allocationCode,
    originalAllocationCode:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .originalAllocationCode,
    planStatus:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .planStatus,
    planType:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .planType,
    isV3:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.isV3,
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "viewPastAllocationFilterConfiguration"
      ]?.appliedFilterData,
    excelDownloadMetaData:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig?.excelDownloadMetaData,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setProductStoreSizeViewLoader: (payload) =>
    dispatch(setProductStoreSizeViewLoader(payload)),
  getProductStoreSizeView: (payload, isV3) =>
    dispatch(getProductStoreSizeView(payload, isV3)),
  addSnack: (snack) => dispatch(addSnack(snack)),
  setOriginalAllocationCode: (payload) =>
    dispatch(setOriginalAllocationCode(payload)),
  setAllocationCode: (payload) => dispatch(setAllocationCode(payload)),
  bulkUpdateAllocatedUnits: (payload, isV3) =>
    dispatch(bulkUpdateAllocatedUnits(payload, isV3)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(NewProductStoreSizeDetailsTableComponent);
