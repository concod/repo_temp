import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import { getAllFilters, setFilterConfiguration } from "core/actions/filterAction";
import {
  approveFiltersData,
  getTicketingFiltersData,
  setTicketingDates,
} from "core/actions/ticketActions";
import {
  formattedFilterConfiguration,
  getFilterElements,
} from "core/commonComponents/coreComponentScreen/utils";
import { connect } from "react-redux";
import { useEffect, useState } from "react";
import { cloneDeep, isEmpty, isNull } from "lodash";
import DateRangePicker from "core/commonComponents/dateRangePicker";
import { getDefaultDate, getFormattedDate } from "../../utils";
import LoadingOverlay from "core/Utils/Loader/loader";
import moment from "moment";
import { useStyles } from "./styles-individual-view";
import { useStyles as sharedStyles } from "../../styles-ticketing";
import TicketVolume from "./components/ticket-volume/ticket-volume";
import RecentActivitiesIndividualView from "./components/recent-activities-individual-view/recent-activities-individual-view";
import IndividualDetailedView from "./components/individual-detailed-view/individual-detailed-view";
import { checkBoxOpenStatus, openStatus } from "../../constants";

const IndividualView = (props) => {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [focusedInput, setFocusedInput] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [filterApplied, setFilterApplied] = useState({});
  const [appliedFilterInfo, setAppliedFilterInfo] = useState({});
  const [checkboxFilters, setCheckboxFilters] = useState([]);
  const [reportData, setReportData] = useState({});
  const [noOfTickets, setNoOfTickets] = useState(0);
  const [tickets, setTickets] = useState([]);
  const classes = useStyles();
  const sharedClasses = sharedStyles();

  /**
   * onFilterDashboardClick function is called when we click the apply filter
   * button in the select filter option
   * @param {object} dependencyData
   */
  const onFilterDashboardClick = async (dependencyData) => {
    try {
      setIsLoading(true);
      let payload = {};
      let appliedFilterData = {};
      dependencyData.forEach((data) => {
        if (data.attribute_name === "status") {
          appliedFilterData.status = data.values;
        }
        payload[data.attribute_name] = data.values;
      });
      let createdOn;
      if (startDate && endDate) {
        createdOn = getFormattedDate(startDate, endDate);
      } else {
        createdOn = getDefaultDate();
      }
      setFilterApplied(cloneDeep(payload));
      payload.created_on = createdOn;
      let apiPayload = {
        filters: payload,
        fetch_for_current_user: true,
      };
      setAppliedFilterInfo(appliedFilterData);
      let applyResponse = await approveFiltersData(apiPayload)();
      setNoOfTickets(applyResponse?.data?.data?.tickets?.length);
      setReportData(applyResponse?.data?.data);
      setTickets(applyResponse?.data?.data?.tickets);
      setIsLoading(false);
    } catch (error) {
      console.error("onFilterDashboardClick error", error);
    }
  };

  /**
   * setTicketingFilterConfiguration function will be called
   * initially to set up the filter configuration's for
   * the "Ticketing" screen, so that the CoreComponentScreen
   * can access that data and display the filter data to us
   * @param {string} screenName
   */
  const setTicketingFilterConfiguration = async (screenName) => {
    if (isEmpty(props.ticketingFilterDashboardConfiguration)) {
      let apiBody = {
        columns: [],
      };
      let response = await getAllFilters(screenName)();
      response.data.data.map((item) => {
        if (item.display_type === "dropdown") {
          apiBody.columns.push(item.column_name);
        }
      });
      const ticketingFilterData = await getTicketingFiltersData(apiBody)();
      const filterElements = getFilterElements(
        response.data.data,
        ticketingFilterData.data.data
      );
      let filterConfigData = [
        {
          filterDashboardData: filterElements,
          isCrossDimensionFilter: false,
          screen_name: screenName,
          disableUamOnApply: true,
        },
      ];
      const filterConfig = formattedFilterConfiguration(
        "ticketingFilterConfiguration",
        filterConfigData,
        screenName
      );
      props.setFilterConfiguration(filterConfig);
    }
  };

  /**
   * in getReport function all of the data required for the current
   * page is setted up, initially if no dates are passed to it
   * by default it will set data for last month's to today's data
   * @param {Date | null} startDate
   * @param {Date | null} endDate
   */
  const getReport = async (
    startDate = null,
    endDate = null,
    checkboxValues = null,
    loadTicketVolume = false
  ) => {
    try {
      setIsLoading(true);
      let payload = {};
      let createdOn = {};
      if (startDate) {
        createdOn = getFormattedDate(startDate, endDate);
      } else {
        createdOn = getDefaultDate();
      }
      setStartDate(startDate ? startDate : moment(createdOn.start_date));
      setEndDate(endDate ? endDate : moment(createdOn.end_date));
      if (!isEmpty(filterApplied)) {
        payload = filterApplied;
      }
      let status = [];
      if (checkboxValues) {
        let continueLoop = true;
        let closeChecked = false;
        let openStatusesOfCheckbox = [];
        checkboxValues.forEach((detail) => {
          let checkboxName = detail.name.toLowerCase();
          if (checkBoxOpenStatus.includes(checkboxName) && detail.value) {
            openStatusesOfCheckbox.push(checkboxName);
          }
        });
        checkboxValues.forEach((detail) => {
          if (detail.value === true) {
            payload.status = [];
            let checkboxName = detail.name.toLowerCase();
            if (checkboxName === "closed") {
              closeChecked = true;
            }
            if (checkboxName === "all tickets") {
              status = [];
              continueLoop = false;
              return;
            } else if (checkboxName === "open" && continueLoop) {
              if (openStatusesOfCheckbox.length > 0) {
                status = cloneDeep(openStatusesOfCheckbox);
              } else {
                status = cloneDeep(openStatus);
              }
            } else if (continueLoop) {
              status = Array.from(
                new Set([...status, detail.name.toLowerCase()])
              );
            }
          }
        });
        if (isEmpty(status)) {
          payload.status = status;
        } else if (!isEmpty(payload.status) && !closeChecked) {
          payload.status = Array.from(new Set([...payload.status, ...status]));
        } else {
          payload.status = status;
        }
      }
      payload.created_on = createdOn;
      let apiPayload = {
        filters: payload,
        fetch_for_current_user: true,
      };
      let reportResponse = await approveFiltersData(apiPayload)();
      if (loadTicketVolume) {
        setReportData(reportResponse?.data?.data);
      }
      setNoOfTickets(reportResponse?.data?.data?.tickets?.length);
      setTickets(reportResponse?.data?.data?.tickets);
      setIsLoading(false);
    } catch (error) {
      console.error("getReport error", error);
      setIsLoading(false);
    }
  };

  /**
   * onDatesChange function is called when dates
   * in the date picker is changed
   * and then getReport function is called here
   * to change the current screen's data according
   * to the changed date's
   * @param {Date} start
   * @param {Date} end
   */
  const onDatesChange = (start, end) => {
    setStartDate(start);
    setEndDate(end);
    if (!(isNull(start) && isNull(end))) {
      getReport(start, end, checkboxFilters, true);
    }
  };

  const onFocusChange = (inp) => {
    setFocusedInput(inp);
  };

  const routeOptions = [
    {
      id: "ticketing_individual_view",
      label: "Individual View",
      action: () => null,
    },
  ];

  /**
   * used to call setTicketingFilterConfiguration initially
   * to set up the filters
   */
  useEffect(() => {
    setTicketingFilterConfiguration("Individual View");
    return () => {};
  }, []);

  useEffect(() => {
    if (!isEmpty(startDate) && !isEmpty(endDate)) {
      getReport(startDate, endDate, checkboxFilters);
    } else {
      getReport(null, null, checkboxFilters, true);
    }
    return () => {};
  }, [checkboxFilters]);

  return (
    <>
      <HeaderBreadCrumbs options={routeOptions} />
      <div className={classes.filterContainer}>
        <CoreComponentScreen
          pageLabel={"Summary View"}
          showPageHeader={true}
          // Filter dashboard props
          showFilterDashboard={true}
          filterConfigKey={"ticketingFilterConfiguration"}
          onApplyFilter={onFilterDashboardClick}
        >
          <div className={classes.date}>
            <DateRangePicker
              disableType="disableOnlyFuture"
              startDate={startDate}
              endDate={endDate}
              focusedInput={focusedInput}
              onDatesChange={onDatesChange}
              onFocusChange={onFocusChange}
            />
          </div>
          <div className={classes.ticketVolumeRecentActivityContainer}>
            {/* {!isLoading &&  */}
            <TicketVolume reportData={reportData} />
            {/* } */}
            <RecentActivitiesIndividualView />
          </div>
          <IndividualDetailedView
            noOfTickets={noOfTickets}
            tickets={tickets}
            isLoading={isLoading}
            checkboxFilters={checkboxFilters}
            setCheckboxFilters={setCheckboxFilters}
          />
          <LoadingOverlay loader={isLoading} spinner></LoadingOverlay>
        </CoreComponentScreen>
      </div>
    </>
  );
};

const mapStateToProps = (state) => {
  return {
    ticketingFilterDashboardConfiguration:
      state.filterReducer.filterDashboardConfiguration[
        "ticketingFilterConfiguration"
      ],
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    setFilterConfiguration: (filterConfiguration) =>
      dispatch(setFilterConfiguration(filterConfiguration)),
    setTicketingDates: (data) => dispatch(setTicketingDates(data)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(IndividualView);
