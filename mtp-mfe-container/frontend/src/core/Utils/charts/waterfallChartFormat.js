import { GRAPH_MENU_LIST } from "./constants";

export const waterfallChartOptions = (props) => {
  return {
    chart: {
      type: "waterfall",
    },
    title: {
      text: props.chartTitle,
    },
    xAxis: {
      type: props.axisLegends.xaxis.title,
      categories: props.xAxis.categories,
      lables: props.xAxis?.labels ? props.xAxis.labels : {},
    },

    yAxis: {
      title: {
        text: props.axisLegends.yaxis.title,
        style: props.axisLegends.yaxis?.style
          ? props.axisLegends.yaxis?.style
          : {},
      },
      labels: props.yAxis?.labels ? props.yAxis.labels : {},
    },
    tooltip: {
      pointFormat: props.pointFormat
        ? props.pointFormat
        : "<b>${point.y:,.2f}</b> USD",
    },
    credits: {
      enabled: false,
    },
    legend: props.legend,
    exporting: props.exporting ? props.exporting : GRAPH_MENU_LIST,
    series: props.series,
    plotOptions: props.plotOptions,
  };
};
