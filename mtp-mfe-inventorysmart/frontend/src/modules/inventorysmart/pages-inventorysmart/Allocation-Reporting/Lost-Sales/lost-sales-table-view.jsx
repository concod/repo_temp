import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import Form from "core/Utils/form";
import AgGridComponent from "core/Utils/agGrid";
import { addSnack } from "core/actions/snackbarActions";
import { getColumnsAg } from "core/actions/tableColumnActions";
import {
  setLostSalesTableData,
  getLostSalesTableData,
} from "../../../services-inventorysmart/Allocation-Reports/lost-sales-service";
import {
  ERROR_MESSAGE,
  LOST_SALES_FISCAL_WEEK,
} from "../../../constants-inventorysmart/stringConstants";
import Loader from "core/Utils/Loader/loader";
import { isEmpty } from "lodash";
import {
  downloadLostSales,
  setAggregates,
} from "modules/inventorysmart/services-inventorysmart/Allocation-Reports/allocation-reports-common-service";
import { displayFormattedDate } from "../../../utils-inventorysmart/utilityFunctions";
import { LOST_SALES_MODULE } from "../CustomHooks/moduleConstants";
import { getCustomFilterObject } from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";
import { getNearestDay } from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import commentingColumnFormatter from "core/Utils/agGrid/commentingColumnFormatter";

const LostSalesTableViewComponent = (props) => {
  const enableDownload =
    props?.moduleConfig?.[LOST_SALES_MODULE]?.enableDownload ?? false;
  const columnsInitializedRef = useRef(false);
  const [materialViewLoader, setMaterialViewLoader] = useState(false);
  const [enableMaterialFiscalWeek, setEnableMaterialFiscalWeek] = useState(
    true
  );
  const [lostSalesTableConfig, setLostSalesTableConfig] = useState([]);
  const [lostSalesFiscalWeek, setLostSalesFiscalWeek] = useState({});
  const [requestBody, setRequestBody] = useState([]);
  const [fiscalWeekLostSaleDetails, setFiscalWeekLostSaleDetails] = useState({
    units: "",
    revenue: "",
  });
  const [, setEnableLostSalesDownload] = useState(true);
  const [selectedRows, setSelectedRows] = useState([]);
  const pageSize = props.pageSize;
  const filterConfig = useRef({});
  const lostSalesTableInstance = useRef({});
  const lostSalesFiscalWeekValRef = useRef({});
  const offsetValues = useRef({});

  const isThreadFeatureEnabled = Boolean(
    props?.commentingConfig?.inventory_smart_comment_and_thread
      ?.isThreadFeatureEnabled
  );

 
  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(ERROR_MESSAGE, "error");
  };

  const onSelectionChanged = (event) => {
    const selections = event.api.getSelectedRows();
    setSelectedRows(selections);
  };

  

  useEffect(() => {
    (async () => {
      setMaterialViewLoader(true);
      try {
        let lostSalesColDef = [];
        lostSalesColDef = await getColumnsAg("table_name=report_lost_sales")();
        setLostSalesTableConfig(commentingColumnFormatter(lostSalesColDef, null, isThreadFeatureEnabled, false));
      } catch (e) {
        setMaterialViewLoader(false);
        handleErrorMessage(e);
      }
    })();
  }, []);

  useEffect(() => {
    if (!isEmpty(lostSalesFiscalWeek)) {
      lostSalesFiscalWeekValRef.current = lostSalesFiscalWeek;
    }
    // to refresh the table if there is no data for the filters selected
    lostSalesTableInstance.current?.api?.refreshServerSideStore({
      purge: true,
    });
  }, [lostSalesFiscalWeek]);

  useEffect(() => {
    if (!isEmpty(props.selectedFilters)) {
      filterConfig.current = props.selectedFilters;
    }
  }, [props.selectedFilters]);

  useEffect(() => {
    if (props.weeksAvailable?.length) {
      const xAxisLabel =
     props?.moduleConfig?.[LOST_SALES_MODULE]?.xAxisLabel;
      LOST_SALES_FISCAL_WEEK[0].options = props.weeksAvailable.map((item) => {
        let { fiscal_week_year } = getFiscalWeekYear(
          item.fiscal_week,
          item.fiscal_year,
          props?.moduleConfig?.[LOST_SALES_MODULE]?.week_selection_format
        );
        return {
          label:
            xAxisLabel === "weekend"
              ? displayFormattedDate(
                  item.date,
                  localStorage.getItem("tenantDateFormat")
                )
              : fiscal_week_year,
          value: fiscal_week_year,
          id: fiscal_week_year,
        };
      });
      if (xAxisLabel === "weekend") {
        LOST_SALES_FISCAL_WEEK[0].label = "Week Ending Date";
      }
      let lastFiscalWeek =
        props.weeksAvailable[props.weeksAvailable.length - 1];
      setFiscalWeekLostSaleDetails({
        ...fiscalWeekLostSaleDetails,
        units: lastFiscalWeek?.lost_sales_units,
        revenue: lastFiscalWeek?.lost_sales_dollar,
      });

      let defaultSelectedYearVal = getFiscalWeekYear(
        lastFiscalWeek.fiscal_week?.toString(),
        lastFiscalWeek.fiscal_year?.toString(),
        props?.moduleConfig?.[LOST_SALES_MODULE]?.week_selection_format
      );
      setLostSalesFiscalWeek(defaultSelectedYearVal);
    } else {
      setFiscalWeekLostSaleDetails({ units: "", revenue: "" });
      setLostSalesFiscalWeek({});
      LOST_SALES_FISCAL_WEEK[0].options = [];
    }
  }, [props.weeksAvailable]);

  /**
   * Helper function to generate or parse a fiscal week-year string in the required format.
   *
   * This function is necessary because different clients or configurations may expect the fiscal week and year
   * in different string formats, such as "YYYY-WW" (year-week) or "WW-YYYY" (week-year).
   *
   * - If `fiscal_week_year` is provided, the function will parse it and extract the week and year values
   *   according to the specified `format`.
   * - If `fiscal_week_year` is not provided, it will use the `week` and `year` arguments directly.
   * - The function then returns an object containing:
   *     - `fiscal_week`: the week number (as a string or number)
   *     - `fiscal_year`: the year (as a string or number)
   *     - `fiscal_week_year`: the formatted string, either "YYYY-WW" or "WW-YYYY"
   *
   * This utility is used throughout the component to ensure consistent handling and display of fiscal week/year
   * values, regardless of the format required by the UI or API.
   */
  const getFiscalWeekYear = (week, year, format, fiscal_week_year = null) => {
    if (fiscal_week_year) {
      // Parse the fiscal_week_year string into week and year based on the format
      if (format === "YYYY-WW") {
        week = fiscal_week_year?.split("-")[1];
        year = fiscal_week_year?.split("-")[0];
      } else {
        week = fiscal_week_year?.split("-")[0];
        year = fiscal_week_year?.split("-")[1];
      }
    }
    let result = {
      fiscal_week: week,
      fiscal_year: year,
    };
    if (format === "YYYY-WW") {
      // Format as "year-week" (e.g., "2024-23")
      result.fiscal_week_year = `${year}-${week}`;
    } else {
      // Default format as "week-year" (e.g., "23-2024")
      result.fiscal_week_year = `${week}-${year}`;
    }
    return result;
  };

  const handleChangeFiscalWeekValue = (updatedFormData) => {
    props?.setAggregates(null);
    let fiscalWeekYear = getFiscalWeekYear(
      null,
      null,
      props.moduleConfig?.[LOST_SALES_MODULE]?.week_selection_format,
      updatedFormData?.fiscal_week
    );
    setLostSalesFiscalWeek(fiscalWeekYear);
    // To populate the lost sales summary details
    // fetching the lost sales details based on selected fiscal week and year
    if (props.weeksAvailable.length) {
      let selectedFiscalYear = updatedFormData.fiscal_week?.split("-");
      let filteredFiscalYearDetails = props.weeksAvailable.filter((item) => {
        if (
          item.fiscal_week === parseInt(selectedFiscalYear[0]) &&
          item.fiscal_year === parseInt(selectedFiscalYear[1])
        )
          return item;
      });
      filteredFiscalYearDetails.length &&
        setFiscalWeekLostSaleDetails({
          ...fiscalWeekLostSaleDetails,
          units: filteredFiscalYearDetails[0]?.lost_sales_units,
          revenue: filteredFiscalYearDetails[0]?.lost_sales_dollar,
        });
    }
  };

  const handleDownload = async () => {
    try {
      let response = await props.downloadLostSales(requestBody);
      displaySnackMessages(response?.data?.data?.message, "success");
    } catch (err) {
      handleErrorMessage(err);
    }
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const loadLostSalesInstance = (params) => {
    lostSalesTableInstance.current = params;
  };

  const setManualCallBackRequestBody = (manualbody, pageIndex, offsetType) => {
    let selectedFiscalWeek = lostSalesFiscalWeekValRef.current;
    let limit =
      Object.keys(offsetType.current)?.length > 0 && pageIndex !== 0
        ? { limit: pageSize || 10, page: pageIndex + 1, ...offsetType.current }
        : { limit: pageSize || 10, page: pageIndex + 1 };
    const { start_date, end_date } = props.dateRange;
    const customFilters = [
      getCustomFilterObject("start_date", "start_date", [getNearestDay(start_date)]),
      getCustomFilterObject("end_date", "end_date", [getNearestDay(end_date)]),
    ];
    return {
      filters: [
        ...filterConfig.current?.filter((thisFilter) => {
          return thisFilter.attribute_name !== "range-picker";
        }),
        ...customFilters,
      ],
      fiscal_week: selectedFiscalWeek?.fiscal_week,
      fiscal_year: selectedFiscalWeek?.fiscal_year,
      meta: {
        ...manualbody,
        limit,
      },
    };
  };

  const manualCallBackLostSales = async (manualbody, pageIndex) => {
    if (
      props.inventorysmartScreenConfigForInfiniteScrolling?.includes(
        "RLSMaterialView"
      )
    ) {
      pageIndex == 0 && setMaterialViewLoader(true);
    } else {
      setMaterialViewLoader(true);
    }
    setEnableMaterialFiscalWeek(false);

    let body;
    if (isEmpty(lostSalesFiscalWeekValRef.current)) {
      setMaterialViewLoader(false);
      return {
        data: [],
        totalCount: 0,
      };
    } else {
      body = setManualCallBackRequestBody(manualbody, pageIndex, offsetValues);
    }
    try {
      // Maling Api call to fetch table data
      setRequestBody(body);
      let response = await props.getLostSalesTableData(body);
      if (response?.data?.show_message) {
        displaySnackMessages(response?.data?.message, "success");
        setMaterialViewLoader(false);
        setEnableLostSalesDownload(false);
        props.setLostSalesTableData([]);
        return {
          data: [],
          totalCount: 0,
        };
      }
      if (response.data?.data?.data) {
        // Carters
        if (props.showAggregates) {
          const { lost_sales_revenue, lost_sales_units } = response?.data?.data;
          props?.setAggregates({
            lost_sales_revenue,
            lost_sales_units,
          });
        }
        props.setLostSalesTableData(response.data?.data?.data);
        if(response.data?.data?.columns && !columnsInitializedRef.current){
          columnsInitializedRef.current = true;
          const cols = agGridColumnFormatter(response.data?.data?.columns);
          setLostSalesTableConfig(commentingColumnFormatter(cols, null, isThreadFeatureEnabled, false));
        }
      } else {
        // DG
        props.setLostSalesTableData(response.data?.data);
        if(response.data?.columns && !columnsInitializedRef.current){
          columnsInitializedRef.current = true;
          const cols = agGridColumnFormatter(response.data?.data?.columns);
          setLostSalesTableConfig(commentingColumnFormatter(cols, null, isThreadFeatureEnabled, false));
        }
      }
      if (pageIndex == 0) {
        if (response.data?.data?.data?.length || response.data?.data?.length)
          setEnableLostSalesDownload(false);
        else setEnableLostSalesDownload(true);
      }
      offsetValues.current = {
        offset: response.data?.offset,
        sub_offset: response.data?.sub_offset,
      };
      setMaterialViewLoader(false);
      const rawData = response.data?.data?.data || response.data?.data;
      const dataWithKeys = rawData?.map((row, index) => ({
        ...row,
        key: `${pageIndex}_${index}`,
      })) || [];
      return {
        data: dataWithKeys,
        totalCount: response.data?.total,
      };
    } catch (e) {
      setEnableLostSalesDownload(true);
      handleErrorMessage(e);
      setMaterialViewLoader(false);
      return {
        data: [],
        totalCount: 0,
      };
    } finally {
      setEnableMaterialFiscalWeek(true);
    }
  };

  const getTopRightOptions = () => {
    let options = [];
    options.push(
      <div>
        <Form
          layout={"vertical"}
          maxFieldsInRow={1}
          handleChange={handleChangeFiscalWeekValue}
          fields={LOST_SALES_FISCAL_WEEK}
          updateDefaultValue={false}
          defaultValues={{ fiscal_week: lostSalesFiscalWeek?.fiscal_week_year }}
          labelWidthSpan={2}
          fieldTypeWidthSpan={2}
          disabledFields={!enableMaterialFiscalWeek}
        ></Form>{" "}
      </div>
    );
    return options;
  };
  return (
    <div>
      <Loader loader={materialViewLoader}>
        <AgGridComponent
          showDownloadButton={ enableDownload}
          onDownloadButtonClick={() => handleDownload()}
          topRightOptions={getTopRightOptions()}
          loadTableInstance={loadLostSalesInstance}
          manualCallBack={(body, pageIndex) =>
            manualCallBackLostSales(body, pageIndex)
          }
          {...(props.inventorysmartScreenConfigForInfiniteScrolling?.includes(
            "RLSMaterialView"
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
          columns={lostSalesTableConfig}
          uniqueRowId={"key"}
          paginationPageSize={pageSize}
          tableHeader="Lost sales - Detailed View"
          selectAllHeaderComponent={isThreadFeatureEnabled}
          isChatEnabled={isThreadFeatureEnabled}
          enableCellComment={false}
          tableName="report_lost_sales"
          rowSelection="multiple"
          onSelectionChanged={onSelectionChanged}
        />
      </Loader>
    </div>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
    moduleConfig: inventorysmartReducer?.allocationReportsCommonService?.moduleConfig,
    inventorysmartScreenConfigForInfiniteScrolling:
      inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfigForInfiniteScrolling,
    selectedFilters:
      inventorysmartReducer.inventorySmartLostSalesService?.selectedFilters,
    inventorysmartScreenConfig:
      store.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig,
    pageSize:
      inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.inventorysmart_page_count,
    allocationReportsConfiguration:
      store.inventorysmartReducer?.allocationReportsCommonService
        ?.allocationReportsConfiguration,
    commentingConfig: store?.tenantConfigReducer?.commentingConfig
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    getLostSalesTableData: (body) => dispatch(getLostSalesTableData(body)),
    setLostSalesTableData: (body) => dispatch(setLostSalesTableData(body)),
    downloadLostSales: (body) => dispatch(downloadLostSales(body)),
    setAggregates: (body) => dispatch(setAggregates(body)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(LostSalesTableViewComponent);
