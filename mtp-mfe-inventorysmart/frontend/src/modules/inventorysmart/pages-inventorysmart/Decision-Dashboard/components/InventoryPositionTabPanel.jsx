import React, { useState, useEffect } from "react";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import globalStyles from "core/Styles/globalStyles";
import Charts from "core/Utils/charts";
import { isEmpty, cloneDeep } from "lodash";

const InventoryPositionTabPanel = (props) => {
  const [wosData, setWosData] = useState({ cwos: 0, twos: 0 });
  const [salesData, setSalesData] = useState([]);
  const [progressDeg, setProgressDeg] = useState(0);

  useEffect(() => {
    if (!isEmpty(props.details)) {
      let filteredData = cloneDeep(props.details)?.filter(
        (item) => item.product_tag?.toLowerCase() === props.tab
      );
      let donutData = {
        cwos: 0,
        twos: 0,
      };
      let lineChartData = {
        w1: 0,
        w2: 0,
        w3: 0,
        w4: 0,
        w5: 0,
        w6: 0,
        w7: 0,
        w8: 0,
      };
      if (!isEmpty(filteredData)) {
        let cumTotalSystemInv = 0;
        filteredData.map((item) => {
          cumTotalSystemInv += item.total_system_inv || 0;
          Object.keys(donutData).forEach((key) => {
            donutData[key] += item[key] * item.total_system_inv || 0;
          });
          Object.keys(lineChartData).forEach((key) => {
            lineChartData[key] += item[key] || 0;
          });
        });
        if (cumTotalSystemInv > 0) {
          donutData.cwos = donutData.cwos / cumTotalSystemInv;
          donutData.twos = donutData.twos / cumTotalSystemInv;
        }
      }
      let lineChartSeriesData = [];
      Object.entries(lineChartData)?.forEach(([key, value]) => {
        lineChartSeriesData.push({
          name: key.toUpperCase(),
          y: value,
        });
      });
      setWosData(donutData);
      setSalesData(lineChartSeriesData);
    }
  }, [props.details, props.tab]);

  useEffect(() => {
    const progressPercentage =
      wosData.twos > 0 ? (wosData.cwos / wosData.twos) * 100 : 0;
    // Allow progress to exceed 360 degrees when CWOS > TWOS
    const progressDegrees = (progressPercentage / 100) * 360;
    setProgressDeg(progressDegrees);
  }, [wosData]);

  // Determine if CWOS >> TWOS (much larger, use all dark orange)
  // Threshold: when CWOS is more than 2x TWOS
  const isCwosMuchGreater = wosData.twos > 0 && wosData.cwos / wosData.twos > 2;

  const classes = useStyles();
  const globalClasses = globalStyles();

  const buildLineChartOptions = () => {
    return {
      chartType: "simpleLineChart",
      chartHeight: 180,
      xAxis: {
        categories: salesData.map((item) => item.name),
        labels: {
          style: {
            fontSize: "12px",
            fontFamily: "Manrope",
            fontWeight: "500",
            lineHeight: "16px",
            color: "#60697D",
          },
        },
      },
      yAxis: {
        title: {
          text: "Sales",
          style: {
            fontSize: "14px",
            fontFamily: "Manrope",
            fontWeight: "500",
            lineHeight: "20px",
            color: "#60697D",
          },
        },
        labels: {
          style: {
            fontSize: "12px",
            fontFamily: "Manrope",
            fontWeight: "500",
            lineHeight: "16px",
            color: "#60679D",
          },
        },
      },
      // axisLegends: {
      //   xaxis: {
      //     categories: salesData.map((item) => item.name),
      //     title: {
      //       text: "",
      //     },
      //   },
      //   yaxis: {
      //     title: "Sales",
      //   },
      // },
      exporting: "false",
      legend: {
        enabled: false,
      },
      series: [
        {
          name: "",
          data: salesData,
          showInLegend: false,
        },
      ],
    };
  };

  return (
    <div
      className={`${globalClasses.flexRow} ${globalClasses.gap} ${globalClasses.paddingVertical}`}
    >
      <div className={classes.wosComparison}>
        <span className="header">
          {props.side_panel_labels?.weeks_of_supply || "Weeks of supply"}
        </span>
        <div className="outerCircle">
          <svg width="120" height="120" viewBox="0 0 120 120">
            {/* Background circle - TWOS (Target) */}
            <circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke="#E6E6FA"
              strokeWidth="10"
            />
            {/* Progress circle - CWOS (Current) */}
            {/* When CWOS >> TWOS, use dark orange for everything */}
            {/* When CWOS > TWOS, use light orange up to 360°, dark orange for overflow */}
            {isCwosMuchGreater ? (
              // CWOS >> TWOS: All dark orange
              <>
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke="#f19579"
                  strokeWidth="10"
                  strokeLinecap="butt"
                  strokeDasharray={`${2 * Math.PI * 50}`}
                  strokeDashoffset={`${
                    2 * Math.PI * 50 * (1 - Math.min(progressDeg, 360) / 360)
                  }`}
                  transform="rotate(-90 60 60)"
                />
                {progressDeg > 360 && (
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke="#f19579"
                    strokeWidth="10"
                    strokeLinecap="butt"
                    strokeDasharray={`${2 * Math.PI * 50}`}
                    strokeDashoffset={`${
                      2 * Math.PI * 50 * (1 - (progressDeg - 360) / 360)
                    }`}
                    transform="rotate(-90 60 60)"
                  />
                )}
              </>
            ) : (
              // CWOS > TWOS or CWOS <= TWOS: Light orange up to 360°, dark orange for overflow
              <>
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke="#f8c8ba"
                  strokeWidth="10"
                  strokeLinecap="butt"
                  strokeDasharray={`${2 * Math.PI * 50}`}
                  strokeDashoffset={`${
                    2 * Math.PI * 50 * (1 - Math.min(progressDeg, 360) / 360)
                  }`}
                  transform="rotate(-90 60 60)"
                />
                {/* Overflow circle - dark orange when CWOS > TWOS */}
                {progressDeg > 360 && (
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke="#f19579"
                    strokeWidth="10"
                    strokeLinecap="butt"
                    strokeDasharray={`${2 * Math.PI * 50}`}
                    strokeDashoffset={`${
                      2 * Math.PI * 50 * (1 - (progressDeg - 360) / 360)
                    }`}
                    transform="rotate(-90 60 60)"
                  />
                )}
              </>
            )}
          </svg>

          {/* CWOS Label - positioned at the end of progress */}
          <div
            className="cwosLabelDynamic"
            style={{
              left: `${
                60 + 70 * Math.cos(((progressDeg - 90) * Math.PI) / 180)
              }px`,
              top: `${
                60 + 70 * Math.sin(((progressDeg - 90) * Math.PI) / 180)
              }px`,
              '--rotation': `${progressDeg}deg`,
              '--counter-rotation': `${360 - progressDeg}deg`,
            }}
          >
            <div className="labelBox">
              {wosData.cwos
                ? wosData.cwos % 1 === 0
                  ? wosData.cwos
                  : wosData.cwos?.toFixed(2)
                : 0}
            </div>
            <div className="labelLine"></div>
          </div>

          {/* TWOS Label - positioned at the top */}
          <div className="twosLabel">
            <div className="labelLine"></div>
            <div className="labelBox">
              {wosData.twos
                ? wosData.twos % 1 === 0
                  ? wosData.twos
                  : wosData.twos?.toFixed(2)
                : 0}
            </div>
          </div>

          {/* <div className="innerCircle"></div> */}
        </div>

        {/* Legends */}
        <div className="legends">
          <div className="legendItem">
            <div className="legendDash cwosDash"></div>
            <span className="legendText">
              {props.side_panel_labels?.cwos || "CWOS"}
            </span>
          </div>
          <div className="legendItem">
            <div className="legendDash targetDash"></div>
            <span className="legendText">
              {props.side_panel_labels?.target_wos || "Target WOS"}
            </span>
          </div>
        </div>
      </div>
      <div className={classes.lineChartContainer}>
        <span className="header">
          {props.side_panel_labels?.sales_last_8_weeks || "Sales Last 8 weeks"}
        </span>
        <Charts options={buildLineChartOptions()} hideButton={true} />
      </div>
    </div>
  );
};

export default InventoryPositionTabPanel;
