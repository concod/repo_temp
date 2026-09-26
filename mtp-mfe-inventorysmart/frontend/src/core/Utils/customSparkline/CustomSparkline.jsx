import { useMemo, useState } from "react";
import { SparkLineChart } from "@mui/x-charts/SparkLineChart";
import { Popover } from "@mui/material";
import { LineChart } from "@mui/x-charts/LineChart";
import { BarChart } from "@mui/x-charts/BarChart";
const settings = {
  showTooltip: true,
  showHighlight: true,
  height: 40,
};

const sparklineSettings = {
  bar: {
    width: 25,
    color: "#F19579"
  },
  line: {
    color: "#BFAFD9",
    width: 100
  }
};

export default function SparklineCellRenderer({ params, plotType = "line" }) {
  sparklineSettings?.[plotType]?.width && (settings.width = sparklineSettings[plotType].width)
  const dataLabels = params.colDef?.extra?.dataLabels || ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"];
  const [anchorEl, setAnchorEl] = useState(null);
  const { value } = params;
  const [label, dataPoints] = useMemo(() => {
    if (!value) return ["", []];
    const [label, graphData] = value.split("|");
    const formattedData = graphData.split(",").map((str) => Number(str));
    return [label, formattedData];
  }, [value]);

  function handleClick(event) {
    setAnchorEl(event.currentTarget);
  }
  function handleClose() {
    setAnchorEl(null);
  }
  const open = Boolean(anchorEl);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "5px", justifyContent: "flex-end" }}>
      <p style={{ fontWeight: 500, fontSize: '14px', fontFamily: 'Manrope' }}>{label}</p>
      <div onClick={handleClick}>
        <SparkLineChart
          plotType={plotType}
          data={dataPoints}
          color={sparklineSettings[plotType]?.color}
          sx={{
            "& .MuiLineElement-root": {
              strokeWidth: 1,
            },
          }}
          {...settings}
          xAxis={{data: dataLabels }}
        />
      </div>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
      >
        <div style={{ padding: "10px" }}>
          {charSelector(plotType, dataPoints, params, dataLabels)}
        </div>
      </Popover>
    </div>
  );
}
function charSelector(plotType, dataPoints, params, dataLabels) {
  const { colDef } = params
  const label = colDef?.headerName
  let config = {
    sx: {
      '.MuiChartsGrid-line': {
        stroke: '#EFF2FA', // Or any lighter color code (e.g., #e0e0e0)
      },
      // Styles for the x-axis (bottom axis in this example)
      "& .MuiChartsAxis-bottom .MuiChartsAxis-line": { // Target the x-axis line
        stroke: "#EFF2FA", // Set the line color to red
        strokeWidth: 1, // Adjust line width if needed
      },
      "& .MuiChartsAxis-bottom .MuiChartsAxis-tickLabel": { // Target x-axis tick labels
        fill: "60697D", // Set the label color to blue
      },

      // Styles for the y-axis (left axis in this example)
      "& .MuiChartsAxis-left .MuiChartsAxis-line": { // Target the y-axis line
        stroke: "#EFF2FA", // Set the line color to green
        strokeWidth: 1,
      },
      "& .MuiChartsAxis-left .MuiChartsAxis-tickLabel": { // Target y-axis tick labels
        fill: "60697D", // Set the label color to purple
      },
      // Style to make bars thinner and limit hover area
      '& .MuiBarElement-root': {
        width: '20px !important',
      },
    },
    grid: { vertical: true, horizontal: true },
    width: 480,
    height: 280,
    series: [{
      data: dataPoints,
      label,
      color: sparklineSettings[plotType]?.color,
    }],
    slotProps: {
      tooltip: {
        trigger: 'item', // Only trigger on direct item hover
        sx: {
          '& .MuiChartsTooltip-labelCell': {
            display: 'none !important'
          },
          '& .MuiChartsTooltip-label': {
            display: 'none !important'
          }
        }
      }
    },
    xAxis: [
      {
        scaleType: plotType === "bar" ? "band" : "point",
        data: dataLabels,
        disableTicks: true,
        tickLabelStyle: {
          fontSize: 10, // Set your desired font size here
          fill: '#60697D', // Example: also change fill color
        },
      },
    ],
    yAxis: [
      {
        disableTicks: true,
        tickLabelStyle: {
          fontSize: 10, // Set your desired font size here
          fill: '#60697D', // Example: also change fill color
        },
      },
    ],
  };
  switch (plotType) {
    case "bar":
      return <BarChart {...config} />;
    default:
      return <LineChart {...config} />;
  }
}
