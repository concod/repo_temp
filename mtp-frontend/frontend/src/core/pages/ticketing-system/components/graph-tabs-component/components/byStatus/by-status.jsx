import { ProgressBar, Select } from "impact-ui";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { useEffect, useState } from "react";
import { chartData, getGraphData } from "./utils";
import { CustomProgressBar } from "core/pages/ticketing-system/utils";
import colours from "core/Styles/colours";
import { cloneDeep } from "lodash";
import { viewByDropdownOptions } from "core/pages/ticketing-system/constants";
import globalStyles from "core/Styles/globalStyles";
import { useStyles as sharedStyles } from "../../../../styles-ticketing";

/**
 *
 * ByStatus is a component which will give the detailed
 * information on the basis of the ticket's status
 * in a graphical form
 * @param {object} props
 * @returns
 */
const ByStatus = (props) => {
  const { reportData } = props;

  const [isOpenViewBy, setIsOpenViewBy] = useState(false);
  const [currentViewByOptions, setCurrentViewByOptions] = useState(
    viewByDropdownOptions
  );
  const [selectedViewByOptions, setSelectedViewByOptions] = useState(
    viewByDropdownOptions[0]
  );

  const [ticketVolumeInfo, setTicketVolumeInfo] = useState([]);
  const [totalVolume, setTotalVolume] = useState(0);

  const [graphData, setGraphData] = useState(cloneDeep(chartData));
  const globalClasses = globalStyles();
  const sharedClasses = sharedStyles();

  /**
   * getTicketVolumeDetails is the function which prepare the
   * data for ticket volume card and set it to the
   * ticketVolumeInfo state to display it
   */
  const getTicketVolumeDetails = () => {
    try {
      let inProgress = 0;
      let informationRequested = 0;
      let solved = 0;
      let closed = 0;
      let total = 0;

      reportData?.tickets?.forEach((ticket) => {
        switch (ticket.status) {
          case "in progress":
            inProgress += 1;
            break;
          case "information requested":
            informationRequested += 1;
            break;
          case "solved":
            solved += 1;
            break;
          case "new":
            inProgress += 1;
            break;
          case "closed":
            closed += 1;
            break;
          default:
            break;
        }
      });

      total = inProgress + informationRequested + solved + closed;
      setTotalVolume(total);
      const ticketVolumeData = [
        {
          label: "In Progress",
          value: inProgress,
          color: colours.yellowGreen,
        },
        {
          label: "Info Requested",
          value: informationRequested,
          color: colours.goldSand,
        },
        {
          label: "Solved",
          value: solved,
          color: colours.cerulean,
        },
        {
          label: "Closed",
          value: closed,
          color: colours.tradewind,
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

export default ByStatus;
