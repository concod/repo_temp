import { Switch } from "@mui/material";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { useEffect, useState } from "react";
import colours from "core/Styles/colours";
import { cloneDeep } from "lodash";
import { chartData as chartInfo } from "../../../../constants";
import { openStatus } from "core/pages/ticketing-system/constants";
import globalStyles from "core/Styles/globalStyles";
import { pxToRem } from "core/Utils/functions/utils";
import { useStyles as sharedStyles } from "../../../../styles-ticketing";
import { useStyles } from "./styles-by-issue-type";

/**
 * ByIssueType is a component which will give the detailed
 * information on the basis of the ticket's issue type
 * in a graphical format
 * @param {object} props
 * @returns
 */
const ByIssueType = (props) => {
  let chartData = cloneDeep(chartInfo);
  chartData.chart = {
    type: "bar", // Use 'bar' type for horizontal chart
  };
  chartData.yAxis = {
    title: {
      ...chartData.yAxis.title,
      text: "Ticket Volume",
      offset: 80,
    },
  };
  chartData.xAxis = {
    title: {
      text: "",
    },
    labels: {
      style: {
        fontSize: pxToRem(9),
        fontFamily: "Poppins",
        color: colours.trout,
        fontWeight: "normal",
        fontStyle: "normal",
        lineHeight: 13,
      },
    },
  };
  chartData.plotOptions = {
    series: {
      stacking: "normal", // Side-stacked chart
      pointWidth: 14,
      groupPadding: 0, // Adjust this value to control the gap between groups of bars
      borderWidth: 0,
    },
  };
  chartData.legend = {
    align: "right",
  };

  const { reportData } = props;
  const [graphData, setGraphData] = useState(chartData);
  const [isNonIssue, setIsNonIssue] = useState(false);
  const globalClasses = globalStyles();
  const sharedClasses = sharedStyles();
  const classes = useStyles();

  /**
   * getGraphData will prepare the graph data
   * for the current graph component and set
   * it to the graphData state which will be used
   * to display graph
   */
  const getGraphData = () => {
    try {
      const issueTypes = Array.from(
        new Set(reportData?.tickets.map((ticket) => ticket.issue_type))
      );
      let open = Array(issueTypes.length).fill(0);
      let closed = Array(issueTypes.length).fill(0);
      reportData?.tickets.forEach((ticket) => {
        let index = issueTypes.findIndex((elem) => elem === ticket.issue_type);
        if (openStatus.includes(ticket.status)) {
          open[index] += 1;
        } else {
          closed[index] += 1;
        }
      });
      chartData.xAxis.categories = issueTypes;
      chartData.series = [
        {
          name: '<span style="color: #6CB9AD;">Closed</span>',
          data: closed,
          color: colours.tradewind, // Custom color for Stack 1
          borderRadiusTopLeft: 8,
          borderRadiusTopRight: 8,
        },
        {
          name: '<span style="color: #F76D9A;">Open</span>',
          data: open,
          color: colours.froly, // Custom color for Stack 2
        },
      ];
      let newData = { ...chartData };
      setGraphData(newData);
    } catch (error) {
      console.error("getGraphData error:", error);
    }
  };

  const handleNonIssueToggle = (event) => {
    try {
      setIsNonIssue(event.target.checked);
    } catch (error) {
      console.error("handleNonIssueToggle error", error);
    }
  };

  /**
   * It will call the getGraphData function at first,
   * and whenever the reporting data changes
   */
  useEffect(() => {
    if (Object.keys(reportData).length > 0) {
      getGraphData();
    }
  }, [reportData]);

  return (
    <div>
      <div className={`${sharedClasses.graphContainer} ${classes.mt0}`}>
        <div
          className={`${globalClasses.fullWidth} ${globalClasses.layoutAlignSpaceBetween}`}
        >
          <p className={sharedClasses.graphContainerHeader}>Trend Analysis</p>
          {/* <div className={classes.nonIssueToggleContainer}>
              <Switch checked={isNonIssue} onChange={handleNonIssueToggle} />
              <p>Non issues</p>
            </div> */}
        </div>
        <div
          className={`${sharedClasses.card} ${sharedClasses.graphContainerGraph}`}
        >
          <HighchartsReact
            highcharts={Highcharts}
            options={graphData}
            key={JSON.stringify(graphData)}
          />
        </div>
      </div>
    </div>
  );
};

export default ByIssueType;
