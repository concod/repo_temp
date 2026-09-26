import React, { useState, useEffect } from 'react';
import { isEmpty } from 'lodash';
import { Box } from "@mui/material";
import { ButtonGroup } from "impact-ui-v3";
import colours from "core/Styles/colours";
import { makeStyles } from "@mui/styles";
import CoreChart from "core/Utils/core-charts";

const useStyles = makeStyles((theme) => ({
  graphContainer: {
    marginTop: theme.spacing(3),
    backgroundColor: colours.white,
    padding: "15px 15px",
    width: "100%",
    minHeight: "200px",
    display: 'flex',
    flexDirection: 'column',
  },
  graphHeader: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
    padding: "10px 0px",
  },
  graphTitle: {
    fontSize: '1.25rem',
    fontWeight: 600,
  },
  graphContent: {
    height: "400px",
    width: "100%",
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  noDataContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "200px",
    width: "100%",
    minHeight: "200px",
  }
}));

const VIEW_OPTIONS = [
  { label: "Performance Trend", value: "trend_view_data" },
  { label: "Inventory View", value: "inventory_view_data" }
];

const NewStoresTrackingGraph = ({ graphData }) => {
  const classes = useStyles();
  const [selectedView, setSelectedView] = useState("trend_view_data");
  const [chartData, setChartData] = useState([]);
  const [toRenderGraph, setToRenderGraph] = useState(false);

  useEffect(() => {
    if (!isEmpty(graphData) && graphData?.[selectedView]?.data) {
      setChartData(graphData[selectedView].data);
      setToRenderGraph(true);
    } else {
      setChartData([]);
      setToRenderGraph(false);
    }
  }, [graphData, selectedView]);

  const handleViewChange = (_event, newView) => {
    setSelectedView(newView);
  };

  const getGraphTitle = () => {
    return selectedView === "trend_view_data" 
      ? "New Store Performance Trend" 
      : "New Store Inventory Performance";
  };
  
  const buildChartOptions = () => {
    const isInventoryView = selectedView === "inventory_view_data";
    
    const options = {
      chart: {
        type: isInventoryView ? "line" : "area",
        backgroundColor: colours.white,
        height: 350,
        style: {
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        },
        zoomType: 'xy'
      },
      title: {
        text: getGraphTitle(),
        align: "left",
        style: {
          fontSize: "13px",
          fontWeight: "bold",
        },
        x: 10,
        y: 10,
      },
      xAxis: {
        categories: chartData.map(item => item.week),
        title: {
          text: "Week",
          style: {
            fontSize: "14px"
          }
        }
      },
      yAxis: isInventoryView ? [
        { 
          title: {
            text: "WOS",
            style: {
              color: colours.slateGray, 
              fontSize: "14px"
            }
          },
          labels: {
            style: {
              color: colours.slateGray 
            }
          },
          opposite: false,
          gridLineColor: colours.athensGrayLight, 
          lineColor: colours.slateGray
        },
        { 
          title: {
            text: "Units",
            style: {
              color: colours.slateGray, 
              fontSize: "14px"
            }
          },
          labels: {
            style: {
              color: colours.slateGray 
            }
          },
          opposite: true,
          gridLineColor: colours.athensGrayLight, 
          lineColor: colours.slateGray
        }
      ] : {
        title: {
          text: "Units",
          style: {
            color: colours.slateGray, 
            fontSize: "14px"
          }
        },
        labels: {
          style: {
            color: colours.slateGray 
          }
        },
        axisLine: { lineStyle: { color: colours.slateGray } },
        axisLabel: { color: colours.slateGray },
        splitLine: { lineStyle: { color: colours.athensGrayLight } },
        gridLineColor: colours.athensGrayLight, 
        lineColor: colours.slateGray
      },
      legend: {
        align: "center",
        verticalAlign: "bottom",
        layout: "horizontal",
        x: 0,
        y: 0,
        symbolRadius: 0,
      },
      tooltip: {
        shared: true,
        useHTML: true,
        backgroundColor: colours.white,
        borderWidth: 0,
        borderRadius: 8,
        padding: 12,
        formatter: function () {
          let weekNum = this?.x.toString() || "";
          let s = `<div style="min-width: 240px;">
            <div style="margin-bottom: 12px;">
              <span style="
                background-color: ${colours.titanWhite};
                color: ${colours.brightRoyalBlue};
                padding: 4px 12px;
                border-radius: 16px;
                font-size: 13px;
                font-weight: 500;
              ">Week ${weekNum}</span>
            </div>`;
          this.points.reverse().forEach(function (point) {
            let name = point.series.name;
            let color = point.color;
            let value = point.y;
            let unit = name === "Store Inventory" ? " Units" : " WOS";
            s += `<div style="display: flex; justify-content: space-between; margin-bottom: 8px; gap: 20px;">
              <div style="display: flex; align-items: center; flex: 1;">
                <div style="
                  width: 8px;
                  height: 8px;
                  border-radius: 50%;
                  background-color: ${color};
                  margin-right: 8px;
                "></div>
                <span style="font-size: 13px; color: ${colours.doveGrayDark};">${name}</span>
              </div>
              <span style="font-size: 13px; font-weight: 500; margin-left: 16px; white-space: nowrap;">${value}${isInventoryView ? unit : ""}</span>
            </div>`;
          });
          s += `</div>`;
          return s;
        },
      },
      plotOptions: {
        area: {
          stacking: false,
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
        line: {
          marker: {
            enabled: true,
          },
        },
        series: {
          fillOpacity: 0.2,
        },
      },
      credits: {
        enabled: false
      },
      series: generateChartData(chartData)
    };

    return options;
  };

  const generateChartData = (data) => {
    if (isEmpty(data)) return [];
    
    // Use colors from the shared color palette
    const colors = {
      allocated: colours.royalBlue, // Blue (#3D67DB) instead of #5470C6
      sister_store_sales_multiplier: colours.errorRed, // Red (#E15554) instead of #EE6666
      actual_sales: colours.cornflowerBlueDark, // Light violet (#7071FF) instead of #9370DB
      sister_store_sales: colours.forestGreen, // Light green (#3BB273) instead of #91CC75
      adjusted_sister_sales: colours.purple, // Purple (#AE57EA)
      store_inventory: colours.black, // Black (#000000)
      future_wos: colours.crusta, // Orange-red (#FF832B) instead of #FF8E6E
      target_wos: colours.mariner, // Blue (#2478D0) instead of #4A90E2
    };
    
    // Create series based on the selected view
    if (selectedView === "trend_view_data") {
      return [
        {
          name: "Allocated Units",
          data: data.map(item => item.allocated_units || 0),
          type: "area",
          color: colors.allocated,
          fillColor: {
            linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
            stops: [
              [0, `${colours.royalBlue}80`], // Blue with opacity (80 = 50%)
              [1, `${colours.royalBlue}1A`], // Blue with opacity (1A = 10%)
            ],
          },
          zIndex: 1,
          marker: {
            enabled: true,
            symbol: "circle",
            radius: 4,
            fillColor: colours.royalBlue,
            lineWidth: 1,
            lineColor: colours.royalBlue
          },
          lineWidth: 2,
        },
        {
          name: "New Stores Sales",
          data: data.map(item => item.total_sales_units || 0),
          type: "area",
          color: colors.actual_sales,
          fillColor: {
            linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
            stops: [
              [0, `${colours.cornflowerBlueDark}80`], // Light violet with opacity (80 = 50%)
              [1, `${colours.cornflowerBlueDark}1A`], // Light violet with opacity (1A = 10%)
            ],
          },
          zIndex: 0,
          marker: {
            enabled: true,
            symbol: "diamond",
            radius: 4,
            fillColor: colours.cornflowerBlueDark,
            lineWidth: 1,
            lineColor: colours.cornflowerBlueDark
          },
          lineWidth: 2,
        },
        {
          name: "Sister Store Sales Units",
          data: data.map(item => item.sister_store_sales_units || 0),
          type: "area",
          color: colors.sister_store_sales,
          fillColor: {
            linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
            stops: [
              [0, `${colours.forestGreen}80`], // Light green with opacity (80 = 50%)
              [1, `${colours.forestGreen}1A`], // Light green with opacity (1A = 10%)
            ],
          },
          zIndex: 0,
          marker: {
            enabled: true,
            symbol: "triangle-down",
            radius: 4,
            fillColor: colours.forestGreen,
            lineWidth: 1,
            lineColor: colours.forestGreen
          },
          lineWidth: 2,
          dashStyle: 'dot',
        },
        {
          name: "Multiplier",
          data: data.map(item => item.sister_store_multiplier || 0),
          type: "area",
          color: colors.sister_store_sales_multiplier,
          fillColor: {
            linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
            stops: [
              [0, `${colours.errorRed}80`], // Red with opacity (80 = 50%)
              [1, `${colours.errorRed}1A`], // Red with opacity (1A = 10%)
            ],
          },
          zIndex: 0,
          marker: {
            enabled: true,
            symbol: "circle",
            radius: 4,
            fillColor: colours.errorRed,
            lineWidth: 1,
            lineColor: colours.errorRed
          },
          lineWidth: 2,
        },
        {
          name: "Adjusted Sister Sales",
          data: data.map(item => item.adjusted_sister_sales || 0),
          type: "area",
          color: colors.adjusted_sister_sales,
          fillColor: {
            linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
            stops: [
              [0, `${colours.purple}80`], // Purple with opacity (80 = 50%)
              [1, `${colours.purple}1A`], // Purple with opacity (1A = 10%)
            ],
          },
          zIndex: 0,
          marker: {
            enabled: true,
            symbol: "square",
            radius: 4,
            fillColor: colours.purple,
            lineWidth: 1,
            lineColor: colours.purple
          },
          lineWidth: 2,
        },
      ];
    } else {
      return [
        {
          name: "Future WOS",
          data: data.map(item => item.future_wos || 0),
          type: "line",
          color: colours.crusta, 
          yAxis: 0, 
          marker: {
            enabled: true,
            symbol: "triangle-down", 
            radius: 4,
            fillColor: colours.crusta,
            lineWidth: 1,
            lineColor: colours.crusta
          },
          lineWidth: 2
        },
        {
          name: "Target WOS",
          data: data.map(item => item.target_wos || 0),
          type: "line",
          color: colours.mariner, 
          yAxis: 0, 
          marker: {
            enabled: true,
            symbol: "diamond", 
            radius: 4,
            fillColor: colours.mariner,
            lineWidth: 1,
            lineColor: colours.mariner
          },
          lineWidth: 2
        },
        {
          name: "Store Inventory",
          data: data.map(item => item.store_inventory || 0),
          type: "line",
          color: colours.seagull, 
          yAxis: 1, 
          marker: {
            enabled: true,
            symbol: "circle",
            radius: 4,
            fillColor: colours.seagull,
            lineWidth: 1,
            lineColor: colours.seagull
          },
          lineWidth: 2,
          dashStyle: 'solid' 
        },

      ];
    }
  };
  return (
    <Box className={classes.graphContainer}>
     { toRenderGraph ? (
      <>
        <Box className={classes.graphHeader}>
          <ButtonGroup
            options={VIEW_OPTIONS}
            selectedOption={selectedView}
            onChange={handleViewChange}
          />
        </Box>
        <div className={classes.graphContent}>
          <CoreChart
            options={buildChartOptions()}
          />
        </div>
      </>
      ) : (
        <div className={classes.noDataContainer}>
          <p>No Graph data available</p>
        </div>
      )}
    </Box>
  );
};

export default NewStoresTrackingGraph;
