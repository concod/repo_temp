import { makeStyles } from "@mui/styles";
import LoadingOverlay from "core/Utils/Loader/loader";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import React from "react";
import { useState } from "react";
import AgGridComponent from "core/Utils/agGrid";
import { useEffect } from "react";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { chartDataPayload } from "modules/ada/utils-ada/utilityFunctions";
import { useSelector } from "react-redux";
import {
  getDriverRankData,
  getDriverRankDataNew,
  getDriverSignificancetData,
} from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";
import { cloneDeep } from "lodash";
import Charts from "core/Utils/charts";

const DriverSummaryTable = ({ setChannels, activeKey, showDriversChart }) => {
  const classes = useStyles();

  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );

  const showDriverSignificance =
    adaReducer?.clientConfig?.attribute_value?.show_features
      ?.showDriverSignificance;

  const [driverForecastLoader, setDriverForecastLoader] = useState(true);
  const [columnData, setColumnData] = useState([]);
  const [rowdata, setRowdata] = useState([]);

  const getRankDataPayload = () => {
    let payload = chartDataPayload(adaReducer);
    const isDriverSignificanceAggregationWeek =
      adaReducer?.clientConfig?.attribute_value?.show_features
        ?.driver_sig_agg_week;
    if (isDriverSignificanceAggregationWeek) {
      payload.filters.aggregation_level = "W";
    }
    return payload;
  };

  useEffect(() => {
    const getRowData = async () => {
      try {
        setDriverForecastLoader(true);
        const getDriverRankDataFn = showDriverSignificance
          ? getDriverRankDataNew
          : getDriverRankData;

        let response = await getDriverRankDataFn(getRankDataPayload());
        let formattedResponse = response?.data?.data || {};

        let allChannels = [];
        if (showDriverSignificance) {
          allChannels = Object.keys(formattedResponse);
          formattedResponse = transformDriverData(formattedResponse);
        } else {
          allChannels = Object.keys(formattedResponse?.[0] || {})?.filter(
            (channel) => channel !== "driver"
          );
        }
        setChannels(allChannels);
        let updatedColumnConfig = cloneDeep(columnConfig);
        if (allChannels.length) {
          allChannels.forEach((channel) => {
            let channelColumn = cloneDeep(channelColumnConfig);
            channelColumn.column_name = channel;
            channelColumn.label = channel;
            updatedColumnConfig.push(channelColumn);
          });
        }

        const formattedColumnResponse = agGridColumnFormatter(
          updatedColumnConfig
        );

        formattedColumnResponse.forEach((col, i) => {
          if (i !== 0) {
            col.cellRenderer = (params) => {
              return <div>{params.value} %</div>;
            };
          }
        });
        setColumnData(formattedColumnResponse);

        setRowdata(formattedResponse);
      } catch (error) {
      } finally {
        setDriverForecastLoader(false);
      }
    };
    getRowData();
  }, [activeKey]);

  const transformDriverData = (apiResponse) => {
    const allChannels = Object.keys(apiResponse);
    const actualNameSet = new Map();

    // Collect all unique actual_name mapped to driver id
    allChannels.forEach((channel) => {
      apiResponse[channel].forEach(({ driver, actual_name }) => {
        actualNameSet.set(driver, actual_name);
      });
    });

    const allDrivers = Array.from(actualNameSet.keys());

    // Map driver to actual_name and collect channel-wise values
    const rowData = allDrivers.map((driver) => {
      const row = {
        driver: actualNameSet.get(driver), // use actual_name for display
      };

      allChannels.forEach((channel) => {
        const found = apiResponse[channel].find((d) => d.driver === driver);
        row[channel] = found ? found.value : null;
      });

      return row;
    });
    return rowData;
  };
  function getDonutChartData(input) {
    const segmentKeys = Object.keys(input[0]).filter((key) => key !== "driver");
    const colors = [
      "#69C9C2",
      "#F88D6A",
      "#EDC948",
      "#B39CD0",
      "#627BC1",
      "#8FCB81",
      "#FFB7C5",
      "#FFD166",
    ];

    return segmentKeys.map((segment, index) => {
      const data = input.map((item, i) => ({
        name: beautifyKey(item.driver),
        y: Number(item[segment] ?? 0),
        color: colors[i % colors.length],
      }));

      return {
        name: "Attributes",
        innerSize: "60%",
        showInLegend: true,
        data,
      };
    });
  }

  function beautifyKey(key) {
    return key
      .replace(/([A-Z])/g, " $1")
      .replace(/[_\-]+/g, " ")
      .trim()
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  }

  const updatedChartData = (seriesData, adaReducer) => {
    let timeline = adaReducer?.switchTimeLine?.[0]?.value;

    const chartOptions = {
      type: "pie",
      chartType: "donutChart",
      chartTitle: "",
      showToolTip: true,
      series: seriesData,
      isBudgetLabel: true,
    };

    const decimalConfigForChart =
      adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
        ?.decimalConfig?.chart;
    if (
      adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
        ?.numberFormatting?.enableCommaFormatting !== true
    ) {
      chartOptions.labelFormatter = `{point.y:.${decimalConfigForChart}f}`;
    }
    return chartOptions;
  };

  return (
    <>
      <LoadingOverlay
        loader={driverForecastLoader}
        isCustomLoader={true}
        minHeight="unset"
      >
        <div className={classes.driverForecastContainer}>
          <AgGridComponent
            hideTableFormat={true}
            tableHeader="Summary"
            uniqueRowId="driver"
            pagination={false}
            sizeColumnsToFitFlag
            minWidth={200}
            rowdata={rowdata}
            columns={columnData}
            showSearchModalBtn={false}
          />
          {showDriversChart && rowdata?.length && (
            <Charts
              options={updatedChartData(getDonutChartData(rowdata), adaReducer)}
            />
          )}
        </div>
      </LoadingOverlay>
    </>
  );
};

export default DriverSummaryTable;

const useStyles = makeStyles((theme) => ({
  driverForecastContainer: {
    // paddingTop: "30px",
    // display: "flex",
    // flexDirection: "column",
    // marginBottom: "12px",
  },
  customheader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    margin: "0.25rem 0 0.75rem",
  },
  panelContainer: {
    "& .panel-container": {
      top: `calc(${theme.customVariables.headerHeight} + 2rem)`,
    },
  },
}));

const channelColumnConfig = {
  column_name: "",
  label: "",
  is_frozen: false,
  is_hidden: false,
  is_editable: false,
  is_aggregated: false,

  type: "float",
  // order_of_display: 3,
  footer: "",
  is_row_span: false,
  formatter: "",
  is_searchable: false,
  sub_headers: [],
  is_lockable: false,
  formatter: "roundOfftoTwoDecimals",
  extra: { fullWidth: true, roundOffTo: 2 },
};

const columnConfig = [
  {
    column_name: "driver",
    label: "Driver",
    is_frozen: false,
    is_hidden: false,
    is_editable: false,
    is_aggregated: false,
    type: "str",
    // order_of_display: 3,
    footer: "",
    is_row_span: false,
    formatter: "",
    is_searchable: false,
    sub_headers: [],
    is_lockable: false,
  },
];
