import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";

import { Typography } from "@mui/material";
import { makeStyles } from "@mui/styles";
import { isEmpty } from "lodash";
import Loader from "core/Utils/Loader/loader";

import Form from "core/Utils/form";
import AgGridComponent from "core/Utils/agGrid";
import globalStyles from "core/Styles/globalStyles";
import { addSnack } from "core/actions/snackbarActions";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";

import {
  setExcessInventoryTableLoader,
  setExcessInventoryTableData,
  getExcessInventoryTableData,
  getExcessInventoryStoreTableData,
  getExcessInventorySizeTableData,
} from "../../../services-inventorysmart/Allocation-Reports/excess-inventory-service";
import {
  ERROR_MESSAGE,
  LOST_SALES_FISCAL_WEEK,
} from "../../../constants-inventorysmart/stringConstants";
import DownloadReport from "../report-download";
import { isBackEndPaginatedTable } from "core/Utils/functions/utils";

const useStyles = makeStyles(() => ({
  fiscalWeekContainer: {
    width: "20%",
    marginBottom: "1rem",
  },
}));

const ExcessInventoryTableComponent = (props) => {
  const [materialViewLoader, setMaterialViewLoader] = useState(false);
  const [storeViewLoader, setStoreViewLoader] = useState(false);
  const [sizeViewLoader, setSizeViewLoader] = useState(false);
  const [materialTableRender,setMaterialTableRender]=useState(false);
  const [storeTableRender,setStoreTableRender]=useState(false);
  const [sizeTableRender,setSizeTableRender]=useState(false);
  const [enableMaterialFiscalWeek,setEnableMaterialFiscalWeek]=useState(true);
  const [enableStoreFiscalWeek,setEnableStoreFiscalWeek]=useState(true);
  const [enableSizeFiscalWeek,setEnableSizeFiscalWeek]=useState(true);
  const [excessInventoryTableConfig, setExcessInventoryTableConfig] = useState(
    []
  );
  const [excessInventoryFiscalWeek, setExcessInventoryFiscalWeek] = useState({
    fiscal_week: "",
  });
  const [fiscalWeekExcessInvDetails, setFiscalWeekExcessInvDetails] = useState({
    units: "",
    revenue: "",
  });
  const [requestBody, setRequestBody] = useState([]);
  const [storeRequestBody, setStoreRequestBody] = useState([]);
  const [sizeRequestBody, setSizeRequestBody] = useState([]);
  const [enableDownload, setEnableDownload] = useState(false);
  const [excessInvStoreViewColumns, setExcessInvStoreViewColumns] = useState(
    []
  );
  const [excessInvSizeViewColumns, setExcessInvSizeViewColumns] = useState([]);
  const [enableStoreViewDownload, setEnableStoreViewDownload] = useState(true);
  const [enableSizeViewDownload, setEnableSizeViewDownload] = useState(true);
  const [excessInventoryData, setExcessInventoryData] = useState([]);
  const [excessInventoryStoreData, setExcessInventoryStoreData] = useState([]);
  const [excessInventorySizeData, setExcessInventorySizeData] = useState([]);

  const fiscalWeekRef = useRef({});
  const filterConfig = useRef({});
  const agGridTableInstance = useRef({});
  const excessInvStoreViewTableInstance = useRef({});
  const excessInvSizeViewTableInstance = useRef({});
  const offsetValues = useRef({});
  const storeOffsetValues = useRef({});
  const sizeOffsetValues = useRef({});

  const globalClasses = globalStyles();
  const classes = useStyles();

  useEffect(() => {
    (async () => {
        setMaterialViewLoader(true);
        setStoreViewLoader(true);
        setSizeViewLoader(true);
        try {
          let excessInvColDef = await getColumnsAg(
            "table_name=inventorysmart_excess_inv_list"
          )();
          setExcessInventoryTableConfig(excessInvColDef);
          setMaterialTableRender(true);
          if (dynamicLabelsBasedOnTenant("article") === "Material") {
            let excessInvStoreCols = await getColumnsAg(
              "table_name=inventorysmart_excess_inv_store_list"
            )();
            setExcessInvStoreViewColumns(excessInvStoreCols);
            setStoreTableRender(true);
            let excessInvSizeCols = await getColumnsAg(
              "table_name=inventorysmart_excess_inv_size_list"
            )();
            setExcessInvSizeViewColumns(excessInvSizeCols);
            setSizeTableRender(true);
          }
        } catch (e) {
          setMaterialViewLoader(false);
          setStoreViewLoader(false);
          setSizeViewLoader(false);
          props.displaySnack(ERROR_MESSAGE, "error");
        }
    })();
  }, []);

  useEffect(() => {
    if (!isEmpty(props.renderTable)) {
      filterConfig.current = props.renderTable.filters;
      agGridTableInstance.current?.api?.refreshServerSideStore({ purge: true });
      excessInvStoreViewTableInstance.current?.api?.refreshServerSideStore({
        purge: true,
      });
      excessInvSizeViewTableInstance.current?.api?.refreshServerSideStore({
        purge: true,
      });
    }
  }, [props.renderTable]);

  useEffect(() => {
    if (props.weeksAvailable.length) {
      LOST_SALES_FISCAL_WEEK[0].options = props.weeksAvailable.map((item) => {
        let fiscalWeekYearValue = `${item.fiscal_week}-${item.fiscal_year}`;
        return {
          label: fiscalWeekYearValue,
          value: fiscalWeekYearValue,
          id: fiscalWeekYearValue,
        };
      });
      let lastFiscalWeek =
        props.weeksAvailable[props.weeksAvailable.length - 1];
      setFiscalWeekExcessInvDetails({
        ...fiscalWeekExcessInvDetails,
        units: lastFiscalWeek?.excess_inv_sum,
        revenue: lastFiscalWeek?.excess_inv_cost_sum,
      });
      let defaultSelectedYearVal = `${lastFiscalWeek.fiscal_week}-${lastFiscalWeek.fiscal_year}`;
      setExcessInventoryFiscalWeek({ fiscal_week: defaultSelectedYearVal });
      fiscalWeekRef.current = { fiscal_week: defaultSelectedYearVal };
    } else {
      setFiscalWeekExcessInvDetails({ units: "", revenue: "" });
      setExcessInventoryFiscalWeek({ fiscal_week: "" });
      fiscalWeekRef.current = {};
      LOST_SALES_FISCAL_WEEK[0].options = [];
    }
  }, [props.weeksAvailable]);

  useEffect(()=>{
    setMaterialTableRender(false);
    setStoreTableRender(false);
    setSizeTableRender(false);
  },[excessInventoryFiscalWeek]);

  useEffect(() => {
    if (!materialTableRender) {
      setMaterialTableRender(true);
      setStoreTableRender(true);
      setSizeTableRender(true);

      setMaterialViewLoader(true);
      setStoreViewLoader(true);
      setSizeViewLoader(true);
    }
  }, [materialTableRender]);

  const fetchTableData = async (apiFunction, setData, setLoader) => {
    try {
      if (excessInventoryFiscalWeek.fiscal_week) {
        let selectedFiscalWeek = fiscalWeekRef.current?.fiscal_week?.split("-");
        const body = {
          filters: filterConfig.current,
          meta: {
            search: [],
            range: [],
            sort: [],
            limit: {
              limit: -1,
              page: 1,
            },
          },
          week: selectedFiscalWeek?.[0],
          year: selectedFiscalWeek?.[1],
        };

        const response = await apiFunction(body);
        setData(response.data.data);
        setLoader(false);
      }
    } catch (e) {
      props.displaySnack(ERROR_MESSAGE, "error");
      setLoader(false);
    }
  };

  useEffect(() => {
    if (!isBackEndPaginated('excessInvArticleTable') && excessInventoryFiscalWeek.fiscal_week) {
      setMaterialViewLoader(true);
      fetchTableData(props.getExcessInventoryTableData, setExcessInventoryData, setMaterialViewLoader);
    }
  }, [excessInventoryFiscalWeek]);

  useEffect(() => {
    if (!isBackEndPaginated('excessInvStoreTable') && excessInventoryFiscalWeek.fiscal_week) {
      setStoreViewLoader(true);
      fetchTableData(props.getExcessInventoryStoreTableData, setExcessInventoryStoreData, setStoreViewLoader);
    }
  }, [excessInventoryFiscalWeek]);

  useEffect(() => {
    if (!isBackEndPaginated('excessInvSizeTable') && excessInventoryFiscalWeek.fiscal_week) {
      setSizeViewLoader(true);
      fetchTableData(props.getExcessInventorySizeTableData, setExcessInventorySizeData, setSizeViewLoader);
    }
  }, [excessInventoryFiscalWeek]);

  const isBackEndPaginated = (screenName) => {
    return isBackEndPaginatedTable(props.inventorysmartScreenConfig, screenName);
  };

  const handleChangeFiscalWeekValue = (updatedFormData) => {
    setExcessInventoryFiscalWeek(updatedFormData);
    fiscalWeekRef.current = updatedFormData;
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
        setFiscalWeekExcessInvDetails({
          ...fiscalWeekExcessInvDetails,
          units: filteredFiscalYearDetails[0]?.excess_inv_sum,
          revenue: filteredFiscalYearDetails[0]?.excess_inv_cost_sum,
        });
    }
    agGridTableInstance.current?.api?.refreshServerSideStore({ purge: true });
    excessInvStoreViewTableInstance.current?.api?.refreshServerSideStore({
      purge: true,
    });
    excessInvSizeViewTableInstance.current?.api?.refreshServerSideStore({
      purge: true,
    });
  };

  const setManualCallBackRequestBody = (manualbody, pageIndex, offsetType) => {
    let selectedFiscalWeek = fiscalWeekRef.current.fiscal_week?.split("-");
    let limit =
      Object.keys(offsetType.current)?.length > 0 && pageIndex !== 0
        ? { limit: 10, page: pageIndex + 1, ...offsetType.current }
        : { limit: 10, page: pageIndex + 1 };
    let manualFilterbody = manualbody
      ? manualbody
      : { range: [], sort: [], search: [] };
    return {
      filters: filterConfig.current,
      week: selectedFiscalWeek[0],
      year: selectedFiscalWeek[1],
      meta: {
        ...manualFilterbody,
        limit,
      },
    };
  };

  const manualCallBack = async (manualbody, pageIndex) => {
    if (!isEmpty(fiscalWeekRef.current)) {
      if (props.inventorysmartScreenConfigForInfiniteScrolling?.includes("REIMaterialView")) {
        pageIndex == 0 && setMaterialViewLoader(true);
      }
      else {
        setMaterialViewLoader(true);
      }
      setEnableMaterialFiscalWeek(false);
      let body = setManualCallBackRequestBody(
        manualbody,
        pageIndex,
        offsetValues
      );
      try {
        setRequestBody(body);
        let response = await props.getExcessInventoryTableData(body);
        props.setExcessInventoryTableData(response.data?.data);
        offsetValues.current = {
          offset: response.data?.offset,
          sub_offset: response.data?.sub_offset,
        };
        if (pageIndex == 0) {
          if (response.data?.data?.length) setEnableDownload(true);
          else setEnableDownload(false);
        }
        setMaterialViewLoader(false);
        return {
          data: response.data?.data,
          totalCount: response.data?.total,
        };
      } catch (e) {
        setEnableDownload(false);
        setMaterialViewLoader(false);
        props.displaySnack(ERROR_MESSAGE, "error");
        return {
          data: [],
          totalCount: 0,
        };
      }
      finally{
        setEnableMaterialFiscalWeek(true);
      }
    } else {
      setEnableDownload(false);
      return {
        data: [],
        totalCount: 0,
      };
    }
  };

  const manualCallBackExcessInvStoreView = async (manualbody, pageIndex) => {
    if (!isEmpty(fiscalWeekRef.current)) {
      if (props.inventorysmartScreenConfigForInfiniteScrolling?.includes("REIStoreView")) {
        pageIndex == 0 && setStoreViewLoader(true);
      }
      else {
        setStoreViewLoader(true);
      }
      setEnableStoreFiscalWeek(false);
      let body = setManualCallBackRequestBody(
        manualbody,
        pageIndex,
        storeOffsetValues
      );

      setStoreRequestBody(body);

      try {
        let response = await props.getExcessInventoryStoreTableData(body);
        storeOffsetValues.current = {
          offset: response.data?.offset,
          sub_offset: response.data?.sub_offset,
        };
        if (pageIndex == 0) {
          if (response.data?.data?.length) setEnableStoreViewDownload(false);
          else setEnableStoreViewDownload(true);
        }
        setStoreViewLoader(false);
        return {
          data: response.data?.data,
          totalCount: response.data?.total,
        };
      } catch (e) {
        setEnableStoreViewDownload(true);
        setStoreViewLoader(false);
        props.displaySnack(ERROR_MESSAGE, "error");
        return {
          data: [],
          totalCount: 0,
        };
      }
      finally{
        setEnableStoreFiscalWeek(true);
      }
    } else {
      setEnableStoreViewDownload(true);
      return {
        data: [],
        totalCount: 0,
      };
    }
  };

  const manualCallBackExcessInvSizeView = async (manualbody, pageIndex) => {
    if (!isEmpty(fiscalWeekRef.current)) {
      if (props.inventorysmartScreenConfigForInfiniteScrolling?.includes("REISizeView")) {
        pageIndex == 0 && setSizeViewLoader(true);
      }
      else {
        setSizeViewLoader(true);
      }
      setEnableSizeFiscalWeek(false);
      let body = setManualCallBackRequestBody(
        manualbody,
        pageIndex,
        sizeOffsetValues
      );

      setSizeRequestBody(body);

      try {
        let response = await props.getExcessInventorySizeTableData(body);
        sizeOffsetValues.current = {
          offset: response.data?.offset,
          sub_offset: response.data?.sub_offset,
        };
        if (pageIndex == 0) {
          if (response.data?.data?.length) setEnableSizeViewDownload(false);
          else setEnableSizeViewDownload(true);
        }
        // props.setExcessInventoryTableLoader(false);
        setSizeViewLoader(false);
        return {
          data: response.data?.data,
          totalCount: response.data?.total,
        };
      } catch (e) {
        setEnableSizeViewDownload(true);
        setSizeViewLoader(false);
        props.displaySnack(ERROR_MESSAGE, "error");
        return {
          data: [],
          totalCount: 0,
        };
      }
      finally{
        setEnableSizeFiscalWeek(true);
      }
    } else {
      setEnableSizeViewDownload(false);
      return {
        data: [],
        totalCount: 0,
      };
    }
  };

  const loadAggridTableInstance = (params) => {
    agGridTableInstance.current = params;
  };

  const loadExcessInvStoreInstance = (params) => {
    excessInvStoreViewTableInstance.current = params;
  };

  const loadExcessInvSizeInstance = (params) => {
    excessInvSizeViewTableInstance.current = params;
  };

  return (
    <div>
      <div>
        <Typography variant="h5" className={globalClasses.paddingVertical}>
          Excess Inventory
        </Typography>
        <Typography variant="h5" className={globalClasses.paddingVertical}>
          Total Excess Inv Units:
          {fiscalWeekExcessInvDetails?.units?.toLocaleString()} , Total Excess
          Inv Cost:{" "}
          {`$ ${fiscalWeekExcessInvDetails?.revenue?.toLocaleString()}`}
        </Typography>
      </div>
      <div className={classes.fiscalWeekContainer}>
        <Form
          layout={"vertical"}
          maxFieldsInRow={1}
          handleChange={handleChangeFiscalWeekValue}
          fields={LOST_SALES_FISCAL_WEEK}
          updateDefaultValue={false}
          defaultValues={excessInventoryFiscalWeek}
          labelWidthSpan={2}
          fieldTypeWidthSpan={2}
          disabledFields={!enableMaterialFiscalWeek || !enableStoreFiscalWeek || !enableSizeFiscalWeek}
        ></Form>
      </div>

      {materialTableRender &&
        <Loader loader={materialViewLoader}>
        <Typography variant="h5">
          {`${dynamicLabelsBasedOnTenant("article")} View`}{" "}
        </Typography>
        {isBackEndPaginated('excessInvArticleTable') && (
          <DownloadReport
            screenName={"excess_inventory"}
            requestBody={requestBody}
            disable={!enableDownload}
            columns={excessInventoryTableConfig}
          />
        )}
        <AgGridComponent
          columns={excessInventoryTableConfig}
          manualCallBack={isBackEndPaginated('excessInvArticleTable') ? (body, pageIndex) => manualCallBack(body, pageIndex) : undefined}
          rowdata={!isBackEndPaginated('excessInvArticleTable') ? excessInventoryData : null}
          {...(props.inventorysmartScreenConfigForInfiniteScrolling?.includes(
            "REIMaterialView"
          )
            ? {
              pagination: false,
              rowModelType: isBackEndPaginated('excessInvArticleTable') && "infinite",
              cacheOverflowSize: 2,
              hideSelectCurrentPageRecords: true,
            }
            : {
              rowModelType: isBackEndPaginated('excessInvArticleTable') && "serverSide",
              serverSideStoreType: isBackEndPaginated('excessInvArticleTable') && "partial",
            })}
          cacheBlockSize={10}
          uniqueRowId={"key"}
          loadTableInstance={loadAggridTableInstance}
          downloadAsExcel={isBackEndPaginated('excessInvArticleTable') ? false : true}
        />
      </Loader>
      }
      {props.inventorysmartScreenConfig?.inventorysmart_allocation_report
        ?.drillDown?.showReportSplitView && (
          <div>
          {storeTableRender &&
            <Loader loader={storeViewLoader}>
              <div className={globalClasses.marginVertical1rem}>
                <Typography variant="h5">Store View</Typography>
                {isBackEndPaginated('excessInvStoreTable') && (
                  <DownloadReport
                    screenName={"excess_inv_store_level"}
                    requestBody={storeRequestBody}
                    disable={enableStoreViewDownload}
                    columns={excessInvStoreViewColumns}
                  />
                )}
                <AgGridComponent
                  loadTableInstance={loadExcessInvStoreInstance}
                  manualCallBack={isBackEndPaginated('excessInvStoreTable') ? (body, pageIndex) => manualCallBackExcessInvStoreView(body, pageIndex) : undefined}
                  rowdata={!isBackEndPaginated('excessInvStoreTable') ? excessInventoryStoreData : null}
                  {...(props.inventorysmartScreenConfigForInfiniteScrolling?.includes(
                    "REIStoreView"
                  )
                    ? {
                      pagination: false,
                      rowModelType: isBackEndPaginated('excessInvStoreTable') && "infinite",
                      cacheOverflowSize: 2,
                      hideSelectCurrentPageRecords: true,
                    }
                    : {
                      rowModelType: isBackEndPaginated('excessInvStoreTable') && "serverSide",
                      serverSideStoreType: isBackEndPaginated('excessInvStoreTable') && "partial",
                    })}
                  cacheBlockSize={10}
                  columns={excessInvStoreViewColumns}
                  uniqueRowId={"key"}
                  downloadAsExcel={isBackEndPaginated('excessInvStoreTable') ? false : true}
                />
              </div>
            </Loader>
            }
          {sizeTableRender &&
            <Loader loader={sizeViewLoader}>
              <div className={globalClasses.marginVertical1rem}>
                <Typography variant="h5">Size View</Typography>
                {isBackEndPaginated('excessInvSizeTable') && (
                  <DownloadReport
                    screenName={"excess_inv_size_level"}
                    requestBody={sizeRequestBody}
                    disable={enableSizeViewDownload}
                    columns={excessInvSizeViewColumns}
                  />
                )}
                <AgGridComponent
                  loadTableInstance={loadExcessInvSizeInstance}
                  manualCallBack={isBackEndPaginated('excessInvSizeTable') ? (body, pageIndex) => manualCallBackExcessInvSizeView(body, pageIndex) : undefined}
                  rowdata={!isBackEndPaginated('excessInvSizeTable') ? excessInventorySizeData : null}
                  {...(props.inventorysmartScreenConfigForInfiniteScrolling?.includes(
                    "REISizeView"
                  )
                    ? {
                      pagination: false,
                      rowModelType: isBackEndPaginated('excessInvSizeTable') && "infinite",
                      cacheOverflowSize: 2,
                      hideSelectCurrentPageRecords: true,
                    }
                    : {
                      rowModelType: isBackEndPaginated('excessInvSizeTable') && "serverSide",
                      serverSideStoreType: isBackEndPaginated('excessInvSizeTable') && "partial",
                    })}
                  cacheBlockSize={10}
                  columns={excessInvSizeViewColumns}
                  uniqueRowId={"key"}
                  downloadAsExcel={isBackEndPaginated('excessInvSizeTable') ? false : true}
                />
              </div>
            </Loader>
            }
          </div>
        )}
    </div>
  );
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
  };
};

export default connect("", mapDispatchToProps)(ExcessInventoryTableComponent);
