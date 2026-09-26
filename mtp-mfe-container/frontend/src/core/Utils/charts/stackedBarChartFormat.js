import { GRAPH_MENU_LIST } from "./constants";

export const stackedBarChartOptions = (props) => {
  let filteredSeries = props.series.filter(
    (data) => data.name !== "Other Msrp"
  );
  let deletedItem = props.series.filter((data) => data.name == "Other Msrp");
  let sortedSeries;
  if (deletedItem.length > 0) {
    sortedSeries = filteredSeries.sort(
      (a, b) => parseInt(a.name) - parseInt(b.name)
    );
    sortedSeries.push(deletedItem[0]);
  } else {
    sortedSeries = props.series.sort(
      (a, b) => parseInt(a.name) - parseInt(b.name)
    );
  }
  return {
    chart: {
      type: "column",
    },
    title: {
      useHTML: props.chartTitle ? false : true,
      //The title of the chart. When a value is given, the chart title is set with the provided value.
      //If the value is not given, then the chart title will be empty and space for the title is allocated.
      //If the provided value is null, then the chart title will hidden.
      text:
        props.chartTitle || props.chartTitle === null
          ? props.chartTitle
          : "&nbsp",
    },
    xAxis: {
      categories: props.axisLegends.xaxis.categories,
      title: {
        text: props.axisLegends.xaxis.title,
        style: {
          fontSize: "14px",
        },
      },
      //If tickInterval is null this option sets the approximate pixel interval of the tick marks.
      //Defaults to 100.
      tickPixelInterval: props.tickPixelInterval?.xaxis
        ? props.tickPixelInterval.xaxis
        : 100,
    },
    yAxis: {
      //  min: 0,
      tickPositions: props?.axisLegends?.yaxis?.tickPositions,
      title: {
        text: props.axisLegends.yaxis.title,
        style: {
          fontSize: "14px",
        },
      },
      //If tickInterval is null this option sets the approximate pixel interval of the tick marks.
      //Defaults to 72.
      tickPixelInterval: props.tickPixelInterval?.yaxis
        ? props.tickPixelInterval.yaxis
        : 72,
    },
    plotOptions: {
      column: {
        stacking: "normal",
        propsLabels: {
          enabled: true,
        },
      },
      series: {
        pointWidth: props.plotOptions?.series?.pointWidth ? props.plotOptions?.series?.pointWidth : 40,
        states: props.plotOptions?.series?.states
          ? props.plotOptions.series.states
          : undefined,
        //General event handlers for the series items.
        events: props.plotOptions?.series?.events
          ? props.plotOptions.series.events
          : undefined,
      },
    },
    subtitle: {
      text: props.subtitle,
      align: 'center',
      style: {
        fontSize: '12px'
      }
    },
    // to show all legends at once
    legend: {
      y: 5,
      maxHeight: 150,
      itemDistance: 5,
      //The vertical alignment of the legend box. Can be one of top, middle or bottom.
      //Defaults to bottom.
      verticalAlign: props.legend?.verticalAlign
        ? props.legend.verticalAlign
        : "bottom",
    },
    credits: {
      enabled: false,
    },
    //Options for the exporting module.
    exporting: props.exporting ? props.exporting : GRAPH_MENU_LIST,
    series: sortedSeries,
    tooltip: props.tooltip ? props.tooltip : {},
  };
};
