import React, { useEffect, useState } from "react";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import { connect } from "react-redux";
import {
  getProductViewSummary,
  setArticleSummaryColumnData,
  setArticleSummaryData,
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
import { cloneDeep } from "lodash";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";

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
        article: props.articles,
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

  useEffect(() => {
    props.allocationCode &&
      props.planType &&
      (async () => {
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
        } catch {
        } finally {
          props.setProductStoreViewSummaryLoader(false);
          let formattedColumns = agGridColumnFormatter(columns);
          setArticleSummaryTableColumns(formattedColumns);
          props.setArticleSummaryData(data);
          props.setArticleSummaryColumnData(formattedColumns);
          setArticleSummaryTableData([data]);
        }
      })();
  }, [props.tab, props.allocationCode, props.planType]);

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
      <Loader loader={props.productStoreViewSummaryLoader}>
      {!isEmpty(articleSummaryTableData) && (
        <AgGridComponent
          columns={articleSummaryTableColumns}
          rowdata={articleSummaryTableData}
          onRowSelected
          uniqueRowId={"article"}
          downloadAsExcel
          suppressFieldDotNotation
          sizeColumnsToFitFlag
          toPrependContent={props.excelDownloadMetaData}
          prependedContentDetails={prependData()}
        />
      )}
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
  };
};

const mapDispatchToProps = (dispatch) => ({
  getProductViewSummary: (payload, isV3) =>
    dispatch(getProductViewSummary(payload, isV3)),
  getStoreViewSummary: (payload, isV3) =>
    dispatch(getStoreViewSummary(payload, isV3)),
  setProductStoreViewSummaryLoader: (payload) =>
    dispatch(setProductStoreViewSummaryLoader(payload)),
  setArticleSummaryData: (payload) => 
    dispatch(setArticleSummaryData(payload)),
  setArticleSummaryColumnData: (payload) => 
    dispatch(setArticleSummaryColumnData(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ArticleSummaryTable);
