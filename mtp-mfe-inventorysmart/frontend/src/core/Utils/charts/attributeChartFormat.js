import { isUndefined } from "lodash";
import { GRAPH_MENU_LIST } from "./constants";

export const attributeChartOptions = (props) => {
  return {
    chart: {
      type: "BarLne",
    },
    title: {
      text: "",
    },
    xAxis: {
      title: {
        text: props.axisLegends?.xaxis?.title,
      },
      categories: props.axisLegends.xaxis.categories,
    },
    tooltip : props.tooltip,
    yAxis: [
      {
        title: {
          text: props.axisLegends?.yaxis?.title,
        },
      },
      {
        title: {
          text: props.axisLegends?.yaxisSecondary?.title,
        },
        gridLineColor: "transparent",
        gridTextColor: "#ffffff",
        lineColor: "transparent",
        max: isUndefined(props?.max) ? 100 : props?.max,
        min: 0,
        opposite: true,
        labels: {
          format: "{value}%",
        },
      },
    ],
    credits: {
      enabled: false,
    },
    plotOptions: {
      line: {
        dataLabels: {
          enabled: false,
        },
      },
    },
    exporting: GRAPH_MENU_LIST,
    series: props.series,
  };
};
