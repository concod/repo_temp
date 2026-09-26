import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import Loader from "core/Utils/Loader/loader";
import { cloneDeep, isEmpty } from "lodash";
import makeStyles from "@mui/styles/makeStyles";
import { Button, Typography } from "@mui/material";
import moment from "moment";
import { 
  GET_FORECAST_VARIANCE_TABLE_DATA, 
  GET_FORECAST_VARIANCE_TOTAL_LINE,
  FORECAST_UNIT_AGGREGATE_LIST } from "modules/inventorysmart/constants-inventorysmart/apiConstants";

import Form from "core/Utils/form";
import AgGridComponent from "core/Utils/agGrid";
import globalStyles from "core/Styles/globalStyles";
import { getColumnsAg } from "core/actions/tableColumnActions";
import {
  appendExcelDownloadData,
  fetchFilterChipsToDownload,
  prependExtraData,
} from "core/Utils/agGrid/table-functions";
import { formatStringDate } from "core/Utils/functions/utils";

import {
  getForecastVarianceTableData,
  setForecastVarianceTableLoader,
  setForecastVarianceTableData,
  setForecastVarianceColDef,
  getForecastVarianceTotalLine,
  setForecastVarianceTotalLine,
  setForecastVarianceAggregateColDef,
} from "../../../services-inventorysmart/Allocation-Reports/variance-in-forecast-service";
import {
  ERROR_MESSAGE,
  FORECASTING_PERCENTAGE,
  FORECAST_THRESHOLD_VALIDATION_MSG,
} from "../../../constants-inventorysmart/stringConstants";
import { updateFontSizeOnToolPanel } from "core/Utils/agGrid/table-functions";
import { toLocalizedDateString } from "react-dates";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";

const useStyles = makeStyles(() => ({
  flexRow: {
    display: "flex",
    marginBottom: "1rem",
  },
  paperHeaderStyle: {
    padding: "1rem",
  },
  alignFormContainer: {
    display: "flex",
    alignItems: "center",
    "& .MuiGrid-root>.MuiGrid-item": {
      paddingTop: "10px",
    },
  },
  aggregatedTable: {
    paddingBottom: "1rem",
  },
}));

const ForecastVarianceTableComponent = (props) => {
  const [forecastVarianceReportColumn, setForecastVarianceReportColumn] =
    useState([]);
  const [forecastVarianceReportData, setForecastVarianceReportData] = useState(
    []
  );
  const [downloadFormatChipsDependency, setDownloadFormatChipsDependency] =
    useState({});
  const filterDependencyRef = useRef(null);
  const [forecastValueVar, setForecastValueVar] = useState({
    forecastValue: props.inventorysmartReportsGBQConfig?.value ? "0" : "5" ,
  });
  const [
    forecastVarianceReportAggregateColumn,
    setForecastVarianceReportAggregateColumn,
  ] = useState([]);
  const [forecastVarianceReportTotalData, setForecastVarianceReportTotalData] =
    useState([]);

  const [aggTableLoader, setAggTableLoader] = useState(false);
  const [ varienceReportLoader, setVarienceReportLoader] = useState(false);

  const globalClasses = globalStyles();
  const classes = useStyles();

  useEffect(() => {
    (async () => {
      try {
        setVarienceReportLoader(true);
        let col = await getColumnsAg(
          "table_name=inventorysmart_variance_to_forecast"
        )();
        props.setForecastVarianceColDef(col);
      } catch (e) {
        setVarienceReportLoader(false);
        props.displaySnackMessages(ERROR_MESSAGE, "error");
      }
    })();
    (async () => {
      try {
        setAggTableLoader(true);
        let col = await getColumnsAg(
          "table_name=inventorysmart_variance_to_forecast_aggregate"
        )();
        props.setForecastVarianceAggregateColDef(col);
      } catch (e) {
        setAggTableLoader(false);
        props.displaySnackMessages(ERROR_MESSAGE, "error");
      }
    })();
  }, []);

  useEffect(() => {
    if (!isEmpty(props.filterDependency)) {
      filterDependencyRef.current = {
        filters: props.filterDependency.filter(
          (item) => item.filter_id !== "fiscal_date_range"
        ),
        fiscalYear: props.filterDependency.filter(
          (item) => item.filter_id === "fiscal_date_range"
        )[0],
      };
      let modifyCustomFilterForDownload = fetchCustomFilterValue(
        filterDependencyRef.current.fiscalYear,
        "download"
      );
      let downloadFilters = [
        ...modifyCustomFilterForDownload,
        ...filterDependencyRef.current.filters,
      ];
      let filterChips = fetchFilterChipsToDownload(downloadFilters);
      setDownloadFormatChipsDependency(filterChips);
      fetchVarianceToForecastTableData();
      fetchVarianceToForecastTotalLine();
    }
  }, [props.filterDependency]);

  useEffect(() => {
    let varianceToForecastRows = [];
    varianceToForecastRows =
      props.forecastVarianceTableData &&
      props.forecastVarianceTableData?.map((item) => {
        return {
          ...item,
          varience_percentage: item.varience_percentage
            ? item.varience_percentage + "%"
            : 0,
          agg_accuracy: item.agg_accuracy ? item.agg_accuracy + "%" : 0,
        };
      });
    setForecastVarianceReportData(varianceToForecastRows);
  }, [props.forecastVarianceTableData]);

  useEffect(() => {
    if (props.forecastVarianceColDef.length > 0) {
      let cloneColValue = cloneDeep(props.forecastVarianceColDef);
      let styleColDef = cloneColValue.map((item) => {
        switch (item.column_name) {
          case "varience_percentage":
            return {
              ...item,
              cellStyle: (params) => cellStyleFunc(params),
            };
          case "agg_accuracy":
            return {
              ...item,
              cellStyle: (params) => aggAccuracyCellStyle(params),
            };
          default:
            return item;
        }
      });
      setForecastVarianceReportColumn(styleColDef);
    }
  }, [props.forecastVarianceColDef, props.tableFontSize]);

  useEffect(() => {
    let varianceToForecastRows = [];
    varianceToForecastRows =
      props.forecastVarianceTotalLine &&
      props.forecastVarianceTotalLine?.map((item) => {
        return {
          ...item,
          varience_percentage: (item.variance_percentage || item.varience_percentage )
            ? (item.variance_percentage || item.varience_percentage) + "%"
            : 0,
            agg_accuracy: item.agg_accuracy ? item.agg_accuracy + "%" : 0,
        };
      });
    setForecastVarianceReportTotalData(varianceToForecastRows);
  }, [props.forecastVarianceTotalLine]);

  useEffect(() => {
    if (props.forecastVarianceAggregateColDef.length > 0) {
      let cloneColValue = cloneDeep(props.forecastVarianceAggregateColDef);
      let styleColDef = cloneColValue.map((item) => {
        switch (item.column_name) {
          case "varience_percentage":
            return {
              ...item,
              cellStyle: (params) => cellStyleFunc(params),
            };
          case "agg_accuracy":
            return {
              ...item,
              cellStyle: (params) => aggAccuracyCellStyle(params),
            };
          default:
            return item;
        }
      });
      setForecastVarianceReportAggregateColumn(styleColDef);
    }
  }, [props.forecastVarianceAggregateColDef, props.tableFontSize]);

  /***
   * Function to return the fiscalYearWeek as an array of values to table payload and return start date - end date for download
   * date : Object (fiscal_date_range filter)
   * type : String (to determine the return type)
   */
  const fetchCustomFilterValue = (date, type) => {
    if (type === "download") {
      const startDate = formatStringDate(
        date?.values?.fiscalInfoStartDate?.calendar_week_start_date,
        true,
        false,
        "MM-DD-YYYY"
      );
      const endDate = formatStringDate(
        date?.values?.fiscalInfoEndDate?.calendar_week_start_date,
        true,
        true,
        "MM-DD-YYYY"
      )
        .endOf("week")
        .format("MM-DD-YYYY");
      const dateRange = `${startDate} - ${endDate}`;
      return [
        {
          ...date,
          values: [dateRange],
        },
      ];
    } else {
      let max = date?.values?.fiscalInfoEndDate?.fiscal_year_week;
      let min = date?.values?.fiscalInfoStartDate?.fiscal_year_week;
      let range ;
      //if start and end date are of diffrent years
      if(Math.floor(min/100)!==Math.floor(max/100)){
        range = [];
        let week = min;
        for (let i = min % 100; i <= 53; i++) {
          range.push(week);
          week++;
        }
        let start = max - (max % 100) + 1;
        for (
          let fiscalWeek = start;
          fiscalWeek <= max;
          fiscalWeek++
        ) {
          range.push(fiscalWeek);
        }
        return range
      }
      
      else if(min && max)
      {
        
        return (range = [...Array(max - min + 1).keys()].map((i) => i + min));
      } 
      else{
        return []
      }
    
  };}

  const cellStyleFunc = (params) => {
    const fonts = updateFontSizeOnToolPanel(props.tableFontSize);
    const forecastTypeKey = params?.data?.bias_type;
    if (forecastTypeKey === "Under Forecast") {
      return { color: "red", fontSize: fonts };
    } else if (forecastTypeKey === "Over Forecast") {
      return { color: "green", fontSize: fonts };
    } else return { color: "black", fontSize: fonts };
  };

  const aggAccuracyCellStyle = (params) => {
    const fonts = updateFontSizeOnToolPanel(props.tableFontSize);
    const value = parseFloat(params.value?.replace("%", ""));
    if (value < 50) {
      return { color: "red", fontSize: fonts }; // Red color for values less than 50%
    }
    return { color: "green", fontSize: fonts }; // Green color for values 50% and above
  };

  const fetchVarianceToForecastTableData = async () => {
    if (!forecastValueVar.forecastValue) {
      props.displaySnackMessages(FORECAST_THRESHOLD_VALIDATION_MSG, "error");
    } else {
      try {
        setVarienceReportLoader(true);
        let fiscalYearValue = filterDependencyRef.current.fiscalYear;
        const range = fetchCustomFilterValue(fiscalYearValue);
        let body = {
          filters: filterDependencyRef.current.filters, // filters without fiscal calendar
          fiscal_year_week: range,
          forecasting_threshold: Number(forecastValueVar.forecastValue),
        };
        let url = props.inventorysmartReportsGBQConfig?.value ? FORECAST_UNIT_AGGREGATE_LIST : GET_FORECAST_VARIANCE_TABLE_DATA
        let response = await props.getForecastVarianceTableData(url, body);
        props.setForecastVarianceTableData(response.data?.data);
        setVarienceReportLoader(false);
      } catch (e) {
        props.displaySnackMessages(ERROR_MESSAGE, "error");
        setVarienceReportLoader(false);
      }
    }
  };

  const fetchVarianceToForecastTotalLine = async () => {
    try {
      setAggTableLoader(true);
      let fiscalYearValue = filterDependencyRef.current.fiscalYear;
      const range = fetchCustomFilterValue(fiscalYearValue);
      let req = {
        filters: filterDependencyRef.current.filters, // filters without fiscal calendar
        fiscal_year_week: range,
        forecasting_threshold: Number(forecastValueVar.forecastValue),
        ...(props.inventorysmartReportsGBQConfig?.value && { agg: true})
      };
      let url = props.inventorysmartReportsGBQConfig?.value ? FORECAST_UNIT_AGGREGATE_LIST : GET_FORECAST_VARIANCE_TOTAL_LINE
      let response = await props.getForecastVarianceTotalLine(url,req);
      props.setForecastVarianceTotalLine(response.data?.data);
      setAggTableLoader(false);
    } catch (e) {
      props.displaySnackMessages(ERROR_MESSAGE, "error");
      setAggTableLoader(false);
    }
  };

  const handleChangeForecastThreshold = (value) => {
    setForecastValueVar(value);
  };

  const prependData = () => {
    if (!isEmpty(downloadFormatChipsDependency)) {
      let l_downloadFormatChipsDependency = cloneDeep(downloadFormatChipsDependency);
      l_downloadFormatChipsDependency.product.value = downloadFormatChipsDependency.product.value.map((str)=> replaceSpecialCharacter(str ));
      let prependContentReq = prependExtraData(l_downloadFormatChipsDependency);
      if (props?.inventorysmartReportsGBQConfig?.value) {
        prependContentReq = prependContentReq.filter((ele) => {
          if (ele[0].value == "CUSTOM" || ele[0].value == "User id:") {
            if (ele[0].value == "CUSTOM") {
              ele[0].value = "Date Filter"
            }
            return ele;
          }
        })
      }
      return appendExcelDownloadData(prependContentReq);
    }
  };

  const displayForecastThresholdComponent = ()=>{
    return (
      <div className={classes.flexRow}>
        <Typography variant="h5" className={classes.paperHeaderStyle}>
          Forecasting threshold:
        </Typography>
        <div className={classes.alignFormContainer}>
          <Form
            layout={"vertical"}
            maxFieldsInRow={1}
            handleChange={handleChangeForecastThreshold}
            fields={FORECASTING_PERCENTAGE}
            updateDefaultValue={false}
            defaultValues={forecastValueVar}
            labelWidthSpan={2}
            fieldTypeWidthSpan={3}
          ></Form>
        </div>
        <Button
          color="primary"
          variant="text"
          onClick={() => {fetchVarianceToForecastTableData()}}
        >
          Apply
        </Button>
      </div>
    )
  }

  return (
    <div className={globalClasses.marginVertical1rem}>
      {/* displaying threshold input on top for RL */}
      {!props.inventorysmartReportsGBQConfig?.value && displayForecastThresholdComponent()}

      <div className={classes.aggregatedTable}>
        <Loader loader={aggTableLoader}>
          <AgGridComponent 
            rowdata={forecastVarianceReportTotalData}
            columns={forecastVarianceReportAggregateColumn}
            uniqueRowId={"key"}
            pagination={false}
            {...(!props.inventorysmartReportsGBQConfig?.value && {
              sideBar:'false'
            })}
          />
        </Loader>
      </div>
      
      {/* displaying threshold input below Agg table for MNS */}
      {props.inventorysmartReportsGBQConfig?.value && displayForecastThresholdComponent()}

      <Loader loader={varienceReportLoader}>
        <AgGridComponent
          rowdata={forecastVarianceReportData}
          columns={forecastVarianceReportColumn}
          uniqueRowId={"key"}
          {...(props?.inventorysmartReportsGBQConfig?.value && {paginationPageSize:20})}
          downloadAsExcel={true}
          disableExcelDownload={forecastVarianceReportData?.length ? false : true}
          toPrependContent={props.excelDownloadMetaData}
          prependedContentDetails={prependData()}
          pagination={
            !props.inventorysmartScreenConfigForInfiniteScrolling?.includes(
              "RVTF"
            )
          }
        />
      </Loader>
    </div>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer, tableReducer } = store;
  return {
    inventorysmartScreenConfigForInfiniteScrolling:
    store.inventorysmartReducer.inventorySmartCommonService
      .inventorysmartScreenConfigForInfiniteScrolling,
    excelDownloadMetaData:
      inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig?.excelDownloadMetaData,
    forecastVarianceTableData:
      inventorysmartReducer.inventorySmartForecastVarianceReportService
        .forecastVarianceTableData,
    forecastVarianceColDef:
      inventorysmartReducer.inventorySmartForecastVarianceReportService
        .forecastVarianceColDef,
    tableFontSize: tableReducer.fontSize,
    forecastVarianceTotalLine:
      inventorysmartReducer.inventorySmartForecastVarianceReportService
        .forecastVarianceTotalLine,
    forecastVarianceAggregateColDef:
      inventorysmartReducer.inventorySmartForecastVarianceReportService
        .forecastVarianceAggregateColDef,
    inventorysmartReportsGBQConfig:
      inventorysmartReducer.inventorySmartCommonService
        .inventorysmartReportsGBQConfig
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    getForecastVarianceTableData: (url,body) =>
      dispatch(getForecastVarianceTableData(url,body)),
    setForecastVarianceTableLoader: (body) =>
      dispatch(setForecastVarianceTableLoader(body)),
    setForecastVarianceTableData: (body) =>
      dispatch(setForecastVarianceTableData(body)),
    setForecastVarianceColDef: (body) =>
      dispatch(setForecastVarianceColDef(body)),
    setForecastVarianceAggregateColDef: (body) =>
      dispatch(setForecastVarianceAggregateColDef(body)),
    getForecastVarianceTotalLine: (url, body) =>
      dispatch(getForecastVarianceTotalLine(url, body)),
    setForecastVarianceTotalLine: (body) =>
      dispatch(setForecastVarianceTotalLine(body)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ForecastVarianceTableComponent);
