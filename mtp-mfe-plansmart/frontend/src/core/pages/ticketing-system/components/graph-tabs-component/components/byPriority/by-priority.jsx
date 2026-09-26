import { ProgressBar, Select } from "impact-ui";
import { useEffect, useState } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { getGraphData } from "./utils";
import {
  CustomProgressBar,
  chartData,
} from "core/pages/ticketing-system/utils";
import colours from "core/Styles/colours";
import { cloneDeep } from "lodash";
import globalStyles from "core/Styles/globalStyles";
import { useStyles as sharedStyles } from "../../../../styles-ticketing";

/**
 * Dropdown values for viewBy dropdown
 */
const viewByDropdownOptions = [
  {
    label: "Week",
    value: "Week",
  },
  {
    label: "Month",
    value: "Month",
  },
  {
    label: "Quarter",
    value: "Quarter",
  },
];

/**
 *
 * ByPriority is a component which will give the detailed
 * information on the basis of the ticket's priority
 * in a form of cards and graph
 * @param {object} props
 * @returns
 */
const ByPriority = (props) => {
  const { reportData } = props;

  const [ticketVolumeInfo, setTicketVolumeInfo] = useState([]);
  const [isOpenViewBy, setIsOpenViewBy] = useState(false);
  const [currentViewByOptions, setCurrentViewByOptions] = useState(
    viewByDropdownOptions
  );
  const [selectedViewByOptions, setSelectedViewByOptions] = useState(
    viewByDropdownOptions[0]
  );

  const [graphData, setGraphData] = useState(cloneDeep(chartData));
  const [totalVolume, setTotalVolume] = useState(0);
  const globalClasses = globalStyles();
  const sharedClasses = sharedStyles();

  /**
   * getTicketVolumeDetails is the function which prepare the
   * data for ticket volume card and set it to the
   * ticketVolumeInfo state to display it
   */
  const getTicketVolumeDetails = () => {
    try {
      let emergency = 0;
      let urgent = 0;
      let normal = 0;
      let low = 0;
      let total = 0;

      reportData?.tickets?.forEach((ticket) => {
        switch (ticket.priority) {
          case "emergency":
            emergency += 1;
            break;
          case "urgent":
            urgent += 1;
            break;
          case "normal":
            normal += 1;
            break;
          case "low":
            low += 1;
            break;
          case "default":
            low += 1;
            break;
        }
      });
      total = emergency + urgent + normal + low;
      setTotalVolume(total);
      const ticketVolumeData = [
        {
          label: "Emergency Tickets",
          value: emergency,
          color: colours.apricot,
        },
        {
          label: "Urgent Tickets",
          value: urgent,
          color: colours.creamCan,
        },
        {
          label: "Normal Tickets",
          value: normal,
          color: colours.jordyBlue,
        },
        {
          label: "Low Tickets",
          value: low,
          color: colours.fuchsiaPink,
        },
      ];

      setTicketVolumeInfo(ticketVolumeData);
    } catch (error) {
      console.error("getTicketVolumeDetails error", error);
    }
  };

  /**
   * It will call the getGraphData and getTicketVolumeDetails
   * function at first,
   * and whenever the reporting data or the view by option changes
   * these function will be called again to get the updated info
   */
  useEffect(() => {
    if (Object.keys(reportData).length > 0) {
      getTicketVolumeDetails();
      let graphInfo = getGraphData(
        reportData.tickets,
        reportData["date-range"],
        "",
        selectedViewByOptions.value
      );
      setGraphData(graphInfo);
    }
  }, [reportData, selectedViewByOptions]);

  return (
    <div>
      {" "}
      <div
        className={`${sharedClasses.card} ${sharedClasses.ticketVolumeContainer}`}
      >
        <p className={sharedClasses.ticketVolumeContainerHeader}>
          Ticket volume
        </p>
        <div className={sharedClasses.ticketVolumeContainerInfo}>
          {ticketVolumeInfo.map((ticket) => (
            <div className={sharedClasses.ticketVolumeContainerInfoSingle}>
              <p className={sharedClasses.ticketVolumeContainerInfoValue}>
                {ticket.value}
              </p>
              <CustomProgressBar backgroundColor={ticket.color}>
                <ProgressBar
                  progress={
                    ticket.value ? (ticket.value / totalVolume) * 100 : 0
                  }
                  label={ticket.label}
                />
              </CustomProgressBar>
            </div>
          ))}
        </div>
      </div>
      <div className={sharedClasses.card}>
        <div className={sharedClasses.graphContainer}>
          <div className={`${globalClasses.layoutAlignSpaceBetween}`}>
            <p className={sharedClasses.graphContainerHeader}>Trend Analysis</p>
            <Select
              label={"View By"}
              placeholder={"Select View By"}
              initialOptions={viewByDropdownOptions}
              isOpen={isOpenViewBy}
              setIsOpen={setIsOpenViewBy}
              currentOptions={currentViewByOptions}
              setCurrentOptions={setCurrentViewByOptions}
              selectedOptions={selectedViewByOptions}
              setSelectedOptions={setSelectedViewByOptions}
            />
          </div>
          <div className={sharedClasses.graphContainerGraph}>
            <HighchartsReact
              highcharts={Highcharts}
              options={graphData}
              key={JSON.stringify(graphData)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ByPriority;
