import { GRAPH_MENU_LIST } from "./constants";
import { dollarFormatter, decimalsFormatter } from "core/Utils/formatter";

export const barChartOptions = (props) => {
  return {
    chart: {
      type: "column",
    },
    title: {
      useHTML: props.chartTitle ? false : true,
      text: props.chartTitle ? props.chartTitle : "&nbsp",
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
      //Manually set the Y axis Interval
      tickInterval: props.axisLegends.yaxis?.tickInterval,
    },
    legend: {
      itemStyle: {
        fontSize: "14px",
      },
    },
    credits: {
      enabled: false,
    },
    plotOptions: {
      series: {
        pointWidth: props?.plotOptions?.series?.pointWidth
          ? props?.plotOptions?.series?.pointWidth
          : 40,
        dataLabels: {
          enabled: props?.plotOptions?.dataLabels?.enabled,
          rotation: props?.plotOptions?.series?.rotation
            ? props?.plotOptions?.series?.rotation
            : 0,
          format:
            props?.plotOptions?.series?.dataLabels?.format &&
            props?.plotOptions?.series?.dataLabels?.format,
        },
      },
    },
    exporting: GRAPH_MENU_LIST,
    tooltip: props?.tooltip,
    series: [
      {
        ...props.series[0],
        dataLabels: {
          formatter: function () {
            return props.isPercentLabel
              ? this.key + "-" + this.y + "%"
              : props.isDollarLabel
              ? this.key + "-" + dollarFormatter({ value: this.y }, 0)
              : props.isDecimalFormatLabel
              ? this.key + "-" + decimalsFormatter({ value: this.y }, 0)
              : this.key + "-" + this.y;
          },
          color: "Black",
          distance: 30,
        },
      },
    ],
  };
};
