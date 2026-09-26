export const treemapOptionsData = (props) => {
    return {
        chart: {
            height: props?.height || "600px",
            animation: true,
			borderColor: "#ffffff",
			margin: 0,
        },
        title: {
            text: ""
        },
        credits: {
            enabled: false,
        },
        plotOptions: {
            series: {
                dataLabels: {
                  enabled: true,
                  style: {
                    fontSize: '14px',
                    fontWeight: '500',
                    color: "black",
                    fontFamily: "Poppins",
                    textOutline:'none',
                  }
                },
              }
        },
        tooltip: props.tooltip,
        series: props.series,
        legend: props?.legend
    }
}