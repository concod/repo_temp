import { Select, useTranslation } from "impact-ui-v3";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { useEffect, useState } from "react";
import { chartData, getGraphData } from "./utils";
import colours from "core/Styles/colours";
import { cloneDeep } from "lodash";
import { viewByDropdownOptions } from "modules/ticketing-system/constants";
import globalStyles from "core/Styles/globalStyles";
import { useStyles as sharedStyles } from "../../../../styles-ticketing";
import { Typography } from "@mui/material";
import TicketInfoCard from "../../../TicketInfoCard";

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
  const { t } = useTranslation();

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
      let newCount = 0;

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
            newCount += 1;
            break;
          case "closed":
            closed += 1;
            break;
          default:
            break;
        }
      });

      total = inProgress + informationRequested + solved + newCount + closed;
      setTotalVolume(total);
      const ticketVolumeData = [
        {
          labelKey: "ticketing.inProgressTickets",
          configKey: "In Progress Tickets",
          value: inProgress,
          color: "#E1BC29",
        },
        {
          labelKey: "ticketing.infoRequestedTickets",
          configKey: "Info Requested Tickets",
          value: informationRequested,
          color: "#E15554",
        },
        {
          labelKey: "ticketing.solvedTickets",
          configKey: "Solved Tickets",
          value: solved,
          color: "#687AF1",
        },
        {
          labelKey: "ticketing.newTickets",
          configKey: "New Tickets",
          value: newCount,
          color: "#BF6EB6",
        },
        {
          labelKey: "ticketing.closedTickets",
          configKey: "Closed Tickets",
          value: closed,
          color: "#89D1AB",
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
        className={`${sharedClasses.ticketVolumeContainer}`}
      >
        <div
          className={`${sharedClasses.ticketVolumeContainerInfo} ${globalClasses.centerAlign}`}
        >
          {ticketVolumeInfo.map((ticket) => (
            <TicketInfoCard {...ticket} label={t(ticket.labelKey)} />
          ))}
        </div>
      </div>
      <div className={sharedClasses.card}>
        <div className={sharedClasses.graphContainer}>
          <div className={`${globalClasses.layoutAlignSpaceBetween}`}>
            <p className={sharedClasses.graphContainerHeader}>{t("ticketing.trendAnalysis")}</p>
            <Select
              label={t("ticketing.select.viewBy")}
              placeholder={t("ticketing.select.viewByPlaceholder")}
              initialOptions={viewByDropdownOptions}
              isOpen={isOpenViewBy}
              setIsOpen={setIsOpenViewBy}
              currentOptions={currentViewByOptions}
              setCurrentOptions={setCurrentViewByOptions}
              selectedOptions={selectedViewByOptions}
              setSelectedOptions={setSelectedViewByOptions}
              labelOrientation="left"
            />
          </div>
          <Typography
            component="p"
            className={`${sharedClasses.chartHeading} ${sharedClasses.marginVertical_24}`}
          >
            {t("ticketing.ticketVolume")}
          </Typography>
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
