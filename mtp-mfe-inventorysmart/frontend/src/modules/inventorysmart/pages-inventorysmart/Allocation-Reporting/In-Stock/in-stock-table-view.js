import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import { ButtonGroup, useTranslation } from "impact-ui-v3";
import AgGridComponent from "core/Utils/agGrid";
import globalStyles from "core/Styles/globalStyles";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { addSnack } from "core/actions/snackbarActions";
import {
  setInStockTableLoader,
  getInStockSKUTableData,
  getInStockStoreTableData,
  setInStockScreenLoader,
  setSelectedInStockViewType
} from "../../../services-inventorysmart/Allocation-Reports/in-stock-report-services";
import { 
  ERROR_MESSAGE,
  IN_STOCK_BUTTON_GROUP_OPTIONS,
  tableConfigurationMetaData,
} from "../../../constants-inventorysmart/stringConstants";
import {  
  downloadInStockArticle, 
  downloadInStockStore 
} from "../../../services-inventorysmart/Allocation-Reports/allocation-reports-common-service";
import { IN_STOCK_MODULE } from "../CustomHooks/moduleConstants";
import { getInStockKpiData, setInStockKpiData } from "modules/inventorysmart/services-inventorysmart/Allocation-Reports/in-stock-report-services";
import { getCustomFilterObject } from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";



const InStockTableComponent = (props) => {
  const { t } = useTranslation();
  const [colDefs, setColDefs] = useState([]);
  const [requestBody, setRequestBody] = useState(null);
  const [buttonGroupOptions, setButtonGroupOptions] = useState([]);
  const tableInstanceSKU = useRef(null);
  const tableInstanceStore = useRef(null);
  const globalClasses = globalStyles();
  const pageSize = props.pageSize || 10;
  const apiCallInProgressRef = useRef(false);
  const enableDownload =
    props.moduleConfig?.[IN_STOCK_MODULE]?.enableDownload ?? false;
  const tabs = props.moduleConfig?.[IN_STOCK_MODULE]?.InStockReportTab
  
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
    if (errObj?.show_message) {
      displaySnackMessages(errObj?.message, "error");
    } else {
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  
  useEffect(() => {
    if (tabs) {
      const filteredOptions = IN_STOCK_BUTTON_GROUP_OPTIONS.filter(option => 
        tabs.some(tab => tab.key === option.value)
      );
      setButtonGroupOptions(filteredOptions.length > 0 ? filteredOptions : IN_STOCK_BUTTON_GROUP_OPTIONS);
    } else {
      // If no tabs specified, show all options
      setButtonGroupOptions(IN_STOCK_BUTTON_GROUP_OPTIONS);
    }
  }, [tabs]);
    
  useEffect(() => {
    fetchColumnDefinitions(props.viewType === "store");
  }, [props.viewType]);
  
  const handleChangeViewType = async (_event, newViewType) => {
    if (props.viewType !== newViewType) {
      props.setSelectedInStockViewType(newViewType);
      
      if (props.inStockFiltersState) {
        props.setInStockScreenLoader(true);
        props.setInStockTableLoader(true);
        props.setInStockKpiData([]);

        try {      
          const selectedFilters = {
            filters: props.inStockFiltersState?.filters || [],
            fiscal_year_week: props.inStockFiltersState?.fiscal_year_week,
            application_code: 1,
          };
          
          const kpiRequestBody = {
            meta: {
              ...tableConfigurationMetaData.meta,
              limit: { limit: 10, page: 1 },
            },
            filters: selectedFilters.filters,
            date_range: props.inStockFiltersState?.date_range,
            application_code: 1,
          };
          const kpiResponse = await props.getInStockKpiData(kpiRequestBody);
          props.setInStockKpiData(kpiResponse?.data?.data?.kpi_data?.data?.[0] || []);
        } catch (e) {
          props.setInStockTableLoader(false);
          props.setInStockScreenLoader(false);
          handleErrorMessage(e);
        }
      }
    }
  };

  const fetchColumnDefinitions = async (forStoreView) => {
    try {
      props.setInStockTableLoader(true);
      let col = [];
      const tableConfigName = forStoreView 
        ? "in_stock_store_report"
        : "in_stock_sku_report"; 
      
      col = await getColumnsAg(
        `table_name=${tableConfigName}`
      )();
      setColDefs(col);
      props.setInStockTableLoader(false);
    } catch (e) {
      props.setInStockTableLoader(false);
      handleErrorMessage(e);
    }
  };

  const handleDownload = async () => {
    try {
      let downloadResponse;
      if (requestBody) {
        if (props.viewType === "store") {
          downloadResponse = await props.downloadInStockStore(requestBody);
        } else {
          downloadResponse = await props.downloadInStockArticle(requestBody);
        }
      } else {
        // If no request body is stored, use the current filter state
        const dateRange = props.inStockFiltersState?.date_range || {};
        const startDate = dateRange.start_date;
        const endDate = dateRange.end_date;
        const filters = [
          ...(props.inStockFiltersState?.filters || []),
          getCustomFilterObject("start_date", "start_date", [startDate]),
          getCustomFilterObject("end_date", "end_date", [endDate])
        ];
        const fiscal_year_week = props.inStockFiltersState?.fiscal_year_week;
        const downloadBody = { 
          filters, 
          fiscal_year_week,
        };
        setRequestBody(downloadBody);
        
        if (props.viewType === "store") {
          downloadResponse = await props.downloadInStockStore(downloadBody);
        } else {
          downloadResponse = await props.downloadInStockArticle(downloadBody);
        }
      }
      displaySnackMessages(downloadResponse?.data?.data?.message, "success");
    } catch (err) {
      handleErrorMessage(err);
    }
  };

  const loadTableInstanceSKU = (params) => {
    tableInstanceSKU.current = params;
  };

  const loadTableInstanceStore = (params) => {
    tableInstanceStore.current = params;
  };

  // Server-side data fetching for STORE view
  const fetchStoreViewData = async (manualbody, pageIndex) => {
    // Prevent duplicate API calls for initial data load
    if (pageIndex === 0 && apiCallInProgressRef.current) {
      return { data: [], totalCount: 0 };
    }
    
    try {
      apiCallInProgressRef.current = true;
      props.setInStockTableLoader(true);
      props.setInStockScreenLoader(true);
      
      let body = {
        meta: {
          ...manualbody,
          limit: { limit: pageSize || 10, page: pageIndex + 1 },
        },
        filters: props.inStockFiltersState?.filters,
        date_range: props.inStockFiltersState?.date_range,
        application_code: 1,
      };
      
      setRequestBody(body);
      
      const response = await props.getInStockStoreTableData(body);
      
      const storeData = response?.data?.data?.store_data?.data || [];
      const totalCount = response?.data?.data?.store_data?.total;
            
      props.setInStockTableLoader(false);
      props.setInStockScreenLoader(false);
      apiCallInProgressRef.current = false;
      
      return {
        data: storeData,
        totalCount: totalCount
      };
    } catch (error) {
      props.setInStockTableLoader(false);
      props.setInStockScreenLoader(false);
      apiCallInProgressRef.current = false;
      handleErrorMessage(error);
      return {
        data: [],
        totalCount: 0
      };
    }
  };

  const fetchSKUViewData = async (manualbody, pageIndex) => {
    if (pageIndex === 0 && apiCallInProgressRef.current) {
      return { data: [], totalCount: 0 };
    }
    
    try {
      apiCallInProgressRef.current = true;
      props.setInStockTableLoader(true);
      props.setInStockScreenLoader(true);
      
      let body = {
        meta: {
          ...manualbody,
          limit: { limit: pageSize || 10, page: pageIndex + 1 },
        },
        filters: props.inStockFiltersState?.filters,
        date_range: props.inStockFiltersState?.date_range,
        application_code: 1,
      };
      
      setRequestBody(body);
      
      const response = await props.getInStockSKUTableData(body);
      
      const skuData = response?.data?.data?.article_data?.data || [];
      const totalCount = response?.data?.data?.article_data?.total;
            
      props.setInStockTableLoader(false);
      props.setInStockScreenLoader(false);
      apiCallInProgressRef.current = false;
      
      return {
        data: skuData,
        totalCount: totalCount
      };
    } catch (error) {
      props.setInStockTableLoader(false);
      props.setInStockScreenLoader(false);
      apiCallInProgressRef.current = false;
      handleErrorMessage(error);
      return {
        data: [],
        totalCount: 0
      };
    }
  };


  const getTopCenterOptions = () => {
    return (
      <ButtonGroup
        options={buttonGroupOptions}
        selectedOption={props.viewType}
        onChange={handleChangeViewType}
      />
    );
  };

  const getTableHeaderText = (viewType) => {
    return viewType === "store"
      ? t("inventorysmart.skuStoreView")
      : t("inventorysmart.skuView");
  };

  return (
    <div className={globalClasses.marginVertical1rem}>
      {props.viewType === "store" ? (
        <AgGridComponent
          key="storeViewGrid" 
          tableHeader={getTableHeaderText("store")}
          topCenterOptions={getTopCenterOptions()}
          columns={colDefs}
          loadTableInstance={loadTableInstanceStore}
          manualCallBack={(params, pageIndex) => fetchStoreViewData(params, pageIndex)}
          rowModelType="serverSide"
          serverSideStoreType="partial"
          cacheBlockSize={pageSize}
          uniqueRowId={"key"}
          pagination={true}
          paginationPageSize={pageSize}
          onDownloadButtonClick = {() => handleDownload()}
          showDownloadButton={enableDownload}
        />
      ) : (
        <AgGridComponent
          key="skuViewGrid"
          tableHeader={getTableHeaderText("article")}
          topCenterOptions={getTopCenterOptions()}
          columns={colDefs}
          loadTableInstance={loadTableInstanceSKU}
          manualCallBack={(params, pageIndex) => fetchSKUViewData(params, pageIndex)}
          rowModelType="serverSide"
          serverSideStoreType="partial"
          cacheBlockSize={pageSize}
          uniqueRowId={"key"}
          pagination={true}
          paginationPageSize={pageSize}
          onDownloadButtonClick = {() => handleDownload()}
          showDownloadButton={enableDownload}
        />
      )}
    </div>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
  moduleConfig: inventorysmartReducer?.allocationReportsCommonService?.moduleConfig,
    inStockFiltersState:
      inventorysmartReducer.inventorySmartInStockService
        ?.inStockFiltersState,
    allocationReportsConfiguration: 
      inventorysmartReducer?.allocationReportsCommonService?.allocationReportsConfiguration,
    pageSize:
      inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.inventorysmart_page_count,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    setInStockTableLoader: (body) =>
      dispatch(setInStockTableLoader(body)),
    downloadInStockArticle: (body) => 
      dispatch(downloadInStockArticle(body)),
    downloadInStockStore: (body) => 
      dispatch(downloadInStockStore(body)),
    getInStockSKUTableData: (body) =>
      dispatch(getInStockSKUTableData(body)),
    getInStockStoreTableData: (body) =>
      dispatch(getInStockStoreTableData(body)),
    setInStockScreenLoader: (body) =>
      dispatch(setInStockScreenLoader(body)),
    setSelectedInStockViewType: (viewType) =>
      dispatch(setSelectedInStockViewType(viewType)),
    getInStockKpiData: (body) => 
      dispatch(getInStockKpiData(body)),
    setInStockKpiData: (body) => 
      dispatch(setInStockKpiData(body)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(InStockTableComponent);