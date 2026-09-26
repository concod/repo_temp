export const bubbleGraphOptionsData = (props) => {
  return {
    chart: {
      type: "bubble",
      plotBorderWidth: 1,
      zoomType: "xy",
      height: "550px",
      events: {
        load: function(){
          const chart = this;
          const offset = 140;
          chart.renderer.text('Quadrant 1', chart.chartWidth - 120, 30).css({
            color: '#929195',
            fontSize: '16px',
            fontWeight: 'bold'
          }).add();
          chart.renderer.text('Quadrant 4', chart.chartWidth - 120, chart.chartHeight - 120).css({
            color: '#929195',
            fontSize: '16px',
            fontWeight: 'bold'
          }).add();
          chart.renderer.text('Quadrant 3', 90,chart.chartHeight-120).css({
            color: '#929195',
            fontSize: '16px',
            fontWeight: 'bold'
          }).add();
          chart.renderer.text('Quadrant 2', 90, 30).css({
            color: '#929195',
            fontSize: '16px',
            fontWeight: 'bold'
          }).add();
        }
      }
    },
    legend: {
      enabled: true,
      maxHeight: props?.maxHeight,
    },
    title: {
      text: "",
    },
    credits: {
      enabled: false,
    },
    xAxis: props.xAxis,
    yAxis: props.yAxis,
    plotOptions: {
      series: {
        dataLabels: {
          enabled: true,
          format: "{point.name}",
        },
      },
    },
    tooltip: props.tooltip,
    series: props.series,
  };
};
