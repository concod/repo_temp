import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";

import { Typography } from "@mui/material";
import { makeStyles } from "@mui/styles";

import Form from "core/Utils/form";
import AgGridComponent from "core/Utils/agGrid";
import globalStyles from "core/Styles/globalStyles";
import { addSnack } from "core/actions/snackbarActions";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";

import DownloadReport from "../report-download";
import {
  setLostSalesTableData,
  getLostSalesTableData,
  setLostSalesDataLoader,
  getLostSalesStoreTableData,
  getLostSalesSizeTableData,
} from "../../../services-inventorysmart/Allocation-Reports/lost-sales-service";
import {
  ERROR_MESSAGE,
  LOST_SALES_FISCAL_WEEK,
} from "../../../constants-inventorysmart/stringConstants";
import { isEmpty } from "lodash";

const LostSalesTableViewComponent = (props) => {
  const [lostSalesTableConfig, setLostSalesTableConfig] = useState([]);
  const [lostSalesFiscalWeek, setLostSalesFiscalWeek] = useState({
    fiscal_week: "",
  });
  const [lostSalesFiscalWeeks, setLostSalesFiscalWeeks] = useState([]);
  const [requestBody, setRequestBody] = useState([]);
  const [fiscalWeekLostSaleDetails, setFiscalWeekLostSaleDetails] = useState({
    units: "",
    revenue: "",
  });
  const [enableLostSalesDownload, setEnableLostSalesDownload] = useState(true);
  const [lostSalesStoreViewColumns, setLostSalesStoreViewColumns] = useState(
    []
  );
  const [lostSalesSizeViewColumns, setLostSalesSizeViewColumns] = useState([]);
  const [
    enableLostSalesStoreViewDownload,
    setEnableLostSalesStoreViewDownload,
  ] = useState(true);
  const [enableLostSalesSizeViewDownload, setEnableLostSalesSizeViewDownload] =
    useState(true);

  const filterConfig = useRef({});
  const lostSalesTableInstance = useRef({});
  const lostSalesFiscalWeeksRef = useRef({});
  const lostSalesFiscalWeekValRef = useRef({});
  const lostSalesStoreViewTableInstance = useRef({});
  const lostSalesSizeViewTableInstance = useRef({});
  const offsetValues = useRef({});
  const storeOffsetValues = useRef({});
  const sizeOffsetValues = useRef({});

  const useStyles = makeStyles(() => ({
    fiscalWeekContainer: {
      width: "20%",
      marginBottom: "1rem",
    },
  }));

  const globalClasses = globalStyles();
  const classes = useStyles();

  useEffect(() => {
    (async () => {
      props.setLostSalesDataLoader(true);
      try {
        let lostSalesColDef = await getColumnsAg(
          "table_name=inventory_loss_sales_list"
        )();
        setLostSalesTableConfig(lostSalesColDef);
        if (dynamicLabelsBasedOnTenant("article") === "Material") {
          let lostSalesStoreCols = await getColumnsAg(
            "table_name=inventorysmart_lost_sales_store_list"
          )();
          setLostSalesStoreViewColumns(lostSalesStoreCols);
          let lostSalesSizeCols = await getColumnsAg(
            "table_name=inventorysmart_lost_sales_size_list"
          )();
          setLostSalesSizeViewColumns(lostSalesSizeCols);
        }
        props.setLostSalesDataLoader(false);
      } catch (e) {
        props.setLostSalesDataLoader(false);
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    })();
  }, []);

  useEffect(() => {
    if (lostSalesFiscalWeeks?.length) {
      lostSalesFiscalWeeksRef.current = lostSalesFiscalWeeks;
    }
    lostSalesTableInstance.current?.api?.refreshServerSideStore({
      purge: true,
    });
  }, [lostSalesFiscalWeeks]);

  useEffect(() => {
    if (lostSalesFiscalWeek?.fiscal_week) {
      lostSalesFiscalWeekValRef.current = lostSalesFiscalWeek;
    }
    // to refresh the table if there is no data for the filters selected
    lostSalesTableInstance.current?.api?.refreshServerSideStore({
      purge: true,
    });
    if (
      props.inventorysmartScreenConfig?.inventorysmart_allocation_report
        ?.drillDown?.showReportSplitView
    ) {
      lostSalesStoreViewTableInstance.current?.api?.refreshServerSideStore({
        purge: true,
      });
      lostSalesSizeViewTableInstance.current?.api?.refreshServerSideStore({
        purge: true,
      });
    }
  }, [lostSalesFiscalWeek]);

  useEffect(() => {
    if (!isEmpty(props.selectedFilters)) {
      filterConfig.current = props.selectedFilters;
      if (props.hideGraphComponent) {
        let selectedWeeks = [];
        for (
          let week = props.selectedDates?.fiscalInfoStartDate?.fiscal_year_week;
          week <= props.selectedDates?.fiscalInfoEndDate?.fiscal_year_week;
          week++
        ) {
          selectedWeeks.push(week);
        }
        setLostSalesFiscalWeeks([...selectedWeeks]);
      }
    }
  }, [props.selectedFilters]);

  useEffect(() => {
    if (props.weeksAvailable?.length) {
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
      setFiscalWeekLostSaleDetails({
        ...fiscalWeekLostSaleDetails,
        units: lastFiscalWeek.lost_units,
        revenue: lastFiscalWeek.lost_sales,
      });
      let defaultSelectedYearVal = `${lastFiscalWeek.fiscal_week}-${lastFiscalWeek.fiscal_year}`;
      setLostSalesFiscalWeek({ fiscal_week: defaultSelectedYearVal });
    } else {
      setFiscalWeekLostSaleDetails({ units: "", revenue: "" });
      setLostSalesFiscalWeek({ fiscal_week: "" });
      LOST_SALES_FISCAL_WEEK[0].options = [];
    }
  }, [props.weeksAvailable]);

  const handleChangeFiscalWeekValue = (updatedFormData) => {
    setLostSalesFiscalWeek(updatedFormData);
    // To populate the lost sales summary details
    // fetching the lost sales details based on selected fiscal week and year
    if (props.weeksAvailable.length) {
      let selectedFiscalYear = updatedFormData.fiscal_week.split("-");
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
          units: filteredFiscalYearDetails[0].lost_units,
          revenue: filteredFiscalYearDetails[0].lost_sales,
        });
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

  const loadLostSalesStoreInstance = (params) => {
    lostSalesStoreViewTableInstance.current = params;
  };

  const loadLostSalesSizeInstance = (params) => {
    lostSalesSizeViewTableInstance.current = params;
  };

  const setManualCallBackRequestBody = (manualbody, pageIndex, offsetType) => {
    let selectedFiscalWeek =
      lostSalesFiscalWeekValRef.current?.fiscal_week?.split("-");
    let limit =
      Object.keys(offsetType.current)?.length > 0 && pageIndex !== 0
        ? { limit: 10, page: pageIndex + 1, ...offsetType.current }
        : { limit: 10, page: pageIndex + 1 };
    return {
      filters: filterConfig.current,
      week: selectedFiscalWeek?.[0],
      year: selectedFiscalWeek?.[1],
      meta: {
        ...manualbody,
        limit,
      },
    };
  };

  const manualCallBackLostSales = async (manualbody, pageIndex) => {
    props.setLostSalesDataLoader(true);
    let selectedFiscalWeek;
    let body;
    if (props.hideGraphComponent) {
      selectedFiscalWeek = lostSalesFiscalWeeksRef.current;
      if (isEmpty(selectedFiscalWeek)) {
        return {
          data: [],
          totalCount: 0,
        };
      } else {
        body = {
          meta: {
            ...manualbody,
            limit: { limit: 10, page: pageIndex + 1 },
          },
          filters: filterConfig.current,
          fiscal_year_week: selectedFiscalWeek,
        };
      }
    } else {
      if (isEmpty(lostSalesFiscalWeekValRef.current)) {
        return {
          data: [],
          totalCount: 0,
        };
      } else {
        body = setManualCallBackRequestBody(
          manualbody,
          pageIndex,
          offsetValues
        );
      }
    }
    try {
      setRequestBody(body);
      let response = await props.getLostSalesTableData(body);
      props.setLostSalesTableData(response.data?.data);
      if (pageIndex == 0) {
        if (response.data?.data?.length) setEnableLostSalesDownload(false);
        else setEnableLostSalesDownload(true);
      }
      offsetValues.current = {
        offset: response.data?.offset,
        sub_offset: response.data?.sub_offset,
      };
      props.setLostSalesDataLoader(false);
      return {
        data: response.data?.data,
        totalCount: response.data?.total,
      };
    } catch (e) {
      setEnableLostSalesDownload(true);
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setLostSalesDataLoader(false);
      return {
        data: [],
        totalCount: 0,
      };
    }
  };

  const manualCallBackLostSalesStoreView = async (manualbody, pageIndex) => {
    props.setLostSalesDataLoader(true);
    let body;
    if (isEmpty(lostSalesFiscalWeekValRef.current)) {
      return {
        data: [],
        totalCount: 0,
      };
    } else {
      body = setManualCallBackRequestBody(
        manualbody,
        pageIndex,
        storeOffsetValues
      );
    }
    try {
      let response = await props.getLostSalesStoreTableData(body);
      if (pageIndex == 0) {
        if (response.data?.data?.length)
          setEnableLostSalesStoreViewDownload(false);
        else setEnableLostSalesStoreViewDownload(true);
      }
      storeOffsetValues.current = {
        offset: response.data?.offset,
        sub_offset: response.data?.sub_offset,
      };
      props.setLostSalesDataLoader(false);
      return {
        data: response.data?.data,
        totalCount: response.data?.total,
      };
    } catch (e) {
      setEnableLostSalesStoreViewDownload(true);
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setLostSalesDataLoader(false);
      return {
        data: [],
        totalCount: 0,
      };
    }
  };

  const manualCallBackLostSalesSizeView = async (manualbody, pageIndex) => {
    props.setLostSalesDataLoader(true);
    let body;
    if (isEmpty(lostSalesFiscalWeekValRef.current)) {
      return {
        data: [],
        totalCount: 0,
      };
    } else {
      body = setManualCallBackRequestBody(
        manualbody,
        pageIndex,
        sizeOffsetValues
      );
    }
    try {
      let response = await props.getLostSalesSizeTableData(body);
      if (pageIndex == 0) {
        if (response.data?.data?.length)
          setEnableLostSalesSizeViewDownload(false);
        else setEnableLostSalesSizeViewDownload(true);
      }
      sizeOffsetValues.current = {
        offset: response.data?.offset,
        sub_offset: response.data?.sub_offset,
      };
      props.setLostSalesDataLoader(false);
      return {
        data: response.data?.data,
        totalCount: response.data?.total,
      };
    } catch (e) {
      setEnableLostSalesSizeViewDownload(true);
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setLostSalesDataLoader(false);
      return {
        data: [],
        totalCount: 0,
      };
    }
  };

  return (
    <div>
      <div>
        <Typography variant="h5" className={globalClasses.paddingVertical}>
          Lost Sales - Detailed View
        </Typography>
        {!props.hideGraphComponent && (
          <Typography variant="h5" className={globalClasses.paddingVertical}>
            Lost Sales Unit: {fiscalWeekLostSaleDetails.units}, Lost Sales
            Revenue: {`$ ${fiscalWeekLostSaleDetails.revenue}`}
          </Typography>
        )}
      </div>

      {!props.hideGraphComponent && (
        <div className={classes.fiscalWeekContainer}>
          <Form
            layout={"vertical"}
            maxFieldsInRow={1}
            handleChange={handleChangeFiscalWeekValue}
            fields={LOST_SALES_FISCAL_WEEK}
            updateDefaultValue={false}
            defaultValues={lostSalesFiscalWeek}
            labelWidthSpan={2}
            fieldTypeWidthSpan={2}
          ></Form>
        </div>
      )}
      <Typography variant="h5">
        {`${dynamicLabelsBasedOnTenant("article")} View`}{" "}
      </Typography>
      <DownloadReport
        screenName={"loss_sales"}
        requestBody={requestBody}
        disable={enableLostSalesDownload}
      ></DownloadReport>
      <AgGridComponent
        loadTableInstance={loadLostSalesInstance}
        manualCallBack={(body, pageIndex) =>
          manualCallBackLostSales(body, pageIndex)
        }
        rowModelType="serverSide"
        serverSideStoreType="partial"
        cacheBlockSize={10}
        columns={lostSalesTableConfig}
        uniqueRowId={"key"}
      />
      {/* Store and size level distribution is to be displayed in RL */}
      {props.inventorysmartScreenConfig?.inventorysmart_allocation_report
        ?.drillDown?.showReportSplitView && (
        <div>
          <div className={globalClasses.marginVertical1rem}>
            <Typography variant="h5">Store View</Typography>
            <DownloadReport
              screenName={"loss_sales_store_level"}
              requestBody={requestBody}
              disable={enableLostSalesStoreViewDownload}
            ></DownloadReport>
            <AgGridComponent
              loadTableInstance={loadLostSalesStoreInstance}
              manualCallBack={(body, pageIndex) =>
                manualCallBackLostSalesStoreView(body, pageIndex)
              }
              rowModelType="serverSide"
              serverSideStoreType="partial"
              cacheBlockSize={10}
              columns={lostSalesStoreViewColumns}
              uniqueRowId={"key"}
            />
          </div>
          <div className={globalClasses.marginVertical1rem}>
            <Typography variant="h5">Size View</Typography>
            <DownloadReport
              screenName={"loss_sales_size_level"}
              requestBody={requestBody}
              disable={enableLostSalesSizeViewDownload}
            ></DownloadReport>
            <AgGridComponent
              loadTableInstance={loadLostSalesSizeInstance}
              manualCallBack={(body, pageIndex) =>
                manualCallBackLostSalesSizeView(body, pageIndex)
              }
              rowModelType="serverSide"
              serverSideStoreType="partial"
              cacheBlockSize={10}
              columns={lostSalesSizeViewColumns}
              uniqueRowId={"key"}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
    selectedFilters:
      inventorysmartReducer.inventorySmartLostSalesService?.selectedFilters,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    getLostSalesTableData: (body) => dispatch(getLostSalesTableData(body)),
    setLostSalesTableData: (body) => dispatch(setLostSalesTableData(body)),
    setLostSalesDataLoader: (body) => dispatch(setLostSalesDataLoader(body)),
    getLostSalesStoreTableData: (body) =>
      dispatch(getLostSalesStoreTableData(body)),
    getLostSalesSizeTableData: (body) =>
      dispatch(getLostSalesSizeTableData(body)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(LostSalesTableViewComponent);
