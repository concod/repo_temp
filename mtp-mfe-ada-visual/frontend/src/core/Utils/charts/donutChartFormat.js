import { GRAPH_MENU_LIST } from "./constants";

export const donutChartOptions = (props) => {
  return {
    chart: props.chart
      ? props.chart
      : {
          type: "pie",
        },
    title: {
      useHTML: props.chartTitle ? false : true,
      text: props.chartTitle ? props.chartTitle : "&nbsp",
      ...props.title,
    },
    // to show navigation of legends
    legend: props.legend
      ? props.legend
      : {
          maxHeight: 40,
          itemStyle: {
            fontSize: "14px",
          },
        },
    credits: {
      enabled: false,
    },
    plotOptions: props.plotOptions
      ? props.plotOptions
      : {
          pie: {
            size: 250,
          },
        },
    exporting: props.exporting ? props.exporting : GRAPH_MENU_LIST,
    series: [
      {
        ...props.series[0],
        dataLabels: {
          // defaults
          formatter: function () {
            return props.isPercentLabel
              ? this.key + "-" + this.y + "%"
              : this.key + "-" + this.y;
          },
          color: "Black",
          distance:
            props?.dataLabelsDistance !== undefined
              ? props.dataLabelsDistance
              : 30,
          connectorPadding:
            props?.dataLabelsConnectorPadding !== undefined
              ? props.dataLabelsConnectorPadding
              : 5,
          padding:
            props?.dataLabelsPadding !== undefined
              ? props.dataLabelsPadding
              : 5,
          // allow overrides via props.series[0].dataLabels
          ...(props.series && props.series[0] && props.series[0].dataLabels
            ? props.series[0].dataLabels
            : {}),
        },
      },
    ],
    ...(props.tooltip && { tooltip: props.tooltip }), //enabling tooltip if needed
  };
};
