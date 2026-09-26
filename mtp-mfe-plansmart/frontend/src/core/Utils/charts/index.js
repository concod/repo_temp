import React, { useState, useEffect } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import HighchartsMap from "highcharts/modules/map";
import HighchartsPatternFill from "highcharts/modules/pattern-fill";
import HighchartsTreeChart from "highcharts/modules/treemap";
import HighchartsHeatmap from "highcharts/modules/heatmap";
import Highcharts3d from "highcharts/highcharts-3d";
import pareto from "highcharts/modules/pareto";
import {
  Button,
  IconButton,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
} from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import BarChart from "@mui/icons-material/BarChart";
import PieChart from "@mui/icons-material/PieChart";
import DonutChart from "@mui/icons-material/DonutLargeSharp";
import BubbleChart from "@mui/icons-material/BubbleChart";
import LineChart from "@mui/icons-material/ShowChart";
import StackedLineChartIcon from "@mui/icons-material/StackedLineChart";
import StackedBarChartIcon from "@mui/icons-material/StackedBarChart";
import WaterfallChartIcon from "@mui/icons-material/WaterfallChart";
import CloseIcon from "@mui/icons-material/Close";
import { cloneDeep } from "lodash";

import BarLine from "assets/barLine.png";
import BarLineDisable from "assets/barLineDisable.png";

import { stackedBarChartOptions } from "./stackedBarChartFormat";
import { scatterChartOptions, scatter3DChartOptions } from "./scatterChartFormat";
import { barChartOptions } from "./barChartFormat";
import { barLineChartOptions } from "./barLineFormat";
import { bubbleChartOptions } from "./bubbleChartFormat";
import { donutChartOptions } from "./donutChartFormat";
import { multiLineChartOptions } from "./doubleLineChartFormat";
import { simpleLineChartOptions } from "./lineChartFormat";
import { pieChartOptions } from "./pieChartFormat";
import { waterfallChartOptions } from "./waterfallChartFormat";
import { areaChartOptions } from "./areaChartFormat";
import { mapviewOptionsData } from "./mapViewFormat";
import { treemapOptionsData } from "./treeMapFormat";
import { bubbleGraphOptionsData } from "./bubbleGraphFormat";
import { paretoGraphOptionsData } from "./paretoChartFormat";

require("highcharts/highcharts-3d")(Highcharts);
require("highcharts/highcharts-more.js")(Highcharts);
require("highcharts/modules/exporting")(Highcharts);
require("highcharts/modules/export-data")(Highcharts);

HighchartsMap(Highcharts);
HighchartsPatternFill(Highcharts);
HighchartsTreeChart(Highcharts);
HighchartsHeatmap(Highcharts);
pareto(Highcharts);
Highcharts3d(Highcharts);

Highcharts.setOptions({
  lang: {
    decimalPoint: ".",
    thousandsSep: ",",
  },
});
const chartTypeTextFormat = {
  fontSize: "13px",
  textAlign: "center",
};
const useStyles = makeStyles(() => ({
  root: {
    "& .MuiDialog-paperWidthSm": {
      maxWidth: "23rem",
      borderRadius: "0.6rem",
    },
  },
  content: {
    padding: "0",
    marginBottom: "15px",
    "&.MuiDialogContent-root": {
      overflowY: "hidden",
    },
  },
  contentBodyGraph: {
    display: "flex",
    justifyContent: "space-evenly",
  },
  chartContainer: {
    // Pass width and height of 500px when testing render chart component for reference
    backgroundColor: "#fff",
  },
  chartIconStyle: {
    display: "flex",
    flexDirection: "column",
  },
  chartNameStyle: {
    ...chartTypeTextFormat,
  },
  chartNameStyleDisabled: {
    ...chartTypeTextFormat,
    color: "#acadac",
  },
  chartActions: {
    display: "flex",
    flexDirection: "row-reverse",
    marginTop: "10px",
  },
  convertChartButton: {
    border: "0.5px solid #dbdbdb",
    padding: 0,
    marginRight: "5px",
    minWidth: "36px",
  },
}));

const Charts = (props) => {
  const [openPopup, setOpenPopup] = useState(false);
  const [activeCharts, setActiveCharts] = useState({
    barActive: true,
    stackedBarActive: true,
    barLineActive: true,
    pieActive: true,
    lineActive: true,
    doubleLineActive: true,
    donutActive: true,
    bubbleActive: true,
    waterfallActive: true,
  });
  const [chartType, setChartType] = useState(props.options?.type);
  const classes = useStyles();

  const ChartConversionPermittedTo = [
    {
      column: ["spline"],
    },
    {
      pie: ["donut"],
    },
    {
      spline: ["column"],
    },
    {
      donut: ["pie"],
    },
    {
      bubble: [],
    },
    // stacked bar
    {
      line: ["column"],
    },
    {
      scatter: [],
    },
  ];

  let graphOptions = {};
  switch (props.options?.chartType) {
    case "stackedBarChart":
      let stackedOptions = stackedBarChartOptions(cloneDeep(props.options));
      graphOptions = {
        ...stackedOptions,
        chart: {
          type: chartType,
          //If a number, the height is given in pixels. If given a percentage string, the height is given as the percentage of the actual chart width.
          //Defaults to null.
          height: props.options.chartHeight ? props.options.chartHeight : null,
        },
      };
      break;
    case "scatterChart":
      let scatterOptions = scatterChartOptions(cloneDeep(props.options));
      graphOptions = {
        ...scatterOptions,
        chart: {
          type: chartType,
        },
        exporting: {
          buttons: false,
        },
      };
      break;
    case "barChart":
      let barOptions = barChartOptions(cloneDeep(props.options));
      graphOptions = {
        ...barOptions,
        chart: {
          type: chartType,
          height: props.options.chartHeight ? props.options.chartHeight : null,
        },
      };
      break;
    case "barLineChart":
      let barLineOptions = barLineChartOptions(cloneDeep(props.options));
      graphOptions = {
        ...barLineOptions,
        chart: {
          type: chartType,
        },
      };
      break;
    case "bubbleChart":
      let bubbleOptions = bubbleChartOptions(cloneDeep(props.options));
      graphOptions = {
        ...bubbleOptions,
        chart: {
          type: chartType,
        },
      };
      break;
    case "pieChart":
      let pieOptions = pieChartOptions(cloneDeep(props.options));
      graphOptions = {
        ...pieOptions,
        chart: {
          type: chartType,
        },
        exporting: {
          buttons: false,
        },
      };
      break;
    case "donutChart":
      let donutOptions = donutChartOptions(cloneDeep(props.options));
      graphOptions = {
        ...donutOptions,
        chart: {
          type: chartType,
        },
      };
      break;
    case "multiLineChart":
      let multiLineOptions = multiLineChartOptions(cloneDeep(props.options));
      graphOptions = {
        ...multiLineOptions,
        chart: {
          type: chartType,
        },
      };
      break;
    case "simpleLineChart":
      let lineOptions = simpleLineChartOptions(cloneDeep(props.options));
      graphOptions = {
        ...lineOptions,
        chart: {
          type: chartType,
        },
      };
      break;
    case "waterfallChart":
      let waterfallOptions = waterfallChartOptions(cloneDeep(props.options));
      graphOptions = {
        ...waterfallOptions,
        chart: {
          type: chartType,
        },
      };
      break;
    case "areaChart":
      let areaOptions = areaChartOptions(cloneDeep(props.options));
      graphOptions = {
        ...areaOptions,
        chart: {
          type: chartType,
        },
      };
      break;
    case "mapView":
      let mapOptions = mapviewOptionsData(cloneDeep(props.options));
      graphOptions = {
        ...mapOptions,
      };
      break;
    case "treemap":
      let treemapOptions = treemapOptionsData(props.options);
      graphOptions = {
        ...treemapOptions,
      };
      break;
    case "bubble":
      let bubbleGraphOptions = bubbleGraphOptionsData(props.options);
      graphOptions = {
        ...bubbleGraphOptions,
      };
      break;
    case "pareto":
      let paretoGraphOptions = paretoGraphOptionsData(props.options);
      graphOptions = {
        ...paretoGraphOptions,
      };
      break;
    case "3DScatterChart":
      let options = scatter3DChartOptions(cloneDeep(props.options));
      graphOptions = {
        ...options,
      };
      break;
    default:
      break;
  }

  useEffect(() => {
    if (openPopup) {
      ChartConversionPermittedTo.forEach((obj) => {
        let key = Object.keys(obj)[0];
        if (key === props.options.type) {
          checkActiveChartConversionTo(key);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openPopup]);

  const checkActiveChartConversionTo = (key) => {
    // bar. line
    if (key === "column" || key === "spline") {
      setActiveCharts({
        ...activeCharts,
        barActive: false,
        lineActive: false,
      });
    }
    // pie and donut
    if (key === "pie") {
      setActiveCharts({
        ...activeCharts,
        pieActive: false,
        donutActive: false,
      });
    }
    // double line
    if (key === "line") {
      setActiveCharts({
        ...activeCharts,
        stackedBarActive: false,
        doubleLineActive: false,
      });
    }
    // stacked bar
    if (key === "column" && graphOptions.plotOptions) {
      setActiveCharts({
        ...activeCharts,
        doubleLineActive: false,
        stackedBarActive: false,
      });
    }
    // bubble
    if (key === "bubble" || key === "scatter") {
      setActiveCharts({
        ...activeCharts,
        bubbleActive: false,
      });
    }
  };

  const checkConversion = (typeName) => {
    if (typeName === "donut") {
      props.options.series[0].innerSize = "60%";
      props.options.series[0].showInLegend = true;
      setChartType("pie");
    } else if (typeName === "pie") {
      props.options.series[0].innerSize = 0;
      setChartType(typeName);
    } else if (typeName === "doubleLine") {
      setChartType("line");
    } else if (typeName === "stackedBar") {
      setChartType("column");
      props.options.plotOptions = {
        column: {
          stacking: "normal",
          dataLabels: {
            enabled: false,
          },
        },
        series: {
          dataLabels: {
            enabled: true,
            format: props?.omsGraph && "{point.y:,.0f}",
          },
        },
      };
    } else {
      setChartType(typeName);
    }
    setOpenPopup(false);
  };


  // Function added to drag 3D graph
  function addEvents(H, chart) {
    function dragStart(eStart) {
      eStart = chart.pointer.normalize(eStart);

      var posX = eStart.chartX,
        posY = eStart.chartY,
        alpha = chart.options.chart.options3d.alpha,
        beta = chart.options.chart.options3d.beta,
        sensitivity = 5, // lower is more sensitive
        handlers = [];

      function drag(e) {
        // Get e.chartX and e.chartY
        e = chart.pointer.normalize(e);

        chart.update(
          {
            chart: {
              options3d: {
                alpha: alpha + (e.chartY - posY) / sensitivity,
                beta: beta + (posX - e.chartX) / sensitivity
              }
            }
          },
          undefined,
          undefined,
          false
        );
      }

      function unbindAll() {
        handlers.forEach(function (unbind) {
          if (unbind) {
            unbind();
          }
        });
        handlers.length = 0;
      }

      handlers.push(H.addEvent(document, "mousemove", drag));
      handlers.push(H.addEvent(document, "touchmove", drag));

      handlers.push(H.addEvent(document, "mouseup", unbindAll));
      handlers.push(H.addEvent(document, "touchend", unbindAll));
    }
    H.addEvent(chart.container, "mousedown", dragStart);
    H.addEvent(chart.container, "touchstart", dragStart);
  }


  return (
    <div
      id="container"
      className={classes.chartContainer}
      style={props?.customStyleChartContainer}
    >
      {props.mapView && (
        <HighchartsReact
          highcharts={Highcharts}
          options={graphOptions}
          constructorType={"mapChart"}
        />
      )}
      {!props.mapView && (
        <>
          {props.options?.chartType !== "treemap" &&
            props.options?.chartType !== "bubble" &&
            props.options?.chartType !== "pareto" &&
            props.options?.chartType !== "scatterChart" && (
              <div className={classes.chartActions}>
                {!props?.hideButton &&
                <Button
                  title="Chart conversion types"
                  className={classes.convertChartButton}
                  onClick={() => setOpenPopup(true)}
                >
                  <BarChart />
                </Button>}
              </div>
            )}
          {props?.options?.chartType === "3DScatterChart" ?
            <HighchartsReact highcharts={Highcharts} options={graphOptions} callback={function (chart) { addEvents(Highcharts, chart) }} />
            :
            <HighchartsReact highcharts={Highcharts} options={graphOptions} />
          }
        </>
      )}
      {openPopup && (
        <Dialog
          className={classes.root}
          maxWidth={"sm"}
          aria-labelledby="customized-dialog-title"
          open={true}
          fullWidth={true}
          disableEscapeKeyDown={true}
        >
          <DialogTitle id="customized-dialog-title">
            <Grid
              container
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            >
              Graph Type
              <IconButton
                aria-label="close"
                onClick={() => setOpenPopup(false)}
                size="large"
              >
                <CloseIcon />
              </IconButton>
            </Grid>
          </DialogTitle>
          <DialogContent
            classes={{
              root: classes.content,
            }}
          >
            <div className={classes.contentBodyGraph}>
              <div className={classes.chartIconStyle}>
                <Button
                  disabled={activeCharts.barActive}
                  onClick={() => checkConversion("column")}
                >
                  <BarChart />
                </Button>
                <span
                  className={
                    activeCharts.barActive
                      ? classes.chartNameStyleDisabled
                      : classes.chartNameStyle
                  }
                >
                  Bar
                </span>
              </div>
              <div className={classes.chartIconStyle}>
                <Button
                  disabled={activeCharts.stackedBarActive}
                  onClick={() => checkConversion("stackedBar")}
                >
                  <StackedBarChartIcon />
                </Button>
                <span
                  className={
                    activeCharts.stackedBarActive
                      ? classes.chartNameStyleDisabled
                      : classes.chartNameStyle
                  }
                >
                  Stacked Bar
                </span>
              </div>
              <div className={classes.chartIconStyle}>
                <Button
                  // to replace with a new image to show disabled
                  disabled={activeCharts.barLineActive}
                >
                  <img
                    width="20px"
                    height="20px"
                    style={{ marginBottom: "5px" }}
                    src={activeCharts.barLineActive ? BarLineDisable : BarLine}
                    alt="chart"
                  />
                </Button>
                <span
                  className={
                    activeCharts.barLineActive
                      ? classes.chartNameStyleDisabled
                      : classes.chartNameStyle
                  }
                >
                  BarLine
                </span>
              </div>
            </div>
          </DialogContent>

          <DialogTitle id="customized-dialog-title">
            <Grid
              container
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            >
              Chart Types
            </Grid>
          </DialogTitle>
          <DialogContent
            classes={{
              root: classes.content,
            }}
          >
            <div className={classes.contentBodyGraph}>
              <div className={classes.chartIconStyle}>
                <Button
                  disabled={activeCharts.pieActive}
                  onClick={() => checkConversion("pie")}
                >
                  <PieChart />
                </Button>
                <span
                  className={
                    activeCharts.pieActive
                      ? classes.chartNameStyleDisabled
                      : classes.chartNameStyle
                  }
                >
                  Pie
                </span>
              </div>
              <div className={classes.chartIconStyle}>
                <Button
                  disabled={activeCharts.lineActive}
                  onClick={() => checkConversion("spline")}
                >
                  <LineChart />
                </Button>
                <span
                  className={
                    activeCharts.lineActive
                      ? classes.chartNameStyleDisabled
                      : classes.chartNameStyle
                  }
                >
                  Line
                </span>
              </div>
              <div className={classes.chartIconStyle}>
                <Button
                  disabled={activeCharts.doubleLineActive}
                  onClick={() => checkConversion("doubleLine")}
                >
                  <StackedLineChartIcon />
                </Button>
                <span
                  className={
                    activeCharts.doubleLineActive
                      ? classes.chartNameStyleDisabled
                      : classes.chartNameStyle
                  }
                >
                  Double Line
                </span>
              </div>
            </div>
          </DialogContent>
          <DialogContent
            classes={{
              root: classes.content,
            }}
          >
            <div className={classes.contentBodyGraph}>
              <div className={classes.chartIconStyle}>
                <Button
                  disabled={activeCharts.donutActive}
                  onClick={() => checkConversion("donut")}
                >
                  <DonutChart />
                </Button>
                <span
                  className={
                    activeCharts.donutActive
                      ? classes.chartNameStyleDisabled
                      : classes.chartNameStyle
                  }
                >
                  Doughnut
                </span>
              </div>
              <div className={classes.chartIconStyle}>
                <Button disabled={activeCharts.bubbleActive}>
                  <BubbleChart />
                </Button>
                <span
                  className={
                    activeCharts.bubbleActive
                      ? classes.chartNameStyleDisabled
                      : classes.chartNameStyle
                  }
                >
                  Bubble
                </span>
              </div>
              <div className={classes.chartIconStyle}>
                <Button disabled={activeCharts.waterfallActive}>
                  <WaterfallChartIcon />
                </Button>
                <span
                  className={
                    activeCharts.waterfallActive
                      ? classes.chartNameStyleDisabled
                      : classes.chartNameStyle
                  }
                >
                  Waterfall
                </span>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Charts;
