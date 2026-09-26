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
} from "modules/oms/constants-oms/stringConstants";
import { Button, ButtonGroup } from "impact-ui-v3";
import { cloneDeep, isEmpty } from "lodash";
import moment from "moment";
import {
  setStyleOrderSummarySubClassDataLoader,
  setStyleOrderSummarySubClassTableConfigLoader,
  getOmsStyleOrderSummarySubClassColumnConfig,
  getOmsStyleOrderSummarySubClassTableData,
} from "modules/oms/services-oms/Order-Management/order-management-service";
import {
  OMS_STYLE_ORDER_SUMMARY_TOGGLE_OPTIONS,
  OMS_STYLE_CHANNEL_PACK_TOGGLE_OPTIONS,
} from "modules/oms/constants-oms/stringConstants";
import {
  createTableHeader,
  validatePackId,
  getFormattedDataForDownload,
} from "modules/oms/pages-oms/Order-Management/components/Product-Details-Screen/Style-Order-Summary/utils";
import { getTenantTimeZoneDetails } from "core/commonComponents/coreComponentScreen/utils";
import PackConfigBottomSheet from "modules/oms/pages-oms/common/PackConfigBottomSheet";
import { downloadExcelLink } from "core/Utils/csv-download/index";
import { getHeaderForExcel } from "core/Utils/functions/utils";
import { replaceSpacesWithUnderscores } from "modules/oms/utils-oms/oms-utility";
import { fetchStyleOrderDetailedSummaryV3 } from "../api/styleOrderDetailedSummary.api.js";
import { unifiedEditDirectRow } from "../api/unifiedEdit.api.js";
import {
  buildStyleOrderDetailedSummaryV3Payload,
  resolveProductDetailsFiscalView,
} from "../utils/styleOrderSummaryPayload.util.js";
import { selectMatrixHandoff } from "../../slices/matrixHandoff.slice.js";

/**
 * Component for rendering the subclass level table in the style order summary.
 *
 * This component fetches and displays data in a table format, allowing users to view and edit order quantities
 * for different subclasses. It includes functionality for handling column configurations, data fetching,
 * and user interactions such as selection and input blur events.
 *
 * @component
 * @param {Object} props - The properties passed to the component.
 * @param {Function} props.setStyleOrderSummarySubClassDataLoader - Function to set the data loader state.
 * @param {Function} props.getOmsStyleOrderSummarySubClassTableData - Function to fetch table data.
 * @param {Function} props.closeSnack - Function to close snack messages.
 * @param {Function} props.addSnack - Function to add snack messages.
 * @param {Function} props.setStyleOrderSummarySubClassTableConfigLoader - Function to set the table config loader state.
 * @param {Function} props.getOmsStyleOrderSummarySubClassColumnConfig - Function to fetch column configuration.
 * @param {Object} props.selectedSubClass - The selected subclass data.
 * @param {boolean} props.styleOrderSummarySubClassDataLoader - Loader state for table data.
 * @param {boolean} props.styleOrderSummarySubClassTableConfigLoader - Loader state for table configuration.
 * @param {Function} props.setSelectedSubClass - Function to set the selected subclass.
 * @returns {JSX.Element} The rendered component.
 */
const subClassLevelTable = (props) => {
  const globalClasses = globalStyles();
  const classes = useStyles();
  const [
    styleOrderSummarySubClassTableColumns,
    setStyleOrderSummarySubClassTableColumns,
  ] = useState([]);

  const [render, setRender] = useState(false);

  const styleOrderSubClassTableGridInstance = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!props.selectedSubClass) return;
    const id = window.requestAnimationFrame(() => {
      containerRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
    return () => window.cancelAnimationFrame(id);
  }, [props.selectedSubClass]);

  const [editedCells, setEditedCells] = useState({});

  const [openPackConfigDetailSheet, setOpenPackConfigDetailSheet] = useState(
    false
  );
  const [
    packConfigDetailsPayloadData,
    setPackConfigDetailsPayloadData,
  ] = useState(null);

  const [totalCount, setTotalCount] = useState(0);
  const downloadLink = useRef(null);
  const [csvData, setCsvData] = useState([]);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [tableMeta, setTableMeta] = useState({});

  const ORDER_STATUS_COLUMN_MAPPING =
    props?.orderingScreensConfig?.oms_dashboard?.style_order_summary
      ?.order_status_column_mapping;

  const ORDER_STATUS_ID_COLUMN_NAME =
    props?.orderingScreensConfig?.oms_dashboard?.style_order_summary
      ?.order_status_id_column_name || "order_status_id";

  const ORDER_STATUS_COLUMN_NAME =
    props?.orderingScreensConfig?.oms_dashboard?.style_order_summary
      ?.order_status_column_name || "order_status";

  const DEFAULT_TOGGLE_STATUS =
    props?.orderingScreensConfig?.oms_dashboard?.style_order_summary
      ?.default_toggle_value;

  const UNIQUE_KEY =
    props?.orderingScreensConfig?.oms_dashboard?.style_order_summary
      ?.unique_key;

  const DESCRIPTION_KEY =
    props?.orderingScreensConfig?.oms_dashboard?.style_order_summary
      ?.description_key;

  const DESCRIPTION_LABEL =
    props?.orderingScreensConfig?.oms_dashboard?.style_order_summary
      ?.description_label;

  const DESCRIPTION_DISPLAY_TEXT =
    props?.orderingScreensConfig?.oms_dashboard?.style_order_summary
      ?.description_display_text;

  const IS_PACK_CONFIG_ENABLED =
    props?.orderingScreensConfig?.oms_dashboard?.style_order_summary
      ?.is_pack_config_enabled || false;

  const [isToggleChecked, setIsToggleChecked] = useState(DEFAULT_TOGGLE_STATUS);

  const matrixHandoffFromStore = useSelector(selectMatrixHandoff);
  const handoff = props.matrixHandoff || matrixHandoffFromStore;
  const isWeekLevel =
    resolveProductDetailsFiscalView(handoff?.frequency) === "week";

  const TOGGLE_OPTIONS = useMemo(() => {
    const config =
      props?.orderingScreensConfig?.oms_dashboard?.style_order_summary || {};

    const selectedSubClass = props.selectedSubClass;

    // Helper to get left/right toggle values with fallback
    const getDefaultToggles = () => [
      config.toggle_value_left || OMS_STYLE_ORDER_SUMMARY_TOGGLE_OPTIONS[0],
      config.toggle_value_right || OMS_STYLE_ORDER_SUMMARY_TOGGLE_OPTIONS[1],
    ];

    if (
      !selectedSubClass ||
      !Object.prototype.hasOwnProperty.call(selectedSubClass, "pack_id")
    ) {
      return getDefaultToggles();
    }

    const { isPackIdValid } = validatePackId(selectedSubClass);

    if (isPackIdValid) {
      return (
        config.channel_pack_toggle_options ||
        OMS_STYLE_CHANNEL_PACK_TOGGLE_OPTIONS
      );
    }

    return getDefaultToggles();
  }, [props.selectedSubClass?.pack_id, props?.orderingScreensConfig]);

  const [selectedToggleOption, setSelectedToggleOption] = useState(null);

  useEffect(() => {
    const newSelectedOption = DEFAULT_TOGGLE_STATUS
      ? TOGGLE_OPTIONS[1]?.value ||
        OMS_STYLE_ORDER_SUMMARY_TOGGLE_OPTIONS[1].value
      : TOGGLE_OPTIONS[0]?.value ||
        OMS_STYLE_ORDER_SUMMARY_TOGGLE_OPTIONS[0].value;

    setSelectedToggleOption(newSelectedOption);
    setEditedCells({});
  }, [TOGGLE_OPTIONS, DEFAULT_TOGGLE_STATUS]);

  const { tenantDateFormat } = getTenantTimeZoneDetails();
  const DATE_FORMAT = tenantDateFormat || TENANT_DATE_FORMAT;

  const handleToggleOptionChange = (event, option) => {
    setEditedCells({});
    if (option !== null) {
      setIsToggleChecked(!isToggleChecked);
      setSelectedToggleOption(option);
    }
  };

  const cellClassRules = {
    [classes.disabledCell]: (params) => {
      const colDef = params.colDef;
      if (
        colDef.accessor === "size" ||
        colDef.accessor === "l1_name" ||
        props.selectedSubClass.order_status_id === 0 ||
        colDef.cellRenderer === "agGroupCellRenderer"
      )
        return false;
      return true;
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
        if (item.column_name === ORDER_QUANTITY_COLUMN) {
          item.cellClass = `cell-renderer ${item?.cellClass || ""}`;
          item.cellStyle = (params) => {
            let colour = { backgroundColor: "inherit" };
            if (params.node.data.isEdited)
              colour = { backgroundColor: "#0055af36" };
            if (params.node.data.isMOQBreached)
              colour = { backgroundColor: "#AF000033" };
            return colour;
          };
          item.cellRenderer = (params, extraProps) => {
            item.disabled = !isEmpty(props?.userAccess)
              ? !props?.isUserHasEditAccess
              : props?.isUserHasViewOnlyAccess;
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
          // Add valueGetter to ensure AG Grid gets the value correctly
          item.valueGetter = (params) => {
            return params.data?.editable_expected_receipt_date;
          };

          item.cellStyle = (params) => {
            return params.node.data.isDateEdited
              ? { backgroundColor: "#0055af36" }
              : { backgroundColor: "inherit" };
          };
          if (isToggleChecked) {
            item.cellRenderer = (params, extraProps) => {
              if (params.node.level === 0) {
                item.disabled = !isEmpty(props?.userAccess)
                  ? !props?.isUserHasEditAccess
                  : props?.isUserHasViewOnlyAccess;
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
                  DATE_FORMAT
                ).format(DATE_FORMAT);
              }
            };
          } else {
            item.cellRenderer = (params, extraProps) => {
              if (params.node.level === 0) {
                return "";
              } else {
                item.disabled = !isEmpty(props?.userAccess)
                  ? !props?.isUserHasEditAccess
                  : props?.isUserHasViewOnlyAccess;
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
          item.disabled = !isEmpty(props?.userAccess)
            ? !props?.isUserHasEditAccess
            : props?.isUserHasViewOnlyAccess;
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
          item.disabled = !isEmpty(props?.userAccess)
            ? !props?.isUserHasEditAccess
            : props?.isUserHasViewOnlyAccess;
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

  const filterColumnsBasedOnToggle = (columnsDef) => {
    const selectedSubClass = props.selectedSubClass;

    if (!selectedSubClass || !selectedSubClass.hasOwnProperty("pack_id")) {
      return columnsDef;
    }

    const { isPackIdValid } = validatePackId(selectedSubClass);

    if (isPackIdValid) {
      return columnsDef.filter((column) => column.column_name !== "size");
    } else {
      return columnsDef.filter((column) => column.column_name !== "pack_id");
    }
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
      props.setStyleOrderSummarySubClassDataLoader(true);

      const appliedOmsProductFilters = props.globalFiltersInParentLevel?.filter(
        (filter) => filter.display_type !== "fiscalCalendar"
      );

      // Fetching the redirection details from local storage
      const redirectionDetails = JSON.parse(
        localStorage.getItem("omsRedirectionDetails")
      );
      const filtersFromRedirection = redirectionDetails?.isRedirection
        ? redirectionDetails?.selectedFilters
        : [];

      const resolvedProductFilters =
        (appliedOmsProductFilters?.length ?? 0) > 0
          ? appliedOmsProductFilters
          : filtersFromRedirection;

      let orderByValue = "";
      const selectedSubClass = props.selectedSubClass;

      if (!selectedSubClass || !selectedSubClass.hasOwnProperty("pack_id")) {
        orderByValue = !isToggleChecked ? TOGGLE_OPTIONS?.[0]?.value : "";
      } else {
        const { isPackIdValid } = validatePackId(selectedSubClass);

        if (isPackIdValid) {
          orderByValue = isToggleChecked ? "pack" : "";
        } else {
          orderByValue = !isToggleChecked ? TOGGLE_OPTIONS?.[0]?.value : "";
        }
      }

      const body = buildStyleOrderDetailedSummaryV3Payload({
        filters: resolvedProductFilters,
        orderBy: orderByValue,
        orderGroupId: props.selectedSubClass.order_group_id,
        orderStatusId: props.selectedSubClass.order_status_id || 0,
        styles: props.selectedStylesInParentLevel,
        periods: props.fieldsDataInParentLevel || [],
        isWeekLevel,
        pageIndex: Number(pageIndex) ? pageIndex : 0,
        pageSize: 10,
        metaOverrides: manualbody || {},
        isV3Schema:
          typeof props.isV3Schema === "boolean" ? props.isV3Schema : false,
      });

      const response = await fetchStyleOrderDetailedSummaryV3(body);
      if (response.status) {
        const dataResponse = cloneDeep(response.data);

        // If Order Status Column Mapping is present, then map the order status with labels
        if (ORDER_STATUS_COLUMN_MAPPING && ORDER_STATUS_ID_COLUMN_NAME) {
          dataResponse.forEach((row) => {
            const columnValue = row[ORDER_STATUS_ID_COLUMN_NAME]?.toString();
            row[ORDER_STATUS_COLUMN_NAME] =
              ORDER_STATUS_COLUMN_MAPPING[columnValue] || columnValue;
          });
        }

        let formatedData = agGridRowFormatter(
          dataResponse,
          params?.api?.checkConfiguration,
          isToggleChecked
            ? TOGGLE_OPTIONS?.[1]?.value
            : TOGGLE_OPTIONS?.[0]?.value
        );
        const { hasPackId } = validatePackId(selectedSubClass);
        if (!hasPackId || IS_PACK_CONFIG_ENABLED) {
          formatedData = formatedData.map((item) => {
            item.status_obj?.forEach((status) => {
              status.isMOQBreached =
                (status.min_order_quantity !== null &&
                  status.order_quantity < status.min_order_quantity) ||
                (status.max_order_quantity !== null &&
                  status.order_quantity > status.max_order_quantity);
            });
            item.order_quantity = item.status_obj?.reduce(
              (acc, val) => (acc += Number(val.order_quantity || 0)),
              0
            );

            item.isMOQBreached =
              (item.min_order_quantity !== null &&
                item.order_quantity < item.min_order_quantity) ||
              (item.max_order_quantity !== null &&
                item.order_quantity > item.max_order_quantity);

            if (isToggleChecked) {
              const shipment = item.shipment_modes?.find(
                (item) => item.default_mode === 1
              );
              const orderPlacementDate =
                shipment &&
                moment(item.order_placement_date)
                  .add(shipment.lead_time || 1, "days")
                  .format(DATE_FORMAT);
              const editableExpectedReceiptDate = item.editable_expected_receipt_date
                ? moment(item.editable_expected_receipt_date).format(
                    DATE_FORMAT
                  )
                : orderPlacementDate;
              if (shipment) {
                item.ship_mode = item.mode_shipment || shipment.shipment_mode;
                item.lead_time = item.lead_time || shipment.lead_time;
              }
              item.editable_expected_receipt_date = editableExpectedReceiptDate;
              item.status_obj?.forEach((status) => {
                if (shipment) {
                  status.ship_mode =
                    status.ship_mode ||
                    item.mode_shipment ||
                    shipment.shipment_mode;
                  status.lead_time = item.lead_time || shipment.lead_time;
                }

                status.editable_expected_receipt_date = editableExpectedReceiptDate;
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
                if (status.editable_expected_receipt_date) {
                  status.editable_expected_receipt_date = moment(
                    status.editable_expected_receipt_date
                  ).format(DATE_FORMAT);
                } else if (item.editable_expected_receipt_date) {
                  status.editable_expected_receipt_date = moment(
                    item.editable_expected_receipt_date
                  ).format(DATE_FORMAT);
                } else {
                  status.editable_expected_receipt_date = orderPlacementDate;
                }
              });
            }

            return item;
          });
        } else {
          formatedData = formatedData.map((item) => {
            if (isToggleChecked) {
              const editableExpectedReceiptDate = item.editable_expected_receipt_date
                ? moment(item.editable_expected_receipt_date).format(
                    DATE_FORMAT
                  )
                : "";
              item.editable_expected_receipt_date = editableExpectedReceiptDate;
              item.status_obj?.forEach((status) => {
                status.editable_expected_receipt_date = editableExpectedReceiptDate;
              });
            } else {
              item.status_obj?.forEach((status) => {
                if (status.editable_expected_receipt_date) {
                  status.editable_expected_receipt_date = moment(
                    status.editable_expected_receipt_date
                  ).format(DATE_FORMAT);
                } else {
                  status.editable_expected_receipt_date = moment(
                    item.editable_expected_receipt_date
                  ).format(DATE_FORMAT);
                }
              });
            }

            return item;
          });
        }

        props.setStyleOrderSummarySubClassDataLoader(false);
        setTotalCount(response.total);
        setTableMeta(body.meta);
        return { data: formatedData, totalCount: response.total };
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
        return defaultTableData;
      }
    } catch (err) {
      console.log(err);
      displaySnackMessages(ERROR_MESSAGE, "error");
      return defaultTableData;
    } finally {
      props.setStyleOrderSummarySubClassDataLoader(false);
    }
  };

  const loadTableInstance = (params) => {
    styleOrderSubClassTableGridInstance.current = params;
  };

  const displaySnackMessages = (message, variance) => {
    props.closeSnack();
    props.addSnack({
      message: message,
      options: {
        variant: variance,
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
    const uniqueRowId = isToggleChecked
      ? TOGGLE_OPTIONS?.[1]?.value
      : TOGGLE_OPTIONS?.[0]?.value;

    const updateCellBy = isToggleChecked ? TOGGLE_OPTIONS?.[0]?.value : "id";

    if (isChanged) {
      if (column.colId === "order_quantity") {
        styleOrderSubClassTableGridInstance.current.api.forEachNode((node) => {
          if (
            node.data[uniqueRowId] === data[uniqueRowId] &&
            !node.data[updateCellBy]
          ) {
            if (data[updateCellBy]) {
              // Child Node: Aggregate child values to parent
              const aggregatedValue = node.data.status_obj?.reduce(
                (acc, item) => acc + (item.order_quantity || 0),
                0
              );

              node.data.order_quantity = aggregatedValue;

              node.data.status_obj?.forEach((item) => {
                if (item[updateCellBy] === data[updateCellBy]) {
                  item.isEdited = true;
                  item.isMOQBreached =
                    (item.min_order_quantity !== null &&
                      item.order_quantity < item.min_order_quantity) ||
                    (item.max_order_quantity !== null &&
                      item.order_quantity > item.max_order_quantity);

                  setEditedCells((prev) => {
                    const updatedRows = {
                      ...prev,
                      [item.id]: {
                        ...item,
                      },
                    };
                    return updatedRows;
                  });
                }
              });

              node.data.isEdited = true;

              node.data.isMOQBreached =
                (node.data.min_order_quantity !== null &&
                  node.data.order_quantity < node.data.min_order_quantity) ||
                (node.data.max_order_quantity !== null &&
                  node.data.order_quantity > node.data.max_order_quantity);
            } else {
              // Parent Node: Distribute value among children based on roq_id
              const totalRoqId = Number(node.data.roq_constrained || 0);
              const childCount = node.data.status_obj?.length;

              if (childCount > 0) {
                if (!Number.isFinite(totalRoqId) || totalRoqId === 0) {
                  // Distribute equally with remainder handling
                  const totalQuantity = data.order_quantity || 0;
                  const baseQuantity = Math.floor(totalQuantity / childCount);
                  let remainder = totalQuantity % childCount;

                  node.data.status_obj?.forEach((item, index) => {
                    // Distribute base quantity to all items
                    item.order_quantity = baseQuantity;

                    // Distribute remaining quantity incrementally
                    if (remainder > 0) {
                      item.order_quantity += 1;
                      remainder -= 1;
                    }

                    // Mark as edited
                    item.isEdited = true;

                    // Check MOQ breach
                    item.isMOQBreached =
                      (item.min_order_quantity !== null &&
                        item.order_quantity < item.min_order_quantity) ||
                      (item.max_order_quantity !== null &&
                        item.order_quantity > item.max_order_quantity);

                    // Update edited cells
                    setEditedCells((prev) => {
                      const updatedRows = {
                        ...prev,
                        [item.id]: { ...item },
                      };
                      return updatedRows;
                    });
                  });
                } else {
                  // Distribute based on roq_id ratio
                  node.data.status_obj?.forEach((item) => {
                    const itemRoq = Number(item.roq_constrained);
                    const safeItemRoq = Number.isFinite(itemRoq) ? itemRoq : 0;
                    const ratio =
                      totalRoqId !== 0 ? safeItemRoq / totalRoqId : 0;
                    const isValidPackId = item.pack_id && item.pack_id !== "WP";
                    if (isValidPackId) {
                      item.order_quantity = Math.ceil(
                        (data.order_quantity || 0) * ratio
                      );
                    } else {
                      item.order_quantity = Math.round(
                        (data.order_quantity || 0) * ratio
                      );
                    }

                    // Mark as edited
                    item.isEdited = true;

                    // Check MOQ breach
                    item.isMOQBreached =
                      (item.min_order_quantity !== null &&
                        item.order_quantity < item.min_order_quantity) ||
                      (item.max_order_quantity !== null &&
                        item.order_quantity > item.max_order_quantity);

                    // Update edited cells
                    setEditedCells((prev) => {
                      const updatedRows = {
                        ...prev,
                        [item.id]: { ...item },
                      };
                      return updatedRows;
                    });
                  });
                }
              }

              // Mark parent node as edited
              node.data.isEdited = true;

              // Check MOQ breach for the parent
              node.data.isMOQBreached =
                (node.data.min_order_quantity !== null &&
                  node.data.order_quantity < node.data.min_order_quantity) ||
                (node.data.max_order_quantity !== null &&
                  node.data.order_quantity > node.data.max_order_quantity);
            }

            // Update the order quantity for the parent node to the sum of the child nodes
            node.data.order_quantity = node.data.status_obj?.reduce(
              (acc, item) => acc + (item.order_quantity || 0),
              0
            );

            styleOrderSubClassTableGridInstance.current.api.refreshCells({
              force: true,
              suppressFlash: false,
              columns: ["order_quantity"],
            });
          }
        });
        // Always track the blurred qty row so Save enables even when the
        // parent/child forEach path does not populate editedCells.
        if (data?.id) {
          setEditedCells((prev) => ({
            ...prev,
            [data.id]: { ...data },
          }));
        } else if (Array.isArray(data?.status_obj)) {
          setEditedCells((prev) => {
            const updatedRows = { ...prev };
            data.status_obj.forEach((item) => {
              if (item?.id) {
                updatedRows[item.id] = { ...item };
              }
            });
            return updatedRows;
          });
        }
      }
    }
    if (column.colId === "ship_mode" || column.colId === "order_reason") {
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
                  [item.id]: { ...item },
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
                    [item.id]: { ...item },
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

    const uniqueRowId = isToggleChecked
      ? TOGGLE_OPTIONS?.[1]?.value
      : TOGGLE_OPTIONS?.[0]?.value;

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
        if (selectedDate.isAfter(orderPlacementDate, "day")) {
          isValueError = false;
        } else {
          isValueError = true;
        }
      }

      const leadTIme = node.data.lead_time || 1;

      const calculatedDate = isValueError
        ? orderPlacementDate.clone().add(1, "days").format(DATE_FORMAT)
        : selectedDate.format(DATE_FORMAT);

      console.log("Date Format:", orderPlacementDate.format(DATE_FORMAT));

      if (isToggleChecked) {
        node.data.editable_expected_receipt_date = moment(
          calculatedDate,
          DATE_FORMAT
        );
        node.data.status_obj?.forEach((item) => {
          item.isDateEdited = true;
          item.editable_expected_receipt_date = moment(
            calculatedDate,
            DATE_FORMAT
          );
          setEditedCells((prev) => {
            const updatedRows = {
              ...prev,
              [item.id]: { ...item },
            }; // Store entire row
            return updatedRows;
          });
        });
      } else {
        node.data.editable_expected_receipt_date = calculatedDate;
        setEditedCells((prev) => {
          const updatedRows = {
            ...prev,
            [node.data.id]: { ...node.data },
          }; // Store entire row
          return updatedRows;
        });
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

  /**
   * Handles the save action for the style order summary sub-class table.
   *
   * This function retrieves the selected rows from the table, constructs the request body,
   * and sends an update request to the server. It displays success or error messages based
   * on the response and refreshes the table data.
   *
   * @async
   * @function handleSave
   * @returns {Promise<void>}
   */
  const handleSave = async () => {
    const constructBody = Object.values(editedCells).map((item) => {
      let formattedDate = "";
      if (
        moment(item.editable_expected_receipt_date, DATE_FORMAT, true).isValid()
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

      return {
        id: item.id,
        order_quantity: validateOrderQuantity(item.order_quantity),
        editable_expected_receipt_date: formattedDate,
        ...(item.order_reason && { order_reason: item.order_reason }),
        ...(item.ship_mode && { mode_shipment: item.ship_mode }),
        ...(item.lead_time && { lead_time: item.lead_time }),
        ...(item.ids && { ids: item.ids }),
      };
    });

    let body = {
      orders: constructBody,
    };

    try {
      let response = await unifiedEditDirectRow({
        payload: body,
        isV3Schema:
          typeof props.isV3Schema === "boolean" ? props.isV3Schema : false,
      });
      if (response.data.status) {
        setEditedCells({});
        displaySnackMessages("Data saved successfully", "success");
        // Refresh current table first
        if (styleOrderSubClassTableGridInstance?.current?.api) {
          styleOrderSubClassTableGridInstance.current.api.refreshServerSideStore(
            {
              purge: true,
            }
          );
        }

        // Then refresh parent table using microtask to avoid DOM conflicts
        if (props.refreshStyleOrderSummaryTableData) {
          queueMicrotask(() => {
            props.refreshStyleOrderSummaryTableData();
          });
        }
        props.onDeepDiveRefresh?.();
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    } catch {
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  const handlePackConfigDetails = () => {
    const orderGroupId = props.selectedSubClass?.order_group_id || "";
    const payloadData = {
      order_group_id: orderGroupId,
    };
    setPackConfigDetailsPayloadData(payloadData);
    setOpenPackConfigDetailSheet(true);
  };

  useEffect(() => {
    setRender(false);
    const fetchColumnConfig = async () => {
      try {
        props.setStyleOrderSummarySubClassTableConfigLoader(true);
        let apiParameter = isToggleChecked;

        const selectedSubClass = props.selectedSubClass;

        const isPackConfigEnabled =
          props.orderingPackOrderConfig?.pack_ordering;

        if (isPackConfigEnabled) {
          const { isPackIdValid } = validatePackId(selectedSubClass);
          if (isPackIdValid) {
            apiParameter = !isToggleChecked;
          }
        }

        let columns = await props.getOmsStyleOrderSummarySubClassColumnConfig(
          apiParameter
        );
        let columnsData = columns?.data?.data;
        if (props?.shipmentModes?.length) {
          columnsData = columnsData.map((column) => {
            if (column.column_name === "ship_mode") {
              column.extra = {
                ...column.extra,
                options: props?.shipmentModes,
              };
            }
            return column;
          });
        }
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

        let filteredColumns = filterColumnsBasedOnToggle(updatedColumns);

        // setCsvHeaders(getHeaderForExcel(cloneDeep(filteredColumns)));

        setStyleOrderSummarySubClassTableColumns(filteredColumns);
      } catch (err) {
        displaySnackMessages(ERROR_MESSAGE, "error");
        props.setStyleOrderSummarySubClassTableConfigLoader(false);
      } finally {
        props.setStyleOrderSummarySubClassTableConfigLoader(false);
        setRender(true);
      }
    };
    fetchColumnConfig();
  }, [isToggleChecked, props.selectedSubClass]);

  const getTopRightOptions = () => {
    let options = [];

    const selectedSubClass = props.selectedSubClass;
    const { isPackIdValid } = validatePackId(selectedSubClass);

    if (isPackIdValid) {
      options.push(
        <Button
          variant="outlined"
          color="secondary"
          id="packConfigBtn"
          className={classes.button}
          onClick={handlePackConfigDetails}
        >
          Pack config details
        </Button>
      );
    }
    if (Object.keys(editedCells).length > 0) {
      options.push(
        <Button
          variant="outlined"
          color="primary"
          id="productSaveBtn"
          className={classes.button}
          disabled={Object.keys(editedCells).length > 0 ? false : true}
          onClick={handleSave}
        >
          Save
        </Button>
      );
    }
    return options;
  };
  const tableheader = "style_order_summary_sub_class";
  const downloadFileName = replaceSpacesWithUnderscores(tableheader);
  const hiddenDownloadLink = downloadExcelLink(
    csvData,
    downloadFileName,
    downloadLink,
    csvHeaders,
    "",
    "",
    true
  );

  const getDescriptionDisplayText = () => {
    const descriptionDisplayText =
      DESCRIPTION_DISPLAY_TEXT ?? `${DESCRIPTION_LABEL} Description`;
    return descriptionDisplayText;
  };

  const getTopLeftOptions = () => {
    const options = [];

    options.push(
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        {createTableHeader(
          DESCRIPTION_LABEL,
          props.selectedSubClass?.[UNIQUE_KEY]
        )}

        {/* {createTableHeader(
          getDescriptionDisplayText(),
          props.selectedSubClass?.[DESCRIPTION_KEY]
        )} */}
      </div>
    );

    return options;
  };

  const onDownloadButtonClick = async () => {
    try {
      if (totalCount === 0) {
        displaySnackMessages(NO_DATA_FOUND, "info");
      } else {
        await downloadCsv();
        downloadLink.current.link.click();
      }
    } catch (error) {
      console.log("Error in downloading CSV", error);
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  // Helper function to create meta body with pagination
  const createMetaBody = (baseMeta, count) => ({
    ...baseMeta,
    limit: {
      limit: count,
      page: 1,
    },
  });

  const downloadCsv = async () => {
    try {
      if (totalCount > 0) {
        displaySnackMessages(FILE_DOWNLOADING_MESSAGE, "info");

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

        let orderByValue = "";
        const selectedSubClass = props.selectedSubClass;

        if (!selectedSubClass || !selectedSubClass.hasOwnProperty("pack_id")) {
          orderByValue = !isToggleChecked ? TOGGLE_OPTIONS?.[0]?.value : "";
        } else {
          const { isPackIdValid } = validatePackId(selectedSubClass);

          if (isPackIdValid) {
            orderByValue = isToggleChecked ? "pack" : "";
          } else {
            orderByValue = !isToggleChecked ? TOGGLE_OPTIONS?.[0]?.value : "";
          }
        }

        // Create meta body with pagination
        const metaBody = createMetaBody(
          isEmpty(tableMeta) ? tableConfigurationMetaData.meta : tableMeta,
          totalCount
        );

        let body = {
          filters: [...appliedOmsProductFilters],
          global_date_filter: [...appliedOmsDateFilters],
          meta: metaBody,
          order_by: orderByValue,
          order_group_id: props.selectedSubClass.order_group_id,
          styles: props.selectedStylesInParentLevel,
        };

        if (isWeekLevel) {
          body.fiscal_weeks = props.fieldsDataInParentLevel;
        } else {
          body.months = props.fieldsDataInParentLevel;
        }

        let response = await props.getOmsStyleOrderSummarySubClassTableData(
          body
        );
        if (response.data.status) {
          let downloadData;
          downloadData = getFormattedDataForDownload(response?.data?.data);
          setCsvData(cloneDeep(downloadData));
        } else {
          displaySnackMessages(ERROR_MESSAGE, "error");
        }
      } else {
        displaySnackMessages(NO_DATA_FOUND, "info");
      }
    } catch (error) {
      console.log("Error in downloading CSV", error);
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  return (
    <div ref={containerRef} className={`${globalClasses.marginVertical1rem}`}>
      <div className={globalClasses.marginVertical1rem}>
        <Loader
          loader={props.styleOrderSummarySubClassTableConfigLoader}
          minHeight={"220px"}
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
              uniqueRowId={
                isToggleChecked
                  ? TOGGLE_OPTIONS?.[1]?.value
                  : TOGGLE_OPTIONS?.[0]?.value
              }
              pagination={true}
              disablePaginationForSinglePage={true}
              suppressClickEdit={true}
              hideChildSelection={true}
              showSetAll={false}
              purgeClosedRowNodes={true}
              suppressAggFuncInHeader={true}
              groupDisplayType={"custom"}
              treeData={true}
              childKey={"status_obj"}
              topRightOptions={
                getTopRightOptions().length > 0 ? getTopRightOptions() : null
              }
              topCenterOptions={
                <ButtonGroup
                  id="toggleSwitch"
                  onChange={handleToggleOptionChange}
                  selectedOption={selectedToggleOption}
                  exclusive
                  aria-label="text alignment"
                  options={TOGGLE_OPTIONS}
                />
              }
              tableHeader={getTopLeftOptions()}
              closeButton={true}
              handleCloseButtonClick={() => props.setSelectedSubClass(null)}
              customDateFormatRequired={true}
            />
          )}
        </Loader>
      </div>
      {hiddenDownloadLink}
      {openPackConfigDetailSheet && (
        <PackConfigBottomSheet
          openPackConfigDetailSheet={openPackConfigDetailSheet}
          setOpenPackConfigDetailSheet={setOpenPackConfigDetailSheet}
          l1DisplayName={DESCRIPTION_LABEL}
          activeChildHierarchyKey={props.selectedSubClass[UNIQUE_KEY]}
          productDescriptionName={getDescriptionDisplayText()}
          activeChildHierarchyDescription={
            props.selectedSubClass?.product_description
          }
          packConfigDetailsPayloadData={packConfigDetailsPayloadData}
          screenName="style_order_summary"
        />
      )}
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    orderingScreensConfig:
      store.omsReducer.orderingCommonService.orderingScreensConfig,
    styleOrderSummarySubClassDataLoader:
      store.omsReducer.orderManagementService
        .styleOrderSummarySubClassDataLoader,
    styleOrderSummarySubClassTableConfigLoader:
      store.omsReducer.orderManagementService
        .styleOrderSummarySubClassTableConfigLoader,
    orderingPackOrderConfig:
      store.omsReducer.orderingCommonService.orderingPackOrderConfig,
    matrixHandoff:
      store.omsReducer.orderManagementTableService?.matrixHandoff,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getOmsStyleOrderSummarySubClassColumnConfig: (payload) =>
    dispatch(getOmsStyleOrderSummarySubClassColumnConfig(payload)),
  getOmsStyleOrderSummarySubClassTableData: (payload) =>
    dispatch(getOmsStyleOrderSummarySubClassTableData(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  closeSnack: (payload) => dispatch(closeSnack(payload)),
  setStyleOrderSummarySubClassDataLoader: (payload) =>
    dispatch(setStyleOrderSummarySubClassDataLoader(payload)),
  setStyleOrderSummarySubClassTableConfigLoader: (payload) =>
    dispatch(setStyleOrderSummarySubClassTableConfigLoader(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(subClassLevelTable);
