import React, { useState, useEffect } from "react";

import { Typography } from "@mui/material";

import globalStyles from "core/Styles/globalStyles";
import Charts from "core/Utils/charts";
import { isEmpty } from "lodash";

const ExcessInventoryGraphComponent = (props) => {
  const [excessInventoryGraph, setExcessInventoryGraph] = useState({});
  const [toRenderGraph, setToRenderGraph] = useState(false);
  const globalClasses = globalStyles();

  useEffect(() => {
    if (!isEmpty(props.excessInventoryGraphData)) {
      setExcessInventoryGraph(props.excessInventoryGraphData);
      setToRenderGraph(true);
    } else {
      setToRenderGraph(false);
      setExcessInventoryGraph({});
    }
  }, [props.excessInventoryGraphData]);

  const buildExcessInventoryGraphComponent = () => {
    return {
      type: "area",
      chartType: "areaChart",
      chartTitle: "",
      axisLegends: {
        xaxis: {
          categories: excessInventoryGraph.map((item) => item.fiscal_week),
          title: "Week",
        },
        yaxis: { title: "Units" },
      },
      tooltip: {
        pointFormat: "{series.name} - <b>{point.y:,.0f}</b><br/>",
      },
      series: generateAreaChartData(excessInventoryGraph),
    };
  };

  const generateAreaChartData = (graphSet) => {
    let excess_inv_sum = [],
      inv_sum = [],
      unit_sold_sum = [];
    graphSet.forEach((obj) => {
      excess_inv_sum.push(obj.excess_inv_sum);
      inv_sum.push(obj.inv_sum);
      unit_sold_sum.push(obj.unit_sold_sum);
    });
    return [
      { name: "Excess Inventory", data: excess_inv_sum },
      { name: "Inventory", data: inv_sum },
      { name: "Units Sold", data: unit_sold_sum },
    ];
  };

  return (
    <div>
      {toRenderGraph ? (
        <>
          <Typography variant="h5" className={globalClasses.paddingVertical}>
            Excess Inventory
          </Typography>
          <Charts options={buildExcessInventoryGraphComponent()} />
        </>
      ) : (
        <Typography variant="h5" className={globalClasses.paddingVertical}>
          No data is present for the selected filters
        </Typography>
      )}
    </div>
  );
};

export default ExcessInventoryGraphComponent;
