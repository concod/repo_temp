import React, { useState, useEffect } from "react";
import Highcharts from "highcharts/esm/highcharts.js";
import { getCurrencySymbol } from "core/commonComponents/coreComponentScreen/utils";
import { Typography } from "@mui/material";
import { isEmpty, isNull } from "lodash";
import globalStyles from "core/Styles/globalStyles";
import Charts from "core/Utils/charts";
import { Switch } from "impact-ui-v3";
import { connect } from "react-redux";
import { makeStyles } from "@mui/styles";
import { displayFormattedDate, getKPIIconComponent } from "../../../utils-inventorysmart/utilityFunctions";
import ExcessUnits from "assets/Excess_Unit.png";
import ExcessRevenue from "assets/Excess_Cost.png";
import { EXCESS_INVENTORY_MODULE } from "../CustomHooks/moduleConstants";

// Custom series type scoped to this graph only: same rendering as "area",
// but with the "line" series' legend symbol (short line + marker) to match design.
const AREA_LINE_LEGEND_SERIES_TYPE = "arealinelegend";
if (!Highcharts.seriesTypes[AREA_LINE_LEGEND_SERIES_TYPE]) {
  Highcharts.seriesType(AREA_LINE_LEGEND_SERIES_TYPE, "area", {}, {
    drawLegendSymbol: Highcharts.seriesTypes.line.prototype.drawLegendSymbol,
  });
}

const ExcessInventoryGraphComponent = (props) => {
  const [excessInventoryGraph, setExcessInventoryGraph] = useState({});
  const [toRenderGraph, setToRenderGraph] = useState(false);
  const globalClasses = globalStyles();
  

  const render3DIcons = props.moduleConfig?.[EXCESS_INVENTORY_MODULE]?.render3DIcons ?? false;

  const useStyles = makeStyles((theme) => ({
    containerCards: {
      border: "1px solid #ebebf0",
      borderRadius: "12px",
      backgroundColor: "#fff",
      padding: "15px",
    },
    metricCardsContainer: {
      display: "flex",
      gap: 16,
      fontFamily: "Manrope",
    },
    metricCardContainerWrapper: {
      flexBasis: "165px",
      flexShrink: 0,
    },
    metricColumnLayout: {
      display: "flex",
      flexDirection: "column",
      height: "100%",
      gap: 16,
    },
    metricCard: {
      flexBasis: "50%",
      padding: "10px",
      border: "1px solid #ebebf0",
      borderRadius: "12px",
      backgroundColor: "#fff",
    },
    graphContainer: {
      flexGrow: 1,
      border: "1px solid #ebebf0",
      borderRadius: "12px",
      backgroundColor: "#fff",
      width: "75%",
    },
    marginBottom15: {
      marginBottom: "15px",
    },
    marginBottom5: {
      marginBottom: "5px",
    },
    fontSize20: {
      fontSize: "20px",
    },
    flexColumn: {
      display: "flex",
      flexDirection: "column",
    },
    icon3DWrapper: {
      width: '48px',
      height: '48px',
      minWidth: '48px',
      minHeight: '48px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      marginBottom: '10px',
      '& svg': {
        width: '48px',
        height: '48px',
        maxWidth: '48px',
        maxHeight: '48px',
        objectFit: 'contain',
      },
    },
  }));
  const classes = useStyles();
  const [showGraphInDollars, setShowGraphInDollars] = useState(false);
  const [
    showUnitsDollarsToggleButton,
    setShowUnitsDollarsToggleButton,
  ] = useState(false);
  useEffect(() => {
    if (!isEmpty(props.excessInventoryGraphData?.data)) {
      setExcessInventoryGraph(props.excessInventoryGraphData?.data);
      setToRenderGraph(true);
    } else {
      setToRenderGraph(false);
      setExcessInventoryGraph({});
    }
    const showToggle =
      props.moduleConfig?.[EXCESS_INVENTORY_MODULE]?.excess_inv_show_units_dollars_toggle || false;
    setShowUnitsDollarsToggleButton(showToggle);
  }, [props.excessInventoryGraphData]);

  const buildExcessInventoryGraphComponent = () => {
    let xAxisLabel =
      props.moduleConfig?.[EXCESS_INVENTORY_MODULE]?.xAxisLabel;
      
    return {
      chartHeight: 250,
      plotOptions: {
        [AREA_LINE_LEGEND_SERIES_TYPE]: {
          stacking: true,
          fillOpacity: 0.2,
          lineWidth: 1,
          marker: {
            enabled: true,
            symbol: "circle",
            radius: 3,
            lineWidth: 0.5,
            lineColor: null,
          },
          states: {
            hover: {
              lineWidth: 1,
            },
          },
        },
        series: {
          fillOpacity: 0.2,
          marker: {
            enabled: true,
          },
        },
      },
      chart: {
        type: "area",
        backgroundColor: "#ffffff",
        spacingTop: 12,
        spacingBottom: 12,
        spacingLeft: 12,
        spacingRight: 12,
        style: {
          fontFamily: "Manrope, Poppins, Roboto, Helvetica, Arial, sans-serif",
        },
      },
      chartType: "areaChart",
      title: {
        style: {
          fontSize: "16px",
          fontWeight: "600",
          color: "#0D152C",
          fontFamily: "Manrope, Poppins, Roboto, Helvetica, Arial, sans-serif",
        },
        text: "Excess inventory",
        align: "left",
      },
      legend: {
        enabled: true,
        align: "center",
        verticalAlign: "bottom",
        layout: "horizontal",
        symbolRadius: 4,
        symbolHeight: 8,
        symbolWidth: 8,
        itemDistance: 24,
        itemStyle: {
          color: "#60697D",
          fontSize: "12px",
          fontWeight: "500",
        },
        padding: 0,
      },
      axisLegends: {
        xaxis: {
          categories: excessInventoryGraph?.map((item) =>
            xAxisLabel === "weekend"
              ? displayFormattedDate(
                  item.week_end_date,
                  localStorage.getItem("tenantDateFormat")
                )
              : item.fiscal_week
          ),
          title: xAxisLabel === "weekend" ? "Week Ending Date" : "Weeks",
        },
        yaxis: { title: showGraphInDollars ? "Dollars" : "Units" },
      },
      tooltip: {
        shared: true,
        useHTML: true,
        backgroundColor: "#ffffff",
        borderWidth: 0,
        borderRadius: 8,
        padding: 12,
        formatter: function () {
          let weekNum = this?.x.toString().match(/\d+/)?.[0] || this.x;
          let s = `<div style="margin-bottom: 12px;">
            <span style="
              background-color: #EEF3FF;
              color: #4B4DED;
              padding: 4px 12px;
              border-radius: 16px;
              font-size: 13px;
              font-weight: 500;
            ">Week ${weekNum}</span>
          </div>`;
          this.points.reverse().forEach(function (point) {
            let name = point.series.name.replace(" {$}", "");
            let value = parseFloat(point.y.toFixed(1)).toLocaleString();
            s += `<div style="color: #666; margin-top: 5px; display: flex; justify-content: space-between;">
              <span style="min-width: 120px;">${name}</span>
              <span style="font-weight: 500; margin-left: 24px;">${value}</span>
            </div>`;
          });
          return s;
        },
      },
      series: generateAreaChartData(excessInventoryGraph),
    };
  };

  const generateAreaChartData = (graphSet) => {
    let excess_inv_sum = [],
      excess_inv_cost_sum = [],
      unit_sold_sum = [],
      excess_inv_cost_dollars = [],
      actual_sales_cost = [],
      inventory_closing_balance_cost = [];
    graphSet.forEach((obj) => {
      excess_inv_sum.push(obj.excess_inv_sum);
      excess_inv_cost_sum.push(obj.excess_inv_cost_sum);
      unit_sold_sum.push(obj.unit_sold_sum);
      obj.excess_inv_cost_sum != null &&
        excess_inv_cost_dollars.push(obj.excess_inv_cost_sum),
        obj.actual_sales_cost != null &&
          actual_sales_cost.push(obj.actual_sales_cost),
        obj.inventory_closing_balance_cost != null &&
          inventory_closing_balance_cost.push(
            obj.inventory_closing_balance_cost
          );
    });
    return showGraphInDollars
      ? [
          {
            name: "Excess Inventory {$}",
            data: excess_inv_cost_dollars,
            type: AREA_LINE_LEGEND_SERIES_TYPE,
            color: "#3ec2e3",
            fillColor: {
              linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
              stops: [
                [0, "rgba(62, 194, 227, 0.5)"],
                [1, "rgba(62, 194, 227, 0.1)"],
              ],
            },
            zIndex: 3,
            marker: {
              enabled: true,
              symbol: "circle",
              radius: 3,
            },
          },
          {
            name: "Units Sold {$}",
            data: actual_sales_cost,
            type: AREA_LINE_LEGEND_SERIES_TYPE,
            color: "#ad97ce",
            fillColor: {
              linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
              stops: [
                [0, "rgba(173, 151, 206, 0.4)"],
                [1, "rgba(173, 151, 206, 0.1)"],
              ],
            },
            zIndex: 2,
            marker: {
              enabled: true,
              symbol: "circle",
              radius: 3,
            },
          },
          {
            name: "Excess Inv Cost {$}",
            data: inventory_closing_balance_cost,
            type: AREA_LINE_LEGEND_SERIES_TYPE,
            color: "#bbbca4",
            fillColor: {
              linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
              stops: [
                [0, "rgba(187, 188, 164, 0.3)"],
                [1, "rgba(187, 188, 164, 0.1)"],
              ],
            },
            zIndex: 1,
            marker: {
              enabled: true,
              symbol: "circle",
              radius: 3,
            },
          },
        ]
      : [
          {
            name: "Excess Inventory",
            data: excess_inv_sum,
            type: AREA_LINE_LEGEND_SERIES_TYPE,
            color: "#3ec2e3",
            fillColor: {
              linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
              stops: [
                [0, "rgba(62, 194, 227, 0.5)"],
                [1, "rgba(62, 194, 227, 0.1)"],
              ],
            },
            zIndex: 3,
            marker: {
              enabled: true,
              symbol: "circle",
              radius: 3,
            },
          },
          {
            name: "Units Sold",
            data: unit_sold_sum,
            type: AREA_LINE_LEGEND_SERIES_TYPE,
            color: "#ad97ce",
            fillColor: {
              linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
              stops: [
                [0, "rgba(173, 151, 206, 0.4)"],
                [1, "rgba(173, 151, 206, 0.1)"],
              ],
            },
            zIndex: 2,
            marker: {
              enabled: true,
              symbol: "circle",
              radius: 3,
            },
          },
          {
            name: "Excess Inv Cost",
            data: excess_inv_cost_sum,
            type: AREA_LINE_LEGEND_SERIES_TYPE,
            color: "#bbbca4",
            fillColor: {
              linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
              stops: [
                [0, "rgba(187, 188, 164, 0.3)"],
                [1, "rgba(187, 188, 164, 0.1)"],
              ],
            },
            zIndex: 1,
            marker: {
              enabled: true,
              symbol: "circle",
              radius: 3,
            },
          },
        ];
  };

  return (
    <div className={`${globalClasses.marginBottom24} ${classes.containerCards}`}>
      {toRenderGraph ? (
        <>
          {showUnitsDollarsToggleButton && (
            <div className={classes.marginBottom5}>
              <Switch
                defaultChecked={showGraphInDollars}
                id="excess-inv-graph"
                onChange={(event) => {
                  setShowGraphInDollars(event.target.checked);
                }}
                rightLabel="Dollars"
                leftLabel="Units"
              />
            </div>
          )}
          <div className={classes.metricCardsContainer}>
            <div className={classes.metricCardContainerWrapper}>
              <div className={classes.metricColumnLayout}>
                <div className={classes.metricCard}>
                  <div className={classes.flexColumn}>
                    {render3DIcons ? (
                      <div className={classes.icon3DWrapper}>
                        {getKPIIconComponent("lost_revenue", 0)}
                      </div>
                    ) : (
                      <img
                        width="35px"
                        height="35px"
                        style={{ marginBottom: "10px" }}
                        src={ExcessRevenue}
                        alt="Excess Revenue"
                      />
                    )}
                    <div className={classes.marginBottom15}>
                      Excess Inv Cost:
                    </div>
                    <div className={classes.fontSize20}>
                      <strong>
                        {!isNull(props?.aggregates)
                          ? `${getCurrencySymbol() || "$"}${props?.aggregates?.revenue.toLocaleString()}`
                          : "N/A"}
                      </strong>
                    </div>
                  </div>
                </div>
                <div className={classes.metricCard}>
                  <div className={classes.flexColumn}>
                    {render3DIcons ? (
                      <div className={classes.icon3DWrapper}>
                        {getKPIIconComponent("iob", 1)}
                      </div>
                    ) : (
                      <img
                        width="35px"
                        height="35px"
                        style={{ marginBottom: "10px" }}
                        src={ExcessUnits}
                        alt="Excess Units"
                      />
                    )}
                    <div className={classes.marginBottom15}>
                      Excess Inv Units:
                    </div>
                    <div className={classes.fontSize20}>
                      <strong>
                        {!isNull(props?.aggregates)
                          ? `${props?.aggregates?.units?.toLocaleString()}`
                          : "N/A"}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className={classes.graphContainer}>
              <Charts
                options={buildExcessInventoryGraphComponent()}
                hideButton={true}
              />
            </div>
          </div>
        </>
      ) : (
        <Typography variant="h5" className={globalClasses.paddingVertical}>
          No Graph data is present for the selected filters
        </Typography>
      )}
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
  moduleConfig: store.inventorysmartReducer?.allocationReportsCommonService?.moduleConfig,
    allocationReportsConfiguration:
      store.inventorysmartReducer?.allocationReportsCommonService
        ?.allocationReportsConfiguration,
    aggregates:
      store.inventorysmartReducer?.inventorySmartExcessInventoryService
        ?.aggregates,
  };
};
export default connect(mapStateToProps, null)(ExcessInventoryGraphComponent);
