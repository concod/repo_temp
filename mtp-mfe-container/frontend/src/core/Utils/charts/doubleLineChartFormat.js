import { GRAPH_MENU_LIST } from "./constants";
import { getDenseCategoryAxisOverrides } from "./denseCategoryAxis";

export const multiLineChartOptions = (props) => {
  let chartOverrides = {};
  let labelOverrides;
  if (props.enableDenseCategoryAxis) {
    ({ chartOverrides, labelOverrides } = getDenseCategoryAxisOverrides({
      categories: props.axisLegends?.xaxis?.categories,
    }));
  }
  return {
    chart: {
      type: "line",
      ...chartOverrides,
    },
    title: {
      useHTML: props.chartTitle ? false : true,
      text: props.chartTitle ? props.chartTitle : "&nbsp",
    },
    xAxis: {
      title: {
        text: props.axisLegends.xaxis.title,
        style: {
          fontSize: "14px",
        },
      },
      categories: props.axisLegends.xaxis.categories,
      crosshair: props.axisLegends.xaxis.crosshair || false,
      ...(labelOverrides ? { labels: labelOverrides } : {}),
    },
    yAxis: {
      title: {
        text: props.axisLegends.yaxis.title,
        style: {
          fontSize: "14px",
        },
      },
    },
    legend: props.legend
      ? props.legend
      : {
          itemStyle: {
            fontSize: "14px",
          },
        },
    credits: {
      enabled: false,
    },
    plotOptions: {
      line: {
        dataLabels: {
          enabled: props.hideLabels ? false : true,
          format: props.labelFormatter || null,
        },
      },
    },
    exporting: GRAPH_MENU_LIST,
    series: props.series.map((element) => {
      return {
        ...element,
        marker: {
          symbol: props.marker ? props.marker : "circle",
        },
        dataLabels: {
          formatter: function () {
            if (props.isBudgetLabel) {
              let data = this.y;
              //Format data
              if (data > 1000000) {
                return (data / 1000000).toFixed(3) + "M";
              } else if (data > 1000) {
                return (data / 1000).toFixed(3) + "K";
              }
              return data;
            }
            return this.key + "-" + this.y;
          },
          color: "Black",
          distance: 30,
        },
      };
    }),
    tooltip: props?.tooltip || {},
  };
};
