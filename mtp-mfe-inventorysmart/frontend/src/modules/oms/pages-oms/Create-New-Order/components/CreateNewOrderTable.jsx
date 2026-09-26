import React, { useEffect, useRef, useState, useCallback } from "react";
import { connect } from "react-redux";
import { useNavigate } from "react-router-dom-v5-compat";
import moment from "moment";
import QueryStatsIcon from "@mui/icons-material/QueryStats";
import globalStyles from "core/Styles/globalStyles";
import Loader from "core/Utils/Loader/loader";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import { addSnack, closeSnack } from "core/actions/snackbarActions";
import { cloneDeep, isEmpty, isNil, uniqBy } from "lodash";
import { nonEditableCell } from "core/Utils/agGrid/table-functions";
import { Button } from "impact-ui-v3";
import { getTenantTimeZoneDetails } from "core/commonComponents/coreComponentScreen/utils";
import PackConfigBottomSheet from "../../common/PackConfigBottomSheet";
import CreateNewOrderSetAllPopUp from "./CreateNewOrderSetAllPopUp";
import SendApprovalButton from "./SendApprovalButton";
import SafetyStockGraphView from "../../common/SafetyStockGraphView";
import {
  ADA_VISUAL,
  ORDER_MANAGEMENT_CREATE_SCENARIO,
  ORDER_MANAGEMENT_DEEP_DIVE,
} from "modules/oms/constants-oms/routeConstants";
import {
  EMPTY_ORDER_QTY,
  ERROR_MESSAGE,
  EXPECTED_RECEIPT_DATE_COLUMN,
  ORDER_REASON_COLUMN,
  SHIP_MODE_COLUMN,
  SIZE_COLUMN,
  TRANSPORTATION_MODE_COLUMN,
  TRANSPORTATION_AVAILABLE_MODES_KEY,
  INVALID_DATE,
  INVALID_ORDER_QTY,
  INVALID_ORDER_QTY_PACKSIZE,
  INVALID_RECEIPT_DATE,
  OMS_RECEIPT_DATE_MULTI_WEEK,
  NOT_BEFORE_AFTER_DATE_COLUMN,
  NOT_BEFORE_AFTER_DATE_ERROR_MESSAGE,
  ORDER_COST_COLUMN,
  ORDER_PLACEMENT_DATE_COLUMN,
  ORDER_QUANTITY_COLUMN,
  ORDER_QUANTITY_EACHES_COLUMN,
  ORDER_RETAIL_COLUMN,
  TENANT_DATE_FORMAT,
  defaultTableData,
  tableArticleFilter,
  tableConfigurationMetaData,
  OMS_CREATE_NEW_ORDER_SCREENNAME_KEY,
} from "modules/oms/constants-oms/stringConstants";
import {
  editOmsCreateNewOrderTableData,
  getOmsCreateNewOrderTableConfiguration,
  getOmsCreateNewOrderTableData,
  setCreateNewOrderTableConfigLoader,
  setCreateNewOrderTableData,
  setCreateNewOrderTableDataEditFailed,
  setCreateNewOrderTableDataEditSuccess,
  setCreateNewOrderTableDataLoader,
} from "modules/oms/services-oms/Create-New-Order/create-new-order-service";
import { setSelectedOrdersFromCNO } from "modules/oms/services-oms/Create-New-Order/off-cycle-order-service";
import { getFinalCheckedRecords } from "../utils";
import {
  mergeOmsDcIntoFilters,
  readOmsCnoRedirectDashboardDcsFromStorage,
} from "modules/oms/utils-oms/oms-utility";

function getTransportationModeOptionsForChildRow(columnItem, rowData) {
  const fullOptions = columnItem?.options ?? columnItem?.extra?.options ?? [];
  const availableModes = rowData?.[TRANSPORTATION_AVAILABLE_MODES_KEY];
  if (
    !availableModes ||
    typeof availableModes !== "object" ||
    isEmpty(availableModes)
  ) {
    return fullOptions;
  }
  const keys = Object.keys(availableModes);
  const result = keys.map((key) => {
    const fromConfig = fullOptions.find(
      (opt) =>
        String(opt?.value) === String(key) || String(opt?.label) === String(key)
    );
    return fromConfig ?? { label: key, value: key };
  });
  const currentVal = rowData?.[TRANSPORTATION_MODE_COLUMN];
  if (
    currentVal != null &&
    currentVal !== "" &&
    !result.some((o) => String(o?.value) === String(currentVal))
  ) {
    const fromConfig = fullOptions.find(
      (opt) => String(opt?.value) === String(currentVal)
    );
    return [
      fromConfig ?? { label: String(currentVal), value: currentVal },
      ...result,
    ];
  }
  return result;
}

/** When transportation_mode changes, set lead_time from the matching entry in available_modes */
function applyLeadTimeFromTransportationMode(rowData, modeOverride) {
  const mode =
    modeOverride !== undefined && modeOverride !== null && modeOverride !== ""
      ? modeOverride
      : rowData?.[TRANSPORTATION_MODE_COLUMN];
  const modes = rowData?.[TRANSPORTATION_AVAILABLE_MODES_KEY];
  if (
    !modes ||
    typeof modes !== "object" ||
    mode === null ||
    mode === undefined ||
    mode === ""
  ) {
    return;
  }
  let raw = modes[mode];
  if (raw === undefined) {
    const entry = Object.entries(modes).find(
      ([k]) => String(k) === String(mode)
    );
    raw = entry ? entry[1] : undefined;
  }
  if (raw === undefined || raw === null) return;
  const n = Number(raw);
  rowData.lead_time = Number.isNaN(n) ? raw : n;
}

const CreateNewOrderTable = function (props) {
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [renderAgGrid, setRenderAgGrid] = useState(false);
  const [showButtons, setShowButtons] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [uncheckedRowIds, setUncheckedRowIds] = useState(() => new Set());
  const [createNewTableColumns, setCreateNewTableColumns] = useState([]);
  const [selectedSku, setSelectedSku] = useState([]);
  const [openPopUp, setOpenPopUp] = useState(false);
  const [showSafetyStockGraph, setShowSafetyStockGraph] = useState(false);
  const [safetyStockGraphPayload, setsafetyStockGraphPayload] = useState();
  const [packConfigState, setPackConfigState] = useState({
    isOpen: false,
    selectedArticle: "",
  });
  const createNewOrderTableGridInstance = useRef(null);
  const focusedTableCellValue = useRef(null);
  const createNewOrderTableCount = useRef(null);
  const currentManualBody = useRef(null); // Store current manualbody for use in onSelectionChanged
  const [isUserHasViewOnlyAccess, setIsUserHasViewOnlyAccess] = useState(null);
  const [isUserHasSetAllAccess, setIsUserHasSetAllAccess] = useState(true);
  const [isInlineEdit, setIsInlineEdit] = useState(true);

  // user access for create new order
  const createNewOrderAccess = props.userAccess?.find(
    (item) => item.screen === OMS_CREATE_NEW_ORDER_SCREENNAME_KEY
  );
  const canSetAll = createNewOrderAccess?.isSetAllButton || false;
  const canInlineEdit = createNewOrderAccess?.isInlineEdit || false;
  const globalClasses = globalStyles();
  const classes = useStyles();
  const navigate = useNavigate();

  const uniqueRowId = props?.screenConfig?.uniqueRowId;
  const isCreateNewOrderTableGrouping =
    props?.screenConfig?.isCreateNewOrderTableGrouping;
  const l1DisplayName = props?.screenConfig?.l1DisplayName || "Master SKU ID";

  const IS_MIN_QTY_VALIDATION_ENABLED =
    props?.screenConfig?.is_min_qty_validation_enabled ?? true;
  const IS_MAX_QTY_VALIDATION_ENABLED =
    props?.screenConfig?.is_max_qty_validation_enabled ?? true;
  const IS_MULTIPLE_VALIDATION_ENABLED =
    props?.screenConfig?.is_multiple_validation_enabled ?? true;

  const IS_OFF_CYCLE_ORDER_ENABLED =
    props?.OffCycleOrderScreenConfig?.is_enabled;

  const { tenantDateFormat } = getTenantTimeZoneDetails();
  const DATE_FORMAT = tenantDateFormat || TENANT_DATE_FORMAT;

  const formatReceiptDate = useCallback(
    (rawValue) => {
      if (isNil(rawValue) || rawValue === "") return "";

      const parsed = moment(
        rawValue,
        [DATE_FORMAT, TENANT_DATE_FORMAT, moment.ISO_8601],
        true
      );

      if (!parsed.isValid()) return "";
      return parsed.format(DATE_FORMAT);
    },
    [DATE_FORMAT]
  );

  const sizeColumnClickHandler = useCallback((params) => {
    const article = params?.data?.article;
    if (article) {
      setPackConfigState({
        isOpen: true,
        selectedArticle: article,
      });
    }
  }, []);

  const handlePackConfigClose = useCallback(() => {
    setPackConfigState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  useEffect(() => {
    if (!isEmpty(props?.userAccess)) {
      // Use new userAccess flags
      setIsUserHasSetAllAccess(canSetAll);
      setIsInlineEdit(canInlineEdit);
      setIsUserHasViewOnlyAccess(false);
    } else if (props?.orderingAccessControl) {
      // Fall back to old access control
      let canUserEdit = props?.orderingAccessControl?.isEditButton?.isVisible;
      setIsUserHasViewOnlyAccess(!canUserEdit);
      setIsUserHasSetAllAccess(true);
      setIsInlineEdit(true);
    }
  }, [
    props?.userAccess,
    props?.orderingAccessControl,
    canSetAll,
    canInlineEdit,
  ]);

  const checkForEditability = (columnsDef) => {
    try {
      let updatedColumnsDef = cloneDeep(columnsDef);

      // adding custom renderer on parent group row to aggregate status and type
      // enabling in table edit for status and date columns
      updatedColumnsDef = updatedColumnsDef.map((item) => {
        if (isCreateNewOrderTableGrouping) {
          if (item.extra?.is_grouping_key) {
            item.cellRenderer = "agGroupCellRenderer";
          }
          if (item.column_name === ORDER_QUANTITY_COLUMN) {
            item.cellStyle = (params) => {
              return params.node.data.isEdited
                ? { backgroundColor: "#0055af36", textAlign: "right" }
                : { backgroundColor: "inherit", textAlign: "right" };
            };
            item.cellRenderer = (params, extraProps) => {
              // Parent row
              if (params.node.level === 0) {
                if (params.data.status_obj && params.data.status_obj.length) {
                  const value = params.data.status_obj.reduce(
                    (acc, val) => (acc += Number(val[item.column_name] || 0)),
                    0
                  );
                  // Set summed value in parent
                  params.data[item.column_name] = value;
                } else {
                  params.data[item.column_name] = "-";
                }
              }            
              // Editable logic for ALL rows
              const disabled = !isEmpty(props?.userAccess)
                ? !isInlineEdit
                : isUserHasViewOnlyAccess;         
              return (
                <CellRenderers
                  cellData={params}
                  column={{
                    ...item,
                    disabled,
                  }}
                  extraProps={extraProps}
                  actions={null}
                />
              );
            };
          } else if (item.column_name === ORDER_COST_COLUMN) {
            item.cellRenderer = (params, _extraProps) => {
              let noEditableCustomCellRender = params?.api?.gridOptionsWrapper
                ?.gridOptions?.noEditableCustomCellRender
                ? params?.api?.gridOptionsWrapper?.gridOptions?.noEditableCustomCellRender(
                    params
                  )
                : false;
              if (noEditableCustomCellRender) {
                return noEditableCustomCellRender;
              }
              return nonEditableCell(item, null, true)(params);
            };
          } else if (item.column_name === NOT_BEFORE_AFTER_DATE_COLUMN) {
            item.cellStyle = (params) => {
              return params.node.data.isDateEdited
                ? { backgroundColor: "#0055af36" }
                : { backgroundColor: "inherit" };
            };
            item.cellRenderer = (params, extraProps) => {
              if (params.node.level === 0) {
                if (
                  !isEmpty(props?.userAccess)
                    ? !isInlineEdit
                    : isUserHasViewOnlyAccess
                )
                  item.disabled = true;
                return (
                  <CellRenderers
                    cellData={params}
                    column={item}
                    extraProps={extraProps}
                    actions={null}
                  ></CellRenderers>
                );
              } else {
                return "";
              }
            };
          } else if (item.column_name === EXPECTED_RECEIPT_DATE_COLUMN) {
            item.cellStyle = (params) => {
              return params.node.level === 0 && params.node.data.isNotValid
                ? { backgroundColor: "#F6CCCC", color: "#F6CCCC" }
                : params.node.data.isDateEdited
                ? { backgroundColor: "#0055af36" }
                : { backgroundColor: "inherit" };
            };
            item.cellRenderer = (params, extraProps) => {
              if (params.node.level === 0) {
                if (
                  !isEmpty(props?.userAccess)
                    ? !isInlineEdit
                    : isUserHasViewOnlyAccess
                )
                  item.disabled = true;
                return (
                  <CellRenderers
                    cellData={params}
                    column={item}
                    extraProps={extraProps}
                    actions={null}
                  ></CellRenderers>
                );
              } else {
                return formatReceiptDate(
                  params.node.data?.[EXPECTED_RECEIPT_DATE_COLUMN]
                );
              }
            };
          } else if (item.column_name === ORDER_REASON_COLUMN) {
            item.cellStyle = (params) => {
              return params.node.data.isOrderReasonEdited
                ? { backgroundColor: "#0055af36" }
                : { backgroundColor: "inherit" };
            };
            item.cellRenderer = (params, extraProps) => {
              if (params.node.level === 0) {
                if (
                  !isEmpty(props?.userAccess)
                    ? !isInlineEdit
                    : isUserHasViewOnlyAccess
                )
                  item.disabled = true;
                return (
                  <CellRenderers
                    cellData={params}
                    column={item}
                    extraProps={extraProps}
                    actions={null}
                  ></CellRenderers>
                );
              } else {
                return params.node.data.order_reason || "";
              }
            };
          } else if (item.column_name === SHIP_MODE_COLUMN) {
            item.cellStyle = (params) => {
              return params.node.data.isShipModeEdited
                ? { backgroundColor: "#0055af36" }
                : { backgroundColor: "inherit" };
            };
            item.cellRenderer = (params, extraProps) => {
              if (params.node.level === 0) {
                if (
                  !isEmpty(props?.userAccess)
                    ? !isInlineEdit
                    : isUserHasViewOnlyAccess
                )
                  item.disabled = true;
                return (
                  <CellRenderers
                    cellData={params}
                    column={item}
                    extraProps={extraProps}
                    actions={null}
                  ></CellRenderers>
                );
              } else {
                return params.node.data.ship_mode || "";
              }
            };
          } else if (item.column_name === TRANSPORTATION_MODE_COLUMN) {
            const prevEditable = item.editable;
            item.editable = (params) => {
              if (params?.node?.level === 0) return false;
              if (typeof prevEditable === "function")
                return prevEditable(params);
              return !!prevEditable;
            };
            item.cellRenderer = (params, extraProps) => {
              if (params.node.level === 0) {
                return nonEditableCell(item, null, true)(params);
              }
              if (
                !isEmpty(props?.userAccess)
                  ? !isInlineEdit
                  : isUserHasViewOnlyAccess
              )
                item.disabled = true;
              return (
                <CellRenderers
                  cellData={params}
                  column={{
                    ...item,
                    options: getTransportationModeOptionsForChildRow(
                      item,
                      params.data
                    ),
                  }}
                  extraProps={extraProps}
                  actions={null}
                ></CellRenderers>
              );
            };
          } else if (item.column_name === SIZE_COLUMN) {
            item.cellRenderer = (params, extraProps) => {
              const cellValue = params?.value || params?.data?.size_column;
              const isPackEnabled = params?.data?.is_pack_enabled;

              if (isPackEnabled && cellValue == "View Pack Details") {
                return (
                  <Button
                    variant="url"
                    onClick={() => sizeColumnClickHandler(params)}
                  >
                    {cellValue}
                  </Button>
                );
              }

              return cellValue || "";
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

  useEffect(() => {
    const fetchColumnData = async () => {
      props.setCreateNewOrderTableConfigLoader(true);
      let columns = await props.getOmsCreateNewOrderTableConfiguration();

      let columnsData = columns?.data?.data;
      let updatedColumns = columnsData.map((col) => {
        if (col.type === "DateTimeField")
          col.formatter = props.tenantDateFormat;
        return col;
      });
      let formattedColumns = agGridColumnFormatter(
        updatedColumns,
        null,
        null,
        null,
        null,
        null,
        null,
        true
      );
      let cols = formattedColumns.map((col) => {
        switch (col.accessor) {
          case NOT_BEFORE_AFTER_DATE_COLUMN:
            col.withPortal = true;
            col.showClearDates = false;
            col.anyDayOfWeekAllowed = true;
            col.maxOneWeekSelection = false;
            col.keepOpenOnDateSelect = false;
            col.removeWeekNumber = true;
            const ropCalendarConfig = JSON.parse(
              JSON.stringify(OMS_RECEIPT_DATE_MULTI_WEEK)
            );
            col.options = ropCalendarConfig;
            col.fiscalCalendarData = props.fiscalCalendarData;
          default:
            return col;
        }
      });
      setSelectedOrders([]);
      let updatedCols = checkForEditability(cols);
      setCreateNewTableColumns(updatedCols);
      props.setCreateNewOrderTableConfigLoader(false);
      setSelectedSku(props.selectedCreateNewOrderSku);
      setRenderAgGrid(true);
    };
    if (
      props?.fiscalCalendarData?.length > 0 &&
      isUserHasViewOnlyAccess !== null
    ) {
      fetchColumnData();
    } else {
      props.setCreateNewOrderTableConfigLoader(true);
    }
  }, [
    props.selectedFilters,
    props.fiscalCalendarData,
    isUserHasViewOnlyAccess,
  ]);

  useEffect(() => {
    !isEmpty(props.selectedFilters) && setRenderAgGrid(false);
  }, [props.selectedFilters]);

  const onSelectionChanged = async (event) => {
    try {
      const gridApi = createNewOrderTableGridInstance.current.api;
      const selectAllSelected = event.api.isSelectAllRecords;

      const checkedRowsInSelectAll = getFinalCheckedRecords(
        gridApi?.allRecordsData,
        gridApi?.checkConfiguration
      );

      if (gridApi?.allRecordsData?.length) {
        const checkedSet = new Set(checkedRowsInSelectAll);
        const unCheckedRowList = gridApi?.allRecordsData
          .map((row) => row?.[uniqueRowId])
          .filter((id) => id != null && !checkedSet.has(id));
        setUncheckedRowIds(new Set(unCheckedRowList));
      }

      // Set the isSelectAllRecords flag on the gridApi early to ensure consistent state
      gridApi.isSelectAllRecords = selectAllSelected;

      // Handle case when "Select All" is first selected
      if (selectAllSelected && !gridApi.allRecordsLoaded) {
        // Show loading indicator
        props.setCreateNewOrderTableDataLoader(true);

        // Prepare filters for the API call
        let createNewOrderFilterArray = [];
        props.selectedFilters.forEach((filter) => {
          if (filter?.values?.length > 0) {
            createNewOrderFilterArray.push(filter);
          }
        });

        let filtersForBody = props.isRedirectedFromDifferentPage
          ? uniqBy(
              [
                ...createNewOrderFilterArray,
                ...(props.createNewOrderFilterDependency || []),
              ],
              (f) =>
                `${f?.attribute_name ?? ""}::${f?.dimension ?? ""}::${
                  f?.filter_id ?? ""
                }`
            )
          : [...createNewOrderFilterArray];

        const selectedDcsForApi =
          props.createNewOrderSelectedDcs?.length > 0
            ? props.createNewOrderSelectedDcs
            : props.isRedirectedFromDifferentPage
            ? readOmsCnoRedirectDashboardDcsFromStorage()
            : [];

        filtersForBody = mergeOmsDcIntoFilters(
          filtersForBody,
          selectedDcsForApi
        );

        // Create the request body using existing manualbody if available
        let body = {
          filters: filtersForBody,
          ...props.startEndDate,
          meta: currentManualBody.current
            ? {
                ...currentManualBody.current,
                limit: {
                  limit: createNewOrderTableCount.current,
                  page: 1,
                },
              }
            : {
                limit: {
                  limit: createNewOrderTableCount.current,
                  page: 1,
                },
              },
        };

        // Fetch all records
        const response = await props.getOmsCreateNewOrderTableData(body);

        if (response?.data?.status) {
          // Mark that we've loaded all records to prevent unnecessary refetching
          gridApi.allRecordsLoaded = true;

          // Format the data the same way manualCallBack does
          let formatedData = agGridRowFormatter(
            response.data.data,
            gridApi.checkConfiguration,
            uniqueRowId
          );

          formatedData.forEach((val) => {
            let quantity = 0;
            let cost = 0;
            val.status_obj.forEach((obj) => {
              if (isNil(obj[ORDER_QUANTITY_COLUMN])) {
                obj[ORDER_QUANTITY_COLUMN] = 0;
              }
              if (isNil(obj[ORDER_COST_COLUMN])) {
                obj[ORDER_COST_COLUMN] = 0;
              }
              quantity += isNaN(obj[ORDER_QUANTITY_COLUMN])
                ? 0
                : obj[ORDER_QUANTITY_COLUMN];
              cost += isNaN(obj[ORDER_COST_COLUMN])
                ? 0
                : obj[ORDER_COST_COLUMN];
            });
            val[ORDER_QUANTITY_COLUMN] = Number(quantity) || 0;
            val[ORDER_COST_COLUMN] = Number(cost) || 0;
            if (val.hasOwnProperty(NOT_BEFORE_AFTER_DATE_COLUMN)) {
              val[NOT_BEFORE_AFTER_DATE_COLUMN] = {
                fiscalInfoStartDate: val.editable_not_before_date,
                fiscalInfoEndDate: val.editable_not_after_date,
              };
            }
            if (val.hasOwnProperty(EXPECTED_RECEIPT_DATE_COLUMN)) {
              const hasLeadTime =
                val.lead_time || val.lead_time === 0 || val.lead_time === "0";

              val[EXPECTED_RECEIPT_DATE_COLUMN] = hasLeadTime
                ? moment().add(val.lead_time, "days").format(DATE_FORMAT)
                : val[EXPECTED_RECEIPT_DATE_COLUMN]
                ? formatReceiptDate(val[EXPECTED_RECEIPT_DATE_COLUMN])
                : "";
              if (isCreateNewOrderTableGrouping) {
                val.status_obj.forEach((item) => {
                  item.expected_receipt_date =
                    val[EXPECTED_RECEIPT_DATE_COLUMN];
                  item[ORDER_REASON_COLUMN] = val[ORDER_REASON_COLUMN];
                  item[SHIP_MODE_COLUMN] = val[SHIP_MODE_COLUMN];
                });
              }
            }
          });

          // Store the full dataset for reference
          gridApi.allRecordsData = formatedData;
          gridApi.allRecordsTotal = response.data.total;

          // Add helper method for getting page data without API call
          gridApi.getPageDataFromCache = function (
            startRow,
            endRow,
            sortModel
          ) {
            if (this.isSelectAllRecords && this.allRecordsData) {
              let data = [...this.allRecordsData];

              // Apply sorting if needed
              if (sortModel && sortModel.length > 0) {
                const sort = sortModel[0];
                data.sort((a, b) => {
                  let valueA = a[sort.colId];
                  let valueB = b[sort.colId];

                  // Handle nulls/undefined
                  if (valueA == null && valueB == null) return 0;
                  if (valueA == null) return -1;
                  if (valueB == null) return 1;

                  // Handle numbers
                  if (
                    typeof valueA === "number" &&
                    typeof valueB === "number"
                  ) {
                    return sort.sort === "asc"
                      ? valueA - valueB
                      : valueB - valueA;
                  }

                  // Handle strings
                  return sort.sort === "asc"
                    ? String(valueA).localeCompare(String(valueB))
                    : String(valueB).localeCompare(String(valueA));
                });
              }

              // Return requested page
              return data.slice(startRow, endRow);
            }
            return null; // Indicate we can't fulfill from cache
          };

          // Important: Override getSelectedNodes to support SetAllPopUp component
          // Always save a reference to the original method
          if (!gridApi._originalGetSelectedNodes) {
            gridApi._originalGetSelectedNodes = gridApi.getSelectedNodes;
          }

          // Create a more robust implementation
          gridApi.getSelectedNodes = function () {
            // Using function() to ensure 'this' refers to the gridApi
            // If "Select All" is active and we have all data loaded
            if (
              this.isSelectAllRecords === true &&
              this.allRecordsData &&
              this.allRecordsData.length > 0
            ) {
              // Create fully compatible fake nodes that the popup can safely use
              // Based on examining CreateNewOrderSetAllPopUp.jsx
              return this.allRecordsData.map((rowData) => {
                // Create a comprehensive node object
                return {
                  // Core data
                  data: rowData,
                  displayed: true,
                  selected: true,
                  childIndex: -1,
                  rowIndex: -1,
                  id: rowData[uniqueRowId] || rowData.id,
                  rowHeight: 48,

                  // Required node methods
                  setDataValue: function (field, value) {
                    this.data[field] = value;
                    return true;
                  },
                  setData: function (data) {
                    this.data = { ...this.data, ...data };
                    return true;
                  },
                  selectThisNode: function (select) {
                    this.selected = select;
                    return true;
                  },
                  isSelected: function () {
                    return true;
                  },

                  // Group-related properties that SetAllPopUp might need
                  group: rowData.status_obj,

                  // Additional safety methods
                  addEventListener: function () {
                    return null;
                  },
                  removeEventListener: function () {
                    return null;
                  },

                  __isVirtualNode: true,
                  __fromSelectAll: true,
                };
              });
            }
            // Otherwise use original implementation
            return this._originalGetSelectedNodes.apply(this, arguments);
          };

          // Update UI state to reflect selection
          const selectedRows = [...formatedData]; // All rows are selected
          const selectedSkuIds = formatedData.map((row) => row[uniqueRowId]);

          setSelectedOrders(selectedRows);
          setSelectedOrderIds(selectedSkuIds);

          // Hide loading indicator
          props.setCreateNewOrderTableDataLoader(false);

          // Select visible rows for UI feedback
          // Using forEachNode instead of selectAllFiltered because that's not available with serverSide row model
          setTimeout(() => {
            gridApi.forEachNode((node) => {
              if (node.displayed) {
                if (uncheckedRowIds.has(node.data?.[uniqueRowId])) {
                  node.setSelected(false);
                } else {
                  node.setSelected(true);
                }
              }
            });
          }, 200);
        }
      }

      // Handle selection state update differently based on whether "Select All" is active
      if (
        selectAllSelected &&
        checkedRowsInSelectAll?.length === gridApi.allRecordsTotal
      ) {
        // For any subsequent "Select All" selections after the data is already loaded
        if (gridApi.allRecordsLoaded && gridApi.isSelectAllRecords) {
          // Ensure we have the original getSelectedNodes preserved
          if (!gridApi._originalGetSelectedNodes) {
            gridApi._originalGetSelectedNodes = gridApi.getSelectedNodes;

            // Reapply our custom getSelectedNodes implementation
            gridApi.getSelectedNodes = function () {
              // Using function() to ensure 'this' refers to the gridApi
              if (
                this.isSelectAllRecords === true &&
                this.allRecordsData &&
                this.allRecordsData.length > 0
              ) {
                return this.allRecordsData.map((rowData) => {
                  return {
                    data: rowData,
                    displayed: true,
                    selected: true,
                    childIndex: -1,
                    rowIndex: -1,
                    id: rowData[uniqueRowId] || rowData.id,
                    rowHeight: 48,
                    setDataValue: function (field, value) {
                      this.data[field] = value;
                      return true;
                    },
                    setData: function (data) {
                      this.data = { ...this.data, ...data };
                      return true;
                    },
                    selectThisNode: function (select) {
                      this.selected = select;
                      return true;
                    },
                    isSelected: function () {
                      return true;
                    },
                    group: rowData.status_obj,
                    addEventListener: function () {
                      return null;
                    },
                    removeEventListener: function () {
                      return null;
                    },
                    __isVirtualNode: true,
                    __fromSelectAll: true,
                  };
                });
              }
              return this._originalGetSelectedNodes.apply(this, arguments);
            };
          }

          let allRecordsData = [...gridApi.allRecordsData];

          const uncheckedRows = [];
          event.api.forEachNode((node) => {
            if (node.data && !node.isSelected()) {
              uncheckedRows.push(node.data);
            }
          });

          const uncheckedIds = new Set(
            uncheckedRows.map((r) => r?.[uniqueRowId])
          );
          // Remove rows that are present in uncheckedRows
          const filteredAllRecordsData = allRecordsData.filter(
            (row) => !uncheckedIds.has(row?.[uniqueRowId])
          );

          allRecordsData = [...filteredAllRecordsData];

          // Update UI state to reflect selection
          const selectedRows = [...allRecordsData];
          const selectedSkuIds = selectedRows.map((row) => row[uniqueRowId]);
          setSelectedOrders(selectedRows);
          setSelectedOrderIds(selectedSkuIds);
          setUncheckedRowIds(uncheckedIds);

          // Select visible rows for UI feedback
          setTimeout(() => {
            gridApi.forEachNode((node) => {
              if (
                node.displayed &&
                !uncheckedIds.has(node.data?.[uniqueRowId])
              ) {
                if (uncheckedRowIds.has(node.data?.[uniqueRowId])) {
                  node.setSelected(false);
                } else {
                  node.setSelected(true);
                }
              }
            });
          }, 200);

          return; // We've handled the re-selection, no need to continue to the regular selection logic
        }
      } else {
        // For regular selection (or deselection of "Select All")
        let selectedRows = [];
        let selectedSkuIds = [];

        // Check if "Select All" was just deselected
        const wasSelectAllJustTurnedOff =
          !selectAllSelected && gridApi.isSelectAllRecords === true;

        // Update the grid's state to track that Select All is now off
        gridApi.isSelectAllRecords = selectAllSelected;

        if (wasSelectAllJustTurnedOff) {
          // Don't remove the override completely - it might still be needed for subsequent "Select All" operations
          // But we'll keep the reference in place so that normal selection still works

          // We must explicitly update the selection state since deselecting "Select All"
          // means we want no rows selected (not just visible rows)
          setSelectedOrders([]);
          setSelectedOrderIds([]);

          // We're done, no need to collect any nodes as we know they should all be deselected
          return;
        }

        // For normal selection changes, collect all currently visible selected rows
        gridApi.forEachNode((node) => {
          if (node.selected && node.data) {
            selectedRows.push({ ...node.data });
            selectedSkuIds.push(node.data[uniqueRowId]);
          }
        });

        // Update selection states
        setSelectedOrders(selectedRows);
        setSelectedOrderIds(selectedSkuIds);
      }
    } catch (error) {
      console.error("Error in selection changed handler:", error);
      props.addSnack({
        message: "Error fetching all records",
        variant: "error",
      });
      props.setCreateNewOrderTableDataLoader(false);
    }
  };

  const refreshTableData = () => {
    createNewOrderTableGridInstance?.current?.api?.refreshServerSideStore({
      purge: true,
    });
    createNewOrderTableGridInstance.current.api.deselectAll();
    setSelectedOrderIds([]);
    setSelectedOrders([]);
  };

  const displaySnackMessages = (message, variance, autoHideDuration = 1000) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
        disableOnClose: true,
        autoHideDuration: autoHideDuration,
      },
    });
  };

  // Function to synchronize data changes across all data sources
  const synchronizeDataChanges = (
    changedRecords,
    isFromSelectAll = false,
    uncheckedRows = new Set()
  ) => {
    try {
      const gridApi = createNewOrderTableGridInstance.current.api;

      if (!changedRecords || changedRecords.length === 0) {
        return;
      }

      // Update each changed record in all data sources
      const changedRecordsById = new Map();
      changedRecords.forEach((rec) => {
        const id = rec?.[uniqueRowId];
        if (id !== undefined && id !== null) {
          changedRecordsById.set(id, rec);
        }
      });

      if (changedRecordsById.size === 0) {
        return;
      }

      // 1. Update visible nodes in the grid
      gridApi.forEachNode((node) => {
        const nodeId = node?.data?.[uniqueRowId];
        if (nodeId === undefined || nodeId === null) return;
        const changedRecord = changedRecordsById.get(nodeId);
        if (changedRecord) {
          node.setData({ ...node.data, ...changedRecord });
        }
      });

      // 2. Update cached allRecordsData (for pagination)
      if (gridApi.allRecordsData && gridApi.isSelectAllRecords) {
        gridApi.allRecordsData = gridApi.allRecordsData.map((item) => {
          const itemId = item?.[uniqueRowId];
          const changedRecord = changedRecordsById.get(itemId);
          return changedRecord ? { ...item, ...changedRecord } : item;
        });
      }
      // 3. Update React state (for other components)
      setSelectedOrders((prev) =>
        prev.map((item) => {
          const itemId = item?.[uniqueRowId];
          const changedRecord = changedRecordsById.get(itemId);
          return changedRecord ? { ...item, ...changedRecord } : item;
        })
      );

      // Conditional refresh based on context
      if (isFromSelectAll && uncheckedRows.size === 0) {
        // Full refresh for Select All operations
        createNewOrderTableGridInstance.current.api.refreshServerSideStore({
          purge: true,
        });
      } else {
        // Targeted refresh for normal selections
        createNewOrderTableGridInstance.current.api.redrawRows();
      }
    } catch (e) {
      displaySnackMessages(ERROR_MESSAGE, "error");
      console.log(e);
    }
  };

  const loadTableInstance = (instance) => {
    createNewOrderTableGridInstance.current = instance;
    // Expose synchronizeDataChanges on the grid instance for use by other components
    createNewOrderTableGridInstance.current.synchronizeDataChanges = synchronizeDataChanges;
  };

  const navigateToDeepDrive = (data) => {
    localStorage.setItem("selectedSku", JSON.stringify(selectedOrderIds));
    navigate(ORDER_MANAGEMENT_DEEP_DIVE, {
      state: {
        data: selectedOrders,
        isRecommended: false,
      },
    });
  };

  const navigateToCreateScenario = () => {
    navigate(ORDER_MANAGEMENT_CREATE_SCENARIO);
  };

  const onCellFocused = (_e) => {
    let selectedCol = _e.column.colId;
    let selectedVal = null;
    let selectedRowIndex = _e.rowIndex;
    createNewOrderTableGridInstance.current.api.forEachNode((node, index) => {
      if (index === selectedRowIndex) {
        selectedVal = node.data[selectedCol];
        focusedTableCellValue.current = selectedVal;
      }
    });
  };

  const isOrderRetailColumnPresent = () =>
    createNewTableColumns.some((col) => col.accessor === ORDER_RETAIL_COLUMN);

  const matchesStatusObjChild = (statusObjItem, childData) =>
    statusObjItem?.unique_row_id === childData?.unique_row_id ||
    (childData?.size != null && childData.size === statusObjItem?.size);

  const recalculateParentOrderTotals = (parentData) => {
    if (!parentData?.status_obj?.length) {
      return;
    }
    const children = parentData.status_obj;
    parentData.order_quantity = children.reduce(
      (acc, item) => acc + Number(item.order_quantity || 0),
      0
    );
    parentData.order_cost = children.reduce(
      (acc, item) => acc + Number(item.order_cost || 0),
      0
    );
    if (
      props.isPackOrderingEnabled &&
      parentData.hasOwnProperty(ORDER_QUANTITY_EACHES_COLUMN)
    ) {
      parentData[ORDER_QUANTITY_EACHES_COLUMN] = children.reduce(
        (acc, item) => acc + Number(item[ORDER_QUANTITY_EACHES_COLUMN] || 0),
        0
      );
    }
    if (props.isPackOrderingEnabled && isOrderRetailColumnPresent()) {
      parentData[ORDER_RETAIL_COLUMN] = children.reduce(
        (acc, item) => acc + Number(item[ORDER_RETAIL_COLUMN] || 0),
        0
      );
    }
  };

  const syncChildQtyInStatusObj = (parentData, childData, qty) => {
    if (!parentData?.status_obj?.length) {
      return;
    }
    const itemCost = childData.cost || 0;
    parentData.status_obj.forEach((item) => {
      if (!matchesStatusObjChild(item, childData)) {
        return;
      }
      item.order_quantity = qty;
      if (
        props.isPackOrderingEnabled &&
        item.hasOwnProperty(ORDER_QUANTITY_EACHES_COLUMN)
      ) {
        const packConfig = item.pack_config || 1;
        item[ORDER_QUANTITY_EACHES_COLUMN] = qty * packConfig;
      }
      if (
        props.isPackOrderingEnabled &&
        item.hasOwnProperty(ORDER_COST_COLUMN)
      ) {
        item.order_cost = item[ORDER_QUANTITY_EACHES_COLUMN] * itemCost;
      } else {
        item.order_cost = itemCost * qty;
      }
      if (props.isPackOrderingEnabled && isOrderRetailColumnPresent()) {
        item[ORDER_RETAIL_COLUMN] =
          (item[ORDER_QUANTITY_EACHES_COLUMN] || qty) * (item.price || 0);
      }
    });
  };

  const applyChildOrderQtyOnNode = (childNode, childData, qty) => {
    childNode.data.order_quantity = qty;
    if (
      props.isPackOrderingEnabled &&
      childNode.data.hasOwnProperty(ORDER_QUANTITY_EACHES_COLUMN)
    ) {
      const packConfig = childNode.data.pack_config || 1;
      childNode.data[ORDER_QUANTITY_EACHES_COLUMN] = qty * packConfig;
    }
    if (
      props.isPackOrderingEnabled &&
      childNode.data.hasOwnProperty(ORDER_COST_COLUMN)
    ) {
      childNode.data.order_cost =
        childNode.data[ORDER_QUANTITY_EACHES_COLUMN] * childData.cost;
    } else {
      childNode.data.order_cost = childData.cost * qty;
    }
    if (props.isPackOrderingEnabled && isOrderRetailColumnPresent()) {
      childNode.data[ORDER_RETAIL_COLUMN] =
        (childNode.data[ORDER_QUANTITY_EACHES_COLUMN] || 0) *
        (childNode.data.price || 0);
    }
  };

  const onBlur = (
    _e,
    data,
    column,
    isChanged,
    value,
    _initialValue,
    cellData
  ) => {
    const gridApi = createNewOrderTableGridInstance.current?.api;
    const node =
      cellData?.node ??
      gridApi?.getRowNode(String(data?.[uniqueRowId] ?? data?.unique_row_id));
    if (!node || !isChanged) {
      return;
    }

    let isOrderQtyValid = true;

      if (column.colId === "order_quantity") {
        if (node.level === 0) {
          if (value === "") {
            displaySnackMessages(EMPTY_ORDER_QTY, "info");
            return;
          }
          const parentQty = Math.max(0, parseInt(value) || 0);        
          const children = node.data.status_obj || [];
        
          if (children.length) {
            const distributedQty = Math.floor(parentQty / children.length);
            const remainder = parentQty % children.length;
        
            children.forEach((item, index) => {
              const itemCost = item.cost || data.cost || 0;
              let qty = distributedQty;
        
              // add remainder to first child
              if (index === 0) {
                qty += remainder;
              }

              if (
                IS_MIN_QTY_VALIDATION_ENABLED &&
                qty < parseInt(item?.min_order_quantity_sku || 0)
              ) {
                qty = parseInt(item.min_order_quantity_sku || 0);
              }
              
              if (
                IS_MAX_QTY_VALIDATION_ENABLED &&
                qty > parseInt(item?.max_order_quantity || qty)
              ) {
                qty = parseInt(item.max_order_quantity);
              }

              if (
                IS_MULTIPLE_VALIDATION_ENABLED &&
                item?.order_multiple
              ) {
                qty =
                  Math.ceil(qty / item.order_multiple) *
                  item.order_multiple;
              }
        
              item.order_quantity = qty;

              const childNode = node.childrenAfterGroup?.find(
                (child) => child.data?.size === item.size
              );
              
              if (childNode) {
                childNode.setDataValue("order_quantity", qty);
              }
        
              // Existing calculations
              if (
                props.isPackOrderingEnabled &&
                item.hasOwnProperty(ORDER_QUANTITY_EACHES_COLUMN)
              ) {
                const packConfig = item.pack_config || 1;
        
                item[ORDER_QUANTITY_EACHES_COLUMN] =
                  qty * packConfig;
              }
        
              if (
                props.isPackOrderingEnabled &&
                item.hasOwnProperty(ORDER_COST_COLUMN)
              ) {
                item.order_cost =
                  item[ORDER_QUANTITY_EACHES_COLUMN] * itemCost;
              } else {
                item.order_cost = itemCost * qty;
              }
        
              if (
                props.isPackOrderingEnabled &&
                isOrderRetailColumnPresent()
              ) {
                item[ORDER_RETAIL_COLUMN] =
                  (item[ORDER_QUANTITY_EACHES_COLUMN] || 0) *
                  (item.price || 0);
              }
            });
        
            // recalculate parent totals
            node.data.order_quantity = children.reduce(
              (acc, item) => acc + Number(item.order_quantity || 0),
              0
            );
        
            node.data.order_cost = children.reduce(
              (acc, item) => acc + Number(item.order_cost || 0),
              0
            );
        
            if (
              props.isPackOrderingEnabled &&
              node.data.hasOwnProperty(ORDER_QUANTITY_EACHES_COLUMN)
            ) {
              node.data[ORDER_QUANTITY_EACHES_COLUMN] =
                children.reduce(
                  (acc, item) =>
                    acc +
                    Number(item[ORDER_QUANTITY_EACHES_COLUMN] || 0),
                  0
                );
            }
        
            if (
              props.isPackOrderingEnabled &&
              isOrderRetailColumnPresent()
            ) {
              node.data[ORDER_RETAIL_COLUMN] =
                children.reduce(
                  (acc, item) =>
                    acc +
                    Number(item[ORDER_RETAIL_COLUMN] || 0),
                  0
                );
            }
            node.data.isEdited = true;

            children.forEach((item) => {
              item.isEdited = true;
            });
        
            const nodesToRefresh = [node];

            node.childrenAfterGroup?.forEach((childNode) => {
              nodesToRefresh.push(childNode);
            });
            
            const columnsToRefresh = ["order_quantity", "order_cost"];

            if (
              props.isPackOrderingEnabled &&
              node.data.hasOwnProperty(ORDER_QUANTITY_EACHES_COLUMN)
            ) {
              columnsToRefresh.push(ORDER_QUANTITY_EACHES_COLUMN);
            }

            if (
              props.isPackOrderingEnabled &&
              isOrderRetailColumnPresent()
            ) {
              columnsToRefresh.push(ORDER_RETAIL_COLUMN);
            }

            createNewOrderTableGridInstance.current.api.refreshCells({
              force: true,
              suppressFlash: false,
              rowNodes: nodesToRefresh,
              columns: columnsToRefresh,
            });

            createNewOrderTableGridInstance.current.api.redrawRows({
              rowNodes: nodesToRefresh,
            });
        
            return;
          }
        } else {
        const parentNode = node.parent;
        const getEditedOrderQty = () =>
          parseInt(
            node.data?.order_quantity ?? data?.order_quantity ?? value,
            10
          ) || 0;

        if (value === "") {
          const validatedInputValue =
            parseInt(data?.min_order_quantity_sku, 10) || 0;
          displaySnackMessages(EMPTY_ORDER_QTY, "info");
          applyChildOrderQtyOnNode(node, data, validatedInputValue);
          if (parentNode?.data) {
            syncChildQtyInStatusObj(
              parentNode.data,
              data,
              validatedInputValue
            );
          }
        } else {
          let validatedInputValue = getEditedOrderQty();
          const editedQty = getEditedOrderQty();
          if (data?.order_quantity != null && data?.order_quantity !== "") {
            let correctedValue = 0;

            if (isOrderQtyValid && !props.isPackOrderingEnabled) {
              if (
                IS_MULTIPLE_VALIDATION_ENABLED &&
                editedQty % parseInt(data?.order_multiple) !== 0
              ) {
                isOrderQtyValid = false;
                correctedValue = editedQty;
                displaySnackMessages(INVALID_ORDER_QTY_PACKSIZE, "info");
              }
              if (
                IS_MIN_QTY_VALIDATION_ENABLED &&
                editedQty < parseInt(data?.min_order_quantity_sku)
              ) {
                isOrderQtyValid = false;
                correctedValue = data?.min_order_quantity_sku;
                displaySnackMessages(INVALID_ORDER_QTY, "info");
              }
              if (
                IS_MAX_QTY_VALIDATION_ENABLED &&
                editedQty > parseInt(data?.max_order_quantity)
              ) {
                isOrderQtyValid = false;
                correctedValue = data?.max_order_quantity;
                displaySnackMessages(INVALID_ORDER_QTY, "info");
              }
            }

            if (isOrderQtyValid) {
              validatedInputValue = editedQty;
            } else {
              const reminder =
                editedQty % parseInt(data?.order_multiple);
              if (reminder >= data?.order_multiple / 2) {
                validatedInputValue = parseInt(
                  Math.ceil(correctedValue / data?.order_multiple) *
                    data?.order_multiple
                );
              } else {
                validatedInputValue = parseInt(
                  Math.floor(correctedValue / data?.order_multiple) *
                    data?.order_multiple
                );
                if (validatedInputValue < data?.min_order_quantity_sku) {
                  validatedInputValue = parseInt(
                    Math.ceil(correctedValue / data?.order_multiple) *
                      data?.order_multiple
                  );
                }
              }
            }
          }

          applyChildOrderQtyOnNode(node, data, validatedInputValue);
          if (parentNode?.data) {
            syncChildQtyInStatusObj(parentNode.data, data, validatedInputValue);
          }
        }

        if (parentNode?.data) {
          recalculateParentOrderTotals(parentNode.data);
          parentNode.setDataValue(
            "order_quantity",
            parentNode.data.order_quantity
          );
          parentNode.setDataValue("order_cost", parentNode.data.order_cost);
          if (
            props.isPackOrderingEnabled &&
            parentNode.data.hasOwnProperty(ORDER_QUANTITY_EACHES_COLUMN)
          ) {
            parentNode.setDataValue(
              ORDER_QUANTITY_EACHES_COLUMN,
              parentNode.data[ORDER_QUANTITY_EACHES_COLUMN]
            );
          }
          if (props.isPackOrderingEnabled && isOrderRetailColumnPresent()) {
            parentNode.setDataValue(
              ORDER_RETAIL_COLUMN,
              parentNode.data[ORDER_RETAIL_COLUMN]
            );
          }
        }
        const columnsToRefresh = ["order_quantity", "order_cost"];

        if (
          props.isPackOrderingEnabled &&
          node.data.hasOwnProperty(ORDER_QUANTITY_EACHES_COLUMN)
        ) {
          columnsToRefresh.push(ORDER_QUANTITY_EACHES_COLUMN);
        }
        
        if (
          props.isPackOrderingEnabled &&
          isOrderRetailColumnPresent()
        ) {
          columnsToRefresh.push(ORDER_RETAIL_COLUMN);
        }
        
        const rowNodesToRefresh = [node];

        if (parentNode) {
          rowNodesToRefresh.push(parentNode);
        }

        node.data.isEdited = true;

        if (parentNode?.data) {
          parentNode.data.isEdited = true;
        }

        gridApi?.refreshCells({
          force: true,
          suppressFlash: false,
          rowNodes: rowNodesToRefresh,
          columns: columnsToRefresh,
        });

        gridApi?.redrawRows({
          rowNodes: rowNodesToRefresh,
        });
        }
      }
  };

  const onCellValueChanged = (params) => {
    try {
      const { colDef, node } = params;
      if (colDef.column_name === NOT_BEFORE_AFTER_DATE_COLUMN) {
        let isValueError = false;
        let columnValue = node?.data?.[NOT_BEFORE_AFTER_DATE_COLUMN];
        let notBeforeDate = moment(columnValue.fiscalInfoStartDate).format(
          DATE_FORMAT
        );
        let notAfterDate = moment(columnValue.fiscalInfoEndDate).format(
          DATE_FORMAT
        );
        let orderPlacementDate = moment(
          node?.data?.[ORDER_PLACEMENT_DATE_COLUMN]
        ).format(DATE_FORMAT);

        //Valid [Not Before Date] Value must be between than [Order Placement Date] and [Not After Date]
        //Valid [Not After Date] Value must be greater than [Not Before Date] and [Order Placement Date]

        if (notBeforeDate !== INVALID_DATE && notAfterDate !== INVALID_DATE) {
          node.data.isDateEdited = true;

          if (
            moment(notBeforeDate).isAfter(orderPlacementDate) &&
            moment(notAfterDate).isAfter(orderPlacementDate)
          ) {
            isValueError = false;
          } else {
            isValueError = true;
          }
        }

        if (isValueError)
          displaySnackMessages(NOT_BEFORE_AFTER_DATE_ERROR_MESSAGE, "error");

        params.api.refreshCells({
          force: true,
          suppressFlash: false,
          columns: [NOT_BEFORE_AFTER_DATE_COLUMN],
          rowNodes: [node],
        });
      }

      if (colDef.column_name === EXPECTED_RECEIPT_DATE_COLUMN) {
        let isValueError = false;
        let columnValue = node?.data?.[EXPECTED_RECEIPT_DATE_COLUMN];
        let selectedDate = formatReceiptDate(columnValue);
        let orderPlacementDate = moment(
          node?.data?.[ORDER_PLACEMENT_DATE_COLUMN]
        ).format(DATE_FORMAT);

        //Valid [Not Before Date] Value must be between than [Order Placement Date] and [Not After Date]
        //Valid [Not After Date] Value must be greater than [Not Before Date] and [Order Placement Date]

        if (selectedDate !== INVALID_DATE) {
          node.data.isDateEdited = true;

          if (
            moment(selectedDate, DATE_FORMAT).isAfter(
              moment(orderPlacementDate, DATE_FORMAT)
            )
          ) {
            isValueError = false;
          } else {
            isValueError = true;
          }
        }

        if (isValueError) {
          node.data.isNotValid = true;
          displaySnackMessages(INVALID_RECEIPT_DATE, "error");
        }

        if (isCreateNewOrderTableGrouping && !isValueError) {
          const calculatedDate = formatReceiptDate(columnValue);
          node.data.status_obj.forEach((item) => {
            item.isDateEdited = true;
            item.expected_receipt_date = calculatedDate;
          });
          node.data.isNotValid = false;
        }

        params.api.forEachNode((currentNode) => {
          if (currentNode.data.unique_row_id === node.data.unique_row_id) {
            params.api.refreshCells({
              force: true,
              suppressFlash: false,
              rowNodes: [currentNode],
              columns: [EXPECTED_RECEIPT_DATE_COLUMN],
            });
          }
        });
      }

      if (colDef.column_name === ORDER_REASON_COLUMN) {
        const columnValue = node?.data?.[ORDER_REASON_COLUMN];
        node.data.isOrderReasonEdited = true;

        if (isCreateNewOrderTableGrouping) {
          node.data.order_reason = columnValue;
          node.data.status_obj.forEach((childItem) => {
            childItem.isOrderReasonEdited = true;
            childItem.order_reason = columnValue;
          });
        }

        params.api.forEachNode((currentNode) => {
          if (currentNode.data.unique_row_id === node.data.unique_row_id) {
            params.api.refreshCells({
              force: true,
              suppressFlash: false,
              rowNodes: [currentNode],
              columns: [ORDER_REASON_COLUMN],
            });
          }
        });
      }

      if (colDef.column_name === SHIP_MODE_COLUMN) {
        const columnValue = node?.data?.[SHIP_MODE_COLUMN];
        node.data.isShipModeEdited = true;

        if (isCreateNewOrderTableGrouping) {
          node.data.ship_mode = columnValue;
          node.data.status_obj.forEach((childItem) => {
            childItem.isShipModeEdited = true;
            childItem.ship_mode = columnValue;
          });
        }

        params.api.forEachNode((currentNode) => {
          if (currentNode.data.unique_row_id === node.data.unique_row_id) {
            params.api.refreshCells({
              force: true,
              suppressFlash: false,
              rowNodes: [currentNode],
              columns: [SHIP_MODE_COLUMN],
            });
          }
        });
      }

      if (colDef.column_name === TRANSPORTATION_MODE_COLUMN) {
        applyLeadTimeFromTransportationMode(node.data, params.newValue);
        params.api.refreshCells({
          force: true,
          suppressFlash: false,
          rowNodes: [node],
          columns: [TRANSPORTATION_MODE_COLUMN],
        });
      }
    } catch (error) {
      console.error("Error in onCellValueChanged", error);
    }
  };

  const manualCallBack = async (manualbody, pageIndex, params) => {
    currentManualBody.current = manualbody;
    // Check if we can use cached data from "Select All Records"
    if (params?.api?.isSelectAllRecords && params.api.getPageDataFromCache) {
      // Calculate start and end rows based on page index
      const limit = 10; // Same as used in the API call
      const startRow = pageIndex * limit;
      const endRow = startRow + limit;

      // Try to get data from cache
      const cachedData = params.api.getPageDataFromCache(
        startRow,
        endRow,
        manualbody?.sort
      );

      // If we have cached data, return it and avoid API call
      if (cachedData) {
        return {
          data: cachedData,
          totalCount: params.api.allRecordsTotal,
        };
      }
    }

    // If we can't use cache, proceed with normal API call
    try {
      props.setCreateNewOrderTableDataLoader(true);
      if (props.isRedirectedFromDifferentPage) {
        var skuFilter = JSON.parse(JSON.stringify(tableArticleFilter));
        skuFilter.values = [...selectedSku];
      }

      let createNewOrderFilterArray = [];
      props.selectedFilters.forEach((filter) => {
        if (filter?.values?.length > 0) {
          createNewOrderFilterArray.push(filter);
        }
      });

      let filtersForBody = props.isRedirectedFromDifferentPage
        ? uniqBy(
            [
              ...createNewOrderFilterArray,
              ...(props.createNewOrderFilterDependency || []),
            ],
            (f) =>
              `${f?.attribute_name ?? ""}::${f?.dimension ?? ""}::${
                f?.filter_id ?? ""
              }`
          )
        : [...createNewOrderFilterArray];

      const selectedDcsForApi =
        props.createNewOrderSelectedDcs?.length > 0
          ? props.createNewOrderSelectedDcs
          : props.isRedirectedFromDifferentPage
          ? readOmsCnoRedirectDashboardDcsFromStorage()
          : [];

      filtersForBody = mergeOmsDcIntoFilters(filtersForBody, selectedDcsForApi);

      let body = {
        filters: filtersForBody,
        ...props.startEndDate,
        meta: manualbody
          ? {
              ...manualbody,
              limit: { limit: 10, page: pageIndex + 1 },
            }
          : {
              ...tableConfigurationMetaData.meta,
              limit: { limit: 10, page: Number(pageIndex) ? pageIndex + 1 : 1 },
            },
      };
      let response = await props.getOmsCreateNewOrderTableData(body);
      if (response.data.status) {
        const validCheckConfiguration = Array.isArray(
          params?.api?.checkConfiguration
        )
          ? params.api.checkConfiguration.filter(
              (item) => item !== null && item !== undefined
            )
          : [];
        let formatedData = agGridRowFormatter(
          response.data.data,
          validCheckConfiguration,
          uniqueRowId
        );

        createNewOrderTableCount.current = response.data.total;

        formatedData.forEach((val) => {
          let quantity = 0;
          let cost = 0;
          val.status_obj.forEach((obj) => {
            if (isNil(obj[ORDER_QUANTITY_COLUMN])) {
              obj[ORDER_QUANTITY_COLUMN] = 0;
            }
            if (isNil(obj[ORDER_COST_COLUMN])) {
              obj[ORDER_COST_COLUMN] = 0;
            }
            quantity += isNaN(obj[ORDER_QUANTITY_COLUMN])
              ? 0
              : obj[ORDER_QUANTITY_COLUMN];
            cost += isNaN(obj[ORDER_COST_COLUMN]) ? 0 : obj[ORDER_COST_COLUMN];
          });
          val[ORDER_QUANTITY_COLUMN] = Number(quantity) || 0;
          val[ORDER_COST_COLUMN] = Number(cost) || 0;

          // Calculate order_quantity_eaches if pack ordering is enabled and column exists
          if (
            props.isPackOrderingEnabled &&
            val.hasOwnProperty(ORDER_QUANTITY_EACHES_COLUMN)
          ) {
            // Also update for child items if grouping is enabled
            if (isCreateNewOrderTableGrouping) {
              val.status_obj.forEach((item) => {
                const itemPackConfig = item.pack_config || 1; // Use item's pack_config or default to 1
                item[ORDER_QUANTITY_EACHES_COLUMN] =
                  (item[ORDER_QUANTITY_COLUMN] || 0) * itemPackConfig;
              });
              // Calculate parent node value as sum of all children
              val[ORDER_QUANTITY_EACHES_COLUMN] = val.status_obj.reduce(
                (acc, item) => acc + (item[ORDER_QUANTITY_EACHES_COLUMN] || 0),
                0
              );
            } else {
              // When grouping is disabled, calculate directly
              const packConfig = val.pack_config || 1; // Default to 1 if pack_config is null
              val[ORDER_QUANTITY_EACHES_COLUMN] =
                val[ORDER_QUANTITY_COLUMN] * packConfig;
            }
          }

          // Calculate order_retail if pack ordering is enabled and column exists in grid
          if (props.isPackOrderingEnabled && isOrderRetailColumnPresent()) {
            if (isCreateNewOrderTableGrouping && val.status_obj) {
              val[ORDER_RETAIL_COLUMN] = val.status_obj.reduce(
                (acc, item) => acc + (item[ORDER_RETAIL_COLUMN] || 0),
                0
              );
              val.status_obj.forEach((item) => {
                item[ORDER_RETAIL_COLUMN] =
                  (item[ORDER_QUANTITY_COLUMN] || 0) * (item.price || 0);
              });
            } else {
              val[ORDER_RETAIL_COLUMN] =
                (val[ORDER_QUANTITY_COLUMN] || 0) * (val.price || 0);
            }
          }

          // Calculate order_quantity_eaches if pack ordering is enabled
          if (props.isPackOrderingEnabled) {
            // Also update for child items if grouping is enabled
            if (isCreateNewOrderTableGrouping) {
              val.status_obj.forEach((item) => {
                const itemPackConfig = item.pack_config || 1; // Use item's pack_config or default to 1
                item[ORDER_QUANTITY_EACHES_COLUMN] =
                  (item[ORDER_QUANTITY_COLUMN] || 0) * itemPackConfig;
              });
              // Calculate parent node value as sum of all children
              val[ORDER_QUANTITY_EACHES_COLUMN] = val.status_obj.reduce(
                (acc, item) => acc + (item[ORDER_QUANTITY_EACHES_COLUMN] || 0),
                0
              );
            } else {
              // When grouping is disabled, calculate directly
              const packConfig = val.pack_config || 1; // Default to 1 if pack_config is null
              val[ORDER_QUANTITY_EACHES_COLUMN] =
                val[ORDER_QUANTITY_COLUMN] * packConfig;
            }
          }

          if (val.hasOwnProperty(NOT_BEFORE_AFTER_DATE_COLUMN)) {
            val[NOT_BEFORE_AFTER_DATE_COLUMN] = {
              fiscalInfoStartDate: val.editable_not_before_date,
              fiscalInfoEndDate: val.editable_not_after_date,
            };
          }
          if (val.hasOwnProperty(EXPECTED_RECEIPT_DATE_COLUMN)) {
            val[EXPECTED_RECEIPT_DATE_COLUMN] = val.lead_time
              ? moment().add(val.lead_time, "days").format(DATE_FORMAT)
              : val[EXPECTED_RECEIPT_DATE_COLUMN]
              ? formatReceiptDate(val[EXPECTED_RECEIPT_DATE_COLUMN])
              : "";
            if (isCreateNewOrderTableGrouping) {
              val.status_obj.forEach((item) => {
                item.expected_receipt_date = val[EXPECTED_RECEIPT_DATE_COLUMN];
                item[ORDER_REASON_COLUMN] = val[ORDER_REASON_COLUMN];
                item[SHIP_MODE_COLUMN] = val[SHIP_MODE_COLUMN];
              });
            }
          }
        });

        props.setCreateNewOrderTableDataLoader(false);
        return { data: formatedData, totalCount: response.data.total };
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
        props.setCreateNewOrderTableDataLoader(false);
        return defaultTableData;
      }
    } catch (error) {
      displaySnackMessages(ERROR_MESSAGE, "error");
      console.log(error);
      props.setCreateNewOrderTableDataLoader(false);
      return defaultTableData;
    }
  };

  const redirectToADAVisual = () => {
    var selectedSkuId = [];
    selectedOrders.filter((val) => {
      selectedSkuId.push(val.uniqueRowId);
    });
    const adaPayload = {
      payload: {
        uniqueRowId: selectedSkuId,
      },
      selectedDependency: cloneDeep(
        props.filterDashboardConfiguration?.dependencyData
      ),
      selectedHistoricValue: 1,
      timeline: {
        startDate: moment().format(DATE_FORMAT),
        endDate: moment().add(8, "weeks").format(DATE_FORMAT), //setting the default timeline as 8 weeks from the current date (temporary implementation)
      },
    };
    localStorage.setItem("adaPayload", JSON.stringify(adaPayload));
    window.open(`${ADA_VISUAL}?type=alerts`, "_blank", "noopener,noreferrer");
  };

  /**
   * Handle off-cycle order button click
   * Store selected orders and filters in Redux before showing off-cycle order screen
   */
  const handleShowOffCycleOrder = () => {
    // Get fresh selected rows from grid
    const gridApi = createNewOrderTableGridInstance.current?.api;
    let selectedRowsData = [];

    if (gridApi) {
      // If "Select All" is active and we have all data, use that
      if (gridApi.isSelectAllRecords && gridApi.allRecordsData) {
        selectedRowsData = cloneDeep(gridApi.allRecordsData);
      } else {
        // Otherwise get currently visible selected rows
        gridApi.forEachNode((node) => {
          if (node.selected && node.data) {
            selectedRowsData.push(cloneDeep(node.data));
          }
        });
      }
    }

    // Store selected orders in Redux
    props.setSelectedOrdersFromCNO(selectedRowsData);

    // Call parent handler to show off-cycle order screen
    if (props.onShowOffCycleOrder) {
      props.onShowOffCycleOrder();
    }
  };

  const openSetAllPopUp = () => {
    // Make sure we have the most current selection when opening the popup
    if (createNewOrderTableGridInstance?.current?.api) {
      // Reset the flag in case we closed the popup previously
      let gridApi = createNewOrderTableGridInstance.current.api;

      // Ensure we have a valid getSelectedNodes function
      if (gridApi.isSelectAllRecords && !gridApi._originalGetSelectedNodes) {
        // We lost the reference somehow, let's recreate the override
        const originalGetSelectedNodes = gridApi.getSelectedNodes;
        gridApi._originalGetSelectedNodes = originalGetSelectedNodes;
      }
    }
    setOpenPopUp(true);
  };

  const processCellForClipboard = useCallback((params) => {
    let l_cellValue = cloneDeep(params.value);
    if (
      typeof l_cellValue === "object" &&
      !Array.isArray(l_cellValue) &&
      l_cellValue !== null
    ) {
      return `${l_cellValue.fiscalInfoStartDate} - ${l_cellValue.fiscalInfoEndDate}`;
    }
    return l_cellValue;
  }, []);

  const getTopRightOptions = () => {
    let options = [];
    options.push(
      <>
        {props?.screenConfig?.showReviewForecastBtn && (
          <div>
            <Button
              variant="tertiary"
              color="primary"
              className={classes.button}
              startIcon={<QueryStatsIcon />}
              onClick={redirectToADAVisual}
              disabled={selectedOrders.length === 0}
            >
              Review Forecast
            </Button>
          </div>
        )}

        {showButtons && (
          <div>
            <Button
              variant="tertiary"
              color="primary"
              id="navigateToDeepDrive"
              className={classes.button}
              onClick={navigateToDeepDrive}
              disabled={selectedOrders.length === 0}
            >
              Deep Dive
            </Button>
          </div>
        )}

        {showButtons && (
          <div>
            <Button
              variant="tertiary"
              color="primary"
              id="navigateToCreateScenario"
              onClick={navigateToCreateScenario}
              disabled={true}
            >
              Create Scenario
            </Button>
          </div>
        )}
      </>
    );
    if (selectedOrders.length > 0) {
      // Determine if Set All button should be enabled
      const isSetAllDisabled = !isEmpty(props?.userAccess)
        ? !isUserHasSetAllAccess || selectedOrders.length === 0
        : isUserHasViewOnlyAccess || selectedOrders.length === 0;

      options.push(
        <Button
          variant="tertiary"
          color="primary"
          id="productSetAllBtn"
          onClick={openSetAllPopUp}
          disabled={isSetAllDisabled}
        >
          Set All
        </Button>
      );
      options.push(
        <SendApprovalButton
          refreshTableData={refreshTableData}
          selectedSkuCount={selectedOrders.length}
          agGridInstance={createNewOrderTableGridInstance.current}
          renderAgGrid={renderAgGrid}
          DATE_FORMAT={DATE_FORMAT}
          uncheckedRowIds={uncheckedRowIds}
          uniqueRowId={uniqueRowId}
        />
      );
      // Add Off-Cycle Order button if enabled
      if (IS_OFF_CYCLE_ORDER_ENABLED) {
        options.push(
          <Button
            variant="primary"
            color="primary"
            className={classes.button}
            onClick={handleShowOffCycleOrder}
          >
            Create new off cycle order
          </Button>
        );
      }
    }
    return options;
  };

  return (
    <div>
      <>
        <Loader
          loader={
            props.createNewOrderTableDataLoader ||
            props.createNewOrderTableConfigLoader
          }
          minHeight={"260px"}
        >
          {renderAgGrid && (
            <AgGridComponent
              columns={createNewTableColumns}
              manualCallBack={(body, pageIndex, params) =>
                manualCallBack(body, pageIndex, params)
              }
              selectAllHeaderComponent={true}
              hideSelectAllRecords={false}
              onCellFocused={onCellFocused}
              onSelectionChanged={onSelectionChanged}
              onCellValueChanged={onCellValueChanged}
              onBlur={onBlur}
              loadTableInstance={loadTableInstance}
              rowSelection="multiple"
              rowModelType="serverSide"
              serverSideStoreType="partial"
              onRowSelected
              totalCount={props.createNewOrderTableData.total}
              cacheBlockSize={10}
              uniqueRowId={uniqueRowId}
              pagination={true}
              suppressClickEdit={true}
              processCellForClipboard={processCellForClipboard}
              hideChildSelection={true}
              showSetAll={false}
              purgeClosedRowNodes={true}
              suppressAggFuncInHeader={true}
              groupDisplayType={"custom"}
              treeData={true}
              childKey={"status_obj"}
              tableHeader={`Product Details`}
              topRightOptions={getTopRightOptions()}
              customDateFormatRequired={true}
            />
          )}
        </Loader>

        {openPopUp && (
          <CreateNewOrderSetAllPopUp
            setShowSetAllModal={(showModal) => {
              // When closing the popup, ensure we clean up properly
              if (!showModal) {
                // Reset any component-specific state that might be causing issues
                // but preserve the overall selection state
              }
              setOpenPopUp(showModal);
            }}
            rowsData={selectedOrders}
            uncheckedRowIds={uncheckedRowIds}
            uniqueRowId={uniqueRowId}
            agGridInstance={createNewOrderTableGridInstance.current}
            isCreateNewOrderTableGrouping={isCreateNewOrderTableGrouping}
            TENANT_DATE_FORMAT={DATE_FORMAT}
            STORE_SETALL_FIELDS={props?.screenConfig?.setall_formdata_fields}
          />
        )}
        {showSafetyStockGraph && (
          <SafetyStockGraphView
            setShowSetAllModal={setShowSafetyStockGraph}
            safetyStockGraphPayload={safetyStockGraphPayload}
          />
        )}
        {packConfigState.isOpen && (
          <PackConfigBottomSheet
            openPackConfigDetailSheet={packConfigState.isOpen}
            setOpenPackConfigDetailSheet={handlePackConfigClose}
            l1DisplayName={l1DisplayName}
            activeChildHierarchyKey={packConfigState.selectedArticle}
            screenName="create_new_order"
          />
        )}
      </>
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "createNewOrderFilterConfiguration"
      ]?.appliedFilterData,
    createNewOrderFilterDependency:
      store.omsReducer.createNewOrderService.createNewOrderFilterDependency,
    selectedCreateNewOrderSku:
      store.omsReducer.createNewOrderService.selectedSku,
    selectedFilters: store.omsReducer.createNewOrderService.selectedFilters,
    createNewOrderSelectedDcs:
      store.omsReducer.createNewOrderService.createNewOrderSelectedDcs,
    createNewOrderTableConfigLoader:
      store.omsReducer.createNewOrderService.createNewOrderTableConfigLoader,
    createNewOrderTableConfig:
      store.omsReducer.createNewOrderService.createNewOrderTableConfig,
    createNewOrderTableDataLoader:
      store.omsReducer.createNewOrderService.createNewOrderTableDataLoader,
    createNewOrderTableData:
      store.omsReducer.createNewOrderService.createNewOrderTableData,
    createNewOrderTableDataEditSuccess:
      store.omsReducer.createNewOrderService.createNewOrderTableDataEditSuccess,
    createNewOrderTableDataEditFailed:
      store.omsReducer.createNewOrderService.createNewOrderTableDataEditFailed,
    createNewOrderApproveRequestSuccess:
      store.omsReducer.createNewOrderService
        .createNewOrderApproveRequestSuccess,
    createNewOrderApproveRequestFailed:
      store.omsReducer.createNewOrderService.createNewOrderApproveRequestFailed,
    moduleConfig: store.omsReducer.orderingCommonService.orderingModuleConfig,
    screenConfig:
      store.omsReducer.orderingCommonService.orderingScreensConfig
        ?.create_new_order,
    OffCycleOrderScreenConfig:
      store.omsReducer.offCycleOrderService.offCycleOrderConfiguration,
    orderingAccessControl:
      store.omsReducer.orderingCommonService.orderingAccessControl,
    isPackOrderingEnabled:
      store.omsReducer.orderingCommonService.orderingPackOrderConfig
        ?.pack_ordering,
    userAccess:
      store.omsReducer.orderingCommonService.orderingUserAccess?.vendor_dc,
  };
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
  closeSnack: (payload) => dispatch(closeSnack(payload)),
  setCreateNewOrderTableDataEditSuccess: (payload) =>
    dispatch(setCreateNewOrderTableDataEditSuccess(payload)),
  setCreateNewOrderTableDataEditFailed: (payload) =>
    dispatch(setCreateNewOrderTableDataEditFailed(payload)),
  getOmsCreateNewOrderTableConfiguration: (payload) =>
    dispatch(getOmsCreateNewOrderTableConfiguration(payload)),
  getOmsCreateNewOrderTableData: (payload) =>
    dispatch(getOmsCreateNewOrderTableData(payload)),
  editOmsCreateNewOrderTableData: (payload) =>
    dispatch(editOmsCreateNewOrderTableData(payload)),
  setCreateNewOrderTableConfigLoader: (payload) =>
    dispatch(setCreateNewOrderTableConfigLoader(payload)),
  setCreateNewOrderTableDataLoader: (payload) =>
    dispatch(setCreateNewOrderTableDataLoader(payload)),
  setCreateNewOrderTableData: (payload) =>
    dispatch(setCreateNewOrderTableData(payload)),
  setSelectedOrdersFromCNO: (payload) =>
    dispatch(setSelectedOrdersFromCNO(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(CreateNewOrderTable);
