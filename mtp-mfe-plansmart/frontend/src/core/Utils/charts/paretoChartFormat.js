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
        let secondaryYValue = props.secondaryData?.[this.x]?.toFixed(2) + "%";
        let tooltip =
          "X: " +
          `${this.x}` +
          "<br/>" +
          `${props.yAxisLabel}:  ${formattedYValue}` +
          "<br/>" +
          `${props.secondaryYLabel}: ${secondaryYValue}`;
        return tooltip;
      },
    },
    xAxis: props.xAxis,
    yAxis: props.yAxis,
    series: props.series,
  };
};
