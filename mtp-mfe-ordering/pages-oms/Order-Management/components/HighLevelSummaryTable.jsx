import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import Loader from "core/Utils/Loader/loader";
import globalStyles from "core/Styles/globalStyles";
import { useNavigate } from "react-router-dom-v5-compat";
import { FormControl, Grid } from "@mui/material";
import { Select, Switch } from "impact-ui-v3";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import classNames from "classnames";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import { isEmpty, cloneDeep } from "lodash";
import { ButtonGroup, Chips } from "impact-ui-v3";
import EmptyStateWrapper from "core/commonComponents/coreComponentScreen/EmptyStateWrapper";
import NormalCalendarFiscalMapping from "core/commonComponents/calendar/normalCalendarFiscalMapping";
import { getTenantTimeZoneDetails } from "core/commonComponents/coreComponentScreen/utils";
import { RadioButtonGroup } from "impact-ui-v3";
import moment from "moment";

import { ORDER_MANAGEMENT_MATRIX_SUMMARY } from "modules/oms/constants-oms/routeConstants";
import {
  ERROR_MESSAGE,
  SELECT_FILTERS_MESSAGE,
  OMS_HIGH_LEVEL_SUMMARY_TAB_LIST,
  OMS_HIGH_LEVEL_SUMMARY_ROQ_DATE_OPTIONS,
  TENANT_DATE_FORMAT,
  TABLE_COLUMN_GROUPING_EXTRA,
} from "modules/oms/constants-oms/stringConstants";
import {
  getOmsHighLevelSummaryTableData,
  setOmsHighLevelSummaryTableLoader,
  getOmsHighLevelSummaryTableConfig,
  setOmsHighLevelSummaryConfigLoader,
  setHighLevelSummaryState,
  setRedirectionDetails,
  getMaxEditableReceiptDate,
  setMaxEditableReceiptDate,
  setMaxEditableReceiptDateLoader,
} from "modules/oms/services-oms/Order-Management/order-management-service";

const RIGHT_LABEL_SWITCH = "Units";
const LEFT_LABEL_SWITCH = "Cost";

const MONTH_WEEK_TAB_DATERANGE_STYLE = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: "1rem",
  width: "100%",
};

const WHITE_CONTAINER_STYLE = {
  backgroundColor: "#FFFFFF",
  borderRadius: "13px",
  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
  border: "1px solid #e0e0e0",
  overflow: "hidden",
  width: "100%",
  boxSizing: "border-box",
  padding: "16px",
  paddingBottom: "0px",
};

const HighLevelSummaryTable = ({
  selectedMonthTab,
  selectedRoqDateOption,
  ...props
}) => {
  const globalClasses = globalStyles();
  const classes = useStyles();

  const navigate = useNavigate();

  const { tenantDateFormat } = getTenantTimeZoneDetails();
  const DATE_FORMAT = tenantDateFormat || TENANT_DATE_FORMAT;

  const VIEWBY_DROPDOWN_OPTIONS = props?.viewByHierarchyOptions || [];

  const DEFAULT_VIEW_BY_OPTION =
    props?.screenConfig?.default_selected_view_by_option;

  const SHOW_UNITS_COST_SWITCH =
    props?.screenConfig?.show_units_cost_switch || false;

  const SHOW_WEEK_DATE_RANGE =
    props?.screenConfig?.show_week_date_range || false;

  const VALUES_DISABLING_DATE_RANGE = props?.screenConfig
    ?.week_range_disabling_values || ["month", "three_months", "six_months"];

  const SHOW_ROQ_DATE_OPTIONS =
    props.screenConfig?.show_roq_date_options || false;

  const ROQ_DATE_TAB_OPTIONS =
    props?.screenConfig?.roq_date_options ||
    OMS_HIGH_LEVEL_SUMMARY_ROQ_DATE_OPTIONS;

  const TAB_LIST_OPTIONS =
    props?.screenConfig?.tab_list || OMS_HIGH_LEVEL_SUMMARY_TAB_LIST;

  const [tableColumns, setTableColumns] = useState([]);
  const [render, setRender] = useState(false);

  const [metricTypeChecked, setMetricTypeChecked] = useState(true);

  const [selectedRoqDateTab, setSelectedRoqDateTab] = useState(
    selectedRoqDateOption || "roq_placement_date"
  );

  const [currentViewByOptions, setCurrentViewByOptions] = useState(
    VIEWBY_DROPDOWN_OPTIONS
  );
  const [selectedViewByOptions, setSelectedViewByOptions] = useState(
    props?.highLevelSummaryState?.selectedViewByOptions
      ? props?.highLevelSummaryState?.selectedViewByOptions
      : DEFAULT_VIEW_BY_OPTION || VIEWBY_DROPDOWN_OPTIONS[0]
  );
  const [isOpenViewBy, setIsOpenViewBy] = useState(false);

  const [selectedDate, setSelectedDate] = useState({
    fiscalInfoStartDate: null,
    fiscalInfoEndDate: null,
  });
  const [isDateRangeDisabled, setIsDateRangeDisabled] = useState(false);
  const [selectionRangeForDate, setSelectionRangeForDate] = useState(8);
  const [fiscalDates, setFiscalDates] = useState({});
  const selectedDateRef = useRef(selectedDate);

  const tableInstance = useRef({});

  const checkForEditability = (columnsDef) => {
    try {
      let updatedColumnsDef = cloneDeep(columnsDef);
      updatedColumnsDef = updatedColumnsDef.map((item) => {
        if (item.extra?.is_grouping_key) {
          item.cellRenderer = "agGroupCellRenderer";
          if (item.type === "link") {
            item.rowGroup = true;
            item.cellRendererParams = {
              suppressCount: true,
              innerRenderer: (params, extraProps) => (
                <CellRenderers
                  cellData={params}
                  column={item}
                  extraProps={extraProps}
                  actions={null}
                ></CellRenderers>
              ),
            };
          }
        }
        return item;
      });
      return updatedColumnsDef;
    } catch (err) {
      displaySnackMessages("Something went wrong", "error");
      return [];
    }
  };

  //Remove Local Storage Data of Redirection on Component Mount
  useEffect(() => {
    localStorage.removeItem("isRedirectedFromDashboardToOms");
    localStorage.removeItem("redirect_filter_level");
    localStorage.removeItem("selectedFiltersDependency");
  }, []);

  useEffect(() => {
    const fetchMaxEditableReceiptDate = async () => {
      try {
        if (selectedRoqDateTab === "roq_receipt_date") {
          props.setMaxEditableReceiptDateLoader(true);
          const response = await props.getMaxEditableReceiptDate();
          if (
            response?.data?.status &&
            response?.data?.data?.max_editable_expected_receipt_date
          ) {
            props.setMaxEditableReceiptDate(
              response.data.data.max_editable_expected_receipt_date
            );
          }
          props.setMaxEditableReceiptDateLoader(false);
        }
      } catch (error) {
        console.log("Error fetching max editable receipt date", error);
        props.setMaxEditableReceiptDateLoader(false);
      }
    };

    fetchMaxEditableReceiptDate();
  }, [
    selectedRoqDateTab,
    props.setMaxEditableReceiptDateLoader,
    props.getMaxEditableReceiptDate,
    props.setMaxEditableReceiptDate,
  ]);

  //To Update table columns and data based on selected view by options
  useEffect(() => {
    props?.setHighLevelSummaryState({
      level_of_hierarchy_label: selectedViewByOptions?.label,
      level_of_hierarchy_id: selectedViewByOptions?.value,
      level_of_hierarchy_value: "",
      selectedViewByOptions: selectedViewByOptions,
      selectedRoqDateTab: selectedRoqDateTab,
      selected_start_week_date: fiscalDates?.start_fw,
      selected_end_week_date: fiscalDates?.end_fw,
    });
    setRender(false);
  }, [
    selectedViewByOptions,
    selectedMonthTab,
    metricTypeChecked,
    selectedRoqDateTab,
    fiscalDates?.start_fw,
    fiscalDates?.end_fw,
  ]);

  //Checks if Calendar Range Picker is disabled
  useEffect(() => {
    setFiscalDates({});
    setSelectedDate(undefined);

    const selectedTabDetails = TAB_LIST_OPTIONS?.filter(
      (tab) => tab?.value === selectedMonthTab
    )?.[0];
    const totalColumnWeeks = selectedTabDetails?.week_count
      ? 8 * selectedTabDetails.week_count
      : 8;

    if (VALUES_DISABLING_DATE_RANGE?.includes(selectedMonthTab)) {
      setIsDateRangeDisabled(true);
    } else {
      setIsDateRangeDisabled(false);
      setSelectionRangeForDate(totalColumnWeeks);
    }
  }, [selectedMonthTab]);

  useEffect(() => {
    if (!isEmpty(props.selectedFilters)) setRender(false);
  }, [props.selectedFilters]);

  //Navigates to Matrix Summary Page on Click of a Column
  const onClickColumn = async (data) => {
    try {
      props?.setHighLevelSummaryState({
        level_of_hierarchy_label: selectedViewByOptions?.label,
        level_of_hierarchy_id: selectedViewByOptions?.value,
        level_of_hierarchy_value: data?.[selectedViewByOptions?.value],
        selectedViewByOptions: selectedViewByOptions,
        selectedRoqDateTab: selectedRoqDateTab,
      });
      const redirectDetails = {
        source: "high_level_summary",
        target: "matrix_summary",
      };
      if (props?.dateFilters?.length) {
        redirectDetails.dateFilters = props?.dateFilters;
      } else {
        redirectDetails.dateFilters =
          props?.redirectionDetails?.dateFilters || [];
      }
      props?.setRedirectionDetails(redirectDetails);
      navigate(ORDER_MANAGEMENT_MATRIX_SUMMARY);
    } catch (error) {
      console.log("Error in onClickColumn", error);
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  //Fetch Table Columns based on selected filters
  useEffect(() => {
    const fetchColumnConfig = async () => {
      try {
        props.setOmsHighLevelSummaryConfigLoader(true);
        const dateFilter = selectedMonthTab;
        const metricType = metricTypeChecked
          ? RIGHT_LABEL_SWITCH.toLowerCase()
          : LEFT_LABEL_SWITCH.toLowerCase();

        const queryParams = `date_filter=${dateFilter}&metric_type=${metricType}&selected_hierarchy=${selectedViewByOptions?.value}`;
        const dateRangeQueryParams = `start_fiscal_week=${fiscalDates?.start_fw}`;
        const totalQueryParams =
          SHOW_WEEK_DATE_RANGE && fiscalDates?.start_fw
            ? `${queryParams}&${dateRangeQueryParams}`
            : queryParams;
        let columns = await props.getOmsHighLevelSummaryTableConfig(
          totalQueryParams
        );

        const viewByColumnNames = VIEWBY_DROPDOWN_OPTIONS?.map(
          (option) => option.value
        );

        //Display the columns based on the show_sublevels_hierarchy_columns flag
        let cols = [];
        if (props?.screenConfig?.show_sublevels_hierarchy_columns) {
          //Show the selectedViewByOptions column and its sublevels in the table
          const selectedViewByOptionLevel = selectedViewByOptions?.level;
          const hierarchGroupingColumn = columns?.data?.data.filter((item) => {
            return item.column_name === "hierarchy_info";
          });
          hierarchGroupingColumn[0].sub_headers = [];
          hierarchGroupingColumn[0].is_hidden = true;

          cols = columns?.data?.data.map((item) => {
            if (viewByColumnNames.includes(item.column_name)) {
              const currentColumnLevel = VIEWBY_DROPDOWN_OPTIONS.find(
                (option) => option.value === item.column_name
              )?.level;
              if (currentColumnLevel === selectedViewByOptionLevel) {
                item.is_hidden = false;
              } else if (currentColumnLevel < selectedViewByOptionLevel) {
                item.is_hidden = true;
                item.is_editable = false;
                item.type = "str";
                const subItem = cloneDeep(item);
                if (hierarchGroupingColumn && hierarchGroupingColumn.length) {
                  hierarchGroupingColumn[0].is_hidden = false;
                  if (hierarchGroupingColumn[0].sub_headers.length) {
                    subItem.extra = {
                      ...subItem.extra,
                      ...TABLE_COLUMN_GROUPING_EXTRA,
                    };
                  }
                  subItem.is_hidden = false;
                  subItem.child_tc_mapping_code =
                    hierarchGroupingColumn[0]?.tc_mapping_code;
                  hierarchGroupingColumn[0].sub_headers.push(subItem);
                }
              } else {
                item.is_hidden = true;
              }
            }
            item.onClick = (tableInfo) => {
              onClickColumn(tableInfo?.cellData?.data || {});
            };
            return item;
          });
        } else {
          //Show only the selectedViewByOptions column in the table
          cols = columns?.data?.data.filter((item) => {
            if (viewByColumnNames.includes(item.column_name)) {
              if (item.column_name === selectedViewByOptions?.value)
                item.is_hidden = false;
              else {
                item.is_hidden = true;
                return false;
              }
            }
            item.onClick = (tableInfo) => {
              onClickColumn(tableInfo?.cellData?.data || {});
            };
            return true;
          });
        }

        let formattedColumns = agGridColumnFormatter(
          cols,
          null,
          null,
          null,
          null,
          null,
          null,
          true
        );

        let updatedColumns = checkForEditability(formattedColumns);

        setTableColumns(updatedColumns);
        setRender(true);
        props.setOmsHighLevelSummaryConfigLoader(false);
      } catch (error) {
        console.log("Error in Fetching Columns", error);
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };

    if (props?.selectedFilters?.length > 0 && !render) {
      fetchColumnConfig();
    }
  }, [render]);

  const manualCallBack = async (manualbody, pageIndex, params) => {
    try {
      //OMS Dashboard Filters
      const appliedOmsFilters =
        props?.omsFilterConfiguration?.length === 0 ||
        !props?.omsFilterConfiguration
          ? props?.selectedFilters
          : props?.omsFilterConfiguration;

      if (appliedOmsFilters?.length === 0) {
        displaySnackMessages(SELECT_FILTERS_MESSAGE, "error");
        props.setOmsHighLevelSummaryTableLoader(false);
        return { data: [], totalCount: 0 };
      }
      const appliedOmsProductFilters = appliedOmsFilters?.filter(
        (filter) =>
          filter.display_type !== "fiscalCalendar" &&
          filter.filter_id !== "fiscal_date_range" &&
          filter.filter_id !== "fiscal_date_range_receipt"
      );
      let appliedOmsDateFilters = [];
      if (props?.ropDate?.start_date && props?.ropDate?.end_date) {
        appliedOmsDateFilters.push(props?.ropDate);
      }
      if (
        props?.recommRecieptDate?.start_date &&
        props?.recommRecieptDate?.end_date
      ) {
        appliedOmsDateFilters.push(props?.recommRecieptDate);
      }

      props?.setOmsHighLevelSummaryTableLoader(true);

      let body = {
        filters: [...appliedOmsProductFilters],
        global_date_filter: [...appliedOmsDateFilters],
        meta: { ...manualbody, limit: { limit: 10, page: pageIndex + 1 } },
        selected_hierarchy: selectedViewByOptions?.value,
        metric_type: metricTypeChecked
          ? RIGHT_LABEL_SWITCH.toLowerCase()
          : LEFT_LABEL_SWITCH.toLowerCase(),
        date_filter: selectedMonthTab,
      };
      if (SHOW_WEEK_DATE_RANGE) {
        body["start_fiscal_week"] = fiscalDates?.start_fw;
        // body["start_fiscal_date"] = fiscalDates?.start_fw;
        // body["end_fiscal_date"] = fiscalDates?.end_fw;
      }
      if (SHOW_ROQ_DATE_OPTIONS) {
        body["roq_date_option"] = selectedRoqDateTab;
      }

      let response = await props.getOmsHighLevelSummaryTableData(body);
      if (response?.data?.status) {
        let formatedData = agGridRowFormatter(response.data.data);
        props.setOmsHighLevelSummaryTableLoader(false);
        return { data: formatedData, totalCount: response?.data?.total };
      } else {
        props.setOmsHighLevelSummaryTableLoader(false);
        return { data: [], totalCount: 0 };
      }
    } catch (error) {
      console.log("Error in fetching Data", error);
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setOmsHighLevelSummaryTableLoader(false);
    }
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const loadTableInstance = (params) => {
    tableInstance.current = params;
  };

  //To Handle Switch Button between Units and Cost
  const onKpiSummarySelectChange = (event) => {
    let userSelection = event.target.checked;
    if (userSelection) setMetricTypeChecked(true);
    else setMetricTypeChecked(false);
  };

  //To Handle Date Range Picker
  const handleDateRangeChange = (dates) => {
    setSelectedDate(dates);
    selectedDateRef.current = dates;
  };

  //Handles the Apply Button on Calendar
  const onDateRangePickerApply = () => {
    const currentDates = selectedDateRef.current;
    if (currentDates?.fiscalInfoStartDate !== null) {
      const fiscalDateValue = {
        start_fw: currentDates?.fiscalInfoStartDate?.fiscal_year_week,
        end_fw: currentDates?.fiscalInfoEndDate?.fiscal_year_week,
      };
      console.log("fiscalDates", fiscalDateValue);
      setFiscalDates({ ...fiscalDateValue });
    }
  };

  const handleRoqDateTabChange = (event, newValue) => {
    setSelectedRoqDateTab(newValue);
  };

  const isOutsideRange = (date) => {
    if (selectedRoqDateTab === "roq_placement_date") {
      let weekLimit = 26 * 7 - 1;
      let weekStartDay = moment().startOf("week");
      let weekEndDay = moment().endOf("week").day(weekLimit);
      return !moment(date).isBetween(weekStartDay, weekEndDay, undefined, "[]");
    } else if (selectedRoqDateTab === "roq_receipt_date") {
      const maxEditableReceiptDate = props?.maxEditableReceiptDate;

      if (maxEditableReceiptDate) {
        let maxReceiptWeekEnd = moment(maxEditableReceiptDate).endOf("week");
        let currentWeekStart = moment().startOf("week");
        return !moment(date).isBetween(
          currentWeekStart,
          maxReceiptWeekEnd,
          undefined,
          "[]"
        );
      }
    }

    return false;
  };

  const getTopRightOptions = () => {
    let options = [];

    //Units and Cost Switch
    if (SHOW_UNITS_COST_SWITCH) {
      options.push(
        <FormControl style={{ transform: "translateX(15px)" }}>
          <RadioButtonGroup
            aria-label="costUnitsSwitch"
            name="costUnitsSwitch"
            orientation="row"
            id="costUnitsSwitch"
            onChange={(e) => {
              setMetricTypeChecked(
                e.target.value === RIGHT_LABEL_SWITCH.toLowerCase()
              );
            }}
            selectedOption={
              metricTypeChecked
                ? RIGHT_LABEL_SWITCH.toLowerCase()
                : LEFT_LABEL_SWITCH.toLowerCase()
            }
            options={[
              {
                label: LEFT_LABEL_SWITCH,
                value: LEFT_LABEL_SWITCH.toLowerCase(),
              },
              {
                label: RIGHT_LABEL_SWITCH,
                value: RIGHT_LABEL_SWITCH.toLowerCase(),
              },
            ]}
          />
        </FormControl>
      );
    }

    return options;
  };

  // IMP: To be removed later once config is updated
  function convertToShortMonthLabels(arr) {
    return arr.map((item) => {
      const value = item.value; // e.g. "three_months"
      const match = value.match(
        /(\d+)|one|two|three|four|five|six|seven|eight|nine|ten/
      );

      // convert words → numbers
      const wordToNum = {
        one: 1,
        month: 1,
        two: 2,
        three: 3,
        four: 4,
        five: 5,
        six: 6,
        seven: 7,
        eight: 8,
        nine: 9,
        ten: 10,
      };

      let num;

      if (match) {
        const key = match[0];
        num = wordToNum[key] || parseInt(key, 10);
      }

      return {
        ...item,
        label: item.value == "month" ? "1M" : num ? `${num}M` : item.label, // fallback if cannot parse
      };
    });
  }

  //Display the Month View (1M, 3M, 6M) in the center only if it does not have a Week View and the Flexible Timeline.
  const getTopLeftOptions = () => {
    if (!SHOW_WEEK_DATE_RANGE && !SHOW_ROQ_DATE_OPTIONS) {
      return (
        <ButtonGroup
          selectedOption={selectedMonthTab}
          exclusive
          onChange={props?.handleMonthTab}
          aria-label="text alignment"
          options={convertToShortMonthLabels(TAB_LIST_OPTIONS)}
        />
      );
    }
    return null;
  };

  const getMonthWeekDateRangeView = () => {
    let options = [];

    options.push(
      <ButtonGroup
        selectedOption={selectedMonthTab}
        exclusive
        onChange={props?.handleMonthTab}
        aria-label="text alignment"
        options={convertToShortMonthLabels(TAB_LIST_OPTIONS)}
      />
    );

    if (SHOW_WEEK_DATE_RANGE) {
      options.push(
        <div className={globalClasses.flexRow}>
          <NormalCalendarFiscalMapping
            disablePastWeeks={true}
            disableOutSideFiscalRange={false}
            showDefaultLabel={false}
            maxOneWeekSelection={true}
            maxEightWeekSelection={true}
            displayRow={true}
            resetOptions={true}
            fiscalCalendarData={props?.fiscalCalendarDetails}
            selectionRange={selectionRangeForDate}
            disabled={isDateRangeDisabled}
            selectedDate={selectedDate}
            onDateChange={handleDateRangeChange}
            onPrimaryButtonClick={() => onDateRangePickerApply()}
            isOutsideRange={isOutsideRange}
          />
        </div>
      );
    }

    // Temporary array for last 2 options
    let rightSideOptions = [];

    // View By Dropdown
    if (VIEWBY_DROPDOWN_OPTIONS?.length > 0) {
      rightSideOptions.push(
        <FormControl
          key="viewby"
          size="small"
          sx={{ minWidth: 240 }}
          className={classNames(
            classes.flexRow,
            globalClasses.verticalAlignCenter
          )}
        >
          <label className={globalClasses.extraButtonStyle}>View By</label>
          <Select
            id="viewBySelection"
            currentOptions={currentViewByOptions}
            setCurrentOptions={setCurrentViewByOptions}
            initialOptions={VIEWBY_DROPDOWN_OPTIONS}
            selectedOptions={selectedViewByOptions}
            setSelectedOptions={setSelectedViewByOptions}
            isOpen={isOpenViewBy}
            setIsOpen={setIsOpenViewBy}
          />
        </FormControl>
      );
    }

    // ROQ Chips
    if (SHOW_ROQ_DATE_OPTIONS) {
      rightSideOptions.push(
        <div
          key="roqchips"
          style={{
            display: "flex",
            gap: "0.5rem",
          }}
        >
          {ROQ_DATE_TAB_OPTIONS.map((option) => (
            <Chips
              key={option.value}
              isActive={selectedRoqDateTab === option.value}
              label={option.label}
              onClick={() => handleRoqDateTabChange(null, option.value)}
              type="single"
            />
          ))}
        </div>
      );
    }

    // Wrap last 2 blocks inside a container div **if not empty**
    if (rightSideOptions.length > 0) {
      options.push(
        <div
          key="right-side-wrapper"
          className={globalClasses.flexRow}
          style={{
            gap: "1rem",
            alignItems: "center",
            flexGrow: 1,
            justifyContent: "flex-end",
          }}
        >
          {rightSideOptions}
        </div>
      );
    }

    return options;
  };

  const getTableHeader = () => {
    if (SHOW_ROQ_DATE_OPTIONS) {
      let selectedOption = ROQ_DATE_TAB_OPTIONS?.find(
        (option) => option.value === selectedRoqDateTab
      );
      return selectedOption?.label;
    } else {
      return "High Level Summary";
    }
  };

  return (
    <>
      <div style={WHITE_CONTAINER_STYLE}>
        <div
          style={{ justifyContent: "space-between", paddingBottom: "16px" }}
          className={globalClasses.flexRow}
        >
          {(SHOW_ROQ_DATE_OPTIONS || SHOW_WEEK_DATE_RANGE) && (
            <div style={MONTH_WEEK_TAB_DATERANGE_STYLE}>
              {getMonthWeekDateRangeView()}
            </div>
          )}
          {getTopLeftOptions()}
        </div>
        <div>
          <Loader
            loader={props.omsHighLevelSummaryConfigLoader}
            minHeight={"260px"}
          >
            {render && (
              <>
                {tableColumns?.length ? (
                  <AgGridComponent
                    columns={tableColumns}
                    manualCallBack={(body, pageIndex, params) =>
                      manualCallBack(body, pageIndex, params)
                    }
                    selectAllHeaderComponent={false}
                    hideSelectAllRecords={false}
                    loadTableInstance={loadTableInstance}
                    rowModelType="serverSide"
                    serverSideStoreType="partial"
                    cacheBlockSize={10}
                    uniqueRowId={selectedViewByOptions?.value}
                    pagination={true}
                    suppressClickEdit={true}
                    hideChildSelection={true}
                    showSetAll={false}
                    purgeClosedRowNodes={true}
                    suppressAggFuncInHeader={true}
                    groupDisplayType={"custom"}
                    treeData={true}
                    childKey={"status_obj"}
                    tableHeader={getTableHeader()}
                    topRightOptions={getTopRightOptions()}
                    autoSizeDebounce
                  />
                ) : (
                  <div className={globalClasses.centerAlign}>
                    <EmptyStateWrapper />
                  </div>
                )}
              </>
            )}
          </Loader>
        </div>
      </div>
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    omsHighLevelSummaryConfigLoader:
      store.omsReducer.orderManagementService.omsHighLevelSummaryConfigLoader,
    omsHighLevelSummaryTableLoader:
      store.omsReducer.orderManagementService.omsHighLevelSummaryTableLoader,
    selectedFilters: store.omsReducer.orderManagementService.selectedFilters,
    screenConfig:
      store.omsReducer.orderingCommonService.orderingScreensConfig
        ?.oms_dashboard?.high_level_summary,
    omsFilterConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "orderManagementFilterConfiguration"
      ]?.appliedFilterData?.dependencyData,
    highLevelSummaryState:
      store.omsReducer.orderManagementService.highLevelSummaryState,
    redirectionDetails: store.omsReducer.orderManagementService.redirectDetails,
    maxEditableReceiptDate:
      store.omsReducer.orderManagementService.maxEditableReceiptDate,
    maxEditableReceiptDateLoader:
      store.omsReducer.orderManagementService.maxEditableReceiptDateLoader,
    viewByHierarchyOptions:
      store.omsReducer.orderManagementService.viewByHierarchyOptions,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setOmsHighLevelSummaryConfigLoader: (payload) =>
    dispatch(setOmsHighLevelSummaryConfigLoader(payload)),
  getOmsHighLevelSummaryTableConfig: (payload) =>
    dispatch(getOmsHighLevelSummaryTableConfig(payload)),
  setOmsHighLevelSummaryTableLoader: (payload) =>
    dispatch(setOmsHighLevelSummaryTableLoader(payload)),
  getOmsHighLevelSummaryTableData: (payload) =>
    dispatch(getOmsHighLevelSummaryTableData(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  setHighLevelSummaryState: (payload) =>
    dispatch(setHighLevelSummaryState(payload)),
  setRedirectionDetails: (payload) => dispatch(setRedirectionDetails(payload)),
  getMaxEditableReceiptDate: () => dispatch(getMaxEditableReceiptDate()),
  setMaxEditableReceiptDate: (payload) =>
    dispatch(setMaxEditableReceiptDate(payload)),
  setMaxEditableReceiptDateLoader: (payload) =>
    dispatch(setMaxEditableReceiptDateLoader(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(HighLevelSummaryTable);
