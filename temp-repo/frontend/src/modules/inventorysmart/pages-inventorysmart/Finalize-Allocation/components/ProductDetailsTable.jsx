import { addSnack } from "core/actions/snackbarActions";
import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  getProductView,
  setProductViewLoader,
  setStoreDetailsTableData,
} from "modules/inventorysmart/services-inventorysmart/Finalize/product-view-services";
import {
  getStoreView,
  setSelectedArtilces,
} from "modules/inventorysmart/services-inventorysmart/Finalize/store-view-services";
import moment from "moment";
import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import { getIgnoreAllocationCode } from "../../Create-Allocation/helperFunctions";
import InvalidAllocation from "./InvalidAllocation";
import {
  appendExcelDownloadData,
  fetchFilterChipsToDownload,
  prependExtraData,
} from "core/Utils/agGrid/table-functions";
import { isEmpty } from "lodash";
import { useRef } from "react";

const ProductDetailsTable = (props) => {
  const [productDetailsTableColumns, setProductDetailsTableColumns] = useState(
    []
  );
  const [productDetailsTableData, setProductDetailsTableData] = useState([]);
  const [productViewResposne, setProductViewResposne] = useState({});
  const [editedRows, setEditedRows] = useState([]);
  const [
    downloadFormatChipsDependency,
    setDownloadFormatChipsDependency,
  ] = useState({});
  const productDetailsTableInstance = useRef(null);

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

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
          setProductDetailsTableData(data);
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
      let prependContentReq = prependExtraData(downloadFormatChipsDependency);
      return appendExcelDownloadData(prependContentReq);
    }
  };

  const onSelectionChanged = (event) => {
    // fetch all selected rows
    let selections = event.api.getSelectedRows();
    let articleIds = selections.map((item) => item.article);
    props.setSelectedArtilces(articleIds.length ? articleIds : null);
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

  return (
    <>
      {/* here */}
      <Loader loader={props.productViewLoader}>
        <InvalidAllocation resposne={productViewResposne} />
        <AgGridComponent
          selectAllHeaderComponent={!props.selectedStores}
          columns={productDetailsTableColumns}
          getRowStyle={(params) => {
            if (+params?.data?.min_net_available < 0) {
              return {
                background: "rgb(255,255,0.5)",
              };
            }
          }}
          rowdata={productDetailsTableData}
          uniqueRowId={"article"}
          downloadAsExcel={productDetailsTableData?.length ? true : false}
          suppressFieldDotNotation
          onCellValueChanged={onCellValueChanged}
          toPrependContent={props.excelDownloadMetaData}
          prependedContentDetails={prependData()}
          onSelectionChanged={onSelectionChanged}
          loadTableInstance={loadTableInstance} // to make use of available grid api's
          rowSelection="multiple"
        />
      </Loader>
    </>
  );
};

const mapStateToProps = (store) => {
  return {
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
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ProductDetailsTable);
