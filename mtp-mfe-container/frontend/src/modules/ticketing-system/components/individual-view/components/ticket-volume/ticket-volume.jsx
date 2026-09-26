import {
  getTotalNumberOfOpenAndClosedTickets,
} from "modules/ticketing-system/utils";
import { useEffect, useState } from "react";
import { useStyles as sharedStyles } from "../../../../styles-ticketing";
import { useStyles } from "./styles-ticket-volume";
import colours from "core/Styles/colours";
import TicketInfoCard from "../../../TicketInfoCard";
import globalStyles from "core/Styles/globalStyles";
import { useTranslation } from "impact-ui-v3";

const TicketVolume = (props) => {
  const { t } = useTranslation();
  const [ticketVolumeInfo, setTicketVolumeInfo] = useState([]);
  const { reportData } = props;
  const sharedClasses = sharedStyles();
  const globalClasses = globalStyles();
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
          labelKey: "ticketing.totalTicketsLabel",
          configKey: "Total Tickets",
          value: data.total ? data.total : 0,
          color: colours.mariner,
        },
        {
          labelKey: "ticketing.openTickets",
          configKey: "Open Tickets",
          value: data.open ? data.open : 0,
          color: colours.froly,
        },
        {
          labelKey: "ticketing.closedTicket",
          configKey: "Closed Ticket",
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
      className={` ${sharedClasses.ticketVolumeContainer} ${classes.ticketVolumeOuterContainer} ${globalClasses.fullWidth}`}
    >
      <div className={`${globalClasses.centerAlign} ${globalClasses.gap} `}>
        {ticketVolumeInfo.map((ticket) => (
          <TicketInfoCard {...ticket} label={t(ticket.labelKey)} />
        ))}
      </div>
    </div>
  );
};

export default TicketVolume;
