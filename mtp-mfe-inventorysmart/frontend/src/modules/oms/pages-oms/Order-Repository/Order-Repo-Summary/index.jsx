import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import Loader from "core/Utils/Loader/loader";
import globalStyles from "core/Styles/globalStyles";
import { Divider, FormControl } from "@mui/material";
import { Select, Switch } from "impact-ui-v3";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import classNames from "classnames";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import { isEmpty, cloneDeep } from "lodash";
import { ButtonGroup, Chips, Button } from "impact-ui-v3";
import EmptyStateWrapper from "core/commonComponents/coreComponentScreen/EmptyStateWrapper";
import NormalCalendarFiscalMapping from "core/commonComponents/calendar/normalCalendarFiscalMapping";
import moment from "moment";
import { replaceSpecialCharToCharCode } from "core/Utils/functions/utils";
import {
  ERROR_MESSAGE,
  OMS_HIGH_LEVEL_SUMMARY_ROQ_DATE_OPTIONS,
  TABLE_COLUMN_GROUPING_EXTRA,
  ORDER_REPOSITORY_SUMMARY_TAB_LIST,
  UPDATED_MESSAGE,
} from "modules/oms/constants-oms/stringConstants";
import { getMaxEditableReceiptDate } from "modules/oms/services-oms/Order-Management/order-management-service";
import {
  getOrderRepoSummaryTableData,
  getOrderRepoSummaryTableConfig,
  editOrderRepoSummaryTable,
  setOrderRepoSummaryApiPayload,
  setMaxEditableReceiptDate,
  setMaxEditableReceiptDateLoader,
} from "modules/oms/services-oms/Order-Repository/order-repository-service";
import { filterDisplayColumnsByLabel } from "modules/oms/utils-oms/utils";
import LockIcon from "@mui/icons-material/Lock";
import {
  isPacksColumn,
  isEachesColumn,
  isEachesSubHeader,
  isEditablePacksStatus,
  deriveEachesColumnName,
  deriveEachesFromPacks,
  distributePacksWithResidual,
  isPresentNumericCellValue,
  patchOrderRepoEmptyQuantityLinks,
  wrapOrderRepoColumnClick,
  applyOrderRepoPacksEachesSubHeaders,
} from "modules/oms/utils-oms/orderRepoPacksEaches.util";

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

const OrderRepositorySummaryTable = ({
  selectedMonthTab,
  selectedRoqDateOption,
  ...props
}) => {
  const globalClasses = globalStyles();
  const classes = useStyles();

  const VIEWBY_DROPDOWN_OPTIONS = props?.viewByDropdownOptions || [];

  // Helper function to flatten grouped options structure
  const flattenViewByOptions = (options) => {
    if (!options || options.length === 0) return [];

    // Check if options are grouped (has 'options' property)
    const isGrouped = options.some(
      (opt) => opt.options && Array.isArray(opt.options)
    );

    if (isGrouped) {
      // Flatten grouped structure
      return options.flatMap((group) => group.options || []);
    }

    // Return as-is if already flat
    return options;
  };

  const FLATTENED_VIEWBY_OPTIONS = flattenViewByOptions(
    VIEWBY_DROPDOWN_OPTIONS
  );

  const DEFAULT_VIEW_BY_OPTION =
    props?.screenConfig?.default_selected_view_by_option;

  const SHOW_WEEK_DATE_RANGE =
    props?.screenConfig?.show_week_date_range || false;

  const ORDER_PLACEMENT_WEEKS_LIMIT =
    props?.screenConfig?.order_placement_weeks_limit || 26;

  const SHOW_VIEW_SENT_FOR_APPROVAL_SWITCH =
    props?.screenConfig?.show_view_sent_for_approval_switch || false;

  const VIEW_SENT_FOR_APPROVAL_SWITCH_LEFT_LABEL =
    props?.screenConfig?.view_sent_for_approval_switch_left_label ||
    "View Only Sent For Approval";
  const VIEW_SENT_FOR_APPROVAL_SWITCH_RIGHT_LABEL =
    props?.screenConfig?.view_sent_for_approval_switch_right_label;

  // Configuration key for ratio calculation column (can be changed for different clients)
  // This specifies WHICH COLUMN'S VALUES to use for calculating the distribution ratio
  //
  // IMPORTANT: This is the column whose old/new values determine the ratio
  // The ratio is then applied to distribute values in the EDITED column's children
  //
  // CURRENT SCENARIO:
  // - Edit "orders_under_review" → Use "orders_under_review" values for ratio
  //
  // FUTURE SCENARIO EXAMPLE:
  // - Edit "orders_under_review" → Use "pending_orders" values for ratio
  // - Set: ratio_calculation_column: "pending_orders"
  // - Ratio = (New pending_orders) / (Old pending_orders)
  // - Apply this ratio to distribute "orders_under_review" values to children
  const RATIO_CALCULATION_COLUMN =
    props?.screenConfig?.ratio_calculation_column || "orders_under_review";

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
    props?.screenConfig?.month_week_tab_list ||
    ORDER_REPOSITORY_SUMMARY_TAB_LIST;

  const [tableColumns, setTableColumns] = useState([]);
  const [subHeaderColumnNames, setSubHeaderColumnNames] = useState([]);
  const [render, setRender] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loader, setLoader] = useState(false);
  const [tableLoader, setTableLoader] = useState(false);
  const [configLoader, setConfigLoader] = useState(false);
  const [isViewSentForApproval, setIsViewSentForApproval] = useState(true);

  // Track edited cells for building payload to send to backend
  // Structure: Array of edit objects with parent info, child values, and fiscal week
  const [editedCellsPayload, setEditedCellsPayload] = useState([]);

  const [metricTypeChecked, setMetricTypeChecked] = useState(true);

  const [selectedRoqDateTab, setSelectedRoqDateTab] = useState(
    selectedRoqDateOption ||
      props?.redirectionDetails?.selectedRoqDateTab ||
      "roq_placement_date"
  );

  const [currentViewByOptions, setCurrentViewByOptions] = useState(
    VIEWBY_DROPDOWN_OPTIONS
  );
  const [selectedViewByOptions, setSelectedViewByOptions] = useState(() => {
    const savedOptions = props?.highLevelSummaryState?.selectedViewByOptions;
    if (savedOptions) return savedOptions;

    // Check if options are grouped
    const isGrouped = VIEWBY_DROPDOWN_OPTIONS.some(
      (opt) => opt.options && Array.isArray(opt.options)
    );

    if (isGrouped) {
      // For grouped structure, select first option from Products and first from Store
      const productsGroup = VIEWBY_DROPDOWN_OPTIONS.find(
        (g) => g.label === "Products"
      );
      const storeGroup = VIEWBY_DROPDOWN_OPTIONS.find((g) => g.label === "DC");

      const defaultSelections = [
        productsGroup?.options?.[0],
        storeGroup?.options?.[0],
      ].filter(Boolean);

      return defaultSelections.length > 0
        ? defaultSelections
        : [FLATTENED_VIEWBY_OPTIONS[0]];
    }

    // For flat structure, return single value
    return DEFAULT_VIEW_BY_OPTION || FLATTENED_VIEWBY_OPTIONS[0];
  });
  const [isOpenViewBy, setIsOpenViewBy] = useState(false);
  const [isSelectAllViewBy, setIsSelectAllViewBy] = useState(false);

  // Handler for View By selection with grouped structure
  // Rule: Only one option from Products and one from Store can be selected
  const handleViewByChange = (newSelectedOptions) => {
    if (!Array.isArray(newSelectedOptions)) {
      setSelectedViewByOptions(newSelectedOptions);
      return;
    }

    // Check if options are grouped
    const isGrouped = VIEWBY_DROPDOWN_OPTIONS.some(
      (opt) => opt.options && Array.isArray(opt.options)
    );

    if (!isGrouped) {
      // If not grouped, use the first selected option
      setSelectedViewByOptions(
        newSelectedOptions[0] || FLATTENED_VIEWBY_OPTIONS[0]
      );
      return;
    }

    // For grouped structure: ensure only one from Products and one from Dc
    const productsGroup = VIEWBY_DROPDOWN_OPTIONS.find(
      (g) => g.label === "Products"
    );
    const storeGroup = VIEWBY_DROPDOWN_OPTIONS.find((g) => g.label === "DC");

    const productsOptions = productsGroup?.options || [];
    const storeOptions = storeGroup?.options || [];

    const productsValues = productsOptions.map((opt) => opt.value);
    const storeValues = storeOptions.map((opt) => opt.value);

    // Filter selected options by group
    const selectedFromProducts = newSelectedOptions.filter((opt) =>
      productsValues.includes(opt.value)
    );
    const selectedFromStore = newSelectedOptions.filter((opt) =>
      storeValues.includes(opt.value)
    );

    // Keep only the last selected option from each group
    // If no option is selected from a group, auto-select the first option
    let productSelection =
      selectedFromProducts[selectedFromProducts.length - 1];
    let storeSelection = selectedFromStore[selectedFromStore.length - 1];

    // Ensure at least one product is always selected
    if (!productSelection && productsOptions.length > 0) {
      productSelection = productsOptions[0];
    }

    // Ensure at least one DC is always selected
    if (!storeSelection && storeOptions.length > 0) {
      storeSelection = storeOptions[0];
    }

    const finalSelection = [productSelection, storeSelection].filter(Boolean);

    // For multi-select grouped structure, keep the array of selections
    // Always ensure we have at least one selection from each group
    setSelectedViewByOptions(
      finalSelection.length > 0 ? finalSelection : [FLATTENED_VIEWBY_OPTIONS[0]]
    );
  };

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

  const hiddenColsAppliedRef = useRef(false);

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

  // MTP-146390: mute + lock affordance on eaches cells (never writable)
  const applyEachesReadOnlyPresentation = (columnsDef = []) => {
    const walk = (cols) =>
      (cols || []).map((col) => {
        const next = { ...col };
        if (Array.isArray(next.children) && next.children.length) {
          next.children = walk(next.children);
        }
        const field =
          next.field || next.colId || next.column_name || next.accessor || "";
        const headerLabel = (
          next.headerName ||
          next.originalLabel ||
          next.label ||
          ""
        )
          .trim()
          .toLowerCase();
        const isEachesCell =
          isEachesColumn(field) ||
          headerLabel === "eaches" ||
          isEachesSubHeader(next);
        if (isEachesCell) {
          next.editable = false;
          next.is_editable = false;
          next.cellStyle = {
            ...(typeof next.cellStyle === "object" ? next.cellStyle : {}),
            color: "#9e9e9e",
            backgroundColor: "#fafafa",
          };
          next.cellRenderer = (params) => {
            const display =
              params?.value === null ||
              params?.value === undefined ||
              params?.value === ""
                ? "-"
                : params.value;
            return (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  color: "#9e9e9e",
                }}
              >
                {display}
                <LockIcon sx={{ fontSize: 14, opacity: 0.65 }} />
              </span>
            );
          };
        }
        return next;
      });
    return walk(columnsDef);
  };

  const resolveSecondaryHierarchyValue = (rowData, secondaryHierarchy) => {
    if (!secondaryHierarchy || !rowData) return undefined;
    let secondaryValue = rowData[secondaryHierarchy];
    if (secondaryValue === undefined) {
      const possibleFields = Object.keys(rowData).filter(
        (key) =>
          key.toLowerCase().includes("dc") ||
          key.toLowerCase().includes("channel") ||
          key
            .toLowerCase()
            .includes(secondaryHierarchy.toLowerCase().replace("_name", ""))
      );
      if (possibleFields.length > 0) {
        secondaryValue = rowData[possibleFields[0]];
      }
    }
    return secondaryValue;
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
    const { label: hierarchyLabel, value: hierarchyId } =
      selectedViewByOptions || {};
    const isPlacementDate = selectedRoqDateTab === "roq_placement_date";

    // Extract primary and secondary hierarchy values
    const primaryHierarchy = Array.isArray(selectedViewByOptions)
      ? selectedViewByOptions[0]?.value
      : selectedViewByOptions?.value || selectedViewByOptions;

    const secondaryHierarchy =
      Array.isArray(selectedViewByOptions) && selectedViewByOptions[1]
        ? selectedViewByOptions[1].value
        : null;

    // Notify parent component of hierarchy changes
    if (props.handleHierarchyChange) {
      props.handleHierarchyChange(primaryHierarchy, secondaryHierarchy);
    }

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
    isViewSentForApproval,
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
    let totalColumnWeeks;

    if (selectedTabDetails?.week_count) {
      totalColumnWeeks = 8 * selectedTabDetails.week_count;
    } else if (selectedTabDetails?.month_wise_weeks_count) {
      totalColumnWeeks = selectedTabDetails.month_wise_weeks_count;
    } else {
      totalColumnWeeks = null;
    }

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
      if (
        !selectedTabDetails?.week_count &&
        !selectedTabDetails?.month_wise_weeks_count
      ) {
        setSelectionRangeForRoqDate(null);
      } else {
        setSelectionRangeForRoqDate(totalColumnWeeks);
      }
    }
  }, [selectedMonthTab, selectedRoqDateTab]);

  useEffect(() => {
    if (!isEmpty(props.selectedFilters)) setRender(false);
  }, [props.selectedFilters]);

  // Reload table when reloadSummary prop changes
  useEffect(() => {
    if (props.reloadSummary !== undefined && tableInstance.current?.api) {
      tableInstance.current.api.refreshServerSideStore({ purge: true });
    }
  }, [props.reloadSummary]);

  // ============================================================================
  // HELPER FUNCTION: Extract date_range from column group hierarchy
  // ============================================================================
  // onBlur receives AG Grid Column API objects (cellData.column) with getParent().
  // Legacy columns: date group is the immediate parent (e.g. 2026-08-01#2026-08-28).
  // Packs/eaches add a status group in between — walk up until column_name contains "#".
  // ============================================================================
  const getColumnGroupName = (colGroupDef) =>
    colGroupDef?.column_name || colGroupDef?.groupId || colGroupDef?.headerName;

  const extractFiscalWeekFromColumn = (column) => {
    if (!column) return { fiscal_week: null };

    if (typeof column.getParent === "function") {
      let group = column.getParent();
      let fallbackName = null;

      while (group) {
        const groupName = getColumnGroupName(group.getColGroupDef?.());
        if (groupName) {
          if (!fallbackName) fallbackName = groupName;
          if (groupName.includes("#")) {
            return { fiscal_week: groupName };
          }
        }
        group = group.getParent?.();
      }

      let topGroup = column;
      while (topGroup.getParent?.()) {
        topGroup = topGroup.getParent();
      }
      const topName = getColumnGroupName(topGroup.getColGroupDef?.());
      if (topName) {
        return { fiscal_week: topName };
      }

      return { fiscal_week: fallbackName };
    }

    let group = column?.parent?.providedColumnGroup;
    let fallbackName = null;

    while (group) {
      const groupName = getColumnGroupName(group.colGroupDef);
      if (groupName) {
        if (!fallbackName) fallbackName = groupName;
        if (groupName.includes("#")) {
          return { fiscal_week: groupName };
        }
      }

      group = group.parent?.providedColumnGroup;
    }

    return { fiscal_week: fallbackName };
  };

  // ============================================================================
  // HELPER FUNCTION: Build Payload from Edited Cells
  // ============================================================================
  // Converts editedCellsPayload into structured payload for backend API
  // ============================================================================
  const buildPayloadForAPI = () => {
    // Get selected hierarchy values
    const selectedHierarchy = Array.isArray(selectedViewByOptions)
      ? selectedViewByOptions[0]?.value
      : selectedViewByOptions?.value || selectedViewByOptions;

    const secondaryHierarchy =
      Array.isArray(selectedViewByOptions) && selectedViewByOptions[1]
        ? selectedViewByOptions[1].value
        : null;

    return {
      edits: editedCellsPayload,
      selected_hierarchy: selectedHierarchy,
      secondary_hierarchy: secondaryHierarchy,
      //date_filter: selectedMonthTab,
      // metric_type: metricTypeChecked ? RIGHT_LABEL_SWITCH.toLowerCase() : LEFT_LABEL_SWITCH.toLowerCase(),
      roq_date_option: selectedRoqDateTab,
      //edited_at: new Date().toISOString(),
      //total_edits: editedCellsPayload.length
    };
  };

  const handleApplyChanges = async () => {
    try {
      const payload = buildPayloadForAPI();
      console.log("Payload to send to BE:", JSON.stringify(payload, null, 2));

      let response = await props.editOrderRepoSummaryTable(payload);
      if (response?.data?.status) {
        displaySnackMessages(UPDATED_MESSAGE, "success");
        setEditedCellsPayload([]);
        setIsEditMode(false);
        // Refresh the grid data
        setRender(false);
      }
    } catch (err) {
      displaySnackMessages(ERROR_MESSAGE, "error");
      console.log("Error in handleApplyChanges", err);
    }
  };

  const handleCloseEditMode = () => {
    // Clear edited cells payload
    setEditedCellsPayload([]);

    // Exit edit mode
    setIsEditMode(false);

    // Refresh the grid to revert any unsaved changes
    setRender(false);
  };

  // Handler for onBlur — MTP-146390: only packs columns are writable;
  // eaches is always recomputed forward from packs and never reverse-derived.
  const onBlur = (
    _e,
    data,
    column,
    isChanged,
    value,
    initialValue,
    cellData
  ) => {
    const columnName = column?.colId || column?.field;

    const isPacksEdit =
      isPacksColumn(columnName) && isEditablePacksStatus(columnName);
    // Legacy under-review single column (no packs/eaches split)
    const isLegacyUnderReviewEdit =
      columnName &&
      columnName.includes("orders_under_review") &&
      !isPacksColumn(columnName) &&
      !isEachesColumn(columnName);

    if (!isPacksEdit && !isLegacyUnderReviewEdit) {
      return;
    }

    if (!isChanged || value === initialValue) {
      return;
    }

    const editedNode = cellData.node;
    const api = cellData.api;
    const uniqueRowId = getUniqueRowId();
    const eachesColumnName = isPacksEdit
      ? deriveEachesColumnName(columnName)
      : null;

    const selectedHierarchy = Array.isArray(selectedViewByOptions)
      ? selectedViewByOptions[0]?.value
      : selectedViewByOptions?.value || selectedViewByOptions;

    const secondaryHierarchy =
      Array.isArray(selectedViewByOptions) && selectedViewByOptions[1]
        ? selectedViewByOptions[1].value
        : null;

    const syncEachesOnRow = (rowData, packsValue) => {
      if (!eachesColumnName || !rowData) return null;
      const eaches = deriveEachesFromPacks(packsValue, rowData);
      rowData[eachesColumnName] = eaches;
      return eaches;
    };

    const isChildNode =
      editedNode.parent &&
      editedNode.parent.data &&
      editedNode.parent.data[uniqueRowId];

    if (isChildNode) {
      // Leaf packs edit → recompute leaf eaches → roll up parent packs & eaches
      if (isPacksEdit) {
        syncEachesOnRow(data, value);
      }

      const parentNode = editedNode.parent;
      const parentData = parentNode.data;
      const parentId = parentData[uniqueRowId];

      const siblingNodes = [];
      api.forEachNode((rowNode) => {
        if (
          rowNode.data &&
          rowNode.data.status_obj &&
          Array.isArray(rowNode.data.status_obj)
        ) {
          return;
        }
        if (
          rowNode.parent &&
          rowNode.parent.data &&
          rowNode.parent.data[uniqueRowId] === parentId
        ) {
          siblingNodes.push(rowNode);
        }
      });

      const fiscalInfo = extractFiscalWeekFromColumn(cellData?.column || column);

      let newParentPacksTotal = 0;
      let newParentEachesTotal = 0;
      const childValues = [];

      siblingNodes.forEach((siblingNode) => {
        const packsVal = Number(siblingNode.data[columnName]) || 0;
        newParentPacksTotal += packsVal;

        let eachesVal = null;
        if (isPacksEdit && eachesColumnName) {
          eachesVal = syncEachesOnRow(siblingNode.data, packsVal);
          newParentEachesTotal += eachesVal || 0;
        }

        const childValueObj = {
          old_value:
            parseInt(
              siblingNode.data[uniqueRowId] === data[uniqueRowId]
                ? initialValue
                : packsVal
            ) || 0,
          new_value: parseInt(packsVal) || 0,
        };

        if (isPacksEdit && eachesColumnName) {
          childValueObj.old_value_eaches =
            siblingNode.data[uniqueRowId] === data[uniqueRowId]
              ? deriveEachesFromPacks(initialValue, data)
              : eachesVal;
          childValueObj.new_value_eaches = eachesVal;
        }

        const secondaryValue = resolveSecondaryHierarchyValue(
          siblingNode.data,
          secondaryHierarchy
        );
        if (secondaryValue !== undefined) {
          childValueObj[secondaryHierarchy] = secondaryValue;
        }

        childValues.push(childValueObj);
      });

      const parentOldPacks = parentData[columnName];
      parentData[columnName] = newParentPacksTotal;

      const columnsToRefresh = [columnName];
      if (isPacksEdit && eachesColumnName) {
        parentData[eachesColumnName] = newParentEachesTotal;
        columnsToRefresh.push(eachesColumnName);
      }

      api.refreshCells({
        rowNodes: [parentNode, editedNode, ...siblingNodes],
        columns: columnsToRefresh,
        force: true,
      });

      const payloadEntry = {
        [selectedHierarchy]: parentData[selectedHierarchy],
        date_range: fiscalInfo?.fiscal_week || null,
        column_name: columnName,
        parent_old_value: parseInt(parentOldPacks) || 0,
        parent_new_value: parseInt(newParentPacksTotal) || 0,
        child_values: childValues,
      };

      if (isPacksEdit && eachesColumnName) {
        payloadEntry.column_name_eaches = eachesColumnName;
        payloadEntry.parent_old_value_eaches = childValues.reduce(
          (sum, c) => sum + (parseInt(c.old_value_eaches, 10) || 0),
          0
        );
        payloadEntry.parent_new_value_eaches = newParentEachesTotal;
      }

      setEditedCellsPayload((prev) => [...prev, payloadEntry]);
      return;
    }

    // ========================================================================
    // PARENT / AGGREGATE PACKS EDIT → distribute packs → recompute eaches
    // ========================================================================
    const parentData = data;
    const parentId = parentData[uniqueRowId];
    const newPacksTotal = parseInt(value, 10) || 0;
    const oldPacksTotal = parseInt(initialValue, 10) || 0;

    // For packs edits always ratio from the edited packs column itself.
    // Legacy under-review keeps configurable RATIO_CALCULATION_COLUMN.
    let oldRatioValue = oldPacksTotal;
    let newRatioValue = newPacksTotal;

    if (isLegacyUnderReviewEdit) {
      if (columnName.includes(RATIO_CALCULATION_COLUMN)) {
        oldRatioValue = initialValue || 0;
        newRatioValue = value || 0;
      } else {
        const ratioColumnKey = Object.keys(data).find((key) =>
          key.includes(RATIO_CALCULATION_COLUMN)
        );
        oldRatioValue = ratioColumnKey ? data[ratioColumnKey] || 0 : 0;
        newRatioValue = ratioColumnKey ? data[ratioColumnKey] || 0 : 0;
      }
    }

    const childNodes = [];
    api.forEachNode((rowNode) => {
      if (
        rowNode.data &&
        rowNode.data.status_obj &&
        Array.isArray(rowNode.data.status_obj)
      ) {
        return;
      }
      if (
        rowNode.parent &&
        rowNode.parent.data &&
        rowNode.parent.data[uniqueRowId] === parentId
      ) {
        childNodes.push(rowNode);
      }
    });

    const statusObjChildren = parentData.status_obj || [];
    const childrenCount = statusObjChildren.length;

    if (childrenCount > 0) {
      const fiscalInfo = extractFiscalWeekFromColumn(cellData?.column || column);
      const childValues = [];

      let distributedPacks;
      if (isPacksEdit) {
        const currentChildPacks = statusObjChildren.map(
          (child) => Number(child[columnName]) || 0
        );
        distributedPacks = distributePacksWithResidual(
          currentChildPacks,
          newPacksTotal
        );
      }

      let parentEachesTotal = 0;

      statusObjChildren.forEach((childData, index) => {
        const childOldPacks = Number(childData[columnName]) || 0;
        let childNewPacks;

        if (isPacksEdit) {
          childNewPacks = distributedPacks[index];
        } else if (oldRatioValue === 0) {
          const equalValue = Math.floor(newRatioValue / childrenCount);
          childNewPacks =
            index === childrenCount - 1
              ? newRatioValue - equalValue * (childrenCount - 1)
              : equalValue;
        } else {
          childNewPacks = Math.round(
            childOldPacks * (newRatioValue / oldRatioValue)
          );
        }

        childData[columnName] = childNewPacks;

        const childValueObj = {
          old_value: parseInt(childOldPacks) || 0,
          new_value: parseInt(childNewPacks) || 0,
        };

        if (isPacksEdit && eachesColumnName) {
          const oldEaches = deriveEachesFromPacks(childOldPacks, childData);
          const newEaches = syncEachesOnRow(childData, childNewPacks);
          childValueObj.old_value_eaches = oldEaches;
          childValueObj.new_value_eaches = newEaches;
          parentEachesTotal += newEaches || 0;
        }

        const secondaryValue = resolveSecondaryHierarchyValue(
          childData,
          secondaryHierarchy
        );
        if (secondaryValue !== undefined) {
          childValueObj[secondaryHierarchy] = secondaryValue;
        }

        childValues.push(childValueObj);
      });

      // Keep parent packs in sync with reconciled child sum
      if (isPacksEdit) {
        parentData[columnName] = distributedPacks.reduce((a, b) => a + b, 0);
        if (eachesColumnName) {
          parentData[eachesColumnName] = parentEachesTotal;
        }
      }

      const columnsToRefresh = [columnName];
      if (eachesColumnName) columnsToRefresh.push(eachesColumnName);

      if (childNodes.length > 0) {
        childNodes.forEach((childNode, index) => {
          if (index < statusObjChildren.length) {
            const matchingStatusChild = statusObjChildren[index];
            childNode.data[columnName] = matchingStatusChild[columnName];
            if (eachesColumnName) {
              childNode.data[eachesColumnName] =
                matchingStatusChild[eachesColumnName];
            }
            api.refreshCells({
              rowNodes: [childNode],
              columns: columnsToRefresh,
              force: true,
            });
          }
        });
      }

      api.refreshCells({
        rowNodes: [editedNode],
        columns: columnsToRefresh,
        force: true,
      });

      const payloadEntry = {
        [selectedHierarchy]: parentData[selectedHierarchy],
        date_range: fiscalInfo?.fiscal_week || null,
        column_name: columnName,
        parent_old_value: parseInt(initialValue) || 0,
        parent_new_value: parseInt(parentData[columnName]) || 0,
        child_values: childValues,
      };

      if (isPacksEdit && eachesColumnName) {
        payloadEntry.column_name_eaches = eachesColumnName;
        payloadEntry.parent_old_value_eaches = childValues.reduce(
          (sum, c) => sum + (parseInt(c.old_value_eaches) || 0),
          0
        );
        payloadEntry.parent_new_value_eaches = parentEachesTotal;
      }

      setEditedCellsPayload((prev) => [...prev, payloadEntry]);
    }
  };

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

  //Fetch Table Columns based on selected filters
  useEffect(() => {
    const fetchColumnConfig = async () => {
      try {
        setTableLoader(true);
        const dateFilter = selectedMonthTab;
        const metricType = metricTypeChecked
          ? RIGHT_LABEL_SWITCH.toLowerCase()
          : LEFT_LABEL_SWITCH.toLowerCase();

        // Handle selectedViewByOptions as array (grouped) or single value (flat)
        // For grouped structure, use the first selected value (Products) for primary hierarchy
        const selectedHierarchy = Array.isArray(selectedViewByOptions)
          ? selectedViewByOptions[0]?.value
          : selectedViewByOptions?.value || selectedViewByOptions;

        // For grouped structure, also get the second selected value (Store) if exists
        const secondaryHierarchy =
          Array.isArray(selectedViewByOptions) && selectedViewByOptions[1]
            ? selectedViewByOptions[1].value
            : null;

        let queryParams = `date_filter=${dateFilter}&metric_type=${metricType}&selected_hierarchy=${selectedHierarchy}`;
        if (secondaryHierarchy) {
          queryParams += `&secondary_hierarchy=${secondaryHierarchy}`;
        }

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

        if (SHOW_ROQ_DATE_OPTIONS && dateRangeQueryParams === null) {
          const orderTimelineType = selectedRoqDateTab || "roq_placement_date";
          dateRangeQueryParams = `roq_date_option=${orderTimelineType}`;
        }

        const totalQueryParams = dateRangeQueryParams
          ? `${queryParams}&${dateRangeQueryParams}`
          : queryParams;
        let columns = await props.getOrderRepoSummaryTableConfig(
          totalQueryParams
        );

        const viewByColumnNames = FLATTENED_VIEWBY_OPTIONS?.map(
          (option) => option.value
        );

        //Display the columns based on the show_sublevels_hierarchy_columns flag
        let cols = [];
        if (props?.screenConfig?.show_sublevels_hierarchy_columns) {
          const subHeaderNames = [];
          //Show the selectedViewByOptions column and its sublevels in the table

          // Ensure selectedViewByOptions has the correct structure with level property
          // Handle both array (grouped) and single value (flat) formats
          const selectedValues = Array.isArray(selectedViewByOptions)
            ? selectedViewByOptions.map((opt) => opt?.value).filter(Boolean)
            : [selectedViewByOptions?.value || selectedViewByOptions];

          const currentSelectedOptions = selectedValues
            .map((val) =>
              FLATTENED_VIEWBY_OPTIONS.find((opt) => opt.value === val)
            )
            .filter(Boolean);

          const selectedViewByOptionLevels = currentSelectedOptions.map(
            (opt) => opt?.level
          );
          console.log(
            "Selected View By Options:",
            currentSelectedOptions,
            "Levels:",
            selectedViewByOptionLevels
          );
          console.log("Selected Values (column names):", selectedValues);

          const hierarchGroupingColumn = columns?.data?.data.filter((item) => {
            return item.column_name === "hierarchy_info";
          });

          // Check if hierarchGroupingColumn exists before accessing
          if (hierarchGroupingColumn && hierarchGroupingColumn.length > 0) {
            hierarchGroupingColumn[0].sub_headers = [];
            hierarchGroupingColumn[0].is_hidden = true;
          }

          cols = columns?.data?.data.map((item) => {
            if (viewByColumnNames.includes(item.column_name)) {
              const currentColumnLevel = FLATTENED_VIEWBY_OPTIONS.find(
                (option) => option.value === item.column_name
              )?.level;
              console.log(
                currentColumnLevel,
                selectedViewByOptionLevels,
                selectedViewByOptions
              );

              // Check if current column matches any of the EXACT selected column values
              if (selectedValues.includes(item.column_name)) {
                item.is_hidden = false;
              } else if (
                selectedViewByOptionLevels.some(
                  (level) => currentColumnLevel < level
                )
              ) {
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
                  if (subItem?.column_name)
                    subHeaderNames.push(subItem.column_name);
                }
              } else {
                item.is_hidden = true;
              }
            }
            return item;
          });

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
            return true;
          });
        }

        // MTP-146390: Packs editable / Eaches read-only (parent status + label aware)
        cols = applyOrderRepoPacksEachesSubHeaders(cols, {
          isEditMode,
          onOrderColumnClick: wrapOrderRepoColumnClick(props?.onOrderColumnClick),
        });

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

        let updatedColumns = patchOrderRepoEmptyQuantityLinks(
          applyEachesReadOnlyPresentation(checkForEditability(formattedColumns))
        );

        hiddenColsAppliedRef.current = false;
        setTableColumns(updatedColumns);
        setRender(true);
        if (!updatedColumns?.length) {
          setTableLoader(false);
        }
      } catch (error) {
        console.log("Error in Fetching Columns", error);
        displaySnackMessages(ERROR_MESSAGE, "error");
        setTableLoader(false);
      }
    };

    if (
      props?.selectedFilters?.length > 0 &&
      (!render || isEditMode !== undefined)
    ) {
      fetchColumnConfig();
    }
  }, [render, isEditMode]);

  const getAppliedOmsFilters = () => {
    const globalFilters =
      props?.omsFilterConfiguration?.length === 0 ||
      !props?.omsFilterConfiguration
        ? props?.selectedFilters
        : props?.omsFilterConfiguration;
    const appliedOmsFilters = Array.isArray(globalFilters) ? globalFilters : [];

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

      setLoader(true);

      // Handle selectedViewByOptions as array (grouped) or single value (flat)
      const primaryHierarchy = Array.isArray(selectedViewByOptions)
        ? selectedViewByOptions[0]?.value
        : selectedViewByOptions?.value || selectedViewByOptions;

      const secondaryHierarchy =
        Array.isArray(selectedViewByOptions) && selectedViewByOptions[1]
          ? selectedViewByOptions[1].value
          : null;

      let body = {
        filters: [...appliedOmsProductFilters],
        global_date_filter: [...appliedOmsDateFilters],
        meta: { ...manualbody, limit: { limit: 10, page: pageIndex + 1 } },
        selected_hierarchy: primaryHierarchy,
        metric_type: metricTypeChecked
          ? RIGHT_LABEL_SWITCH.toLowerCase()
          : LEFT_LABEL_SWITCH.toLowerCase(),
        date_filter: selectedMonthTab,
      };

      // Add secondary hierarchy if exists (for grouped structure)
      if (secondaryHierarchy) {
        body.secondary_hierarchy = secondaryHierarchy;
      }

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

      const viewByColumnValues = FLATTENED_VIEWBY_OPTIONS?.map(
        (option) => option.value
      );
      body["view_by_allowed_values"] = viewByColumnValues;

      if (SHOW_VIEW_SENT_FOR_APPROVAL_SWITCH) {
        body["data_only"] = isViewSentForApproval;
      }

      props.setOrderRepoSummaryApiPayload(cloneDeep(body));

      let response = await props.getOrderRepoSummaryTableData(body);
      if (response?.data?.status) {
        const responseData = response.data.data?.data || response.data.data;
        let formatedData = agGridRowFormatter(responseData);
        const hiddenCols = response.data.data?.hidden_columns;

        if (
          !hiddenColsAppliedRef.current &&
          Array.isArray(hiddenCols) &&
          hiddenCols.length
        ) {
          setTableColumns((prevColumns) =>
            filterDisplayColumnsByLabel(prevColumns, hiddenCols)
          );
        }
        hiddenColsAppliedRef.current = true;

        setTableLoader(false);
        setLoader(false);
        return { data: formatedData, totalCount: response?.data?.total };
      } else {
        setTableLoader(false);
        setLoader(false);
        return { data: [], totalCount: 0 };
      }
    } catch (error) {
      console.log("Error in fetching Data", error);
      displaySnackMessages(ERROR_MESSAGE, "error");
      setTableLoader(false);
      setLoader(false);
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

  //To Handle Switch Button for viewing "Sent for Approval" orders only
  const handleSentForApprovalViewToggle = (event) => {
    setIsViewSentForApproval(event.target.checked);
  };

  //To Handle Switch Button between Units and Cost
  const onKpiSummarySelectChange = (event) => {
    let userSelection = event.target.checked;
    if (userSelection) setMetricTypeChecked(true);
    else setMetricTypeChecked(false);
  };

  // Helper function to find fiscal week from calendar data based on date
  const findFiscalWeekFromCalendar = (momentDate, calendarData) => {
    if (!momentDate || !calendarData) return null;

    const dateStr = moment(momentDate).format("YYYY-MM-DD");

    if (Array.isArray(calendarData) && calendarData.length > 0) {
      const weekStartDate = moment(momentDate)
        .startOf("week")
        .format("YYYY-MM-DD");
      const match = calendarData.find((fiscalDate) => {
        const calendarWeekStart = moment(
          fiscalDate?.calendar_week_start_date
        ).format("YYYY-MM-DD");
        return (
          calendarWeekStart === dateStr || calendarWeekStart === weekStartDate
        );
      });
      return match?.fiscal_year_week ?? null;
    }

    if (!calendarData?.fiscal_calendar) return null;

    for (const year of calendarData.fiscal_calendar) {
      for (const month of year.months) {
        for (const week of month.weeks) {
          const weekStart = moment(week.week_start_date);
          const weekEnd = moment(week.week_end_date);
          const currentDate = moment(dateStr);

          if (
            currentDate.isSameOrAfter(weekStart) &&
            currentDate.isSameOrBefore(weekEnd)
          ) {
            return week.fiscal_year_week;
          }
        }
      }
    }

    return null;
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
    if (
      currentDates?.fiscalInfoStartDate !== null &&
      currentDates?.fiscalInfoEndDate !== null
    ) {
      let startFw = currentDates?.fiscalInfoStartDate?.fiscal_year_week;
      let endFw = currentDates?.fiscalInfoEndDate?.fiscal_year_week;

      if (!startFw) {
        startFw = findFiscalWeekFromCalendar(
          currentDates.fiscalInfoStartDate,
          props?.fiscalCalendarDetails
        );
      }
      if (!endFw) {
        endFw = findFiscalWeekFromCalendar(
          currentDates.fiscalInfoEndDate,
          props?.fiscalCalendarDetails
        );
      }

      const fiscalDateValue = {
        start_fw: startFw,
        end_fw: endFw,
      };
      setFiscalDates({ ...fiscalDateValue });
    } else {
      setFiscalDates({});
    }
  };

  const onRoqDateRangePickerApply = () => {
    const currentDates = selectedRoqDateRef.current;

    if (
      currentDates?.fiscalInfoStartDate !== null &&
      currentDates?.fiscalInfoEndDate !== null
    ) {
      // For receipt dates, the fiscal_year_week might not be attached to the Moment object
      // So we need to look it up from the receipt calendar data
      let startFw = currentDates?.fiscalInfoStartDate?.fiscal_year_week;
      let endFw = currentDates?.fiscalInfoEndDate?.fiscal_year_week;

      // If fiscal_year_week is not present, look it up from calendar data
      if (!startFw) {
        startFw = findFiscalWeekFromCalendar(
          currentDates.fiscalInfoStartDate,
          props?.receiptCalendarDetails
        );
      }
      if (!endFw) {
        endFw = findFiscalWeekFromCalendar(
          currentDates.fiscalInfoEndDate,
          props?.receiptCalendarDetails
        );
      }

      const fiscalRoqDateValue = {
        start_fw: startFw,
        end_fw: endFw,
      };
      setRoqFiscalDates({ ...fiscalRoqDateValue });
    } else {
      setRoqFiscalDates({});
    }
  };

  const handleRoqDateTabChange = (event, newValue) => {
    setSelectedRoqDateTab(newValue);
    // Call parent's handler if provided
    if (props.handleRoqDateTabChange) {
      props.handleRoqDateTabChange(event, newValue);
    }
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

    // Edit Mode Buttons
    if (isEditMode) {
      options.push(
        <>
          <Button
            variant="tertiary"
            color="primary"
            className={classes.button}
            onClick={handleCloseEditMode}
          >
            Close
          </Button>
          <Button
            variant="contained"
            color="primary"
            className={classes.button}
            onClick={handleApplyChanges}
            disabled={editedCellsPayload.length === 0}
          >
            Apply
          </Button>
        </>
      );
    } else {
      if (SHOW_VIEW_SENT_FOR_APPROVAL_SWITCH) {
        options.push(
          <Switch
            checked={isViewSentForApproval}
            onChange={(e) => handleSentForApprovalViewToggle(e)}
            color="primary"
            leftLabel={VIEW_SENT_FOR_APPROVAL_SWITCH_LEFT_LABEL}
            right={VIEW_SENT_FOR_APPROVAL_SWITCH_RIGHT_LABEL}
            id="viewSentForApprovalSwitch"
          />
        );

        options.push(
          <Divider
            orientation="vertical"
            flexItem
            sx={{ height: 16, alignSelf: "center" }}
          />
        );
      }

      if (VIEWBY_DROPDOWN_OPTIONS?.length > 0) {
        // Check if options are grouped
        const isGrouped = VIEWBY_DROPDOWN_OPTIONS.some(
          (opt) => opt.options && Array.isArray(opt.options)
        );

        options.push(
          <FormControl
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
              handleChange={handleViewByChange}
              isGrouped={isGrouped}
              isMulti={isGrouped}
              isSelectAll={isSelectAllViewBy}
              setIsSelectAll={setIsSelectAllViewBy}
              isOpen={isOpenViewBy}
              setIsOpen={setIsOpenViewBy}
            />
          </FormControl>
        );
      }

      // Edit Values button
      options.push(
        <Button
          variant="secondary"
          color="primary"
          className={classes.button}
          onClick={() => {
            setRender(false);
            setIsEditMode(true);
          }}
        >
          Edit Values
        </Button>
      );
    }

    // //Units and Cost Switch
    // if (SHOW_UNITS_COST_SWITCH) {
    //   options.push(
    //     <FormControl style={{ margin: "0 0.5rem" }}>
    //       <Switch
    //         checked={metricTypeChecked}
    //         onChange={(e) => onKpiSummarySelectChange(e)}
    //         color="primary"
    //         rightLabel={RIGHT_LABEL_SWITCH}
    //         leftLabel={LEFT_LABEL_SWITCH}
    //         id="costUnitsSwitch"
    //       />
    //     </FormControl>
    //   );
    // }

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

    if (SHOW_ROQ_DATE_OPTIONS) {
      options.push(
        <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem" }}>
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
        padding: "0 1rem 1rem 1rem",
      };
    }
    return {};
  };

  const getUniqueRowId = () => {
    if (props?.screenConfig?.show_sublevels_hierarchy_columns) {
      return "unique_row_id";
    }
    // Handle selectedViewByOptions as array (grouped) or single value (flat)
    return Array.isArray(selectedViewByOptions)
      ? selectedViewByOptions[0]?.value
      : selectedViewByOptions?.value || selectedViewByOptions;
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
          <Loader loader={tableLoader} minHeight={"260px"}>
            {render && (
              <>
                {tableColumns?.length ? (
                  <AgGridComponent
                    columns={tableColumns}
                    manualCallBack={(body, pageIndex, params) =>
                      manualCallBack(body, pageIndex, params)
                    }
                    onBlur={onBlur}
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
    orderRepoConfig:
      store.omsReducer.orderingCommonService?.orderRepositoryScreenConfig,
    selectedFilters: store.omsReducer?.orderRepositoryService.selectedFilters,
    screenConfig:
      store.omsReducer.orderingCommonService.orderingScreensConfig
        ?.order_repository,
    omsFilterConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "orderManagementFilterConfiguration"
      ]?.appliedFilterData?.dependencyData,
    highLevelSummaryState:
      store.omsReducer.orderManagementService.highLevelSummaryState,
    redirectionDetails: store.omsReducer.orderManagementService.redirectDetails,
    maxEditableReceiptDate:
      store.omsReducer.orderRepositoryService.maxEditableReceiptDate,
    maxEditableReceiptDateLoader:
      store.omsReducer.orderRepositoryService.maxEditableReceiptDateLoader,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getOrderRepoSummaryTableConfig: (payload) =>
    dispatch(getOrderRepoSummaryTableConfig(payload)),
  getOrderRepoSummaryTableData: (payload) =>
    dispatch(getOrderRepoSummaryTableData(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  getMaxEditableReceiptDate: () => dispatch(getMaxEditableReceiptDate()),
  setMaxEditableReceiptDate: (payload) =>
    dispatch(setMaxEditableReceiptDate(payload)),
  setMaxEditableReceiptDateLoader: (payload) =>
    dispatch(setMaxEditableReceiptDateLoader(payload)),
  editOrderRepoSummaryTable: (payload) =>
    dispatch(editOrderRepoSummaryTable(payload)),
  setOrderRepoSummaryApiPayload: (payload) =>
    dispatch(setOrderRepoSummaryApiPayload(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(OrderRepositorySummaryTable);
