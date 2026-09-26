import { GRAPH_MENU_LIST } from "./constants";

export const donutChartOptions = (props) => {
  return {
    chart: {
      type: "pie",
    },
    title: {
      useHTML: props.chartTitle ? false : true,
      text: props.chartTitle ? props.chartTitle : "&nbsp",
    },
    // to show navigation of legends
    legend: {
      maxHeight: 40,
      itemStyle: {
        fontSize: "14px",
      },
    },
    credits: {
      enabled: false,
    },
    plotOptions: {
      pie: {
        size: 250,
      },
    },
    exporting: GRAPH_MENU_LIST,
    series: [
      {
        ...props.series[0],
        dataLabels: {
          formatter: function () {
            return props.isPercentLabel
              ? this.key + "-" + this.y + "%"
              : this.key + "-" + this.y;
          },
          color: "Black",
          distance: 30,
        },
      },
    ],
  };
};
