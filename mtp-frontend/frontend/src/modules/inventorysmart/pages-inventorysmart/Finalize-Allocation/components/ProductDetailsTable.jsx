import { addSnack } from "core/actions/snackbarActions";
import { ERROR_MESSAGE, NO_UPDATE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  getProductView,
  setProductViewLoader,
  setStoreDetailsTableData,
} from "modules/inventorysmart/services-inventorysmart/Finalize/product-view-services";
import {
  bulkUpdateMaterialLevel,
  getStoreView,
  setAllocationCode,
  setCurrentSelectedArticles,
  setOriginalAllocationCode,
  setSelectedArtilces,
} from "modules/inventorysmart/services-inventorysmart/Finalize/store-view-services";
import moment from "moment";
import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import {
  getIgnoreAllocationCode,
  shouldDisplayFinalizeButtons,
  shouldDisplaySelectComponent,
  shouldDisplayGridBulkEditButtons
} from "../../Create-Allocation/helperFunctions";
import InvalidAllocation from "./InvalidAllocation";
import {
  appendExcelDownloadData,
  fetchFilterChipsToDownload,
  prependExtraData,
} from "core/Utils/agGrid/table-functions";
import { isEmpty } from "lodash";
import { useRef } from "react";
import SetAllForPriorityCode from "./SetAllForPriorityCode";
import { Button } from "@mui/material";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import { cloneDeep } from "lodash";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";

const ProductDetailsTable = (props) => {
  const classes = useStyles();
  const flowType = new URLSearchParams(window.location.search).get("flow");

  const [productDetailsTableColumns, setProductDetailsTableColumns] = useState(
    []
  );
  const[reMount,setReMount]=useState(true)
  const [productDetailsTableData, setProductDetailsTableData] = useState([]);
  const [productViewResposne, setProductViewResposne] = useState({});
  const [editedRows, setEditedRows] = useState([]);
  const [
    downloadFormatChipsDependency,
    setDownloadFormatChipsDependency,
  ] = useState({});
  const productDetailsTableInstance = useRef(null);
  const [showSetAllPopUp, setShowSetAllPopUp] = useState(false);
  const [currentChannel, setCurrentChannel] = useState("");

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };
  useEffect(() => {
    !reMount && setReMount(true);
  }, [reMount]);
  useEffect(() => {
    if (props.allocationCode && props.planType) {
      (async () => {
        let columns = [],
          data = [];
        try {
          props.setProductViewLoader(true);
          let l_response = await props.getProductView(
            {
              allocation_code: props.allocationCode,
              article: props.articles,
              ignore_allocation_code: getIgnoreAllocationCode(
                props.originalAllocationCode,
                props.allocationCode
              ),
              plan_status: props.planStatus,
              plan_type: props.planType,
              ...(props.selectedStores && { store_code: props.selectedStores }),
            },
            props.isV3?.includes("productDetails")
          );
          if (l_response.data.status) {
            let l_responseData = l_response.data.data;
            columns = l_responseData.table_config;
            data = l_responseData.table_data;
            setProductViewResposne(l_response.data);
          }
        } catch {
          displaySnackMessages(ERROR_MESSAGE, "error");
        } finally {
          props.setProductViewLoader(false);
          let formattedColumns = agGridColumnFormatter(
            columns,
            null,
            props.actionMap
          );
          setProductDetailsTableColumns(formattedColumns);
          setCurrentChannel(data[0].channel);
          setProductDetailsTableData(data);
          setReMount(false)
        }
      })();
      // (async () => {
      //   let data = [];
      //   try {
      //     props.setStoreDetailsTableData(null);
      //     let l_response = await props.getStoreView({
      //       allocation_code: props.allocationCode,
      //       ignore_allocation_code: getIgnoreAllocationCode(
      //         props.originalAllocationCode,
      //         props.allocationCode
      //       ),
      //       plan_status: props.planStatus,
      //       plan_type: props.planType,
      //     });
      //     if (l_response.data.status) {
      //       let l_responseData = l_response.data.data;
      //       data = l_responseData.table_data;
      //       props.setStoreDetailsTableData(data);
      //     }
      //   } catch {}
      // })();
    }
  }, [props.allocationCode, props.selectedStores, props.planType]);

  const saveDeliveryDate = () => {
    // TODO:
    // api integration
  };

  const onCellValueChanged = (params) => {
    setEditedRows((old) => [...old, params.data]);
  };

  const prependData = () => {
    if (!isEmpty(downloadFormatChipsDependency)) {
      let l_downloadFormatChipsDependency = cloneDeep(downloadFormatChipsDependency);
      l_downloadFormatChipsDependency.product.value = downloadFormatChipsDependency.product.value.map((str)=> replaceSpecialCharacter(str ));
      let prependContentReq = prependExtraData(l_downloadFormatChipsDependency);
      return appendExcelDownloadData(prependContentReq);
    }
  };

  const onSelectionChanged = (event) => {
    // fetch all selected rows
    let l_rowData = [];
    productDetailsTableInstance?.current?.api?.forEachNode((node) =>
      l_rowData.push(node?.data)
    );
    let selections = event.api.getSelectedRows();
    let articleIds = selections.map((item) => item.article);
    props.setSelectedArtilces(
      articleIds.length && l_rowData?.length !== articleIds.length
        ? articleIds
        : null
    );
    props.setCurrentSelectedArticles(articleIds);
  };

  const loadTableInstance = (params) => {
    productDetailsTableInstance.current = params;
  };

  useEffect(() => {
    if (props.filterDashboardConfiguration?.dependencyData?.length) {
      let filterChips = fetchFilterChipsToDownload(
        props.filterDashboardConfiguration?.dependencyData
      );
      setDownloadFormatChipsDependency(filterChips);
    }
  }, [props.filterDashboardConfiguration]);

  const handleSave = async (formData) => {
    try {
      if (isEmpty(formData)) {
        displaySnackMessages(NO_UPDATE, "info");
        return;
      }
      props.setProductViewLoader(true);
      let req = {};
      let updatedShippingDate = formData?.shipping_date;
      req["allocation_code"] =
        props.originalAllocationCode || props.allocationCode;
      req["edited_allocation_code"] = !props.originalAllocationCode
        ? null
        : props.allocationCode;
        if (updatedShippingDate) {
          updatedShippingDate = { shipping_date : moment(updatedShippingDate).format("YYYY-MM-DD") };
        }
      req["allocation_data"] = {
        articles: props.currentSelectedArticles,
        updated_values: { ...formData, ...updatedShippingDate },
      };
      let l_response = await props.bulkUpdateMaterialLevel(
        req,
        props.isV3?.includes("bulkEdit")
      );
      if (l_response?.data?.status) {
        productDetailsTableInstance.current.api.refreshServerSideStore({
          purge: true,
        });
        productDetailsTableInstance.current.api.deselectAll();

        if (!props.originalAllocationCode) {
          props.setOriginalAllocationCode(props.allocationCode);
        }
        if (l_response?.data?.data?.allocation_code) {
          props.setAllocationCode(l_response?.data?.data?.allocation_code);
        } else {
          // TODO - to be revisited with setting allocated code
          props.setAllocationCode(null);
          let l_allocationCodeCopy = props.allocationCode;
          props.setAllocationCode(l_allocationCodeCopy);
        }
        props.setProductViewLoader(false);
        setShowSetAllPopUp(false);
        displaySnackMessages("Updated Successfully!!", "success");
      }
    } catch (err) {
      props.setProductViewLoader(false);
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  }

  return (
    <>
      {/* here */}
      <Loader loader={props.productViewLoader}>
        <InvalidAllocation resposne={productViewResposne} />

        { (props.inventorysmartScreenConfig?.client === "_NA" || props.inventorysmartScreenConfig?.client === "_EU") && props?.tab == "product" && !shouldDisplayGridBulkEditButtons(
          props.planStatus,
          props.planType,
          props?.inventorysmartScreenConfig?.finalize?.subComponent
        ) && (
          <Button
            variant="contained"
            color="primary"
            className={`${classes.button} ${classes.priorityCodeSetAllButton}`}
            disabled={isEmpty(props.currentSelectedArticles) || props.finalized}
            id="bulkEditEachesBtn"
            onClick={() => setShowSetAllPopUp(true)}
          >
            Set All
          </Button>
        )}
        {showSetAllPopUp && (
          <SetAllForPriorityCode
            currentChannel={currentChannel}
            setShowSetAllPopUp={setShowSetAllPopUp}
            handleSave={handleSave}
            inventorysmartScreenConfig={props.inventorysmartScreenConfig}
          />
        )}
       {reMount && (<AgGridComponent
          selectAllHeaderComponent={
            !props.selectedStores ||
              props?.inventorysmartScreenConfig?.finalize
                ?.hideSelectAllForFinalized
              ? shouldDisplaySelectComponent(
                props.finalized,
                props.planStatus,
                props.planType,
                flowType
              )
                ? false
                : true
              : true
          }
          columns={productDetailsTableColumns}
          getRowStyle={(params) => {
            if (+params?.data?.min_net_available < 0) {
              return {
                background: "rgb(255,255,0.5)",
              };
            }
          }}
          // enabling infinite scroll for RL based on key available in response from smart screen config api
          pagination={!props.inventorysmartScreenConfigForInfiniteScrolling?.includes(
            "CNARMaterialViewMaterialDetails"
          ) || !props.inventorysmartScreenConfigForInfiniteScrolling?.includes(
            "CNARStoreViewMaterialDetails"
          )}
          hideSelectCurrentPageRecords={props.inventorysmartScreenConfigForInfiniteScrolling?.includes(
            "CNARMaterialViewMaterialDetails"
          ) || props.inventorysmartScreenConfigForInfiniteScrolling?.includes(
            "CNARStoreViewMaterialDetails"
          )}
          rowdata={productDetailsTableData}
          uniqueRowId={"article"}
          downloadAsExcel
          suppressFieldDotNotation
          onCellValueChanged={onCellValueChanged}
          toPrependContent={props.excelDownloadMetaData}
          prependedContentDetails={prependData()}
          onSelectionChanged={onSelectionChanged}
          loadTableInstance={loadTableInstance} // to make use of available grid api's
          rowSelection="multiple"
        />)}
      </Loader>
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    inventorysmartScreenConfigForInfiniteScrolling:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfigForInfiniteScrolling,
    productViewLoader:
      store.inventorysmartReducer.inventorySmartFinalizeProductViewService
        .productViewLoader,
    allocationCode:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .allocationCode,
    planStatus:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .planStatus,
    planType:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .planType,
    originalAllocationCode:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .originalAllocationCode,
    isV3:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.isV3,
    articles:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .articles,
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "viewPastAllocationFilterConfiguration"
      ]?.appliedFilterData,
    excelDownloadMetaData:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig?.excelDownloadMetaData,
    finalized:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .finalized,
    selectedArticles:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .selectedArticles,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    currentSelectedArticles:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .currentSelectedArticles,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setProductViewLoader: (payload) => dispatch(setProductViewLoader(payload)),
  getProductView: (payload, isV3) => dispatch(getProductView(payload, isV3)),
  getStoreView: (payload) => dispatch(getStoreView(payload)),
  setStoreDetailsTableData: (payload) =>
    dispatch(setStoreDetailsTableData(payload)),
  addSnack: (snack) => dispatch(addSnack(snack)),
  setSelectedArtilces: (payload) => dispatch(setSelectedArtilces(payload)),
  bulkUpdateMaterialLevel: (payload, isV3) => dispatch(bulkUpdateMaterialLevel(payload, isV3)),
  setOriginalAllocationCode: (payload) =>
    dispatch(setOriginalAllocationCode(payload)),
  setAllocationCode: (payload) => dispatch(setAllocationCode(payload)),
  setCurrentSelectedArticles: (payload) => dispatch(setCurrentSelectedArticles(payload)),
  
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ProductDetailsTable);
