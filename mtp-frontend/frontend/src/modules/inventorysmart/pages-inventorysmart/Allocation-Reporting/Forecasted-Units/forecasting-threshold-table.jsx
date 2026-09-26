import React, { useState, useEffect, useRef } from "react";

import { Typography, Button } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import moment from "moment";

import AgGridComponent from "core/Utils/agGrid";
import globalStyles from "core/Styles/globalStyles";
import Form from "core/Utils/form";
import { getColumnsAg } from "core/actions/tableColumnActions";

import {
  ERROR_MESSAGE,
  UNDER_FORECASTING_PERCENTAGE,
  OVER_FORECASTING_PERCENTAGE,
} from "../../../constants-inventorysmart/stringConstants";
import { isEmpty } from "lodash";
import DownloadReport from "../report-download";

const useStyles = makeStyles(() => ({
  tableContainerWidth: {
    width: "48%",
  },
  flexRow: {
    display: "flex",
    marginBottom: "1rem",
  },
  paperHeaderStyle: {
    padding: "1rem",
  },
  alignFormContainer: {
    display: "flex",
    width: "25%",
    alignItems: "center",
    "& .MuiGrid-root>.MuiGrid-item": {
      paddingTop: "10px",
    },
  },
}));

const ForecastedThresholdTables = (props) => {
  const [underForecastThresholdColumns, setUnderForecastThresholdColumns] =
    useState([]);
  const [overForecastThresholdColumns, setOverForecastThresholdColumns] =
    useState([]);
  const [overForecastValue, setOverForecastValue] = useState({
    overForecastValue: "20",
  });
  const [underForecastValue, setUnderForecastValue] = useState({
    underForecastValue: "20",
  });

  const [requestBody, setRequestBody] = useState({});
  const [enableUnderThresholdDownload, setEnableUnderThresholdDownload] =
    useState(true);
  const [enableOverThresholdDownload, setEnableOverThresholdDownload] =
    useState(true);

  const underForecastTableRef = useRef({});
  const overForecastTableRef = useRef({});
  const filterRef = useRef({});
  const overForecastRef = useRef(20);
  const underForecastRef = useRef(20);
  const forecastedUnitsCalendarRef = useRef({});

  const globalClasses = globalStyles();
  const classes = useStyles();

  useEffect(() => {
    (async () => {
      try {
        let col = await getColumnsAg(
          "table_name=inventory_forecast_threshold_report"
        )();
        setUnderForecastThresholdColumns(col);
        setOverForecastThresholdColumns(col);
      } catch (e) {
        props.setForecastedUnitsLoader(false);
        props.displaySnackMessages(ERROR_MESSAGE, "error");
      }
    })();
  }, []);

  useEffect(() => {
    if (!isEmpty(props.forecastedUnitsFilterDependency)) {
      filterRef.current = props.forecastedUnitsFilterDependency;
      overForecastTableRef.current?.api?.refreshServerSideStore({
        purge: true,
      });
      underForecastTableRef.current?.api?.refreshServerSideStore({
        purge: true,
      });
      overForecastRef.current = 20;
      underForecastRef.current = 20;
      forecastedUnitsCalendarRef.current =
        props.forecastedUnitsCalendar.rangePicker;
    }
  }, [props.forecastedUnitsFilterDependency, props.forecastedUnitsCalendar]);

  const handleChangeOverForecastThreshold = (value) => {
    setOverForecastValue(value);
    overForecastRef.current = value?.overForecastValue;
  };

  const handleChangeUnderForecastThreshold = (value) => {
    setUnderForecastValue(value);
    underForecastRef.current = value?.underForecastValue;
  };

  const onApply = (type) => {
    if (type === "under_threshold") {
      if (isEmpty(underForecastValue.underForecastValue))
        props.displaySnackMessages(
          "Under forecast threshold value cannot be empty",
          "error"
        );
      else {
        underForecastTableRef.current?.api?.refreshServerSideStore({
          purge: true,
        });
      }
    } else {
      if (isEmpty(overForecastValue.overForecastValue))
        props.displaySnackMessages(
          "Over forecast threshold value cannot be empty",
          "error"
        );
      else {
        overForecastTableRef.current?.api?.refreshServerSideStore({
          purge: true,
        });
      }
    }
  };

  const loadUnderForecastTableInstance = (params) => {
    underForecastTableRef.current = params;
  };

  const loadOverForecastTableInstance = (params) => {
    overForecastTableRef.current = params;
  };

  const manualCallBackUnderForecast = async (manualbody, pageIndex) => {
    props.setForecastedUnitsLoader(true);
    try {
      let filterDependency = filterRef.current.filter(
        (item) => item.attribute_name !== "range-picker"
      );
      let reqBody = {
        filters: filterDependency,
        start_date: forecastedUnitsCalendarRef.current[0],
        end_date: forecastedUnitsCalendarRef.current[1],
        over_threshold: Number(overForecastRef.current),
        under_threshold: Number(underForecastRef.current),
        meta: {
          ...manualbody,
          limit: { limit: 10, page: pageIndex + 1 },
        },
        ...(props.inventorysmartReportsGBQConfig?.value && {gbq_based: true})
      };
      setRequestBody(reqBody);
      let response = await props.getForecastedUnitsTableData(reqBody);
      props.setForecastedUnitsTableData(response.data?.data);
      if (pageIndex == 0) {
        if (response.data?.data?.under_forecast?.length)
          setEnableUnderThresholdDownload(false);
        else setEnableUnderThresholdDownload(true);
      }
      props.setForecastedUnitsLoader(false);
      return {
        data: response.data?.data?.under_forecast,
        totalCount: response.data.total,
      };
    } catch (e) {
      props.setForecastedUnitsLoader(false);
      setEnableUnderThresholdDownload(true);
      props.displaySnackMessages(ERROR_MESSAGE, "error");
      return {
        data: [],
        totalCount: 0,
      };
    }
  };

  const manualCallBackOverForecast = async (manualbody, pageIndex) => {
    props.setForecastedUnitsLoader(true);
    try {
      let filterDependency = filterRef.current.filter(
        (item) => item.attribute_name !== "range-picker"
      );
      let reqBody = {
        filters: filterDependency,
        start_date: forecastedUnitsCalendarRef.current[0],
        end_date: forecastedUnitsCalendarRef.current[1],
        over_threshold: Number(overForecastRef.current),
        under_threshold: Number(underForecastRef.current),
        meta: {
          ...manualbody,
          limit: { limit: 10, page: pageIndex + 1 },
        },
        ...(props.inventorysmartReportsGBQConfig?.value && {gbq_based: true})
      };
      setRequestBody(reqBody);
      let response = await props.getForecastedUnitsTableData(reqBody);
      props.setForecastedUnitsTableData(response.data?.data);
      if (pageIndex == 0) {
        if (response.data?.data?.over_forecast?.length)
          setEnableOverThresholdDownload(false);
        else setEnableOverThresholdDownload(true);
      }
      props.setForecastedUnitsLoader(false);
      return {
        data: response.data?.data?.over_forecast,
        totalCount: response.data.total,
      };
    } catch (e) {
      props.setForecastedUnitsLoader(false);
      setEnableOverThresholdDownload(true);
      props.displaySnackMessages(ERROR_MESSAGE, "error");
      return {
        data: [],
        totalCount: 0,
      };
    }
  };

  return (
    <div className={globalClasses.marginVertical1rem}>
      <div className={globalClasses.layoutAlignSpaceBetween}>
        <div className={classes.tableContainerWidth}>
          <div className={classes.flexRow}>
            <Typography variant="h5" className={classes.paperHeaderStyle}>
              Under forecasting threshold:
            </Typography>
            <div className={classes.alignFormContainer}>
              <Form
                layout={"vertical"}
                maxFieldsInRow={1}
                handleChange={handleChangeUnderForecastThreshold}
                fields={UNDER_FORECASTING_PERCENTAGE}
                updateDefaultValue={false}
                defaultValues={underForecastValue}
                labelWidthSpan={2}
                fieldTypeWidthSpan={3}
              ></Form>
              <div>
                <Button
                  color="primary"
                  variant="text"
                  onClick={() => onApply("under_threshold")}
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>
          <DownloadReport
            screenName={"under_forecast"}
            requestBody={requestBody}
            disable={enableUnderThresholdDownload}
            columns={underForecastThresholdColumns}
          ></DownloadReport>
          <AgGridComponent
            columns={underForecastThresholdColumns}
            uniqueRowId={"article"}
            loadTableInstance={loadUnderForecastTableInstance}
            manualCallBack={(body, pageIndex) =>
              manualCallBackUnderForecast(body, pageIndex)
            }
            rowModelType="serverSide"
            serverSideStoreType="partial"
            cacheBlockSize={10}
          />
        </div>
        <div className={classes.tableContainerWidth}>
          <div className={classes.flexRow}>
            <Typography variant="h5" className={classes.paperHeaderStyle}>
              Over forecasting threshold:
            </Typography>
            <div className={classes.alignFormContainer}>
              <Form
                layout={"vertical"}
                maxFieldsInRow={1}
                handleChange={handleChangeOverForecastThreshold}
                fields={OVER_FORECASTING_PERCENTAGE}
                updateDefaultValue={false}
                defaultValues={overForecastValue}
                labelWidthSpan={2}
                fieldTypeWidthSpan={3}
              ></Form>
              <Button
                color="primary"
                variant="text"
                onClick={() => onApply("over_threshold")}
              >
                Apply
              </Button>
            </div>
          </div>
          <DownloadReport
            screenName={"over_forecast"}
            requestBody={requestBody}
            disable={enableOverThresholdDownload}
            columns={overForecastThresholdColumns}
          ></DownloadReport>
          <AgGridComponent
            columns={overForecastThresholdColumns}
            uniqueRowId={"article"}
            loadTableInstance={loadOverForecastTableInstance}
            manualCallBack={(body, pageIndex) =>
              manualCallBackOverForecast(body, pageIndex)
            }
            rowModelType="serverSide"
            serverSideStoreType="partial"
            cacheBlockSize={10}
          />
        </div>
      </div>
    </div>
  );
};

export default ForecastedThresholdTables;
