import Highcharts from "highcharts";
import { GRAPH_MENU_LIST } from "./constants";

const fetchData = (props) => {
  return props.series.map((obj, i) => {
    return {
      ...obj,
      marker: {
        fillColor: {
          radialGradient: { cx: 0.4, cy: 0.3, r: 0.7 },
          stops: [
            [0, "rgba(255,255,255,0.5)"],
            [
              1,
              Highcharts.color(Highcharts.getOptions().colors[i])
                .setOpacity(0.5)
                .get("rgba"),
            ],
          ],
        },
      },
    };
  });
};

export const bubbleChartOptions = (props) => {
  return {
    chart: {
      type: "bubble",
      plotBorderWidth: 1,
      zoomType: "xy",
    },
    title: {
      text: props.chartTitle,
    },
    xAxis: {
      gridLineWidth: 1,
      accessibility: {
        rangeDescription: props.axisLegends.xaxis.title,
      },
    },
    yAxis: {
      startOnTick: false,
      endOnTick: false,
      accessibility: {
        rangeDescription: props.axisLegends.yaxis.title,
      },
    },
    credits: {
      enabled: false,
    },
    exporting: GRAPH_MENU_LIST,
    series: fetchData(props),
  };
};
