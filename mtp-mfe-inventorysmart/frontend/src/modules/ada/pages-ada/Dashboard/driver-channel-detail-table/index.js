import { makeStyles } from "@mui/styles";
import LoadingOverlay from "core/Utils/Loader/loader";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import React from "react";
import { useState, useRef } from "react";
import AgGridComponent from "core/Utils/agGrid";
import { useEffect } from "react";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import {
  chartDataPayload,
  PERIOD_MAPPING,
  weekEndDateLabel,
} from "modules/ada/utils-ada/utilityFunctions";
import { useSelector } from "react-redux";
import {
  getDriverChannelTableData,
  getDriverRankData,
  getDriverSigAggData,
  getDriverSignificancetData,
} from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";
import { cloneDeep } from "lodash";
import SelectContainer from "core/commonComponents/filters/SelectContainer";
import { SPECIAL_CHARACTER_MAPPING } from "config/constants";
import colours from "core/Styles/colours";
import Charts from "core/Utils/charts";
import theme from "core/Styles/theme";
import GraphBarIcon from "assets/GraphBar.svg";
import TableIcon from "assets/impactv3/table.svg";
import { Button } from "impact-ui-v3";

const DriverChannelDetailTable = ({
  channels,
  selectedChannel,
  setSelectedChannel,
  getPayload,
  adaReducer,
  showDriversChart = false,
  showHierarchyDropdown,
  title,
  showChannelDropdown,
  viewHierarchyDriversSignificance,
}) => {
  const classes = useStyles();

  const fixedDecimals =
    adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
      ?.decimalConfig?.chart;

  const [driverForecastLoader, setDriverForecastLoader] = useState(false);
  const [columnData, setColumnData] = useState([]);
  const [rowdata, setRowdata] = useState([]);
  const fiscalWeeks = useRef([]);

  const [isGraph, setIsGraph] = useState(false);

  const colorPalette = [
    "#69C9C2",
    "#F88D6A",
    "#EDC948",
    "#B39CD0",
    "#627BC1",
    "#8FCB81",
  ];
  function getChartData(formattedResponse, fixed_dec = 0) {
    const chartSeriesData = formattedResponse.map((item, index) => {
      const { drivers, ...rest } = item;

      return {
        name: formatKey(drivers),
        data: Object.values(rest).map((val) =>
          typeof val === "number" ? val : Number(val.toFixed(fixed_dec))
        ),
        color: colorPalette[index],
      };
    });
    return chartSeriesData;
  }

  // Helper function to format driver names
  function formatKey(key) {
    return key
      .replace(/([A-Z])/g, " $1")
      .replace(/[_\-]+/g, " ")
      .trim()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }

  const getSortedDates = (data) => {
    const datesSet = new Set();

    data.forEach((obj) => {
      Object.keys(obj).forEach((key) => {
        if (key !== "drivers") {
          datesSet.add(key);
        }
      });
    });

    return Array.from(datesSet).sort((a, b) => Number(a) - Number(b));
  };

  useEffect(() => {
    if (!viewHierarchyDriversSignificance && !selectedChannel?.length) {
      setColumnData([]);
      setRowdata([]);
      return;
    }
    const payload = getPayload();
    const getRowData = async () => {
      try {
        setDriverForecastLoader(true);

        const getDriverDataFn = viewHierarchyDriversSignificance
          ? getDriverSigAggData
          : getDriverChannelTableData;

        let response = await getDriverDataFn(
          payload,
          viewHierarchyDriversSignificance
            ? channels
            : selectedChannel?.[0]?.value
        );
        let formattedResponse = response?.data?.data || {};
        let updatedColumnConfig = cloneDeep(columnConfig);
        // let weeks = adaReducer?.fiscalIdPayload?.fiscal_ids;
        const selectedWeeks = getSortedDates(formattedResponse);

        const isDriverSignificanceAggregationWeek =
          adaReducer?.clientConfig?.attribute_value?.show_features
            ?.driver_sig_agg_week;

        const isWeekEndDateLabelEnabled =
          adaReducer?.clientConfig?.attribute_value?.show_features
            ?.is_week_end_date_label_enabled;

        let showWeekEndDateLabelEnabled =
          isWeekEndDateLabelEnabled &&
          (adaReducer?.switchTimeLine?.[0]?.value === "W" ||
            isDriverSignificanceAggregationWeek);

        let totalWeeks = [];

        if (selectedWeeks.length) {
          selectedWeeks.forEach((week) => {
            let channelColumn = cloneDeep(channelColumnConfig);
            channelColumn.column_name = week + "";

            if (showWeekEndDateLabelEnabled) {
              channelColumn.label = weekEndDateLabel(week, adaReducer);
            } else {
              channelColumn.label = isDriverSignificanceAggregationWeek
                ? `FW-${week}`
                : `F${adaReducer?.switchTimeLine?.[0]?.value}-${week}`;
            }

            totalWeeks.push(channelColumn.label);
            updatedColumnConfig.push(channelColumn);
          });
        }
        const formattedColumnResponse = agGridColumnFormatter(
          updatedColumnConfig
        );
        fiscalWeeks.current = totalWeeks;
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
        setRowdata([]);
        setColumnData([]);
      } finally {
        setDriverForecastLoader(false);
      }
    };
    getRowData();
  }, [selectedChannel?.length, selectedChannel?.[0]?.value]);

  useEffect(() => {
    if (!channels?.length || viewHierarchyDriversSignificance) return;
    let updatedChannels = channels?.map(
      (channel) =>
        ({
          label: channel,
          value: channel,
          id: channel,
        } || [])
    );

    setSelectedChannel([updatedChannels?.[0]]);
  }, [channels?.length]);

  function replaceSpecialChars(str) {
    let replacedStr = str;
    for (const code in SPECIAL_CHARACTER_MAPPING) {
      const regex = new RegExp(code, "g");
      replacedStr = replacedStr.replace(regex, SPECIAL_CHARACTER_MAPPING[code]);
    }
    return replacedStr;
  }

  let colorValue = null;
  let colorIndex = null;
  const updatedChartData = (seriesData, adaReducer) => {
    let timeline = adaReducer?.switchTimeLine?.[0]?.value;

    const chartOptions = {
      type: "column",
      chartType: "stackedBarChart",
      chartTitle: "",
      axisLegends: {
        xaxis: {
          title: `Fiscal ${PERIOD_MAPPING[timeline]}`,
          categories: fiscalWeeks.current,
          crosshair: true,
        },
        yaxis: {
          title: "Drivers %",
          color: colours.black,
          max: 100,
          min: 0,
        },
      },
      legend: {
        floating: true,
      },
      showToolTip: true,
      series: seriesData,
      isBudgetLabel: true,
      // tooltip: {
      //   valueDecimals:
      //     adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
      //       ?.decimalConfig?.chart,
      // },
      plotOptions: {
        series: {
          states: {
            hover: {
              enabled: true,
              brightness: 0.2,
            },
          },
          events: {
            mouseOver: function () {
              colorValue = colorPalette[this.index];
              colorIndex = this.index;
              this.chart.series[this.index].update({
                color: colorValue,
              });
            },
            mouseOut: function () {
              this.chart.series[this.index].update({
                color: colorPalette[this.index],
              });
            },
          },
        },
      },

      tooltip: {
        backgroundColor: theme.palette.common.white,
        borderColor: theme.palette.text.disabled,
        shadow: false,
        style: {
          padding: "8px",
        },
        useHTML: true,
        formatter: function () {
          let activePoint = `<span style="color: ${theme.palette.text.primary}"><b>${this.points[0].key}</b></span><br/>`;
          let titleLine = `<div style="width: 100%; height: 1px; margin: 6px 0; background-color: ${theme.palette.text.disabled}"></div>`;
          activePoint += titleLine;

          this.points.forEach(function (point, index) {
            let textColor = theme.palette.text.primary;
            if (index !== colorIndex) textColor = theme.palette.text.disabled;
            let pointValue = point.y;
            if (point.y < 0) pointValue = -1 * point.y;
            activePoint +=
              `<span style="color: ${point.color}; margin-right:2px">\u25CF</span>` +
              `<span style="color: ${textColor}"> ${point.series.name} <b> : ${pointValue} </b><br>`;
          });
          return activePoint;
        },
        shared: true,
      },
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
      <div
        className={`${showHierarchyDropdown ? classes.dropdownContainer : ""}`}
      >
        {showHierarchyDropdown && (
          <div className={classes.hierarchyDropdown}>
            {showHierarchyDropdown()}
          </div>
        )}
        <div className={classes.channelFilterContainer}>
          {showChannelDropdown && (
            <SelectContainer
              label="Select Channel"
              initialData={channels?.map((channel) => {
                return (
                  {
                    label: replaceSpecialChars(channel),
                    value: channel,
                    id: channel,
                  } || []
                );
              })}
              updateDependency={(_, value) => {
                setSelectedChannel(value);
              }}
              selectedOptions={selectedChannel}
            />
          )}
          {/* <div className="divider-line"></div> */}
          {showDriversChart && (
            <div className="graph-table-toggle-button">
              <Button
                variant="tertiary"
                icon={isGraph ? <TableIcon /> : <GraphBarIcon />}
                iconPlacement="left"
                size="large"
                onClick={() => {
                  setIsGraph(!isGraph);
                }}
              />
            </div>
          )}
        </div>
      </div>
      <LoadingOverlay
        loader={driverForecastLoader}
        isCustomLoader={true}
        minHeight="unset"
      >
        {isGraph ? (
          <Charts
            options={updatedChartData(
              getChartData(rowdata, fixedDecimals),
              adaReducer
            )}
          />
        ) : (
          <AgGridComponent
            hideTableFormat={true}
            tableHeader={title ? title : "Contribution"}
            uniqueRowId="drivers"
            pagination={false}
            sizeColumnsToFitFlag
            minWidth={200}
            rowdata={rowdata}
            columns={columnData}
            showSearchModalBtn={false}
          />
        )}
      </LoadingOverlay>
    </>
  );
};

export default DriverChannelDetailTable;

const useStyles = makeStyles((theme) => ({
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

  dropdownContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },

  hierarchyDropdown: {
    display: "flex",
    "& .ia-select-label-v3": {
      display: "none",
    },
  },
  channelFilterContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: "1rem",
    "& .graph-table-toggle-button": {
      transform: "translateY(10px)",
    },

    "& #select-channel-filterDropdown": {
      minWidth: "unset !important",
    },
    "& .ia-select-label-v3": {
      display: "none",
    },
  },
}));

let channelColumnConfig = {
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

let columnConfig = [
  {
    column_name: "drivers",
    label: "Drivers",
    is_frozen: true,
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
