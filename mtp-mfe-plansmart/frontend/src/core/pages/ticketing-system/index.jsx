import globalStyles from "core/Styles/globalStyles";
import { getAllFilters, setFilterConfiguration } from "core/actions/filterAction";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import {
  formattedFilterConfiguration,
  getFilterElements,
} from "core/commonComponents/coreComponentScreen/utils";
import DateRangePicker from "core/commonComponents/dateRangePicker";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { ProgressBar, Select } from "impact-ui";
import { cloneDeep, isEmpty, isNull } from "lodash";
import moment from "moment";
import { useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import AsigneeViewTable from "./components/asignee-view-table/asignee-view-table";
import GraphTabsComponent from "./components/graph-tabs-component/graph-tabs-component";
import ModuleViewTable from "./components/module-view-table/module-view-table";
import WeekToDate from "./components/week-to-date/week-to-date";
import {
  CustomProgressBar,
  chartData,
  getDefaultDate,
  getFormattedDate,
  getFormattedGraphData,
} from "./utils";
import LoadingOverlay from "core/Utils/Loader/loader";
import colours from "core/Styles/colours";
import { viewByDropdownOptions, viewTypeDropdownOptions } from "./constants";
import { RecentActivities } from "./components/recent-activities/recent-activities";
import {
  approveFiltersData,
  getTicketingFiltersData,
  setTicketingDates,
} from "core/actions/ticketActions";
import { Button } from "@mui/material";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import { useStyles } from "./styles-ticketing";
import { useLocation, useNavigate } from "react-router-dom-v5-compat";

const borderRadius = require("highcharts-border-radius");
borderRadius(Highcharts);

/**
 * TicketingSystem is the page where all the data of the mojo
 * tickets will be shown in a systematic manner using graphs,
 * tables and cards
 * @param {object} props
 * @returns
 */
const TicketingSystem = (props) => {
  /**
   * dropdown states for viewType dropdown
   */
  const [isOpenViewType, setIsOpenViewType] = useState(false);
  const [currentViewTypeOptions, setCurrentViewTypeOptions] = useState(
    viewTypeDropdownOptions
  );
  const [selectedViewTypeOptions, setSelectedViewTypeOptions] = useState(
    viewTypeDropdownOptions[1]
  );

  /**
   * dropdown states for viewBy dropdown
   */
  const [isOpenViewBy, setIsOpenViewBy] = useState(false);
  const [currentViewByOptions, setCurrentViewByOptions] = useState(
    viewByDropdownOptions
  );
  const [selectedViewByOptions, setSelectedViewByOptions] = useState(
    viewByDropdownOptions[0]
  );

  const [reportData, setReportData] = useState({});
  const [graphData, setGraphData] = useState(cloneDeep(chartData));
  const [closedTicketPercentage, setClosedTicketPercentage] = useState(0);

  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [ticketVolumeInfo, setTicketVolumeInfo] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [appliedFilterInfo, setAppliedFilterInfo] = useState({});
  const [filterApplied, setFilterApplied] = useState({});
  const [focusedInput, setFocusedInput] = useState(null);
  const [isCurrentView, setIsCurrentView] = useState(true);
  const navigate = useNavigate();
  let location = useLocation();

  const [graphUpdated, setGraphUpdated] = useState(false);
  const globalClasses = globalStyles();
  const classes = useStyles();

  /**
   * onFilterDashboardClick function is called when we click the apply filter
   * button in the select filter option
   * @param {object} dependencyData
   */
  const onFilterDashboardClick = async (dependencyData) => {
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
    };
    setAppliedFilterInfo(appliedFilterData);
    let applyResponse = await approveFiltersData(apiPayload)();
    let data = getFormattedGraphData(
      applyResponse?.data?.data?.tickets,
      applyResponse?.data?.data["date-range"],
      selectedViewTypeOptions.value,
      selectedViewByOptions.value,
      appliedFilterData
    );
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
    setClosedTicketPercentage(data.closedTicketPercentage);
    setGraphProperties(data.graphData);
    setReportData(applyResponse?.data?.data);
    setIsLoading(false);
  };

  /**
   * setGraphProperties function will update
   * the graphData state and also update graphUpdated
   * state which is used to re-render the graph
   * data
   * @param {object} data
   */
  const setGraphProperties = (data) => {
    setGraphData(data);
    setGraphUpdated((prev) => !prev);
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
  const getReport = async (startDate = null, endDate = null) => {
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
      payload.created_on = createdOn;
      let apiPayload = {
        filters: payload,
      };
      let reportResponse = await approveFiltersData(apiPayload)();
      let data = getFormattedGraphData(
        reportResponse?.data?.data?.tickets,
        reportResponse?.data?.data["date-range"],
        selectedViewTypeOptions.value,
        selectedViewByOptions.value
      );
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
      setClosedTicketPercentage(data.closedTicketPercentage);
      setGraphProperties(data.graphData);
      setReportData(reportResponse?.data?.data);
      setIsLoading(false);
    } catch (error) {
      console.error("getReport error", error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getReport();
  }, []);

  /**
   * if viewType and viewBy value is changed then new values
   * will be setted up for the graph
   */
  useEffect(() => {
    if (Object.keys(reportData).length > 0) {
      let data = getFormattedGraphData(
        reportData?.tickets,
        reportData["date-range"],
        selectedViewTypeOptions.value,
        selectedViewByOptions.value,
        appliedFilterInfo
      );
      setGraphProperties(data.graphData);
    }
  }, [selectedViewTypeOptions, selectedViewByOptions]);

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
      getReport(start, end);
    }
  };
  const onFocusChange = (inp) => {
    setFocusedInput(inp);
  };

  const handleCurrentAndHistoricViewSwitch = () => {
    try {
      if (isCurrentView) {
        setIsCurrentView(false);
        setSelectedViewTypeOptions(viewTypeDropdownOptions[0]);
      } else {
        setIsCurrentView(true);
        setSelectedViewTypeOptions(viewTypeDropdownOptions[1]);
      }
    } catch (error) {
      console.error("handleCurrentAndHistoricViewSwitch error:", error);
    }
  };

  /**
   * navigateToDetailedView function
   * will help us to navigate to
   * detailed view
   */
  const navigateToDetailedView = () => {
    navigate(
      `/ticketing-system/detailed-view/data-id/none/data-category/none`,
      {
        state: {
          prevScr: location.pathname,
        },
      }
    );
  };

  /**
   * used to call setTicketingFilterConfiguration initially
   * to set up the filters
   */
  useEffect(() => {
    setTicketingFilterConfiguration("Organization View");
  }, []);

  useEffect(() => {
    props.setTicketingDates({
      startDate: startDate,
      endDate: endDate,
    });
  }, [startDate, endDate]);

  /**
   * highChartComponent is a chart component
   * which is used with useMemo so that it
   * renders the graph properly when the graph
   * data is updated
   */
  const highChartComponent = useMemo(() => {
    return (
      <HighchartsReact
        highcharts={Highcharts}
        options={graphData}
        key={JSON.stringify(graphData)}
      />
    );
  }, [graphUpdated]);

  const routeOptions = [
    {
      id: "ticketing_system",
      label: "Ticketing System",
      action: () => null,
    },
  ];

  return (
    <>
      <HeaderBreadCrumbs options={routeOptions} />
      <div>
        <div className={classes.outerContainer}>
          <div>
            <div>
              <CoreComponentScreen
                pageLabel={"Ticketing System"}
                showPageHeader={true}
                // Filter dashboard props
                showFilterDashboard={true}
                filterConfigKey={"ticketingFilterConfiguration"}
                onApplyFilter={onFilterDashboardClick}
              />
            </div>
            <LoadingOverlay loader={isLoading} spinner>
              <div className={classes.analyticsContainer}>
                <div className={`${classes.stickyDiv} sticky`}>
                  <div
                    className={`${globalClasses.flexRow} ${globalClasses.layoutAlignBetweenCenter}`}
                  >
                    <div
                      className={`${globalClasses.flexRow} ${classes.gap24} ${classes.summaryViewHeaderCurrentStateContainer}`}
                    >
                      <p className={classes.summaryViewHeader}>
                        Summary view- {isCurrentView ? "Current" : "Historic"}{" "}
                        View
                      </p>
                      <p
                        className={classes.summaryViewCurrentStateValue}
                        onClick={() => handleCurrentAndHistoricViewSwitch()}
                      >
                        {isCurrentView ? "Historic view" : "Current view"}
                      </p>
                    </div>
                    <div className={classes.dateSelection}>
                      <DateRangePicker
                        disableType="disableOnlyFuture"
                        startDate={startDate}
                        endDate={endDate}
                        focusedInput={focusedInput}
                        onDatesChange={onDatesChange}
                        onFocusChange={onFocusChange}
                      />
                      <Button
                        variant="outlined"
                        onClick={navigateToDetailedView}
                      >
                        Detailed View
                      </Button>
                    </div>
                  </div>
                  {isCurrentView && (
                    <div
                      className={`${classes.card} ${classes.ticketVolumeContainer}`}
                    >
                      <p className={classes.ticketVolumeContainerHeader}>
                        Ticket quantity
                      </p>
                      <div className={classes.ticketVolumeContainerInfo}>
                        {ticketVolumeInfo.map((ticket) => (
                          <div
                            className={classes.ticketVolumeContainerInfoSingle}
                          >
                            <p
                              className={classes.ticketVolumeContainerInfoValue}
                            >
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
                                    ? (ticket.value /
                                        ticketVolumeInfo[0].value) *
                                      100
                                    : 0
                                }
                                label={ticket.label}
                              />
                            </CustomProgressBar>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className={classes.card}>
                  <div className={classes.graphContainer}>
                    <div
                      className={`${globalClasses.flexRow} ${globalClasses.layoutAlignBetweenCenter}`}
                    >
                      <div
                        className={`${globalClasses.layoutAlignSpaceBetween} ${globalClasses.gap}`}
                      >
                        <p className={classes.graphContainerHeader}>
                          Trend Analysis
                        </p>
                        {isCurrentView && (
                          <p className={classes.badge}>
                            {closedTicketPercentage}% Of Tickets Closed
                          </p>
                        )}
                      </div>
                      <div
                        className={`${globalClasses.layoutAlignSpaceBetween} ${globalClasses.gap}`}
                      >
                        {/* <Select
                          label={"Data view type"}
                          placeholder={"Select View Type"}
                          initialOptions={viewTypeDropdownOptions}
                          isOpen={isOpenViewType}
                          setIsOpen={setIsOpenViewType}
                          currentOptions={currentViewTypeOptions}
                          setCurrentOptions={setCurrentViewTypeOptions}
                          selectedOptions={selectedViewTypeOptions}
                          setSelectedOptions={setSelectedViewTypeOptions}
                        /> */}
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
                          labelOrientation="left"
                        />
                      </div>
                    </div>
                    <div className={classes.graphContainerGraph}>
                      {highChartComponent}
                    </div>
                  </div>
                </div>
                <GraphTabsComponent reportData={reportData} />
                <hr />
                <div className={classes.tableContainer}>
                  <div
                    className={`${globalClasses.flexColumn} ${globalClasses.gap}`}
                  >
                    <div className={globalClasses.marginBottom}>
                      <AsigneeViewTable reportData={reportData} />
                    </div>
                    <ModuleViewTable reportData={reportData} />
                  </div>
                </div>
              </div>
            </LoadingOverlay>
          </div>

          <div className="right-panel">
            <div className={classes.rightPanelInner}>
              <div>
                <WeekToDate />
              </div>
              <div>
                <RecentActivities />
              </div>
            </div>
          </div>
        </div>
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

export default connect(mapStateToProps, mapDispatchToProps)(TicketingSystem);
