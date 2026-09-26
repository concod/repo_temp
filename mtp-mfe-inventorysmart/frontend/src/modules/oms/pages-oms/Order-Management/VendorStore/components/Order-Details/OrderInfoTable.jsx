import React, { useEffect, useRef, useState, useMemo } from "react";
import { connect, useSelector } from "react-redux";
import { addSnack, closeSnack } from "core/actions/snackbarActions";
import AgGridComponent from "core/Utils/agGrid";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import Loader from "core/Utils/Loader/loader";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import globalStyles from "core/Styles/globalStyles";
import {
  ERROR_MESSAGE,
  defaultTableData,
  ORDER_QUANTITY_COLUMN,
  tableConfigurationMetaData,
  INVALID_DATE,
  ORDER_PLACEMENT_DATE_COLUMN,
  TENANT_DATE_FORMAT,
  INVALID_EDITABLE_RECEIPT_DATE,
} from "modules/oms/constants-oms/stringConstants";
import { Button, ButtonGroup, Switch, Prompt } from "impact-ui-v3";
import { cloneDeep, isEmpty } from "lodash";
import moment from "moment";
import {
  OMS_STYLE_ORDER_SUMMARY_TOGGLE_OPTIONS_FOR_VENDOR_STORE,
  OMS_STYLE_ORDER_SUMMARY_SWITCH_OPTIONS_FOR_VENDOR_STORE,
} from "modules/oms/constants-oms/stringConstants";
import { getTenantTimeZoneDetails } from "core/commonComponents/coreComponentScreen/utils";
import { FormControl } from "@mui/material";
import OrderDetailsFilterPanel from "./OrderDetailsFilterPanel.jsx";
import {
  getOmsOrderSummaryColumnConfig,
  getOmsOrderSummaryTableData,
  resetOrderDetailsFilters,
  saveOrderDetailsTable,
  setOrderInfoTableConfigLoader,
  setOrderInfoTableDataLoader,
} from "modules/oms/services-oms/Order-Management/order-management-vendor-to-store-service.js";
import { replaceSpecialCharToCharCode } from "core/Utils/functions/utils.js";
import { getHighLevelSummaryHierarchyFilter } from "../../utils/utils";
import { createTableHeader } from "../../../components/Product-Details-Screen/Style-Order-Summary/utils.js";
import { scrollIntoView } from "modules/oms/utils-oms/oms-utility";

/**
 * Component for rendering the subclass level table in the style order summary.
 *
 * This component fetches and displays data in a table format, allowing users to view and edit order quantities
 * for different subclasses. It includes functionality for handling column configurations, data fetching,
 * and user interactions such as selection and input blur events.
 *
 * @component
 * @param {Object} props - The properties passed to the component.
 * @param {Function} props.setOrderInfoTableDataLoader - Function to set the data loader state.
 * @param {Function} props.getOmsOrderSummaryTableData - Function to fetch table data.
 * @param {Function} props.closeSnack - Function to close snack messages.
 * @param {Function} props.addSnack - Function to add snack messages.
 * @param {Function} props.setOrderInfoTableConfigLoader - Function to set the table config loader state.
 * @param {Function} props.getOmsOrderSummaryColumnConfig - Function to fetch column configuration.
 * @param {Object} props.selectedSubClass - The selected subclass data.
 * @param {boolean} props.orderInfoTableDataLoader - Loader state for table data.
 * @param {boolean} props.orderInfoTableConfigLoader - Loader state for table config.
 * @param {boolean} props.styleOrderSummarySubClassTableConfigLoader - Loader state for table configuration.
 * @param {Function} props.setSelectedSubClass - Function to set the selected subclass.
 * @returns {JSX.Element} The rendered component.
 */
const OrderInfoTable = (props) => {
  const globalClasses = globalStyles();
  const classes = useStyles();

  const orderInfoRef = useRef();

  const [
    styleOrderSummarySubClassTableColumns,
    setStyleOrderSummarySubClassTableColumns,
  ] = useState([]);

  const [render, setRender] = useState(false);
  const [resetFilters, setResetFilters] = useState(false);

  const styleOrderSubClassTableGridInstance = useRef(null);

  // Use edited cells from wrapper instead of local state
  const editedCells = props.orderInfoEditedCells || {};
  const setEditedCells = props.setOrderInfoEditedCells || (() => {});

  const [blockedParentEdits, setBlockedParentEdits] = useState({});

  //To Handle Switch Button between Store and Store Tier
  const RIGHT_SWITCH =
    OMS_STYLE_ORDER_SUMMARY_SWITCH_OPTIONS_FOR_VENDOR_STORE?.right;
  const LEFT_SWITCH =
    OMS_STYLE_ORDER_SUMMARY_SWITCH_OPTIONS_FOR_VENDOR_STORE?.left;

  const [metricTypeChecked, setMetricTypeChecked] = useState(true);

  const onSwitchChange = (event) => {
    let userSelection = event.target.checked;

    // Check for unsaved changes before proceeding
    if (hasUnsavedChanges()) {
      setPendingAction("switch");
      setPendingSwitchValue(userSelection);
      setShowUnsavedChangesPrompt(true);
    } else {
      setEditedCells({}); // Clear any potential state
      setBlockedParentEdits({}); // Clear blocked parent edits
      if (userSelection) setMetricTypeChecked(true);
      else setMetricTypeChecked(false);
      setIsTableRefreshRequired(true);
    }
  };

  const DEFAULT_TOGGLE_STATUS =
    props?.vendorToStoreScreenConfig?.default_toggle_value || true;

  const SELECTED_PARENT_ROW_ID =
    props?.vendorToStoreScreenConfig?.parent_row_id || "article";

  const SELECTED_PARENT_LABEL =
    props?.vendorToStoreScreenConfig?.parent_row_label || "Style";
  const SELECTED_PARENT_LABEL_ID =
    props?.vendorToStoreScreenConfig?.parent_row_label_id || "article";

  const SELECTED_PARENT_DESCRIPTION =
    props?.vendorToStoreScreenConfig?.parent_row_description ||
    "Style Description";
  const SELECTED_PARENT_DESCRIPTION_ID =
    props?.vendorToStoreScreenConfig?.parent_row_description_id || "style_name";

  const [isToggleChecked, setIsToggleChecked] = useState(DEFAULT_TOGGLE_STATUS);

  const isSalesOrganisationView = isToggleChecked && !metricTypeChecked;

  const matrixSummaryReducer = useSelector(
    (store) =>
      store?.omsReducer?.matrixSummaryReducer?.matrixSummaryDashboardReducer
  );

  //Helper to get left/right toggle values of the Button Group with fallback
  const TOGGLE_OPTIONS = useMemo(() => {
    const config = props?.vendorToStoreScreenConfig || {};

    const getDefaultToggles = () => [
      config.toggle_value_left ||
        OMS_STYLE_ORDER_SUMMARY_TOGGLE_OPTIONS_FOR_VENDOR_STORE[0],
      config.toggle_value_right ||
        OMS_STYLE_ORDER_SUMMARY_TOGGLE_OPTIONS_FOR_VENDOR_STORE[1],
    ];

    return getDefaultToggles();
  }, [props?.vendorToStoreScreenConfig]);

  const [selectedToggleOption, setSelectedToggleOption] = useState(null);

  // Unsaved changes prompt state
  const [showUnsavedChangesPrompt, setShowUnsavedChangesPrompt] = useState(
    false
  );
  const [pendingAction, setPendingAction] = useState(null); // 'toggle', 'switch', or 'close'
  const [pendingToggleOption, setPendingToggleOption] = useState(null);
  const [pendingSwitchValue, setPendingSwitchValue] = useState(null);

  useEffect(() => {
    const newSelectedOption = DEFAULT_TOGGLE_STATUS
      ? TOGGLE_OPTIONS[1]?.value ||
        OMS_STYLE_ORDER_SUMMARY_TOGGLE_OPTIONS_FOR_VENDOR_STORE[1].value
      : TOGGLE_OPTIONS[0]?.value ||
        OMS_STYLE_ORDER_SUMMARY_TOGGLE_OPTIONS_FOR_VENDOR_STORE[0].value;

    setSelectedToggleOption(newSelectedOption);
    setEditedCells({}); // Clear edited cells when toggle structure changes
  }, [TOGGLE_OPTIONS, DEFAULT_TOGGLE_STATUS]);

  // Clear edited cells when metricTypeChecked changes (fixes editing issues)
  useEffect(() => {
    setEditedCells({}); // Clear edited cells when switch view changes
    setBlockedParentEdits({}); // Clear blocked parent edits
  }, [metricTypeChecked]);

  // Clear blocked parent edits when selected subclass changes
  useEffect(() => {
    setBlockedParentEdits({});
  }, [props.selectedSubClass]);

  const { tenantDateFormat } = getTenantTimeZoneDetails();
  const DATE_FORMAT = tenantDateFormat || TENANT_DATE_FORMAT;

  // Check if there are unsaved changes in OrderInfo table
  const hasUnsavedChanges = () => {
    return Object.keys(editedCells).length > 0;
  };

  // Handle proceeding with unsaved changes (discard them)
  const handleProceedWithUnsavedChanges = () => {
    // Clear unsaved changes in OrderInfo table
    setEditedCells({});
    setBlockedParentEdits({});

    // ⚠️ CRITICAL: Also reset Order Details table (bi-directional sync!)
    if (props.onOrderInfoDiscardChanges) {
      props.onOrderInfoDiscardChanges();
    }

    if (props.clearPendingDistribution) {
      props.clearPendingDistribution();
    }

    // Refresh OrderInfo table to remove visual changes
    if (styleOrderSubClassTableGridInstance?.current?.api) {
      setTimeout(() => {
        try {
          styleOrderSubClassTableGridInstance.current.api.refreshServerSideStore(
            {
              purge: true,
            }
          );
        } catch (error) {
          console.error(
            "Grid refresh error after discard (non-critical):",
            error
          );
        }
      }, 100);
    }

    // Execute the pending action
    if (pendingAction === "toggle" && pendingToggleOption !== null) {
      // Proceed with toggle change (By Store / By Size)
      setIsToggleChecked(!isToggleChecked);
      setSelectedToggleOption(pendingToggleOption);
      setIsTableRefreshRequired(true);
      // Note: displaySnackMessages is handled in wrapper callback
    } else if (pendingAction === "switch" && pendingSwitchValue !== null) {
      // Proceed with switch change (Store / Store Tier)
      if (pendingSwitchValue) setMetricTypeChecked(true);
      else setMetricTypeChecked(false);
      setIsTableRefreshRequired(true);
      // Note: displaySnackMessages is handled in wrapper callback
    } else if (pendingAction === "close") {
      // Proceed with closing the table
      props.setSelectedSubClass(null);
      // Note: displaySnackMessages is handled in wrapper callback
    }

    // Reset prompt state
    setShowUnsavedChangesPrompt(false);
    setPendingAction(null);
    setPendingToggleOption(null);
    setPendingSwitchValue(null);
  };

  // Handle cancelling the action (keep unsaved changes)
  const handleCancelUnsavedChanges = () => {
    setShowUnsavedChangesPrompt(false);
    setPendingAction(null);
    setPendingToggleOption(null);
    setPendingSwitchValue(null);
  };

  const handleToggleOptionChange = (event, option) => {
    if (option !== null) {
      // Check for unsaved changes before proceeding
      if (hasUnsavedChanges()) {
        setPendingAction("toggle");
        setPendingToggleOption(option);
        setShowUnsavedChangesPrompt(true);
      } else {
        // No unsaved changes, proceed normally
        setEditedCells({});
        setBlockedParentEdits({});
        setIsToggleChecked(!isToggleChecked);
        setSelectedToggleOption(option);
        setIsTableRefreshRequired(true);
      }
    }
  };

  // Custom close button handler with unsaved changes check
  const handleCloseButtonClick = () => {
    if (hasUnsavedChanges()) {
      setPendingAction("close");
      setShowUnsavedChangesPrompt(true);
    } else {
      props.setSelectedSubClass(null);
    }
  };

  const [isTableRefreshRequired, setIsTableRefreshRequired] = useState(null);
  //Resets the Filter values when new row in Parent Table is clicked
  useEffect(() => {
    props?.resetOrderDetailsFilters();
  }, [props.selectedSubClass]);

  // Refresh the current subclass table data
  const refreshTableData = () => {
    styleOrderSubClassTableGridInstance?.current?.api?.refreshServerSideStore({
      purge: true,
    });
  };

  const cellClassRules = {
    [classes.disabledCell]: (params) => {
      const colDef = params.colDef;
      if (
        colDef.accessor === "size" ||
        colDef.accessor === "l1_name" ||
        colDef.cellRenderer === "agGroupCellRenderer"
      ) {
        return false;
      }

      if (
        props.selectedSubClass &&
        props.selectedSubClass.order_status_id !== undefined
      ) {
        const orderStatusId = props.selectedSubClass.order_status_id;
        const statusId = parseInt(orderStatusId);
        const nonEditableStatuses = [1, -1, 3];
        return nonEditableStatuses.includes(statusId);
      }
      return false;
    },
  };

  /**
   * Updates the column definitions to set cell renderers and styles based on specific conditions.
   *
   * @param {Array} columnsDef - The array of column definitions to be updated.
   * @returns {Array} The updated array of column definitions.
   *
   * @throws Will display a snack message and return an empty array if an error occurs during processing.
   *
   * The function performs the following updates:
   * - If a column has the `is_grouping_key` property in its `extra` field, sets its `cellRenderer` to "agGroupCellRenderer".
   * - For the column with the name `ORDER_QUANTITY_COLUMN`:
   *   - Sets the `cellStyle` to change the background color if the row data has `isEdited` set to true.
   *   - Sets the `cellRenderer` to either aggregate values at the top level or render a custom `CellRenderers` component.
   * - For the column with the name "editable_expected_receipt_date":
   *   - Sets the `cellStyle` to change the background color if the row data has `isDateEdited` set to true.
   *   - Sets the `cellRenderer` based on the `toggleLevel` value:
   *     - If `toggleLevel` is "By channel", renders a custom `CellRenderers` component at the top level and the date at other levels.
   *     - Otherwise, renders an empty string at the top level and a custom `CellRenderers` component at other levels.
   */
  const checkForEditability = (columnsDef) => {
    try {
      let updatedColumnsDef = cloneDeep(columnsDef);
      updatedColumnsDef = updatedColumnsDef.map((item) => {
        if (item.extra?.is_grouping_key) {
          item.cellRenderer = "agGroupCellRenderer";
        }

        if (item.extra?.is_lockable === true) {
          item.is_lockable = true;
        }
        if (item.column_name === ORDER_QUANTITY_COLUMN) {
          item.cellStyle = (params) => {
            let colour = { backgroundColor: "inherit" };
            const row = params.node.data;

            const f = row?.flag;
            if (f !== null && f !== undefined && f !== "") {
              const flagValue = Number(f);
              if (!Number.isNaN(flagValue) && flagValue !== 0) {
                // if (flagValue === 1) {
                //   colour = { backgroundColor: "#fec49c" };
                // } else
                //  if (flagValue === 3) {
                //   colour = { backgroundColor: "#a39fe8" };
                //} else
                 if (flagValue === 4) {
                  colour = { backgroundColor: "#f6cccc" };
                }
              }
            }

            if (row?.isEdited)
              colour = { backgroundColor: "#0055af36" };
            return colour;
          };

          // Handle value accessor for new {value, isLocked} structure
          item.valueGetter = (params) => {
            const cellData = params.data?.[item.column_name];
            if (
              typeof cellData === "object" &&
              cellData !== null &&
              "value" in cellData
            ) {
              return cellData.value;
            }
            return cellData;
          };

          item.cellRenderer = (params, extraProps) => {
            item.disabled = props?.isUserHasViewOnlyAccess;
            return (
              <CellRenderers
                cellData={params}
                column={item}
                extraProps={extraProps}
                actions={null}
              ></CellRenderers>
            );
          };
        }

        if (item.column_name === "editable_expected_receipt_date") {
          item.cellStyle = (params) => {
            let colour = { backgroundColor: "inherit" };
            // Red background for invalid dates (validation error)
            if (params.node.data.isEditableReceiptDateNotValid) {
              colour = { backgroundColor: "#F6CCCC", color: "#F6CCCC" };
            }
            // Blue background for valid edited dates
            else if (params.node.data.isDateEdited) {
              colour = { backgroundColor: "#0055af36" };
            }
            return colour;
          };
          if (isToggleChecked) {
            item.cellRenderer = (params, extraProps) => {
              if (params.node.level === 0) {
                item.disabled = props?.isUserHasViewOnlyAccess;
                item.disablePast = true;
                return (
                  <CellRenderers
                    cellData={params}
                    column={item}
                    extraProps={extraProps}
                    actions={null}
                  ></CellRenderers>
                );
              } else {
                return moment(
                  params.node.data.editable_expected_receipt_date,
                  TENANT_DATE_FORMAT
                ).format(DATE_FORMAT);
              }
            };
          } else {
            item.cellRenderer = (params, extraProps) => {
              if (params.node.level === 0) {
                return "";
              } else {
                item.disabled = props?.isUserHasViewOnlyAccess;
                return (
                  <CellRenderers
                    cellData={params}
                    column={item}
                    extraProps={extraProps}
                    actions={null}
                  ></CellRenderers>
                );
              }
            };
          }
        }

        if (item.column_name === "ship_mode" && item.is_editable) {
          item.cellStyle = (params) => {
            return params.node.data.isShipModeEdited
              ? { backgroundColor: "#0055af36" }
              : { backgroundColor: "inherit" };
          };
          if (isToggleChecked) {
            item.cellRenderer = (params, extraProps) => {
              if (params.node.level === 0) {
                return (
                  <CellRenderers
                    cellData={params}
                    column={item}
                    extraProps={extraProps}
                    actions={null}
                  ></CellRenderers>
                );
              } else {
                // if ship_mode - type is list- is null, then return ""
                return params?.node?.data?.ship_mode || "";
              }
            };
          } else {
            item.cellRenderer = (params, extraProps) => {
              if (params.node.level === 0) {
                return "";
              } else {
                return (
                  <CellRenderers
                    cellData={params}
                    column={item}
                    extraProps={extraProps}
                    actions={null}
                  ></CellRenderers>
                );
              }
            };
          }
        }

        if (item.column_name === "order_reason" && item.is_editable) {
          item.cellStyle = (params) => {
            return params.node.data.isOrderReasonEdited
              ? { backgroundColor: "#0055af36" }
              : { backgroundColor: "inherit" };
          };
          if (isToggleChecked) {
            item.cellRenderer = (params, extraProps) => {
              if (params.node.level === 0) {
                return (
                  <CellRenderers
                    cellData={params}
                    column={item}
                    extraProps={extraProps}
                    actions={null}
                  ></CellRenderers>
                );
              } else {
                // if order_reason- type is list- is null, then return ""
                return params?.node?.data?.order_reason || "";
              }
            };
          } else {
            item.cellRenderer = (params, extraProps) => {
              if (params.node.level === 0) {
                return "";
              } else {
                return (
                  <CellRenderers
                    cellData={params}
                    column={item}
                    extraProps={extraProps}
                    actions={null}
                  ></CellRenderers>
                );
              }
            };
          }
        }

        item.cellClassRules = cellClassRules;

        return item;
      });
      return updatedColumnsDef;
    } catch (err) {
      displaySnackMessages("Something went wrong", "error");
      return [];
    }
  };

  //Gets the UniqueRow ID For Store/Size/Store Tier Views
  const getUniqueRowId = () => {
    if (isToggleChecked) {
      if (metricTypeChecked) {
        return RIGHT_SWITCH?.id;
      } else {
        return LEFT_SWITCH?.id;
      }
    } else return TOGGLE_OPTIONS?.[0]?.id;
  };

  //Gets the Order By Value for the Payload in Store/Size/Store Tier Views
  const getOrderByValue = (isCalledFromDataApi = false) => {
    if (isToggleChecked) {
      if (metricTypeChecked) {
        return RIGHT_SWITCH?.value;
      } else {
        if (isCalledFromDataApi) return RIGHT_SWITCH?.value;
        return LEFT_SWITCH?.value;
      }
    } else return TOGGLE_OPTIONS?.[0]?.value;
  };

  //Gets the Group By Value for the Payload in Store/Size/Store Tier Views
  const getGroupByValue = () => {
    if (isToggleChecked) {
      if (metricTypeChecked) {
        return RIGHT_SWITCH?.groupId;
      } else {
        return LEFT_SWITCH?.groupId;
      }
    } else return undefined;
  };

  const enrichEditPayloadForSalesOrgName = (payload, gridApi) => {
    if (!payload || !gridApi) return payload;

    payload.is_order_list_edit = true;

    const rowDataByOrderGroupId = new Map();
    gridApi.forEachNode((node) => {
      if (!node?.data) return;
      if (node.level !== 0) return;
      const orderGroupId = node.data.order_group_id;
      if (orderGroupId == null) return;

      const statusObjOrderIds = [];
      const statusObjRoqConstrained = [];
      if (Array.isArray(node.data.status_obj)) {
        node.data.status_obj.forEach((statusItem) => {
          if (statusItem?.order_ids != null) {
            statusObjOrderIds.push(statusItem.order_ids);
          }
          statusObjRoqConstrained.push(statusItem?.roq_constrained);
        });
      }
      rowDataByOrderGroupId.set(orderGroupId, {
        order_ids: node.data.order_ids,
        statusObjOrderIds,
        statusObjRoqConstrained,
      });
    });

    if (!payload.modified || !Array.isArray(payload.modified)) return payload;

    payload.modified.forEach((item) => {
      const orderGroupId = item?.ordergroup?.name;
      if (orderGroupId == null) return;

      const rowData = rowDataByOrderGroupId.get(orderGroupId);
      if (!rowData) return;

      const orderInfo = item?.ordergroup?.order_info;
      if (!orderInfo || !Array.isArray(orderInfo)) return;

      if (rowData.order_ids != null) {
        orderInfo.forEach((info) => {
          info.order_ids = rowData.order_ids;
        });
      }

      // Add status_obj order_ids to each item in orders array (same index as status_obj)
      orderInfo.forEach((info) => {
        const orders = info.orders;
        if (!Array.isArray(orders) || !rowData.statusObjOrderIds) return;
        orders.forEach((order, orderIndex) => {
          const orderIds = rowData.statusObjOrderIds[orderIndex];
          if (orderIds != null) {
            order.order_ids = orderIds;
          }
          const roqConstrained = rowData.statusObjRoqConstrained?.[orderIndex];
          if (roqConstrained != null) {
            order.total_roq = roqConstrained;
          }
        });
      });
    });

    return payload;
  };

  //Finds the Unique Row ID of Order Details Table 1
  const getSelectedParentRowID = () => {
    if (!isEmpty(props.selectedSubClass)) {
      const selectedRowID = props.selectedSubClass[SELECTED_PARENT_ROW_ID];
      return replaceSpecialCharToCharCode(selectedRowID);
    }
  };

  /**
   * Helper function to apply pending distribution to newly loaded records
   * @param {Array} formatedData - The formatted data from API
   * @param {number} apiResponseTotal - The total count from API response (sum of all 'total' fields)
   * @returns {Array} - Data with applied distribution
   */
  const applyPendingDistributionToData = (
    formatedData,
    apiResponseTotal = 0
  ) => {
    // Get pending distribution from wrapper
    const pendingDistribution = props.getPendingDistribution
      ? props.getPendingDistribution()
      : null;

    if (!pendingDistribution) {
      return formatedData; // No pending distribution, return as is
    }

    let { totalQuantity, roqConstrained, totalLockedValue } = pendingDistribution;

    // 🔧 CRITICAL FIX: If original top table roq_constrained was 0, always use fresh API response total
    // This handles toggle/switch scenarios where new total is returned
    const originalTopTableRoq = props.selectedSubClass?.roq_constrained || 0;
    const topOrderDetailsRoqConstrainedIsZero = !(
      parseFloat(props.selectedSubClass?.roq_constrained) || 0
    );
    if (originalTopTableRoq === 0 && apiResponseTotal > 0) {
      roqConstrained = apiResponseTotal;
    }

    // 🎯 CRITICAL FIX: Calculate remaining quantity after locked parents
    const remainingQuantityForUnlocked = totalQuantity - (totalLockedValue || 0);

    // 🚀 NEW LOGIC: Apply ROQ-based distribution to all records on this page
    if (totalQuantity && roqConstrained) {
      formatedData.forEach((item, index) => {
        if (item.status_obj && Array.isArray(item.status_obj)) {
          // Check if parent row is locked
          const isParentLocked =
            typeof item.order_quantity === "object" &&
            item.order_quantity?.isLocked === true;

          if (!isParentLocked) {
            // Raw parent ROQ (sum of children in API); when 0, split quantity evenly across sizes
            const parentRawRoqConstrained =
              parseFloat(item.roq_constrained) || 0;
            // 📊 Calculate parent quantity using ROQ proportion
            // If both roq_constrained and roq_unconstrained are 0, use 1 as fallback
            let parentRoqConstrained = item.roq_constrained || 0;
            if (
              parentRoqConstrained === 0 &&
              (item.roq_unconstrained || 0) === 0
            ) {
              parentRoqConstrained = 1;  // Fallback to 1
            }
            const effectiveParentRoq = parentRoqConstrained;

            if (effectiveParentRoq > 0) {
              // 🎯 CRITICAL FIX: Use remainingQuantityForUnlocked to account for locked parents!
              const recordQuantity = Math.ceil(
                (remainingQuantityForUnlocked * effectiveParentRoq) / roqConstrained
              );

              // 🔒 Handle children with ROQ-based distribution
              let unlockedChildren = [];
              let lockedChildren = [];
              let totalLockedChildValue = 0;

              // First pass: categorize children by lock state
              item.status_obj.forEach((child, childIndex) => {
                const isChildLocked =
                  typeof child.order_quantity === "object" &&
                  child.order_quantity?.isLocked === true;
                if (isChildLocked) {
                  lockedChildren.push({ child, childIndex });
                  const lockedValue = getOrderQuantityValue(child.order_quantity) || 0;
                  totalLockedChildValue += lockedValue;
                } else {
                  unlockedChildren.push({ child, childIndex });
                }
              });

              // Calculate remaining quantity after accounting for locked children
              const remainingRecordQuantity = Math.max(
                0,
                recordQuantity - totalLockedChildValue
              );


              // 📊 Distribute to unlocked children
              if (unlockedChildren.length > 0) {
                if (
                  topOrderDetailsRoqConstrainedIsZero ||
                  parentRawRoqConstrained === 0
                ) {
                  // Top ROQ 0 (total/count) or parent ROQ 0 (children sum to 0): equal split
                  const equalQuantity = Math.ceil(
                    remainingRecordQuantity / unlockedChildren.length
                  );
                  unlockedChildren.forEach(({ child, childIndex }) => {
                    child.order_quantity = setOrderQuantityValue(
                      child.order_quantity,
                      equalQuantity
                    );
                    child.isEdited = true;
                  });
                } else {
                  // 🎯 Proportional: denominator = parent ROQ whenever it is > 0 (not only > 1).
                  // Otherwise fall back to child count (should be rare inside effectiveParentRoq > 0).
                  const childDistributionDenominator = effectiveParentRoq > 0
                    ? effectiveParentRoq
                    : (item.status_obj?.length || 1);

                  if (childDistributionDenominator > 0) {
                    // Distribute using ROQ proportions
                    unlockedChildren.forEach(({ child, childIndex }) => {
                      const childRoqConstrained =
                        parseFloat(child.roq_constrained) || 0;
                      const childQuantity = Math.ceil(
                        (remainingRecordQuantity * childRoqConstrained) /
                          childDistributionDenominator
                      );

                      child.order_quantity = setOrderQuantityValue(
                        child.order_quantity,
                        childQuantity
                      );
                      child.isEdited = true;
                    });
                  } else {
                    // Fallback: equal distribution if no ROQ data available
                    const equalQuantity = Math.ceil(
                      remainingRecordQuantity / unlockedChildren.length
                    );
                    unlockedChildren.forEach(({ child }) => {
                      child.order_quantity = setOrderQuantityValue(
                        child.order_quantity,
                        equalQuantity
                      );
                      child.isEdited = true;
                    });
                  }
                }
              }

              // 🔒 Mark locked children as edited for payload tracking (values unchanged)
              lockedChildren.forEach(({ child, childIndex }) => {
                child.isEdited = true; // Track for payload but don't change values
              });

              // Update parent quantity as sum of children (after distribution)
              const calculatedParentQuantity = item.status_obj.reduce(
                (acc, child) =>
                  acc + (getOrderQuantityValue(child.order_quantity) || 0),
                0
              );

              item.order_quantity = setOrderQuantityValue(
                item.order_quantity,
                calculatedParentQuantity
              );
              item.isEdited = true;
              
              // 🎯 CRITICAL FIX: Update order_quantity_previous for bi-directional sync
              item.order_quantity_previous = item.order_quantity;
            }
          }
        }
      });
    }

    return formatedData;
  };

  /**
   * Asynchronous function to handle manual callback for fetching and formatting style order summary subclass table data.
   *
   * @param {Object} manualbody - The manual body data to be included in the request.
   * @param {number} pageIndex - The current page index for pagination.
   * @param {Object} params - Additional parameters, including API configuration.
   * @returns {Promise<Object>} - A promise that resolves to an object containing formatted data and total count.
   * @throws Will display an error message and return default table data if the request fails.
   */
  const manualCallBack = async (manualbody, pageIndex, params) => {
    try {
      props.setOrderInfoTableDataLoader(true);

      //Gets the filters from OMS High Level Summary screen
      const appliedOmsProductFilters = props.globalFiltersInParentLevel?.filter(
        (filter) => filter.display_type !== "fiscalCalendar"
      );
      let appliedOmsDateFilters = [];
      if (
        props.ropParentDateRange?.start_date &&
        props.ropParentDateRange?.end_date
      ) {
        appliedOmsDateFilters.push(props.ropParentDateRange);
      }
      if (
        props.recommRecieptParentDateRange?.start_date &&
        props.recommRecieptParentDateRange?.end_date
      ) {
        appliedOmsDateFilters.push(props.recommRecieptParentDateRange);
      }

      //Gets the custom filters on Order Info Table 2
      const appliedFilters = cloneDeep(
        props?.orderDetailsFiltersPayload?.filters || []
      );

      const appliedProductFilters = appliedFilters?.length
        ? [...appliedOmsProductFilters, ...appliedFilters]
        : [...appliedOmsProductFilters];

      const hierarchyInfo = props?.highLevelSummaryState || {};
      const orderInfoHierarchyFilter = getHighLevelSummaryHierarchyFilter(
        hierarchyInfo
      );
      if (orderInfoHierarchyFilter) {
        appliedProductFilters.push(orderInfoHierarchyFilter);
      }

      const orderByValue = getOrderByValue(true);
      const groupByValue = getGroupByValue();

      const clickedParentID = getSelectedParentRowID();

      let body = {
        filters: [...appliedProductFilters],
        global_date_filter: [...appliedOmsDateFilters],
        meta: manualbody
          ? {
              ...manualbody,
              limit: { limit: 10, page: pageIndex + 1 },
            }
          : {
              ...tableConfigurationMetaData.meta,
              limit: { limit: 10, page: Number(pageIndex) ? pageIndex + 1 : 1 },
            },
        order_by: orderByValue,
        group_by: groupByValue,
        order_type: props?.selectedSubClass?.order_type,
        order_group_id: props.selectedSubClass?.order_group_id,
        order_status_id: props.selectedSubClass?.order_status_id,
        styles: [clickedParentID],
      };

      if (matrixSummaryReducer?.displayDataToWeekLevel) {
        body.fiscal_weeks = props.fieldsDataInParentLevel;
      } else {
        body.months = props.fieldsDataInParentLevel;
      }
      let response = await props.getOmsOrderSummaryTableData(body);
      if (response.data.status) {
        let formatedData = agGridRowFormatter(
          response.data.data,
          params?.api?.checkConfiguration,
          isToggleChecked
            ? TOGGLE_OPTIONS?.[1]?.value
            : TOGGLE_OPTIONS?.[0]?.value
        );

        formatedData = formatedData.map((item) => {
          if (
            !item.hasOwnProperty("order_quantity") ||
            item.order_quantity === null ||
            item.order_quantity === undefined ||
            item.order_quantity === ""
          ) {
            if (item.hasOwnProperty("raw_roq")) {
              item.order_quantity = item.raw_roq;
            } else {
              item.order_quantity = 0;
            }
          }

          item.status_obj?.forEach((status) => {
            if (
              !status.hasOwnProperty("order_quantity") ||
              status.order_quantity === null ||
              status.order_quantity === undefined ||
              status.order_quantity === ""
            ) {
              if (status.hasOwnProperty("raw_roq")) {
                status.order_quantity = status.raw_roq;
              } else {
                status.order_quantity = 0;
              }
            }

            status.isMOQBreached = isSalesOrganisationView
              ? false
              : status.store_min !== null &&
                (status.order_quantity  < status.store_min);
          });
          item.order_quantity = item.status_obj?.reduce(
            (acc, val) =>
              (acc += Number(getOrderQuantityValue(val.order_quantity) || 0)),
            0
          );

          if (
            !item.hasOwnProperty("open_receipt_units") ||
            item.open_receipt_units === null ||
            item.open_receipt_units === undefined ||
            item.open_receipt_units === "" ||
            !item.open_receipt_units
          ) {
            item.open_receipt_units = 0;
          }

          if (
            !item.hasOwnProperty("min_order_quantity") ||
            item.min_order_quantity === null ||
            item.min_order_quantity === undefined ||
            item.min_order_quantity === ""
          ) {
            item.min_order_quantity = "-";
          }

          const itemOrderQuantity =
            getOrderQuantityValue(item.order_quantity) || 0;
          item.isMOQBreached = isSalesOrganisationView
            ? false
            : item.min_order_quantity !== null &&
              itemOrderQuantity < item.min_order_quantity;

          item.order_quantity_previous = item.order_quantity;

          if (isToggleChecked) {
            const shipment = item.shipment_modes?.find(
              (item) => item.default_mode === 1
            );
            const orderPlacementDate =
              shipment &&
              moment(item.order_placement_date)
                .add(shipment.lead_time || 1, "days")
                .format(DATE_FORMAT);
            if (shipment) {
              item.ship_mode = item.mode_shipment || shipment.shipment_mode;
              item.lead_time = item.lead_time || shipment.lead_time;
            }
            item.editable_expected_receipt_date =
              item.editable_expected_receipt_date || orderPlacementDate;
            item.status_obj?.forEach((status) => {
              if (shipment) {
                status.ship_mode =
                  status.ship_mode ||
                  item.mode_shipment ||
                  shipment.shipment_mode;
                status.lead_time = item.lead_time || shipment.lead_time;
              }

              status.editable_expected_receipt_date =
                item.editable_expected_receipt_date || orderPlacementDate;
            });
          } else {
            item.status_obj?.forEach((status) => {
              const shipment = status.shipment_modes?.find(
                (status) => status.default_mode === 1
              );
              const orderPlacementDate =
                shipment &&
                moment(item.order_placement_date)
                  .add(shipment.lead_time || 1, "days")
                  .format(DATE_FORMAT);
              if (shipment) {
                status.ship_mode =
                  status.ship_mode ||
                  item.shipment_mode ||
                  shipment.shipment_mode;
                status.lead_time = item.lead_time || shipment.lead_time;
              }
              status.editable_expected_receipt_date =
                status.editable_expected_receipt_date ||
                item.editable_expected_receipt_date ||
                orderPlacementDate;
            });
          }

          return item;
        });

        const totalCount = response.data.total;
        if (props.onTotalCountReceived) {
          props.onTotalCountReceived(totalCount);
        }

        //  Update pendingDistribution with new total if roq_constrained is 0
        if (props.onOrderInfoTotalReceived) {
          props.onOrderInfoTotalReceived(totalCount);
        }

        //  Pass API response total to pending distribution calculation
        const processedData = applyPendingDistributionToData(
          formatedData,
          totalCount
        );

        props.setOrderInfoTableDataLoader(false);
        setIsTableRefreshRequired(false);
        return { data: processedData, totalCount: totalCount };
      } else {
        setIsTableRefreshRequired(false);
        displaySnackMessages(ERROR_MESSAGE, "error");
        return defaultTableData;
      }
    } catch (err) {
      setIsTableRefreshRequired(false);
      displaySnackMessages(ERROR_MESSAGE, "error");
      return defaultTableData;
    } finally {
      props.setOrderInfoTableDataLoader(false);
      scrollIntoView(orderInfoRef);
    }
  };

  const loadTableInstance = (params) => {
    styleOrderSubClassTableGridInstance.current = params;

    // Also update the wrapper's reference immediately
    if (props.orderInfoTableGridInstance) {
      props.orderInfoTableGridInstance.current = params;
      // Expose utility functions to wrapper
      props.orderInfoTableGridInstance.current.getUniqueRowId = getUniqueRowId;
      props.orderInfoTableGridInstance.current.getLockedChildrenData = getLockedChildrenData;
      props.orderInfoTableGridInstance.current.getGroupByValue = getGroupByValue;
      props.orderInfoTableGridInstance.current.enrichEditPayloadForSalesOrgName =
        enrichEditPayloadForSalesOrgName;
    }
  };

  const displaySnackMessages = (message, variance, additionalOptions = {}) => {
    props.closeSnack();
    props.addSnack({
      message: message,
      options: {
        variant: variance,
        ...additionalOptions,
      },
    });
  };

  const getOrderPlacementDateOnTransportChange = (node, shipment) => {
    let updatedOrderPlacementDate = moment(
      node?.data?.[ORDER_PLACEMENT_DATE_COLUMN],
      TENANT_DATE_FORMAT,
      true
    );
    if (!updatedOrderPlacementDate.isValid()) {
      updatedOrderPlacementDate = moment(
        node?.data?.[ORDER_PLACEMENT_DATE_COLUMN],
        DATE_FORMAT,
        true
      );
    }
    const calculatedDate = moment(updatedOrderPlacementDate)
      .add(shipment.lead_time, "days")
      .format(DATE_FORMAT);

    return moment(calculatedDate, DATE_FORMAT);
  };

  /**
   * Handles the blur event for the order quantity input field.
   *
   * This function validates the new value of the order quantity input field.
   * If the value is empty, it displays an info message and marks the row as edited.
   * If the value is not empty, it validates the value against the minimum and maximum order quantity.
   * If the value is outside the valid range, it adjusts the value to the nearest valid value and displays an info message.
   * It then refreshes the cells in the table to reflect the changes.
   *
   * Additionally, it updates the `isMOQBreached` flag to indicate if the order quantity is outside the valid range.
   * It also stores the entire row data in the `editedCells` state for tracking changes.
   *
   * @param {Object} _e - The event object (unused).
   * @param {Object} data - The data object containing row information.
   * @param {Object} column - The column object containing column information.
   * @param {boolean} isChanged - Flag indicating if the value has changed.
   */
  const onBlur = (_e, data, column, isChanged) => {
    // ⚠️ CRITICAL FIX: Use the SAME row ID logic as the table display
    const uniqueRowId = getUniqueRowId(); // This properly considers metricTypeChecked!

    // Get updateCellBy for child row identification
    // This determines how to identify specific child rows within parent's status_obj
    const updateCellBy = isToggleChecked
      ? TOGGLE_OPTIONS?.[0]?.id // When toggle is checked, use first toggle option ID
      : "id"; // When toggle is not checked, use direct "id" field

    if (isChanged) {
      if (column.colId === "order_quantity") {
        styleOrderSubClassTableGridInstance.current.api.forEachNode((node) => {
          if (
            node.data[uniqueRowId] === data[uniqueRowId] &&
            !node.data[updateCellBy]
          ) {
            if (data[updateCellBy]) {
              const aggregatedValue = node.data.status_obj?.reduce(
                (acc, item) => {
                  const itemValue =
                    getOrderQuantityValue(item.order_quantity) || 0;
                  return acc + itemValue;
                },
                0
              );

              node.data.order_quantity = setOrderQuantityValue(
                node.data.order_quantity,
                aggregatedValue
              );

              node.data.status_obj?.forEach((item) => {
                if (item[updateCellBy] === data[updateCellBy]) {
                  item.isEdited = true;
                  item.isManuallyEdited = true; // 🎯 NEW: Mark as manually edited
                  item.isMOQBreached = isSalesOrganisationView
                    ? false
                    : (item.store_min !== null &&
                    item.order_quantity< item.store_min);

                  setEditedCells((prev) => {
                    const updatedRows = {
                      ...prev,
                      [item.id ?? item.unique_row_id]: {
                        ...item,
                      },
                    };
                    return updatedRows;
                  });
                }
              });

              node.data.isEdited = true;
              node.data.isManuallyEdited = true; // 🎯 NEW: Mark as manually edited

              const currentOrderQuantity =
                getOrderQuantityValue(node.data.order_quantity) || 0;
              node.data.isMOQBreached = isSalesOrganisationView
                ? false
                : (node.data.min_order_quantity !== null &&
                  currentOrderQuantity < node.data.min_order_quantity);
            } else {
              // Parent Node: Distribute value among children using NEW ROQ-based logic
              const parentRawRoqConstrained =
                parseFloat(node.data.roq_constrained) || 0;
              // If both roq_constrained and roq_unconstrained are 0, use 1 as fallback
              let parentRoqConstrained = node.data.roq_constrained || 0;
              if (
                parentRoqConstrained === 0 &&
                (node.data.roq_unconstrained || 0) === 0
              ) {
                parentRoqConstrained = 1;  // Fallback to 1 (NOT status_obj.length!)
              }
              const childCount = node.data.status_obj?.length;

              if (childCount > 0) {
                const unlockedChildren = [];
                const lockedChildren = [];
                let totalLockedValue = 0;

                // First pass: categorize children by lock state
                node.data.status_obj?.forEach((item, index) => {
                  const isLocked =
                    typeof item.order_quantity === "object" &&
                    item.order_quantity?.isLocked;
                  if (isLocked) {
                    lockedChildren.push({ item, index });
                    const lockedValue = getOrderQuantityValue(item.order_quantity) || 0;
                    totalLockedValue += lockedValue;
                  } else {
                    unlockedChildren.push({ item, index });
                  }
                });

                const totalQuantity =
                  getOrderQuantityValue(data.order_quantity) || 0;

                // 🚨 VALIDATION: If only one child and it's locked, parent cannot be changed
                if (childCount === 1 && lockedChildren.length === 1) {
                  displaySnackMessages(
                    "Please unlock the child to update the parent row",
                    "error",
                    { disableOnClose: true }
                  );
                  return; // Exit without applying changes
                }

                // 🚨 VALIDATION: Check if parent quantity is less than locked child values
                if (totalQuantity < totalLockedValue) {
                  displaySnackMessages(
                    `Order quantity should be greater than or equal to the locked order quantity`,
                    "error",
                    { disableOnClose: true }
                  );

                  // 💾 Store blocked parent edit for re-attempt on unlock
                  const parentKey = node.data[uniqueRowId];
                  setBlockedParentEdits((prev) => ({
                    ...prev,
                    [parentKey]: {
                      totalQuantity,
                      data: { ...data },
                      column: { ...column },
                      timestamp: Date.now(),
                    },
                  }));
                  return; // Exit without applying changes
                }

                // 🧹 Clear any blocked parent edit since validation passed
                const parentKey = node.data[uniqueRowId];
                setBlockedParentEdits((prev) => {
                  const updated = { ...prev };
                  delete updated[parentKey];
                  return updated;
                });

                const remainingQuantity = totalQuantity - totalLockedValue;
                const topOrderDetailsRoqConstrainedIsZero = !(
                  parseFloat(props.selectedSubClass?.roq_constrained) || 0
                );

                // 📊 NEW LOGIC: ROQ-based proportional distribution with Math.ceil()
                if (unlockedChildren.length > 0 && remainingQuantity >= 0) {
                  const applyChildEditState = (item) => {
                    const itemValue = getOrderQuantityValue(item.order_quantity);
                    item.isMOQBreached = isSalesOrganisationView
                      ? false
                      : (item.store_min !== null &&
                        itemValue < item.store_min);
                    setEditedCells((prev) => ({
                      ...prev,
                      [item.id ?? item.unique_row_id]: { ...item },
                    }));
                  };

                  if (
                    topOrderDetailsRoqConstrainedIsZero ||
                    parentRawRoqConstrained === 0
                  ) {
                    const equalQuantity = Math.ceil(
                      remainingQuantity / unlockedChildren.length
                    );
                    unlockedChildren.forEach(({ item, index }) => {
                      item.order_quantity = setOrderQuantityValue(
                        item.order_quantity,
                        equalQuantity
                      );
                      item.isEdited = true;
                      item.isManuallyEdited = true;
                      applyChildEditState(item);
                    });
                  } else {
                    // 🎯 Proportional: denominator = parent ROQ whenever it is > 0 (not only > 1).
                    const childDistributionDenominator = parentRoqConstrained > 0
                      ? parentRoqConstrained
                      : childCount;

                    if (childDistributionDenominator > 0) {
                      unlockedChildren.forEach(({ item, index }) => {
                        const childRoqConstrained =
                          parseFloat(item.roq_constrained) || 0;
                        const distributedQuantity = Math.ceil(
                          (remainingQuantity * childRoqConstrained) /
                            childDistributionDenominator
                        );

                        item.order_quantity = setOrderQuantityValue(
                          item.order_quantity,
                          distributedQuantity
                        );

                        item.isEdited = true;
                        item.isManuallyEdited = true;
                        applyChildEditState(item);
                      });
                    } else {
                      const equalQuantity = Math.ceil(
                        remainingQuantity / unlockedChildren.length
                      );

                      unlockedChildren.forEach(({ item, index }) => {
                        item.order_quantity = setOrderQuantityValue(
                          item.order_quantity,
                          equalQuantity
                        );

                        item.isEdited = true;
                        item.isManuallyEdited = true;
                        applyChildEditState(item);
                      });
                    }
                  }
                }

                // 🔒 Mark locked children as edited for tracking purposes
                lockedChildren.forEach(({ item, index }) => {
                  item.isEdited = true; // Mark as edited for tracking purposes
                  item.isManuallyEdited = true; // 🎯 Mark as manually edited

                  setEditedCells((prev) => {
                    const updatedRows = {
                      ...prev,
                      [item.id ?? item.unique_row_id]: { ...item },
                    };
                    return updatedRows;
                  });
                });

                // 🎯 Parent = sum of children (always)
                const calculatedParentTotal =
                  node.data.status_obj?.reduce(
                    (acc, item) =>
                      acc + (getOrderQuantityValue(item.order_quantity) || 0),
                    0
                  ) || 0;

                node.data.order_quantity = setOrderQuantityValue(
                  node.data.order_quantity,
                  calculatedParentTotal
                );
              }

              // Mark parent node as edited
              node.data.isEdited = true;
              node.data.isManuallyEdited = true; // 🎯 NEW: Mark as manually edited

              // Check MOQ breach for the parent using user input
              const parentOrderQuantity =
                getOrderQuantityValue(node.data.order_quantity) || 0;
              node.data.isMOQBreached = isSalesOrganisationView
                ? false
                : (node.data.min_order_quantity !== null &&
                  parentOrderQuantity < node.data.min_order_quantity);
            }

            styleOrderSubClassTableGridInstance.current.api.refreshCells({
              force: true,
              suppressFlash: false,
              columns: ["order_quantity"],
            });

            // 🎯 CRITICAL FIX: Calculate difference using actual numeric values after recalculation
            const currentQuantity = getOrderQuantityValue(node.data.order_quantity) || 0;
            const previousQuantity = getOrderQuantityValue(node.data.order_quantity_previous) || 0;
            const differenceInTotalOrderQty = currentQuantity - previousQuantity;
            node.data.order_quantity_previous = node.data.order_quantity;

            // Notify parent component of quantity change for bi-directional sync
            notifyParentOfQuantityChange(differenceInTotalOrderQty);
          }
        });
      }
    }
    if (
      column.colId === "ship_mode" ||
      column.colId === "order_reason" ||
      column.colId === "mode_shipment"
    ) {
      styleOrderSubClassTableGridInstance.current.api.forEachNode((node) => {
        if (
          data[column.colId] &&
          node.data[uniqueRowId] === data[uniqueRowId]
        ) {
          if (isToggleChecked) {
            const shipment = node.data.shipment_modes?.find(
              (mode) => mode.shipment_mode === data.ship_mode
            );

            const orderPlacementDate =
              shipment &&
              getOrderPlacementDateOnTransportChange(node, shipment);

            if (column.colId === "order_reason")
              node.data.isOrderReasonEdited = true;
            if (column.colId === "ship_mode") {
              node.data.isShipModeEdited = true;
              if (shipment) {
                node.data.lead_time = shipment.lead_time;
                node.data.editable_expected_receipt_date = orderPlacementDate;
                node.data.isDateEdited = true;
              }
            }

            node.data.status_obj?.forEach((item) => {
              if (column.colId === "order_reason")
                item.isOrderReasonEdited = true;
              if (column.colId === "ship_mode") {
                item.isShipModeEdited = true;
                if (shipment) {
                  item.lead_time = shipment.lead_time;
                  item.editable_expected_receipt_date = orderPlacementDate;
                  item.isDateEdited = true;
                }
              }
              item[column.colId] = data[column.colId];
              setEditedCells((prev) => {
                const updatedRows = {
                  ...prev,
                  [item.id ?? item.unique_row_id]: { ...item },
                }; // Store entire row

                return updatedRows;
              });
            });
          } else {
            node.data.status_obj?.forEach((item) => {
              if (item[updateCellBy] === data[updateCellBy]) {
                if (column.colId === "order_reason") {
                  item.isOrderReasonEdited = true;
                }
                if (column.colId === "ship_mode") {
                  const shipment = item.shipment_modes?.find(
                    (mode) => mode.shipment_mode === data.ship_mode
                  );

                  const orderPlacementDate =
                    shipment &&
                    getOrderPlacementDateOnTransportChange(node, shipment);

                  item.isShipModeEdited = true;
                  if (shipment) {
                    item.lead_time = shipment.lead_time;
                    item.editable_expected_receipt_date = orderPlacementDate;
                    item.isDateEdited = true;
                  }
                }
                item[column.colId] = data[column.colId];
                setEditedCells((prev) => {
                  const updatedRows = {
                    ...prev,
                    [item.id ?? item.unique_row_id]: { ...item },
                  }; // Store entire row

                  return updatedRows;
                });
              }
            });
          }
          styleOrderSubClassTableGridInstance.current.api.refreshCells({
            force: true,
            suppressFlash: false,
            columns: [
              column.colId,
              "editable_expected_receipt_date",
              "lead_time",
            ],
          });
        }
      });
    }
  };

  /**
   * Handles the cell value change event for the table.
   *
   * @param {Object} params - The parameters object.
   * @param {Object} params.colDef - The column definition object.
   * @param {Object} params.node - The node object representing the row.
   * @param {Object} params.api - The grid API.
   *
   * The function checks if the changed cell is the "editable_expected_receipt_date" column.
   * If so, it validates the new date value against the order placement date.
   * If the new date is valid, it updates the `editable_expected_receipt_date` and `isDateEdited` fields
   * for the current node and related nodes based on the `toggleLevel`.
   * Finally, it refreshes the cells in the grid to reflect the changes.
   */
  const onCellValueChanged = (params) => {
    const { colDef, node } = params;

    // ⚠️ CRITICAL FIX: Use the SAME row ID logic as the table display (same fix as onBlur)
    const uniqueRowId = getUniqueRowId(); // This properly considers metricTypeChecked!

    if (colDef.column_name === "editable_expected_receipt_date") {
      let isValueError = false;
      let columnValue = node?.data?.["editable_expected_receipt_date"];

      let selectedDate = moment(columnValue, DATE_FORMAT, true);
      if (!selectedDate.isValid()) {
        selectedDate = moment(
          node?.data?.[ORDER_PLACEMENT_DATE_COLUMN],
          TENANT_DATE_FORMAT,
          true
        );
      }

      let orderPlacementDate = moment(
        node?.data?.[ORDER_PLACEMENT_DATE_COLUMN],
        TENANT_DATE_FORMAT,
        true
      );
      if (!orderPlacementDate.isValid()) {
        orderPlacementDate = moment(
          node?.data?.[ORDER_PLACEMENT_DATE_COLUMN],
          DATE_FORMAT,
          true
        );
      }

      if (selectedDate !== INVALID_DATE || selectedDate.isValid()) {
        node.data.isDateEdited = true;
        node.data.isManuallyEdited = true; // 🎯 NEW: Mark as manually edited
        if (selectedDate.isAfter(orderPlacementDate, "day")) {
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

      if (!isValueError) {
        const leadTIme = node.data.lead_time || 1;

        const calculatedDate = selectedDate.format(DATE_FORMAT);

        if (isToggleChecked) {
          node.data.editable_expected_receipt_date = moment(
            calculatedDate,
            DATE_FORMAT
          );
          node.data.status_obj?.forEach((item) => {
            item.isDateEdited = true;
            item.isManuallyEdited = true; // 🎯 NEW: Mark as manually edited
            item.editable_expected_receipt_date = moment(
              calculatedDate,
              DATE_FORMAT
            );
            setEditedCells((prev) => {
              const updatedRows = {
                ...prev,
                [item.id ?? item.unique_row_id]: { ...item },
              }; // Store entire row
              return updatedRows;
            });
          });
        } else {
          node.data.editable_expected_receipt_date = moment(
            calculatedDate,
            DATE_FORMAT
          );
          setEditedCells((prev) => {
            const updatedRows = {
              ...prev,
              [node.data.id]: { ...node.data },
            }; // Store entire row
            return updatedRows;
          });
        }
      }

      params.api.forEachNode((currentNode) => {
        if (currentNode.data[uniqueRowId] === node.data[uniqueRowId]) {
          params.api.refreshCells({
            force: true,
            suppressFlash: false,
            rowNodes: [currentNode],
            columns: ["editable_expected_receipt_date"],
          });
        }
      });
    }
  };

  const validateOrderQuantity = (orderQuantity) => {
    return !isNaN(orderQuantity) && orderQuantity > 0 ? orderQuantity : 0;
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

  const lockCellApi = (cellProps, isLocked) => {
    const uniqueIdField = getUniqueRowId();
    const clickedNodeLevel = cellProps?.cellData?.node?.level;
    let searchValue, searchStrategy;
    if (clickedNodeLevel === 0) {
      // Parent row clicked - search by uniqueIdField
      searchValue = cellProps?.cellData?.data?.[uniqueIdField];
      searchStrategy = "parent";
    } else {
      // Child row: match on id or unique_row_id (sales org sends unique_row_id per line).
      searchValue =
        cellProps?.cellData?.data?.id ?? cellProps?.cellData?.data?.unique_row_id;
      searchStrategy = "child";
    }

    // 🚨 VALIDATION: If trying to unlock a child, check if parent is locked
    if (searchStrategy === "child" && !isLocked) {
      // Find the parent node for this child
      let parentNode = null;
      styleOrderSubClassTableGridInstance?.current?.api?.forEachNode((node) => {
        if (node.level === 0 && node.data?.status_obj) {
          const childMatch = node.data.status_obj.find(
            (child) =>
              child.id === searchValue || child.unique_row_id === searchValue
          );
          if (childMatch) {
            parentNode = node;
          }
        }
      });

      // Check if parent is locked
      if (
        parentNode &&
        typeof parentNode.data.order_quantity === "object" &&
        parentNode.data.order_quantity?.isLocked === true
      ) {
        displaySnackMessages(
          "The parent row is locked. Please unlock the parent to proceed.",
          "error",
          { disableOnClose: true }
        );
        return; // Exit without unlocking the child
      }
    }

    let lockedCellNode = null;

    styleOrderSubClassTableGridInstance?.current?.api?.forEachNode((node) => {
      let nodeMatches = false;

      if (searchStrategy === "parent") {
        nodeMatches =
          node.level === 0 && node.data?.[uniqueIdField] === searchValue;
      } else {
        nodeMatches =
          node.level > 0 &&
          (node.data?.id === searchValue ||
            node.data?.unique_row_id === searchValue);
      }

      if (nodeMatches) {
        lockedCellNode = node;
      }
    });

    if (!lockedCellNode) {
      return; // Node not found
    }

    const columnId =
      cellProps.column.id?.split(".")?.[0] || cellProps.column.id;

    if (
      lockedCellNode.data[columnId] === null ||
      lockedCellNode.data[columnId] === undefined
    ) {
      lockedCellNode.data[columnId] = {};
    }

    // Set lock state for the main cell while preserving original value

    let originalValue;
    if (
      typeof lockedCellNode.data[columnId] === "object" &&
      lockedCellNode.data[columnId] !== null
    ) {
      // Already in {value, isLocked} format
      originalValue =
        "value" in lockedCellNode.data[columnId]
          ? lockedCellNode.data[columnId].value
          : lockedCellNode.data[columnId];
    } else {
      // Simple value format
      originalValue = lockedCellNode.data[columnId];
    }

    lockedCellNode.data[columnId] = {
      value: originalValue,
      isLocked: isLocked,
    };

    if (
      lockedCellNode.level === 0 &&
      lockedCellNode.data.status_obj &&
      Array.isArray(lockedCellNode.data.status_obj)
    ) {
      lockedCellNode.data.status_obj.forEach((childData, index) => {
        let childOriginalValue;
        if (
          typeof childData[columnId] === "object" &&
          childData[columnId] !== null &&
          "value" in childData[columnId]
        ) {
          childOriginalValue = childData[columnId].value;
        } else {
          childOriginalValue = childData[columnId];
        }

        childData[columnId] = {
          value: childOriginalValue,
          isLocked: isLocked,
        };
      });
    } else if (lockedCellNode.level > 0 && isLocked) {
      // 🔒 AUTO-PARENT-LOCK: If this is the only child and it's being locked, auto-lock parent
      const parentId = cellProps?.cellData?.data?.[uniqueIdField];

      // Find the parent node
      styleOrderSubClassTableGridInstance?.current?.api?.forEachNode(
        (parentNode) => {
          if (
            parentNode.level === 0 &&
            parentNode.data?.[uniqueIdField] === parentId &&
            parentNode.data.status_obj &&
            Array.isArray(parentNode.data.status_obj) &&
            parentNode.data.status_obj.length === 1
          ) {
            // Auto-lock the parent
            let parentOriginalValue;
            if (
              typeof parentNode.data[columnId] === "object" &&
              parentNode.data[columnId] !== null &&
              "value" in parentNode.data[columnId]
            ) {
              parentOriginalValue = parentNode.data[columnId].value;
            } else {
              parentOriginalValue = parentNode.data[columnId];
            }

            parentNode.data[columnId] = {
              value: parentOriginalValue,
              isLocked: true, // Auto-lock parent
            };

            // Mark parent as edited for tracking
            setEditedCells((prev) => {
              const updatedRows = {
                ...prev,
                [parentNode.data.id || parentNode.data[uniqueIdField]]: {
                  ...parentNode.data,
                  isLockStateChanged: true,
                  lockChangeTimestamp: Date.now(),
                },
              };
              return updatedRows;
            });
          }
        }
      );
    } else if (lockedCellNode.level > 0 && !isLocked) {
      // 🔓 AUTO-PARENT-UNLOCK: If this is the only child and it's being unlocked, auto-unlock parent
      const parentId = cellProps?.cellData?.data?.[uniqueIdField];

      // Find the parent node
      styleOrderSubClassTableGridInstance?.current?.api?.forEachNode(
        (parentNode) => {
          if (
            parentNode.level === 0 &&
            parentNode.data?.[uniqueIdField] === parentId &&
            parentNode.data.status_obj &&
            Array.isArray(parentNode.data.status_obj) &&
            parentNode.data.status_obj.length === 1
          ) {
            // Auto-unlock the parent
            let parentOriginalValue;
            if (
              typeof parentNode.data[columnId] === "object" &&
              parentNode.data[columnId] !== null &&
              "value" in parentNode.data[columnId]
            ) {
              parentOriginalValue = parentNode.data[columnId].value;
            } else {
              parentOriginalValue = parentNode.data[columnId];
            }

            parentNode.data[columnId] = {
              value: parentOriginalValue,
              isLocked: false, // Auto-unlock parent
            };

            // Mark parent as edited for tracking
            setEditedCells((prev) => {
              const updatedRows = {
                ...prev,
                [parentNode.data.id || parentNode.data[uniqueIdField]]: {
                  ...parentNode.data,
                  isLockStateChanged: true,
                  lockChangeTimestamp: Date.now(),
                },
              };
              return updatedRows;
            });
          }
        }
      );
    }

    styleOrderSubClassTableGridInstance.current.api.refreshCells({
      force: true,
      suppressFlash: false,
      columns: [columnId],
    });

    const uniqueRowId = getUniqueRowId();
    const clickedNodeData = cellProps?.cellData?.data;

    if (clickedNodeData) {
      setEditedCells((prev) => {
        const updatedRows = {
          ...prev,
          [clickedNodeData.id]: {
            ...clickedNodeData,
            isLockStateChanged: true,
            lockChangeTimestamp: Date.now(),
          },
        };
        return updatedRows;
      });
    }

    // 🎯 NEW: Handle parent row locking - update all children in orderInfoEditedCells
    if (
      lockedCellNode.level === 0 &&
      lockedCellNode.data.status_obj &&
      Array.isArray(lockedCellNode.data.status_obj)
    ) {
      setEditedCells((prev) => {
        const updatedRows = { ...prev };

        // Update parent node
        const parentKey =
          lockedCellNode.data.id || lockedCellNode.data[getUniqueRowId()];
        if (parentKey) {
          updatedRows[parentKey] = {
            ...lockedCellNode.data,
            isLockStateChanged: true,
            lockChangeTimestamp: Date.now(),
          };
        }

        // Update all children
        lockedCellNode.data.status_obj.forEach((childData) => {
          updatedRows[childData.id ?? childData.unique_row_id] = {
            ...childData,
            isLockStateChanged: true,
            lockChangeTimestamp: Date.now(),
          };
        });

        return updatedRows;
      });
    }

    if (!isLocked && props.onCellUnlocked) {
      // 🔄 Re-attempt any blocked parent edits when cell is unlocked
      reAttemptBlockedParentEdits();

      setTimeout(() => {
        props.onCellUnlocked();
      }, 100);
    }
  };

  // 🔄 Function to re-attempt blocked parent edits after unlock
  const reAttemptBlockedParentEdits = () => {
    if (Object.keys(blockedParentEdits).length === 0) return;

    Object.entries(blockedParentEdits).forEach(([parentKey, blockedEdit]) => {
      // Re-run the onBlur logic for the blocked parent edit
      setTimeout(() => {
        onBlur(null, blockedEdit.data, blockedEdit.column, true);
      }, 50);
    });
  };

  const lockCellCustomConditionFn = (instance) => {
    const columnId =
      instance?.colDef?.id?.split(".")?.[0] || instance?.colDef?.id;
    const isCurrentlyLocked = instance?.data?.[columnId]?.isLocked || false;

    return isCurrentlyLocked;
  };

  //Fetches the Table Column Config
  const fetchColumnConfig = async () => {
    try {
      props.setOrderInfoTableConfigLoader(true);
      let apiParameter = getOrderByValue();

      let columns = await props.getOmsOrderSummaryColumnConfig(apiParameter);
      let columnsData = columns?.data?.data;

      let formattedColumns = agGridColumnFormatter(
        columnsData,
        null,
        null,
        null,
        null,
        null,
        null,
        true
      );

      let updatedColumns = checkForEditability(formattedColumns);
      setStyleOrderSummarySubClassTableColumns(updatedColumns);
      scrollIntoView(orderInfoRef);
    } catch (err) {
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setOrderInfoTableConfigLoader(false);
    } finally {
      props.setOrderInfoTableConfigLoader(false);
      setRender(true);
    }
  };

  useEffect(() => {
    if (props.selectedSubClass !== null && selectedToggleOption !== null) {
      setRender(false);
      setResetFilters(false);
      fetchColumnConfig();
    }
  }, [props.selectedSubClass]);

  useEffect(() => {
    if (render) setResetFilters(true);
  }, [render]);

  useEffect(() => {
    if (
      props.selectedSubClass !== null &&
      selectedToggleOption !== null &&
      isTableRefreshRequired !== false
    ) {
      setRender(false);
      fetchColumnConfig();
    }
  }, [metricTypeChecked, selectedToggleOption, isTableRefreshRequired]);

  useEffect(() => {
    // Component reacts to article changes
  }, [props.selectedSubClass?.article]);

  // Set up table instance reference for wrapper
  useEffect(() => {
    if (
      props.orderInfoTableGridInstance &&
      styleOrderSubClassTableGridInstance.current
    ) {
      props.orderInfoTableGridInstance.current =
        styleOrderSubClassTableGridInstance.current;
    }
  }, [props.orderInfoTableGridInstance]);

  /**
   * Calculates the total order quantity from all rows and notifies parent component
   */
  const notifyParentOfQuantityChange = (differenceInTotalOrderQty) => {
    if (
      !props.onOrderInfoQuantityChange ||
      !styleOrderSubClassTableGridInstance?.current?.api
    ) {
      return;
    }

    let totalQuantity = 0;
    let debugInfo = [];

    styleOrderSubClassTableGridInstance.current.api.forEachNode((node) => {
      if (node.data.status_obj && Array.isArray(node.data.status_obj)) {
        let nodeTotal = 0;
        let nodeChildren = [];
        node.data.status_obj.forEach((item, childIndex) => {
          const childQuantity =
            parseFloat(getOrderQuantityValue(item.order_quantity)) || 0;
          const isLocked =
            typeof item.order_quantity === "object" &&
            item.order_quantity?.isLocked === true;

          totalQuantity += childQuantity;
          nodeTotal += childQuantity;

          nodeChildren.push({
            id: item.id,
            quantity: childQuantity,
            isLocked: isLocked,
            rawQuantity: item.order_quantity,
          });
        });

        debugInfo.push({
          storeCode: node.data.store_code || node.data.id,
          parentQuantity: getOrderQuantityValue(node.data.order_quantity),
          calculatedTotal: nodeTotal,
          children: nodeChildren,
        });
      }
    });

    // Notify parent component with the updated total
    props.onOrderInfoQuantityChange(
      props.selectedSubClass,
      differenceInTotalOrderQty
    );
  };

  /**
   * Expose function to get locked children data for the current selected subclass
   * This is used by the wrapper to collect locked children data during Set All operations
   */
  const getLockedChildrenData = () => {
    if (
      !props.selectedSubClass ||
      !styleOrderSubClassTableGridInstance?.current?.api
    ) {
      return null;
    }

    const lockedChildren = [];
    const uniqueRowId = getUniqueRowId();

    styleOrderSubClassTableGridInstance.current.api.forEachNode((node) => {
      // Only process parent nodes (level 0)
      if (
        node.level === 0 &&
        node.data.status_obj &&
        Array.isArray(node.data.status_obj)
      ) {
        node.data.status_obj.forEach((child) => {
          // Check if child has locked order_quantity
          const isLocked =
            typeof child.order_quantity === "object" &&
            child.order_quantity?.isLocked === true;

          if (isLocked) {
            lockedChildren.push({
              id: child.id ?? child.unique_row_id,
              order_quantity: getOrderQuantityValue(child.order_quantity),
              [uniqueRowId]: child[uniqueRowId],
            });
          }
        });
      }
    });

    return {
      order_group_id: props.selectedSubClass.order_group_id,
      locked_children: lockedChildren.length > 0 ? lockedChildren : null,
    };
  };

  // NOTE: Removed dynamic field name logic for simplicity - using "unique_key" for now

  const getTopRightOptions = () => {
    let options = [];

    if (isToggleChecked) {
      options.push(
        <FormControl key="switch-control" style={{ margin: "0 0.5rem" }}>
          <Switch
            checked={metricTypeChecked}
            onChange={(e) => onSwitchChange(e)}
            color="primary"
            rightLabel={RIGHT_SWITCH?.label}
            leftLabel={LEFT_SWITCH?.label}
            id="toggleViewSwitch"
          />
        </FormControl>
      );
    }

    // Note: Save button is now handled by the wrapper
    return options;
  };

  const getTopLeftOptions = () => {
    let options = [];
    options.push(
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        {createTableHeader(
          SELECTED_PARENT_LABEL,
          props.selectedSubClass[`${SELECTED_PARENT_LABEL_ID}`]
        )}
        {createTableHeader(
          `${SELECTED_PARENT_DESCRIPTION}`,
          props.selectedSubClass[SELECTED_PARENT_DESCRIPTION_ID]
        )}
      </div>
    );

    return options;
  };

  return (
    <div className={globalClasses.marginVertical1rem}>
      <div className={globalClasses.marginVertical1rem}>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: "1rem",
          }}
        >
          <ButtonGroup
            id="toggleSwitch"
            onChange={handleToggleOptionChange}
            selectedOption={selectedToggleOption}
            exclusive
            aria-label="text alignment"
            options={TOGGLE_OPTIONS}
          />
        </div>

        {resetFilters && (
          <OrderDetailsFilterPanel
            globalFiltersInParentLevel={props.globalFiltersInParentLevel}
            parentRowID={getSelectedParentRowID()}
            setIsTableRefreshRequired={setIsTableRefreshRequired}
          />
        )}

        <Loader
          loader={
            props.orderInfoTableConfigLoader || props.orderInfoTableDataLoader
          }
          minHeight={"260px"}
        >
          {render && (
            <AgGridComponent
              columns={styleOrderSummarySubClassTableColumns}
              manualCallBack={(body, pageIndex, params) =>
                manualCallBack(body, pageIndex, params)
              }
              onCellValueChanged={onCellValueChanged}
              onBlur={onBlur}
              loadTableInstance={loadTableInstance}
              rowModelType="serverSide"
              serverSideStoreType="partial"
              onRowSelected
              totalCount={10}
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
              topRightOptions={getTopRightOptions()}
              tableHeader={getTopLeftOptions()}
              closeButton={true}
              handleCloseButtonClick={handleCloseButtonClick}
              lockCellApi={lockCellApi}
              lockCellCustomConditionFn={lockCellCustomConditionFn}
            />
          )}
        </Loader>
      </div>

      <div ref={orderInfoRef} className={globalClasses.paddingAround}></div>

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
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    vendorToStoreScreenConfig:
      store?.omsReducer.orderingCommonService?.orderingVendorToStoreConfig
        ?.oms_dashboard?.style_order_summary,
    orderInfoTableDataLoader:
      store.omsReducer.orderManagementVendorToStoreService
        .orderInfoTableDataLoader,
    orderInfoTableConfigLoader:
      store.omsReducer.orderManagementVendorToStoreService
        .orderInfoTableConfigLoader,
    orderDetailsFiltersPayload:
      store.omsReducer.orderManagementVendorToStoreService
        .orderDetailsFiltersPayload,
  };
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
  closeSnack: (payload) => dispatch(closeSnack(payload)),
  setOrderInfoTableDataLoader: (payload) =>
    dispatch(setOrderInfoTableDataLoader(payload)),
  setOrderInfoTableConfigLoader: (payload) =>
    dispatch(setOrderInfoTableConfigLoader(payload)),
  getOmsOrderSummaryColumnConfig: (payload) =>
    dispatch(getOmsOrderSummaryColumnConfig(payload)),
  getOmsOrderSummaryTableData: (payload) =>
    dispatch(getOmsOrderSummaryTableData(payload)),
  saveOrderDetailsTable: (payload) => dispatch(saveOrderDetailsTable(payload)),
  resetOrderDetailsFilters: (payload) =>
    dispatch(resetOrderDetailsFilters(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(OrderInfoTable);
