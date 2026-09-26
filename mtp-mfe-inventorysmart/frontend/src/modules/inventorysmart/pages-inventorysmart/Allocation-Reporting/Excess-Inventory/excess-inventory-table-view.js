import React, { useState, useEffect, useRef } from "react";
import Form from "core/Utils/form";
import AgGridComponent from "core/Utils/agGrid";
import Loader from "core/Utils/Loader/loader";
import { connect } from "react-redux";
import ReportingViewChips from "../ReportingViewChips";
import { cloneDeep, isEmpty } from "lodash";
import { addSnack } from "core/actions/snackbarActions";
import { getColumnsAg } from "core/actions/tableColumnActions";
import {
  ERROR_MESSAGE,
  LOST_SALES_FISCAL_WEEK,
  EXCESS_INVENTORY_BUTTON_GROUP_OPTIONS,
  EXCESS_INVENTORY_DEFAULT_BUTTON_GROUP_OPTIONS
} from "../../../constants-inventorysmart/stringConstants";
import {
  getExcessInventorySizeTableData,
  getExcessInventoryStoreTableData,
  getExcessInventoryTableData,
  setExcessInventoryTableData,
  setExcessInventoryTableLoader,
  setAggregates,
  setSelectedExcessViewType
} from "modules/inventorysmart/services-inventorysmart/Allocation-Reports/excess-inventory-report-services";
import { displaySnackMessages } from "../../inventorysmart-utility";
import { downloadExcessInventory } from "modules/inventorysmart/services-inventorysmart/Allocation-Reports/allocation-reports-common-service";
import { getCustomDateFilterObject } from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";
import { formatStringDate } from "core/Utils/functions/utils";
import { displayFormattedDate } from "../../../utils-inventorysmart/utilityFunctions";
import { EXCESS_INVENTORY_MODULE } from "../CustomHooks/moduleConstants";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { getNearestDay } from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";
import { getCustomFilterObject } from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";
import commentingColumnFormatter from "core/Utils/agGrid/commentingColumnFormatter";

const ExcessInventoryTableComponent = (props) => {
  const {setAggregates} = props
  const [productStoreViewColumns, setProductStoreViewColumns] = useState([]);
  const [productViewColumns, setProductViewColumns] = useState([]);
  const [excessInventoryFiscalWeek, setExcessInventoryFiscalWeek] = useState({
    fiscal_week: "",
  });
  const [buttonGroupOptions, setButtonGroupOptions] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  
  const fiscalWeekRef = useRef({});
  const filterConfig = useRef({});
  const productStoreViewTableInstance = useRef({});
  const productViewTableInstance = useRef({});
  const productStoreViewColumnsSet = useRef(false);
  const productViewColumnsSet = useRef(false);
  const offsetValues = useRef({});
  const excessInv = props.moduleConfig?.[EXCESS_INVENTORY_MODULE];
  const enableDownload = excessInv?.enableDownload ?? false;
  const isProductViewVisible = excessInv?.isProductViewVisible ?? false;
  const fiscal_date_range = excessInv?.fiscal_date_range ?? true;

  const pageSize = props.pageSize;

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message)
      displaySnackMessages(errObj?.message, "error", props);
    else displaySnackMessages(ERROR_MESSAGE, "error", props);
  };

  useEffect(() => {
    if (isProductViewVisible) {
      setButtonGroupOptions(EXCESS_INVENTORY_BUTTON_GROUP_OPTIONS);
    } else {
      setButtonGroupOptions(EXCESS_INVENTORY_DEFAULT_BUTTON_GROUP_OPTIONS);
    }
  }, [isProductViewVisible]);
  
  const isThreadFeatureEnabled = Boolean(
    props?.commentingConfig?.inventory_smart_comment_and_thread
      ?.isThreadFeatureEnabled
  );

  const onSelectionChanged = (event) => {
    const selections = event.api.getSelectedRows();
    setSelectedRows(selections);
  };

  // Load column definitions for both views
  const loadColumnDefinitions = async () => {
    props.setExcessInventoryTableLoader(true);
    try {
      // Load columns for Product Store View
      let  productStoreViewColDef = await getColumnsAg("table_name=inventorysmart_excess_inv_list")();
      setProductStoreViewColumns(commentingColumnFormatter(productStoreViewColDef, null, isThreadFeatureEnabled, false));
      
      // Only load Product View columns if that view is visible
      if (isProductViewVisible) {
          let productViewColDef = await getColumnsAg( "table_name=inventorysmart_excess_inv_product_view_list", {},{}, false, false, true, isThreadFeatureEnabled)();
          setProductViewColumns(commentingColumnFormatter(productViewColDef, null, isThreadFeatureEnabled, false));
      }
          } catch (e) {
      handleErrorMessage(e);
    } finally {
      props.setExcessInventoryTableLoader(false);
    }
  };

  useEffect(() => {
    loadColumnDefinitions();
    props.setExcessInventoryTableLoader(true);
  }, []);

  useEffect(() => {
    if (excessInventoryFiscalWeek.fiscal_week?.length) {
      let fw = excessInventoryFiscalWeek.fiscal_week?.split("-")[0];
      let graphData = cloneDeep(props.excessInventoryGraphData);
      let data = graphData.data?.find((item) => item.fiscal_week == fw);
      if (data) {
        setAggregates({
          units: Math.round(data.excess_inv_sum),
          revenue: Math.round(data.excess_inv_cost_sum),
        });
      } else {
        setAggregates({
          units: "",
          revenue: "",
        });
      }
    }
    refreshActiveTable();
  }, [excessInventoryFiscalWeek]);

  useEffect(() => {
    if (props.renderTable) {
      filterConfig.current = props?.excessReportsFiltersState;
      refreshActiveTable();
    }
  }, [props.renderTable, props.excessReportsFiltersState]);
  
  const refreshActiveTable = () => {
    if (props.selectedExcessViewType === "product-view") {
      productViewTableInstance.current?.api?.refreshServerSideStore({ purge: true });
    } else {
      productStoreViewTableInstance.current?.api?.refreshServerSideStore({ purge: true });
    }
  };

  useEffect(() => {
    if (props?.weeksAvailable?.length) {
      const xAxisLabel =
        props.moduleConfig?.[EXCESS_INVENTORY_MODULE]?.xAxisLabel;
      LOST_SALES_FISCAL_WEEK[0].options = props.weeksAvailable.map((item) => {
        let fiscalWeekYearValue = `${item.fiscal_week}-${item.fiscal_year}`;
        return {
          label:
            xAxisLabel === "weekend"
              ? displayFormattedDate(
                  item.week_end_date,
                  localStorage.getItem("tenantDateFormat")
                )
              : fiscalWeekYearValue,
          value: fiscalWeekYearValue,
          id: fiscalWeekYearValue,
        };
      });
      if (xAxisLabel === "weekend") {
        LOST_SALES_FISCAL_WEEK[0].label = "Week Ending Date";
      }
      let lastFiscalWeek =
        props?.weeksAvailable[props?.weeksAvailable.length - 1];
      let defaultSelectedYearVal = `${lastFiscalWeek.fiscal_week}-${lastFiscalWeek.fiscal_year}`;
      setExcessInventoryFiscalWeek({ fiscal_week: defaultSelectedYearVal });
      fiscalWeekRef.current = { fiscal_week: defaultSelectedYearVal };
    } else {
      setExcessInventoryFiscalWeek({ fiscal_week: "" });
      fiscalWeekRef.current = {};
      LOST_SALES_FISCAL_WEEK[0].options = [];
    }
  }, [props.weeksAvailable]);

  const handleDownload = async () => {
    let body = createRequestBody(
      { range: [], search: [], sort: [] },
      0,
      offsetValues,
      props.selectedExcessViewType
    );

    try {
      let response = await props.downloadExcessInventory(body);
      displaySnackMessages(response?.data?.data?.message, "success", props);
    } catch (err) {
      handleErrorMessage(err);
    }
  };

  const handleChangeFiscalWeekValue = (updatedFormData) => {
    setAggregates(null)
    setExcessInventoryFiscalWeek(updatedFormData);
    fiscalWeekRef.current = updatedFormData;
    // To populate the lost sales summary details
    // fetching the lost sales details based on selected fiscal week and year
    if (props.weeksAvailable.length) {
      let selectedFiscalYear = updatedFormData.fiscal_week?.split("-");
      props.weeksAvailable.filter((item) => {
        if (
          item.fiscal_week === parseInt(selectedFiscalYear[0]) &&
          item.fiscal_year === parseInt(selectedFiscalYear[1])
        )
          return item;
      });
    }
    refreshActiveTable();
  };

  const handleChangeViewType = (newViewType) => {
    if (props.selectedExcessViewType !== newViewType) {
      props.setSelectedExcessViewType(newViewType);
    }
  };

  const createRequestBody = (manualbody, pageIndex, offsetType, viewType) => {
    let selectedFiscalWeek = fiscalWeekRef.current.fiscal_week?.split("-");
    let limit =
      Object.keys(offsetType.current)?.length > 0 && pageIndex !== 0
        ? { limit: pageSize || 10, page: pageIndex + 1, ...offsetType.current }
        : { limit: pageSize || 10, page: pageIndex + 1 };
    let manualFilterbody = manualbody
      ? manualbody
      : { range: [], sort: [], search: [] };
    let filters = [];
    filterConfig.current?.forEach((filterKeysValue) => {
      if (filterKeysValue.attribute_name === "range-picker") {
        let date_range = {
          start_date: filterKeysValue.values[0],
          end_date: filterKeysValue.values[1],
        };
        filters.push(
          getCustomDateFilterObject("start_date", "start_date", [
            date_range?.start_date || undefined,
          ]),
          getCustomDateFilterObject("end_date", "end_date", [
            date_range?.end_date || undefined,
          ])
        );
      } else if (filterKeysValue.attribute_name === "fiscal_date_range") {
        const dates = filterKeysValue.values;
        if (dates && fiscal_date_range) {
          const startDate = formatStringDate(
            dates?.fiscalInfoStartDate?.calendar_week_start_date,
            false,
            true
          ).format("YYYY-MM-DD");
          const endDate = formatStringDate(
            dates?.fiscalInfoEndDate?.fiscal_week_end_date,
            false,
            true
          ).format("YYYY-MM-DD");

          const fiscal_date_range = {
            start_date: getNearestDay(startDate),
            end_date: getNearestDay(endDate),
          };
          filters.push(
            getCustomFilterObject("start_date", "start_date", [
              fiscal_date_range?.start_date || undefined,
            ]),
            getCustomFilterObject("end_date", "end_date", [
              fiscal_date_range?.end_date || undefined,
            ])
          );
        }
      } else {
        filters.push(filterKeysValue);
      }
    });

    const requestBody = {
      filters: [...filters],
      fiscal_week: selectedFiscalWeek[0],
      fiscal_year: selectedFiscalWeek[1],
      meta: {
        ...manualFilterbody,
        limit,
      },
    };

    if (viewType === "product-view") {
      requestBody.operation_type = "PRODUCT-VIEW";
    }

    return requestBody;
  };

  const handleProductStoreViewData = async (manualbody, pageIndex) => {
    if (!isEmpty(fiscalWeekRef.current)) {
      props.setExcessInventoryTableLoader(true);
      let body = createRequestBody(
        manualbody, 
        pageIndex, 
        offsetValues, 
        "product-store-view"
      );
      
      try {
        let response = await props.getExcessInventoryTableData(body);
        props.setExcessInventoryTableData(response.data?.data);
        if(response.data?.data?.columns && !productStoreViewColumnsSet.current){
          productStoreViewColumnsSet.current = true;
          // Clone columns to make them mutable before formatting
          const clonedColumns = cloneDeep(response.data.data.columns);
          const cols = agGridColumnFormatter(clonedColumns);
          setProductStoreViewColumns(commentingColumnFormatter(cols, null, isThreadFeatureEnabled, false));
        }
        offsetValues.current = {
          offset: response.data?.offset,
          sub_offset: response.data?.sub_offset,
        };
        props.setExcessInventoryTableLoader(false);
        
        if (!response.data?.data?.data?.length) {
          return {
            data: [],
            totalCount: 0,
          };
        } else {
          const dataWithKeys = response.data?.data?.data.map((row, index) => ({
            ...row,
            key: `${pageIndex}_${index}`,
          }));
          return {
            data: dataWithKeys,
            totalCount: response.data?.total,
          };
        }
      } catch (error) {
        props.setExcessInventoryTableLoader(false);
        handleErrorMessage(error);
        return {
          data: [],
          totalCount: 0,
        };
      }
    } else {
      return {
        data: [],
        totalCount: 0,
      };
    }
  };
  
  const handleProductViewData = async (manualbody, pageIndex) => {
    if (!isEmpty(fiscalWeekRef.current)) {
      props.setExcessInventoryTableLoader(true);
      let body = createRequestBody(
        manualbody, 
        pageIndex, 
        offsetValues, 
        "product-view" 
      );
      
      try {
        let response = await props.getExcessInventoryTableData(body);
        props.setExcessInventoryTableData(response.data?.data?.data);
        if(response.data?.data?.columns && !productViewColumnsSet.current){
          productViewColumnsSet.current = true;
          // Clone columns to make them mutable before formatting
          const clonedColumns = cloneDeep(response.data.data.columns);
          const cols = agGridColumnFormatter(clonedColumns);
          setProductViewColumns(commentingColumnFormatter(cols, null, isThreadFeatureEnabled, false));
        }
        offsetValues.current = {
          offset: response.data?.offset,
          sub_offset: response.data?.sub_offset,
        };
        props.setExcessInventoryTableLoader(false);
        
        if (!response.data?.data?.data?.length) {
          return {
            data: [],
            totalCount: 0,
          };
        } else {
          const dataWithKeys = response.data?.data?.data.map((row, index) => ({
            ...row,
            key: `${pageIndex}_${index}`,
          }));
          return {
            data: dataWithKeys,
            totalCount: response.data?.data?.total,
          };
        }
      } catch (error) {
        props.setExcessInventoryTableLoader(false);
        handleErrorMessage(error);
        return {
          data: [],
          totalCount: 0,
        };
      }
    } else {
      return {
        data: [],
        totalCount: 0,
      };
    }
  };

  const loadProductStoreViewTableInstance = (params) => {
    productStoreViewTableInstance.current = params;
  };
  
  const loadProductViewTableInstance = (params) => {
    productViewTableInstance.current = params;
  };
  
  const getTopRightOptions = () => {
    let options = []
    options.push(<div>
      <Form
        layout={"vertical"}
        maxFieldsInRow={1}
        handleChange={handleChangeFiscalWeekValue}
        fields={LOST_SALES_FISCAL_WEEK}
        updateDefaultValue={false}
        defaultValues={excessInventoryFiscalWeek}
        labelWidthSpan={2}
        fieldTypeWidthSpan={2}
      ></Form>
    </div>)
    return options
  }

  const getTopCenterOptions = () => {
    if (isProductViewVisible) {
      return (
        <ReportingViewChips
          options={buttonGroupOptions}
          selectedOption={props.selectedExcessViewType}
          onChange={handleChangeViewType}
        />
      );
    }
    return null;
  };

  const getTableHeaderText = (viewType) => {
    return viewType === "product-view" 
      ? "Product View" 
      : "Product Store View";
  };

  return (
    <div>
      <Loader loader={props.excessInventoryTableLoader}>
        {props.selectedExcessViewType === "product-view" ? (
          <AgGridComponent
           selectAllHeaderComponent = {isThreadFeatureEnabled}
            showDownloadButton = {enableDownload}
            onDownloadButtonClick = {() => handleDownload()}
            tableHeader={getTableHeaderText("product-view")}
            topRightOptions={getTopRightOptions()}
            topCenterOptions={getTopCenterOptions()}
            columns={productViewColumns}
            manualCallBack={(body, pageIndex) => handleProductViewData(body, pageIndex)}
            rowModelType="serverSide" 
            serverSideStoreType="partial"
            cacheBlockSize={pageSize || 10}
            uniqueRowId={"key"}
            loadTableInstance={loadProductViewTableInstance}
            pagination={true}
            paginationPageSize={pageSize}
            key="excess-inventory-product-view"
            isChatEnabled={isThreadFeatureEnabled}
            enableCellComment={false}
            tableName={"inventorysmart_excess_inv_product_view_list"}
            rowSelection="multiple"
            onSelectionChanged={onSelectionChanged}
          />
        ) : (
          <AgGridComponent
            selectAllHeaderComponent = {isThreadFeatureEnabled}
            showDownloadButton = {enableDownload}
            onDownloadButtonClick = {() => handleDownload()}
            tableHeader={getTableHeaderText("product-store-view")}
            topRightOptions={getTopRightOptions()}
            topCenterOptions={getTopCenterOptions()}
            columns={productStoreViewColumns}
            manualCallBack={(body, pageIndex) => handleProductStoreViewData(body, pageIndex)}
            rowModelType="serverSide" 
            serverSideStoreType="partial"
            cacheBlockSize={pageSize || 10}
            uniqueRowId={"key"}
            loadTableInstance={loadProductStoreViewTableInstance}
            pagination={true}
            paginationPageSize={pageSize}
            key="excess-inventory-product-store-view"
            isChatEnabled={isThreadFeatureEnabled}
            enableCellComment={false}
            tableName="inventorysmart_excess_inv_list"
            rowSelection="multiple"
            onSelectionChanged={onSelectionChanged}
          />
        )}
      </Loader>
    </div>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
  moduleConfig: inventorysmartReducer?.allocationReportsCommonService?.moduleConfig,
    excessReportsFiltersState:
      inventorysmartReducer.inventorySmartExcessInventoryService
        .excessReportsFiltersState,
    excessInventoryTableLoader:
      inventorysmartReducer.inventorySmartExcessInventoryService
        .excessInventoryTableLoader,
    allocationReportsConfiguration:
      store.inventorysmartReducer?.allocationReportsCommonService
        ?.allocationReportsConfiguration,
    pageSize:
      inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.inventorysmart_page_count,
    selectedExcessViewType:
      inventorysmartReducer?.inventorySmartExcessInventoryService
        ?.selectedExcessViewType,
    commentingConfig: store?.tenantConfigReducer?.commentingConfig
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    setExcessInventoryTableLoader: (snack) =>
      dispatch(setExcessInventoryTableLoader(snack)),
    getExcessInventoryTableData: (body) =>
      dispatch(getExcessInventoryTableData(body)),
    setExcessInventoryTableData: (body) =>
      dispatch(setExcessInventoryTableData(body)),
    getExcessInventoryStoreTableData: (body) =>
      dispatch(getExcessInventoryStoreTableData(body)),
    getExcessInventorySizeTableData: (body) =>
      dispatch(getExcessInventorySizeTableData(body)),
    downloadExcessInventory: (body) => dispatch(downloadExcessInventory(body)),
    setAggregates: (body) => dispatch(setAggregates(body)),
    setSelectedExcessViewType: (viewType) =>
      dispatch(setSelectedExcessViewType(viewType)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ExcessInventoryTableComponent);
