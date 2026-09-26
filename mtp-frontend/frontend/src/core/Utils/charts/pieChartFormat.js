import { GRAPH_MENU_LIST } from "./constants";

const fetchData = (props) => {
  return props.series.map((obj) => {
    return {
      ...obj,
      colorByPoint: true,
      showInLegend: true,
    };
  });
};

export const pieChartOptions = (props) => {
  return {
    chart: {
      type: "pie",
    },
    title: {
      text: props.chartTitle,
    },
    credits: {
      enabled: false,
    },
    exporting: GRAPH_MENU_LIST,
    series: fetchData(props),
  };
};
