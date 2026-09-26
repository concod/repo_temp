import {
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useEffect, useState } from "react";
import makeStyles from "@mui/styles/makeStyles";
import LoadingOverlay from "core/Utils/Loader/loader";
import { Box } from "@mui/system";
import Charts from "core/Utils/charts";
import theme from "core/Styles/theme";
import { connect } from "react-redux";
import { addSnack, closeSnack } from "core/actions/snackbarActions";
import {
  ERROR_MESSAGE,
  PLOT_BANDS,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { getSafetyStockGraph } from "modules/inventorysmart/services-inventorysmart/Order-Management/order-management-service";
import globalStyles from "core/Styles/globalStyles";
import classNames from "classnames";

const useStyles = makeStyles(() => ({
  root: {
    "& .MuiDialog-paperWidthSm": {
      maxWidth: "50rem",
      borderRadius: "0.8rem",
    },
  },
}));

const SAFETY_STOCK_CHART_TITLE = "Safety Stock Graph";
const SAFETY_STOCK_CHART_XAXIS = "Service Level (%)";
const SAFETY_STOCK_CHART_YAXIS = "Safety Stock";
const SAFETY_STOCK_CHART_DESCRIPTION = "Current safety stock";

const SafetyStockGraphView = (props) => {
  const [graphData, setGraphData] = useState([]);
  const [seriesGraph, setSeriesGraph] = useState([]);
  const [serviceLevelData, setServiceLevelData] = useState([]);
  const classes = useStyles();
  const globalClasses = globalStyles();

  var servicelevel = [];
  var safetyStock = [];

  const onCancel = () => {
    props?.setShowSetAllModal(false);
  };

  useEffect(() => {
    const fetchData = async () => {
      let body = {
        product_code: props?.safetyStockGraphPayload?.product_code,
        loc_code: props?.safetyStockGraphPayload?.loc_code,
      };
      let response = await props?.getSafetyStockGraph(body);
      if (response.data.status) {
        setGraphData(response?.data?.data);
        response?.data?.data.service_level.map((val) => {
          servicelevel.push(`${Math.round(val * 100)}`);
        });
        response?.data?.data.safety_stock.map((val) => {
          safetyStock.push(parseFloat(val.toFixed(2)));
        });
        for (var i = 0; i < safetyStock.length; i++) {
          if (
            (safetyStock[i] === props?.safetyStockGraphPayload?.safety_stock ||
              safetyStock[i] === props?.safetyStockGraphPayload?.stock_units) &&
            parseInt(servicelevel[i]) ===
              props?.safetyStockGraphPayload?.service_level_pct
          ) {
            safetyStock[i] = {
              y:
                props?.safetyStockGraphPayload?.safety_stock !== undefined
                  ? props?.safetyStockGraphPayload?.safety_stock
                  : props?.safetyStockGraphPayload?.stock_units,
              marker: {
                fillColor: theme.palette.graphColours[21],
                symbol: "circle",
              },
              accessibility: {
                description: SAFETY_STOCK_CHART_DESCRIPTION,
              },
            };
          }
        }

        let series = [
          {
            name: SAFETY_STOCK_CHART_YAXIS,
            type: "spline",
            color: theme.palette.graphColours[22],
            data: safetyStock,
          },
        ];
        setSeriesGraph([...series]);
        setServiceLevelData(servicelevel);
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };
    fetchData();
  }, []);

  const graphOptions = {
    chartType: "barLineChart",
    chartTitle: null,
    axisLegends: {
      xaxis: {
        title: { text: SAFETY_STOCK_CHART_XAXIS },
        categories: serviceLevelData,
        plotBands: PLOT_BANDS,
        tickPositions: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 49],
      },
      yaxis: {
        primaryAxisTitle: SAFETY_STOCK_CHART_YAXIS,
      },
    },
    series: seriesGraph,

    plotOptions: {
      series: {
        states: {
          hover: {
            enabled: true,
            brightness: 0.2,
          },
        },
      },
    },
    tooltip: {
      backgroundColor: theme.palette.common.white,
      borderColor: theme.palette.text.disabled,
      shadow: false,
      style: {
        padding: "8px",
      },
      useHTML: true,
      formatter: function () {
        let activePoint = `<span style="color: ${theme.palette.text.primary}">${SAFETY_STOCK_CHART_XAXIS}: <b>${this.points[0].key}</b></span><span></span>`;
        let titleBreak = `<div style="width: 100%; height: 1px; margin: 3px 0;"></div>`;
        activePoint += titleBreak;
        this.points.forEach(function (point) {
          let textColor = theme.palette.text.primary;
          let pointValue = point.y;
          if (point.y < 0) pointValue = -1 * point.y;
          activePoint += `<span style="color: ${textColor}"> ${point.series.name}: <b>${pointValue} </b><br>`;
        });
        return activePoint;
      },
      shared: true,
    },

    exporting: {
      buttons: {
        contextButton: {
          enabled: false,
        },
      },
    },
  };
  const displaySnackMessages = (message, variance) => {
    props.closeSnack();
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  return (
    <Dialog
      onClose={() => onCancel()}
      className={classes.root}
      maxWidth={"lg"}
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
          <Typography variant="h5" gutterBottom>
            {SAFETY_STOCK_CHART_TITLE}
          </Typography>
          <IconButton
            aria-label="close"
            onClick={() => props?.setShowSetAllModal(false)}
            size="large"
          >
            <CloseIcon />
          </IconButton>
        </Grid>
      </DialogTitle>
      {graphData.safety_stock?.[0] === null ||
      graphData.service_level?.[0] === null ? (
        <div
          className={classNames(
            globalClasses.centerAlign,
            globalClasses.evenPaddingAround,
            globalClasses.marginBottom
          )}
        >
          There is no graph data available for the selected SKU
        </div>
      ) : (
        <DialogContent sx={{ pr: 2 }}>
          <LoadingOverlay
            loader={graphData.length !== 0 ? false : true}
            minHeight={"260px"}
          >
            <Box>
              <Charts options={graphOptions} mapView={true} />
            </Box>
          </LoadingOverlay>
        </DialogContent>
      )}
    </Dialog>
  );
};

const mapDispatchToProps = (dispatch) => ({
  getSafetyStockGraph: (payload) => dispatch(getSafetyStockGraph(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  closeSnack: (payload) => dispatch(closeSnack(payload)),
});

export default connect(null, mapDispatchToProps)(SafetyStockGraphView);
