import { GRAPH_MENU_LIST } from "./constants";

export const simpleLineChartOptions = (props) => {
  return {
    chart: {
      type: "spline",
    },
    title: props.title
      ? props.title
      : {
          text: props.chartTitle,
        },
    credits: {
      enabled: false,
    },
    xAxis: props.xAxis
      ? props.xAxis
      : {
          categories: props.axisLegends.xaxis.categories,
          title: {
            text: props.axisLegends?.xaxis?.title,
          },
        },
    tooltip:props.tooltip ? props.tooltip : { },
    yAxis: props.yAxis
      ? props.yAxis
      : {
          min: 0,
          title: {
            text: props.axisLegends.yaxis.title,
          },
        },
    exporting: props.exporting ? props.exporting : GRAPH_MENU_LIST,
    series: props.series,
    legend: props.legend,
  };
};
