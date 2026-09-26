import { GRAPH_MENU_LIST } from "./constants";

export const areaChartOptions = (props) => {
  return {
    ...props,
    chart: {
      type: "area",
    },
    title: props?.title || {
      text: props.chartTitle,
    },
    credits: {
      enabled: false,
    },
    plotOptions: {
      area: {
        marker: {
          enabled: false,
          symbol: "circle",
          radius: 2,
          states: {
            hover: {
              enabled: true,
            },
          },
        },
      },
    },
    xAxis: {
      categories: props.axisLegends.xaxis.categories,
      title: {
        text: props.axisLegends.xaxis.title,
        style: {
          fontSize: "14px",
        },
      },
    },
    yAxis: {
      min: 0,
      title: {
        text: props.axisLegends.yaxis.title,
        style: {
          fontSize: "14px",
        },
      },
    },
    exporting: GRAPH_MENU_LIST,
    tooltip: props.tooltip,
    series: props.series,
  };
};
