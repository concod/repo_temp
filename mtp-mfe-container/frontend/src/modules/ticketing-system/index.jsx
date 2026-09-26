import globalStyles from "core/Styles/globalStyles";
import {
  getAllFilters,
  setFilterConfiguration,
} from "core/actions/filterAction";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import {
  formattedFilterConfiguration,
  getFilterElements,
} from "core/commonComponents/coreComponentScreen/utils";
import DateRangePicker from "core/commonComponents/dateRangePicker";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { Select, Button, Switch, Badge, useTranslation } from "impact-ui-v3";
import { cloneDeep, isEmpty, isNull } from "lodash";
import moment from "moment";
import { useEffect, useMemo, useState, useRef } from "react";
import { connect } from "react-redux";
import AsigneeViewTable from "./components/asignee-view-table/asignee-view-table";
import GraphTabsComponent from "./components/graph-tabs-component/graph-tabs-component";
import ModuleViewTable from "./components/module-view-table/module-view-table";
import WeekToDate from "./components/week-to-date/week-to-date";
import {
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
} from "modules/ticketing-system/services/ticketActions";
import { Typography } from "@mui/material";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import { useStyles } from "./styles-ticketing";
import { useLocation, useNavigate } from "react-router-dom-v5-compat";
import TicketInfoCard from "./components/TicketInfoCard";
import './ticketing-styles.css'

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
  const { t } = useTranslation();
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
  const [statusPanelTop, setStatusPanelTop] = useState(154);
  const analyticsContainerRef = useRef(null);
  const navigate = useNavigate();
  let location = useLocation();

  const [graphUpdated, setGraphUpdated] = useState(false);
  const globalClasses = globalStyles();
  const classes = useStyles({ statusPanelTop });

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
      label: t("ticketing.breadcrumb.home"),
      to: "/home",
    },
    {
      label: t("ticketing.breadcrumb.ticketingSystem"),
      to: "",
    },
  ];
  
  return (
    <>
      <div className={globalClasses.paddingAround}>
        <CoreComponentScreen
          pageLabel={t("ticketing.pageLabel")}
          showPageHeader={true}
          // Filter dashboard props
          showFilterDashboard={true}
          filterConfigKey={"ticketingFilterConfiguration"}
          onApplyFilter={onFilterDashboardClick}
          headerBreadCrumb={<HeaderBreadCrumbs options={routeOptions} />}
          autoApplyEnabled={false}
        />
        <div className={classes.outerContainer}>
          <LoadingOverlay loader={isLoading} spinner>
            <div
              className={classes.analyticsContainer}
              onScroll={() => {
                const {
                  y,
                } = analyticsContainerRef.current.getBoundingClientRect();
                if (Math.ceil(y) !== statusPanelTop) {
                  setStatusPanelTop(Math.ceil(y));
                }
              }}
              ref={analyticsContainerRef}>
              <div className={classes.newCard}>
                <div className={`${classes.stickyDiv} sticky`}>
                  <div
                    className={`${globalClasses.flexRow} ${globalClasses.layoutAlignBetweenCenter} ${classes.stickyDivHeader}`}
                  >
                    <div
                      className={`${globalClasses.flexRow} ${classes.gap24} ${classes.summaryViewHeaderCurrentStateContainer}`}
                    >
                      <div className={`${globalClasses.flexRow}`}>
                        <Typography
                          variant="text"
                          className={`${classes.summarViewTitle}`}
                        >
                          {t("ticketing.summaryView")}
                        </Typography>
                        <Badge
                          color="info"
                          label={
                            isCurrentView ? t("ticketing.currentView") : t("ticketing.historicView")
                          }
                          variant="stroke"
                        />
                      </div>
                    </div>
                    <div className={classes.dateSelection}>
                      <Switch
                        rightLabel={t("ticketing.historicView")}
                        onChange={() => handleCurrentAndHistoricViewSwitch()}
                        value={!isCurrentView}
                        leftLabel={t("ticketing.currentView")}
                      />
                      <div className={classes.separator}></div>

                      <DateRangePicker
                        disableType="disableOnlyFuture"
                        startDate={startDate}
                        endDate={endDate}
                        focusedInput={focusedInput}
                        onDatesChange={onDatesChange}
                        onFocusChange={onFocusChange}
                      />
                      <div className={classes.separator}></div>
                      <Button
                        variant="secondary"
                        onClick={navigateToDetailedView}
                      >
                        {t("ticketing.detailedView")}
                      </Button>
                    </div>
                  </div>
                  {isCurrentView && (
                    <>
                      <div
                        className={`${globalClasses.centerAlign} ${globalClasses.gap} ${classes.ticketVolumeContainer} `}
                      >
                        {ticketVolumeInfo.map((ticket) => (
                          <TicketInfoCard {...ticket} label={t(ticket.labelKey)} />
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <div
                  className={`${classes.graphContainer} ${classes.mainTrendContainer}`}
                >
                  <div
                    className={`${globalClasses.flexRow} ${globalClasses.layoutAlignBetweenCenter}`}
                  >
                    <div
                      className={`${globalClasses.layoutAlignSpaceBetween} ${globalClasses.gap}`}
                    >
                      <Typography
                        className={classes.graphContainerHeader}
                        variant="text"
                      >
                        {t("ticketing.trendAnalysis")}
                      </Typography>
                      {isCurrentView && (
                        <Badge
                          color="success"
                          label={`${
                            closedTicketPercentage ? closedTicketPercentage : ""
                          } ${t("ticketing.ticketsClosed")}`}
                          variant="subtle"
                        />
                      )}
                    </div>
                    <div
                      className={`${globalClasses.layoutAlignSpaceBetween} ${globalClasses.gap}`}
                    >
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
                  </div>
                  <Typography
                    component="p"
                    className={`${classes.chartHeading} ${classes.marginVertical_24}`}
                  >
                    {t("ticketing.ticketVolume")}
                  </Typography>
                  <div className={classes.graphContainerGraph}>
                    {highChartComponent}
                  </div>
                </div>
              </div>

              <GraphTabsComponent reportData={reportData} />
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

          <div className={`${classes.rightPanelInner} right-panel`}>
            <WeekToDate />
            <RecentActivities />
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
