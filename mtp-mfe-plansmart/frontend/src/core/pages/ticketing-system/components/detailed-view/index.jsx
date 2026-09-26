import { Checkbox, FormControlLabel } from "@mui/material";
import globalStyles from "core/Styles/globalStyles";
import LoadingOverlay from "core/Utils/Loader/loader";
import {
  getAllFilters,
  setFilterConfiguration,
} from "core/actions/filterAction";
import {
  approveFiltersData,
  getCheckboxInfo,
  getTicketingFiltersData,
  downloadReport,
} from "core/actions/ticketActions";
import BackIcon from "assets/backIcon.svg";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import {
  formattedFilterConfiguration,
  getFilterElements,
} from "core/commonComponents/coreComponentScreen/utils";
import DateRangePicker from "core/commonComponents/dateRangePicker";
import { cloneDeep, isEmpty, isNull } from "lodash";
import moment from "moment";
import {
  checkBoxOpenStatus,
  openStatus,
} from "core/pages/ticketing-system/constants";
import {
  findIndexOfValueFromArrayOfObjects,
  getDefaultDate,
  getFormattedDate,
  getLast24HoursDateRange,
} from "core/pages/ticketing-system/utils";
import { useEffect, useState } from "react";
import { connect } from "react-redux";
import { useParams } from "react-router";
import DetailedViewTable from "../detailed-view-table/detailed-view-table";
import { useStyles as sharedStyles } from "../../styles-ticketing";
import { useStyles } from "./styles-detailed-view";
import { useLocation, useNavigate } from "react-router-dom-v5-compat";
import { fetchDynamicConfigFromTenantReducer } from "core/Utils/DynamicLabels";
import { Button } from "@mui/material";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import { addSnack } from "core/actions/snackbarActions";
import { TICKETING_APPLY_FILTER_API } from "../../../../../config/api";

/**
 * DetailedView is a component which
 * gives the detailed view of all
 * the tickets in a tabular format
 * @param {object} props
 * @returns
 */
const DetailedView = (props) => {
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState({});
  const [ticketData, setTicketData] = useState([]);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [focusedInput, setFocusedInput] = useState(null);
  const [noOfTickets, setNoOfTickets] = useState(0);
  const [checkboxFilters, setCheckboxFilters] = useState([]);
  const [appliedDataPayload, setAppliedDataPayload] = useState({});
  const [previousPageDataPayload, setPreviousPageDataPayload] = useState({});
  const [updatedOn, setUpdatedOn] = useState({});
  const [ticketIdData, setTicketIdData] = useState([]);
  const globalClasses = globalStyles();
  const navigate = useNavigate();
  let location = useLocation();
  const params = useParams();
  const sharedClasses = sharedStyles();
  const classes = useStyles();
  const [showDownloadBtn, setShowDownloadBtn] = useState(false);
  const [showDownloadLoader, setShowDownloadLoader] = useState(false);
  const [columnData, setColumnData] = useState([]);
  const [gridParams, setGridParams] = useState({});

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  /**
   * onFilterDashboardClick function is called when we click the apply filter
   * button in the select filter option
   * @param {object} dependencyData
   */
  const onFilterDashboardClick = async (dependencyData) => {
    try {
      setIsLoading(true);
      let payload = {};
      if (Object.keys(previousPageDataPayload).length > 0) {
        payload = cloneDeep(previousPageDataPayload);
      }
      dependencyData?.forEach((data) => {
        if (payload.hasOwnProperty(data.attribute_name)) {
          payload[data.attribute_name] = Array.from(
            new Set([...payload[data.attribute_name], ...data.values])
          );
        } else {
          payload[data.attribute_name] = data.values;
        }
      });
      let createdOn;
      if (startDate && endDate) {
        createdOn = getFormattedDate(startDate, endDate);
      } else {
        createdOn = getDefaultDate();
      }
      if (!isEmpty(updatedOn)) {
        payload.updated_on = updatedOn;
      } else {
        payload.created_on = createdOn;
      }
      if (!isEmpty(ticketIdData) && isEmpty(payload?.id)) {
        payload.id = ticketIdData;
      }
      let apiPayload = {
        filters: payload,
      };
      setAppliedDataPayload(payload);
      let applyResponse = await approveFiltersData(apiPayload)();
      setReportData(applyResponse?.data?.data);
      setTicketData(applyResponse?.data?.data?.tickets);
      setIsLoading(false);
    } catch (error) {
      console.error("onFilterDashboardClick error:", error);
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
    let ticketIds = [];
    ticketIds = location?.state?.ticketIds;
    if (
      isEmpty(props.ticketingFilterDashboardConfiguration) ||
      !isEmpty(ticketIds)
    ) {
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
      if (!isEmpty(ticketIds)) {
        ticketingFilterData.data.data.id = ticketIds;
      }
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
    previousPageData = {},
    updatedOn = {},
    ticketIds = []
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
      if (Object.keys(appliedDataPayload).length > 0) {
        payload = appliedDataPayload;
      }
      if (Object.keys(previousPageData).length > 0) {
        payload = previousPageData;
      }
      if (Object.keys(previousPageDataPayload).length > 0) {
        payload = cloneDeep(previousPageDataPayload);
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
      if (!isEmpty(updatedOn)) {
        payload.updated_on = updatedOn;
      } else {
        payload.created_on = createdOn;
      }
      if (!isEmpty(ticketIds)) {
        payload.id = ticketIds;
      }
      if (!isEmpty(ticketIdData)) {
        payload.id = ticketIdData;
      }
      let apiPayload = {
        filters: payload,
      };
      let reportResponse = await approveFiltersData(apiPayload)();
      setReportData(reportResponse?.data?.data);
      setTicketData(reportResponse?.data?.data?.tickets);
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
      getReport(start, end);
    }
  };
  const onFocusChange = (inp) => {
    setFocusedInput(inp);
  };

  const navigateToSummaryView = () => {
    navigate(`/ticketing-system`, {
      state: {
        prevScr: location.pathname,
      },
    });
  };

  /**
   * handleCheckBoxChange is a function
   * used to handle change in checkboxes
   * and call the getReport function to
   * update the data
   * @param {object} e
   * @param {number} index
   */
  const handleCheckBoxChange = (e, index) => {
    try {
      let checkboxValues = cloneDeep(checkboxFilters);
      checkboxValues[index].value = e.target.checked;
      let openIndex = findIndexOfValueFromArrayOfObjects(
        checkboxValues,
        "name",
        "Open"
      );
      checkboxValues[index].value = e.target.checked;
      if (checkboxValues[openIndex].value) {
        checkboxValues.forEach((checkBoxData) => {
          if (
            checkBoxData.name === "In Progress" ||
            checkBoxData.name === "Information Requested" ||
            checkBoxData.name === "Solved"
          ) {
            checkBoxData.disabled = false;
          }
        });
      } else {
        checkboxValues.forEach((checkBoxData) => {
          if (
            checkBoxData.name === "In Progress" ||
            checkBoxData.name === "Information Requested" ||
            checkBoxData.name === "Solved"
          ) {
            checkBoxData.disabled = true;
            checkBoxData.value = false;
          }
        });
      }
      setCheckboxFilters(checkboxValues);
      getReport(startDate, endDate, checkboxValues, {}, updatedOn);
    } catch (error) {
      console.error("handleCheckBoxChange error:", error);
    }
  };

  /**
   * getCheckboxDetails function will get the default
   * checkbox key and value which will be used to
   * display the checkboxes above the table
   */
  const getCheckboxDetails = async () => {
    try {
      const response = await getCheckboxInfo()();
      const data = response?.data?.data[0]?.attribute_value?.values;
      data.forEach((checkboxData, index) => {
        if (
          checkboxData.name === "All Tickets" ||
          checkboxData.name === "Open" ||
          checkboxData.name === "Closed"
        ) {
          checkboxData.disabled = false;
        } else {
          checkboxData.disabled = true;
        }
        checkboxData.index = index;
      });
      if (
        params.category === "total" ||
        params.category === "recent" ||
        params.category === "none"
      ) {
        let allIndex = findIndexOfValueFromArrayOfObjects(
          data,
          "name",
          "All Tickets"
        );
        data[allIndex].value = true;
      } else if (params.category === "open") {
        let openIndex = findIndexOfValueFromArrayOfObjects(
          data,
          "name",
          "Open"
        );
        data[openIndex].value = true;
      } else if (params.category === "closed") {
        let closedIndex = findIndexOfValueFromArrayOfObjects(
          data,
          "name",
          "Closed"
        );
        data[closedIndex].value = true;
      }
      setCheckboxFilters(data);
    } catch (error) {
      console.error("getCheckboxDetails error", error);
    }
  };

  /**
   * used to call setTicketingFilterConfiguration and getCheckboxDetails initially
   * to set up the filters and checkbox details
   */
  useEffect(() => {
    setTicketingFilterConfiguration("Organization View");
    getCheckboxDetails();
    const ticketingConfig = fetchDynamicConfigFromTenantReducer(
      "core",
      "ticketing"
    );
    setShowDownloadBtn(
      Boolean(ticketingConfig?.ticketing_detailed_view_download_csv)
    );
  }, []);

  const downloadHandler = async () => {
    try {
      setShowDownloadLoader(true);
      let filterDependency =
        props.ticketingFilterDashboardConfiguration?.appliedFilterData
          ?.dependencyData || [];
      let filters = {};
      filterDependency?.forEach((filter) => {
        filters[filter["attribute_name"]] = filter?.values;
      });
      let createdOn = {};
      if (startDate && endDate) {
        createdOn = getFormattedDate(startDate, endDate);
      } else {
        createdOn = getDefaultDate();
      }
      if (!isEmpty(updatedOn)) {
        filters.updated_on = updatedOn;
      } else {
        filters.created_on = createdOn;
      }
      let status = [];
      if (checkboxFilters) {
        let continueLoop = true;
        let closeChecked = false;
        let openStatusesOfCheckbox = [];
        checkboxFilters.forEach((detail) => {
          let checkboxName = detail.name?.toLowerCase();
          if (checkBoxOpenStatus.includes(checkboxName) && detail.value) {
            openStatusesOfCheckbox.push(checkboxName);
          }
        });
        checkboxFilters.forEach((detail) => {
          if (detail.value === true) {
            filters.status = [];
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
          filters.status = status;
        } else if (!isEmpty(filters.status) && !closeChecked) {
          filters.status = Array.from(new Set([...filters.status, ...status]));
        } else {
          filters.status = status;
        }
      }
      const columns = columnData?.map((column) => ({
        label: column?.label,
        column_name: column?.column_name,
      }));
      const filterModel = gridParams?.api.getFilterModel();
      const formattedFilterModel = Object.keys(filterModel)?.map((column) => ({
        column: column,
        pattern: filterModel[column].filter,
        search_type: filterModel[column].type,
      }));
      const sortModel = gridParams?.columnApi.getColumnState();
      const formattedSortModel = sortModel
        ?.filter((col) => col.sort !== null)
        ?.map((col) => ({
          column: col.colId,
          order: col.sort,
        }));
      const currentPage = gridParams?.api.paginationGetCurrentPage() + 1;
      const pageSize = gridParams?.api.paginationGetPageSize();
      const offset = (currentPage - 1) * pageSize;
      const metaPayload = {
        search: formattedFilterModel,
        sort: formattedSortModel,
        range: [],
        limit: {
          limit: -1,
          page: currentPage,
          offset: offset,
        },
      };
      const origin = window.location.origin;
      let payload = {
        table_api: `${origin}/api/v2${TICKETING_APPLY_FILTER_API}`,
        table_payload: {
          columns: columns,
          filters: filters,
          meta: metaPayload,
        },
      };
      const response = await downloadReport(payload);
      if (response?.data?.status) {
        displaySnackMessages(
          "Please wait for download notification to be received shortly",
          "success"
        );
      }
      setShowDownloadLoader(false);
    } catch (error) {
      setShowDownloadLoader(false);
      const errMsg = !isEmpty(error?.response?.data.message)
        ? error.response?.data?.message
        : "Something went wrong";
      displaySnackMessages(errMsg, "error");
    }
  };

  /**
   * The below useEffect will be used
   * to display the data in this page
   * according to the params in the
   * current route
   */
  useEffect(() => {
    if (
      !Object.values(params).includes("none") &&
      !Object.values(params).includes("recent")
    ) {
      let category = [];
      if (params.category === "total") {
        category = [];
      } else if (params.category === "open") {
        category = cloneDeep(openStatus);
      } else {
        category = [params.category];
      }
      let previousPageData = {};
      if (isNaN(params.id)) {
        previousPageData = {
          status: category,
          module_name: [params.id],
        };
      } else {
        previousPageData = {
          status: category,
          user_id: [Number(params.id)],
        };
      }
      let startDate = props.summaryDates.startDate;
      let endDate = props.summaryDates.endDate;
      setPreviousPageDataPayload(previousPageData);
      getReport(startDate, endDate, false, previousPageData);
    } else if (Object.values(params).includes("recent")) {
      let dateRange = getLast24HoursDateRange();
      let startDate = moment(dateRange.start_date);
      let endDate = moment(dateRange.end_date);
      let ticketIds = location?.state?.ticketIds;
      setTicketIdData([...ticketIds]);
      setUpdatedOn(dateRange);
      getReport(startDate, endDate, false, {}, dateRange, ticketIds);
    } else {
      let startDate = props.summaryDates.startDate;
      let endDate = props.summaryDates.endDate;
      getReport(startDate, endDate);
    }
  }, []);

  return (
    <div>
      <div>
        <CoreComponentScreen
          pageLabel={"Detailed View"}
          showPageRoute={true}
          showPageHeader={true}
          // Filter dashboard props
          showFilterDashboard={true}
          filterConfigKey={"ticketingFilterConfiguration"}
          onApplyFilter={onFilterDashboardClick}
          contained={true}
        >
          <LoadingOverlay loader={isLoading} spinner>
            <div>
              <div className={sharedClasses.outerContainerDetailedView}>
                <div
                  className={`${globalClasses.flexRow} ${globalClasses.layoutAlignBetweenCenter}`}
                >
                  <p
                    className={`${sharedClasses.mb10} ${sharedClasses.outerContainerDetailedViewHeader}`}
                  >
                    Detailed view :{" "}
                    <span
                      className={
                        sharedClasses.outerContainerDetailedViewHeaderNumber
                      }
                    >
                      {noOfTickets}
                    </span>
                    <span
                      className={
                        sharedClasses.outerContainerDetailedViewHeaderInfo
                      }
                    >
                      {" "}
                      Total Ticket{noOfTickets > 1 ? "s" : ""}
                    </span>
                  </p>
                  <p
                    className={`${globalClasses.flexRow} ${globalClasses.verticalAlignCenter} ${globalClasses.gap} ${sharedClasses.backToPreviousPage}`}
                    onClick={navigateToSummaryView}
                  >
                    <BackIcon viewBox="0 0 20 16" /> <p>Back To Summary view</p>
                  </p>
                </div>

                <div
                  className={`${globalClasses.flexRow} ${globalClasses.layoutAlignBetweenCenter} ${globalClasses.marginTop}`}
                >
                  <div>
                    {checkboxFilters?.slice(0, 1)?.map((filter) => (
                      <FormControlLabel
                        control={
                          <Checkbox
                            defaultChecked
                            checked={filter?.value}
                            onChange={(e) =>
                              handleCheckBoxChange(e, filter.index)
                            }
                            disabled={filter?.disabled}
                          />
                        }
                        label={filter?.name}
                      />
                    ))}
                    <div className={sharedClasses.openCheckboxFieldsContainer}>
                      {checkboxFilters
                        ?.slice(1, checkboxFilters?.length - 1)
                        ?.map((filter) => (
                          <FormControlLabel
                            control={
                              <Checkbox
                                defaultChecked
                                checked={filter?.value}
                                onChange={(e) =>
                                  handleCheckBoxChange(e, filter.index)
                                }
                                disabled={filter?.disabled}
                              />
                            }
                            label={filter?.name}
                          />
                        ))}
                    </div>

                    {checkboxFilters
                      ?.slice(checkboxFilters?.length - 1)
                      ?.map((filter) => (
                        <FormControlLabel
                          control={
                            <Checkbox
                              defaultChecked
                              checked={filter?.value}
                              onChange={(e) =>
                                handleCheckBoxChange(e, filter.index)
                              }
                              disabled={filter?.disabled}
                            />
                          }
                          label={filter?.name}
                        />
                      ))}
                  </div>
                  <div
                    className={`${globalClasses.flexRow} ${globalClasses.gapHalf}`}
                  >
                    {showDownloadBtn && (
                      <Button
                        className={classes.downloadBtn}
                        color="primary"
                        variant="contained"
                        id="ticketingDownloadBtn"
                        size="small"
                        onClick={downloadHandler}
                        title={"Download"}
                        disabled={showDownloadLoader}
                      >
                        <DownloadOutlinedIcon />
                      </Button>
                    )}
                    <DateRangePicker
                      disableType="disableFuture"
                      startDate={startDate}
                      endDate={endDate}
                      focusedInput={focusedInput}
                      onDatesChange={onDatesChange}
                      onFocusChange={onFocusChange}
                    />
                  </div>
                </div>
              </div>
            </div>
          </LoadingOverlay>
          <DetailedViewTable
            tickets={reportData?.tickets}
            setNoOfTickets={setNoOfTickets}
            loader={isLoading}
            setColumnData={setColumnData}
            setGridParams={setGridParams}
          />
        </CoreComponentScreen>
      </div>
    </div>
  );
};

const mapStateToProps = (state) => {
  return {
    ticketingFilterDashboardConfiguration:
      state.filterReducer.filterDashboardConfiguration[
        "ticketingFilterConfiguration"
      ],
    summaryDates: state.ticketingReducer.summaryDates,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    setFilterConfiguration: (filterConfiguration) =>
      dispatch(setFilterConfiguration(filterConfiguration)),
    addSnack: (snack) => dispatch(addSnack(snack)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(DetailedView);
