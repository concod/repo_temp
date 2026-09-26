import Highcharts from "highcharts";
import { GRAPH_MENU_LIST } from "./constants";

export const barLineChartOptions = (props) => {
  const chartOptions = {
    chart: {
      zoomType: "xy",
      type: "column"
    },
    title: {
      text: props.chartTitle,
    },
    xAxis: [
      {
        title: { text: props.axisLegends?.xaxis?.title?.text },
        categories: props.axisLegends.xaxis.categories,
        crosshair: true,
        plotBands: props?.axisLegends?.xaxis?.plotBands,
        tickPositions: props?.axisLegends?.xaxis?.tickPositions,
        plotLines: props.axisLegends?.xaxis?.plotLines ? props.axisLegends?.xaxis?.plotLines : null
      },
    ],
    yAxis: [
      {
        // Primary yAxis
        labels: {
          format: props.axisLegends.yaxis.primaryAxisLable,
          style: {
            color: Highcharts.getOptions().colors[1],
          },
        },
        title: {
          text: props.axisLegends.yaxis.primaryAxisTitle,
          style: {
            color: Highcharts.getOptions().colors[1],
          },
        },
      },
      props?.show_secondary_axis
        ? {
            // Secondary yaxis
            max: props.axisLegends.yaxis.max,
            min: props.axisLegends.yaxis.min,
            startOnTick: false,
            endOnTick: false,
            title: {
              text: props.axisLegends.yaxis.secondaryAxisTitle,
              style: {
                color:
                  props.axisLegends.yaxis.color ||
                  Highcharts.getOptions().colors[0],
              },
            },
            labels: {
              format: props.axisLegends.yaxis.secondaryAxisLable,
              style: {
                color:
                  props.axisLegends.yaxis.color ||
                  Highcharts.getOptions().colors[0],
              },
            },
            opposite: true,
            gridLineColor: props.axisLegends.yaxis.gridLineColor || "#e6e6e6",
            plotLines: props.axisLegends?.yaxis?.plotLines ? props.axisLegends?.yaxis?.plotLines : null
          }
        : { title: "" },
    ],
    tooltip: props?.tooltip ? props?.tooltip : { shared: true },
    credits: {
      enabled: false,
    },
    plotOptions: {
      column: {
        stacking: props.stackedChart ? "normal" : null,
      },
      line: {
        dataLabels: {
          enabled: true,
          format: props.labelFormatter || null,
        },
      },
    },
    exporting: props.exporting ? props.exporting : GRAPH_MENU_LIST,
    series: props.series.map((seriesItem) => ({
      ...seriesItem,
      stacking: props.stackedChart && seriesItem.type === "column" ? "normal" : null,
    }))
  };
  if(props.stackedChart){
    chartOptions["yAxis"][0]["max"] = props.axisLegends.yaxis.max;
    chartOptions["yAxis"][0]["min"] = props.axisLegends.yaxis.min;
  }
  return chartOptions;
};
