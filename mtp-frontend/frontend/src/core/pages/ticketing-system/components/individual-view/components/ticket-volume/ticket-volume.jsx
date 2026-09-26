import {
  CustomProgressBar,
  getTotalNumberOfOpenAndClosedTickets,
} from "core/pages/ticketing-system/utils";
import { ProgressBar } from "impact-ui";
import { useEffect, useState } from "react";
import { useStyles as sharedStyles } from "../../../../styles-ticketing";
import { useStyles } from "./styles-ticket-volume";
import colours from "core/Styles/colours";

const TicketVolume = (props) => {
  const [ticketVolumeInfo, setTicketVolumeInfo] = useState([]);
  const { reportData } = props;
  const sharedClasses = sharedStyles();
  const classes = useStyles();

  /**
   * getTicketVolumeData will receive tickets array
   * as params with that it will get open, close and
   * total counts and using these counts it update's
   * the ticketVolumeInfo state which is responsible
   * for displaying data in ticket volume data component
   * @param {Array} tickets
   */
  const getTicketVolumeData = (tickets) => {
    try {
      let data = getTotalNumberOfOpenAndClosedTickets(tickets);
      let ticketVolumeData = [
        {
          label: "Total Tickets",
          value: data.total ? data.total : 0,
          color: colours.mariner,
        },
        {
          label: "Open Tickets",
          value: data.open ? data.open : 0,
          color: colours.froly,
        },
        {
          label: "Closed Ticket",
          value: data.closed ? data.closed : 0,
          color: colours.tradewind,
        },
      ];
      setTicketVolumeInfo(ticketVolumeData);
    } catch (error) {
      console.error("getTicketVolumeData error", error);
    }
  };

  useEffect(() => {
    if (Object.keys(reportData).length > 0) {
      getTicketVolumeData(reportData.tickets);
    }
  }, [reportData]);
  return (
    <div
      className={`${sharedClasses.card} ${sharedClasses.ticketVolumeContainer} ${classes.ticketVolumeOuterContainer}`}
    >
      <p className={sharedClasses.ticketVolumeContainerHeader}>Ticket volume</p>
      <div
        className={`${sharedClasses.ticketVolumeContainerInfo} ${classes.ticketVolumeContainerInfoStyleChange}`}
      >
        {ticketVolumeInfo.map((ticket) => (
          <div className={sharedClasses.ticketVolumeContainerInfoSingle}>
            <p className={sharedClasses.ticketVolumeContainerInfoValue}>
              {ticket.value}
            </p>
            <CustomProgressBar backgroundColor={ticket.color}>
              <ProgressBar
                progress={
                  ticket.label === "Total Tickets"
                    ? ticketVolumeInfo[0].value
                      ? 100
                      : 0
                    : ticket.value
                    ? (ticket.value / ticketVolumeInfo[0].value) * 100
                    : 0
                }
                label={ticket.label}
              />
            </CustomProgressBar>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TicketVolume;
