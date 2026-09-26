import React, { useEffect, useState } from "react";

import { Typography } from "@mui/material";

import globalStyles from "core/Styles/globalStyles";
import Charts from "core/Utils/charts";
import { isEmpty } from "lodash";
import { Switch } from "impact-ui";

const LostSalesOpportunityComponent = (props) => {
  const [lostSalesBarGraph, setLostSalesBarGraph] = useState({});
  const [toRenderGraph, setToRenderGraph] = useState(false);
  const [lostSalesSwitch, setLostSalesSwitch] = useState(true);
  const [lostSalesRevInterval, setLostSalesRevInterval] = useState(1000);
  const globalClasses = globalStyles();

  useEffect(() => {
    if (!isEmpty(props.lostSalesGraph)) {
      setLostSalesBarGraph(props.lostSalesGraph);
      let lostSalesRev = props.lostSalesGraph.map((item) => item.lost_sales);
      let maxLostSalesRev = Math.max(...lostSalesRev);
      if (maxLostSalesRev < 10000) {
        setLostSalesRevInterval(200);
      } else if (10000 < maxLostSalesRev && maxLostSalesRev < 100000) {
        setLostSalesRevInterval(5000);
      } else if (100000 < maxLostSalesRev && maxLostSalesRev < 350000) {
        setLostSalesRevInterval(10000);
      } else {
        setLostSalesRevInterval(25000);
      }
      setToRenderGraph(true);
    } else {
      setLostSalesBarGraph({});
      setToRenderGraph(false);
    }
  }, [props.lostSalesGraph]);

  useEffect(() => {
    if (toRenderGraph) buildLostSalesGraphComponent();
  }, [toRenderGraph, lostSalesSwitch]);

  const buildLostSalesGraphComponent = () => {
    return {
      type: "column",
      chartType: "barChart",
      chartHeight: 750, // setting chart height as the values of Lost Sales $ reach upto 6 digits in data set and we are breaking down the tick interval
      chartTitle: "",
      axisLegends: {
        xaxis: {
          categories: lostSalesBarGraph.map((item) => item.fiscal_week),
          title: "Week",
        },
        yaxis: {
          title: lostSalesSwitch ? "Lost Sales Units" : "Lost Sales $",
          tickInterval: lostSalesSwitch ? null : lostSalesRevInterval,
        },
      },
      series: [
        {
          name: lostSalesSwitch ? "Lost Sales Units" : "Lost Sales $",
          data: lostSalesBarGraph.map((item) =>
            lostSalesSwitch ? item?.lost_units : item?.lost_sales
          ),
        },
      ],
      plotOptions: {
        series: {
          pointWidth: 25,
          dataLabels: {
            enabled: false,
          },
        },
      },
      tooltip: {
        ...(props.inventorysmartReportsGBQConfig?.value &&
        {
          formatter: function () {
            return `${this.x}<br>${lostSalesSwitch ? 'Lost Units' : 'Lost Sales $'}: ${this.y}<br>Fiscal Week End Date: ${lostSalesBarGraph[this.point.index]?.fiscal_week_end_date}`;

          }
        })
      },
      isPercentLabel: false,
    };
  };

  return (
    <div>
      {toRenderGraph ? (
        <>
          <Typography variant="h5" className={globalClasses.paddingVertical}>
            Lost Sales Opportunity
          </Typography>
          {!props.inventorysmartReportsGBQConfig?.value &&
            <Switch
              defaultChecked={lostSalesSwitch}
              id="lost-sales-graph"
              onChange={(event) => {
                setLostSalesSwitch(event.target.checked);
              }}
              rightLabel="Sales Units"
              leftLabel="Sales $"
            />}
          <Charts options={buildLostSalesGraphComponent()} />
        </>
      ) : (
        <Typography variant="h5" className={globalClasses.paddingVertical}>
          No data is present for the selected filters
        </Typography>
      )}
    </div>
  );
};

export default LostSalesOpportunityComponent;
