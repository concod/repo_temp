import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import Loader from "core/Utils/Loader/loader";
import globalStyles from "core/Styles/globalStyles";
import { useNavigate } from "react-router-dom-v5-compat";
import { FormControl, Grid, Typography } from "@mui/material";
import { Badge, Select, Switch } from "impact-ui-v3";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import classNames from "classnames";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import { isEmpty, cloneDeep } from "lodash";
import { ButtonGroup, Chips, RadioButtonGroup } from "impact-ui-v3";
import EmptyStateWrapper from "core/commonComponents/coreComponentScreen/EmptyStateWrapper";
import NormalCalendarFiscalMapping from "core/commonComponents/calendar/normalCalendarFiscalMapping";
import { getTenantTimeZoneDetails } from "core/commonComponents/coreComponentScreen/utils";
import moment from "moment";
import { replaceSpecialCharToCharCode } from "core/Utils/functions/utils";

import { ORDER_MANAGEMENT_MATRIX_SUMMARY } from "modules/oms/constants-oms/routeConstants";
import {
  ERROR_MESSAGE,
  SELECT_FILTERS_MESSAGE,
  OMS_HIGH_LEVEL_SUMMARY_TAB_LIST,
  OMS_HIGH_LEVEL_SUMMARY_ROQ_DATE_OPTIONS,
  TENANT_DATE_FORMAT,
  TABLE_COLUMN_GROUPING_EXTRA,
  HIGH_LEVEL_SUMMARY_HIERARCHY_LEGEND,
  HIGH_LEVEL_SUMMARY_NA_NOTE,
  OMS_OM_REDIRECT_DASHBOARD_DCS,
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
import {
  isOmsBudgetFeatureEnabled,
  isOmsBudgetHierarchyBadgeEnabled,
} from "modules/oms/utils-oms/omsBudgetConfig.util.js";

const RIGHT_LABEL_SWITCH = "Units";
const LEFT_LABEL_SWITCH = "Cost";

const MONTH_WEEK_TAB_DATERANGE_STYLE = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: "1rem",
  marginBottom: "1rem",
  padding: "1rem 1rem",
};

const WHITE_CONTAINER_STYLE = {
  backgroundColor: "#FFFFFF",
  borderRadius: "13px",
  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
  border: "1px solid #e0e0e0",
  marginBottom: "1rem",
  overflow: "hidden",
  width: "100%",
  boxSizing: "border-box",
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

  const VIEWBY_DROPDOWN_OPTIONS = props?.viewByDropdownOptions || [];

  const DEFAULT_VIEW_BY_OPTION =
    props?.screenConfig?.default_selected_view_by_option;

  const SHOW_UNITS_COST_SWITCH =
    props?.screenConfig?.show_units_cost_switch || false;

  const SHOW_WEEK_DATE_RANGE =
    props?.screenConfig?.show_week_date_range || false;

  const ORDER_PLACEMENT_WEEKS_LIMIT =
    props?.screenConfig?.order_placement_weeks_limit || 26;

  const VALUES_DISABLING_PLACEMENT_DATE_PICKER = props?.screenConfig
    ?.placement_datepicker_disabling_values || [
    "month",
    "three_months",
    "six_months",
  ];

  const VALUES_DISABLING_RECEIPT_DATE_PICKER =
    props?.screenConfig?.receipt_datepicker_disabling_values || [];

  const SHOW_ROQ_DATE_OPTIONS =
    props.screenConfig?.show_roq_date_options || false;

  const ROQ_DATE_TAB_OPTIONS =
    props?.screenConfig?.roq_date_options ||
    OMS_HIGH_LEVEL_SUMMARY_ROQ_DATE_OPTIONS;

  const TAB_LIST_OPTIONS =
    props?.screenConfig?.tab_list || OMS_HIGH_LEVEL_SUMMARY_TAB_LIST;

  // TAM inv_oms_budget_config.disabled overrides roles-config HLS budget flags.
  const isBudgetFeatureEnabled = isOmsBudgetFeatureEnabled(
    props?.omsBudgetConfig
  );
  const SHOW_BUDGET_METRICS =
    isBudgetFeatureEnabled &&
    (props?.screenConfig?.show_budget_metrics || false);

  const SHOW_HIERARCHY_LABEL =
    isOmsBudgetHierarchyBadgeEnabled(props?.omsBudgetConfig) &&
    (props?.screenConfig?.enable_hierarchy_budge_label || false);

  const [tableColumns, setTableColumns] = useState([]);
  const [subHeaderColumnNames, setSubHeaderColumnNames] = useState([]);
  const [render, setRender] = useState(false);

  const [metricTypeChecked, setMetricTypeChecked] = useState(true);

  const [selectedRoqDateTab, setSelectedRoqDateTab] = useState(
    selectedRoqDateOption ||
      props?.redirectionDetails?.selectedRoqDateTab ||
      "roq_placement_date"
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
  const [selectedRoqDate, setSelectedRoqDate] = useState({
    fiscalInfoStartDate: null,
    fiscalInfoEndDate: null,
  });
  const [
    isDateRangeDisabledForPlacement,
    setIsDateRangeDisabledForPlacement,
  ] = useState(false);
  const [
    isDateRangeDisabledForReceipt,
    setIsDateRangeDisabledForReceipt,
  ] = useState(false);
  const [selectionRangeForDate, setSelectionRangeForDate] = useState(8);
  const [selectionRangeForRoqDate, setSelectionRangeForRoqDate] = useState(8);
  const [fiscalDates, setFiscalDates] = useState({});
  const [roqFiscalDates, setRoqFiscalDates] = useState({});

  const selectedDateRef = useRef(selectedDate);
  const selectedRoqDateRef = useRef(selectedRoqDate);
  const subHeaderColumnNamesRef = useRef([]);

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

  const getBadgeSxForBudgetHierarchy = (budgetHierarchy) => {
    const value = budgetHierarchy != null ? String(budgetHierarchy).trim() : "";
    if (value.toLowerCase() === "mixed") {
      return {
        background: "#EDF7F8 !important",
        "& .MuiChip-label": { color: "#3B898D !important" },
      };
    }
    if (value.toUpperCase() === "NA") {
      return {
        background: "#F2F3F4 !important",
        "& .MuiChip-label": { color: "#5F6673 !important" },
      };
    }
    return {
      background: "#F6EDFD !important",
      "& .MuiChip-label": { color: "#931CE3 !important" },
    };
  };

  const applyHierarchyBadgeToColumns = (
    columns,
    selectedViewBy,
    showHierarchyLabel
  ) => {
    if (!showHierarchyLabel || !selectedViewBy?.value) return columns;
    return columns.map((col) => {
      if (col.column_name !== selectedViewBy?.value) return col;
      const columnWithBadge = { ...col };
      const existingInnerRenderer = col.cellRendererParams?.innerRenderer;
      if (!existingInnerRenderer) return columnWithBadge;
      columnWithBadge.cellRendererParams = {
        ...col.cellRendererParams,
        innerRenderer: (params, extraProps) => {
          const isParentRow = params?.node?.level === 0;
          const content = existingInnerRenderer(params, extraProps);
          if (!isParentRow) return content;
          const rowBudgetHierarchy = params?.data?.budget_hierarchy;
          const badgeLabel =
            rowBudgetHierarchy != null && rowBudgetHierarchy !== ""
              ? String(rowBudgetHierarchy)
              : "-";
          return (
            <div
              ref={(el) => {
                if (el) {
                  const groupValue = el.closest(".ag-group-value");
                  if (groupValue && groupValue instanceof HTMLElement)
                    groupValue.style.flex = "1";
                }
              }}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              {content}
              <div style={{ marginLeft: 8, flexShrink: 0 }}>
                <Badge
                  label={badgeLabel}
                  variant="subtle"
                  size="small"
                  sx={getBadgeSxForBudgetHierarchy(rowBudgetHierarchy)}
                />
              </div>
            </div>
          );
        },
      };
      return columnWithBadge;
    });
  };

  //Remove Local Storage Data of Redirection on Component Mount
  useEffect(() => {
    localStorage.removeItem("isRedirectedFromDashboardToOms");
    localStorage.removeItem("redirect_filter_level");
    localStorage.removeItem("selectedFiltersDependency");
    localStorage.removeItem(OMS_OM_REDIRECT_DASHBOARD_DCS);
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
    const { label: hierarchyLabel, value: hierarchyId } =
      selectedViewByOptions || {};
    const isPlacementDate = selectedRoqDateTab === "roq_placement_date";

    props?.setHighLevelSummaryState({
      level_of_hierarchy_label: hierarchyLabel,
      level_of_hierarchy_id: hierarchyId,
      level_of_hierarchy_value: "",
      selectedViewByOptions: selectedViewByOptions,
      selectedRoqDateTab: selectedRoqDateTab,
      selected_start_week_date: isPlacementDate
        ? fiscalDates?.start_fw
        : roqFiscalDates?.start_fw,
      selected_end_week_date: isPlacementDate
        ? fiscalDates?.end_fw
        : roqFiscalDates?.end_fw,
      applied_filters_for_sublevels_hierarchy: [],
      show_sublevels_hierarchy_columns:
        props?.screenConfig?.show_sublevels_hierarchy_columns,
    });
    setRender(false);
  }, [
    selectedViewByOptions,
    selectedMonthTab,
    metricTypeChecked,
    selectedRoqDateTab,
    fiscalDates?.start_fw,
    fiscalDates?.end_fw,
    roqFiscalDates?.start_fw,
    roqFiscalDates?.end_fw,
  ]);

  //Checks if Calendar Range Picker is disabled
  useEffect(() => {
    setFiscalDates({});
    setRoqFiscalDates({});

    setSelectedDate(undefined);
    setSelectedRoqDate(undefined);
    selectedDateRef.current = undefined;
    selectedRoqDateRef.current = undefined;

    const selectedTabDetails = TAB_LIST_OPTIONS?.filter(
      (tab) => tab?.value === selectedMonthTab
    )?.[0];
    const totalColumnWeeks = selectedTabDetails?.week_count
      ? 8 * selectedTabDetails.week_count
      : null;

    if (selectedRoqDateTab === "roq_placement_date") {
      const isDatePickerDisabled = VALUES_DISABLING_PLACEMENT_DATE_PICKER.includes(
        selectedMonthTab
      );
      setIsDateRangeDisabledForPlacement(isDatePickerDisabled);
      if (!isDatePickerDisabled) {
        setSelectionRangeForDate(totalColumnWeeks);
      }
    } else {
      const isDatePickerDisabled = VALUES_DISABLING_RECEIPT_DATE_PICKER.includes(
        selectedMonthTab
      );
      setIsDateRangeDisabledForReceipt(isDatePickerDisabled);
      if (!selectedTabDetails?.week_count) {
        setSelectionRangeForRoqDate(null);
      } else {
        setSelectionRangeForRoqDate(totalColumnWeeks);
      }
    }
  }, [selectedMonthTab, selectedRoqDateTab]);

  useEffect(() => {
    if (!isEmpty(props.selectedFilters)) setRender(false);
  }, [props.selectedFilters]);

  useEffect(() => {
    subHeaderColumnNamesRef.current = subHeaderColumnNames;
  }, [subHeaderColumnNames]);

  const formatSpecialCharToCharCode = (values) => {
    if (Array.isArray(values)) {
      return values.map((value) => replaceSpecialCharToCharCode(value));
    }
    return [replaceSpecialCharToCharCode(values)];
  };

  //Method creates a list of filters based on the applied filters and the sublevel column names
  const createAppliedOmsProductFilters = (rowData) => {
    const currentSubHeaderColumnNames = subHeaderColumnNamesRef.current || [];
    const {
      appliedOmsFilters,
      appliedOmsProductFilters,
    } = getAppliedOmsFilters();

    if (appliedOmsFilters?.length === 0 || !appliedOmsFilters) return [];

    if (!currentSubHeaderColumnNames?.length) return appliedOmsProductFilters;

    const updatedAppliedFilters = appliedOmsProductFilters.map((filter) => {
      if (
        currentSubHeaderColumnNames.includes(filter.attribute_name) &&
        rowData.hasOwnProperty(filter.attribute_name)
      ) {
        return {
          ...filter,
          values: formatSpecialCharToCharCode(rowData[filter.attribute_name]),
        };
      }
      return filter;
    });

    const existingColumnFilters = new Set(
      updatedAppliedFilters.map((f) => f.attribute_name)
    );

    const subLevelColumnFilters = currentSubHeaderColumnNames
      .filter(
        (columnName) =>
          !existingColumnFilters.has(columnName) &&
          rowData.hasOwnProperty(columnName)
      )
      .map((columnName) => ({
        filter_type: "cascaded",
        attribute_name: columnName,
        operator: "in",
        dimension: "Product",
        values: formatSpecialCharToCharCode(rowData[columnName]),
      }));

    const finalAppliedProductFilters = [
      ...updatedAppliedFilters,
      ...subLevelColumnFilters,
    ];
    return finalAppliedProductFilters;
  };

  //Navigates to Matrix Summary Page on Click of a Column
  const onClickColumn = async (data) => {
    try {
      const { label: hierarchyLabel, value: hierarchyId } =
        selectedViewByOptions || {};
      const isPlacementDate = selectedRoqDateTab === "roq_placement_date";

      let filtersForSublevelsHierarchy = [];
      const isSublevelsHierarchyColumnsEnabled =
        props?.screenConfig?.show_sublevels_hierarchy_columns;
      if (isSublevelsHierarchyColumnsEnabled) {
        filtersForSublevelsHierarchy = createAppliedOmsProductFilters(data);
      }

      props?.setHighLevelSummaryState({
        level_of_hierarchy_label: hierarchyLabel,
        level_of_hierarchy_id: hierarchyId,
        level_of_hierarchy_value: data?.[hierarchyId],
        selectedViewByOptions: selectedViewByOptions,
        selectedRoqDateTab: selectedRoqDateTab,
        selected_start_week_date: isPlacementDate
          ? fiscalDates?.start_fw
          : roqFiscalDates?.start_fw,
        selected_end_week_date: isPlacementDate
          ? fiscalDates?.end_fw
          : roqFiscalDates?.end_fw,
        show_sublevels_hierarchy_columns: isSublevelsHierarchyColumnsEnabled,
        applied_filters_for_sublevels_hierarchy: filtersForSublevelsHierarchy,
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

        let dateRangeQueryParams = null;
        if (SHOW_WEEK_DATE_RANGE) {
          const orderTimelineType = selectedRoqDateTab || "roq_placement_date";

          const startFiscalWeek =
            selectedRoqDateTab === "roq_receipt_date"
              ? roqFiscalDates?.start_fw
              : fiscalDates?.start_fw;

          const endFiscalWeek =
            selectedRoqDateTab === "roq_receipt_date"
              ? roqFiscalDates?.end_fw
              : fiscalDates?.end_fw;

          dateRangeQueryParams = startFiscalWeek
            ? `start_fiscal_week=${startFiscalWeek}&end_fiscal_week=${endFiscalWeek}&roq_date_option=${orderTimelineType}`
            : null;
        }

        if (SHOW_BUDGET_METRICS && SHOW_ROQ_DATE_OPTIONS) {
          const orderTimelineType = selectedRoqDateTab || "roq_placement_date";
          if (dateRangeQueryParams === null)
            dateRangeQueryParams = `roq_date_option=${orderTimelineType}`;
        }

        const totalQueryParams = dateRangeQueryParams
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
          const subHeaderNames = [];
          //Show the selectedViewByOptions column and its sublevels in the table
          const selectedViewByOptionLevel = selectedViewByOptions?.level;
          const hierarchGroupingColumn = columns?.data?.data.filter((item) => {
            return item.column_name === "hierarchy_info";
          });
          hierarchGroupingColumn[0].sub_headers = [];
          hierarchGroupingColumn[0].is_hidden = true;

          cols = columns?.data?.data
            .map((item) => {
              if (viewByColumnNames.includes(item.column_name)) {
                const currentColumnLevel = VIEWBY_DROPDOWN_OPTIONS.find(
                  (option) => option.value === item.column_name
                )?.level;
                if (currentColumnLevel === selectedViewByOptionLevel) {
                  item.is_hidden = false;
                } else if (currentColumnLevel < selectedViewByOptionLevel) {
                  item.is_hidden = true;
                  item.is_delete = true;
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
                    if (subItem?.column_name)
                      subHeaderNames.push(subItem.column_name);
                  }
                  item.is_delete = true;
                } else {
                  item.is_hidden = true;
                }
              }
              item.onClick = (tableInfo) => {
                onClickColumn(tableInfo?.cellData?.data || {});
              };
              return item;
            })
            .filter((item) => item.is_delete !== true);

          setSubHeaderColumnNames([...new Set(subHeaderNames)]);
        } else {
          setSubHeaderColumnNames([]);
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
        updatedColumns = applyHierarchyBadgeToColumns(
          updatedColumns,
          selectedViewByOptions,
          SHOW_HIERARCHY_LABEL
        );

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

  const getAppliedOmsFilters = () => {
    const globalFilters =
      props?.omsFilterConfiguration?.length === 0 ||
      !props?.omsFilterConfiguration
        ? props?.selectedFilters
        : props?.omsFilterConfiguration;
    let appliedOmsFilters = Array.isArray(globalFilters) ? globalFilters : [];

    // Merge DC filter from selectedFilters if it exists
    const dcFilterFromSelected = props?.selectedFilters?.find(
      (f) => f.dimension === "dc"
    );
    if (dcFilterFromSelected) {
      // Remove any existing DC filter from appliedOmsFilters
      appliedOmsFilters = appliedOmsFilters.filter((f) => f.dimension !== "dc");
      // Add the DC filter from selectedFilters
      appliedOmsFilters = [...appliedOmsFilters, dcFilterFromSelected];
    }

    const appliedOmsProductFilters = appliedOmsFilters?.filter(
      (filter) =>
        filter.display_type !== "fiscalCalendar" &&
        filter.filter_id !== "fiscal_date_range" &&
        filter.filter_id !== "fiscal_date_range_receipt"
    );

    return { appliedOmsFilters, appliedOmsProductFilters };
  };

  const manualCallBack = async (manualbody, pageIndex, params) => {
    try {
      //OMS Dashboard Filters
      const {
        appliedOmsFilters,
        appliedOmsProductFilters,
      } = getAppliedOmsFilters();

      if (appliedOmsFilters?.length === 0) {
        displaySnackMessages(SELECT_FILTERS_MESSAGE, "error");
        props.setOmsHighLevelSummaryTableLoader(false);
        return { data: [], totalCount: 0 };
      }

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
        body["start_fiscal_week"] = String(fiscalDates?.start_fw ?? "");
        body["end_fiscal_week"] = String(fiscalDates?.end_fw ?? "");
      }
      if (SHOW_ROQ_DATE_OPTIONS) {
        body["roq_date_option"] = selectedRoqDateTab;
        if (selectedRoqDateTab === "roq_placement_date") {
          body["start_fiscal_week"] = String(fiscalDates?.start_fw ?? "");
          body["end_fiscal_week"] = String(fiscalDates?.end_fw ?? "");
        } else {
          body["start_fiscal_week"] = String(roqFiscalDates?.start_fw ?? "");
          body["end_fiscal_week"] = String(roqFiscalDates?.end_fw ?? "");
        }
      }

      const viewByColumnValues = VIEWBY_DROPDOWN_OPTIONS?.map(
        (option) => option.value
      );
      body["view_by_allowed_values"] = viewByColumnValues;

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

  const handleRoqDateRangeChange = (dates) => {
    setSelectedRoqDate(dates);
    selectedRoqDateRef.current = dates;
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
    } else {
      setFiscalDates({});
    }
  };
  const onRoqDateRangePickerApply = () => {
    const currentDates = selectedRoqDateRef.current;
    if (currentDates?.fiscalInfoStartDate !== null) {
      const fiscalRoqDateValue = {
        start_fw: currentDates?.fiscalInfoStartDate?.fiscal_year_week,
        end_fw: currentDates?.fiscalInfoEndDate?.fiscal_year_week,
      };
      console.log("roqFiscalDates", fiscalRoqDateValue);
      setRoqFiscalDates({ ...fiscalRoqDateValue });
    } else {
      setRoqFiscalDates({});
    }
  };

  const handleRoqDateTabChange = (event, newValue) => {
    setSelectedRoqDateTab(newValue);
  };

  const getMaxPlacementEndDate = () => {
    let weeksToAdd = ORDER_PLACEMENT_WEEKS_LIMIT - 1;
    return moment().endOf("week").add(weeksToAdd, "weeks");
  };

  const isOutsideRange = (date) => {
    let weekStartDay = moment().startOf("week");
    let weekEndDay = getMaxPlacementEndDate();
    return !moment(date).isBetween(weekStartDay, weekEndDay, undefined, "[]");
  };

  const isRoqDateOutsideRange = (date) => {
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
    return false;
  };

  const getTopRightOptions = () => {
    let options = [];

    if (!SHOW_ROQ_DATE_OPTIONS && !SHOW_WEEK_DATE_RANGE) {
      const showViewBy = VIEWBY_DROPDOWN_OPTIONS?.length > 0;
      if (showViewBy)
        options.push(
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

  //Display the Month View (1M, 3M, 6M) in the center only if it does not have a Week View and the Flexible Timeline.
  const getTopCenterOptions = () => {
    if (!SHOW_WEEK_DATE_RANGE && !SHOW_ROQ_DATE_OPTIONS) {
      return [
        <ButtonGroup
          selectedOption={selectedMonthTab}
          exclusive
          onChange={props?.handleMonthTab}
          aria-label="text alignment"
          options={TAB_LIST_OPTIONS}
        />,
      ];
    }
    return [];
  };

  const getBottomLeftOptions = () => {
    if (
      !SHOW_HIERARCHY_LABEL ||
      !Array.isArray(HIGH_LEVEL_SUMMARY_HIERARCHY_LEGEND)
    )
      return [];
    return [
      <div
        key="hierarchy-legend"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "20px",
          flexWrap: "wrap",
        }}
      >
        {HIGH_LEVEL_SUMMARY_HIERARCHY_LEGEND.map((item) => (
          <div
            key={item.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <div
              style={{
                width: "20px",
                height: "20px",
                backgroundColor: item.backgroundColor,
                borderRadius: "4px",
                flexShrink: 0,
              }}
            />
            <Typography variant="body2" style={{ fontSize: "12px" }}>
              {item.label}
            </Typography>
          </div>
        ))}
      </div>,
    ];
  };

  const showContainerBottomLegendAndNote =
    (SHOW_ROQ_DATE_OPTIONS || SHOW_WEEK_DATE_RANGE) &&
    SHOW_HIERARCHY_LABEL &&
    Array.isArray(HIGH_LEVEL_SUMMARY_HIERARCHY_LEGEND);

  const getMonthWeekDateRangeView = () => {
    let options = [];

    if (selectedRoqDateTab === "roq_placement_date") {
      options.push(
        <ButtonGroup
          selectedOption={selectedMonthTab}
          exclusive
          onChange={props?.handleMonthTab}
          aria-label="text alignment"
          options={TAB_LIST_OPTIONS}
        />
      );

      if (SHOW_WEEK_DATE_RANGE) {
        options.push(
          <div className={globalClasses.flexRow}>
            <NormalCalendarFiscalMapping
              key={`oms-hls-placement-week-range-${selectedMonthTab}-${selectedRoqDateTab}`}
              disablePastWeeks={true}
              disableOutSideFiscalRange={false}
              showDefaultLabel={false}
              maxOneWeekSelection={true}
              maxEightWeekSelection={true}
              displayRow={true}
              resetOptions={true}
              fiscalCalendarData={props?.fiscalCalendarDetails}
              selectionRange={selectionRangeForDate}
              disabled={isDateRangeDisabledForPlacement}
              selectedDate={selectedDate}
              onDateChange={handleDateRangeChange}
              onPrimaryButtonClick={() => onDateRangePickerApply()}
              isOutsideRange={isOutsideRange}
              maxWeekEndDate={getMaxPlacementEndDate()}
              restrictEndDateToMaxEndDate={true}
            />
          </div>
        );
      }
    } else {
      options.push(
        <ButtonGroup
          selectedOption={selectedMonthTab}
          exclusive
          onChange={props?.handleMonthTab}
          aria-label="text alignment"
          options={TAB_LIST_OPTIONS}
        />
      );

      if (SHOW_WEEK_DATE_RANGE) {
        options.push(
          <div className={globalClasses.flexRow}>
            <NormalCalendarFiscalMapping
              key={`oms-hls-receipt-week-range-${selectedMonthTab}-${selectedRoqDateTab}`}
              disablePastWeeks={true}
              disableOutSideFiscalRange={false}
              showDefaultLabel={false}
              maxOneWeekSelection={true}
              maxEightWeekSelection={true}
              displayRow={true}
              resetOptions={true}
              selectionMonthCount={6}
              disabled={isDateRangeDisabledForReceipt}
              fiscalCalendarData={props?.receiptCalendarDetails}
              selectedDate={selectedRoqDate}
              onDateChange={handleRoqDateRangeChange}
              onPrimaryButtonClick={() => onRoqDateRangePickerApply()}
              isOutsideRange={isRoqDateOutsideRange}
              useFiscalMonthEnd={true}
              useCurrentWeekStart={true}
              enableAutoSelectionForMonth={selectionRangeForRoqDate === null}
              selectionRange={selectionRangeForRoqDate}
            />
          </div>
        );
      }
    }

    const showViewBy = VIEWBY_DROPDOWN_OPTIONS?.length > 0;
    const showRoqDateTabs = SHOW_ROQ_DATE_OPTIONS;

    if (showViewBy || showRoqDateTabs) {
      options.push(
        <div
          key="viewby-roq-date-tabs"
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            flexWrap: "wrap",
          }}
        >
          {showViewBy && (
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
          )}
          {showRoqDateTabs && (
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                flexWrap: "wrap",
                alignItems: "center",
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
          )}
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

  const getTableContainerStyle = () => {
    if (SHOW_ROQ_DATE_OPTIONS || SHOW_WEEK_DATE_RANGE) {
      return {
        padding: showContainerBottomLegendAndNote
          ? "0 1rem 0 1rem"
          : "0 1rem 1rem 1rem",
      };
    }
    return {};
  };

  const getUniqueRowId = () => {
    if (props?.screenConfig?.show_sublevels_hierarchy_columns) {
      return "unique_row_id";
    }
    return selectedViewByOptions?.value;
  };

  return (
    <>
      <div style={WHITE_CONTAINER_STYLE}>
        {(SHOW_ROQ_DATE_OPTIONS || SHOW_WEEK_DATE_RANGE) && (
          <div style={MONTH_WEEK_TAB_DATERANGE_STYLE}>
            {getMonthWeekDateRangeView()}
          </div>
        )}
        <div style={getTableContainerStyle()}>
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
                    uniqueRowId={getUniqueRowId()}
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
                    topCenterOptions={getTopCenterOptions()}
                    bottomLeftOptions={getBottomLeftOptions()}
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
        {showContainerBottomLegendAndNote && (
          <div
            style={{
              padding: "0 1rem 1rem 1rem",
              marginTop: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
            }}
          >
            <Typography
              variant="body2"
              style={{
                fontSize: "12px",
                color: "rgba(0, 0, 0, 0.6)",
                margin: 0,
              }}
            >
              {HIGH_LEVEL_SUMMARY_NA_NOTE}
            </Typography>
          </div>
        )}
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
    omsBudgetConfig: store.omsReducer.orderingCommonService.omsBudgetConfig,
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
