import Highcharts from "highcharts";
import { GRAPH_MENU_LIST } from "./constants";

export const barLineChartOptions = (props) => {
  return {
    chart: {
      zoomType: "xy",
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
          }
        : { title: "" },
    ],
    tooltip: props?.tooltip ? props?.tooltip : { shared: true },
    credits: {
      enabled: false,
    },
    plotOptions: {
      line: {
        dataLabels: {
          enabled: true,
          format: props.labelFormatter || null,
        },
      },
    },
    exporting: props.exporting ? props.exporting : GRAPH_MENU_LIST,
    series: props.series,
  };
};
