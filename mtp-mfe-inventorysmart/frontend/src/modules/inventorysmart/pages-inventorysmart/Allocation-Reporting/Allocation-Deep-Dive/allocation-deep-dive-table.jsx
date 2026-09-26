import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import { isEmpty } from "lodash";
import AgGridComponent from "core/Utils/agGrid";
import globalStyles from "core/Styles/globalStyles";
import { getColumnsAg } from "core/actions/tableColumnActions";
import {
  setAllocationDeepDiveTableData,
  getAllocationDeepDiveTableData,
} from "../../../services-inventorysmart/Allocation-Reports/allocation-deep-dive-service";
import {
  ERROR_MESSAGE,
} from "../../../constants-inventorysmart/stringConstants";
import GenericCardsPanel from "../../KPI/GenericCardPanel";
import { downloadDeepdive } from "modules/inventorysmart/services-inventorysmart/Allocation-Reports/allocation-reports-common-service";
import { getCustomFilterObject, getKPIIconComponent } from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";
import { DEEP_DIVE_REPORTS_MODULE } from "../CustomHooks/moduleConstants";
import { getNearestDay } from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";

const AllocationDeepDiveTableComponent = (props) => {
  const [allocationDeepDiveColumn, setAllocationDeepDiveColumn] = useState([]);
  const [panelData, setPanelData] = React.useState(null)
  const [requestBody, setRequestBody] = useState([]);
  const filterDependencyRef = useRef(null);
  const deepDiveTableInstance = useRef(null);
  const offsetValues = useRef({});
  const DEEP_DIVE_ALLOCATION_SUMMARY = props.moduleConfig?.[DEEP_DIVE_REPORTS_MODULE]?.deepDiveAllocationSummaryLabels || [];
  const globalClasses = globalStyles();
  const pageSize = props.pageSize;
  const enableDownload =
    props.moduleConfig?.[DEEP_DIVE_REPORTS_MODULE]?.enableDownload ?? false;
  

  const render3DIcons = props.moduleConfig?.[DEEP_DIVE_REPORTS_MODULE]?.render3DIcons ?? false;
  
  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) props.displaySnackMessages(errObj?.message, "error");
    else props.displaySnackMessages(ERROR_MESSAGE, "error");
  };

  const fetchDeepDiveTableColumns = async () => {

    props.setAllocationDeepDiveTableLoader(true);
      try {
        let col = [];
        col = await getColumnsAg(
          "table_name=inventorysmart_allocation_deep_dive"
        )()
        setAllocationDeepDiveColumn(col);
      } catch (e) {
        handleErrorMessage(e);
      } finally {
        props.setAllocationDeepDiveTableLoader(false);
      }
      
  } 

  const setManualCallBackRequestBody = (manualbody, pageIndex) => {
    let filterDependency = filterDependencyRef.current.filter(
      (item) => item.attribute_name !== "range-picker"
    );
    let filterDatePicker = filterDependencyRef.current.filter(
      (item) => item.attribute_name === "range-picker"
    );
    let formattedDate = filterDatePicker[0].values;
    let manualFilterbody = manualbody
      ? manualbody
      : { range: [], sort: [], search: [] };
    let limit =
      Object.keys(offsetValues.current)?.length > 0 && pageIndex !== 0
        ? { limit: pageSize || 10, page: pageIndex + 1, ...offsetValues.current }
        : { limit: pageSize || 10, page: pageIndex + 1 };
    const customFilters = [getCustomFilterObject("start_date","start_date",[getNearestDay(formattedDate[0])]), getCustomFilterObject("end_date","end_date",[getNearestDay(formattedDate[1])])];
    return {
      filters: [...filterDependency, ...customFilters],
      start_date: formattedDate[0],
      end_date: formattedDate[1],
      meta: {
        ...manualFilterbody,
        limit,
      },
    };
  };

  const manualCallBackDeepDive = async (manualbody, pageIndex) => {
    if (
      props.inventorysmartScreenConfigForInfiniteScrolling?.includes("RDDA")
    ) {
      pageIndex == 0 && props.setAllocationDeepDiveTableLoader(true);
    } else {
      props.setAllocationDeepDiveTableLoader(true);
    }
    let body = setManualCallBackRequestBody(manualbody, pageIndex);
    try {
      setRequestBody(body);
      let response = await props.getAllocationDeepDiveTableData(body);
      if(response?.data?.show_message){
        props.displaySnackMessages(response?.data?.message, "success");
        props.setAllocationDeepDiveTableLoader(false);
        props.setAllocationDeepDiveTableData(null);
        return {
          data: [],
          totalCount: 0,
        };
      } else {
      let deepDiveData = response.data?.data || [];
      props.setAllocationDeepDiveTableData(deepDiveData);
      offsetValues.current = {
        offset: deepDiveData?.table_data?.offset,
        sub_offset: deepDiveData?.table_data?.sub_offset,
      };
      props.setAllocationDeepDiveTableLoader(false);
      let resultantData = deepDiveData?.table_data?.result?.map((item) => {
        return {
          ...item,
          max_supression_flag: item?.max_supression_flag ? "Yes" : "No",
          min_influenced_allocation: item?.min_influenced_allocation
            ? "Yes"
            : "No",
          is_edited: item?.is_edited ? "Yes" : "No",
        };
      });
      return {
        data: resultantData,
        totalCount: response.data?.total,
      };
    }
    } catch (e) {
      handleErrorMessage(e);
      props.setAllocationDeepDiveTableLoader(false);
      return {
        data: [],
        totalCount: 0,
      };
    }
  };

  const handleDownload = async () => {
    
    try {
      let response = await props.downloadDeepDive(requestBody);
      props.displaySnackMessages(response?.data?.data?.message, "success");
    } catch (err) {
      handleErrorMessage(err);
    }
  };

  const loadDeepDiveTableInstance = (params) => {
    deepDiveTableInstance.current = params;
  };

  useEffect(() => {
   fetchDeepDiveTableColumns()
  }, []);

  useEffect(() => {
    const aggregated_data = props.allocationDeepDiveTableData?.aggregated_data;
    let panelData = {
      noSubMetrics: true, // Only carters has no subMetrics right now.
      expandedLayout: "center",
      panelHeader: "KPIs",
      cardData: [],
    };
    if (!isEmpty(aggregated_data)) {
      const visibleDeepDiveSummaryLabels = DEEP_DIVE_ALLOCATION_SUMMARY.filter(
        (item) => item?.visible !== false
      );

      const percentageCards = visibleDeepDiveSummaryLabels.filter((item) =>
        item?.label?.includes("%")
      );
      const percentageKeys = percentageCards.map((item) => item.key);
      let deepDiveSummaryCards = visibleDeepDiveSummaryLabels.map((item, index) => {
        let countWithComma =
          percentageKeys.includes(item.key) && aggregated_data[0][item.key]
            ? (aggregated_data[0][item.key] * 100).toFixed(2)
            : parseInt(aggregated_data[0][item.key]);
        
        const cardData = {
        ...item,
          value:
            !countWithComma && countWithComma != 0
              ? "-"
              : percentageKeys.includes(item.key)
                ? `${countWithComma?.toLocaleString()}%`
                : countWithComma?.toLocaleString(),
        };
        
        if (render3DIcons && item?.iconType) {
          cardData.renderIcon = () => getKPIIconComponent(item?.iconType, index);
        }
        
        return cardData;
      });
      panelData.cardData = deepDiveSummaryCards
      setPanelData(panelData);
    }else{
      setPanelData(null);
    }
  }, [props.allocationDeepDiveTableData]);

  useEffect(() => {
    if (!isEmpty(props.filterDependency)) {
      filterDependencyRef.current = props.filterDependency;
      deepDiveTableInstance.current?.api?.refreshServerSideStore({
        purge: true,
      });
    }
  }, [props.filterDependency]);

  

  return (
    <div>
      {panelData &&
            <div className={globalClasses.marginBottom24} >
              <GenericCardsPanel panelData={panelData} />
            </div>
          }
        <AgGridComponent
          showDownloadButton = {enableDownload}
          onDownloadButtonClick = {() => handleDownload()}
          columns={allocationDeepDiveColumn}
          loadTableInstance={loadDeepDiveTableInstance}
          manualCallBack={(body, pageIndex) =>
            manualCallBackDeepDive(body, pageIndex)
          }
          {...(props.inventorysmartScreenConfigForInfiniteScrolling?.includes(
            "RDDA"
          )
            ? {
                pagination: false,
                rowModelType: "infinite",
                cacheOverflowSize: 2,
                hideSelectCurrentPageRecords: true,
              }
            : {
                rowModelType: "serverSide",
                serverSideStoreType: "partial",
              })}
          cacheBlockSize={pageSize || 10}
          uniqueRowId={"key"}
          paginationPageSize={pageSize}
          tableHeader = "Deep Dive Allocation - Table View"
        />
    </div>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
    moduleConfig: inventorysmartReducer?.allocationReportsCommonService?.moduleConfig,
    inventorysmartScreenConfigForInfiniteScrolling:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfigForInfiniteScrolling,
    allocationDeepDiveTableData:
      inventorysmartReducer.inventoryAllocationDeepDiveService
        .allocationDeepDiveTableData,
    allocationReportsConfiguration: inventorysmartReducer?.allocationReportsCommonService?.allocationReportsConfiguration,
    pageSize:
      inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.inventorysmart_page_count,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    setAllocationDeepDiveTableData: (body) =>
      dispatch(setAllocationDeepDiveTableData(body)),
    getAllocationDeepDiveTableData: (body) =>
      dispatch(getAllocationDeepDiveTableData(body)),
    downloadDeepDive: (body) => dispatch(downloadDeepdive(body)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AllocationDeepDiveTableComponent);
