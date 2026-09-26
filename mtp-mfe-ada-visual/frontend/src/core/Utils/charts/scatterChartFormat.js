import { GRAPH_MENU_LIST } from "./constants";

export const scatterChartOptions = (props) => {
  return {
    chart: {
      type: "scatter",
      zoomType: "xy",
    },
    // if title is not passed we use html format &nbsp to pass an empty white space in the title
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
    },
    yAxis: {
      title: {
        text: props.axisLegends.yaxis.title,
        style: {
          fontSize: "14px",
        },
      },
    },
    // adding via props as the format and styling will differ according to requirement
    tooltip: props.tooltip,
    legend: {
      itemStyle: {
        fontSize: "14px",
      },
    },
    credits: {
      enabled: false,
    },
    exporting: GRAPH_MENU_LIST,
    series: props.series,
    plotOptions: {
      series: {
        turboThreshold: 0, //set to 0 to disable (by default : 1000)
      },
    },
  };
};

export const scatter3DChartOptions = (props) => {
  return {
    chart: {
      margin: 80,
      type: "scatter3d",
      animation: true,
      options3d: props.options3d,
    },
    title: {
      text: props.chartTitle ? props.chartTitle : "&nbsp"
    },
    subtitle: {
      text: props.subtitle,
      align: 'center',
      style: {
        fontSize: '12px'
      }
    },
    credits: {
      enabled: false,
    },
    plotOptions: props.plotOptions,
    tooltip: props.tooltip,
    legend: props.legend,
    yAxis: {
      title: {
        text: props.axisLegends.yaxis.title,
      },
    },
    xAxis: {
      title: {
        text: props.axisLegends.xaxis.title,
      },
    },
    zAxis: {
      title: {
        text: props.axisLegends.zaxis.title,
      },
    },
    series: props.series,
  };
};
