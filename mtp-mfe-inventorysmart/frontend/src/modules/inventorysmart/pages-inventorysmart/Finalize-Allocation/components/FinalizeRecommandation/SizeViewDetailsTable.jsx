import { connect } from "react-redux";
import { useEffect, useMemo, useRef, useState } from "react";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import { addSnack } from "core/actions/snackbarActions";
import globalStyles from "core/Styles/globalStyles";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import {
  getStoreSizeView,
  getProductSizeView,
} from "modules/inventorysmart/services-inventorysmart/Finalize/store-view-services";
import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  getIgnoreAllocationCode,
  shouldDisplaySelectComponent,
} from "../../../Create-Allocation/helperFunctions";
import { useStyles as titleStyles } from "../KPI-Card/ExpandableDetails";
import ProductSizeStoreView from "./ProductSizeStoreView";

const StoreSizeDetailsTable = (props) => {
  const flowType = new URLSearchParams(window.location.search).get("flow");

  const globalClasses = globalStyles();
  const titleClasses = titleStyles();

  const articleKey = dynamicLabelsBasedOnTenant("article_unique_id");

  const [reMount, setReMount] = useState(true);
  const [isLoading, setLoading] = useState(false);
  const [
    productStoreDetailsTableColumns,
    setProductStoreDetailsTableColumns,
  ] = useState([]);
  const [
    productStoreDetailsTableData,
    setProductStoreDetailsTableData,
  ] = useState([]);

  const latestRequestedArticleRef = useRef(null); // Track the latest requested article to prevent race conditions
  const productStoreDetailsTableInstance = useRef(null);

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
        disableOnClose: true,
      },
    });
  };

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(ERROR_MESSAGE, "error");
    setLoading(false);
  };

  const getProductStoreDetailsData = async () => {
    // Capture the article being requested to prevent race conditions
    const requestedArticle = props.selectedArticle;
    latestRequestedArticleRef.current = requestedArticle;

    setReMount(false);
    let columns = [],
      data = [];
    try {
      setLoading(true);
      const payload = {
        allocation_code: props.allocationCode,
        article: props.selectedArticle || props.displayArticle,
        ignore_allocation_code: getIgnoreAllocationCode(
          props.originalAllocationCode
        ),
        plan_status: props.planStatus,
        plan_type: props.planType ? props?.planType : "",
        ...(props.data?.store_code
          ? { store_code: props.data?.store_code }
          : {}),
      };

      let l_response = {};

      if (props.singleSize) {
        l_response = await props.getStoreSizeView(
          payload,
          props.isV3?.includes("productStoreDetails")
        );
      } else {
        l_response = await props.getProductSizeView(
          payload,
          props.isV3?.includes("productStoreDetails")
        );
      }

      // Ignore this response if a newer request has been made
      if (latestRequestedArticleRef.current !== requestedArticle) {
        return;
      }

      if (l_response.data.status) {
        let l_responseData = l_response.data.data;
        data = l_responseData.table_data;
        columns = l_responseData.table_config;
      }
    } catch (e) {
      handleErrorMessage(e);
    } finally {
      // Only update UI if this is still the latest request
      if (latestRequestedArticleRef.current === requestedArticle) {
        setLoading(false);
        setReMount(true);
        let formattedColumns = agGridColumnFormatter(columns);
        if (!props.singleSize && !props.isStoreView) {
          formattedColumns = formattedColumns.map((column) => {
            if (column.column_name === "size") {
              return {
                ...column,
                cellRenderer: "agGroupCellRenderer",
              };
            }
            return column;
          });
        }

        setProductStoreDetailsTableColumns(formattedColumns);
        setProductStoreDetailsTableData(data);
      }
    }
  };

  useEffect(() => {
    if (props.allocationCode && props.selectedArticle) {
      getProductStoreDetailsData();
    }
  }, [props.selectedArticle, props.selectedStores]);

  const loadTableInstance = (params) => {
    productStoreDetailsTableInstance.current = params;
  };

  const productStoreTableHeader = useMemo(() => {
    const title = "Product - size details";

    const articleLabel =
      props.productDetailsTableColumns?.find(
        (column) => column.column_name === articleKey
      )?.label || "Style Color ID: ";

    return (
      <div className={titleClasses.titleContainer}>
        <span className={titleClasses.title}>{title}</span>
        <div className={titleClasses.dividerLine}></div>
        <span className={titleClasses.titleSubTitle}>{articleLabel}</span>
        <span className={titleClasses.titleSubTitleValue}>
          {replaceSpecialCharacter(
            props.displayArticle || props.selectedArticle
          ) || "N/A"}
        </span>
      </div>
    );
  }, [
    articleKey,
    props.displayArticle,
    props.productDetailsTableColumns,
    props.selectedArticle,
  ]);

  const ProductStoreDetailsTableWrapper = (innerProps) => {
    return (
      <div className={titleClasses.masterDetailPadding}>
        <ProductSizeStoreView
          {...innerProps}
          selectedArticle={props.selectedArticle}
          displayArticle={props.displayArticle}
          isMasterDetails={true}
        />
      </div>
    );
  };

  return (
    <div className={globalClasses.contentBody}>
      <Loader loader={isLoading}>
        <div className={globalClasses.contentBody}>
          {reMount && (
            <div className={globalClasses.marginVertical1rem}>
              <AgGridComponent
                selectAllHeaderComponent={
                  props?.finalizeAllocationConfig?.hideSelectAllForFinalized
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
                tableHeader={productStoreTableHeader}
                columns={productStoreDetailsTableColumns}
                rowdata={productStoreDetailsTableData}
                rowSelection={"multiple"}
                loadTableInstance={loadTableInstance} // to make use of available grid api's
                uniqueRowId={"size"}
                downloadAsExcel={
                  productStoreDetailsTableData?.length ? true : false
                }
                showDownloadTooltip={true}
                suppressFieldDotNotation
                pagination={false}
                hideSelectCurrentPageRecords
                toPrependContent={props.excelDownloadMetaData}
                masterDetail={true}
                {...(props.isStoreView
                  ? {}
                  : {
                      detailRowAutoHeight: true,
                      detailCellRenderer: ProductStoreDetailsTableWrapper,
                    })}
                cardContainer={!props.singleSize}
              />
            </div>
          )}
        </div>
      </Loader>
    </div>
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
    planStatus:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .planStatus,
    planType:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .planType,
    isV3:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.isV3,
    excelDownloadMetaData:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig?.excelDownloadMetaData,
    finalizeAllocationConfig:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartFinalizeAllocationConfig,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getStoreSizeView: (payload, isV3) =>
    dispatch(getStoreSizeView(payload, isV3)),
  getProductSizeView: (payload, isV3) =>
    dispatch(getProductSizeView(payload, isV3)),
  addSnack: (snack) => dispatch(addSnack(snack)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(StoreSizeDetailsTable);
