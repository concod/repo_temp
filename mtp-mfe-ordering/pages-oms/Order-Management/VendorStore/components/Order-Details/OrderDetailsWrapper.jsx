import React, { useEffect, useRef, useState, useCallback } from "react";
import { connect } from "react-redux";
import { useNavigate } from "react-router-dom-v5-compat";
import { Grid } from "@mui/material";
import { addSnack, closeSnack } from "core/actions/snackbarActions";
import Loader from "core/Utils/Loader/loader";
import globalStyles from "core/Styles/globalStyles";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import { Button, Prompt } from "impact-ui-v3";
import AgGridComponent from "core/Utils/agGrid";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Form from "core/Utils/form";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import cloneDeep from "lodash/cloneDeep";
import isEmpty from "lodash/isEmpty";
import uniq from "lodash/uniq";
import moment from "moment";
import { tenantConfigApiCache } from "core/actions/tenantConfigActions";
import { replaceSpecialCharToCharCode } from "core/Utils/functions/utils";
import { getTenantTimeZoneDetails } from "core/commonComponents/coreComponentScreen/utils";

import {
  ORDER_MANAGEMENT,
  ORDER_MANAGEMENT_CREATE_SCENARIO_STORE,
} from "modules/oms/constants-oms/routeConstants";
import {
  getOmsOrderDetailsColumnConfig,
  getOmsOrderDetailsTableData,
  setOrderDetailsTableConfigLoader,
  setOrderDetailsDataLoader,
  setRedirectionDetails,
  getOmsCoreFiscalCalendar,
} from "modules/oms/services-oms/Order-Management/order-management-service";
import { saveOrderDetailsTable } from "modules/oms/services-oms/Order-Management/order-management-vendor-to-store-service";
import {
  ERROR_MESSAGE,
  defaultTableData,
  SELECT_FILTERS_MESSAGE,
  TENANT_DATE_FORMAT,
  OMS_STYLE_ORDER_SUMMARY_TOGGLE_OPTIONS_FOR_VENDOR_STORE,
  OMS_STYLE_ORDER_SUMMARY_SWITCH_OPTIONS_FOR_VENDOR_STORE,
  INVALID_EDITABLE_RECEIPT_DATE,
  INVALID_DATE,
  ORDER_PLACEMENT_DATE_COLUMN,
  OMS_ORDER_MANAGEMENT_SCREENNAME,
  OMS_ORDER_MANAGEMENT_SCREENNAME_KEY,
} from "modules/oms/constants-oms/stringConstants";
import { getPossibleMonthsAndWeeks } from "../../utils/utils";
import ApprovalFlowDialogVendorStore from "../Approval-Flow-Dialog-Vendor-Store/ApprovalFlowDialogVendorStore";
import { getValidCheckConfiguration } from "../../utils/utils";
import OrderInfoTable from "./OrderInfoTable";
import DeepDiveBottomSheet from "../Deep-Dive/DeepDiveBottomSheet";
import OrderDetailsSetAllModal from "./OrderDetailsSetAllModal";
import {
  VENDOR_TO_STORE_DEEP_DIVE_FILTERS,
  setDeepDiveFiltersPayload,
  setSelectedRowsFromOrderDetails,
  setOrderDetailsFilters,
  getOmsOrderSummaryFilters,
  setDeepDiveFilters,
  setFiscalCalendarData,
  setAllOrderDetailsData,
  getOmsOrderSummaryColumnConfig,
  getOmsOrderSummaryTableData,
  resetOrderDetailsFilters,
  setOrderInfoTableConfigLoader,
  setOrderInfoTableDataLoader,
  setDeepDiveWeekRange,
  resetDeepDiveReducersForVendorStore,
} from "modules/oms/services-oms/Order-Management/order-management-vendor-to-store-service";

/**
 * Wrapper component that manages both Order Details table (top) and OrderInfo table (bottom)
 * with common save functionality and bi-directional quantity synchronization
 */
const OrderDetailsWrapper = (props) => {
  const globalClasses = globalStyles();
  const classes = useStyles();
  const navigate = useNavigate();

  // Common state management
  const [loading, setLoading] = useState(false);
  const [render, setRender] = useState(false);
  const [selectedSubClass, setSelectedSubClass] = useState(null);

  // Order Details Table state
  const [orderDetailsTableColumns, setOrderDetailsTableColumns] = useState([]);
  const [orderDetailsEditedCells, setOrderDetailsEditedCells] = useState({});
  const orderDetailsEditedCellsRef = useRef({}); // Ref to always access current state
  const orderDetailsTableGridInstance = useRef(null);

  // OrderInfo Table state
  // IMPORTANT: orderInfoEditedCells only contains MANUAL user edits from OrderInfo table
  // Bi-directional sync updates are NOT added to this (to avoid sending unnecessary data)
  const [orderInfoEditedCells, setOrderInfoEditedCells] = useState({});
  const orderInfoTableGridInstance = useRef(null);

  // Pagination-aware distribution state
  const [totalRecordCount, setTotalRecordCount] = useState(0);
  const totalRecordCountRef = useRef(0); // 🚀 NEW: Ref for immediate access
  const [pendingDistribution, setPendingDistribution] = useState(null);

  const hasTopTableUpdateRef = useRef(false);
  const topTableDistributionParamsRef = useRef(null);
  const flagClearTimeoutRef = useRef(null);

  // Common functionality state
  const [fields, setFields] = useState([]);
  const [fiscalCalendarDetails, setFiscalCalendarDetails] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectedRowsForApproval, setSelectedRowsForApproval] = useState([]);
  const [approvalFlowPayload, setApprovalFlowPayload] = useState({});
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showSetAllModal, setShowSetAllModal] = useState(false);
  const [checkAllSetAllRequest, setCheckAllSetAllRequest] = useState([]);
  const [openDeepDive, setOpenDeepDive] = useState(false);
  const [showUnsavedChangesPrompt, setShowUnsavedChangesPrompt] = useState(
    false
  );
  const [pendingSelectedSubClass, setPendingSelectedSubClass] = useState(null);
  const [orderDetailsApiSuccess, setOrderDetailsApiSuccess] = useState(false);

  // Access control state
  const [isUserHasEditAccess, setIsUserHasEditAccess] = useState(true);
  const [isUserHasSetAllAccess, setIsUserHasSetAllAccess] = useState(true);
  const [
    isUserHasWorkingSpaceAccess,
    setIsUserHasWorkingSpaceAccess,
  ] = useState(true);

  // Data refs for persistence across renders
  const globalFilters = useRef([]);
  const fieldsData = useRef([]);

  // Get the hierarchy information from Redux state (matching original)
  const hierarchyInfo = props?.highLevelSummaryState || {};
  const redirectionDetails = props?.redirectionDetails || {};

  const { tenantDateFormat } = getTenantTimeZoneDetails();
  const DATE_FORMAT = tenantDateFormat || TENANT_DATE_FORMAT;

  const ORDER_STATUS_COLUMN_MAPPING =
    props?.vendorToStoreScreenConfig?.order_details
      ?.order_status_column_mapping;

  const ORDER_STATUS_ID_COLUMN_NAME =
    props?.vendorToStoreScreenConfig?.order_details
      ?.order_status_id_column_name || "order_status_id";

  const ORDER_STATUS_COLUMN_NAME =
    props?.vendorToStoreScreenConfig?.order_details?.order_status_column_name ||
    "order_status";

  const SELECTED_ROW_FILTER_CONFIG =
    props?.vendorToStoreScreenConfig?.deep_dive?.selected_product_filter || [];

  const MAX_RESTRICTED_COUNT =
    props?.vendorToStoreScreenConfig?.create_scenario?.max_restricted_count ||
    1;

  // Initialize data on component mount
  useEffect(() => {
    initializeComponent();
  }, []);

  const [
    isRedirectedFromDifferentPage,
    setIsRedirectedFromDifferentPage,
  ] = useState(false);
  useEffect(() => {
    const redirectionDetails = JSON.parse(
      localStorage.getItem("omsRedirectionDetails")
    );
    if (redirectionDetails?.isRedirection) {
      setIsRedirectedFromDifferentPage(true);
    } else {
      setIsRedirectedFromDifferentPage(false);
    }
  }, []);

  useEffect(() => {
    if (selectedSubClass === null) {
      // OrderInfo table closed - clear distribution
      setPendingDistribution(null);
      totalRecordCountRef.current = 0;
      setTotalRecordCount(0);
    } else {
      //  OrderInfo table opened for a different row - check if we need to clear old distribution
      if (
        pendingDistribution &&
        pendingDistribution.orderGroupId !== selectedSubClass.order_group_id
      ) {
        setPendingDistribution(null);
        totalRecordCountRef.current = 0;
        setTotalRecordCount(0);

        // Clear flag-based distribution refs directly
        hasTopTableUpdateRef.current = false;
        topTableDistributionParamsRef.current = null;
        if (flagClearTimeoutRef.current) {
          clearTimeout(flagClearTimeoutRef.current);
          flagClearTimeoutRef.current = null;
        }
      }
    }
  }, [selectedSubClass, pendingDistribution]);

  useEffect(() => {
    orderDetailsEditedCellsRef.current = orderDetailsEditedCells;
  }, [orderDetailsEditedCells]);

  // Access control effect
  useEffect(() => {
    if (!isEmpty(props?.userAccess)) {
      const orderDetailsAccess = props.userAccess.find(
        (item) =>
          item.module === "order_details" &&
          item.screen === OMS_ORDER_MANAGEMENT_SCREENNAME_KEY
      );

      if (orderDetailsAccess) {
        setIsUserHasEditAccess(orderDetailsAccess.isEditButton || false);
        setIsUserHasSetAllAccess(orderDetailsAccess.isSetAllButton || false);
        setIsUserHasWorkingSpaceAccess(
          orderDetailsAccess.isWorkingSpaceButton || false
        );
      }
    } else {
      // Fall back to default true
      setIsUserHasEditAccess(true);
      setIsUserHasSetAllAccess(true);
      setIsUserHasWorkingSpaceAccess(true);
    }
  }, [props.userAccess]);

  //Fetches the Filters for Deep Dive and Sets the State
  useEffect(() => {
    const getDeepDiveFilters = async () => {
      try {
        const deepDiveFiltersResponse = await props?.tenantConfigApiCache(1, {
          attribute_name: VENDOR_TO_STORE_DEEP_DIVE_FILTERS,
        });
        const DEEP_DIVE_FILTERS =
          deepDiveFiltersResponse.data.data[0]?.attribute_value?.filters || [];
        props?.setDeepDiveFilters(DEEP_DIVE_FILTERS);
      } catch (error) {
        console.log("Error in Fetching Deep Dive Filters", error);
      }
    };
    if (props?.deepDiveFilters?.length === 0) {
      getDeepDiveFilters();
    }
  }, []);

  //Fetches the Filters for Order Info Table 2  and Sets the State
  useEffect(() => {
    const fetchOrderDetailsFilters = async () => {
      try {
        const ORDER_DETAILS_FILTERS = await props.getOmsOrderSummaryFilters();
        props.setOrderDetailsFilters(ORDER_DETAILS_FILTERS || []);
      } catch (error) {
        displaySnackMessages(ERROR_MESSAGE, "error");
        console.log("Error in Fetching Filters", error);
      }
    };

    if (props?.orderDetailsFilters?.length === 0) {
      fetchOrderDetailsFilters();
    }
  }, []);

  // React to date range changes to setup week fields
  useEffect(() => {
    if (fiscalCalendarDetails.length > 0) {
      setupWeekFields(fiscalCalendarDetails);
    }
  }, [props.ropDate, props.recommRecieptDate, fiscalCalendarDetails]);

  // Fetch column config when fields are ready
  useEffect(() => {
    if (fields.length > 0) {
      fetchOrderDetailsColumnConfig();
    }
  }, [fields]);

  useEffect(() => {
    if (orderDetailsTableGridInstance?.current) {
      orderDetailsTableGridInstance.current.api.checkAllSetAllRequest = checkAllSetAllRequest;
    }
  }, [checkAllSetAllRequest]);

  useEffect(() => {
    if (orderDetailsApiSuccess) {
      refreshOrderDetailsTable();
      setOrderDetailsApiSuccess(false);
    }
  }, [orderDetailsApiSuccess]);

  /**
   * Initialize the component - fetch filters, column config, etc.
   */
  const initializeComponent = async () => {
    try {
      setLoading(true);

      // Initialize global filters (matching original)
      globalFilters.current = getFiltersFromState() || [];

      // Fetch fiscal calendar (column config will be fetched when fields are ready)
      await fetchFiscalCalendar();
    } catch (error) {
      console.error("Error initializing component:", error);
      displaySnackMessages(ERROR_MESSAGE, "error");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get filters from Redux state (matching original index.jsx)
   */
  const getFiltersFromState = () => {
    // Fetching the redirection details from local storage
    const redirectionDetails = JSON.parse(
      localStorage.getItem("omsRedirectionDetails")
    );
    if (redirectionDetails?.isRedirection) {
      const filtersFromRedirection = redirectionDetails?.selectedFilters;
      return filtersFromRedirection;
    }
    // Initialize global filters from props
    const appliedOmsFilters =
      props?.omsFilterConfiguration?.length === 0 ||
      !props?.omsFilterConfiguration
        ? props?.selectedFilters
        : props?.omsFilterConfiguration;
    const appliedOmsProductFilters = appliedOmsFilters?.filter(
      (filter) =>
        filter.display_type !== "fiscalCalendar" &&
        filter.filter_id !== "fiscal_date_range" &&
        filter.filter_id !== "fiscal_date_range_receipt"
    );
    return appliedOmsProductFilters;
  };

  /**
   * Fetch fiscal calendar data
   */
  const fetchFiscalCalendar = async () => {
    try {
      let startYear = moment().year();
      let endYear = moment().year() + 2;
      let queryParams = `?start_fiscal_year=${startYear}&end_fiscal_year=${endYear}`;
      const getFinancialCalendarData = await getOmsCoreFiscalCalendar(
        queryParams
      );

      moment.updateLocale("en", {
        week: {
          dow: getFinancialCalendarData?.data?.data?.week_start_day || 0,
        },
      });

      const calendarData = getFinancialCalendarData?.data?.data?.data || [];
      setFiscalCalendarDetails(calendarData);

      // Set fiscal calendar data in Redux for Deep Dive components
      props?.setFiscalCalendarData(calendarData);

      // Set up fields using the same logic as original
      if (calendarData.length > 0) {
        setupWeekFields(calendarData);
      }
    } catch (error) {
      console.error("❌ Error fetching fiscal calendar:", error);
      displaySnackMessages("Error fetching fiscal calendar", "error");
    }
  };

  /**
   * Setup week fields using the same logic as the original component
   */
  const setupWeekFields = (calendarData) => {
    const { possibleWeeks } = getPossibleMonthsAndWeeks(
      [props.ropDate, props.recommRecieptDate],
      calendarData,
      displaySnackMessages
    );

    // Always default to week-level for Order Details
    if (possibleWeeks && possibleWeeks.length > 0) {
      setFields([
        {
          label: "Order Week",
          isMulti: true,
          options: possibleWeeks.map((week) => ({ label: week, value: week })),
          accessor: "week",
          field_type: "dropdown",
          isClearable: true,
          labelOrientation: "left",
        },
      ]);
      fieldsData.current = possibleWeeks;
    }
  };

  /**
   * Handle article hyperlink click - checks for unsaved changes using ref to always get current state
   */
  const handleArticleClick = useCallback((data) => {
    // Use ref to get the ACTUAL current state, not captured state
    const currentEditedCells = orderDetailsEditedCellsRef.current;

    // Check if THIS SPECIFIC ROW has unsaved changes
    if (currentEditedCells[data.order_group_id]) {
      setPendingSelectedSubClass(data);
      setShowUnsavedChangesPrompt(true);
    } else {
      setSelectedSubClass(data);

      // Apply any pending quantity changes when OrderInfo table opens (check after state update)
      setTimeout(() => {
        const latestEditedCells = orderDetailsEditedCellsRef.current;
        if (latestEditedCells[data.order_group_id]) {
          const editedData = latestEditedCells[data.order_group_id];
          if (editedData.isQuantityEdited && editedData.order_quantity) {
            onOrderDetailsQuantityChange(
              data.order_group_id,
              editedData.order_quantity
            );
          }
        }
      }, 200); // Wait for state update and OrderInfo table to be ready
    }
  }, []); // Empty dependency array since we use ref to avoid closure issues and onOrderDetailsQuantityChange is defined later

  /**
   * Fetch Order Details column configuration
   */
  const fetchOrderDetailsColumnConfig = async () => {
    try {
      props.setOrderDetailsTableConfigLoader(true);

      let columns = await props.getOmsOrderDetailsColumnConfig();
      let columnsData = columns?.data?.data;

      // Apply cell styles for edited cells
      let styledColumnsData = setCellStyles(columnsData);

      let formattedColumns = agGridColumnFormatter(
        styledColumnsData,
        null, // onBlur should be passed to AgGridComponent, not here
        {
          article: handleArticleClick,
        },
        null,
        null,
        null,
        null,
        true
      );

      setOrderDetailsTableColumns(formattedColumns);
    } catch (error) {
      console.error("Error fetching column config:", error);
      displaySnackMessages(ERROR_MESSAGE, "error");
    } finally {
      setRender(true);
      props.setOrderDetailsTableConfigLoader(false);
    }
  };

  const checkForEditability = (params) => {
    // Check access control first
    if (!isEmpty(props?.userAccess)) {
      if (!isUserHasEditAccess) {
        return false;
      }
    }

    if (!params || !params.data) {
      return true;
    }

    const orderStatusId = params.data[ORDER_STATUS_ID_COLUMN_NAME];
    const statusId = parseInt(orderStatusId);

    const nonEditableStatuses = [1, -1, 3];

    return !nonEditableStatuses.includes(statusId);
  };

  const cellClassRules = {
    [classes.disabledCell]: (params) => {
      const node = params.node;
      const colDef = params.colDef;

      if (!node || !node.data) return false;

      if (colDef.type === "link" || colDef.accessor === "article") {
        return false;
      }

      const orderStatusId = node.data[ORDER_STATUS_ID_COLUMN_NAME];
      const statusId = parseInt(orderStatusId);
      const nonEditableStatuses = [1, -1, 3];

      return nonEditableStatuses.includes(statusId);
    },
  };

  /**
   * Sets cell styles for edited cells to highlight them
   */
  const setCellStyles = (columnsDef) => {
    try {
      let updatedColumnsDef = cloneDeep(columnsDef);
      updatedColumnsDef = updatedColumnsDef.map((item) => {
        if (item.column_name === "order_quantity") {
          item.cellStyle = (params) => {
            let colour = { backgroundColor: "inherit" };

            if (params.node.data.flag) {
              const flagValue = params.node.data.flag;
              if (flagValue === 1) {
                colour = { backgroundColor: "#fec49c" };
              } else if (flagValue === 3) {
                colour = { backgroundColor: "#a39fe8" };
              } else if (flagValue === 4) {
                colour = { backgroundColor: "#f6cccc" };
              }
            }

            // Override with edited state color if the cell has been edited
            if (
              params.node.data.isQuantityEdited ||
              params.node.data.isEdited
            ) {
              colour = { backgroundColor: "#0055af36" }; // Light blue for edited cells
            }
            return colour;
          };

          // Add editable property to disable editing for non-editable rows
          item.editable = checkForEditability;
        } else if (item.column_name === "editable_expected_receipt_date") {
          item.cellStyle = (params) => {
            let colour = { backgroundColor: "inherit" };
            // Red background for invalid dates (validation error)
            if (params.node.data.isEditableReceiptDateNotValid) {
              colour = { backgroundColor: "#F6CCCC", color: "#F6CCCC" };
            }
            // Blue background for valid edited dates
            else if (
              params.node.data.isDateEdited ||
              params.node.data.isEdited
            ) {
              colour = { backgroundColor: "#0055af36" }; // Light blue for edited cells
            }
            return colour;
          };
          item.editable = checkForEditability;
        }
        item.cellClassRules = cellClassRules;
        return item;
      });
      return updatedColumnsDef;
    } catch (err) {
      displaySnackMessages("Something went wrong", "error");
      return columnsDef;
    }
  };

  /**
   * Order Details table manual callback for data fetching
   */
  const orderDetailsManualCallback = async (manualbody, pageIndex, params) => {
    try {
      props.setOrderDetailsDataLoader(true);

      const appliedOmsProductFilters = getFiltersFromState();
      if (appliedOmsProductFilters?.length === 0) {
        displaySnackMessages(SELECT_FILTERS_MESSAGE, "error");
        props.setOrderDetailsDataLoader(false);
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

      const selectedHierarchy =
        hierarchyInfo?.selected_hierarchy ||
        hierarchyInfo?.level_of_hierarchy_id ||
        hierarchyInfo?.selectedViewByOptions?.value ||
        "l0_name";
      const metricType = hierarchyInfo?.metric_type || "units";
      const dateFilter = hierarchyInfo?.date_filter || "month";

      let hierarchyFilters = [...appliedOmsProductFilters];
      if (
        hierarchyInfo?.level_of_hierarchy_value &&
        hierarchyInfo?.level_of_hierarchy_id
      ) {
        const hierarchyFilter = {
          filter_type: "cascaded",
          attribute_name: hierarchyInfo.level_of_hierarchy_id,
          operator: "in",
          dimension: "Product",
          values: [
            replaceSpecialCharToCharCode(
              hierarchyInfo.level_of_hierarchy_value
            ),
          ],
        };
        hierarchyFilters.push(hierarchyFilter);
      }

      let body = {
        filters: [...hierarchyFilters],
        global_date_filter: [...appliedOmsDateFilters],
        selected_hierarchy: selectedHierarchy,
        metric_type: metricType,
        date_filter: dateFilter,
        fiscal_weeks: fieldsData.current || [],
        meta: { ...manualbody, limit: { limit: 10, page: pageIndex + 1 } },
      };

      let response = await props.getOmsOrderDetailsTableData(body);
      if (response?.data?.status) {
        const dataResponse = cloneDeep(response.data.data);

        // Process order status mapping if available
        if (ORDER_STATUS_COLUMN_MAPPING && ORDER_STATUS_ID_COLUMN_NAME) {
          dataResponse.forEach((row) => {
            const columnValue = row[ORDER_STATUS_ID_COLUMN_NAME].toString();
            row[ORDER_STATUS_COLUMN_NAME] =
              ORDER_STATUS_COLUMN_MAPPING[columnValue] || columnValue;
          });
        }

        dataResponse.forEach((row) => {
          if (
            !row.hasOwnProperty("oo") ||
            row.oo === null ||
            row.oo === undefined ||
            row.oo === "" ||
            !row.oo
          ) {
            row.oo = 0;
          }

          if (
            !row.hasOwnProperty("min_order_quantity_style") ||
            row.min_order_quantity_style === null ||
            row.min_order_quantity_style === undefined ||
            row.min_order_quantity_style === ""
          ) {
            row.min_order_quantity_style = "-";
          }

          if (
            !row.hasOwnProperty("order_cost") ||
            row.order_cost === null ||
            row.order_cost === undefined ||
            row.order_cost === ""
          ) {
            row.order_cost = 0;
          }

          if (
            !row.hasOwnProperty("roq_constrained") ||
            row.roq_constrained === null ||
            row.roq_constrained === undefined ||
            row.roq_constrained === ""
          ) {
            row.roq_constrained = 0;
          }

          if (
            !row.hasOwnProperty("roq_unconstrained") ||
            row.roq_unconstrained === null ||
            row.roq_unconstrained === undefined ||
            row.roq_unconstrained === ""
          ) {
            row.roq_unconstrained = 0;
          }
          if (
            !row.hasOwnProperty("order_quantity") ||
            row.order_quantity === null ||
            row.order_quantity === undefined ||
            row.order_quantity === ""
          ) {
            if (row.hasOwnProperty("raw_roq")) {
              row.order_quantity = row.raw_roq;
            } else {
              row.order_quantity = 0;
            }
          }
          row.order_quantity_previous = row.order_quantity;
        });

        // setting editable_expected_receipt_date as expected_receipt_date by default
        dataResponse.forEach((row) => {
          if (
            row.expected_receipt_date &&
            (!row.hasOwnProperty("editable_expected_receipt_date") ||
              row.editable_expected_receipt_date === null ||
              row.editable_expected_receipt_date === undefined ||
              row.editable_expected_receipt_date === "")
          ) {
            row.editable_expected_receipt_date = row.expected_receipt_date;
          }
        });

        let formattedData = agGridRowFormatter(dataResponse);

        props.setOrderDetailsDataLoader(false);
        return { data: formattedData, totalCount: response?.data?.total };
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
        props.setOrderDetailsDataLoader(false);
        return defaultTableData;
      }
    } catch (err) {
      console.log("Error in Fetching Order Details Table Data", err);
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setOrderDetailsDataLoader(false);
      return defaultTableData;
    }
  };

  /**
   * Common display message function
   */
  const displaySnackMessages = useCallback(
    (message, variance, additionalOptions = {}) => {
      props.closeSnack();
      props.addSnack({
        message: message,
        options: {
          variant: variance,
          ...additionalOptions,
        },
      });
    },
    [props]
  );

  /**
   * Handle Order Details table onCellValueChanged (for dates only)
   */
  const onCellValueChanged = (params) => {
    const { colDef, node, data } = params;

    // Only handle date changes in onCellValueChanged (immediate feedback for dates)
    if (colDef.column_name === "editable_expected_receipt_date") {
      let isValueError = false;
      let columnValue = node?.data?.["editable_expected_receipt_date"];
      let selectedDate = moment(columnValue).format(DATE_FORMAT);
      let orderPlacementDate = moment(
        node?.data?.[ORDER_PLACEMENT_DATE_COLUMN]
      ).format(DATE_FORMAT);

      if (selectedDate !== INVALID_DATE) {
        node.data.isEdited = true;
        node.data.isDateEdited = true;
        node.data.isManuallyEdited = true; // 🎯 NEW: Mark as manually edited

        if (
          moment(selectedDate, DATE_FORMAT).isAfter(
            moment(orderPlacementDate, DATE_FORMAT)
          )
        ) {
          isValueError = false;
          node.data.isEditableReceiptDateNotValid = false;
        } else {
          isValueError = true;
          node.data.isEditableReceiptDateNotValid = true;
        }
      }

      if (isValueError) {
        displaySnackMessages(INVALID_EDITABLE_RECEIPT_DATE, "error", {
          disableOnClose: true,
        });
      }

      setOrderDetailsEditedCells((prev) => ({
        ...prev,
        [node.data.order_group_id]: { ...node.data },
      }));

      orderDetailsTableGridInstance.current.api.refreshCells({
        force: true,
        suppressFlash: false,
        rowNodes: [node],
        columns: [colDef.field],
      });

      // Trigger bi-directional sync: update OrderInfo table with new date
      onOrderDetailsDateChange(data.order_group_id, data[colDef.field]);
    }
  };

  /**
   * Handle Order Details table onBlur (for quantities - better UX)
   */
  const onBlur = (_e, data, column, isChanged) => {
    if (isChanged) {
      if (column.colId === "order_quantity") {
        // VALIDATION: Check if OrderInfo table has all rows locked before allowing edit
        if (orderInfoTableGridInstance?.current?.api && selectedSubClass) {
          let bottomTableTotalRows = 0;
          let bottomTableLockedRows = 0;
          let isChildTableAvailable = false;

          orderInfoTableGridInstance.current.api.forEachNode((node) => {
            if (node.data.status_obj && Array.isArray(node.data.status_obj)) {
              if (
                node?.data?.status_obj[0]?.order_group_id ===
                data.order_group_id
              ) {
                isChildTableAvailable = true;

                node.data.status_obj.forEach((item) => {
                  bottomTableTotalRows++;
                  if (item.order_quantity?.isLocked === true) {
                    bottomTableLockedRows++;
                  }
                });
              }
            }
          });

          // If ALL rows are locked, prevent edit and show error
          if (
            isChildTableAvailable &&
            bottomTableTotalRows > 0 &&
            bottomTableLockedRows === bottomTableTotalRows
          ) {
            displaySnackMessages(
              "All rows are locked in info table. Please unlock at least one row to edit.",
              "error",
              { disableOnClose: true }
            );

            // Revert to previous value
            orderDetailsTableGridInstance.current.api.forEachNode((node) => {
              if (node.data.order_group_id === data.order_group_id) {
                node.data.order_quantity = node.data.order_quantity_previous;
                node.data.isEdited = false;
                node.data.isQuantityEdited = false;

                orderDetailsTableGridInstance.current.api.refreshCells({
                  force: true,
                  suppressFlash: false,
                  rowNodes: [node],
                  columns: [column.colId],
                });
              }
            });

            // Clear from edited cells state
            setOrderDetailsEditedCells((prev) => {
              const updated = { ...prev };
              delete updated[data.order_group_id];
              orderDetailsEditedCellsRef.current = updated;
              return updated;
            });

            return; // Exit early
          }
        }

        orderDetailsTableGridInstance.current.api.forEachNode((node) => {
          if (node.data.order_group_id === data.order_group_id) {
            node.data.isEdited = true;
            node.data.isQuantityEdited = true;
            node.data.isManuallyEdited = true; // 🎯 NEW: Mark as manually edited
            node.data[column.colId] = data[column.colId];

            setOrderDetailsEditedCells((prev) => {
              const updated = {
                ...prev,
                [node.data.order_group_id]: { ...node.data },
              };

              orderDetailsEditedCellsRef.current = updated;
              return updated;
            });

            orderDetailsTableGridInstance.current.api.refreshCells({
              force: true,
              suppressFlash: false,
              rowNodes: [node],
              columns: [column.colId],
            });
            onOrderDetailsQuantityChange(
              data.order_group_id,
              data[column.colId]
            );
          }
        });
      } else if (column.colId === "editable_expected_receipt_date") {
        orderDetailsTableGridInstance.current.api.forEachNode((node) => {
          if (node.data.order_group_id === data.order_group_id) {
            node.data.isEdited = true;
            node.data.isDateEdited = true;
            node.data.isManuallyEdited = true; // 🎯 NEW: Mark as manually edited
            node.data[column.colId] = data[column.colId];

            setOrderDetailsEditedCells((prev) => ({
              ...prev,
              [node.data.order_group_id]: { ...node.data },
            }));

            orderDetailsTableGridInstance.current.api.refreshCells({
              force: true,
              suppressFlash: false,
              rowNodes: [node],
              columns: [column.colId],
            });

            // Trigger bi-directional sync: update OrderInfo table with new date
            onOrderDetailsDateChange(data.order_group_id, data[column.colId]);
          }
        });
      }
    }
  };

  const getOrderQuantityValue = (orderQuantityField) => {
    if (
      typeof orderQuantityField === "object" &&
      orderQuantityField !== null &&
      "value" in orderQuantityField
    ) {
      return orderQuantityField.value;
    }
    return orderQuantityField;
  };

  const setOrderQuantityValue = (currentField, newValue) => {
    if (
      typeof currentField === "object" &&
      currentField !== null &&
      "isLocked" in currentField
    ) {
      return {
        value: newValue,
        isLocked: currentField.isLocked,
      };
    }
    return newValue;
  };

  const applyDistributionWithCount = useCallback(
    (orderGroupId, newQuantity, forcedTotalCount) => {
      if (!orderInfoTableGridInstance?.current?.api) {
        return;
      }

      let targetSubClassData = selectedSubClass;
      if (!targetSubClassData) {
        const editedData = orderDetailsEditedCellsRef.current[orderGroupId];
        if (editedData) {
          targetSubClassData = editedData;
        } else {
          return;
        }
      }

      const validQuantity = parseFloat(newQuantity) || 0;
      let selectedSkuRoqConstrained = targetSubClassData.roq_constrained || 0;

      // 🚀 NEW LOGIC: ROQ-based proportional distribution with Math.ceil()
      let visibleLockedValue = 0;
      let visibleUnlockedParentNodes = [];
      let visibleLockedParentNodes = [];
      let isChildTableAvailable = false;
      let sumOfOrderInfoTotals = 0; // Sum of all 'total' fields from Order Info table

      orderInfoTableGridInstance.current.api.forEachNode((node, index) => {
        if (node.data.status_obj && Array.isArray(node.data.status_obj)) {
          if (node?.data?.status_obj[0]?.order_group_id === orderGroupId) {
            const parentOrderQuantity = node.data.order_quantity;
            const isParentLocked =
              typeof parentOrderQuantity === "object" &&
              parentOrderQuantity?.isLocked === true;

            isChildTableAvailable = true;

            //Accumulate total field for ROQ fallback calculation
            sumOfOrderInfoTotals += node.data.total || 0;

            if (isParentLocked) {
              const lockedValue =
                getOrderQuantityValue(parentOrderQuantity) || 0;
              visibleLockedValue += lockedValue;
              visibleLockedParentNodes.push(node);
            } else {
              visibleUnlockedParentNodes.push(node);
            }
          }
        }
      });

      // If clicked row has roq_constrained = 0, use sum of totals from Order Info table
      if (selectedSkuRoqConstrained === 0 && sumOfOrderInfoTotals > 0) {
        selectedSkuRoqConstrained = sumOfOrderInfoTotals;
      }

      //  If still 0 (nodes not loaded yet), use forcedTotalCount as fallback
      if (selectedSkuRoqConstrained === 0 && forcedTotalCount > 0) {
        selectedSkuRoqConstrained = forcedTotalCount;
      }

      // 🚨 VALIDATION: Check if total quantity is less than locked values
      if (isChildTableAvailable && validQuantity < visibleLockedValue) {
        displaySnackMessages(
          `Order quantity should be greater than the locked order quantity`,
          "error",
          { disableOnClose: true }
        );
        return; // Exit without applying distribution
      }

      // 🔄 Store distribution for pending distribution tracking
      const distributionToStore = {
        totalQuantity: validQuantity,
        totalRecordCount: forcedTotalCount,
        roqConstrained: selectedSkuRoqConstrained,
        orderGroupId: orderGroupId,
        totalLockedValue: visibleLockedValue,
        unlockedCount: visibleUnlockedParentNodes.length,
      };

      setPendingDistribution(distributionToStore);

      // 🎯 CRITICAL FIX: Calculate remaining quantity after locked parents
      const remainingQuantityForUnlocked = validQuantity - visibleLockedValue;

      // 🎯 NEW LOGIC: Apply ROQ-based proportional distribution to visible unlocked nodes
      if (
        visibleUnlockedParentNodes.length > 0 &&
        selectedSkuRoqConstrained > 0
      ) {
        // IMPORTANT: Use FULL selectedSkuRoqConstrained as denominator to preserve original proportions!

        visibleUnlockedParentNodes.forEach((node) => {
          // 📊 Calculate parent quantity using ROQ proportion with REMAINING quantity
          // If both roq_constrained and roq_unconstrained are 0, use 1 as fallback
          let parentRoqConstrained = node.data.roq_constrained || 0;
          if (
            parentRoqConstrained === 0 &&
            (node.data.roq_unconstrained || 0) === 0
          ) {
            parentRoqConstrained = 1; // Fallback to 1
          }
          const effectiveParentRoq = parentRoqConstrained;

          // 🎯 CRITICAL FIX: Use remainingQuantityForUnlocked with FULL selectedSkuRoqConstrained to preserve proportions!
          const parentQuantity = Math.ceil(
            (remainingQuantityForUnlocked * effectiveParentRoq) /
              selectedSkuRoqConstrained
          );

          // 🔒 Handle children with ROQ-based distribution
          let unlockedChildren = [];
          let lockedChildren = [];
          let totalLockedChildValue = 0;

          // First pass: categorize children by lock state
          node.data.status_obj.forEach((item, childIndex) => {
            const isChildLocked =
              typeof item.order_quantity === "object" &&
              item.order_quantity?.isLocked === true;
            if (isChildLocked) {
              lockedChildren.push({ item, childIndex });
              const lockedValue =
                getOrderQuantityValue(item.order_quantity) || 0;
              totalLockedChildValue += lockedValue;
            } else {
              unlockedChildren.push({ item, childIndex });
            }
          });

          // Calculate remaining quantity after accounting for locked children
          const remainingParentQuantity = Math.max(
            0,
            parentQuantity - totalLockedChildValue
          );

          // 📊 CRITICAL FIX: Distribute to unlocked children
          if (unlockedChildren.length > 0) {
            // 🎯 Use parent's ROQ as denominator if available, otherwise use status_obj.length
            // When parent ROQ = 0: use status_obj.length (equal distribution)
            // When parent ROQ > 0: use parent's ROQ (proportional distribution)
            const childDistributionDenominator =
              effectiveParentRoq > 1
                ? effectiveParentRoq
                : node.data.status_obj?.length || 1;

            if (childDistributionDenominator > 0) {
              // Distribute using ROQ proportions
              unlockedChildren.forEach(({ item, childIndex }) => {
                // If child roq_constrained is 0, treat as 1 in calculation
                const childRoqConstrained =
                  (item.roq_constrained || 0) > 0 ? item.roq_constrained : 1;
                const childQuantity = Math.ceil(
                  (remainingParentQuantity * childRoqConstrained) /
                    childDistributionDenominator
                );

                item.order_quantity = setOrderQuantityValue(
                  item.order_quantity,
                  childQuantity
                );
                item.isEdited = true;

                const itemValue = getOrderQuantityValue(item.order_quantity);
                item.isMOQBreached =
                  (item.min_order_quantity !== null &&
                    itemValue < item.min_order_quantity) ||
                  (item.max_order_quantity !== null &&
                    itemValue > item.max_order_quantity);
              });
            } else {
              // Fallback: equal distribution if no ROQ data available
              const equalQuantity = Math.ceil(
                remainingParentQuantity / unlockedChildren.length
              );
              unlockedChildren.forEach(({ item }) => {
                item.order_quantity = setOrderQuantityValue(
                  item.order_quantity,
                  equalQuantity
                );
                item.isEdited = true;
              });
            }
          }

          // 🔒 Mark locked children as edited for payload tracking (values unchanged)
          lockedChildren.forEach(({ item, childIndex }) => {
            item.isEdited = true; // Track for payload but don't change values
          });

          // Update parent node quantity as sum of children
          const calculatedQuantity = node.data.status_obj.reduce(
            (acc, item) =>
              acc + (getOrderQuantityValue(item.order_quantity) || 0),
            0
          );
          node.data.order_quantity = setOrderQuantityValue(
            node.data.order_quantity,
            calculatedQuantity
          );
          node.data.isEdited = true;

          // Check MOQ breach for parent
          node.data.isMOQBreached =
            (node.data.min_order_quantity !== null &&
              calculatedQuantity < node.data.min_order_quantity) ||
            (node.data.max_order_quantity !== null &&
              calculatedQuantity > node.data.max_order_quantity);

          // 🎯 Update orderInfoEditedCells state for manually edited items only
          setOrderInfoEditedCells((prev) => {
            const updated = { ...prev };

            // Add/update parent node in edited cells only if manually edited
            const parentKey =
              node.data[
                orderInfoTableGridInstance.current.getUniqueRowId?.()
              ] ||
              node.data.store_code ||
              node.data.size ||
              node.data.id;

            if (node.data.isManuallyEdited) {
              updated[parentKey] = { ...node.data };
            }

            // Add/update all child nodes in edited cells only if manually edited
            node.data.status_obj.forEach((item) => {
              if (item.isEdited && item.isManuallyEdited) {
                updated[item.id] = { ...item };
              }
            });

            return updated;
          });
        });
      }

      // Refresh the OrderInfo grid to show changes
      orderInfoTableGridInstance.current.api.refreshCells({
        force: true,
        suppressFlash: false,
        columns: ["order_quantity"],
      });
    },
    [selectedSubClass]
  );

  const onCellUnlocked = useCallback(() => {
    if (
      orderDetailsEditedCellsRef.current &&
      Object.keys(orderDetailsEditedCellsRef.current).length > 0
    ) {
      // Get the last edited order details entry
      const orderGroupIds = Object.keys(orderDetailsEditedCellsRef.current);
      const lastOrderGroupId = orderGroupIds[orderGroupIds.length - 1];
      const lastEditedData =
        orderDetailsEditedCellsRef.current[lastOrderGroupId];

      if (lastEditedData && lastEditedData.order_quantity) {
        const totalCount = totalRecordCountRef.current || totalRecordCount;
        if (totalCount > 0) {
          applyDistributionWithCount(
            lastOrderGroupId,
            lastEditedData.order_quantity,
            totalCount
          );
        }
      }
    } else {
    }
  }, [totalRecordCount, applyDistributionWithCount]);

  /**
   * Bi-directional sync: Update OrderInfo table when Order Details quantity changes
   * Logic: Use totalRecordCount for proper pagination-aware distribution
   */
  /**
   * Explicitly clear top table distribution flags (only call when really needed)
   */
  const clearTopTableFlags = useCallback((reason) => {
    // Clear any pending timeout
    if (flagClearTimeoutRef.current) {
      clearTimeout(flagClearTimeoutRef.current);
      flagClearTimeoutRef.current = null;
    }

    hasTopTableUpdateRef.current = false;
    topTableDistributionParamsRef.current = null;
  }, []);

  const onOrderDetailsQuantityChange = useCallback(
    (orderGroupId, newQuantity) => {
      // 🎯 NEW: Set flag for top table update (using refs to prevent clearing)
      hasTopTableUpdateRef.current = true;
      const distributionParams = {
        orderGroupId,
        newQuantity: parseFloat(newQuantity) || 0,
        timestamp: Date.now(),
      };
      topTableDistributionParamsRef.current = distributionParams;

      // Clear any existing timeout that might clear the flag
      if (flagClearTimeoutRef.current) {
        clearTimeout(flagClearTimeoutRef.current);
        flagClearTimeoutRef.current = null;
      }

      if (!orderInfoTableGridInstance?.current?.api) {
        return;
      }

      const validQuantity = parseFloat(newQuantity) || 0;

      let bottomTableLockedTotal = 0;
      let bottomTableTotalRows = 0;
      let bottomTableLockedRows = 0;
      let isChildTableAvailable = false;

      orderInfoTableGridInstance.current.api.forEachNode((node) => {
        if (node.data.status_obj && Array.isArray(node.data.status_obj)) {
          // sum all child quantities for each parent node
          if (node?.data?.status_obj[0]?.order_group_id === orderGroupId) {
            isChildTableAvailable = true;

            node.data.status_obj.forEach((item) => {
              bottomTableTotalRows++;

              const isLocked = item.order_quantity?.isLocked === true;
              if (isLocked) {
                bottomTableLockedRows++;
                const itemQuantity = item.order_quantity?.value || 0;
                bottomTableLockedTotal += itemQuantity;
              }
            });
          }
        }
      });

      // NEW VALIDATION: Check if ALL rows are locked in OrderInfo table
      if (
        isChildTableAvailable &&
        bottomTableTotalRows > 0 &&
        bottomTableLockedRows === bottomTableTotalRows
      ) {
        displaySnackMessages(
          "All rows are locked in info table. Please unlock at least one row to edit.",
          "error",
          { disableOnClose: true }
        );

        // Revert the top table quantity back to previous value
        orderDetailsTableGridInstance.current.api.forEachNode((node) => {
          if (node.data.order_group_id === orderGroupId) {
            node.data.order_quantity = node.data.order_quantity_previous;
            node.data.isEdited = false;
            node.data.isQuantityEdited = false;

            orderDetailsTableGridInstance.current.api.refreshCells({
              force: true,
              suppressFlash: false,
              rowNodes: [node],
              columns: ["order_quantity"],
            });
          }
        });

        // Clear from edited cells state
        setOrderDetailsEditedCells((prev) => {
          const updated = { ...prev };
          delete updated[orderGroupId];
          orderDetailsEditedCellsRef.current = updated;
          return updated;
        });

        return;
      }

      // validate that new top table quantity is not less than current bottom table locked total
      if (isChildTableAvailable && validQuantity < bottomTableLockedTotal) {
        displaySnackMessages(
          "Order quantity should be greater than or equal to the locked order quantity",
          "error",
          { disableOnClose: true }
        );
        orderDetailsTableGridInstance.current.api.forEachNode((node) => {
          if (node.data.order_group_id === orderGroupId) {
            node.data.order_quantity = node.data.order_quantity_previous;
            orderDetailsTableGridInstance.current.api.refreshCells({
              force: true,
              suppressFlash: false,
              rowNodes: [node],
              columns: ["order_quantity"],
            });
          }
        });
        return;
      }

      // Check ref first for immediate access (bypasses React state timing)
      const currentTotalCount = totalRecordCountRef.current || totalRecordCount;

      if (!currentTotalCount) {
        return;
      }

      // ✅ ALL VALIDATIONS PASSED - Now update order_quantity_previous
      orderDetailsTableGridInstance.current.api.forEachNode((node) => {
        if (node.data.order_group_id === orderGroupId) {
          node.data.order_quantity_previous = node.data.order_quantity;
        }
      });

      // Apply distribution with current total count
      applyDistributionWithCount(orderGroupId, newQuantity, currentTotalCount);
    },
    [totalRecordCount, applyDistributionWithCount, displaySnackMessages]
  );

  /**
   * Bi-directional sync: Update Order Details table when OrderInfo quantity changes
   * 🔒 CRITICAL: Calculate total correctly by summing actual child values, not parent + children
   */
  const onOrderInfoQuantityChange = useCallback(
    (selectedSubClassData, differenceInTotalOrderQty) => {
      if (
        !orderDetailsTableGridInstance?.current?.api ||
        !selectedSubClassData
      ) {
        return;
      }

      // 🎯 The calculatedTotalFromChildren is already the correct sum of all children
      // We should use this directly, not add parent + children (which would double-count)
      let foundNode = false;
      orderDetailsTableGridInstance.current.api.forEachNode((node) => {
        if (node.data.order_group_id === selectedSubClassData.order_group_id) {
          foundNode = true;

          // Update the order quantity in the parent table
          const correctTopTableQuantity =
            node.data.order_quantity + differenceInTotalOrderQty;

          node.data.order_quantity = correctTopTableQuantity;
          node.data.isEdited = true;
          node.data.isQuantityEdited = true;

          // Update edited cells for save functionality
          setOrderDetailsEditedCells((prev) => {
            const updated = {
              ...prev,
              [node.data.order_group_id]: {
                ...node.data,
                order_quantity: correctTopTableQuantity,
              },
            };
            return updated;
          });

          // Refresh the cell to show the updated value
          orderDetailsTableGridInstance.current.api.refreshCells({
            force: true,
            suppressFlash: false,
            rowNodes: [node],
            columns: ["order_quantity"],
          });
        }
      });
    },
    []
  );

  /**
   * Bi-directional sync: Update OrderInfo table when Order Details date changes
   * Distributes the new date to all rows in OrderInfo table
   */
  const onOrderDetailsDateChange = useCallback(
    (orderGroupId, newDate) => {
      if (!orderInfoTableGridInstance?.current?.api) {
        return;
      }

      if (!selectedSubClass) {
        return;
      }

      if (selectedSubClass.order_group_id !== orderGroupId) {
        return;
      }

      // Update all nodes in OrderInfo table with the new date
      orderInfoTableGridInstance.current.api.forEachNode((node) => {
        if (node.data.status_obj && Array.isArray(node.data.status_obj)) {
          // Update parent node date
          node.data.editable_expected_receipt_date = newDate;
          node.data.isDateEdited = true;
          node.data.isEdited = true;

          // Update all child status_obj rows with the new date
          node.data.status_obj.forEach((item, index) => {
            item.editable_expected_receipt_date = newDate;
            item.isDateEdited = true;
            item.isEdited = true;

            // DON'T add to editedCells - this is automatic date sync, not user edit
            // setOrderInfoEditedCells should only track manual user edits
          });
        }
      });

      // Refresh the OrderInfo grid to show changes
      orderInfoTableGridInstance.current.api.refreshCells({
        force: true,
        suppressFlash: false,
        columns: ["editable_expected_receipt_date"],
      });
    },
    [selectedSubClass]
  );

  const clearPendingDistribution = useCallback(() => {
    // Clear pending distribution
    setPendingDistribution(null);
    totalRecordCountRef.current = 0;
    setTotalRecordCount(0);

    // 🎯 CRITICAL: Clear flag-based distribution state
    clearTopTableFlags("discard pending distribution");
  }, [clearTopTableFlags]);

  /**
   * Reset Order Details table when OrderInfo discards changes
   * (needed because bi-directional sync would have updated Details table)
   */
  const handleOrderInfoDiscardChanges = useCallback(() => {
    // Clear Order Details edited cells and ref
    setOrderDetailsEditedCells({});
    orderDetailsEditedCellsRef.current = {};

    // 🧹 CRITICAL: Clear pending distribution state
    clearPendingDistribution();

    if (orderDetailsTableGridInstance?.current?.api) {
      setTimeout(() => {
        try {
          orderDetailsTableGridInstance.current.api.refreshServerSideStore({
            purge: true,
          });
        } catch (error) {
          console.error(
            "Grid refresh error after OrderInfo discard (non-critical):",
            error
          );
        }
      }, 100);
    }

    displaySnackMessages("All changes discarded", "info");
  }, [displaySnackMessages, clearPendingDistribution]);

  const onTotalCountReceived = useCallback(
    (count) => {
      setTotalRecordCount(count);
      totalRecordCountRef.current = count;

      if (pendingDistribution && pendingDistribution.pendingApplication) {
        applyDistributionWithCount(
          pendingDistribution.orderGroupId,
          pendingDistribution.totalQuantity,
          count // Use fresh count directly
        );
      }
    },
    [pendingDistribution, applyDistributionWithCount]
  );

  /**
   * 🚀 NEW: Update pendingDistribution.roqConstrained when OrderInfo table API returns new total
   * This is needed when user switches/toggles in OrderInfo table (different views = different totals)
   */
  const onOrderInfoTotalReceived = useCallback(
    (newTotal) => {
      // Only update if we have pending distribution and original roq_constrained was 0
      if (pendingDistribution && selectedSubClass) {
        const originalRoqConstrained = selectedSubClass.roq_constrained || 0;

        if (originalRoqConstrained === 0 && newTotal > 0) {
          setPendingDistribution((prev) => ({
            ...prev,
            roqConstrained: newTotal,
          }));
        }
      }
    },
    [pendingDistribution, selectedSubClass]
  );

  const getPendingDistribution = useCallback(() => {
    // 🎯 NEW: Use ref-based approach - check if the requested order group matches
    if (
      hasTopTableUpdateRef.current &&
      topTableDistributionParamsRef.current &&
      (totalRecordCount || totalRecordCountRef.current)
    ) {
      // Check if the current selectedSubClass matches the stored distribution
      if (
        selectedSubClass &&
        selectedSubClass.order_group_id ===
          topTableDistributionParamsRef.current.orderGroupId
      ) {
        const currentTotalCount =
          totalRecordCountRef.current || totalRecordCount;

        // 🔧 CRITICAL FIX: Calculate roqConstrained same way as applyDistributionWithCount
        let effectiveRoqConstrained = selectedSubClass.roq_constrained || 0;

        // If roq_constrained is 0, we need to calculate it from Order Info table totals
        // But at this point, OrderInfo table might not be loaded yet, so we use pendingDistribution if available
        if (
          effectiveRoqConstrained === 0 &&
          pendingDistribution?.roqConstrained
        ) {
          effectiveRoqConstrained = pendingDistribution.roqConstrained;
        }

        const simulatedDistribution = {
          totalQuantity: topTableDistributionParamsRef.current.newQuantity,
          totalRecordCount: currentTotalCount,
          orderGroupId: topTableDistributionParamsRef.current.orderGroupId,
          roqConstrained: effectiveRoqConstrained, // 🚀 CRITICAL: Use calculated roqConstrained
          totalLockedValue: 0, // Assume no locks for now
          unlockedCount: currentTotalCount,
          fromFlag: true, // Mark this as flag-generated
        };

        return simulatedDistribution;
      }
    }

    return pendingDistribution; // Fallback to old approach
  }, [totalRecordCount, selectedSubClass, pendingDistribution]);

  /**
   * Common save function for both tables
   */
  const handleCommonSave = async () => {
    const hasOrderDetailsChanges =
      Object.keys(orderDetailsEditedCells).length > 0;
    const hasOrderInfoChanges = Object.keys(orderInfoEditedCells).length > 0;

    if (!hasOrderDetailsChanges && !hasOrderInfoChanges) {
      displaySnackMessages("No changes to save", "info");
      return;
    }

    // Check for validation errors before proceeding with save
    if (hasValidationErrors()) {
      displaySnackMessages(
        "Please correct all validation errors before saving",
        "error",
        { disableOnClose: true }
      );
      return;
    }

    try {
      const appliedOmsProductFilters = getFiltersFromState();
      if (appliedOmsProductFilters?.length === 0) {
        displaySnackMessages(SELECT_FILTERS_MESSAGE, "error");
        props.setOrderDetailsDataLoader(false);
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

      const selectedHierarchy =
        hierarchyInfo?.selected_hierarchy ||
        hierarchyInfo?.level_of_hierarchy_id ||
        hierarchyInfo?.selectedViewByOptions?.value ||
        "l0_name";
      const metricType = hierarchyInfo?.metric_type || "units";
      const dateFilter = hierarchyInfo?.date_filter || "month";
      let hierarchyFilters = [...appliedOmsProductFilters];
      if (
        hierarchyInfo?.level_of_hierarchy_value &&
        hierarchyInfo?.level_of_hierarchy_id
      ) {
        const hierarchyFilter = {
          filter_type: "cascaded",
          attribute_name: hierarchyInfo.level_of_hierarchy_id,
          operator: "in",
          dimension: "Product",
          values: [
            replaceSpecialCharToCharCode(
              hierarchyInfo.level_of_hierarchy_value
            ),
          ],
        };
        hierarchyFilters.push(hierarchyFilter);
      }

      // Create unified payload - always use Order Details structure as base
      const unifiedPayload = {
        filters: [...hierarchyFilters],
        fiscal_timeperiod_ids: fieldsData.current,
        filter_type: "week",
        modified: [],
      };

      // Process Order Details changes (top table)
      if (hasOrderDetailsChanges) {
        Object.values(orderDetailsEditedCells).forEach((item) => {
          const currentOrderQuantity =
            item?.order_quantity !== undefined &&
            item?.order_quantity !== null &&
            item?.order_quantity !== ""
              ? parseFloat(item.order_quantity)
              : parseFloat(item.total_order_quantity) || 0;

          let ordergroup = {
            name: item.order_group_id,
            order_quantity: {
              locked: false,
            },
            // 🎯 NEW: Add isManuallyEdited flag for UI reference
            isManuallyEdited: item.isManuallyEdited || false,
          };

          const roqConstrained = parseInt(item.roq_constrained);
          if (roqConstrained === 0) {
            ordergroup.order_quantity.value = currentOrderQuantity;
          } else {
            ordergroup.order_quantity.ratio = (
              currentOrderQuantity / roqConstrained
            ).toFixed(5);
          }

          if (
            item.isDateEdited &&
            item.editable_expected_receipt_date !== undefined &&
            item.editable_expected_receipt_date !== null
          ) {
            ordergroup.editable_expected_receipt_date =
              item.editable_expected_receipt_date;
          }

          unifiedPayload.modified.push({ ordergroup });
        });
      }

      const needsOrderInfoProcessing = hasOrderInfoChanges;

      if (needsOrderInfoProcessing) {
        const uniqueRowId = orderInfoTableGridInstance?.current?.getUniqueRowId?.();

        const orderGroupId = selectedSubClass?.order_group_id;

        if (orderGroupId) {
          let existingOrderGroup = unifiedPayload.modified.find(
            (item) => item.ordergroup.name === orderGroupId
          );

          if (!existingOrderGroup) {
            // Create new ordergroup for OrderInfo changes
            existingOrderGroup = {
              ordergroup: {
                name: orderGroupId,
                order_quantity: {
                  locked: false,
                  value: 0,
                },
              },
            };
            unifiedPayload.modified.push(existingOrderGroup);
          }

          // Create hierarchical order_info structure
          const orderInfoMap = new Map(); // Group by parent unique key

          // First pass: identify all parents and create their entries
          Object.values(orderInfoEditedCells).forEach((item, index) => {
            // Parent rows have status_obj array and represent stores/groups
            const isParentRow =
              item.status_obj && Array.isArray(item.status_obj);
            if (isParentRow) {
              // This is a parent-level edit
              const uniqueKey =
                item[uniqueRowId] || item.store_code || item.size || item.id;
              if (!orderInfoMap.has(uniqueKey)) {
                // Use "unique_key" as field name for now (simplified)
                const orderInfoEntry = {
                  [uniqueRowId]: uniqueKey,
                  locked: false,
                  orders: [], // Will hold child edits
                };

                orderInfoMap.set(uniqueKey, orderInfoEntry);
              }

              const parentInfo = orderInfoMap.get(uniqueKey);

              if (item.order_quantity !== undefined) {
                parentInfo.value = parseFloat(item.order_quantity) || 0;
              }

              // Add ratio if needed (for non-zero roq_constrained)
              if (item.roq_constrained && item.roq_constrained !== 0) {
                parentInfo.ratio =
                  (parseFloat(item.order_quantity) || 0) / item.roq_constrained;
              }

              if (item.isDateEdited && item.editable_expected_receipt_date) {
                let formattedDate = "";
                if (
                  moment(
                    item.editable_expected_receipt_date,
                    DATE_FORMAT
                  ).isValid()
                ) {
                  formattedDate = moment(
                    item.editable_expected_receipt_date,
                    DATE_FORMAT
                  ).format(TENANT_DATE_FORMAT);
                } else {
                  formattedDate = moment(
                    item.editable_expected_receipt_date,
                    TENANT_DATE_FORMAT
                  ).format(TENANT_DATE_FORMAT);
                }
                parentInfo.editable_expected_receipt_date = formattedDate;
              }
            }
          });

          // Second pass: handle child-level manual edits
          Object.values(orderInfoEditedCells).forEach((item, index) => {
            // Child rows don't have status_obj and represent individual SKUs/sizes
            const isChildRow = !item.status_obj;

            if (isChildRow) {
              // This is a child-level manual edit
              const parentKey =
                item[uniqueRowId] || item.store_code || "default"; // Associate with parent using correct field
              // Ensure parent exists (create if needed for orphaned children)
              if (!orderInfoMap.has(parentKey)) {
                orderInfoMap.set(parentKey, {
                  [uniqueRowId]: parentKey,
                  locked: false,
                  orders: [],
                });
              }

              const parentInfo = orderInfoMap.get(parentKey);

              const childValue =
                parseFloat(getOrderQuantityValue(item.order_quantity)) || 0;
              // Prepare child order entry with date if available
              // Check if this child order is locked
              const isChildLocked =
                typeof item.order_quantity === "object" &&
                item.order_quantity?.isLocked;
              const childOrder = {
                id: item.id,
                locked: isChildLocked,
                value: childValue,
              };

              // Add date to child if available
              if (item.isDateEdited && item.editable_expected_receipt_date) {
                let formattedDate = "";
                if (
                  moment(
                    item.editable_expected_receipt_date,
                    DATE_FORMAT
                  ).isValid()
                ) {
                  formattedDate = moment(
                    item.editable_expected_receipt_date,
                    DATE_FORMAT
                  ).format(TENANT_DATE_FORMAT);
                } else {
                  formattedDate = moment(
                    item.editable_expected_receipt_date,
                    TENANT_DATE_FORMAT
                  ).format(TENANT_DATE_FORMAT);
                }
                childOrder.editable_expected_receipt_date = formattedDate;
              }

              parentInfo.orders.push(childOrder);
            }
          });

          if (orderInfoTableGridInstance?.current?.api) {
            try {
              orderInfoTableGridInstance.current.api.forEachNode((node) => {
                if (
                  node.data &&
                  node.data.status_obj &&
                  Array.isArray(node.data.status_obj)
                ) {
                  const parentKey = node.data[uniqueRowId];
                  const parentOrderQuantity = node.data.order_quantity;
                  const isParentLocked =
                    typeof parentOrderQuantity === "object" &&
                    parentOrderQuantity?.isLocked === true;

                  let parentInfo;

                  if (orderInfoMap.has(parentKey)) {
                    // Update existing entry
                    parentInfo = orderInfoMap.get(parentKey);
                    parentInfo.locked = isParentLocked;
                  } else if (
                    isParentLocked ||
                    node.data.status_obj.some(
                      (child) =>
                        typeof child.order_quantity === "object" &&
                        child.order_quantity?.isLocked === true
                    )
                  ) {
                    // Create new entry for locked-only parents
                    parentInfo = {
                      [uniqueRowId]: parentKey,
                      locked: isParentLocked,
                      orders: [],
                    };
                    orderInfoMap.set(parentKey, parentInfo);
                  }

                  if (parentInfo) {
                    // If orders array is missing or empty, populate it from grid data
                    if (!parentInfo.orders || parentInfo.orders.length === 0) {
                      let actualParentValue = 0;
                      const childOrders = [];

                      node.data.status_obj.forEach((childData) => {
                        const childActualValue =
                          getOrderQuantityValue(childData.order_quantity) || 0;
                        const isChildLocked =
                          typeof childData.order_quantity === "object" &&
                          childData.order_quantity?.isLocked;

                        const effectiveChildLocked =
                          isParentLocked || isChildLocked;

                        actualParentValue += childActualValue;

                        const childOrder = {
                          id: childData.id,
                          locked: effectiveChildLocked,
                          value: childActualValue,
                        };

                        // Add child date if available
                        if (
                          childData.isDateEdited &&
                          childData.editable_expected_receipt_date
                        ) {
                          let formattedDate = "";
                          if (
                            moment(
                              childData.editable_expected_receipt_date,
                              DATE_FORMAT
                            ).isValid()
                          ) {
                            formattedDate = moment(
                              childData.editable_expected_receipt_date,
                              DATE_FORMAT
                            ).format(TENANT_DATE_FORMAT);
                          } else {
                            formattedDate = moment(
                              childData.editable_expected_receipt_date,
                              TENANT_DATE_FORMAT
                            ).format(TENANT_DATE_FORMAT);
                          }
                          childOrder.editable_expected_receipt_date = formattedDate;
                        }

                        childOrders.push(childOrder);
                      });

                      // 🔧 UPDATE parent info with populated orders array
                      parentInfo.orders = childOrders;
                      parentInfo.value = actualParentValue;

                      // Add parent date if available
                      if (
                        node.data.isDateEdited &&
                        node.data.editable_expected_receipt_date
                      ) {
                        let formattedDate = "";
                        if (
                          moment(
                            node.data.editable_expected_receipt_date,
                            DATE_FORMAT
                          ).isValid()
                        ) {
                          formattedDate = moment(
                            node.data.editable_expected_receipt_date,
                            DATE_FORMAT
                          ).format(TENANT_DATE_FORMAT);
                        } else {
                          formattedDate = moment(
                            node.data.editable_expected_receipt_date,
                            TENANT_DATE_FORMAT
                          ).format(TENANT_DATE_FORMAT);
                        }
                        parentInfo.editable_expected_receipt_date = formattedDate;
                      }
                    }
                  }
                }
              });
            } catch (gridError) {
              console.error(gridError.stack);
            }
          }

          // Always include parent-level value in addition to orders array
          Array.from(orderInfoMap.entries()).forEach(
            ([parentKey, parentInfo]) => {
              if (parentInfo.orders && parentInfo.orders.length > 0) {
                // Calculate parent value as sum of all child orders
                const totalChildValue = parentInfo.orders.reduce(
                  (sum, child) => sum + (child.value || 0),
                  0
                );
                parentInfo.value = totalChildValue;

                // If any child has a date, use it for the parent (they should all be the same due to bi-directional sync)
                const childWithDate = parentInfo.orders.find(
                  (child) => child.editable_expected_receipt_date
                );
                if (
                  childWithDate &&
                  !parentInfo.editable_expected_receipt_date
                ) {
                  parentInfo.editable_expected_receipt_date =
                    childWithDate.editable_expected_receipt_date;
                }
              }

              if (orderInfoTableGridInstance?.current?.api) {
                try {
                  orderInfoTableGridInstance.current.api.forEachNode((node) => {
                    if (node.data && node.data[uniqueRowId] === parentKey) {
                      const parentOrderQuantity = node.data.order_quantity;
                      const isParentLocked =
                        typeof parentOrderQuantity === "object" &&
                        parentOrderQuantity?.isLocked;

                      if (isParentLocked) {
                        parentInfo.locked = true; // Explicitly set to true for locked parents
                      } else if (parentInfo.locked === undefined) {
                        parentInfo.locked = false; // Only set to false if not already set
                      }
                    }
                  });
                } catch (gridError) {
                  console.error(gridError.stack);
                }
              }
            }
          );

          // Clean up and add the hierarchical order_info to the ordergroup
          const orderInfoArray = Array.from(orderInfoMap.values())
            .map((info, index) => {
              const shouldInclude =
                info.value !== undefined ||
                info.ratio !== undefined ||
                (info.orders && info.orders.length > 0) ||
                info.editable_expected_receipt_date ||
                info.locked === true;
              return { info, shouldInclude };
            })
            .filter((entry) => entry.shouldInclude)
            .map((entry) => {
              return entry.info;
            });

          if (orderInfoArray.length > 0) {
            existingOrderGroup.ordergroup.order_info = orderInfoArray;

            // 🎯 NEW: Only delete order_quantity if parent table row was not manually edited
            const hasManuallyEditedParent =
              existingOrderGroup.ordergroup.isManuallyEdited;

            if (!hasManuallyEditedParent) {
              delete existingOrderGroup.ordergroup.order_quantity;
            }
          }

          // OrderInfo hierarchy created successfully
        }
      }

      // 🧹 CRITICAL: Remove isManuallyEdited flag from payload before API call
      // This flag is only for UI reference, not for backend processing
      const cleanPayload = JSON.parse(JSON.stringify(unifiedPayload));
      cleanPayload.modified.forEach((item) => {
        if (item.ordergroup.isManuallyEdited !== undefined) {
          delete item.ordergroup.isManuallyEdited;
        }
        if (item.ordergroup.order_info) {
          item.ordergroup.order_info.forEach((info) => {
            if (info.isManuallyEdited !== undefined) {
              delete info.isManuallyEdited;
            }
            if (info.orders) {
              info.orders.forEach((order) => {
                if (order.isManuallyEdited !== undefined) {
                  delete order.isManuallyEdited;
                }
              });
            }
          });
        }
      });

      // Making unified API call

      let response;
      try {
        response = await props.saveOrderDetailsTable(cleanPayload);
      } catch (apiError) {
        displaySnackMessages(
          "Save operation failed. Please try again.",
          "error"
        );
        return;
      }

      if (response?.data?.status) {
        // Save successful - clean up ALL state and refs
        setOrderDetailsEditedCells({});
        setOrderInfoEditedCells({});
        orderDetailsEditedCellsRef.current = {}; // 🧹 Clear ref state too

        // 🧹 Reset distribution state
        setPendingDistribution(null);
        totalRecordCountRef.current = 0;
        setTotalRecordCount(0);

        // 🎯 NEW: Clear flag-based distribution
        clearTopTableFlags("save success");

        displaySnackMessages("Data saved successfully", "success");

        setTimeout(() => {
          try {
            refreshOrderDetailsTable();

            if (selectedSubClass) {
              refreshOrderInfoTable();
            }

            // Refresh the Order Details table to show changes
            orderDetailsTableGridInstance.current.api.refreshCells({
              force: true,
              suppressFlash: false,
              columns: ["order_quantity"],
            });
          } catch (error) {
            console.error(error);
          }
        }, 100);
      } else {
        displaySnackMessages("Changes failed to save", "error");
      }
    } catch (error) {
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  /**
   * Check if there are any validation errors in the grid
   */
  const hasValidationErrors = () => {
    let hasErrors = false;

    // Check Order Details table for validation errors
    if (orderDetailsTableGridInstance?.current?.api) {
      orderDetailsTableGridInstance.current.api.forEachNode((node) => {
        if (node.data && node.data.isEditableReceiptDateNotValid) {
          hasErrors = true;
        }
      });
    }

    // Check OrderInfo table for validation errors
    if (orderInfoTableGridInstance?.current?.api) {
      orderInfoTableGridInstance.current.api.forEachNode((node) => {
        if (node.data && node.data.isEditableReceiptDateNotValid) {
          hasErrors = true;
        }
      });
    }

    return hasErrors;
  };

  /**
   * Check if there are any unsaved changes
   */
  const hasUnsavedChanges = () => {
    return (
      Object.keys(orderDetailsEditedCells).length > 0 ||
      Object.keys(orderInfoEditedCells).length > 0
    );
  };

  /**
   * Check if save operation can be performed
   * Returns true only if there are unsaved changes AND no validation errors
   */
  const canSave = () => {
    return hasUnsavedChanges() && !hasValidationErrors();
  };

  /**
   * Refresh Order Details table - clears all cached data and resets to server state
   */
  const refreshOrderDetailsTable = () => {
    if (orderDetailsTableGridInstance?.current?.api) {
      try {
        // 🔄 Purge and refresh from server
        orderDetailsTableGridInstance.current.api.refreshServerSideStore({
          purge: true,
        });

        // 🧹 Clear selections and reset UI state
        orderDetailsTableGridInstance.current.api.deselectAll();
        setSelectedRows([]);
        setSelectedRowsForApproval([]);
      } catch (refreshError) {
        console.error(refreshError.stack);
      }
    }
  };

  /**
   * Refresh OrderInfo table - clears all cached data and resets to server state
   */
  const refreshOrderInfoTable = () => {
    if (orderInfoTableGridInstance?.current?.api) {
      try {
        // 🔄 Purge and refresh from server
        orderInfoTableGridInstance.current.api.refreshServerSideStore({
          purge: true,
        });
      } catch (refreshError) {
        console.error(refreshError.stack);
      }
    }
  };

  // Handle month/week filter changes
  const handleMonthWeekChange = (value, fieldName, formData) => {
    if (fieldName === "week") {
      fieldsData.current = value.week || [];
      // Refresh the Order Details table with new filter
      orderDetailsTableGridInstance?.current?.api?.refreshServerSideStore({
        purge: true,
      });

      // Also deselect all rows when filters change
      orderDetailsTableGridInstance?.current?.api?.deselectAll();
      setSelectedRows([]);
      setSelectedRowsForApproval([]);
    }
  };

  // Navigate to create scenario (matching original index.jsx)
  const navigateToCreateScenario = () => {
    const restrictionKey =
      SELECTED_ROW_FILTER_CONFIG?.[0]?.column_name || "order_group_id";
    const url = `${ORDER_MANAGEMENT_CREATE_SCENARIO_STORE}?step=0`;
    const uniqueIds = uniq(
      selectedRows.map((row) => row[restrictionKey]) // Extract the value of the restrictionKey
    );
    const selectedValues = uniqueIds.length > 0 ? uniqueIds : [];

    // create filter object to pass to create scenario
    const appliedOmsProductFilters = getFiltersFromState();

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

    const completeFilters = {
      filters: [...appliedOmsProductFilters],
      global_date_filter: [...appliedOmsDateFilters],
    };

    navigate(url, {
      state: {
        filters: [
          {
            filter_type: "cascaded",
            attribute_name: restrictionKey,
            operator: "in",
            dimension: "Product",
            values: selectedValues,
          },
        ],
        // pass the filter object
        completeFilters: completeFilters,
      },
    });
  };

  // Check if create scenario is restricted (matching original index.jsx)
  const isCreateScenarioRestricted = () => {
    try {
      let count = 0;
      const restrictionKey =
        SELECTED_ROW_FILTER_CONFIG?.[0]?.column_name || "order_group_id";
      const uniqueIds = uniq(
        selectedRows.map((row) => row[restrictionKey]) // Extract the value of the restrictionKey
      );
      count = uniqueIds.length;
      if (count > 0) {
        return !(count === MAX_RESTRICTED_COUNT);
      }

      // if no table selections are present, check if there is only one item from hierarchy or filters
      if (hierarchyInfo?.level_of_hierarchy_value) {
        return false; // Single hierarchy item selected, enable button
      }

      // if no table selections are present, check if filters allow single selection
      const appliedOmsProductFilters = getFiltersFromState();
      const filteredValues = appliedOmsProductFilters?.filter(
        (item) => item.attribute_name === restrictionKey
      );
      return !(
        filteredValues.length === 1 && filteredValues[0]?.values.length === 1
      );
    } catch (error) {
      console.log("Error in isCreateScenarioRestricted", error);
      return true;
    }
  };

  // Handle set all click
  const handleSetAllClick = () => {
    if (selectedRows.length === 0) {
      displaySnackMessages(
        "Please select at least one row to use Set All",
        "info"
      );
      return;
    }
    setShowSetAllModal(true);
  };

  /**
   * Handles the Set All operation (matching original index.jsx)
   * Calls the API to perform bulk update on selected rows.
   * Creates payload similar to setConstraintsDeliveryLeadTimeData pattern.
   */
  const handleSetAllData = async (setAllFormData) => {
    try {
      const selection = {
        data: getValidCheckConfiguration(
          orderDetailsTableGridInstance?.current?.api?.checkConfiguration
        ),
        unique_columns: ["order_group_id"],
      };

      // Get current applied filters (similar to selectedOmsFilters)
      const appliedOmsProductFilters = getFiltersFromState();
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

      // check if bottom OrderInfo table is open and collect locked children data
      let lockedChildrenByOrderGroup = {};

      if (
        selectedSubClass &&
        orderInfoTableGridInstance?.current?.getLockedChildrenData
      ) {
        const lockedData = orderInfoTableGridInstance.current.getLockedChildrenData();

        if (lockedData && lockedData.locked_children) {
          lockedChildrenByOrderGroup[lockedData.order_group_id] =
            lockedData.locked_children;
        }
      }

      // Create payload similar to leadTime.jsx updateSetAllData
      let body = {
        filters: [...appliedOmsProductFilters],
        global_date_filter: [...appliedOmsDateFilters],
        fiscal_weeks: fieldsData.current || [],
        selection,
        isSelectAllRecords:
          orderDetailsTableGridInstance?.current?.api?.isSelectAllRecords,
        roq_source: setAllFormData.roq_source,
        order_group_ids: setAllFormData.order_group_ids,
      };

      // add locked data to payload
      if (Object.keys(lockedChildrenByOrderGroup).length > 0) {
        body.locked_children_by_order_group = lockedChildrenByOrderGroup;
      }

      // Add keys if not selecting all records (similar to leadTime.jsx pattern)
      if (!orderDetailsTableGridInstance?.current?.api?.isSelectAllRecords) {
        body.keys = ["order_group_id"];
      }

      const response = await props.setAllOrderDetailsData(body);
      if (response?.data?.status) {
        displaySnackMessages(
          "Set All operation completed successfully",
          "success"
        );

        // Clear selections and refresh table (similar to leadTime.jsx)
        setSelectedRows([]);
        orderDetailsTableGridInstance?.current?.api?.deselectAll(true);
        orderDetailsTableGridInstance?.current?.api?.setCheckConfiguration([]);
        orderDetailsTableGridInstance?.current?.api?.refreshServerSideStore({
          purge: false,
        });

        if (selectedSubClass && orderInfoTableGridInstance?.current?.api) {
          setTimeout(() => {
            try {
              orderInfoTableGridInstance.current.api.refreshServerSideStore({
                purge: true,
              });
            } catch (error) {
              console.error(
                "Error refreshing OrderInfo table after Set All:",
                error
              );
            }
          }, 500);
        }

        return true;
      } else {
        displaySnackMessages("Set All operation failed", "error");
        return false;
      }
    } catch (error) {
      console.error("Error in Set All operation:", error);
      displaySnackMessages("Set All operation failed", "error");
      return false;
    }
  };

  const getCheckConfigurationForApproval = () => {
    let l_checkAllSetAllRequest = {
      searchColumns: orderDetailsTableGridInstance?.current?.api?.getFilterModel(),
    };
    if (
      orderDetailsTableGridInstance?.current?.api?.checkConfiguration[
        orderDetailsTableGridInstance?.current?.api?.checkConfiguration.length -
          2
      ]
    ) {
      setCheckAllSetAllRequest((old) => {
        if (!isEmpty(old)) {
          return [...old, l_checkAllSetAllRequest];
        } else {
          return [l_checkAllSetAllRequest];
        }
      });
    }
    const selection = {
      data: getValidCheckConfiguration(
        orderDetailsTableGridInstance?.current?.api?.checkConfiguration
      ),
      unique_columns: ["order_group_id"],
    };
    const checkConfig = {
      selection,
      isSelectAllRecords:
        orderDetailsTableGridInstance?.current?.api?.isSelectAllRecords,
    };
    return checkConfig;
  };

  // Handle approval button click (matching original index.jsx)
  const onApproveButtonClick = () => {
    const attributeKey = props?.deepDiveFilters[0]?.column_name;
    const styleOrderPayload = {
      styles: orderDetailsTableGridInstance?.current?.api?.isSelectAllRecords
        ? null
        : selectedRowsForApproval?.map((row) => row?.[attributeKey]),
    };
    styleOrderPayload.fiscal_weeks = fieldsData.current || [];
    setApprovalFlowPayload(styleOrderPayload);
    setShowApprovalModal(true);
  };

  // Open deep dive bottom sheet (matching original index.jsx flow)
  const openDeepDiveBottomSheet = () => {
    preparePayloadForDeepDive();
    setOpenDeepDive(true);
  };

  const closeDeepDiveBottomSheet = () => {
    setOpenDeepDive(false);
  };

  const preparePayloadForDeepDive = () => {
    try {
      let appliedOMSFilters = cloneDeep(props?.omsFilterConfiguration || []);

      const filterConfigForOrderRow = SELECTED_ROW_FILTER_CONFIG?.[0] || {};

      const selectedIdsFromOrderTable = [];
      selectedRows.forEach((row) => {
        const columnId = filterConfigForOrderRow?.column_name;
        if (columnId && row[columnId]) {
          selectedIdsFromOrderTable.push(row[columnId]);
        }
      });

      const selectedRowsFilter = {
        filter_type: filterConfigForOrderRow?.type,
        attribute_name: filterConfigForOrderRow?.column_name,
        operator: "in",
        dimension: filterConfigForOrderRow?.dimension,
        values: [...selectedIdsFromOrderTable],
      };

      const checkConfigurationForDeepDive = getCheckConfigurationForApproval();
      let payload;
      if (checkConfigurationForDeepDive?.isSelectAllRecords) {
        payload = {
          filters: [...appliedOMSFilters],
        };
        props?.setSelectedRowsFromOrderDetails([]);
      } else {
        payload = {
          filters: [...appliedOMSFilters, selectedRowsFilter],
        };
        props?.setSelectedRowsFromOrderDetails(selectedRowsFilter);
      }

      props?.setDeepDiveFiltersPayload(payload);
    } catch (error) {
      console.log(
        "Error while creating Payload for Product details page",
        error
      );
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  // Get top left options (filters and Set All button)
  const getTopLeftOptions = () => {
    let options = [];

    // Add filters
    options.push(
      <div key="filters" style={{ minWidth: "400px" }}>
        <Form
          layout={"horizontal"}
          maxFieldsInRow={1}
          labelWidthSpan={2}
          fieldTypeWidthSpan={2}
          handleChange={handleMonthWeekChange}
          fields={fields}
          updateDefaultValue={true}
        />
      </div>
    );

    return options;
  };

  // Get top right options (conditional action buttons for table)
  const getTopRightOptions = () => {
    let options = [];

    // Action buttons when rows are selected (these go inside the table)
    if (selectedRows.length > 0) {
      options.push(
        <div key="table-action-buttons" style={{ display: "flex", gap: "8px" }}>
          <Button
            variant="outlined"
            onClick={handleSetAllClick}
            disabled={
              !isEmpty(props?.userAccess) ? !isUserHasSetAllAccess : false
            }
          >
            Set All
          </Button>

          <Button
            variant="outlined"
            onClick={() => {
              // Handle Working Space action
            }}
            disabled={
              !isEmpty(props?.userAccess) ? !isUserHasWorkingSpaceAccess : false
            }
          >
            Working Space
          </Button>
          <Button variant="outlined" onClick={openDeepDiveBottomSheet}>
            Deep Dive
          </Button>
          <Button
            variant="outlined"
            disabled={isCreateScenarioRestricted()}
            onClick={navigateToCreateScenario}
          >
            Create Scenario
          </Button>
          <Button variant="contained" onClick={onApproveButtonClick}>
            Send for Approval
          </Button>
        </div>
      );
    }

    return options;
  };

  // Navigate to High Level Summary (matching original index.jsx)
  const navigateToHighLevelSummary = () => {
    const redirectionSource = redirectionDetails?.source;

    if (redirectionSource === "high_level_summary") {
      const filterDependency = props?.selectedFilters || [];
      const redirectDetails = {
        source: "order_details",
        target: "high_level_summary_vendor_store",
        dateFilters: redirectionDetails?.dateFilters || [],
      };

      props?.setRedirectionDetails(redirectDetails);

      navigate(ORDER_MANAGEMENT, {
        state: {
          selectedTab: "vendor_store",
          isRedirectedFromOrderDetails: true,
          filterDependency: filterDependency,
          hierarchyInfo: hierarchyInfo,
        },
      });
    } else {
      navigate(ORDER_MANAGEMENT);
    }
  };

  const onSelectionChanged = (event) => {
    let selectedRowsData = [];
    orderDetailsTableGridInstance.current.api.forEachNode((node) => {
      if (node.selected) {
        selectedRowsData.push({ ...node.data });
      }
    });
    setSelectedRows(selectedRowsData);
    setSelectedRowsForApproval(selectedRowsData);
  };

  // Handle confirmation to proceed despite unsaved changes
  const handleProceedWithUnsavedChanges = () => {
    // Clear unsaved changes state AND ref
    setOrderDetailsEditedCells({});
    setOrderInfoEditedCells({});
    orderDetailsEditedCellsRef.current = {}; // Clear the ref too!

    // 🧹 CRITICAL: Clear ALL distribution state completely
    clearPendingDistribution();

    setTimeout(() => {
      try {
        if (orderDetailsTableGridInstance?.current?.api) {
          orderDetailsTableGridInstance.current.api.refreshServerSideStore({
            purge: true,
          });
          orderDetailsTableGridInstance.current.api.deselectAll();
        }

        if (orderInfoTableGridInstance?.current?.api) {
          orderInfoTableGridInstance.current.api.refreshServerSideStore({
            purge: true,
          });
        }
      } catch (error) {
        console.error(error);
      }
    }, 100);

    setSelectedSubClass(pendingSelectedSubClass);
    setShowUnsavedChangesPrompt(false);
    setPendingSelectedSubClass(null);
    displaySnackMessages("Unsaved changes discarded", "info");
  };

  // Handle cancellation of opening OrderInfo table
  const handleCancelUnsavedChanges = () => {
    setShowUnsavedChangesPrompt(false);
    setPendingSelectedSubClass(null);
  };

  // Get external save button (outside the table)
  const getExternalSaveButton = () => {
    return (
      <Button
        key="external-save-button"
        variant="contained"
        onClick={handleCommonSave}
        disabled={
          !isEmpty(props?.userAccess)
            ? !isUserHasEditAccess || !canSave()
            : !canSave()
        }
      >
        Save
      </Button>
    );
  };

  const routeOptions = [
    {
      label: "Home",
      to: "/home",
    },
    {
      id: 1,
      label: "High Level Summary",
      action: () => {
        navigateToHighLevelSummary();
      },
    },
    {
      id: 2,
      label: "Order Details",
      action: () => {},
    },
  ];

  return (
    <div className={globalClasses.pageContainer}>
      <div className={globalClasses.paddingAround}>
        <div className={globalClasses.marginBottom}>
          {!isRedirectedFromDifferentPage && (
            <HeaderBreadCrumbs options={routeOptions} />
          )}
        </div>

        <Loader loader={loading} minHeight={"400px"}>
          <Grid container spacing={3}>
            {/* Order Details Table */}
            <Grid item xs={12}>
              <div className={globalClasses.marginVertical1rem}>
                <Loader
                  loader={
                    props.orderDetailsTableConfigLoader ||
                    props.orderDetailsDataLoader
                  }
                  minHeight={"260px"}
                >
                  {render && (
                    <AgGridComponent
                      columns={orderDetailsTableColumns}
                      manualCallBack={orderDetailsManualCallback}
                      loadTableInstance={(params) => {
                        orderDetailsTableGridInstance.current = params;
                      }}
                      pagination={true}
                      topLeftOptions={getTopLeftOptions()}
                      topRightOptions={getTopRightOptions()}
                      onCellValueChanged={onCellValueChanged}
                      onBlur={onBlur}
                      totalCount={1}
                      cacheBlockSize={10}
                      serverSideStoreType="partial"
                      rowModelType="serverSide"
                      uniqueRowId={"order_group_id"}
                      rowSelection="multiple"
                      onRowSelected
                      onSelectionChanged={onSelectionChanged}
                      suppressRowClickSelection={false}
                      selectAllHeaderComponent={true}
                      hideSelectAllRecords={false}
                      isRowSelectable={(rowNode) =>
                        rowNode.data
                          ? checkForEditability({ data: rowNode.data })
                          : false
                      }
                      onRowGroupOpened={(params) => {
                        if (params.expanded) {
                          // Check if there are unsaved changes before opening OrderInfo table
                          if (hasUnsavedChanges()) {
                            setPendingSelectedSubClass(params.data);
                            setShowUnsavedChangesPrompt(true);
                            // Collapse the row back to prevent visual confusion
                            params.node.setExpanded(false);
                          } else {
                            setSelectedSubClass(params.data);

                            // Apply any pending quantity changes when OrderInfo table opens
                            if (
                              orderDetailsEditedCells[
                                params.data.order_group_id
                              ]
                            ) {
                              const editedData =
                                orderDetailsEditedCells[
                                  params.data.order_group_id
                                ];
                              if (
                                editedData.isQuantityEdited &&
                                editedData.order_quantity
                              ) {
                                // Wait a moment for OrderInfo table to be fully rendered, then apply distribution
                                setTimeout(() => {
                                  onOrderDetailsQuantityChange(
                                    params.data.order_group_id,
                                    editedData.order_quantity
                                  );
                                }, 200); // Small delay to ensure OrderInfo table is ready
                              }
                            }
                          }
                        } else {
                          setSelectedSubClass(null);
                        }
                      }}
                    />
                  )}

                  {/* OrderInfo Table - conditionally rendered */}
                  {selectedSubClass && (
                    <>
                      <OrderInfoTable
                        selectedSubClass={selectedSubClass}
                        setSelectedSubClass={setSelectedSubClass}
                        refreshStyleOrderSummaryTableData={
                          refreshOrderDetailsTable
                        }
                        globalFiltersInParentLevel={globalFilters.current}
                        fieldsDataInParentLevel={fieldsData.current}
                        ropParentDateRange={props.ropDate}
                        recommRecieptParentDateRange={props.recommRecieptDate}
                        isCalledFromVendorStore={true}
                        onOrderInfoQuantityChange={onOrderInfoQuantityChange}
                        onOrderDetailsDateChange={onOrderDetailsDateChange}
                        orderInfoEditedCells={orderInfoEditedCells}
                        setOrderInfoEditedCells={setOrderInfoEditedCells}
                        orderInfoTableGridInstance={orderInfoTableGridInstance}
                        onOrderInfoDiscardChanges={
                          handleOrderInfoDiscardChanges
                        }
                        onTotalCountReceived={onTotalCountReceived}
                        onOrderInfoTotalReceived={onOrderInfoTotalReceived}
                        getPendingDistribution={getPendingDistribution}
                        clearPendingDistribution={clearPendingDistribution}
                        onCellUnlocked={onCellUnlocked}
                        {...props}
                      />
                    </>
                  )}
                </Loader>
              </div>
            </Grid>
          </Grid>
        </Loader>
      </div>

      {/* Modals and other components */}
      {showApprovalModal && (
        <ApprovalFlowDialogVendorStore
          setShowApprovalModal={setShowApprovalModal}
          screenName={OMS_ORDER_MANAGEMENT_SCREENNAME}
          fiscalCalendarDetails={fiscalCalendarDetails}
          selectedRows={selectedRowsForApproval}
          targetTable={"style_order_summary"}
          reloadComponent={setOrderDetailsApiSuccess}
          getCheckConfigurationForStyleOrderSummary={
            getCheckConfigurationForApproval
          }
          styleOrderSummaryPayload={approvalFlowPayload}
        />
      )}

      {openDeepDive && (
        <DeepDiveBottomSheet
          selectedRows={selectedRows}
          onClose={closeDeepDiveBottomSheet}
        />
      )}

      {showSetAllModal && (
        <OrderDetailsSetAllModal
          setShowSetAllModal={setShowSetAllModal}
          selectedRows={selectedRows}
          fieldsData={fieldsData.current}
          SetAllData={handleSetAllData}
          displaySnackMessages={displaySnackMessages}
          vendorToStoreScreenConfig={props?.vendorToStoreScreenConfig}
        />
      )}

      {/* Unsaved Changes Confirmation Prompt */}
      <Prompt
        isOpen={showUnsavedChangesPrompt}
        variant="warning"
        title="Are you sure you want to continue?"
        primaryButtonLabel="Yes"
        secondaryButtonLabel="No"
        onPrimaryButtonClick={handleProceedWithUnsavedChanges}
        onSecondaryButtonClick={handleCancelUnsavedChanges}
        handleClose={handleCancelUnsavedChanges}
      >
        Any unsaved changes will be lost.
      </Prompt>

      {/* Bottom Button Container */}
      <div className={globalClasses.stickyFooter}>
        <Button variant="tertiary" onClick={navigateToHighLevelSummary}>
          {"< Back to High Level Summary"}
        </Button>
        {getExternalSaveButton()}
      </div>
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    userAccess:
      store.omsReducer.orderingCommonService.orderingUserAccess?.vendor_store,
    highLevelSummaryState:
      store.omsReducer.orderManagementService.highLevelSummaryState,
    redirectionDetails: store.omsReducer.orderManagementService.redirectDetails,
    orderDetailsTableConfigLoader:
      store.omsReducer.orderManagementService.orderDetailsTableConfigLoader,
    orderDetailsDataLoader:
      store.omsReducer.orderManagementService.orderDetailsDataLoader,
    selectedFilters: store.omsReducer.orderManagementService.selectedFilters,
    ropDate: store.omsReducer.orderManagementService.ropDate,
    recommRecieptDate:
      store.omsReducer.orderManagementService.recommRecieptDate,
    omsFilterConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "orderManagementVendorStoreFilterConfiguration"
      ]?.appliedFilterData?.dependencyData,
    vendorToStoreScreenConfig:
      store?.omsReducer.orderingCommonService?.orderingVendorToStoreConfig
        ?.oms_dashboard,
    orderDetailsFilters:
      store.omsReducer.orderManagementVendorToStoreService.orderDetailsFilters,
    deepDiveFilters:
      store.omsReducer.orderManagementVendorToStoreService.deepDiveFilters,
    deepDiveFiltersData:
      store.omsReducer.orderManagementVendorToStoreService.deepDiveFiltersData,
    deepDiveFiltersPayload:
      store.omsReducer.orderManagementVendorToStoreService
        .deepDiveFiltersPayload,
    isDeepDiveFiltersLoading:
      store.omsReducer.orderManagementVendorToStoreService
        .isDeepDiveFiltersLoading,
    deepDiveWeekRange:
      store.omsReducer.orderManagementVendorToStoreService.deepDiveWeekRange,
    fiscalCalendarData:
      store.omsReducer.orderManagementVendorToStoreService.fiscalCalendarData,
    orderInfoTableDataLoader:
      store.omsReducer.orderManagementVendorToStoreService
        .orderInfoTableDataLoader,
    orderInfoTableConfigLoader:
      store.omsReducer.orderManagementVendorToStoreService
        .orderInfoTableConfigLoader,
  };
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
  closeSnack: (payload) => dispatch(closeSnack(payload)),
  getOmsOrderDetailsColumnConfig: (payload) =>
    dispatch(getOmsOrderDetailsColumnConfig(payload)),
  getOmsOrderDetailsTableData: (payload) =>
    dispatch(getOmsOrderDetailsTableData(payload)),
  setOrderDetailsTableConfigLoader: (payload) =>
    dispatch(setOrderDetailsTableConfigLoader(payload)),
  setOrderDetailsDataLoader: (payload) =>
    dispatch(setOrderDetailsDataLoader(payload)),
  setRedirectionDetails: (payload) => dispatch(setRedirectionDetails(payload)),
  saveOrderDetailsTable: (payload) => dispatch(saveOrderDetailsTable(payload)),
  getOmsOrderSummaryColumnConfig: (payload) =>
    dispatch(getOmsOrderSummaryColumnConfig(payload)),
  getOmsOrderSummaryTableData: (payload) =>
    dispatch(getOmsOrderSummaryTableData(payload)),
  setOrderInfoTableConfigLoader: (payload) =>
    dispatch(setOrderInfoTableConfigLoader(payload)),
  setOrderInfoTableDataLoader: (payload) =>
    dispatch(setOrderInfoTableDataLoader(payload)),
  resetOrderDetailsFilters: (payload) =>
    dispatch(resetOrderDetailsFilters(payload)),
  setSelectedRowsFromOrderDetails: (payload) =>
    dispatch(setSelectedRowsFromOrderDetails(payload)),
  setDeepDiveFiltersPayload: (payload) =>
    dispatch(setDeepDiveFiltersPayload(payload)),
  setDeepDiveFilters: (payload) => dispatch(setDeepDiveFilters(payload)),
  tenantConfigApiCache: (application, queryParam) =>
    dispatch(tenantConfigApiCache(application, queryParam)),
  setOrderDetailsFilters: (payload) =>
    dispatch(setOrderDetailsFilters(payload)),
  getOmsOrderSummaryFilters: () => dispatch(getOmsOrderSummaryFilters()),
  setDeepDiveWeekRange: (payload) => dispatch(setDeepDiveWeekRange(payload)),
  resetDeepDiveReducersForVendorStore: () =>
    dispatch(resetDeepDiveReducersForVendorStore()),
  setFiscalCalendarData: (payload) => dispatch(setFiscalCalendarData(payload)),
  setAllOrderDetailsData: (payload) =>
    dispatch(setAllOrderDetailsData(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(OrderDetailsWrapper);
