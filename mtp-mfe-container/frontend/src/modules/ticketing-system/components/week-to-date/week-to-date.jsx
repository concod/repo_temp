import LoadingOverlay from "core/Utils/Loader/loader";
import { Select, useTranslation } from "impact-ui-v3";
import { useEffect, useState } from "react";
import {
  getAllDataOfTickets,
  getDefaultDate,
  getPercentageDifference,
  getStartAndEndDateOfAnyWeekFromCurrentYear,
} from "./utils";
import colours from "core/Styles/colours";
import { viewByDropdownOptionsForWeekToDate as viewByDropdownOptions } from "modules/ticketing-system/constants";
import { approveFiltersData } from "modules/ticketing-system/services/ticketActions";
import { useStyles as sharedStyles } from "../../styles-ticketing";
import { useStyles } from "./styles-week-to-date";
import { Typography } from "@mui/material";
import TicketInfoCard from "../TicketInfoCard";

/**
 * WeekToDate is the component where the data of all tickets(according to ViewBy)
 * till this current week will be shown
 * @param {object} props
 * @returns
 */
const WeekToDate = () => {
  const { t } = useTranslation();
  const [isOpenViewByWeektoDate, setIsOpenViewByWeektoDate] = useState(false);
  const [
    currentViewByWeektoDateOptions,
    setCurrentViewByWeektoDateOptions,
  ] = useState(viewByDropdownOptions);
  const [
    selectedViewByWeektoDateOptions,
    setSelectedViewByWeektoDateOptions,
  ] = useState(viewByDropdownOptions[0]);

  const [priorityData, setPriorityData] = useState([]);
  const [statusData, setStatusData] = useState([]);
  const [detailedStatusData, setDetailedStatusData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const sharedClasses = sharedStyles();
  const classes = useStyles();

  /**
   * getData is a function which is preparing the data
   * according to the priority, status and detailedStatus
   * and setting it to thier respective state
   */
  const getData = async () => {
    try {
      setIsLoading(true);
      let payload = {};
      let createdOn = {};
      createdOn = getDefaultDate();
      payload.created_on = createdOn;
      let apiPayload = {
        filters: payload,
      };
      let response = await approveFiltersData(apiPayload)();
      createdOn = getStartAndEndDateOfAnyWeekFromCurrentYear(
        response.data.data["date-range"],
        1
      );
      payload.created_on = createdOn;
      apiPayload = {
        filters: payload,
      };
      let currentWeekResponse = await approveFiltersData(apiPayload)();

      createdOn = getStartAndEndDateOfAnyWeekFromCurrentYear(
        response.data.data["date-range"],
        2
      );

      payload.created_on = createdOn;

      apiPayload = {
        filters: payload,
      };

      let lastWeekResponse = await approveFiltersData(apiPayload)();

      let allDataOfCurrentWeek = getAllDataOfTickets(
        currentWeekResponse.data.data.tickets
      );

      let allDataOfLastWeek = getAllDataOfTickets(
        lastWeekResponse.data.data.tickets
      );

      let percentageDiff = getPercentageDifference(
        allDataOfCurrentWeek,
        allDataOfLastWeek
      );

      const statusData = [
        {
          labelKey: "ticketing.openTickets",
          configKey: "Open Tickets",
          value: allDataOfCurrentWeek.open,
          percent: percentageDiff.openPercent,
          color: colours.froly,
        },
        {
          labelKey: "ticketing.closedTickets",
          configKey: "Closed Tickets",
          value: allDataOfCurrentWeek.closed,
          percent: percentageDiff.closedPercent,
          color: colours.tradewind,
        },
      ];

      const priorityData = [
        {
          labelKey: "ticketing.emergencyTickets",
          configKey: "Emergency Tickets",
          value: allDataOfCurrentWeek.emergency,
          percent: percentageDiff.emergencyPercent,
          color: colours.apricot,
        },
        {
          labelKey: "ticketing.urgentTickets",
          configKey: "Urgent Tickets",
          value: allDataOfCurrentWeek.urgent,
          percent: percentageDiff.urgentPercent,
          color: colours.creamCan,
        },
        {
          labelKey: "ticketing.normalTickets",
          configKey: "Normal Tickets",
          value: allDataOfCurrentWeek.normal,
          percent: percentageDiff.normalPercent,
          color: colours.jordyBlue,
        },
        {
          labelKey: "ticketing.lowTickets",
          configKey: "Low Tickets",
          value: allDataOfCurrentWeek.low,
          percent: percentageDiff.lowPercent,
          color: colours.fuchsiaPink,
        },
      ];

      const DetailedStatusData = [
        {
          labelKey: "ticketing.inProgress",
          value: allDataOfCurrentWeek["in progress"],
          percent: percentageDiff["in progressPercent"],
          color: colours.yellowGreen,
        },
        {
          labelKey: "ticketing.informationRequested",
          value: allDataOfCurrentWeek["information requested"],
          percent: percentageDiff["information requestedPercent"],
          color: colours.creamCan,
        },
        {
          labelKey: "ticketing.solved",
          value: allDataOfCurrentWeek.solved,
          percent: percentageDiff.solvedPercent,
          color: colours.gallery,
        },
        {
          labelKey: "ticketing.closed",
          value: allDataOfCurrentWeek.closed,
          percent: percentageDiff.closedPercent,
          color: colours.tradewind,
        },
      ];
      setStatusData(statusData);
      setPriorityData(priorityData);
      setDetailedStatusData(DetailedStatusData);
      setIsLoading(false);
    } catch (error) {
      console.error("getData error:", error);
      setIsLoading(false);
    }
  };

  /**
   * This will call getData() function
   * initially and get all data required
   */
  useEffect(() => {
    getData();
  }, []);

  return (
    <LoadingOverlay loader={isLoading} spinner minHeight="0%">
      <div className={` ${classes.weekDateContainer}`}>
        <div className={sharedClasses.flexContainer}>
          <Typography
            variant="text"
            className={classes.weekDateContainerHeader}
          >
            {t("ticketing.weekToDate")}
          </Typography>
          <Select
            label={t("ticketing.select.viewBy")}
            placeholder={t("ticketing.select.viewByPlaceholder")}
            initialOptions={viewByDropdownOptions}
            isOpen={isOpenViewByWeektoDate}
            setIsOpen={setIsOpenViewByWeektoDate}
            currentOptions={currentViewByWeektoDateOptions}
            setCurrentOptions={setCurrentViewByWeektoDateOptions}
            selectedOptions={selectedViewByWeektoDateOptions}
            setSelectedOptions={setSelectedViewByWeektoDateOptions}
            labelOrientation="left"
          />
        </div>
      </div>
      <div className={classes.weekToDateInfoContainer}>
        {selectedViewByWeektoDateOptions.value === "Status" &&
          statusData.map((ticket) => <TicketInfoCard {...ticket} label={t(ticket.labelKey)} showTrend />)}
        {selectedViewByWeektoDateOptions.value === "Priority" &&
          priorityData.map((ticket) => (
            <TicketInfoCard {...ticket} label={t(ticket.labelKey)} showTrend />
          ))}
        {selectedViewByWeektoDateOptions.value === "Detailed Status" &&
          detailedStatusData.map((ticket) => (
            <TicketInfoCard {...ticket} label={t(ticket.labelKey)} showTrend />
          ))}
      </div>
    </LoadingOverlay>
  );
};

export default WeekToDate;
