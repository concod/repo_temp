import LoadingOverlay from "core/Utils/Loader/loader";
import TrendingDown from "assets/trendingDown.svg";
import TrendingUp from "assets/trendingUp.svg";
import CrossCalendar from "assets/crossCalendar.svg";
import { ProgressBar, Select } from "impact-ui";
import { CustomProgressBar } from "core/pages/ticketing-system/utils";
import { useEffect, useState } from "react";
import {
  getAllDataOfTickets,
  getDefaultDate,
  getPercentageDifference,
  getStartAndEndDateOfAnyWeekFromCurrentYear,
} from "./utils";
import colours from "core/Styles/colours";
import { viewByDropdownOptionsForWeekToDate as viewByDropdownOptions } from "core/pages/ticketing-system/constants";
import { approveFiltersData, setIsWeekToDateRowMaximized } from "core/actions/ticketActions";
import { useStyles as sharedStyles } from "../../styles-ticketing";
import { useStyles } from "./styles-week-to-date";
import { useDispatch } from "react-redux";

/**
 * WeekToDate is the component where the data of all tickets(according to ViewBy)
 * till this current week will be shown
 * @param {object} props
 * @returns
 */
const WeekToDate = () => {
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
  const dispatch = useDispatch();

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
          label: "Open Tickets",
          value: allDataOfCurrentWeek.open,
          percent: percentageDiff.openPercent,
          color: colours.froly,
        },
        {
          label: "Closed Tickets",
          value: allDataOfCurrentWeek.closed,
          percent: percentageDiff.closedPercent,
          color: colours.tradewind,
        },
      ];

      const priorityData = [
        {
          label: "Emergency Tickets",
          value: allDataOfCurrentWeek.emergency,
          percent: percentageDiff.emergencyPercent,
          color: colours.apricot,
        },
        {
          label: "Urgent Tickets",
          value: allDataOfCurrentWeek.urgent,
          percent: percentageDiff.urgentPercent,
          color: colours.creamCan,
        },
        {
          label: "Normal Tickets",
          value: allDataOfCurrentWeek.normal,
          percent: percentageDiff.normalPercent,
          color: colours.jordyBlue,
        },
        {
          label: "Low Tickets",
          value: allDataOfCurrentWeek.low,
          percent: percentageDiff.lowPercent,
          color: colours.fuchsiaPink,
        },
      ];

      const DetailedStatusData = [
        {
          label: "In Progress",
          value: allDataOfCurrentWeek["in progress"],
          percent: percentageDiff["in progressPercent"],
          color: colours.yellowGreen,
        },
        {
          label: "Information Requested",
          value: allDataOfCurrentWeek["information requested"],
          percent: percentageDiff["information requestedPercent"],
          color: colours.creamCan,
        },
        {
          label: "Solved",
          value: allDataOfCurrentWeek.solved,
          percent: percentageDiff.solvedPercent,
          color: colours.gallery,
        },
        {
          label: "Closed",
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

  useEffect(() => {
    if(selectedViewByWeektoDateOptions.value === "Priority") {
      dispatch(setIsWeekToDateRowMaximized(true));
    }
    else {
      dispatch(setIsWeekToDateRowMaximized(false));
    }
  },[selectedViewByWeektoDateOptions])

  return (
    <LoadingOverlay loader={isLoading} spinner minHeight="0%">
      <div className={`${sharedClasses.card} ${classes.weekDateContainer}`}>
        <div className={sharedClasses.flexContainer}>
          <div className={classes.flexContainerHeaderIcon}>
            <p className={classes.weekDateContainerHeader}>Week to Date</p>
            <CrossCalendar viewBox="0 0 24 24" />
          </div>
          <Select
            label={"View By"}
            placeholder={"Select View By"}
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
        <div className={classes.weekToDateInfoContainer}>
          {selectedViewByWeektoDateOptions.value === "Status" &&
            statusData.map((ticket) => (
              <div className={sharedClasses.ticketVolumeContainerInfoSingle}>
                <p className={sharedClasses.ticketVolumeContainerInfoValue}>
                  {ticket.value}
                </p>
                <CustomProgressBar backgroundColor={ticket.color}>
                  <ProgressBar progress={ticket.value} label={ticket.label} />
                </CustomProgressBar>
                <div className={classes.ticketVolumeContainerInfoPercentage}>
                  <span
                    className={ticket.percent >= 0 ? "positive" : "negative"}
                  >
                    {isNaN(ticket.percent) ? "0" : Math.abs(ticket.percent)}%
                  </span>
                  <span
                    className={ticket.percent >= 0 ? "positive" : "negative"}
                  >
                    {ticket.percent >= 0 ? (
                      <TrendingUp viewBox="0 0 15 15" />
                    ) : (
                      <TrendingDown viewBox="0 0 15 15" />
                    )}
                  </span>
                  <span
                    className={`text ${ticket.percent >= 0 ? "ml-4" : "ml-5"}`}
                  >
                    Than Last Week
                  </span>
                </div>
              </div>
            ))}
          {selectedViewByWeektoDateOptions.value === "Priority" &&
            priorityData.map((ticket) => (
              <div className={sharedClasses.ticketVolumeContainerInfoSingle}>
                <p className={sharedClasses.ticketVolumeContainerInfoValue}>
                  {ticket.value}
                </p>
                <CustomProgressBar backgroundColor={ticket.color}>
                  <ProgressBar progress={ticket.value} label={ticket.label} />
                </CustomProgressBar>

                <div className={classes.ticketVolumeContainerInfoPercentage}>
                  <span
                    className={ticket.percent >= 0 ? "positive" : "negative"}
                  >
                    {isNaN(ticket.percent) ? "0" : Math.abs(ticket.percent)}%
                  </span>
                  <span
                    className={ticket.percent >= 0 ? "positive" : "negative"}
                  >
                    {ticket.percent >= 0 ? (
                      <TrendingUp viewBox="0 0 15 15" />
                    ) : (
                      <TrendingDown viewBox="0 0 15 15" />
                    )}
                  </span>
                  <span
                    className={`text ${ticket.percent >= 0 ? "ml-4" : "ml-5"}`}
                  >
                    Than Last Week
                  </span>
                </div>
              </div>
            ))}
          {selectedViewByWeektoDateOptions.value === "Detailed Status" &&
            detailedStatusData.map((ticket) => (
              <div className={sharedClasses.ticketVolumeContainerInfoSingle}>
                <p className={sharedClasses.ticketVolumeContainerInfoValue}>
                  {ticket.value}
                </p>
                <CustomProgressBar backgroundColor={ticket.color}>
                  <ProgressBar progress={ticket.value} label={ticket.label} />
                </CustomProgressBar>
                <div className={classes.ticketVolumeContainerInfoPercentage}>
                  <span
                    className={ticket.percent >= 0 ? "positive" : "negative"}
                  >
                    {isNaN(ticket.percent) ? "0" : Math.abs(ticket.percent)}%
                  </span>
                  <span
                    className={ticket.percent >= 0 ? "positive" : "negative"}
                  >
                    {ticket.percent >= 0 ? (
                      <TrendingUp viewBox="0 0 15 15" />
                    ) : (
                      <TrendingDown viewBox="0 0 15 15" />
                    )}
                  </span>
                  <span
                    className={`text ${ticket.percent >= 0 ? "ml-4" : "ml-5"}`}
                  >
                    Than Last Week
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>
    </LoadingOverlay>
  );
};

export default WeekToDate;
