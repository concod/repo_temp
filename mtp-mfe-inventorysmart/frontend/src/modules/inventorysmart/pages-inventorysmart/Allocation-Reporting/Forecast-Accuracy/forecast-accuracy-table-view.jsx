import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import { isEmpty } from "lodash";
import AgGridComponent from "core/Utils/agGrid";
import globalStyles from "core/Styles/globalStyles";
import { getColumnsAg } from "core/actions/tableColumnActions";
import {
  setForecastAccuracyTableData,
  getAccuracyReportTableData,
} from "../../../services-inventorysmart/Allocation-Reports/forecast-accuracy-service";
import {
  ERROR_MESSAGE,
} from "../../../constants-inventorysmart/stringConstants";
import { downloadForecast } from "modules/inventorysmart/services-inventorysmart/Allocation-Reports/allocation-reports-common-service";
import { getCustomFilterObject, getStartDateAndEndDateStringFromFiscalWeekObject } from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";
import { FORECAST_ACCURACY_MODULE } from "../CustomHooks/moduleConstants";
import { getNearestDay } from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";

const ForecastAccuracyTableComponent = (props) => {
  const [colDefs, setColDefs] = useState([]);
  const [requestBody, setRequestBody] = useState([]);
  const filterDependencyRef = useRef(null);
  const tableInstance = useRef(null);
  const globalClasses = globalStyles();
  const pageSize = props.pageSize;
  const enableDownload =
      props.moduleConfig?.[FORECAST_ACCURACY_MODULE]?.enableDownload ?? false;

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) props.displaySnackMessages(errObj?.message, "error");
    else props.displaySnackMessages(ERROR_MESSAGE, "error");
  };
  const fetchForecastAccuracyTableColumns = async () => {
    try {
      props.setForecastAccuracyTableLoader(true);
      let col = [];
      col = await getColumnsAg(
        "table_name=inventorysmart_allocation_forecast_accuracy"
      )();
      setColDefs(col);
    } catch (e) {
      handleErrorMessage(e);
    } finally {
      props.setForecastAccuracyTableLoader(false);
    }
  }

  const setManualCallBackRequestBody = (manualbody, pageIndex) => {
    let filters = [];
    let fiscal_week = ""
    let fiscal_year = ""
    let customFilters = []

    filterDependencyRef?.current.forEach((filterKeysValue) => {
      if (
        filterKeysValue.attribute_name !== "fiscal_date_range"
      ) {
        filters.push(filterKeysValue);
      } else {
        const { fiscalInfoEndDate } = filterKeysValue?.values
        const { fiscal_year_week } = fiscalInfoEndDate
        fiscal_week = String(fiscal_year_week)
        const {startDate, endDate} = getStartDateAndEndDateStringFromFiscalWeekObject( filterKeysValue)
        customFilters = [getCustomFilterObject("start_date", "start_date", [getNearestDay(startDate)]), getCustomFilterObject("end_date", "end_date", [getNearestDay(endDate)])]
      }
    });


    let manualFilterbody = manualbody
      ? manualbody
      : { range: [], sort: [], search: [] };
    let body = {
      meta: {
        ...manualFilterbody,
        limit: { limit: pageSize || 10, page: pageIndex + 1 },
      },
      filters: [...filters, ...customFilters],
      fiscal_week,
      fiscal_year
    };
    return body
  };

  const manualCallBack = async (manualbody, pageIndex) => {
    props.setForecastAccuracyTableLoader(true);
    let body = setManualCallBackRequestBody(manualbody, pageIndex);
    try {
      setRequestBody(body);
      let response = await props.getAccuracyReportTableData(body);
      if(response?.data?.show_message){
        props.displaySnackMessages(response?.data?.message, "success");
        props.setForecastAccuracyTableLoader(false);
        return {
          data: [],
          totalCount: 0,
        };
      } else {
      let deepDiveData = response.data?.data?.data || [];
      props.setForecastAccuracyTableData(deepDiveData);
      props.setForecastAccuracyTableLoader(false);
      return {
        data: deepDiveData,
        totalCount: response.data?.data?.total,
      };
      }
    } catch (e) {
      handleErrorMessage(e);
      props.setForecastAccuracyTableLoader(false);
      return {
        data: [],
        totalCount: 0,
      };
    }
  };

  const loadTableInstance = (params) => {
    tableInstance.current = params;
  };
  const handleDownload = async () => {
    try {
      let response = await props.downloadForecast(requestBody);
      props?.displaySnackMessages(response?.data?.data?.message, "success");
    } catch (err) {
      handleErrorMessage(err);
    }
  };

  useEffect(() => {
    fetchForecastAccuracyTableColumns()
  }, []);

  useEffect(() => {
    if (!isEmpty(props.filterDependency)) {
      filterDependencyRef.current = props.filterDependency;
      tableInstance.current?.api?.refreshServerSideStore({
        purge: true,
      });
    }
  }, [props.filterDependency]);

  return (
    <div className={globalClasses.marginVertical1rem}>
        <AgGridComponent
          showDownloadButton = {enableDownload}
          onDownloadButtonClick = {() => handleDownload()}
          columns={colDefs}
          loadTableInstance={loadTableInstance}
          manualCallBack={(body, pageIndex) =>
            manualCallBack(body, pageIndex)
          }
          cacheBlockSize={pageSize || 10}
          uniqueRowId={"key"}
          paginationPageSize={pageSize}
          rowModelType="serverSide"
          serverSideStoreType="partial"
          pagination={true}
          tableHeader="Forecast Accuracy - Table View"
        />
    </div>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
  moduleConfig: inventorysmartReducer?.allocationReportsCommonService?.moduleConfig,
    forecastAccuracyTableData:
      inventorysmartReducer.inventorySmartForecastAccuracyService
        .forecastAccuracyTableData,
    allocationReportsConfiguration: inventorysmartReducer?.allocationReportsCommonService?.allocationReportsConfiguration,
    pageSize:
      inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.inventorysmart_page_count,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    setForecastAccuracyTableData: (body) =>
      dispatch(setForecastAccuracyTableData(body)),
    getAccuracyReportTableData: (body) =>
      dispatch(getAccuracyReportTableData(body)),
    downloadForecast: (body) => dispatch(downloadForecast(body)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ForecastAccuracyTableComponent);