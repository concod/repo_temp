import React from "react";
import Charts from "core/Utils/charts";
import { Box, Typography } from "@mui/material";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";

const ReviewForecastChart = ({ data, epLabel }) => {
  const classes = useStyles();

  const getEffectiveThisWeekIndex = (weeks, currentWeekId) => {
    if (!weeks?.length) return 0;
    const currentWeekStr = currentWeekId != null ? currentWeekId.toString() : "";
    const exactIndex = weeks.findIndex((week) => week === currentWeekStr);
    if (exactIndex !== -1) return exactIndex;
    if (!currentWeekStr) return 0;

    const insertionIndex = weeks.findIndex((week) => week > currentWeekStr);
    if (insertionIndex !== -1) return insertionIndex;
    return Math.max(0, weeks.length - 1);
  };

  const isThisWeekPresent = (weeks, currentWeekId) => {
    if (!weeks?.length) return false;
    const currentWeekStr = currentWeekId != null ? currentWeekId.toString() : "";
    if (!currentWeekStr) return false;
    return weeks.includes(currentWeekStr);
  };

  const forecastData = data?.forecast_data || {};
  // Calculate dynamic positions for week labels
  const calculateLabelPositions = () => {
    const weeks = Object.keys(forecastData).sort();
    const thisWeekIndex = getEffectiveThisWeekIndex(weeks, data?.current_week_id);
    const totalWeeks = weeks.length;
    
    if (totalWeeks === 0) {
      return { pastWeekLeft: '25%', thisWeekLeft: '75%' };
    }
    
    // Calculate percentage positions based on actual data
    // Both labels should be positioned at the start of their vertical lines
    const pastWeekPosition = 0; // Start of chart (first vertical line)
    // Adjust thisWeekPosition to align exactly with the vertical line at this week
    const thisWeekPosition = ((thisWeekIndex + 0.5) / totalWeeks) * 100;
    
    return {
      pastWeekLeft: `${Math.max(0, pastWeekPosition * 0.8 + 10)}%`, // At the start (first vertical line)
      thisWeekLeft: `${Math.min(90, thisWeekPosition * 0.8 + 10)}%` // Aligned with the vertical line at this week
    };
  };

  const labelPositions = calculateLabelPositions();

  const generateAreaChartData = (graphSet) => {
    let iaForecast = [],
      finalForecast = [],
      adjUserForecast = [],
      epFeed = [],
      lastYears = [],
      actuals = [];

    const finalorAdjustKey = epLabel ? "final_forecast" : "adj_user_forecast";

    const weeks = Object.keys(graphSet).sort();
    const hasThisWeekInData = isThisWeekPresent(weeks, data?.current_week_id);
    const thisWeekIndex = getEffectiveThisWeekIndex(weeks, data?.current_week_id);
    
    weeks.forEach(week => {
      // Handle null values and provide defaults, round off specific values
      iaForecast.push(graphSet[week].ia_original_forecast != null ? Math.round(graphSet[week].ia_original_forecast) : null);
      finalForecast.push(graphSet[week][finalorAdjustKey] != null ? Math.round(graphSet[week][finalorAdjustKey]) : null);
      adjUserForecast.push(graphSet[week].adj_user_forecast != null ? Math.round(graphSet[week].adj_user_forecast) : null);
      epFeed.push(graphSet[week].ep_feed ?? null);
      lastYears.push(graphSet[week].last_years ?? null);
      actuals.push(graphSet[week].actuals != null ? Math.round(graphSet[week].actuals) : null);
    });
    const series = [];
    
    // Create series with dotted lines for past week data
    const addSeries = (name, data, color) => {
      // Check if series has any data
      const hasData = data.some(value => value !== null && value !== undefined);
      
      if (!hasData) {
        return;
      }

      if (!hasThisWeekInData) {
        series.push({
          name: name,
          data: data,
          type: "line",
          color: color,
          lineWidth: 2,
          showInLegend: true,
          connectNulls: false,
          marker: {
            enabled: true,
            symbol: "circle",
            radius: 2,
            fillColor: color,
            lineColor: color,
            lineWidth: 1,
          },
        });
        return;
      }

      let legendShown = false;
      
      if (thisWeekIndex > 0) {
        // Past week data (dotted)
        const pastData = data.slice(0, thisWeekIndex + 1);
        if (pastData.some(value => value !== null && value !== undefined)) {
          series.push({
            name: name,
            data: pastData,
            type: "line",
            color: color,
            lineWidth: 2,
            dashStyle: "Dot",
            showInLegend: true,
            connectNulls: false,
            marker: {
              enabled: true,
              symbol: "circle",
              radius: 2,
              fillColor: color,
              lineColor: color,
              lineWidth: 1,
            },
          });
          legendShown = true;
        }
      }
      
      // This week data (solid)
      if (thisWeekIndex <= weeks.length - 1) {
        const futureData = data.slice(thisWeekIndex);
        if (futureData.some(value => value !== null && value !== undefined)) {
          series.push({
            name: name,
            data: futureData,
            type: "line",
            color: color,
            lineWidth: 2,
            showInLegend: !legendShown,
            pointStart: thisWeekIndex,
            connectNulls: false,
            marker: {
              enabled: true,
              symbol: "circle",
              radius: 2,
              fillColor: color,
              lineColor: color,
              lineWidth: 1,
            },
          });
        }
      }
    };

    // Always show these series
    addSeries("IA forecast", iaForecast, "#6FD2EA");
    addSeries(epLabel ? "Final forecast" : "Adjusted forecast", finalForecast, "#658EC4");
    addSeries("LY", lastYears, "#AD97CE");
    addSeries("Actual", actuals, "#BABCA4");
    
    // Conditionally show EP feed based on epLabel prop
    if (epLabel) {
      addSeries(epLabel, epFeed, "#6BBEC2");
    }

    return series;
  };

  const buildGraphComponent = () => {
    const weeks = Object.keys(forecastData).sort();
    const hasThisWeekInData = isThisWeekPresent(weeks, data?.current_week_id);
    const thisWeekIndex = getEffectiveThisWeekIndex(weeks, data?.current_week_id);
    const hasPastWeeks = thisWeekIndex > 0;
    
    return {
      chartHeight: 280,
      plotOptions: {
        line: {
          lineWidth: 2,
          marker: {
            enabled: true,
            symbol: "circle",
            radius: 4,
            lineWidth: 2,
          },
          states: {
            hover: {
              lineWidth: 3,
            },
          },
        },
        series: {
          marker: {
            enabled: true,
          },
        },
      },
      chart: {
        type: "line",
        backgroundColor: "#ffffff",
        style: {
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        },
        plotBorderWidth: 0,
        spacingTop: 50,
        marginTop: 60,
      },
      chartType: "simpleLineChart",
      title: {
        text: null,
      },
      legend: {
        align: "center",
        verticalAlign: "bottom",
        layout: "horizontal",
        y: 10,
        symbolRadius: 6,
        itemStyle: {
          fontSize: "12px",
          color: "#666",
        },
        itemMarginRight: 20,
      },
      xAxis: {
        categories: weeks || [],
        title: {
          text: null,
        },
        labels: {
          style: {
            fontSize: "11px",
            color: "#666",
          },
        },
        gridLineWidth: 0,
        tickLength: 0,
        plotLines: [
          ...(hasPastWeeks
            ? [{
                color: "#E0E0E0",
                width: 1,
                value: -0.5,
                zIndex: 5,
              }]
            : []),
          ...(hasThisWeekInData
            ? [{
                color: "#E0E0E0",
                width: 1,
                value: thisWeekIndex,
                zIndex: 5,
              }]
            : []),
        ],
      },
      yAxis: { 
        title: {
          text: "Sales unit",
          style: {
            fontSize: "12px",
            color: "#666",
            fontWeight: "normal",
          },
        },
        labels: {
          formatter: function() {
            if (this.value >= 1000) {
              return (this.value / 1000) + 'K';
            }
            return this.value;
          },
          style: {
            fontSize: "11px",
            color: "#666",
          },
        },
        gridLineColor: "#f0f0f0",
        gridLineWidth: 1,
      },
      tooltip: {
        shared: true,
        useHTML: true,
        backgroundColor: "#ffffff",
        borderWidth: 0,
        shadow:false,
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
          
          // Track seen series names to avoid duplicates
          const seenNames = new Set();
          
          this.points.reverse().forEach(function (point) {
            let name = point.series.name.replace(" {$}", "");
            
            // Skip if we've already added this series name
            if (seenNames.has(name)) {
              return;
            }
            seenNames.add(name);
            
            let value = parseFloat(point.y.toFixed(0)).toLocaleString();
            s += `<div style="color:${point?.color}; margin-top: 5px; display: flex; justify-content: space-between;">
                <span style="min-width: 120px; font-size:14px">${name}</span>
                <span style="font-weight: 500; margin-left: 24px; font-size:14px">${value}</span>
              </div>`;
          });
          return `<div class = ${classes.chart_tooltip}>${s}</div>`;
        },
      },
      series: generateAreaChartData(forecastData),
    };
  };

  if (!forecastData || Object.keys(forecastData).length === 0) {
    return <div>No forecast data available</div>;
  }

  return (
    <div className={classes.containerCards}>
      <Box className={classes.header}>
        <Typography className={classes.title}>
          Forecast Visualization
        </Typography>
        <Box className={classes.headerRight}>
          <Typography className={classes.avgDiscount}>
            Avg discount = {data?.avg_discount?.toFixed(2)}%
          </Typography>
        </Box>
      </Box>
      <div className={classes.chartContainer}>
        <div className={classes.weekLabels}>
          {getEffectiveThisWeekIndex(Object.keys(forecastData).sort(), data?.current_week_id) > 0 && (
            <Typography 
              className={classes.pastWeekLabel}
              style={{ left: labelPositions.pastWeekLeft }}
            >
              Past weeks
            </Typography>
          )}
          {isThisWeekPresent(Object.keys(forecastData).sort(), data?.current_week_id) && (
            <Typography 
              className={classes.thisWeekLabel}
              style={{ left: labelPositions.thisWeekLeft }}
            >
              This week
            </Typography>
          )}
        </div>
        <Charts
          options={buildGraphComponent()}
          hideButton={true}
        />
      </div>
    </div>
  );
};

export default ReviewForecastChart;