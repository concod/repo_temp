import React, { useState, useEffect } from "react";
import { connect } from "react-redux";

import AgGridComponent from "core/Utils/agGrid";
import { getColumnsAg } from "core/actions/tableColumnActions";

import {
  getDailyAllocationStoreTableData,
  getDailyAllocationTableData,
  setDailyAllocationTableData,
  setDailyAllocationScreenLoader,
  getDailyAllocationSummaryStoreView,
  getDailyAllocationSummaryProductView,
} from "../../../services-inventorysmart/Allocation-Reports/daily-allocation-service";
import {
  ERROR_MESSAGE,
  tableConfigurationMetaData,
} from "../../../constants-inventorysmart/stringConstants";
import { cloneDeep, isEmpty } from "lodash";
import ReportingViewChips from "../ReportingViewChips";
import { downloadDASProduct, downloadDASStore } from "modules/inventorysmart/services-inventorysmart/Allocation-Reports/allocation-reports-common-service";
import { getCustomDateFilterObject, getCustomFilterObject } from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";
import { addSnack } from "core/actions/snackbarActions";
import { DAILY_ALLOCATION_SUMMARY_DEFAULT_BUTTON_GROUP_OPTIONS, DAILY_ALLOCATION_SUMMARY_DC_OPTIONS } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { downloadDASArticle } from "modules/inventorysmart/services-inventorysmart/Allocation-Reports/allocation-reports-common-service";
import { downloadDASDC } from "modules/inventorysmart/services-inventorysmart/Allocation-Reports/allocation-reports-common-service";
import { DAS_REPORTS_MODULE } from "../CustomHooks/moduleConstants";
import { getNearestDay } from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";

const DailyAllocationTableView = (props) => {
  const [
    dailyAllocationProductViewColumns,
    setDailyAllocationProductViewColumns,
  ] = useState([]);
  const [
    dailyAllocationStoreViewColumns,
    setDailyAllocationStoreViewColumns,
  ] = useState([]);

  const [
    dailyAllocationProductViewData,
    setDailyAllocationProductViewData,
  ] = useState([]);
  const [
    dailyAllocationStoreViewData,
    setDailyAllocationStoreViewData,
  ] = useState([]);
  const [productStore, setProductStore] = useState("product" );
  const [buttonGroupOptions , setButtonGroupOptions] = useState([]);

  const show_product_store_radios = props.moduleConfig?.[DAS_REPORTS_MODULE]?.show_product_store_split;

  const pageSize = props.pageSize;
  const enableDownload =
          props.moduleConfig?.[DAS_REPORTS_MODULE]?.enableDownload ?? false;
  

  const fetchProductViewData = async () => {
    try {
      props.setDailyAllocationScreenLoader(true);
      let col = [];
      col = await getColumnsAg(
        "table_name=inventory_daily_allocation_article_list",
      )();
      setDailyAllocationProductViewColumns(col);
      let reqBody = {
        date: props.selectedDate.datePicker,
        meta: tableConfigurationMetaData.meta,
        filters: [...props.dailyAllocationSelectedFilters, getCustomFilterObject("date","date",[props.selectedDate.datePicker])],
      };
      let response = await (show_product_store_radios
        ? props.getDailyAllocationSummaryProduct(reqBody)
        : props.getDailyAllocationTableData(reqBody));
      const productViewData = response.data?.data || null;
      const productViewDataClone = cloneDeep(response.data?.data || null);
      props.setDailyAllocationTableData(productViewData);
      setDailyAllocationProductViewData(productViewDataClone?.table_data || []);
      const show_message = response.data?.show_message;
      show_message && displaySnackMessages(response.data?.message, "success");
      props.setDailyAllocationScreenLoader(false);
    } catch (e) {
      props.setDailyAllocationScreenLoader(false);
      handleErrorMessage(e);
      props.setDailyAllocationTableData(null);
      setDailyAllocationProductViewData([]);
    }
  }
   
  const fetchStoreViewData = async () => {
    try {
      props.setDailyAllocationScreenLoader(true);
      let col = [];
      col = await getColumnsAg(
        "table_name=inventory_daily_allocation_store_list"
      )();
      setDailyAllocationStoreViewColumns(col);
      let reqBody = {
        date: props.selectedDate.datePicker,
        filters: [...props.dailyAllocationSelectedFilters, getCustomFilterObject("date","date",[getNearestDay(props.selectedDate.datePicker)])],
        meta: tableConfigurationMetaData.meta,
      };
      let response = await (show_product_store_radios
        ? props.getDailyAllocationSummaryStore(reqBody)
        : props.getDailyAllocationStoreTableData(reqBody));
      setDailyAllocationStoreViewData(response.data?.data?.table_data || []);
      props.setDailyAllocationScreenLoader(false);
      const show_message = response.data?.show_message;
      show_message && displaySnackMessages(response.data?.message, "success");
    } catch (e) {
      props.setDailyAllocationScreenLoader(false);
      handleErrorMessage(e);
      setDailyAllocationStoreViewData([])
    }
  }
  
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
  
  const getDownloadResponse = async (reqBody) => {
    if (show_product_store_radios) {
      if (productStore === "product") {
        return await props.downloadDASProduct(reqBody);
      } else {
        return await props.downloadDASStore(reqBody);
      }
    } else {
      if (productStore === "product") {
        return await props.downloadDASArticle(reqBody);
      } else {
        return await props.downloadDASDC(reqBody);
      }
    }
  };

  const handleDownload = async () => {
    
    try {
      let reqBody = {
        date: props.selectedDate.datePicker,
        filters: [...props.dailyAllocationSelectedFilters, getCustomDateFilterObject("date","date",[props.selectedDate.datePicker])],
        meta: tableConfigurationMetaData.meta,
      };
      let response = await getDownloadResponse(reqBody);
      displaySnackMessages(response?.data?.data?.message, "success");
    } catch (err) {
      handleErrorMessage(err);
    }
  };
  
  

  useEffect(() => {
    //reset to product tab on filter change
    setProductStore( "product" )
  },[props.dailyAllocationSelectedFilters])

  useEffect(() => {
    if (!isEmpty(props.dynamicLabels)) {
      let clonedButtonGroupOptions = cloneDeep(
        show_product_store_radios
        ?  DAILY_ALLOCATION_SUMMARY_DC_OPTIONS
        :  DAILY_ALLOCATION_SUMMARY_DEFAULT_BUTTON_GROUP_OPTIONS
          
      );
      setButtonGroupOptions(clonedButtonGroupOptions);
    }
  }, [show_product_store_radios]);

  useEffect(() => {
    
    if (!isEmpty(props.dailyAllocationSelectedFilters)) {
      if (productStore === "product") {
        setDailyAllocationStoreViewData([]);
        fetchProductViewData()
      } else {
        setDailyAllocationProductViewData([]);
        fetchStoreViewData()
      }
    }
  }, [productStore, props.dailyAllocationSelectedFilters, props.dynamicLabels]);

  const getTopLeftOptions = () => {
    return [
      <ReportingViewChips
        key="daily-allocation-view-toggle"
        options={buttonGroupOptions}
        selectedOption={productStore}
        onChange={setProductStore}
      />,
    ];
  };

  return (
    <>
      {productStore === "product" && (
        <AgGridComponent
          disableExcelDownload={
            dailyAllocationProductViewData?.length ? false : true
          }
          rowdata={dailyAllocationProductViewData}
          columns={dailyAllocationProductViewColumns}
          uniqueRowId={"key"}
          toPrependContent={props.excelDownloadMetaData}
          skipAutoSizeColumn={true}
          paginationPageSize={pageSize || 10}
          topLeftOptions={getTopLeftOptions()}
          showDownloadButton = {enableDownload}
          onDownloadButtonClick = {() => handleDownload()}
        />
      )}
      {productStore === "store" && (
        <AgGridComponent
          disableExcelDownload={
            dailyAllocationStoreViewData?.length ? false : true
          }
          rowdata={dailyAllocationStoreViewData}
          columns={dailyAllocationStoreViewColumns}
          topLeftOptions={getTopLeftOptions()}
          uniqueRowId={"key"}
          sizeColumnsToFitFlag
          pagination={true}
          toPrependContent={props.excelDownloadMetaData}
          skipAutoSizeColumn={true}
          paginationPageSize={pageSize || 10}
          wrapCellText
          autoCellHeight
          autoHeaderHeight
          wrapHeaderText
          showDownloadButton = {enableDownload}
          onDownloadButtonClick = {() => handleDownload()}
        />
      )}
    </>
  );
};

const mapStateToProps = (store) => {
  return {    
    moduleConfig: store.inventorysmartReducer?.allocationReportsCommonService?.moduleConfig,
    dynamicLabels:
      store.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.dynamicLabels,
    storeIDConfig:
      store.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig,
    allocationReportsConfiguration: store.inventorysmartReducer?.allocationReportsCommonService?.allocationReportsConfiguration,
    pageSize:
      store.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.inventorysmart_page_count,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (payload) => dispatch(addSnack(payload)),
    getDailyAllocationStoreTableData: (body) =>
      dispatch(getDailyAllocationStoreTableData(body)),
    getDailyAllocationTableData: (body) =>
      dispatch(getDailyAllocationTableData(body)),
    getDailyAllocationSummaryStore: (body) =>
      dispatch(getDailyAllocationSummaryStoreView(body)),
    getDailyAllocationSummaryProduct: (body) =>
      dispatch(getDailyAllocationSummaryProductView(body)),
    setDailyAllocationTableData: (body) =>
      dispatch(setDailyAllocationTableData(body)),
    setDailyAllocationScreenLoader: (body) =>
      dispatch(setDailyAllocationScreenLoader(body)),
    downloadDASProduct : (postBody) => dispatch(downloadDASProduct(postBody)),
    downloadDASStore : (postBody) => dispatch(downloadDASStore(postBody)),
    downloadDASArticle : (postBody) => dispatch(downloadDASArticle(postBody)),
    downloadDASDC : (postBody) => dispatch(downloadDASDC(postBody)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(DailyAllocationTableView);
