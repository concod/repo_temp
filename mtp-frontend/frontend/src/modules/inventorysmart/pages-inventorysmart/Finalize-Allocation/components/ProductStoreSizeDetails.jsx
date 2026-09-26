import React, { useEffect, useRef, useState } from "react";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import { connect } from "react-redux";
import {
  getProductStoreSizeView,
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
import { isEmpty, cloneDeep } from "lodash";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";

const ProductStoreSizeDetailsTable = (props) => {
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
  const[reMount,setReMount]=useState(true)
  const productStoreSizeDetailsTableInstance = useRef(null);

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
    props.allocationCode &&
      props.selectedArticle &&
      props.selectedStoreCode &&
      (async () => {
        let columns = [];
        try {
          props.setProductStoreSizeViewLoader(true);
          let l_response = await props.getProductStoreSizeView(
            {
              allocation_code: props.allocationCode,
              ignore_allocation_code: getIgnoreAllocationCode(
                props.originalAllocationCode,
                props.allocationCode
              ),
              article: props.selectedArticle,
              plan_status: props.planStatus,
              plan_type: props.planType ? props?.planType : "",
              store_code: props.selectedStoreCode,
            },
            true
          );
          if (l_response.data.status) {
            let l_responseData = l_response.data.data;
            let formattedColumns = agGridColumnFormatter(
              l_responseData.table_config,
              null,
              columns
            );
            setProductStoreSizeDetailsTableColumns(formattedColumns);
            setProductStoreSizeDetailsTableData(l_responseData.table_data);
            setReMount(false)
          }
        } catch {
          displaySnackMessages(ERROR_MESSAGE, "error");
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
      let l_downloadFormatChipsDependency = cloneDeep(downloadFormatChipsDependency);
      l_downloadFormatChipsDependency.product.value = downloadFormatChipsDependency.product.value.map((str)=> replaceSpecialCharacter(str ));
      let prependContentReq = prependExtraData(l_downloadFormatChipsDependency);
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
      <Loader loader={props.productStoreSizeTableLoader}>
        {reMount &&(<AgGridComponent
          columns={productStoreSizeDetailsTableColumns}
          rowdata={productStoreSizeDetailsTableData}
          loadTableInstance={loadTableInstance} // to make use of available grid api's
          uniqueRowId={"size"}
          downloadAsExcel={
            productStoreSizeDetailsTableData?.length ? true : false
          }
          suppressFieldDotNotation
          pagination={false}
          toPrependContent={props.excelDownloadMetaData}
          prependedContentDetails={prependData()}
        />)}
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
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ProductStoreSizeDetailsTable);
