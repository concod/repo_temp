export const paretoGraphOptionsData = (props) => {
  return {
    chart: {
      renderTo: "container",
      type: "column",
    },
    title: {
      text: "",
    },
    credits: {
      enabled: false,
    },
    tooltip: {
      shared: true,
      formatter: function () {
        let yValue = this.points?.[1]?.y;
        let formattedYValue =
          yValue > 1000000
            ? (yValue / 1000000).toFixed(2) + "M"
            : yValue > 1000
            ? (yValue / 1000).toFixed(2) + "K"
            : yValue;
        let secondaryData = props.secondaryData?.filter((item)=>{
          return item.x_axis === this.x;
        })?.[0];
        let secondaryCumPercent = secondaryData?.y_axis_cum_percent?.toFixed(2) + "%";
        let secondaryValue = secondaryData?.y_axis_secondary > 1000000
          ? (secondaryData?.y_axis_secondary / 1000000).toFixed(2) + "M"
          : secondaryData?.y_axis_secondary > 1000
          ? (secondaryData?.y_axis_secondary / 1000).toFixed(2) + "K"
          : secondaryData?.y_axis_secondary?.toFixed(2);
        let tooltip =
          "X: " +
          `${this.x}` +
          "<br/>" +
          `${props.yAxisLabel}:  ${formattedYValue}` +
          "<br/>" +
          `${props.secondaryCumYLabel} Cummulative Percentage: ${secondaryCumPercent}` +
          "<br/>" +
          `${props.secondaryYLabel}: ${secondaryValue}`;
        return tooltip;
      },
    },
    xAxis: props.xAxis,
    yAxis: props.yAxis,
    series: props.series,
  };
};
