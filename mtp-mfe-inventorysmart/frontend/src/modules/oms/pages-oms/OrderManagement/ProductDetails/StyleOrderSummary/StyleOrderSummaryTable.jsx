import React, { useEffect, useMemo, useRef, useState } from "react";
import { connect, useSelector } from "react-redux";
import { addSnack, closeSnack } from "core/actions/snackbarActions";
import AgGridComponent from "core/Utils/agGrid";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import globalStyles from "core/Styles/globalStyles";
import { Button, Card, Tooltip } from "impact-ui-v3";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import Form from "core/Utils/form";
import { cloneDeep, uniq, isEmpty } from "lodash";
import moment from "moment";
import InfoIcon from "@mui/icons-material/Info";
import { IconButton, Typography } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import CloseIcon from "@mui/icons-material/Close";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { useNavigate } from "react-router-dom-v5-compat";
import HandPointingIcon from "assets/impactv3/hand_pointing_right.svg";
import { downloadExcelLink } from "core/Utils/csv-download/index";
import { getHeaderForExcel } from "core/Utils/functions/utils";
import { replaceSpacesWithUnderscores } from "modules/oms/utils-oms/oms-utility";
import { getFormattedDataForDownload } from "modules/oms/pages-oms/Order-Management/components/Product-Details-Screen/Style-Order-Summary/utils";
import {
  ORDER_MANAGEMENT_FILTER_CONFIG,
} from "modules/oms/constants-oms/apiConstants";
import { ORDER_MANAGEMENT_V3_CREATE_SCENARIO } from "modules/oms/constants-oms/routeConstants";
import {
  ERROR_MESSAGE,
  defaultTableData,
  tableConfigurationMetaData,
  OMS_CREATE_SCENARIO_TOOLTIP_MESSAGE,
  OMS_CREATE_SCENARIO_CONDITION_MESSAGE,
  OMS_ORDER_MANAGEMENT_SCREENNAME_KEY,
  OMS_STYLE_ORDER_SUMMARY_FOOTNOTES,
} from "modules/oms/constants-oms/stringConstants";
import {
  getOmsStyleOrderSummaryColumnConfig,
  getOmsStyleOrderSummaryTableData,
  setStyleOrderSummaryTableConfigLoader,
  setStyleOrderSummaryDataLoader,
} from "modules/oms/services-oms/Order-Management/order-management-service";
import SubClassLevelTable from "./SubClassLevelTable";
import StyleOrderSummarySetAllPopUp from "./StyleOrderSummarySetAllPopUp";
import MatrixSummaryApprovalFlowDialog from "../../components/MatrixSummaryApprovalFlowDialog";
import { buildStyleOrderSummaryApprovalPaneContext } from "../../utils/buildApprovalPanePayload.util.js";
import { useScreenId } from "../../../../shared/ViewManagement/viewManagement.util";
import { GetSetAllKpiValue } from "modules/oms/services-oms/Order-Management/matrix-summary-services/ordering-marix-summary/matrix-summary-dashboard-services";
import { addSelectedHierarchyToFilters } from "modules/oms/pages-oms/Order-Management/components/Product-Details-Screen/Style-Order-Summary/utils";
import { fetchStyleOrderSummaryV3 } from "../api/styleOrderSummary.api.js";
import { unifiedEditStyleOrderSummary } from "../api/unifiedEdit.api.js";
import {
  buildStyleOrderSummaryV3Payload,
  buildProductDetailsPeriodOptions,
  resolveProductDetailsFiscalView,
} from "../utils/styleOrderSummaryPayload.util.js";
import {
  resolveStyleFilterAttribute,
  resolveSelectedStyles,
} from "../utils/resolveProductDetailsStyles.util.js";
import { selectMatrixHandoff } from "../../slices/matrixHandoff.slice.js";
import { selectProductDetailsV3 } from "../slices/productDetails.slice.js";
import { resolveOmFilterConfigScreenName } from "../../utils/resolveOmIsV3Schema.util.js";

/**
 * Component for rendering the Style Order Summary Table.
 *
 * This component fetches and displays style order summary data in a table format,
 * allowing users to view, edit, and save order quantities for different styles.
 * It includes various functionalities such as fetching column configurations,
 * handling cell edits, saving modifications, and displaying snack messages.
 *
 * @component
 * @param {Object} props - The properties passed to the component.
 * @param {Function} props.setStyleOrderSummaryDataLoader - Function to set the data loader state.
 * @param {Function} props.getOmsStyleOrderSummaryTableData - Function to fetch style order summary table data.
 * @param {Function} props.closeSnack - Function to close the snack message.
 * @param {Function} props.addSnack - Function to add a snack message.
 * @param {Function} props.setStyleOrderSummaryTableConfigLoader - Function to set the table config loader state.
 * @param {Function} props.getOmsStyleOrderSummaryColumnConfig - Function to fetch column configuration.
 *
 * @returns {JSX.Element} The rendered component.
 */
const StyleOrderSummaryTable = (props) => {
  const globalClasses = globalStyles();
  const classes = useStyles();
  const customClasses = customStyles();
  const navigate = useNavigate();

  const [
    styleOrderSummaryTableColumns,
    setStyleOrderSummaryTableColumns,
  ] = useState([]);
  const [selectedStyleIds, setSelectedStyleIds] = useState([]);
  const [selectedSubClass, setSelectedSubClass] = useState(null);
  const [render, setRender] = useState(false);
  const [openPopUp, setOpenPopUp] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [fields, setFields] = useState([]);
  const [availableKpis, setAvailableKpis] = useState({});
  const [isUserHasViewOnlyAccess, setIsUserHasViewOnlyAccess] = useState(null);
  const [editedCells, setEditedCells] = useState({});
  const [checkAllSetAllRequest, setCheckAllSetAllRequest] = useState([]);
  const [styleOrderSummaryPayload, setStyleOrderSummaryPayload] = useState({});
  const [showFootnote, setShowFootnote] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const downloadLink = useRef(null);
  const [csvData, setCsvData] = useState([]);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [tableMeta, setTableMeta] = useState({});

  // Access control state
  const [isUserHasEditAccess, setIsUserHasEditAccess] = useState(true);
  const [isUserHasSetAllAccess, setIsUserHasSetAllAccess] = useState(true);

  const matrixHandoffFromStore = useSelector(selectMatrixHandoff);
  const productDetailsV3 = useSelector(selectProductDetailsV3);
  const handoff = props.matrixHandoff || matrixHandoffFromStore;
  const isV3Schema =
    typeof handoff?.isV3Schema === "boolean" ? handoff.isV3Schema : false;
  const filterConfigScreenName = resolveOmFilterConfigScreenName({
    sourcePath: handoff?.sourcePath,
    isV3Schema,
  });
  const screenId = useScreenId({
    selectedScreenViewName: filterConfigScreenName,
  });
  const isWeekLevel =
    resolveProductDetailsFiscalView(handoff?.frequency) === "week";

  const DESCRIPTION_LABEL =
    props?.orderingScreensConfig?.oms_dashboard?.style_order_summary
      ?.description_label;

  const ORDER_STATUS_COLUMN_MAPPING =
    props?.orderingScreensConfig?.oms_dashboard?.style_order_summary
      ?.order_status_column_mapping;

  const ORDER_STATUS_ID_COLUMN_NAME =
    props?.orderingScreensConfig?.oms_dashboard?.style_order_summary
      ?.order_status_id_column_name || "order_status_id";

  const DISPLAY_FISCAL_WEEKS_AS_END_DATE =
    props?.orderingScreensConfig?.oms_dashboard?.style_order_summary
      ?.display_fiscal_week_as_end_date || false;

  const ORDER_STATUS_COLUMN_NAME =
    props?.orderingScreensConfig?.oms_dashboard?.style_order_summary
      ?.order_status_column_name || "order_status";

  const WEEK_LABEL =
    props?.orderingScreensConfig?.oms_dashboard?.style_order_summary
      ?.week_label || "Week";
  const MONTH_LABEL =
    props?.orderingScreensConfig?.oms_dashboard?.style_order_summary
      ?.month_label || "Month";

  const MAX_RESTRICTED_COUNT =
    props?.orderingScreensConfig?.create_scenario?.max_restricted_count || 1;

  const PAGINATION_LIMIT =
    props?.orderingScreensConfig?.oms_dashboard?.style_order_summary
      ?.pagination_limit || 10;

  const styleOrderTableGridInstance = useRef(null);
  const selectedStylesInParentLevel = useRef(null);
  const fieldsData = useRef(null);
  const globalFilters = useRef(null);

  useEffect(() => {
    if (styleOrderTableGridInstance?.current) {
      styleOrderTableGridInstance.current.api.checkAllSetAllRequest = checkAllSetAllRequest;
    }
  }, [checkAllSetAllRequest]);

  const approvalFiscalCalendar =
    handoff?.fiscalCalendarRows?.length > 0
      ? handoff.fiscalCalendarRows
      : props.fiscalCalendarDetails;

  const approvalPaneContext = useMemo(
    () =>
      showApprovalModal
        ? buildStyleOrderSummaryApprovalPaneContext({
            handoff,
            selectedStyleRows: selectedStyleIds,
            productDetailsFilter:
              props.orderManagementProductDetailsFilters?.[0],
            screenId,
          })
        : null,
    [
      showApprovalModal,
      handoff,
      selectedStyleIds,
      props.orderManagementProductDetailsFilters,
      screenId,
    ]
  );

  const cellClassRules = {
    [classes.disabledCell]: (params) => {
      const node = params.node;
      const colDef = params.colDef;
      if (colDef.accessor === "order_info" || node.data.order_status_id === 0)
        return false;
      return true;
    },
  };

  useEffect(() => {
    const styleAttribute = resolveStyleFilterAttribute({
      productDetailsFilters: props.orderManagementProductDetailsFilters,
      styleFilterAttribute: productDetailsV3?.styleFilterAttribute,
    });
    selectedStylesInParentLevel.current = resolveSelectedStyles({
      productDetailsSelectedStyles: productDetailsV3?.selectedStyles,
      deepDiveFiltersData: props.orderManagementDeepDiveFiltersData,
      styleAttribute,
    });

    let appliedFilters = [];

    if (
      props.filterDashboardConfiguration?.appliedFilterData?.dependencyData
        ?.length
    ) {
      appliedFilters = cloneDeep(
        props.filterDashboardConfiguration?.appliedFilterData?.dependencyData
      );
    } else if (props?.selectedFilters?.length) {
      appliedFilters = cloneDeep(props?.selectedFilters);
    } else if (handoff?.selectedFilters?.length) {
      appliedFilters = cloneDeep(handoff.selectedFilters);
    }

    globalFilters.current = addSelectedHierarchyToFilters(
      props?.highLevelSummaryState,
      appliedFilters
    );

    // CRITICAL FIX: Ensure DC filter from selectedFilters is always included
    const dcFilterFromSelected = props?.selectedFilters?.find(
      (f) => f.dimension === "dc"
    );
    if (dcFilterFromSelected) {
      // Remove any existing DC filter
      globalFilters.current = globalFilters.current.filter(
        (f) => f.dimension !== "dc"
      );
      // Add the DC filter from selectedFilters
      globalFilters.current.push(cloneDeep(dcFilterFromSelected));
    }

    setRender(true);
    setCheckAllSetAllRequest([]);
    if (styleOrderTableGridInstance?.current?.api) {
      refreshTableData();
    }
  }, [
    props.orderManagementDeepDiveFiltersData,
    props.orderManagementProductDetailsFilters,
    props.selectedFilters,
    productDetailsV3?.selectedStyles,
    productDetailsV3?.styleFilterAttribute,
    handoff?.selectedFilters,
  ]);

  useEffect(() => {
    const shouldOpenApprovalPane = localStorage.getItem(
      "omsAlertOpenApprovalPane"
    );

    if (
      shouldOpenApprovalPane === "true" &&
      !showApprovalModal &&
      !props?.styleOrderSummaryDataLoader &&
      styleOrderTableGridInstance?.current?.api
    ) {
      const openApprovalTimeout = setTimeout(() => {
        if (styleOrderTableGridInstance?.current?.api) {
          const selectedRows = [];

          styleOrderTableGridInstance.current.api.forEachNode((node) => {
            if (node.data && node.data.order_status_id === 0) {
              node.setSelected(true);
              selectedRows.push({ ...node.data });
            }
          });

          setSelectedStyleIds(selectedRows);
          const payload = buildStyleOrderSummaryPayload(selectedRows);
          setStyleOrderSummaryPayload(payload);
        }

        setTimeout(() => {
          setShowApprovalModal(true);
          localStorage.removeItem("omsAlertOpenApprovalPane");
        }, 1500);
      }, 1000);

      return () => clearTimeout(openApprovalTimeout);
    }
  }, [props?.styleOrderSummaryDataLoader, showApprovalModal]);

  // user access for style order summary
  const styleOrderSummaryAccess = props.userAccess?.find(
    (item) =>
      item.module === "style_order_summary" &&
      item.screen === OMS_ORDER_MANAGEMENT_SCREENNAME_KEY
  );
  const canEdit = styleOrderSummaryAccess?.isEditButton || false;
  const canSetAll = styleOrderSummaryAccess?.isSetAllButton || false;

  useEffect(() => {
    if (!isEmpty(props?.userAccess)) {
      // Use new userAccess flags
      setIsUserHasEditAccess(canEdit);
      setIsUserHasSetAllAccess(canSetAll);
      setIsUserHasViewOnlyAccess(false);
    } else if (props?.orderingAccessControl) {
      // Fall back to old access control
      setIsUserHasViewOnlyAccess(
        !props?.orderingAccessControl?.isEditButton?.isVisible
      );
      setIsUserHasEditAccess(true);
      setIsUserHasSetAllAccess(true);
    }
  }, [props?.userAccess, props?.orderingAccessControl, canEdit, canSetAll]);

  const checkForEditability = (columnsData) => {
    let updatedColumnsData = cloneDeep(columnsData);

    // If userAccess exists, use canEdit flag; otherwise fall back to orderingAccessControl
    const shouldDisableEdit = !isEmpty(props?.userAccess)
      ? !canEdit
      : !props?.orderingAccessControl?.isEditButton?.isVisible;

    if (shouldDisableEdit) {
      updatedColumnsData.map((column) => {
        if (column.type !== "link") {
          column.is_editable = false;
        }
      });
    }
    return updatedColumnsData;
  };

  /**
   * Updates the column definitions to include a cell style for the "total_order_quantity" column
   * based on whether the row data has been edited.
   *
   * @param {Array} columnsDef - The array of column definitions to be updated.
   * @returns {Array} The updated array of column definitions with the new cell style applied.
   * @throws Will display a snack message and return an empty array if an error occurs.
   */
  const setCellStyles = (columnsDef) => {
    try {
      let updatedColumnsDef = cloneDeep(columnsDef);
      updatedColumnsDef = updatedColumnsDef.map((item) => {
        if (item.column_name === "total_order_quantity") {
          item.cellStyle = (params) => {
            let colour = { backgroundColor: "inherit" };
            if (params.node.data.isEdited)
              colour = { backgroundColor: "#0055af36" };
            if (params.node.data.isMOQBreached)
              colour = { backgroundColor: "#AF000033" };
            return colour;
          };
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

  /**
   * Fetches and processes style order summary data.
   *
   * @param {Object} manualbody - The manual body data to be included in the request.
   * @param {number} pageIndex - The index of the current page.
   * @param {Object} params - Additional parameters for the request.
   * @returns {Promise<Object>} The formatted data and total count, or default table data in case of an error.
   */
  const manualCallBack = async (manualbody, pageIndex, params) => {
    try {
      props.setStyleOrderSummaryDataLoader(true);

      if (!selectedStylesInParentLevel.current) {
        props.setStyleOrderSummaryDataLoader(false);
        return { data: [], totalCount: 0 };
      }

      const appliedOmsProductFilters = globalFilters.current?.filter(
        (filter) => filter.display_type !== "fiscalCalendar"
      );

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

      const styleAttribute = resolveStyleFilterAttribute({
        productDetailsFilters: props.orderManagementProductDetailsFilters,
        styleFilterAttribute: productDetailsV3?.styleFilterAttribute,
      });
      const body = buildStyleOrderSummaryV3Payload({
        handoff,
        styleFilterAttribute: styleAttribute,
        selectedStyles: selectedStylesInParentLevel.current,
        periods: fieldsData.current || [],
        pageIndex: Number(pageIndex) ? pageIndex : 0,
        pageSize: PAGINATION_LIMIT,
        metaOverrides: manualbody || {},
      });

      const bodyFilters = Array.isArray(resolvedProductFilters)
        ? cloneDeep(resolvedProductFilters)
        : [];
      const withoutStyleFilter = bodyFilters.filter(
        (filter) => filter?.attribute_name !== styleAttribute
      );
      withoutStyleFilter.push({
        attribute_name: styleAttribute,
        operator: "in",
        values: selectedStylesInParentLevel.current,
      });
      body.global_filters = withoutStyleFilter;

      try {
        const orderPlacementDateRange = JSON.parse(
          localStorage.getItem("omsAlertOrderPlacementDateRange") || "null"
        );
        if (
          orderPlacementDateRange &&
          orderPlacementDateRange.min_val &&
          orderPlacementDateRange.max_val
        ) {
          if (!body.meta.range) {
            body.meta.range = [];
          }
          body.meta.range.push(orderPlacementDateRange);
        }
      } catch (error) {
        console.error("Error parsing omsAlertOrderPlacementDateRange:", error);
      }

      const response = await fetchStyleOrderSummaryV3(body);
      if (response.status) {
        const dataResponse = cloneDeep(response.data);

        // If Order Status Column Mapping is present, then map the order status with labels
        if (ORDER_STATUS_COLUMN_MAPPING && ORDER_STATUS_ID_COLUMN_NAME) {
          dataResponse.forEach((row) => {
            const columnValue = row[ORDER_STATUS_ID_COLUMN_NAME].toString();
            row[ORDER_STATUS_COLUMN_NAME] =
              ORDER_STATUS_COLUMN_MAPPING[columnValue] || columnValue;
          });
        }

        let formatedData = agGridRowFormatter(
          dataResponse,
          params?.api?.checkConfiguration,
          "order_group_id"
        );

        formatedData = formatedData.map((item) => {
          item.isMOQBreached =
            item.total_order_quantity < item.min_order_quantity;

          return item;
        });

        props.setStyleOrderSummaryDataLoader(false);
        setTotalCount(response.total);
        setTableMeta(body.meta);
        return { data: formatedData, totalCount: response.total };
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
        props.setStyleOrderSummaryDataLoader(false);
        return defaultTableData;
      }
    } catch (err) {
      console.log("Error in Fetching Style Order Summary Table Data", err);
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setStyleOrderSummaryDataLoader(false);
      return defaultTableData;
    }
  };

  const loadTableInstance = (params) => {
    styleOrderTableGridInstance.current = params;
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

  const onSelectionChanged = (event) => {
    // fetch all selected rows
    let selectedRows = [];
    styleOrderTableGridInstance.current.api.forEachNode((node) => {
      node.selected && selectedRows.push({ ...node.data });
    });
    setSelectedStyleIds(selectedRows);
  };

  const buildStyleOrderSummaryPayload = (selectedRows) => {
    const styleOrderPayload = {
      styles: selectedStylesInParentLevel.current,
    };

    if (isWeekLevel) {
      styleOrderPayload.fiscal_weeks = fieldsData.current || [];
    } else {
      styleOrderPayload.months = fieldsData.current || [];
    }

    let recommendedDateRange = null;
    if (selectedRows.length > 0) {
      const dates = selectedRows
        .map((row) => row.order_placement_recom_date)
        .filter((date) => date);

      if (dates.length > 0) {
        const minDate = dates.reduce((min, date) =>
          moment(date).isBefore(moment(min)) ? date : min
        );
        const maxDate = dates.reduce((max, date) =>
          moment(date).isAfter(moment(max)) ? date : max
        );

        recommendedDateRange = {
          start_date: minDate,
          end_date: maxDate,
        };
      }
    }

    return {
      ...styleOrderPayload,
      recommendedOrderPlacementDateRange: recommendedDateRange,
    };
  };

  /**
   * Handles the onBlur event for the style order summary table.
   *
   * This function is triggered when a cell loses focus. It checks if the value
   * in the "total_order_quantity" column has changed. If so, it marks the row
   * as edited and updates the cell style based on whether the minimum order
   * quantity (MOQ) is breached. The table cells are then refreshed to reflect
   * these changes.
   *
   * @param {Object} _e - The event object (unused).
   * @param {Object} data - The data object containing row information.
   * @param {Object} column - The column object containing column information.
   * @param {boolean} isChanged - Flag indicating if the value has changed.
   */
  const onBlur = (_e, data, column, isChanged) => {
    if (isChanged) {
      if (column.colId === "total_order_quantity") {
        styleOrderTableGridInstance.current.api.forEachNode((node) => {
          if (node.data.order_group_id === data.order_group_id) {
            node.data.isEdited = true;

            node.data.isMOQBreached =
              node.data.total_order_quantity < node.data.min_order_quantity;

            setEditedCells((prev) => {
              const updatedRows = {
                ...prev,
                [node.data.order_group_id]: {
                  ...node.data,
                },
              };
              return updatedRows;
            });

            styleOrderTableGridInstance.current.api.refreshCells({
              force: true,
              suppressFlash: false,
              rowNodes: [node],
              columns: ["total_order_quantity"],
            });
          }
        });
      } else if (column.colId === "order_quantity") {
        styleOrderTableGridInstance.current.api.forEachNode((node) => {
          if (node.data.order_group_id === data.order_group_id) {
            node.data.isEdited = true;
            setEditedCells((prev) => {
              const updatedRows = {
                ...prev,
                [node.data.order_group_id]: {
                  ...node.data,
                },
              };
              return updatedRows;
            });
            styleOrderTableGridInstance.current.api.refreshCells({
              force: true,
              suppressFlash: false,
              rowNodes: [node],
              columns: ["order_quantity"],
            });
          }
        });
      }
    }
  };

  const refreshTableData = () => {
    styleOrderTableGridInstance.current?.api?.deselectAll();
    // Clear any persisted selection configuration to avoid auto-select on next pages
    styleOrderTableGridInstance?.current?.api?.setCheckConfiguration([]);
    if (styleOrderTableGridInstance?.current?.api) {
      styleOrderTableGridInstance.current.api.isSelectAllRecords = false;
    }
    styleOrderTableGridInstance?.current?.api?.refreshServerSideStore({
      purge: true,
    });
    setSelectedStyleIds([]);
    setSelectedSubClass(null);
    setCheckAllSetAllRequest([]);
  };

  const refreshParentTableDataOnly = () => {
    styleOrderTableGridInstance?.current?.api?.refreshServerSideStore({
      purge: true,
    });
    styleOrderTableGridInstance.current?.api?.deselectAll();
    setSelectedStyleIds([]);
  };

  /**
   * Handles the save action for the style order summary table.
   *
   * This function retrieves the currently selected style IDs from the table grid,
   * constructs a request body with the necessary modifications, and sends an
   * update request to the server. It also manages the loading state and displays
   * appropriate success or error messages based on the server response.
   *
   * @async
   * @function handleSave
   * @returns {Promise<void>} A promise that resolves when the save operation is complete.
   */
  const handleSave = async () => {
    const currentSelectedStyleIds = Object.values(editedCells).map(
      (item) => item
    );

    let body = {
      modifications: [
        {
          fiscal_timeperiod_ids: fieldsData.current,
          filter_type: isWeekLevel ? "week" : "month",
          modified: currentSelectedStyleIds.map((item) => {
            // check which value is modified on which column was edited
            const editedValue =
              item?.order_quantity !== undefined &&
              item?.order_quantity !== null &&
              item?.order_quantity !== ""
                ? item.order_quantity
                : item.total_order_quantity || 0;

            return {
              ordergroup: {
                name: item.order_group_id,
                value: editedValue,
                locked: false,
                ratio: (
                  parseInt(editedValue) / parseInt(item.total_roq_constrained)
                ).toFixed(5),
              },
            };
          }),
          ...(props?.selectedDcs?.length > 0
            ? {
                selected_linked_store_codes: props?.selectedDcs?.map(
                  (dc) => dc.value
                ),
              }
            : {}),
        },
      ],
    };
    try {
      props.setStyleOrderSummaryDataLoader(true);
      let response = await unifiedEditStyleOrderSummary({
        payload: body,
        isV3Schema,
      });
      if (response.data.status) {
        displaySnackMessages("Data saved successfully", "success");
        setEditedCells({});
        props.onDeepDiveRefresh?.();
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    } catch {
      displaySnackMessages(ERROR_MESSAGE, "error");
    } finally {
      props.setStyleOrderSummaryDataLoader(false);
      refreshTableData();
    }
  };

  const openSetAllPopUp = () => {
    setOpenPopUp(true);
  };

  const fetchSetAllKpiData = async () => {
    try {
      let setAllKpiData = await GetSetAllKpiValue();
      let setAllKpiDataResponse = setAllKpiData?.data?.data;
      if (setAllKpiDataResponse) {
        setAvailableKpis(setAllKpiDataResponse[0]);
      }
    } catch (err) {
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  const fetchColumnConfig = async () => {
    try {
      let columns = await props.getOmsStyleOrderSummaryColumnConfig();

      let columnsData = columns?.data?.data;
      columnsData = checkForEditability(columnsData);

      let formattedColumns = agGridColumnFormatter(
        columnsData,
        null,
        {
          order_info: (data) => setSelectedSubClass(data),
        },
        null,
        null,
        null,
        null,
        true
      );

      let updatedColumns = setCellStyles(formattedColumns);
      //setCsvHeaders(getHeaderForExcel(cloneDeep(updatedColumns)));
      setStyleOrderSummaryTableColumns(updatedColumns);
    } catch (err) {
      displaySnackMessages(ERROR_MESSAGE, "error");
    } finally {
      setRender(true);
      props.setStyleOrderSummaryTableConfigLoader(false);
    }
  };

  const handleMonthWeekChange = (accessor) => {
    fieldsData.current = isWeekLevel ? accessor?.week : accessor?.month;
    refreshTableData();
  };

  useEffect(() => {
    if (props.reloadFromParent) {
      refreshTableData();
      setCheckAllSetAllRequest([]);
      styleOrderTableGridInstance?.current?.api?.deselectAll();
      styleOrderTableGridInstance?.current?.api?.setCheckConfiguration([]);
    }
  }, [props.reloadFromParent]);

  useEffect(() => {
    const fiscalCalendarRows = handoff?.fiscalCalendarRows?.length
      ? handoff.fiscalCalendarRows
      : props.fiscalCalendarDetails;
    if (!fiscalCalendarRows?.length) return;

    const {
      possibleMonths,
      possibleWeeks,
      weekOptions,
    } = buildProductDetailsPeriodOptions({
      selectedDateRange: handoff?.selectedDateRange,
      fiscalCalendarRows,
      displaySnackMessages,
      formatWeeksAsEndDate: DISPLAY_FISCAL_WEEKS_AS_END_DATE,
    });

    if (isWeekLevel && possibleWeeks) {
      setFields([
        {
          label: WEEK_LABEL,
          isMulti: true,
          options: weekOptions,
          accessor: "week",
          field_type: "dropdown",
          isClearable: true,
          labelOrientation: "left",
        },
      ]);
      fieldsData.current = possibleWeeks;
    } else {
      setFields([
        {
          label: MONTH_LABEL,
          isMulti: true,
          options: possibleMonths.map((month) => ({
            label: month,
            value: month,
          })),
          accessor: "month",
          field_type: "dropdown",
          isClearable: true,
          labelOrientation: "left",
        },
      ]);
      fieldsData.current = possibleMonths;
    }
  }, [
    props?.fiscalCalendarDetails,
    handoff?.selectedDateRange,
    handoff?.frequency,
    handoff?.fiscalCalendarRows,
  ]);

  useEffect(() => {
    if (isUserHasViewOnlyAccess === null) return;

    setRender(false);
    props.setStyleOrderSummaryTableConfigLoader(true);
    fetchSetAllKpiData();
  }, [isUserHasViewOnlyAccess, isUserHasEditAccess]);

  useEffect(() => {
    if (!isEmpty(availableKpis) && fields.length > 0) {
      fetchColumnConfig();
    }
  }, [availableKpis, fields]);

  const onApproveButtonClick = () => {
    const payload = buildStyleOrderSummaryPayload(selectedStyleIds);
    setStyleOrderSummaryPayload(payload);
    let recommendedDateRange = null;
    if (selectedStyleIds.length > 0) {
      const dates = selectedStyleIds
        .map((row) => row.order_placement_recom_date)
        .filter((date) => date);

      if (dates.length > 0) {
        const minDate = dates.reduce((min, date) =>
          moment(date).isBefore(moment(min)) ? date : min
        );
        const maxDate = dates.reduce((max, date) =>
          moment(date).isAfter(moment(max)) ? date : max
        );

        recommendedDateRange = {
          start_date: minDate,
          end_date: maxDate,
        };
      }
    }

    setStyleOrderSummaryPayload({
      recommendedOrderPlacementDateRange: recommendedDateRange,
    });

    setShowApprovalModal(true);
  };

  const navigateToCreateScenario = () => {
    const restrictionKey = resolveStyleFilterAttribute({
      productDetailsFilters: props.orderManagementProductDetailsFilters,
      styleFilterAttribute: productDetailsV3?.styleFilterAttribute,
    });
    const url = `${ORDER_MANAGEMENT_V3_CREATE_SCENARIO}?step=0`;
    const uniqueStyleIds = uniq(
      selectedStyleIds.map((style) => style[restrictionKey]) // Extract the value of the restrictionKey
    );
    const selectedValues =
      uniqueStyleIds.length > 0
        ? uniqueStyleIds
        : selectedStylesInParentLevel.current;

    // create filter object to pass to create scenario
    const appliedOmsProductFilters = globalFilters.current?.filter(
      (filter) => filter.display_type !== "fiscalCalendar"
    );

    // fetching the redirection details from local storage
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

    let appliedOmsDateFilters = [];

    if (props.ropDate?.start_date && props.ropDate?.end_date) {
      appliedOmsDateFilters.push(props.ropDate);
    }
    if (
      props.recommRecieptDate?.start_date &&
      props.recommRecieptDate?.end_date
    ) {
      appliedOmsDateFilters.push(props.recommRecieptDate);
    }

    const completeFilters = {
      filters: [...resolvedProductFilters],
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

  const isCreateScenarioRestricted = () => {
    try {
      let count = 0;
      const restrictionKey = resolveStyleFilterAttribute({
        productDetailsFilters: props.orderManagementProductDetailsFilters,
        styleFilterAttribute: productDetailsV3?.styleFilterAttribute,
      });
      const uniqueStyleIds = uniq(
        selectedStyleIds.map((style) => style[restrictionKey]) // Extract the value of the restrictionKey
      );
      count = uniqueStyleIds.length;
      if (count > 0) {
        return !(count === MAX_RESTRICTED_COUNT);
      }

      const totalSelectedIds =
        props?.orderManagementDeepDiveFiltersData[restrictionKey];
      if (totalSelectedIds.length === 1) return false;

      // if table selections are not present, then check if there is only key selected in product filters dropdown
      const filteredValues = props?.orderManagementDeepDiveFiltersPayload?.filters?.filter(
        (item) => item.attribute_name === restrictionKey
      );
      return !(
        filteredValues.length === 1 && filteredValues[0]?.values.length === 1
      );
    } catch (error) {
      console.log("Error in isCreateScenarioRestricted", error);
    }
  };

  const openFootnotePrompt = () => {
    setShowFootnote(true);
  };

  const gotToDeepDive = () => {
    if (typeof props?.handleChangeTabValue === "function") {
      props?.handleChangeTabValue(null, "deep_dive");
    }
  };

  const getIsDisabled = ({
    userAccess,
    isUserHasEditAccess,
    isUserHasViewOnlyAccess,
    editedCells,
  }) => {
    const hasEdits = Object.keys(editedCells).length > 0;

    if (!isEmpty(userAccess)) {
      // userAccess is NOT empty → use edit access
      return !isUserHasEditAccess || !hasEdits;
    } else {
      // userAccess is empty → view-only logic
      return isUserHasViewOnlyAccess || !hasEdits;
    }
  };
  const getTopRightOptions = () => {
    let options = [];
    if (selectedStyleIds.length === 0) {
      options.push(
        <div>
          <Form
            layout={"horizontal"}
            maxFieldsInRow={2}
            labelWidthSpan={2}
            fieldTypeWidthSpan={2}
            handleChange={handleMonthWeekChange}
            fields={fields}
            updateDefaultValue={true}
            defaultValues={{
              month: fieldsData.current,
              week: fieldsData.current,
            }}
          ></Form>
        </div>
      );
    }

    !getIsDisabled({
      userAccess: props?.userAccess,
      isUserHasEditAccess,
      isUserHasViewOnlyAccess,
      editedCells,
    }) &&
      options.push(
        <Button
          variant="tertiary"
          color="primary"
          id="productSaveBtn"
          className={classes.button}
          onClick={handleSave}
        >
          Save
        </Button>
      );
    if (selectedStyleIds.length === 1) {
      options.push(
        <Tooltip
          title={OMS_CREATE_SCENARIO_CONDITION_MESSAGE}
          variant="tertiary"
        >
          <Button
            variant="tertiary"
            color="primary"
            className={classes.button}
            disabled={isCreateScenarioRestricted()}
            onClick={navigateToCreateScenario}
          >
            Create Scenario
          </Button>
        </Tooltip>
      );
    }
    if (selectedStyleIds.length > 0) {
      options.push(
        <Button
          variant="tertiary"
          color="primary"
          className={classes.button}
          disabled={
            !isEmpty(props?.userAccess)
              ? !isUserHasSetAllAccess || selectedStyleIds.length === 0
              : isUserHasViewOnlyAccess || selectedStyleIds.length === 0
          }
          onClick={openSetAllPopUp}
        >
          Set All
        </Button>
      );
      options.push(
        <Button
          variant="primary"
          color="primary"
          className={classes.button}
          disabled={selectedStyleIds?.length === 0}
          onClick={onApproveButtonClick}
        >
          Approve Orders
        </Button>
      );
    }

    return options;
  };

  const tableheader = "style_order_summary";
  const downloadFileName = replaceSpacesWithUnderscores(tableheader);
  const hiddenDownloadLink = !props.styleOrderSummaryDataLoader
    ? downloadExcelLink(
        csvData,
        downloadFileName,
        downloadLink,
        csvHeaders,
        "",
        "",
        true
      )
    : null;

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

        const appliedOmsProductFilters = globalFilters.current?.filter(
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

        let appliedOmsDateFilters = [];

        if (props.ropDate?.start_date && props.ropDate?.end_date) {
          appliedOmsDateFilters.push(props.ropDate);
        }
        if (
          props.recommRecieptDate?.start_date &&
          props.recommRecieptDate?.end_date
        ) {
          appliedOmsDateFilters.push(props.recommRecieptDate);
        }

        // Create meta body with pagination
        const metaBody = createMetaBody(
          isEmpty(tableMeta) ? tableConfigurationMetaData.meta : tableMeta,
          totalCount
        );

        let body = {
          filters: [...resolvedProductFilters],
          global_date_filter: [...appliedOmsDateFilters],
          meta: metaBody,
          styles: selectedStylesInParentLevel.current,
        };

        try {
          const orderPlacementDateRange = JSON.parse(
            localStorage.getItem("omsAlertOrderPlacementDateRange") || "null"
          );
          if (
            orderPlacementDateRange &&
            orderPlacementDateRange.min_val &&
            orderPlacementDateRange.max_val
          ) {
            if (!body.meta.range) {
              body.meta.range = [];
            }
            body.meta.range.push(orderPlacementDateRange);
          }
        } catch (error) {
          console.error(
            "Error parsing omsAlertOrderPlacementDateRange:",
            error
          );
        }

        if (isWeekLevel) {
          body.fiscal_weeks = fieldsData.current || [];
        } else {
          body.months = fieldsData.current || [];
        }

        let response = await props.getOmsStyleOrderSummaryTableData(body);
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

  const getBottomLeftOptions = () => {
    let options = [];
    if (!isCreateScenarioRestricted()) {
      options.push(
        <div>
          <Button
            label="Button"
            size="medium"
            type="default"
            variant="url"
            icon={<InfoIcon className={classes.infoIcon} fontSize="small" />}
            onClick={openFootnotePrompt}
          >
            View Footnotes
          </Button>

          {showFootnote && (
            <Card size="large" className={customClasses.footnoteCard}>
              <div
                className={globalClasses.flexAlignBetweenCenter}
                style={{ marginBottom: "1rem" }}
              >
                <Typography h6 style={{ fontWeight: 800, fontSize: "16px" }}>
                  Footnotes
                </Typography>
                <div>
                  <IconButton
                    onClick={() => setShowFootnote(false)}
                    size="small"
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </div>
              </div>
              <ul className={customClasses.footnoteList}>
                {[
                  OMS_CREATE_SCENARIO_TOOLTIP_MESSAGE,
                  ...OMS_STYLE_ORDER_SUMMARY_FOOTNOTES,
                ]?.map((note, index) => {
                  return (
                    <li key={index} className={customClasses.footnoteListItem}>
                      <span style={{ marginTop: "4px" }}>
                        <HandPointingIcon />
                      </span>
                      <span>
                        <Typography style={{ display: "inline" }}>
                          {note?.message}
                        </Typography>{" "}
                        {note?.link && (
                          <Button
                            label="Button"
                            size="small"
                            type="default"
                            variant="url"
                            iconPlacement="right"
                            icon={<OpenInNewIcon fontSize="small" />}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                            }}
                            onClick={() => gotToDeepDive()}
                          >
                            {note?.link}
                          </Button>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
        </div>
      );
    }
    return options;
  };

  return (
    <div
      className={`${globalClasses.marginVertical1rem} ${customClasses.styleOrderSummaryTable}`}
    >
      <div className={globalClasses.marginVertical1rem}>
        <Loader
          minHeight={"260px"}
          loader={props.styleOrderSummaryTableConfigLoader}
        >
          {render && (
            <AgGridComponent
              columns={styleOrderSummaryTableColumns}
              manualCallBack={(body, pageIndex, params) =>
                manualCallBack(body, pageIndex, params)
              }
              loadTableInstance={loadTableInstance}
              onSelectionChanged={onSelectionChanged}
              onBlur={onBlur}
              pagination={true}
              disablePaginationForSinglePage={true}
              totalCount={1}
              cacheBlockSize={PAGINATION_LIMIT}
              paginationPageSize={PAGINATION_LIMIT}
              serverSideStoreType="partial"
              rowModelType="serverSide"
              uniqueRowId={"order_group_id"}
              rowSelection="multiple"
              onRowSelected
              selectAllHeaderComponent={true}
              hideSelectAllRecords={false}
              isRowSelectable={(rowNode) =>
                rowNode.data ? rowNode.data.order_status_id === 0 : false
              }
              tableHeader={`List of ${DESCRIPTION_LABEL}s`}
              topRightOptions={getTopRightOptions()}
              bottomLeftOptions={getBottomLeftOptions()}
              nestedTable={Boolean(selectedSubClass)}
              showSkeletonLoader={
                !props.styleOrderSummaryTableConfigLoader &&
                props.styleOrderSummaryDataLoader
              }
              nestedTableComponent={
                selectedSubClass ? (
                  <SubClassLevelTable
                    selectedSubClass={selectedSubClass}
                    setSelectedSubClass={setSelectedSubClass}
                    refreshStyleOrderSummaryTableData={
                      refreshParentTableDataOnly
                    }
                    onDeepDiveRefresh={props.onDeepDiveRefresh}
                    selectedStylesInParentLevel={
                      selectedStylesInParentLevel.current
                    }
                    globalFiltersInParentLevel={globalFilters.current}
                    fieldsDataInParentLevel={fieldsData.current}
                    ropParentDateRange={props.ropDate}
                    recommRecieptParentDateRange={props.recommRecieptDate}
                    isUserHasViewOnlyAccess={isUserHasViewOnlyAccess}
                    isUserHasEditAccess={isUserHasEditAccess}
                    userAccess={props.userAccess}
                    shipmentModes={props.shipmentModes}
                    isV3Schema={isV3Schema}
                  />
                ) : null
              }
              // showDownloadButton
              // onDownloadButtonClick={onDownloadButtonClick}
            />
          )}
          {openPopUp && (
            <StyleOrderSummarySetAllPopUp
              showSetAllModal={openPopUp}
              setShowSetAllModal={setOpenPopUp}
              selectedDcs={props?.selectedDcs}
              refreshTableData={refreshTableData}
              onDeepDiveRefresh={props.onDeepDiveRefresh}
              agGridInstance={styleOrderTableGridInstance.current}
              isDataWeekLevel={isWeekLevel}
              isV3Schema={isV3Schema}
              matrixHandoff={handoff}
              globalFilters={globalFilters.current}
              STORE_SETALL_FIELDS={[
                {
                  accessor: "set_all_on",
                  field_type: "radioGroup",
                  orientation: "vertical",
                  options: availableKpis?.attribute_value?.options.map(
                    (skuId) => ({
                      label: skuId?.label,
                      value: skuId?.value,
                    })
                  ),
                  required: true,
                  label: availableKpis?.attribute_value?.styleOrderSummaryLabel
                    ? `Select ${availableKpis.attribute_value.styleOrderSummaryLabel}`
                    : "Select ROQ Source",
                },
              ]}
            />
          )}
        </Loader>
        {hiddenDownloadLink}

        {showApprovalModal && (
          <MatrixSummaryApprovalFlowDialog
            setShowApprovalModal={setShowApprovalModal}
            screenName={ORDER_MANAGEMENT_FILTER_CONFIG}
            fiscalCalendarDetails={approvalFiscalCalendar}
            selectedRows={selectedStyleIds}
            targetTable={"matrix_summary"}
            reloadComponent={refreshTableData}
            approvalPaneContext={approvalPaneContext}
            showNextCycleHelper={Boolean(
              styleOrderSummaryPayload?.recommendedOrderPlacementDateRange
            )}
            {...(styleOrderSummaryPayload?.recommendedOrderPlacementDateRange
              ? {
                  styleOrderSummaryPayload: {
                    recommendedOrderPlacementDateRange:
                      styleOrderSummaryPayload.recommendedOrderPlacementDateRange,
                  },
                }
              : {})}
          />
        )}
      </div>
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    userAccess:
      store.omsReducer.orderingCommonService.orderingUserAccess?.vendor_dc,
    styleOrderSummaryTableConfigLoader:
      store.omsReducer.orderManagementService
        .styleOrderSummaryTableConfigLoader,
    styleOrderSummaryDataLoader:
      store.omsReducer.orderManagementService.styleOrderSummaryDataLoader,
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "orderManagementFilterConfiguration"
      ],
    recommRecieptDate:
      store.omsReducer.orderManagementService.recommRecieptDate,
    ropDate: store.omsReducer.orderManagementService.ropDate,
    orderManagementDeepDiveFiltersData:
      store.omsReducer.orderManagementService
        .orderManagementDeepDiveFiltersData,
    orderManagementProductDetailsFilters:
      store.omsReducer.orderManagementService
        .orderManagementProductDetailsFilters,
    orderingScreensConfig:
      store.omsReducer.orderingCommonService.orderingScreensConfig,
    orderingAccessControl:
      store?.omsReducer.orderingCommonService.orderingAccessControl,
    selectedFilters: store.omsReducer.orderManagementService.selectedFilters,
    orderManagementDeepDiveFiltersPayload:
      store.omsReducer.orderManagementService
        .orderManagementDeepDiveFiltersPayload,
    highLevelSummaryState:
      store.omsReducer.orderManagementService.highLevelSummaryState,
    selectedDcs: store.omsReducer.orderManagementService.selectedDcs,
    matrixHandoff: store.omsReducer.orderManagementTableService?.matrixHandoff,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getOmsStyleOrderSummaryColumnConfig: (payload) =>
    dispatch(getOmsStyleOrderSummaryColumnConfig(payload)),
  getOmsStyleOrderSummaryTableData: (payload) =>
    dispatch(getOmsStyleOrderSummaryTableData(payload)),
  setStyleOrderSummaryTableConfigLoader: (payload) =>
    dispatch(setStyleOrderSummaryTableConfigLoader(payload)),
  setStyleOrderSummaryDataLoader: (payload) =>
    dispatch(setStyleOrderSummaryDataLoader(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  closeSnack: (payload) => dispatch(closeSnack(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(StyleOrderSummaryTable);

const customStyles = makeStyles((theme) => ({
  footnoteCard: {
    position: "absolute",
    bottom: 0,
    zIndex: 9,
    left: "160px",
    minHeight: "200px !important",
  },
  footnoteList: {
    listStyle: "none",
    paddingLeft: 0,
  },
  footnoteListItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: "0.75rem",
    marginBottom: "1rem",
  },
  styleOrderSummaryTable: {
    "& .ia-basic-table-layout.table-v32 .card-container .table-footer-section": {
      bottom: "12px",
    },
  },
}));
