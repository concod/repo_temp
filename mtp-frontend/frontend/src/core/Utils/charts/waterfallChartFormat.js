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
    },

    yAxis: {
      title: {
        text: props.axisLegends.yaxis.title,
      },
    },
    tooltip: {
      pointFormat: "<b>${point.y:,.2f}</b> USD",
    },
    credits: {
      enabled: false,
    },
    exporting: GRAPH_MENU_LIST,
    series: props.series,
  };
};
