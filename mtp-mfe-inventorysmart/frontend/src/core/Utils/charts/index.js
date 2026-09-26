import { useState, useEffect, useRef } from "react";
import HighchartsReact from "highcharts-react-official";
import { Button } from "impact-ui-v3";
import {
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
import {
  scatterChartOptions,
  scatter3DChartOptions,
} from "./scatterChartFormat";
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
import { attributeChartOptions } from "./attributeChartFormat";

/* eslint-disable import/order */ //DONT_REMOVE THIS LINE
import Highcharts from 'highcharts/esm/highcharts.js';
import 'highcharts/esm/highcharts-3d.js';
import 'highcharts/esm/highcharts-more.js';
import 'highcharts/esm/modules/heatmap.js';
import 'highcharts/esm/modules/stock.js';
import 'highcharts/esm/modules/venn.js';
import 'highcharts/esm/modules/treemap.js';
import 'highcharts/esm/modules/exporting.js';
import 'highcharts/esm/modules/export-data.js';
import 'highcharts/esm/modules/offline-exporting.js';
import 'highcharts/esm/modules/map.js';
import 'highcharts/esm/modules/pattern-fill.js';
import 'highcharts/esm/modules/pareto.js';

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
  const chartRef = useRef(null);
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

  useEffect(() => {
    if (props.handleChartRef && chartRef) {
      props.handleChartRef(chartRef);
    }
  }, [chartRef]);

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
          backgroundColor: props.options?.backgroundColor || "white",
          plotBackgroundColor: props?.options?.plotBackgroundColor || "white",
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
        // Override yAxis if custom yAxis is provided in props.options
        ...(props.options.yAxis && { yAxis: props.options.yAxis }),
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
        chart: props.options?.chart
          ? props.options.chart
          : {
              type: chartType,
            },
      };
      break;
    case "multiLineChart":
      let multiLineOptions = multiLineChartOptions(cloneDeep(props.options));
      props.screen === "hindsight-assort"
        ? (graphOptions = {
            ...multiLineOptions,

            chart: {
              type: chartType,
            },
            exporting: {
              buttons: false,
            },
          })
        : (graphOptions = { ...multiLineOptions });
      break;
    case "simpleLineChart":
      let lineOptions = simpleLineChartOptions(cloneDeep(props.options));
      graphOptions = {
        ...lineOptions,
        chart: {
          type: chartType,
          height: props.options.chartHeight ? props.options.chartHeight : null,
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
          height: props.options.chartHeight ? props.options.chartHeight : null,
          backgroundColor: props.options?.backgroundColor || "white",
          plotBackgroundColor: props?.options?.plotBackgroundColor || "white",
        },
      };
      break;
    case "mapView":
    case "mapViewWithColorAxis":
      let mapOptions = mapviewOptionsData(cloneDeep(props.options));
      props.screen === "hindsight-assort"
        ? (graphOptions = {
            ...mapOptions,
            exporting: {
              buttons: false,
            },
          })
        : (graphOptions = { ...mapOptions });
      break;
    case "treemap":
      let treemapOptions = treemapOptionsData(props.options);
      //hiding default-export button if rendering on hindsight-assort screen
      props.screen === "hindsight-assort"
        ? (graphOptions = {
            ...treemapOptions,
            exporting: {
              buttons: false,
            },
          })
        : (graphOptions = { ...treemapOptions });
      break;
    case "bubble":
      let bubbleGraphOptions = bubbleGraphOptionsData(props.options);
      //hiding default-export button if rendering on hindsight-assort screen
      props.screen === "hindsight-assort"
        ? (graphOptions = {
            ...bubbleGraphOptions,
            exporting: {
              buttons: false,
            },
          })
        : (graphOptions = { ...bubbleGraphOptions });
      break;
    case "pareto":
      let paretoGraphOptions = paretoGraphOptionsData(props.options);
      graphOptions = {
        ...paretoGraphOptions,
      };
      break;
    case "attribute":
      let attributeGraphOptionsData = attributeChartOptions(props.options);
      props.screen === "hindsight-assort"
        ? (graphOptions = {
            ...attributeGraphOptionsData,
            exporting: {
              buttons: false,
            },
          })
        : (graphOptions = { ...attributeGraphOptionsData });
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

  if (props.disableAnimation && graphOptions) {
    graphOptions.chart = {
      ...(graphOptions.chart || {}),
      animation: false,
    };
    graphOptions.plotOptions = {
      ...(graphOptions.plotOptions || {}),
      series: {
        ...(graphOptions.plotOptions?.series || {}),
        animation: false,
      },
    };
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
      if (props.chartName !== "ClusterChart") {
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
      }
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
                beta: beta + (posX - e.chartX) / sensitivity,
              },
            },
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
          ref={chartRef}
        />
      )}
      {!props.mapView && (
        <>
          {props.options?.chartType !== "treemap" &&
            props.options?.chartType !== "bubble" &&
            props.options?.chartType !== "pareto" &&
            props.options.chartType !== "mapViewWithColorAxis" &&
            props.options.graphType !== "size_review" &&
            props.options?.chartType !== "attribute" &&
            props.options?.screen !== "hindsight" &&
            props.options?.chartType !== "scatterChart" &&
            !props.hideButton && (
              <div className={classes.chartActions}>
                <Button
                  title="Chart conversion types"
                  className={classes.convertChartButton}
                  variant="url"
                  onClick={() => setOpenPopup(true)}
                >
                  <BarChart />
                </Button>
              </div>
            )}
          {props?.options?.chartType === "3DScatterChart" ? (
            <HighchartsReact
              highcharts={Highcharts}
              options={graphOptions}
              callback={function (chart) {
                addEvents(Highcharts, chart);
              }}
              ref={chartRef}
            />
          ) : (
            <HighchartsReact
              highcharts={Highcharts}
              options={graphOptions}
              ref={chartRef}
            />
          )}
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
                  variant="url"
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
                  variant="url"
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
                  variant="url"
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
                  variant="url"
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
                  variant="url"
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
                  variant="url"
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
                  variant="url"
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
                <Button variant="url" disabled={activeCharts.bubbleActive}>
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
                <Button variant="url" disabled={activeCharts.waterfallActive}>
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
