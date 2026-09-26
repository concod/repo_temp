import React, { useState, useEffect, useRef, useCallback } from "react";
import { connect } from "react-redux";
import AgGridComponent from "core/Utils/agGrid";
import globalStyles from "core/Styles/globalStyles";
import { getColumnsAg } from "core/actions/tableColumnActions";
import {
  setNewStoresTrackingTableLoader,
  getNewStoresTrackingDetailsTableData,
  downloadNewStoresTrackingDetails
} from "../../../services-inventorysmart/Allocation-Reports/new-stores-tracking-services";
import { 
  ERROR_MESSAGE,
  tableConfigurationMetaData
} from "../../../constants-inventorysmart/stringConstants";
import { NEW_STORE_TRACKING_MODULE } from "../CustomHooks/moduleConstants";
import { useTranslation } from "impact-ui-v3";

const NewStoresTrackingTableComponent = (props) => {
  const { t } = useTranslation();
  const [colDefs, setColDefs] = useState([]);
  const tableInstance = useRef(null);
  const globalClasses = globalStyles();
  const pageSize = props.pageSize || 10;
  const apiCallInProgressRef = useRef(false);
  const filterStateRef = useRef(null);
  const enableDownload =
      props.moduleConfig?.[NEW_STORE_TRACKING_MODULE]?.enableDownload ?? false;
  
  useEffect(() => {
    filterStateRef.current = props.newStoresTrackingFiltersState;
  }, [props.newStoresTrackingFiltersState]);
  
  const handleErrorMessage = useCallback((e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) {
      props.addSnack({
        message: errObj?.message,
        options: {
          variant: "error",
        },
      });
    } else {
      props.addSnack({
        message: ERROR_MESSAGE,
        options: {
          variant: "error",
        },
      });
    }
  }, [props]);
  
  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };
  
  const fetchColumnDefinitions = useCallback(async () => {
    try {
      props.setNewStoresTrackingTableLoader(true);
      let col = [];
      const tableConfigName = "new_stores_performance_tracking_details_table";
      
      col = await getColumnsAg(
        `table_name=${tableConfigName}`
      )();
      setColDefs(col);
      props.setNewStoresTrackingTableLoader(false);
    } catch (e) {
      props.setNewStoresTrackingTableLoader(false);
      handleErrorMessage(e);
    }
  }, [handleErrorMessage, props]);

  useEffect(() => {
    fetchColumnDefinitions();
  }, [fetchColumnDefinitions]);
  
  const loadTableInstance = (params) => {
    tableInstance.current = params;
  };
  
  // Function to refresh the table data
  const refreshTable = useCallback(() => {
    if (tableInstance.current?.api) {
      tableInstance.current.api.refreshServerSideStore({ purge: true });
    }
  }, []);
  
  useEffect(() => {    
    if (props.newStoresTrackingFiltersState && tableInstance.current?.api) {
      refreshTable();
    }
  }, [props.newStoresTrackingFiltersState, refreshTable]);

  const handleDownload = async () => {
    try {
      props.setNewStoresTrackingTableLoader(true);
      
      if (!props.newStoresTrackingFiltersState) {
        displaySnackMessages(
          t("inventorysmart.pleaseApplyFiltersFirst"),
          "error"
        );
        props.setNewStoresTrackingTableLoader(false);
        return;
      }
      
      const body = {
        filters: props.newStoresTrackingFiltersState,
        application_code: 1,
        meta: {
          ...tableConfigurationMetaData.meta,
          limit: { limit: 10, page: 1 },
        },
      };
      
      const downloadResponse = await props.downloadNewStoresTrackingDetails(body);
      const message = downloadResponse?.data?.data?.message;
      displaySnackMessages(message, "success");
      props.setNewStoresTrackingTableLoader(false);
    } catch (e) {
      props.setNewStoresTrackingTableLoader(false);
      handleErrorMessage(e);
    }
  };

  const fetchDetailsTableData = useCallback(async (manualbody, pageIndex) => {
    if (apiCallInProgressRef.current || !filterStateRef.current) {
      return { data: [], totalCount: 0 };
    }
    
    apiCallInProgressRef.current = true;
    
    try {
      props.setNewStoresTrackingTableLoader(true);
      
      let body = {
        meta: {
          ...manualbody,
          limit: { limit: pageSize || 10, page: pageIndex + 1 },
        },
        filters: filterStateRef.current,
        application_code: 1,
      };
      
      const response = await props.getNewStoresTrackingDetailsTableData(body);
   
      let tableData = response?.data?.data?.details_table_data?.data || [];
      const totalCount = response?.data?.data?.total || null;
            
      props.setNewStoresTrackingTableLoader(false);
      apiCallInProgressRef.current = false;
      
      return {
        data: tableData,
        totalCount: totalCount
      };
    } catch (error) {
      props.setNewStoresTrackingTableLoader(false);
      apiCallInProgressRef.current = false;
      handleErrorMessage(error);
      return {
        data: [],
        totalCount: 0
      };
    }
  }, [pageSize, handleErrorMessage]);

  const manualCallBack = useCallback(
    (params, pageIndex) => fetchDetailsTableData(params, pageIndex),
    [fetchDetailsTableData]
  );

  return (
    <div className={globalClasses.marginVertical1rem}>
      <AgGridComponent
        tableHeader="New Store Performance Breakdown"
        columns={colDefs}
        loadTableInstance={loadTableInstance}
        manualCallBack={manualCallBack}
        rowModelType="serverSide"
        serverSideStoreType="partial"
        cacheBlockSize={pageSize}
        uniqueRowId={"key"}
        pagination={true}
        paginationPageSize={pageSize}
        onDownloadButtonClick={() => handleDownload()}
        showDownloadButton = {enableDownload}
      />
    </div>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
  moduleConfig: inventorysmartReducer?.allocationReportsCommonService?.moduleConfig,
    newStoresTrackingFiltersState:
      inventorysmartReducer.inventorySmartNewStoresTrackingService
        ?.newStoresTrackingFiltersState,
    pageSize:
      inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.inventorysmart_page_count,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    setNewStoresTrackingTableLoader: (body) =>
      dispatch(setNewStoresTrackingTableLoader(body)),
    downloadNewStoresTrackingDetails: (body) => 
      dispatch(downloadNewStoresTrackingDetails(body)),
    getNewStoresTrackingDetailsTableData: (body) =>
      dispatch(getNewStoresTrackingDetailsTableData(body)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(NewStoresTrackingTableComponent);
