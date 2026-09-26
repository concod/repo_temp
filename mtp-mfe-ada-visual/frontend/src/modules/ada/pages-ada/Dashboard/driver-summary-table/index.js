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
import TableIcon from "assets/impactv3/table.svg";
import ChartIcon from "assets/impactv3/chart.svg";
import { Button } from "impact-ui-v3";
import { Tooltip } from "impact-ui-v3";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";

const DriverSummaryTable = ({
  channels,
  setChannels,
  activeKey,
  showDriversChart,
}) => {
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
  const [isChart, setIsChart] = useState({});

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
            // set state to toggle b/w graph/chart
            setIsChart((prev) => ({ ...prev, [channel]: true }));

            // update column config
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
  function getDonutChartData(input, channel) {
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
    const data = input.map((item, i) => ({
      name: beautifyKey(item.driver),
      y: Number(item[channel] ?? 0),
      color: colors[i % colors.length],
    }));
    return [
      {
        name: "Attributes",
        innerSize: "60%",
        showInLegend: true,
        data,
      },
    ];
  }

  function beautifyKey(key) {
    key = replaceSpecialCharacter(key);
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

    seriesData[0] = {
      ...seriesData[0],
      dataLabels: {
        enabled: true,
        format: "{point.name}",
        color: "#60697d", // label text color
        style: {
          fontSize: "14px", // font size
          fontWeight: "500", // font weight
        },
      },
    };
    const chartOptions = {
      type: "pie",
      chartType: "donutChart",
      chartTitle: "",
      series: seriesData,
      isBudgetLabel: true,
      legend: {
        enabled: false,
      },
      exporting: {
        enabled: false,
      },
      tooltip: {
        enabled: true,
        pointFormat: "{point.name}: <b>{point.y:.2f}%</b>", // 2 decimals on hover
      },
    };

    console.log("chartOptions", chartOptions);
    return chartOptions;
  };

  return (
    <>
      <LoadingOverlay
        loader={driverForecastLoader}
        isCustomLoader={true}
        wrapperPosition="static"
        // minHeight="unset"
      >
        <div className={classes.driverSummaryContainer}>
          {channels?.map((channel) => (
            <div className={classes.driverSummaryChartTable}>
              <div className={classes.driverSummaryHeader}>
                <div className={classes.driverSummaryChartTableLabel}>
                  {replaceSpecialCharacter(channel)}
                </div>

                {showDriversChart && (
                  <Tooltip
                    variant="tertiary"
                    title={isChart[channel] ? "Table view" : "Chart view"}
                  >
                    <div className={classes.chartTableToggleContainer}>
                      <Button
                        variant="tertiary"
                        icon={isChart[channel] ? <TableIcon /> : <ChartIcon />}
                        iconPlacement="left"
                        size="large"
                        onClick={(e) => {
                          e?.currentTarget?.blur();
                          setIsChart((prev) => ({
                            ...prev,
                            [channel]: !prev[channel],
                          }));
                        }}
                      />
                    </div>
                  </Tooltip>
                )}
              </div>
              {isChart[channel] ? (
                <Charts
                  options={updatedChartData(
                    getDonutChartData(rowdata, channel),
                    adaReducer
                  )}
                  key={channel}
                />
              ) : (
                <AgGridComponent
                  cardContainer={false}
                  hideTableFormat={true}
                  tableHeader="Summary"
                  uniqueRowId="driver"
                  pagination={false}
                  sizeColumnsToFitFlag
                  minWidth={200}
                  rowdata={rowdata}
                  columns={columnData.filter(
                    (col) =>
                      col.column_name === channel ||
                      col.column_name === "driver"
                  )}
                  showSearchModalBtn={false}
                  showSaveTableConfig={false}
                />
              )}
            </div>
          ))}
        </div>
      </LoadingOverlay>
    </>
  );
};

export default DriverSummaryTable;

const useStyles = makeStyles((theme) => ({
  driverSummaryContainer: {
    "& .MuiButton-root.ia-btn-link.ia-btn-large": {
      display: "none !important",
    },
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "1rem",
  },

  driverSummaryChartTable: {
    width: "100%",
    // border: "1px solid #ddd",
    borderRadius: "8px",
    backgroundColor: "#fff",
    boxShadow: "0px 0px 4px 0px rgba(0, 0, 0, 0.12)",
    overflow: "hidden",
    "& .chartContainer": {
      padding: "2px",
    },
    "& #container": {
      margin: "2px",
      "& > div:first-of-type": {
        marginTop: "0px",
      },
    },

    "& #myGrid": {
      paddingTop: "20px",
      paddingBottom: "2px",
      transform: "translateY(6px) translateX(-2px)",
      width: "101%",
    },
    "& div.impact-table-main-header": {
      display: "none !important",
    },
  },
  driverSummaryHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "1rem",
  },
  driverSummaryChartTableLabel: {
    fontSize: "14px",
    fontWeight: "700",
    color: "#0d152c",
  },
  chartTableToggleContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    "& .ia-btn-icon svg": {
      width: "22px",
      height: "22px",
      transform: "translate(-3px, -2px) scale(0.8)",
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
  is_sortable: false,
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
    is_sortable: false,
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
