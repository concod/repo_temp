import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";

import { Typography } from "@mui/material";
import { makeStyles } from "@mui/styles";
import { isEmpty } from "lodash";

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

const useStyles = makeStyles(() => ({
  fiscalWeekContainer: {
    width: "20%",
    marginBottom: "1rem",
  },
}));

const ExcessInventoryTableComponent = (props) => {
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
  const [enableDownload, setEnableDownload] = useState(false);
  const [excessInvStoreViewColumns, setExcessInvStoreViewColumns] = useState(
    []
  );
  const [excessInvSizeViewColumns, setExcessInvSizeViewColumns] = useState([]);
  const [enableStoreViewDownload, setEnableStoreViewDownload] = useState(true);
  const [enableSizeViewDownload, setEnableSizeViewDownload] = useState(true);

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
      props.setExcessInventoryTableLoader(true);
      try {
        let excessInvColDef = await getColumnsAg(
          "table_name=inventorysmart_excess_inv_list"
        )();
        setExcessInventoryTableConfig(excessInvColDef);
        if (dynamicLabelsBasedOnTenant("article") === "Material") {
          let excessInvStoreCols = await getColumnsAg(
            "table_name=inventorysmart_excess_inv_store_list"
          )();
          setExcessInvStoreViewColumns(excessInvStoreCols);
          let excessInvSizeCols = await getColumnsAg(
            "table_name=inventorysmart_excess_inv_size_list"
          )();
          setExcessInvSizeViewColumns(excessInvSizeCols);
        }
        props.setExcessInventoryTableLoader(false);
      } catch (e) {
        props.setExcessInventoryTableLoader(false);
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

  const handleChangeFiscalWeekValue = (updatedFormData) => {
    setExcessInventoryFiscalWeek(updatedFormData);
    fiscalWeekRef.current = updatedFormData;
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
    let selectedFiscalWeek = fiscalWeekRef.current.fiscal_week.split("-");
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
      props.setExcessInventoryTableLoader(true);
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
        props.setExcessInventoryTableLoader(false);
        return {
          data: response.data?.data,
          totalCount: response.data?.total,
        };
      } catch (e) {
        setEnableDownload(false);
        props.setExcessInventoryTableLoader(false);
        props.displaySnack(ERROR_MESSAGE, "error");
        return {
          data: [],
          totalCount: 0,
        };
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
      props.setExcessInventoryTableLoader(true);
      let body = setManualCallBackRequestBody(
        manualbody,
        pageIndex,
        storeOffsetValues
      );
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
        props.setExcessInventoryTableLoader(false);
        return {
          data: response.data?.data,
          totalCount: response.data?.total,
        };
      } catch (e) {
        setEnableStoreViewDownload(true);
        props.setExcessInventoryTableLoader(false);
        props.displaySnack(ERROR_MESSAGE, "error");
        return {
          data: [],
          totalCount: 0,
        };
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
      props.setExcessInventoryTableLoader(true);
      let body = setManualCallBackRequestBody(
        manualbody,
        pageIndex,
        sizeOffsetValues
      );
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
        props.setExcessInventoryTableLoader(false);
        return {
          data: response.data?.data,
          totalCount: response.data?.total,
        };
      } catch (e) {
        setEnableSizeViewDownload(true);
        props.setExcessInventoryTableLoader(false);
        props.displaySnack(ERROR_MESSAGE, "error");
        return {
          data: [],
          totalCount: 0,
        };
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
        ></Form>
      </div>
      <Typography variant="h5">
        {`${dynamicLabelsBasedOnTenant("article")} View`}{" "}
      </Typography>
      <DownloadReport
        screenName={"excess_inventory"}
        requestBody={requestBody}
        disable={!enableDownload}
      ></DownloadReport>
      <AgGridComponent
        columns={excessInventoryTableConfig}
        manualCallBack={(body, pageIndex) => manualCallBack(body, pageIndex)}
        rowModelType="serverSide"
        serverSideStoreType="partial"
        cacheBlockSize={10}
        uniqueRowId={"key"}
        loadTableInstance={loadAggridTableInstance}
      />
      {props.inventorysmartScreenConfig?.inventorysmart_allocation_report
        ?.drillDown?.showReportSplitView && (
        <div>
          <div className={globalClasses.marginVertical1rem}>
            <Typography variant="h5">Store View</Typography>
            <DownloadReport
              screenName={"excess_inv_store_level"}
              requestBody={requestBody}
              disable={enableStoreViewDownload}
            ></DownloadReport>
            <AgGridComponent
              loadTableInstance={loadExcessInvStoreInstance}
              manualCallBack={(body, pageIndex) =>
                manualCallBackExcessInvStoreView(body, pageIndex)
              }
              rowModelType="serverSide"
              serverSideStoreType="partial"
              cacheBlockSize={10}
              columns={excessInvStoreViewColumns}
              uniqueRowId={"key"}
            />
          </div>
          <div className={globalClasses.marginVertical1rem}>
            <Typography variant="h5">Size View</Typography>
            <DownloadReport
              screenName={"excess_inv_size_level"}
              requestBody={requestBody}
              disable={enableSizeViewDownload}
            ></DownloadReport>
            <AgGridComponent
              loadTableInstance={loadExcessInvSizeInstance}
              manualCallBack={(body, pageIndex) =>
                manualCallBackExcessInvSizeView(body, pageIndex)
              }
              rowModelType="serverSide"
              serverSideStoreType="partial"
              cacheBlockSize={10}
              columns={excessInvSizeViewColumns}
              uniqueRowId={"key"}
            />
          </div>
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
