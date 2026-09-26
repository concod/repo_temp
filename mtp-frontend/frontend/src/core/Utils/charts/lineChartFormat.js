import { GRAPH_MENU_LIST } from "./constants";

export const simpleLineChartOptions = (props) => {
  return {
    chart: {
      type: "spline",
    },
    title: {
      text: props.chartTitle,
    },
    credits: {
      enabled: false,
    },
    xAxis: {
      categories: props.axisLegends.xaxis.categories,
    },
    yAxis: {
      min: 0,
      title: {
        text: props.axisLegends.yaxis.title,
      },
    },
    exporting: GRAPH_MENU_LIST,
    series: props.series,
  };
};
