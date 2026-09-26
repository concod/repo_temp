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
  getProductSizeStoreView,
  setProductSizeStoreViewLoader,
} from "modules/inventorysmart/services-inventorysmart/Finalize/store-view-services";
import {
  ERROR_MESSAGE,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  getIgnoreAllocationCode,
  shouldDisplaySelectComponent,
} from "../../../Create-Allocation/helperFunctions";
import {
  setFetchProductStoreDetails,
} from "modules/inventorysmart/services-inventorysmart/Finalize/store-view-services";
import { useStyles as titleStyles } from "../KPI-Card/ExpandableDetails";

const ProductSizeStoreTable = (props) => {
  const flowType = new URLSearchParams(window.location.search).get("flow");

  const globalClasses = globalStyles();
  const titleClasses = titleStyles();

  const articleKey = dynamicLabelsBasedOnTenant("article_unique_id");

  const [reMount, setReMount] = useState(true);
  const [
    productSizeStoreDetailsTableColumns,
    setProductSizeStoreDetailsTableColumns,
  ] = useState([]);
  const [
    productSizeStoreDetailsTableData,
    setProductSizeStoreDetailsTableData,
  ] = useState([]);

  const latestRequestedArticleRef = useRef(null); // Track the latest requested article to prevent race conditions
  const productSizeStoreDetailsTableInstance = useRef(null);

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
    props.setProductSizeStoreViewLoader(false);
  };

  const getProductSizeStoreDetailsData = async () => {
    // Capture the article being requested to prevent race conditions
    const requestedArticle = props.selectedArticle;
    latestRequestedArticleRef.current = requestedArticle;

    setReMount(false);
    let columns = [],
      data = [];
    try {
      props.setProductSizeStoreViewLoader(true);
      let l_response = await props.getProductSizeStoreView(
        {
          allocation_code: props.allocationCode,
          article: props.selectedArticle || props.displayArticle,
          size: props.data.size || "",
          ignore_allocation_code: getIgnoreAllocationCode(props.originalAllocationCode),
          plan_status: props.planStatus,
          plan_type: props.planType ? props?.planType : "",
        },
        props.isV3?.includes("productStoreDetails")
      );


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
        props.setProductSizeStoreViewLoader(false);
        setReMount(true);
        let formattedColumns = agGridColumnFormatter(columns);
        
        setProductSizeStoreDetailsTableColumns(formattedColumns);
        setProductSizeStoreDetailsTableData(data);

      }
    }
  };

  useEffect(() => {
    if (
      props.allocationCode &&
      props.selectedArticle &&
      props.fetchProductStoreDetails === null
    ) {
      getProductSizeStoreDetailsData();
    }
  }, [
    props.selectedArticle,
    props.selectedStores,
    props.fetchProductStoreDetails,
  ]);

  useEffect(() => {
    if (props.fetchProductStoreDetails) {
      getProductSizeStoreDetailsData()
        .then(() => {
          props.setFetchProductStoreDetails(false);
        })
        .catch((error) => {
          props.setFetchProductStoreDetails(false);
        });
    }
  }, [props.fetchProductStoreDetails]);

  const loadTableInstance = (params) => {
    productSizeStoreDetailsTableInstance.current = params;
  };
 
  const productSizeStoreTableHeader = useMemo(() => {
    const title = `Product - Store details`;
    const articleLabel = "Style Color ID: ";

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
    props.ProductStoreDetailsTableHeader,
    props.displayArticle,
    props.productDetailsTableColumns,
    props.selectedArticle,
  ]);

  return (
    <div className={globalClasses.contentBody}>
      <Loader loader={props.productSizeStoreTableLoader}>
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
                tableHeader={productSizeStoreTableHeader}
                columns={productSizeStoreDetailsTableColumns}
                rowdata={productSizeStoreDetailsTableData}
                rowSelection={"multiple"}
                loadTableInstance={loadTableInstance} // to make use of available grid api's
                uniqueRowId={"store_code"}
                downloadAsExcel={
                  productSizeStoreDetailsTableData?.length ? true : false
                }
                showDownloadTooltip={true}
                suppressFieldDotNotation
                pagination={false}
                hideSelectCurrentPageRecords
                toPrependContent={props.excelDownloadMetaData}
                cardContainer={!props.isMasterDetails}
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
    productSizeStoreTableLoader:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .productSizeStoreTableLoader,
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
    articles:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .articles,
    excelDownloadMetaData:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig?.excelDownloadMetaData,
    finalizeAllocationConfig:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartFinalizeAllocationConfig,
    fetchProductStoreDetails:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .fetchProductStoreDetails,
    ProductStoreDetailsTableHeader:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartCreateAllocationConfig?.ProductStoreDetailsTableHeader,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setProductSizeStoreViewLoader: (payload) =>
    dispatch(setProductSizeStoreViewLoader(payload)),
  getProductSizeStoreView: (payload, isV3) =>
    dispatch(getProductSizeStoreView(payload, isV3)),
  addSnack: (snack) => dispatch(addSnack(snack)),
  setFetchProductStoreDetails: (payload) =>
    dispatch(setFetchProductStoreDetails(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ProductSizeStoreTable);
