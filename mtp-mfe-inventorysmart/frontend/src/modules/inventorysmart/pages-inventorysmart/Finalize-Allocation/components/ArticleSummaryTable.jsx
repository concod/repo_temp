import React, { useEffect, useState } from "react";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import { connect } from "react-redux";
import {
  getProductViewSummary,
  setProductStoreViewSummaryLoader,
} from "modules/inventorysmart/services-inventorysmart/Finalize/product-view-services";
import { getStoreViewSummary } from "modules/inventorysmart/services-inventorysmart/Finalize/store-view-services";
import { getIgnoreAllocationCode } from "../../Create-Allocation/helperFunctions";
import {
  appendExcelDownloadData,
  fetchFilterChipsToDownload,
  prependExtraData,
} from "core/Utils/agGrid/table-functions";
import { isEmpty } from "lodash";
import { addSnack } from "core/actions/snackbarActions";
import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { NO_TABLE_DATA_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { setFetchArticleSummary } from "modules/inventorysmart/services-inventorysmart/Finalize/store-view-services";
import { setFetchProductDetails } from "modules/inventorysmart/services-inventorysmart/Finalize/store-view-services";
import { setFetchProductStoreDetails } from "modules/inventorysmart/services-inventorysmart/Finalize/store-view-services";
import { setFetchStoreDetails } from "modules/inventorysmart/services-inventorysmart/Finalize/store-view-services";
import { RecommendationKPICard } from "./KPI-Card/RecommendationKPICard";

const ArticleSummaryTable = (props) => {
  const [articleSummaryTableColumns, setArticleSummaryTableColumns] = useState(
    []
  );
  const [articleSummaryTableData, setArticleSummaryTableData] = useState([]);
  const [
    downloadFormatChipsDependency,
    setDownloadFormatChipsDependency,
  ] = useState({});

  const getSummary = (p_tab) => {
    let l_api =
      p_tab === "product"
        ? props.getProductViewSummary
        : props.getStoreViewSummary;
    let isV3 =
      p_tab === "product"
        ? props.isV3?.includes("productDetailsSummary")
        : props.isV3?.includes("storeDetailsSummary");
    return l_api(
      {
        allocation_code: props.allocationCode,
        article: props.articles || [],
        ignore_allocation_code: getIgnoreAllocationCode(
          props.originalAllocationCode,
          props.allocationCode
        ),
        plan_status: props.planStatus,
        plan_type: props.planType,
      },
      isV3
    );
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  
  const getSummaryWithRetry = async (tab, maxRetries = 3) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timed out after 30 seconds')), 30000);
        });
        
        // Race between the actual API call and the timeout
        const response = await Promise.race([
          getSummary(tab),
          timeoutPromise
        ]);
        
        return response;
        
      } catch (error) {        
        if (attempt === maxRetries) {
          throw new Error(`getSummary failed after ${maxRetries} attempts: ${error.message}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  };

  const getSummaryData = async () => {
    let columns = [],
    data = [];
  setArticleSummaryTableData([]);
  try {
    props.setProductStoreViewSummaryLoader(true);
    let l_response = await getSummary(props.tab);
    if (l_response.data.status) {
      let l_responseData = l_response.data.data;
      columns = l_responseData.table_config;
      data = l_responseData.table_data;
    }
  } catch (e) {
    const errObj = e?.response?.data;
    if (errObj?.show_message)
      displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(ERROR_MESSAGE, "error");
  } finally {
    props.setProductStoreViewSummaryLoader(false);
    let formattedColumns = agGridColumnFormatter(columns);
    setArticleSummaryTableColumns(formattedColumns);
    setArticleSummaryTableData([data]);
  }
  }

  useEffect(() => {
    
   if( props.allocationCode &&
      props.planType && props.fetchArticleSummary === null){
        getSummaryData();
      }

  }, [props.tab, props.planType, props.fetchArticleSummary]);

  useEffect(() => {
    if(props.fetchArticleSummary){
      getSummaryData().then(() => {
        if(props.tab === "product"){
        props.setFetchArticleSummary(false);
        props.setFetchProductDetails(true);
        }
        else{
          props.setFetchArticleSummary(false);
          props.setFetchStoreDetails(true)
        }
      }).catch((error) => {
        if(props.tab === "product"){
          props.setFetchArticleSummary(false);
          props.setFetchProductDetails(true);
        }
          else{
            props.setFetchArticleSummary(false);
            props.setFetchStoreDetails(true)
          }
      });
    }
  },[props.fetchArticleSummary])

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
      <Loader loader={props.productStoreViewSummaryLoader} minHeight={160}>
        {
          <RecommendationKPICard
            tableConfig={
              articleSummaryTableColumns.length
                ? articleSummaryTableColumns
                : []
            }
            tableData={
              articleSummaryTableData.length ? articleSummaryTableData[0] : {}
            }
            showScrollIcon={props.finalizeAllocationConfig.showSizeDetails}
          />
        }
      </Loader>
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    productStoreViewSummaryLoader:
      store.inventorysmartReducer.inventorySmartFinalizeProductViewService
        .productStoreViewSummaryLoader,
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
    fetchArticleSummary:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .fetchArticleSummary,
    fetchProductDetails:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .fetchProductDetails,
    finalizeAllocationConfig:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartFinalizeAllocationConfig,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getProductViewSummary: (payload, isV3) =>
    dispatch(getProductViewSummary(payload, isV3)),
  getStoreViewSummary: (payload, isV3) =>
    dispatch(getStoreViewSummary(payload, isV3)),
  setProductStoreViewSummaryLoader: (payload) =>
    dispatch(setProductStoreViewSummaryLoader(payload)),
  addSnack: (snack) => dispatch(addSnack(snack)),
  setFetchArticleSummary: (payload) =>
    dispatch(setFetchArticleSummary(payload)),
  setFetchProductDetails: (payload) =>
    dispatch(setFetchProductDetails(payload)),
  setFetchProductStoreDetails: (payload) =>
    dispatch(setFetchProductStoreDetails(payload)),
  setFetchStoreDetails: (payload) =>
    dispatch(setFetchStoreDetails(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ArticleSummaryTable);
