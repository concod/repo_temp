import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { connect, useSelector } from "react-redux";
import { isEmpty } from "lodash";
import globalStyles from "core/Styles/globalStyles";
import makeStyles from "@mui/styles/makeStyles";
import moment from "moment/moment";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import { addSnack } from "core/actions/snackbarActions";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { cloneDeep } from "lodash";
import { getHeaderForExcel } from "core/Utils/functions/utils";
import { downloadExcelLink } from "core/Utils/csv-download/index";
import { tenantConfigApiCache } from "core/actions/tenantConfigActions";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import { Badge, Button, Switch, Select, Tooltip, Prompt } from "impact-ui-v3";
import classNames from "classnames";
import InfoIcon from "assets/impactv3/info_icon.svg";
import Monitoring from "assets/impactv3/Monitoring.svg";
import NormalCalendarFiscalMapping from "core/commonComponents/calendar/normalCalendarFiscalMapping";
import {
  BLANK_LIST,
  defaultTableData,
  ERROR_MESSAGE,
  FILE_DOWNLOADING_MESSAGE,
  NO_DATA_FOUND,
  OMS_DASHBOARD_ALERT_ACTION_CONFIG,
  OMS_DASHBOARD_ALERTS_REDIRECT_ROUTES,
  tableConfigurationMetaData,
} from "modules/oms/constants-oms/stringConstants";
import {
  REDIRECT_TO_OMS,
  REDIRECT_TO_MATRIX_SUMMARY,
  REDIRECT_TO_STYLE_ORDER_SUMMARY,
  REDIRECT_TO_DEEP_DIVE,
  REDIRECT_TO_CREATE_NEW_ORDER,
  REDIRECT_TO_CONFIGURATION,
  APPROVAL_FLOW,
  REDIRECT_TO_ORDER_REPOSITORY,
  REDIRECT_TO_EXPEDITE_ORDERS,
  REDIRECT_TO_PO_REBALANCE,
  SELECT_STRATEGY_AND_APPROVE,
  REDIRECT_TO_PRODUCT_DETAILS_APPROVE,
  REDIRECT_TO_PRODUCT_DETAILS_REVIEW,
} from "modules/oms/pages-oms/Decision-Dashboard/Ordering-Alerts/utils/constants";
import {
  getAlertsActionTableConfiguration,
  setAlertsActionTableConfigLoader,
} from "modules/oms/services-oms/Decision-Dashboard/alerts-actions-service";
import {
  buildRecommendedAlertsCountApiPath,
  getRecommendedOrderAlertsTableData,
  getRecommendedOrderAlertsTableCount,
  readAlertCountApiTotal,
  updateResolvedData,
  updateOffcycleExpediteOrdersAlerts,
} from "modules/oms/services-oms/Decision-Dashboard/ordering-alerts-service";
import { fetchExpediteAlertStrategyKpi } from "modules/oms/services-oms/Decision-Dashboard/expedite-order-service";
import {
  CREATE_NEW_ORDER,
  OFF_CYCLE_ORDER_EXPEDITE_ORDERS,
} from "modules/oms/constants-oms/routeConstants";
import SelectStrategyApprovePanel from "./SelectStrategyApprovePanel";
import PackConfigBottomSheet from "modules/oms/pages-oms/common/PackConfigBottomSheet";
import RecoveryWindowGraphPopover from "./RecoveryWindowGraphPopover";
import { getOmsCoreFiscalCalendar } from "modules/oms/services-oms/common/common-services";
import { getValidCheckConfiguration } from "modules/oms/utils-oms/utils";
import {
  ORDER_MANAGEMENT_FILTER_CONFIG,
  ORDER_MANAGEMENT_VENDOR_STORE_FILTER_CONFIG,
} from "modules/oms/constants-oms/apiConstants";

import {
  getOmsDeepDiveFilters,
  setOrderManagementProductDetailsFilters,
} from "modules/oms/services-oms/Order-Management/order-management-service";
import {
  VENDOR_TO_STORE_DEEP_DIVE_FILTERS,
  setDeepDiveFilters,
  setDeepDiveFiltersPayload,
  setSelectedRowsFromOrderDetails,
} from "modules/oms/services-oms/Order-Management/order-management-vendor-to-store-service";
import ApprovalFlowDialog from "modules/oms/pages-oms/Order-Management/components/Approval-Flow-Dialog/ApprovalFlowDialog";
import ApprovalFlowDialogVendorStore from "modules/oms/pages-oms/Order-Management/VendorStore/components/Approval-Flow-Dialog-Vendor-Store/ApprovalFlowDialogVendorStore";
import DeepDiveBottomSheet from "modules/oms/pages-oms/Order-Management/VendorStore/components/Deep-Dive/DeepDiveBottomSheet";
import EmptyStateWrapper from "core/commonComponents/coreComponentScreen/EmptyStateWrapper";
import ReviewRecommendationPopUp from "modules/oms/pages-oms/PO-Rebalance/ReviewRecommendationPopUp";
import PoRebalanceReviewRecommendationTable from "modules/oms/pages-oms/PO-Rebalance/PoRebalanceReviewRecommendationTable";
import {
  getFiscalWeekColumnsForPopUp,
  loadPoRebalanceChoiceContextForAlert,
} from "modules/oms/pages-oms/PO-Rebalance/poRebalanceChoiceDataUtils";
import {
  fetchFiscalWeeks,
  fetchPORebalanceTableData,
  fetchPORebalanceTableFields,
  setPoRebalanceSubClassTableDataLoader,
} from "modules/oms/services-oms/PO-Rebalance/po-rebalance-service";
import {
  buildAndStoreFilters,
  handleDeepDiveRedirect,
  openInNewTab,
  storeDashboardDcSelectionForCreateNewOrder,
  storeDashboardDcSelectionForOrderManagementRedirect,
  storePoRebalanceAlertPayload,
  isPoRebalanceStartWeekSpreadExceeded,
  storeSelectedArticles,
  storeSkuIfCreateOrder,
  storeWeekDates,
  storeExpediteAlertPayload,
  storeExpediteOffCycleArticleLocPayload,
  getExpediteAlertOrderPlacementDateRange,
  storeOrderPlacementDatesFromAlertRows,
} from "../utils/helper";
import { clearExpediteLocalStorage } from "modules/oms/pages-oms/OffCycle Order/Expedite-Orders/constants";

/** Grid search/sort/range from prepareMetaPayload — when absent, list KPI totals match the dataset. */
function manualbodyHasGridScopedMeta(manualbody) {
  if (!manualbody || typeof manualbody !== "object") return false;
  const { search, sort, range } = manualbody;
  return (
    (Array.isArray(search) && search.length > 0) ||
    (Array.isArray(sort) && sort.length > 0) ||
    (Array.isArray(range) && range.length > 0)
  );
}

function stripMetaLimit(meta) {
  if (!meta || typeof meta !== "object") return meta;
  const { limit: _l, ...rest } = meta;
  return rest;
}

function buildScopedCountSignature(alertId, dataPayload) {
  const snapshot = cloneDeep(dataPayload);
  if (snapshot.meta) {
    snapshot.meta = stripMetaLimit(snapshot.meta);
  }
  return JSON.stringify({ alertId: alertId ?? null, ...snapshot });
}

/** Update SSRM row total without purge/refetch (setRowCount is infinite-row-model only). */
function reapplyServerSideRowTotal(ssrmParams, rowData, rowCount) {
  if (!ssrmParams || rowCount == null) return;
  const numericTotal = Number(rowCount);
  if (!Number.isFinite(numericTotal)) return;
  try {
    if (typeof ssrmParams.success === "function") {
      ssrmParams.success({ rowData, rowCount: numericTotal });
      return;
    }
    if (typeof ssrmParams.successCallback === "function") {
      ssrmParams.successCallback(rowData, numericTotal);
    }
  } catch (reapplyError) {
    console.log(reapplyError);
  }
}

const USER_ADJUSTED_ROQ_COLUMNS = [
  "user_adjusted_roq_default_lead_time",
  "user_adjusted_roq_faster_lead_time",
  "user_adjusted_roq_custom_scenario",
];

// Status badge colour coding (impact-ui Badge `color` values).
const STATUS_BADGE_COLOR = {
  approved: "success",
  reviewed: "warning",
  expedited: "info",
  draft: "default",
};

/** Title-case a status string ("expedited" -> "Expedited"). */
const toTitleCase = (str) =>
  String(str ?? "")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const useStyles = makeStyles((theme) => ({
  moduleTitle: {
    ...theme.typography.h3,
  },
  dialogContentBody: {
    borderTop: "none",
  },
  paperFullWidth: {
    overflowY: "visible",
    minWidth: "80%",
  },
  dialogRoot: {
    "& .MuiDialog-paperWidthSm": {
      width: "35rem !important",
      borderRadius: "0.6rem",
    },
  },
  alertInfoTooltipWrap: {
    display: "inline-flex",
    alignItems: "center",
    alignSelf: "center",
    marginRight: 2,
    cursor: "default",
    transform: "translateY(3px)",
  },
  alertInfoTooltipIcon: {
    width: 26,
    height: 26,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 0,
    "& svg": {
      width: 26,
      height: 26,
      display: "block",
    },
  },
}));

const AlertsActionTable = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const [
    alertsActionTableTableConfig,
    setAlertsActionTableTableConfig,
  ] = useState([]);
  const [alertsActionTableData, setAlertsActionTableData] = useState([]);
  const agGridInstance = useRef(null);
  const [totalCount, setTotalCount] = useState(0);
  const [redirectButtons, setRedirectButtons] = useState([]);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalFlowRows, setApprovalFlowRows] = useState([]);
  const [approvalFlowPayload, setApprovalFlowPayload] = useState({});
  const [showStrategyPanel, setShowStrategyPanel] = useState(false);
  const [strategyKpiData, setStrategyKpiData] = useState(null);
  const [strategyKpiLoading, setStrategyKpiLoading] = useState(false);
  const strategyRowsRef = useRef([]);
  const [isSelectAllRecordsLoading, setIsSelectAllRecordsLoading] = useState(
    false
  );
  const [render, setRender] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [tableDataLoader, setTableDataLoader] = useState(false);

  const [roqEdits, setRoqEdits] = useState({});
  const [isSavingRoq, setIsSavingRoq] = useState(false);
  const recommendedPopUpApi = useRef(null);

  const [fiscalCalendarDetails, setFiscalCalendarDetails] = useState([]);

  const downloadLink = useRef(null);
  const [csvData, setCsvData] = useState([]);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [manualBodyData, setManualBodyData] = useState({});

  const [isResolvedSwitchChecked, setIsResolvedSwitchChecked] = useState(false);
  const [hideTable, setHideTable] = useState(false);

  const scopedCountCacheRef = useRef({ signature: null, total: null });
  /** Pending SSRM getRows params for scoped page-0 async count (re-apply success with rowCount). */
  const scopedPageZeroSsrmRef = useRef(null);

  const expediteOrdersConfig = useSelector(
    (state) => state?.omsReducer?.expediteOrdersService?.expediteOrdersConfig
  );

  const expediteOrderingAlertsLimit = useMemo(() => {
    return expediteOrdersConfig?.expedite_orders?.alerts_limit || 0;
  }, [expediteOrdersConfig]);

  /** Prefer totals from oms_decision_dashboard/alerts; toggle false → article_count, true → resolved_article_count. */
  const getPreferredTotalCount = useCallback(() => {
    return isResolvedSwitchChecked
      ? Number(props.articleCount) - Number(props.resolvedArticleCount) || 0
      : Number(props.articleCount) || 0;
  }, [props.articleCount, props.resolvedArticleCount, isResolvedSwitchChecked]);

  const listArticleTotalsAvailable =
    props.articleCount !== undefined && props.articleCount !== null;

  /** Dropdown/date top-right filters scope the dataset; KPI article_count is alert-wide, not filter-specific. */
  const shouldPreferApiListTotal = Boolean(
    props?.screenConfig?.showNewAlertTableDropdownOptions
  );

  useEffect(() => {
    scopedCountCacheRef.current = { signature: null, total: null };
    scopedPageZeroSsrmRef.current = null;
  }, [props.alertId]);

  // Pack Config Details
  const [packConfigState, setPackConfigState] = useState({
    isOpen: false,
    selectedArticle: "",
  });

  const [recoveryWindowGraphState, setRecoveryWindowGraphState] = useState({
    anchorEl: null,
    rowData: null,
  });

  //Vendor To Store
  const [openDeepDive, setOpenDeepDive] = useState(false);
  const [checkAllSetAllRequest, setCheckAllSetAllRequest] = useState([]);

  // top Right Options States
  const [topRightFiltersState, setTopRightFiltersState] = useState({
    dateRange: { fiscalInfoStartDate: null, fiscalInfoEndDate: null },
    dropdown: null,
  });

  const [dropdownState, setDropdownState] = useState({
    isOpen: false,
    currentOptions: [],
    initialOptions: [],
  });

  const [
    poRebalanceRedirectConfirmOpen,
    setPoRebalanceRedirectConfirmOpen,
  ] = useState(false);
  const [poRebalancePopUpOpen, setPoRebalancePopUpOpen] = useState(false);
  const [poRebalanceReviewAlertRow, setPoRebalanceReviewAlertRow] = useState(
    null
  );
  const [poRebalancePopUpInitLoader, setPoRebalancePopUpInitLoader] = useState(
    false
  );
  const [poRebalanceStartWeekId, setPoRebalanceStartWeekId] = useState(null);
  const [poRebalanceEndWeekId, setPoRebalanceEndWeekId] = useState(null);
  const [
    poRebalanceChoiceTableColumns,
    setPoRebalanceChoiceTableColumns,
  ] = useState([]);
  const [poRebalanceSelectedRecords, setPoRebalanceSelectedRecords] = useState(
    []
  );
  const [poRebalanceSelectedChoice, setPoRebalanceSelectedChoice] = useState(
    ""
  );
  const [poRebalanceFormData, setPoRebalanceFormData] = useState({});
  const [poRebalanceFlagEdit, setPoRebalanceFlagEdit] = useState(false);
  const [poRebalancePopUpWeekData, setPoRebalancePopUpWeekData] = useState(
    null
  );
  const [
    poRebalanceOpenReviewRecommendationTable,
    setPoRebalanceOpenReviewRecommendationTable,
  ] = useState(false);
  const [
    poRebalanceOpenRecommendationTableForDraftAndApprove,
    setPoRebalanceOpenRecommendationTableForDraftAndApprove,
  ] = useState(false);
  const [poRebalanceHideSaveDraft, setPoRebalanceHideSaveDraft] = useState(
    false
  );
  const [poRebalanceHideSaveApprove, setPoRebalanceHideSaveApprove] = useState(
    false
  );
  const [
    poRebalanceIsUserHasSaveDraftAccess,
    setPoRebalanceIsUserHasSaveDraftAccess,
  ] = useState(true);
  const [
    poRebalanceIsUserHasApproveAccess,
    setPoRebalanceIsUserHasApproveAccess,
  ] = useState(true);
  const poRebalanceReviewTableRef = useRef(null);
  const poRebalanceAlertVariantRef = useRef("success");
  const [poRebalanceIsApprove, setPoRebalanceIsApprove] = useState(1);

  const isPoRebalanceAlert = props?.alertKey === "po_rebalancing";

  const poRebalanceScreenConfig = props.poRebalanceScreenConfig;
  const poRebalanceHierarchyLabel =
    poRebalanceScreenConfig?.hierarchy_label || "Choice";
  const poRebalanceViewStatusFiscalWeekGroup =
    poRebalanceScreenConfig?.view_status_fiscal_week_group ?? true;
  const poRebalanceChoiceColumnsForPopUp = getFiscalWeekColumnsForPopUp(
    poRebalanceChoiceTableColumns
  );
  const poRebalanceAppliedFilters =
    props.selectedFilters?.length > 0
      ? props.selectedFilters
      : props.filterDashboardConfiguration || [];

  const isPoRebalanceRedirectDisabled = useMemo(
    () =>
      isPoRebalanceAlert &&
      selectedRows.length > 1 &&
      isPoRebalanceStartWeekSpreadExceeded(selectedRows, fiscalCalendarDetails),
    [isPoRebalanceAlert, selectedRows, fiscalCalendarDetails]
  );

  useEffect(() => {
    if (
      props?.screenConfig?.showNewAlertTableDropdownOptions &&
      props?.alertTopRightOptions?.length > 0
    ) {
      const dropdownConfig = props.alertTopRightOptions.find(
        (opt) => opt.type === "dropdown"
      );
      if (dropdownConfig?.default_value && !topRightFiltersState.dropdown) {
        const defaultOption = dropdownConfig.options?.find(
          (opt) => opt.value === dropdownConfig.default_value
        );
        if (defaultOption) {
          setTopRightFiltersState((prev) => ({
            ...prev,
            dropdown: {
              label: defaultOption.label,
              value: defaultOption.value,
            },
          }));
        }
      }
    }
  }, [
    props?.alertTopRightOptions,
    props?.screenConfig?.showNewAlertTableDropdownOptions,
  ]);

  const openDeepDiveBottomSheet = () => {
    preparePayloadForDeepDive();
    setOpenDeepDive(true);
  };
  const closeDeepDiveBottomSheet = () => {
    setOpenDeepDive(false);
    refreshTableData();
  };

  useEffect(() => {
    if (agGridInstance?.current) {
      agGridInstance.current.api.checkAllSetAllRequest = checkAllSetAllRequest;
    }
  }, [checkAllSetAllRequest]);

  const getCheckConfigurationForApproval = () => {
    let l_checkAllSetAllRequest = {
      searchColumns: agGridInstance?.current?.api?.getFilterModel(),
    };
    let setAllData;
    if (
      agGridInstance?.current?.api?.checkConfiguration[
        agGridInstance?.current?.api?.checkConfiguration.length - 2
      ]
    ) {
      setCheckAllSetAllRequest((old) => {
        if (!isEmpty(old)) {
          setAllData = [...old, l_checkAllSetAllRequest];
          return [...old, l_checkAllSetAllRequest];
        } else {
          setAllData = [l_checkAllSetAllRequest];
          return [l_checkAllSetAllRequest];
        }
      });
    }
    const selection = {
      data: getValidCheckConfiguration(
        agGridInstance?.current?.api?.checkConfiguration
      ),
      unique_columns: ["order_group_id"],
    };
    const checkConfig = {
      selection,
      set_all: setAllData,
      isSelectAllRecords: agGridInstance?.current?.api?.isSelectAllRecords,
    };
    return checkConfig;
  };

  const preparePayloadForDeepDive = () => {
    try {
      let appliedOMSFilters = cloneDeep(
        props?.filterDashboardConfiguration || []
      );

      const SELECTED_ROW_FILTER_CONFIG =
        props?.vendorToStoreScreenConfig?.oms_dashboard?.deep_dive
          ?.selected_product_filter || [];
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

  const sizeColumnClickHandler = useCallback((params) => {
    const article = params?.data?.article;
    if (article) {
      setPackConfigState({
        isOpen: true,
        selectedArticle: article,
      });
    }
  }, []);

  const recoveryWindowGraphClickHandler = useCallback((params, event) => {
    event?.stopPropagation?.();
    setRecoveryWindowGraphState({
      anchorEl: event?.currentTarget ?? null,
      rowData: params?.data ?? null,
    });
  }, []);

  const closeRecoveryWindowGraphPopover = useCallback(() => {
    setRecoveryWindowGraphState({ anchorEl: null, rowData: null });
  }, []);

  const handlePackConfigClose = useCallback(() => {
    setPackConfigState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  //For Send For Approval and Approve Scneario
  useEffect(() => {
    //Loads Fiscal Calendar and Filter COnfig
    const fetchFilters = async () => {
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
        setFiscalCalendarDetails(getFinancialCalendarData?.data?.data?.data);
      } catch (error) {
        displaySnackMessages(ERROR_MESSAGE, "error");
        console.log(error);
      }
    };
    fetchFilters();
  }, []);

  //Setting Product Details Filters and Deep Dive Filters in Vendor DC
  useEffect(() => {
    const fetchDeepDiveFiltersForVendorDC = async () => {
      try {
        let deepDiveFilters = await props?.getOmsDeepDiveFilters();
        let productDetailsFilters = [];
        if (deepDiveFilters?.data?.data?.length > 0) {
          productDetailsFilters.push(deepDiveFilters?.data?.data[0]);
        }
        props?.setOrderManagementProductDetailsFilters(productDetailsFilters);
      } catch (err) {
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };

    if (!props?.isCalledFromVendorStore) {
      if (
        props?.orderManagementProductDetailsFilters?.length === 0 ||
        localStorage.getItem("isRedirectedFromDashboardToOms")
      ) {
        fetchDeepDiveFiltersForVendorDC();
      }
    }
  }, []);

  //Fetches the Filters for Deep Dive and Sets the State in Vendor Store
  useEffect(() => {
    const getDeepDiveFiltersForVendorStore = async () => {
      try {
        const deepDiveFiltersResponse = await props?.tenantConfigApiCache(1, {
          attribute_name: VENDOR_TO_STORE_DEEP_DIVE_FILTERS,
        });
        const DEEP_DIVE_FILTERS =
          deepDiveFiltersResponse.data.data[0]?.attribute_value?.filters || [];
        props?.setDeepDiveFilters(DEEP_DIVE_FILTERS);
      } catch (error) {
        console.log(
          "Error in Fetching Deep Dive Filters for Vendor Store",
          error
        );
      }
    };
    if (
      props?.isCalledFromVendorStore &&
      props?.deepDiveFiltersForVendorStore?.length === 0
    ) {
      getDeepDiveFiltersForVendorStore();
    }
  }, []);

  /** Get row IDs that are currently deselected in the grid (used when isSelectAllRecords and user unchecked some rows). */
  const getDeselectedRowIdsFromGrid = () => {
    const deselectedIds = new Set();
    const api = agGridInstance?.current?.api;
    if (!api?.forEachNode) return deselectedIds;
    api.forEachNode((node) => {
      if (node.data && node.selected === false && node.data.id != null) {
        deselectedIds.add(String(node.data.id));
      }
    });
    return deselectedIds;
  };

  /** Fetch all alert rows for current filters (used when "Select all records" is active). */
  const fetchAllAlertRowsForSelectAll = async () => {
    let effectiveTotal = totalCount;
    if (manualbodyHasGridScopedMeta(manualBodyData) && effectiveTotal <= 0) {
      const previewBody = buildRequestBody(manualBodyData, {
        limit: 10,
        page: 1,
      });
      const signature = buildScopedCountSignature(
        props.alertId,
        previewBody.data
      );
      const cache = scopedCountCacheRef.current;
      if (cache.signature === signature && cache.total != null) {
        effectiveTotal = cache.total;
      } else {
        const countPath = buildRecommendedAlertsCountApiPath(
          props.tableDataApiName
        );
        if (countPath) {
          try {
            const countResponse = await props.getRecommendedOrderAlertsTableCount(
              {
                tableDataApi: countPath,
                data: previewBody.data,
              }
            );
            const countFromApi = readAlertCountApiTotal(countResponse);
            if (countFromApi != null) {
              effectiveTotal = countFromApi;
              scopedCountCacheRef.current = { signature, total: countFromApi };
            }
          } catch (countRequestError) {
            displaySnackMessages(ERROR_MESSAGE, "error");
            console.log(countRequestError);
          }
        }
      }
    }
    if (effectiveTotal <= 0) return null;

    const body = buildRequestBody(manualBodyData, {
      limit: effectiveTotal,
      page: 1,
    });

    try {
      setIsSelectAllRecordsLoading(true);
      const response = await props.getRecommendedOrderAlertsTableData(body);
      if (!response?.data?.status || !response?.data?.data?.result) return null;
      return response.data.data.result;
    } catch (e) {
      return null;
    } finally {
      setIsSelectAllRecordsLoading(false);
    }
  };

  const onApprovalComplete = async (selectedRowsOverride = null) => {
    let ids;
    if (selectedRowsOverride != null && selectedRowsOverride.length > 0) {
      ids = selectedRowsOverride.map((row) =>
        typeof row === "object" ? row.id : row
      );
    } else {
      const isSelectAllRecords =
        agGridInstance?.current?.api?.isSelectAllRecords;
      if (isSelectAllRecords) {
        const fetchedRows = await fetchAllAlertRowsForSelectAll();
        if (!fetchedRows?.length) {
          displaySnackMessages(ERROR_MESSAGE, "error");
          return;
        }
        const deselectedIds = getDeselectedRowIdsFromGrid();
        const effectiveRows = fetchedRows.filter(
          (r) => !deselectedIds.has(String(r.id))
        );
        if (!effectiveRows?.length) {
          displaySnackMessages(BLANK_LIST, "error");
          return;
        }
        ids = effectiveRows.map((r) => r.id);
      } else {
        ids = selectedRows.map((val) => val.id);
      }
    }
    const data = {
      ids,
      alert_id: props.alertId,
      vendor_store: props?.isCalledFromVendorStore ?? undefined,
    };
    const responseFromResolvedData = await props.updateResolvedData(data);
    if (!responseFromResolvedData?.data?.status) {
      displaySnackMessages(ERROR_MESSAGE, "error");
      console.log("Failed to update resolved data");
    }
  };

  const refreshTableData = () => {
    agGridInstance?.current?.api?.refreshServerSideStore({
      purge: true,
    });
    props?.setReloadAlerts(true);
    agGridInstance.current?.api?.deselectAll();
    setSelectedRows([]);
  };

  const isDraftBackedRow = (row) =>
    row?.draft_id !== null &&
    row?.draft_id !== undefined &&
    row?.draft_id !== "";

  const handleStatusDraftClick = (params) => {
    const row = params?.data || {};
    const draftId = row?.draft_id;
    if (!draftId) return;
    const isExpediteDraft =
      row?.is_expedite_draft === true ||
      (row?.draft_type || "").toLowerCase().includes("expedite");
    const url = isExpediteDraft
      ? `${OFF_CYCLE_ORDER_EXPEDITE_ORDERS}?draft_id=${draftId}&tab=before`
      : `${CREATE_NEW_ORDER}?type=offcycle&step=1&draft_id=${draftId}`;
    window.open(url, "_self", "noopener,noreferrer");
  };

  const hasRoqEdits = Object.keys(roqEdits).length > 0;

  const handleSaveRoqEdits = async () => {
    const entries = Object.values(roqEdits);
    if (!entries.length) return;
    try {
      setIsSavingRoq(true);
      const payload = {
        modifications: [{ modified: entries.map((product) => ({ product })) }],
      };
      const response = await props.updateOffcycleExpediteOrdersAlerts(payload);
      if (response?.data?.status) {
        displaySnackMessages("Changes saved successfully", "success");
        setRoqEdits({});
        agGridInstance?.current?.api?.refreshServerSideStore({ purge: true });
        props?.setReloadAlerts?.(true);
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    } catch (error) {
      console.error(error);
      displaySnackMessages(ERROR_MESSAGE, "error");
    } finally {
      setIsSavingRoq(false);
    }
  };

  useEffect(() => {
    const fetchColumnConfig = async () => {
      props.setAlertsActionTableConfigLoader(true);

      let columns;
      if (props.tableConfigName) {
        const payload = {
          tableConfigName: props.tableConfigName,
        };
        columns = await props.getAlertsActionTableConfiguration(payload);
      }
      let updatedColumns = columns?.data?.data?.filter(
        (col) => col.column_name !== "action"
      );

      if (props?.isActionButtonPresent) {
        let reviewRecommendationColumn = {
          ...OMS_DASHBOARD_ALERT_ACTION_CONFIG[1],
        };
        reviewRecommendationColumn.order_of_display = updatedColumns.length + 1;
        reviewRecommendationColumn.tc_code = updatedColumns[1]?.tc_code;
        reviewRecommendationColumn.tc_mapping_code =
          updatedColumns[1]?.tc_mapping_code;
        updatedColumns.push(reviewRecommendationColumn);
      }
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
      let isGrouping = false;
      let rowGroupingColumnIndex = 0;
      formattedColumns = formattedColumns.map((col, index) => {
        if (col?.column_name === "action") {
          col.pinned = "right";
          col.minWidth = 200;
        }
        if (col?.extra?.is_grouping_key) {
          col.cellRenderer = "agGroupCellRenderer";
          isGrouping = true;
          rowGroupingColumnIndex = index;
        }
        col?.children?.map((child) => {
          if (child?.extra?.is_grouping_key) {
            child.cellRenderer = "agGroupCellRenderer";
            isGrouping = true;
          }

          if (USER_ADJUSTED_ROQ_COLUMNS.includes(child.column_name)) {
            child.cellRenderer = (params, extraProps) => {
              if (params?.node?.level === 0) {
                return (
                  <CellRenderers
                    cellData={params}
                    column={child}
                    extraProps={extraProps}
                    actions={null}
                  ></CellRenderers>
                );
              }
              const cellValue = params?.value;
              return (
                <span>
                  {cellValue === null || cellValue === undefined
                    ? ""
                    : cellValue}
                </span>
              );
            };
          }

          if (child.column_name === "pack_id") {
            child.cellRenderer = (params, extraProps) => {
              const cellValue = params?.value || params?.data?.view_pack_config;

              if (cellValue === "View Pack Config") {
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

          return child;
        });

        if (col.column_name === "shipment_mode" && isGrouping) {
          col.cellRenderer = (params, extraProps) => {
            if (
              params.node.level === 0 &&
              Array.isArray(params.data?.shipment_modes) &&
              col.is_editable
            ) {
              col.options = params?.data?.shipment_modes.map((mode) => {
                return {
                  label: mode.shipment_mode,
                  value: mode.shipment_mode,
                };
              });
              return (
                <CellRenderers
                  cellData={params}
                  column={col}
                  extraProps={extraProps}
                  actions={null}
                ></CellRenderers>
              );
            } else {
              return (
                params?.data?.shipment_mode ||
                params?.data?.shipment_modes?.join(", ") ||
                ""
              );
            }
          };
        }

        if (col.column_name === "pack_id") {
          col.cellRenderer = (params, extraProps) => {
            const cellValue = params?.value || params?.data?.view_pack_config;

            if (cellValue === "View Pack Config") {
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

        if (
          props?.isExpeditePosRawROQAlert &&
          col.column_name === "recovery_window"
        ) {
          col.cellRenderer = (params) => (
            <Button
              variant="url"
              onClick={(event) =>
                recoveryWindowGraphClickHandler(params, event)
              }
            >
              View Graph
            </Button>
          );
        }

        const targetIndexForBadge = isGrouping
          ? rowGroupingColumnIndex === 0
            ? 1
            : 0
          : 0;

        if (index === targetIndexForBadge) {
          col["minWidth"] = 200;
          col["width"] = 200;
          col.cellRenderer = (cellProps, extraProps) => {
            const status = cellProps?.data?.status;
            const is_resolved = cellProps?.data?.is_resolved;
            const is_approved = cellProps?.data?.is_approved;
            const is_expedited = cellProps?.data?.is_expedited;
            const value = cellProps?.value;
            const hasStatus =
              status !== null && status !== undefined && status !== "";
            const showLegacyBadges = is_resolved || is_approved || is_expedited;
            return (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 8,
                  height: "100%",
                }}
              >
                {value !== status ? value : null}
                {hasStatus ? (
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    <Badge
                      color={
                        STATUS_BADGE_COLOR[String(status).toLowerCase()] ||
                        "success"
                      }
                      label={toTitleCase(status)}
                      size="default"
                      variant="stroke"
                      {...(isDraftBackedRow(cellProps?.data)
                        ? {
                            onClick: () => handleStatusDraftClick(cellProps),
                            style: { cursor: "pointer" },
                          }
                        : {})}
                    />
                  </div>
                ) : (
                  showLegacyBadges && (
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      {is_resolved && (
                        <Badge
                          color="success"
                          label="Reviewed"
                          onClick={() => {}}
                          size="default"
                          variant="stroke"
                        />
                      )}
                      {is_approved && (
                        <Badge
                          color="success"
                          label="Approved"
                          onClick={() => {}}
                          size="default"
                          variant="stroke"
                        />
                      )}
                      {is_expedited && (
                        <Badge
                          color="success"
                          label="Expedited"
                          onClick={() => {}}
                          size="default"
                          variant="stroke"
                        />
                      )}
                    </div>
                  )
                )}
              </div>
            );
          };
        }

        return col;
      });

      if (isGrouping) {
        formattedColumns = formattedColumns.map((col) => {
          if (col.column_name === "action") {
            col.cellRenderer = (params, extraProps) => {
              if (
                params.node.level === 0 &&
                (params.data.product_details || isPoRebalanceAlert) &&
                col.is_editable
              ) {
                return (
                  <CellRenderers
                    cellData={params}
                    column={col}
                    extraProps={extraProps}
                    actions={null}
                  ></CellRenderers>
                );
              } else {
                return "";
              }
            };
          }
          return col;
        });
      }
      setAlertsActionTableTableConfig(formattedColumns);
      props.setAlertsActionTableConfigLoader(false);
      setRender(true);
    };
    fetchColumnConfig();

    return () => {
      setAlertsActionTableTableConfig([]);
      setAlertsActionTableData([]);
    };
  }, []);

  const buildRequestBody = useCallback(
    (manualbody, limitPage) => {
      const filters = { filters: [] };
      props.selectedFilters.forEach((filter) => {
        const dim = filter.dimension?.toLowerCase() || "";
        if ((dim === "product" || dim === "dc") && filter?.values?.length > 0) {
          filters.filters.push(filter);
        }
      });
      const body = {
        data: {
          ...filters,
          vendor_store: props?.isCalledFromVendorStore ?? undefined,
          meta: manualbody
            ? { ...manualbody, limit: limitPage }
            : {
                ...tableConfigurationMetaData.meta,
                limit: limitPage,
              },
        },
        tableDataApi: props?.tableDataApiName,
      };
      if (isResolvedSwitchChecked) {
        body.data.show_non_reviewed = isResolvedSwitchChecked;
      }
      if (
        props?.screenConfig?.showNewAlertTableDropdownOptions &&
        props?.alertTopRightOptions?.length > 0
      ) {
        if (
          topRightFiltersState.dateRange?.fiscalInfoStartDate &&
          topRightFiltersState.dateRange?.fiscalInfoEndDate
        ) {
          const dateFilterKey =
            props?.alertTopRightOptions?.find(
              (opt) => opt.type === "date_range_picker"
            )?.filter_key || "first_projected_delivery_date";
          body.data[dateFilterKey] = {
            start_date:
              topRightFiltersState.dateRange.fiscalInfoStartDate
                ?.actualSelectedDate ||
              topRightFiltersState.dateRange.fiscalInfoStartDate
                ?.calendar_week_start_date,
            end_date:
              topRightFiltersState.dateRange.fiscalInfoEndDate
                ?.actualSelectedDate ||
              topRightFiltersState.dateRange.fiscalInfoEndDate
                ?.calendar_week_start_date,
          };
        }
        const dropdownConfig = props?.alertTopRightOptions?.find(
          (opt) => opt.type === "dropdown"
        );
        if (dropdownConfig) {
          const dropdownFilterKey = dropdownConfig.filter_key || "view_rows";
          const dropdownValue =
            topRightFiltersState.dropdown?.value ||
            dropdownConfig.default_value;
          if (dropdownValue) {
            body.data[dropdownFilterKey] = dropdownValue;
          }
        }
      }
      return body;
    },
    [
      props.selectedFilters,
      props?.isCalledFromVendorStore,
      props?.tableDataApiName,
      props?.screenConfig?.showNewAlertTableDropdownOptions,
      props?.alertTopRightOptions,
      isResolvedSwitchChecked,
      topRightFiltersState.dateRange,
      topRightFiltersState.dropdown,
    ]
  );

  const manualCallBack = async (manualbody, pageIndex, params) => {
    try {
      const limitPage = {
        limit: 10,
        page: Number(pageIndex) ? pageIndex + 1 : 1,
      };
      const body = buildRequestBody(manualbody, limitPage);
      const hasScoped = manualbodyHasGridScopedMeta(manualbody);
      const signature = buildScopedCountSignature(props.alertId, body.data);
      const cache = scopedCountCacheRef.current;
      const cacheHit =
        hasScoped && cache.signature === signature && cache.total != null;
      const countPath = buildRecommendedAlertsCountApiPath(
        props.tableDataApiName
      );
      const startScopedCount = hasScoped && !cacheHit && Boolean(countPath);

      const detailsPromise = props.getRecommendedOrderAlertsTableData(body);
      const countPromise = startScopedCount
        ? props.getRecommendedOrderAlertsTableCount({
            tableDataApi: countPath,
            data: body.data,
          })
        : null;

      setManualBodyData(body.data.meta);
      setTableDataLoader(true);

      const response = await detailsPromise;
      setTableDataLoader(false);

      if (!response.data.status) {
        displaySnackMessages(ERROR_MESSAGE, "error");
        return defaultTableData;
      }

      let alerts = response.data?.data?.result?.map((alert) => {
        alert.action = props?.actionButtonLabel || "View PO";
        // Expedite alert: grey out "View PO" when po_count is 0
        if (props?.isExpeditePosRawROQAlert) {
          alert.disableAction = "po_count";
        }
        return alert;
      });
      if (!alerts) {
        alerts = [];
      }
      const formatedData = agGridRowFormatter(
        alerts,
        params?.api?.checkConfiguration,
        "unique_row_id"
      );
      if (props?.popupConfig) {
        recommendedPopUpApi.current = props?.popupConfig;
      }
      if (response.data?.data.recommended) {
        recommendedPopUpApi.current = response.data?.data.recommended;
      }
      setRedirectButtons(props?.alertButtons || []);

      const detailsFallbackTotal =
        response.data?.total != null &&
        !Number.isNaN(Number(response.data.total))
          ? Number(response.data.total)
          : null;

      let returnPayload;

      if (!hasScoped) {
        const listTotal = shouldPreferApiListTotal
          ? detailsFallbackTotal ??
            (listArticleTotalsAvailable ? getPreferredTotalCount() : 0)
          : listArticleTotalsAvailable
          ? getPreferredTotalCount()
          : detailsFallbackTotal ?? 0;
        setTotalCount(listTotal);
        returnPayload = { data: formatedData, totalCount: listTotal };
      } else {
        // Scoped meta: count request starts in parallel with details; page > 0 awaits the in-flight count
        // (wall time ≈ max(details, count) vs sequential). Page 0 returns rows first, then re-applies total.
        const scopedTotalFromCache = cacheHit ? cache.total : null;

        if (scopedTotalFromCache != null) {
          setTotalCount(scopedTotalFromCache);
          returnPayload = {
            data: formatedData,
            totalCount: scopedTotalFromCache,
          };
        } else if (pageIndex > 0) {
          let scopedTotal = null;
          if (countPromise) {
            try {
              const countResponse = await countPromise;
              scopedTotal = readAlertCountApiTotal(countResponse);
              if (scopedTotal != null) {
                scopedCountCacheRef.current = { signature, total: scopedTotal };
              }
            } catch (countRequestError) {
              displaySnackMessages(ERROR_MESSAGE, "error");
              console.log(countRequestError);
            }
          }
          const effectiveTotal =
            scopedTotal != null
              ? scopedTotal
              : detailsFallbackTotal != null
              ? detailsFallbackTotal
              : 0;
          setTotalCount(effectiveTotal);
          returnPayload = { data: formatedData, totalCount: effectiveTotal };
        } else {
          setTotalCount(detailsFallbackTotal ?? 0);
          returnPayload = { data: formatedData };
          scopedPageZeroSsrmRef.current = {
            signature,
            rowData: formatedData,
            ssrmParams: params,
          };
          if (countPromise) {
            countPromise
              .then((countResponse) => {
                const resolvedTotal = readAlertCountApiTotal(countResponse);
                if (resolvedTotal == null) return;
                scopedCountCacheRef.current = {
                  signature,
                  total: resolvedTotal,
                };
                setTotalCount(resolvedTotal);
                const pendingSsrm = scopedPageZeroSsrmRef.current;
                if (
                  pendingSsrm &&
                  pendingSsrm.signature === signature &&
                  pendingSsrm.rowData &&
                  pendingSsrm.ssrmParams
                ) {
                  reapplyServerSideRowTotal(
                    pendingSsrm.ssrmParams,
                    pendingSsrm.rowData,
                    resolvedTotal
                  );
                  scopedPageZeroSsrmRef.current = null;
                }
              })
              .catch((countRequestError) => {
                displaySnackMessages(ERROR_MESSAGE, "error");
                console.log(countRequestError);
              });
          }
        }
      }

      return returnPayload;
    } catch (error) {
      setTableDataLoader(false);
      displaySnackMessages(ERROR_MESSAGE, "error");
      return defaultTableData;
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

  useEffect(() => {
    !isEmpty(props.selectedFilters) && setRender(false);
  }, [props.selectedFilters]);

  const onSelectionChanged = (event) => {
    let selectedRows = [];
    agGridInstance.current.api.forEachNode((node) => {
      node.selected && selectedRows.push({ ...node.data });
    });
    setSelectedRows(selectedRows);
  };

  const loadAlertsTableInstance = (params) => {
    agGridInstance.current = params;
  };

  const resolveRowsForApproval = async () => {
    const isSelectAllRecords = agGridInstance?.current?.api?.isSelectAllRecords;
    if (isSelectAllRecords) {
      const fetchedRows = await fetchAllAlertRowsForSelectAll();
      if (!fetchedRows?.length) {
        displaySnackMessages(ERROR_MESSAGE, "error");
        return null;
      }
      const deselectedIds = getDeselectedRowIdsFromGrid();
      const effectiveRows = fetchedRows.filter(
        (r) => !deselectedIds.has(String(r.id))
      );
      if (!effectiveRows.length) {
        displaySnackMessages(BLANK_LIST, "error");
        return null;
      }
      return effectiveRows;
    }
    return selectedRows;
  };

  const launchApprovalFlow = (rowsForApproval) => {
    setApprovalFlowRows(rowsForApproval);
    localStorage.setItem(
      "approvalFlowFilters",
      JSON.stringify(props?.selectedFilters)
    );
    if (props?.isExpeditePosRawROQAlert) {
      setApprovalFlowPayload({
        recommendedOrderPlacementDateRange: getExpediteAlertOrderPlacementDateRange(),
      });
    } else {
      setApprovalFlowPayload({});
    }
    setShowApprovalModal(true);
    onApprovalComplete(rowsForApproval);
  };

  const buildStrategyKpiPayload = (rows) => {
    const uniqueArticles = [
      ...new Set((rows || []).map((row) => row?.article).filter(Boolean)),
    ];
    return {
      choiceDcCombinations: uniqueArticles,
      filters: props?.selectedFilters || [],
      dateFilter: [
        {
          attribute_name: "order_placement_recom_date",
          start_date: null,
          end_date: null,
        },
        { attribute_name: "not_before_date", start_date: null, end_date: null },
      ],
      dashboardFilters: props?.selectedFilters || null,
    };
  };

  /** Open the strategy side panel and fetch its KPI block. */
  const openStrategyPanel = async (rows) => {
    strategyRowsRef.current = rows;
    setStrategyKpiData(null);
    setShowStrategyPanel(true);
    setStrategyKpiLoading(true);
    try {
      const kpiBlock = await props.fetchExpediteAlertStrategyKpi(
        buildStrategyKpiPayload(rows)
      );
      if (kpiBlock) {
        setStrategyKpiData(kpiBlock);
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    } catch (error) {
      console.error(error);
      displaySnackMessages(ERROR_MESSAGE, "error");
    } finally {
      setStrategyKpiLoading(false);
    }
  };

  const closeStrategyPanel = () => {
    setShowStrategyPanel(false);
    setStrategyKpiData(null);
    setStrategyKpiLoading(false);
  };

  /** Panel "Approve": close the panel and run the standard approval flow. */
  const handleStrategyApprove = () => {
    const rowsForApproval = strategyRowsRef.current;
    setShowStrategyPanel(false);
    if (rowsForApproval?.length) {
      launchApprovalFlow(rowsForApproval);
    }
  };

  const handleReviewRecommendation = async (redirect) => {
    const isSelectAllRecords = agGridInstance?.current?.api?.isSelectAllRecords;
    const hasSelection = isSelectAllRecords || selectedRows?.length > 0;
    if (!hasSelection) {
      displaySnackMessages(BLANK_LIST, "error");
      return;
    }
    if (redirect === APPROVAL_FLOW) {
      try {
        const rowsForApproval = await resolveRowsForApproval();
        if (!rowsForApproval?.length) return;
        launchApprovalFlow(rowsForApproval);
      } catch (error) {
        console.error(error);
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    } else if (redirect === SELECT_STRATEGY_AND_APPROVE) {
      try {
        const rowsForApproval = await resolveRowsForApproval();
        if (!rowsForApproval?.length) return;
        await openStrategyPanel(rowsForApproval);
      } catch (error) {
        console.error(error);
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    } else if (
      props?.isCalledFromVendorStore &&
      redirect === REDIRECT_TO_DEEP_DIVE
    ) {
      openDeepDiveBottomSheet();
      onApprovalComplete();
    } else if (redirect === REDIRECT_TO_PO_REBALANCE) {
      if (isPoRebalanceRedirectDisabled) {
        return;
      }
      setPoRebalanceRedirectConfirmOpen(true);
    } else {
      redirectToReviewRecommendation(redirect);
    }
  };

  const redirectToReviewRecommendation = async (redirect) => {
    try {
      if (props?.isCalledFromVendorStore) {
        localStorage.setItem("isRedirectedFromVendorStore", "true");
      }

      const isSelectAllRecords =
        agGridInstance?.current?.api?.isSelectAllRecords;

      let rowsForRedirect = selectedRows;

      if (redirect === REDIRECT_TO_EXPEDITE_ORDERS) {
        // Expedite cap is on unique articles (not rows) — one article can span
        // multiple DC/child rows, so we dedupe by `article` before comparing.
        const sourceRowsForCount = isSelectAllRecords
          ? null // deferred: unique-article count is enforced after fetch below
          : selectedRows;
        if (sourceRowsForCount) {
          const uniqueArticleCount = new Set(
            sourceRowsForCount.map((r) => r.article).filter(Boolean)
          ).size;
          if (uniqueArticleCount > expediteOrderingAlertsLimit) {
            displaySnackMessages(
              `Only the first ${expediteOrderingAlertsLimit} articles will be processed.`,
              "warning"
            );
          }
        }
      }

      if (isSelectAllRecords) {
        const fetchedRows = await fetchAllAlertRowsForSelectAll();
        if (!fetchedRows?.length) {
          displaySnackMessages(ERROR_MESSAGE, "error");
          return;
        }
        const deselectedIds = getDeselectedRowIdsFromGrid();
        const effectiveRows = fetchedRows.filter(
          (r) => !deselectedIds.has(String(r.id))
        );
        if (!effectiveRows.length) {
          displaySnackMessages(BLANK_LIST, "error");
          return;
        }
        rowsForRedirect = effectiveRows;
      }

      // Build payload and helpers from the resolved row set.
      const payload = {
        ids: rowsForRedirect.map((row) => row.id),
        alert_id: props.alertId,
        vendor_store: props?.isCalledFromVendorStore ?? undefined,
      };
      storeSkuIfCreateOrder(redirect, rowsForRedirect);
      const filterData = buildAndStoreFilters(props, rowsForRedirect);
      storeWeekDates();
      if (redirect === REDIRECT_TO_CREATE_NEW_ORDER) {
        storeDashboardDcSelectionForCreateNewOrder(
          props.orderingDashboardSelectedDcs,
          props.selectedFilters
        );
      }

      // omsSelectedRows is written only for non-expedite redirects.
      // The expedite flow uses omsExpediteAlertPayload instead.
      if (redirect !== REDIRECT_TO_EXPEDITE_ORDERS) {
        localStorage.setItem(
          "omsSelectedRows",
          JSON.stringify([rowsForRedirect[0]])
        );
      }

      const updateResolvedAndRefresh = async () => {
        const res = await props.updateResolvedData(payload);
        if (res?.data?.status) {
          agGridInstance?.current?.api?.refreshServerSideStore({ purge: true });
          props?.setReloadAlerts(true);
        }
      };

      let shouldOpenInNewTab = true;

      switch (redirect) {
        case REDIRECT_TO_MATRIX_SUMMARY:
        case REDIRECT_TO_OMS:
          localStorage.setItem("isRedirectedFromDashboardToOms", true);
          localStorage.setItem(
            "redirect_filter_level",
            JSON.stringify(filterData.extraFilterLevels)
          );
          storeDashboardDcSelectionForOrderManagementRedirect(
            props.orderingDashboardSelectedDcs,
            props.selectedFilters
          );
          break;

        case REDIRECT_TO_PRODUCT_DETAILS_APPROVE: {
          const orderPlacementDateRange = storeOrderPlacementDatesFromAlertRows(
            rowsForRedirect
          );
          const selectedStyles = rowsForRedirect.map(
            (row) => row?.[props?.redirectionLevel]
          );
          const redirectPayload = {
            isRedirection: true,
            selectedFilters: filterData.filters,
            dateFilters: [],
            selectedRowIds: selectedStyles,
            tabSelected: "style_order_summary",
            isRedirectedFromISModules: true,
          };

          localStorage.setItem("isRedirectedFromDashboardToOms", true);
          localStorage.setItem(
            "redirect_filter_level",
            JSON.stringify(filterData.extraFilterLevels)
          );
          localStorage.setItem(
            "omsRedirectionDetails",
            JSON.stringify(redirectPayload)
          );
          storeDashboardDcSelectionForOrderManagementRedirect(
            props.orderingDashboardSelectedDcs,
            props.selectedFilters
          );
          if (orderPlacementDateRange) {
            localStorage.setItem(
              "omsAlertOrderPlacementDateRange",
              JSON.stringify(orderPlacementDateRange)
            );
          }
          localStorage.setItem("omsAlertOpenApprovalPane", "true");
          break;
        }

        case REDIRECT_TO_PRODUCT_DETAILS_REVIEW: {
          const orderPlacementDateRange = storeOrderPlacementDatesFromAlertRows(
            rowsForRedirect
          );
          const selectedStyles = rowsForRedirect.map(
            (row) => row?.[props?.redirectionLevel]
          );
          const redirectPayload = {
            isRedirection: true,
            selectedFilters: filterData.filters,
            dateFilters: [],
            selectedRowIds: selectedStyles,
            tabSelected: "style_order_summary",
            isRedirectedFromISModules: true,
          };

          localStorage.setItem("isRedirectedFromDashboardToOms", true);
          localStorage.setItem(
            "redirect_filter_level",
            JSON.stringify(filterData.extraFilterLevels)
          );
          localStorage.setItem(
            "omsRedirectionDetails",
            JSON.stringify(redirectPayload)
          );
          storeDashboardDcSelectionForOrderManagementRedirect(
            props.orderingDashboardSelectedDcs,
            props.selectedFilters
          );

          if (orderPlacementDateRange) {
            localStorage.setItem(
              "omsAlertOrderPlacementDateRange",
              JSON.stringify(orderPlacementDateRange)
            );
          }
          localStorage.removeItem("omsAlertOpenApprovalPane");
          break;
        }

        case REDIRECT_TO_DEEP_DIVE:
        case REDIRECT_TO_STYLE_ORDER_SUMMARY:
          shouldOpenInNewTab = false;
          await handleDeepDiveRedirect(
            redirect,
            filterData.filters,
            rowsForRedirect,
            props
          );
          break;

        case REDIRECT_TO_EXPEDITE_ORDERS: {
          // 1. Clear any prior expedite state immediately — new flow starts fresh.
          clearExpediteLocalStorage();

          // 2. Get the unique articles from the rowsForRedirect.
          const uniqueArticles = [];
          let allowedArticles;
          const seenArticles = new Set();
          rowsForRedirect.forEach((row) => {
            if (row.article && !seenArticles.has(row.article)) {
              seenArticles.add(row.article);
              uniqueArticles.push(row.article);
            }
          });
          allowedArticles = [...uniqueArticles];

          if (uniqueArticles.length > expediteOrderingAlertsLimit) {
            allowedArticles = [
              ...new Set(uniqueArticles.slice(0, expediteOrderingAlertsLimit)),
            ];

            // Select-All path: surface the cap warning here since we now know
            // the true unique-article count of the effective fetched dataset.
            if (isSelectAllRecords) {
              displaySnackMessages(
                `Only the first ${expediteOrderingAlertsLimit} articles will be selected and processed.`,
                "warning"
              );
            }
          }

          // 3. Store minimal payload (choice only) for session bootstrap.
          storeExpediteAlertPayload(
            allowedArticles,
            filterData.filters,
            props?.selectedFilters
          );
          storeExpediteOffCycleArticleLocPayload(
            rowsForRedirect,
            filterData.filters,
            props?.selectedFilters
          );
          break;
        }

        case REDIRECT_TO_CREATE_NEW_ORDER:
          break;

        case REDIRECT_TO_CONFIGURATION:
          storeSelectedArticles();
          break;

        case REDIRECT_TO_ORDER_REPOSITORY:
          localStorage.removeItem("selectedSku");
          break;

        case REDIRECT_TO_PO_REBALANCE:
          storePoRebalanceAlertPayload(
            rowsForRedirect,
            filterData.filters,
            props?.selectedFilters
          );
          break;

        default:
          shouldOpenInNewTab = false;
          displaySnackMessages(ERROR_MESSAGE, "error");
          return;
      }

      if (shouldOpenInNewTab) {
        if (props?.isExpeditePosRawROQAlert) {
          setTimeout(() => {
            openInNewTab(redirect);
          }, 3000);
        } else {
          openInNewTab(redirect);
        }
      }

      if (redirect === REDIRECT_TO_PO_REBALANCE) {
        // PO Rebalance alert  update api needs to be handles in phase 2 till then avoid calling it
        agGridInstance?.current?.api?.refreshServerSideStore({ purge: true });
        props?.setReloadAlerts?.(true);
      } else {
        await updateResolvedAndRefresh();
      }
    } catch (error) {
      console.error(error);
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  const confirmPoRebalanceRedirect = async () => {
    setPoRebalanceRedirectConfirmOpen(false);
    await redirectToReviewRecommendation(REDIRECT_TO_PO_REBALANCE);
  };

  const cancelPoRebalanceRedirect = () => {
    setPoRebalanceRedirectConfirmOpen(false);
  };

  const resetPoRebalancePopUpState = () => {
    setPoRebalanceFormData({});
    setPoRebalanceFlagEdit(false);
    setPoRebalancePopUpWeekData(null);
    setPoRebalanceOpenReviewRecommendationTable(false);
    setPoRebalanceOpenRecommendationTableForDraftAndApprove(false);
    setPoRebalanceSelectedRecords([]);
    setPoRebalanceSelectedChoice("");
    setPoRebalanceChoiceTableColumns([]);
    setPoRebalanceStartWeekId(null);
    setPoRebalanceEndWeekId(null);
  };

  const closePoRebalanceReviewPopUp = ({ refreshAlerts = false } = {}) => {
    // Close first (like PO Rebalance setOpenPopUp(false)); reset runs in useEffect
    setPoRebalancePopUpOpen(false);
    setPoRebalanceReviewAlertRow(null);
    if (refreshAlerts) {
      setTimeout(() => {
        refreshTableData();
      }, 0);
    }
  };

  const handlePoRebalanceReviewPopUpOpenChange = (open) => {
    if (open === false) {
      closePoRebalanceReviewPopUp({ refreshAlerts: false });
    }
  };

  const handlePoRebalanceReviewAlertVariant = (variant) => {
    if (variant) {
      poRebalanceAlertVariantRef.current = variant;
    }
  };

  const handlePoRebalanceReviewAlertMessage = (message) => {
    if (!message) return;
    const variant =
      poRebalanceAlertVariantRef.current === "error" ? "error" : "success";
    displaySnackMessages(message, variant);
  };

  useEffect(() => {
    if (!poRebalancePopUpOpen || !poRebalanceReviewAlertRow) {
      if (!poRebalancePopUpOpen) {
        resetPoRebalancePopUpState();
      }
      return;
    }

    let cancelled = false;
    (async () => {
      setPoRebalancePopUpInitLoader(true);
      try {
        const result = await loadPoRebalanceChoiceContextForAlert({
          alertRow: poRebalanceReviewAlertRow,
          selectedFilters: poRebalanceAppliedFilters,
          omsScreenConfig: poRebalanceScreenConfig,
          fetchFiscalWeeksApi: props.fetchFiscalWeeks,
          fetchTableFields: props.fetchPORebalanceTableFields,
          fetchTableData: props.fetchPORebalanceTableData,
        });
        if (cancelled) return;
        if (!result.ok) {
          displaySnackMessages(result.message, result.variant);
          closePoRebalanceReviewPopUp();
          return;
        }
        setPoRebalanceStartWeekId(result.startWeekId);
        setPoRebalanceEndWeekId(result.endWeekId);
        setPoRebalanceChoiceTableColumns(result.choiceTableColumns);
        setPoRebalanceSelectedChoice(result.selectedChoice);
        setPoRebalanceSelectedRecords(result.selectedRecords);
        const startWeekMonthList = String(result.startWeekId);
        setPoRebalanceFormData({ week_month_list: startWeekMonthList });
        setPoRebalanceFlagEdit(true);
        setPoRebalancePopUpWeekData({ week_month_list: startWeekMonthList });
        setPoRebalanceOpenReviewRecommendationTable(true);
      } catch (error) {
        console.error("[PO Rebalance alert review]", error);
        if (!cancelled) {
          displaySnackMessages(
            "Failed to open review recommendation.",
            "error"
          );
          closePoRebalanceReviewPopUp();
        }
      } finally {
        if (!cancelled) {
          setPoRebalancePopUpInitLoader(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    poRebalancePopUpOpen,
    poRebalanceReviewAlertRow?.unique_row_id,
    poRebalanceReviewAlertRow?.id,
  ]);

  const openPoRebalanceReviewRecommendationTableView = (data) => {
    setPoRebalancePopUpWeekData(data);
    setPoRebalanceOpenReviewRecommendationTable(true);
    return true;
  };

  const formatPoRebalanceAlertWeekRange = (row) => {
    const formatOne = (val) => {
      if (val == null || val === "") return "";
      const parsed = moment(
        val,
        ["YYYY-MM-DD", "MM/DD/YYYY", "DD/MM/YYYY", moment.ISO_8601],
        true
      );
      return parsed.isValid() ? parsed.format("MM/DD/YYYY") : String(val);
    };
    const start = formatOne(row?.start_week);
    const end = formatOne(row?.target_week);
    if (!start && !end) return "";
    return `${start} - ${end}`;
  };

  const shouldShowPoRebalanceReviewTable =
    (poRebalanceOpenReviewRecommendationTable ||
      poRebalanceOpenRecommendationTableForDraftAndApprove) &&
    poRebalanceFormData?.week_month_list;

  const isPoRebalanceReviewTableLoading =
    props.poRebalanceTableFieldsLoader ||
    props.poRebalanceSubClassTableDataLoader;

  const renderPoRebalanceReviewRecommendationTable = () => {
    if (!shouldShowPoRebalanceReviewTable) {
      return (
        <EmptyStateWrapper
          emptyStateHeading="No data to display"
          emptyStateDescription="Please select the target week to get the data to display according to your preference"
          hidePrimaryButton={true}
          emptyStateProps={{
            primaryButtonLabel: null,
            secondaryButtonLabel: null,
          }}
        />
      );
    }

    return (
      <Loader loader={isPoRebalanceReviewTableLoading} minHeight="260px">
        <PoRebalanceReviewRecommendationTable
          ref={poRebalanceReviewTableRef}
          popUpWeekData={poRebalancePopUpWeekData}
          selectedRecords={poRebalanceSelectedRecords}
          startWeekId={poRebalanceStartWeekId}
          endWeekId={poRebalanceEndWeekId}
          setOpenReviewRecommendationTable={
            setPoRebalanceOpenReviewRecommendationTable
          }
          setOpenRecommendationTableForDraftAndApprove={
            setPoRebalanceOpenRecommendationTableForDraftAndApprove
          }
          selectedChoice={poRebalanceSelectedChoice}
          setIsApprove={setPoRebalanceIsApprove}
          setOpenPopUp={handlePoRebalanceReviewPopUpOpenChange}
          setAlertMessage={handlePoRebalanceReviewAlertMessage}
          setAlertVariant={handlePoRebalanceReviewAlertVariant}
          choiceTableColumns={poRebalanceChoiceColumnsForPopUp}
          hideSaveDraft={poRebalanceHideSaveDraft}
          setHideSaveDraft={setPoRebalanceHideSaveDraft}
          hideSaveApprove={poRebalanceHideSaveApprove}
          setHideSaveApprove={setPoRebalanceHideSaveApprove}
          isUserHasSaveDraftAccess={poRebalanceIsUserHasSaveDraftAccess}
          setIsUserHasSaveDraftAccess={setPoRebalanceIsUserHasSaveDraftAccess}
          isUserHasApprovePoRebalanceAccess={poRebalanceIsUserHasApproveAccess}
          setIsUserHasApprovePoRebalanceAccess={
            setPoRebalanceIsUserHasApproveAccess
          }
          poRebalanceSubClassTableDataLoader={
            props.poRebalanceSubClassTableDataLoader
          }
          poRebalanceTableFieldsLoader={props.poRebalanceTableFieldsLoader}
        />
      </Loader>
    );
  };

  const onPoRebalanceApprove = () => {
    poRebalanceReviewTableRef.current?.onApprovePO?.();
  };

  const onPoRebalanceSaveDraft = () => {
    poRebalanceReviewTableRef.current?.onSaveDraft?.();
  };

  const isPoRebalanceApproveDisabled = () => {
    if (
      !shouldShowPoRebalanceReviewTable ||
      props.poRebalanceTableFieldsLoader ||
      props.poRebalanceSubClassTableDataLoader ||
      poRebalancePopUpInitLoader
    ) {
      return true;
    }
    if (!isEmpty(props.poRebalanceUserAccess)) {
      return !poRebalanceIsUserHasApproveAccess || poRebalanceHideSaveApprove;
    }
    return poRebalanceHideSaveApprove;
  };

  const isPoRebalanceSaveDraftDisabled = () => {
    if (
      !shouldShowPoRebalanceReviewTable ||
      props.poRebalanceTableFieldsLoader ||
      props.poRebalanceSubClassTableDataLoader ||
      poRebalancePopUpInitLoader
    ) {
      return true;
    }
    if (!isEmpty(props.poRebalanceUserAccess)) {
      return !poRebalanceIsUserHasSaveDraftAccess || poRebalanceHideSaveDraft;
    }
    return poRebalanceHideSaveDraft;
  };

  const onReviewClick = (data) => {
    if (isPoRebalanceAlert) {
      setPoRebalanceReviewAlertRow(data);
      setPoRebalancePopUpOpen(true);
      return;
    }
    props.onReviewClick(data, recommendedPopUpApi);
  };

  const downloadCsv = async () => {
    let effectiveTotal = totalCount;
    if (manualbodyHasGridScopedMeta(manualBodyData) && effectiveTotal <= 0) {
      const previewBody = buildRequestBody(manualBodyData, {
        limit: 10,
        page: 1,
      });
      const signature = buildScopedCountSignature(
        props.alertId,
        previewBody.data
      );
      const cache = scopedCountCacheRef.current;
      if (cache.signature === signature && cache.total != null) {
        effectiveTotal = cache.total;
      } else {
        const countPath = buildRecommendedAlertsCountApiPath(
          props.tableDataApiName
        );
        if (countPath) {
          try {
            const countResponse = await props.getRecommendedOrderAlertsTableCount(
              {
                tableDataApi: countPath,
                data: previewBody.data,
              }
            );
            const countFromApi = readAlertCountApiTotal(countResponse);
            if (countFromApi != null) {
              effectiveTotal = countFromApi;
              scopedCountCacheRef.current = { signature, total: countFromApi };
            }
          } catch (countRequestError) {
            displaySnackMessages(ERROR_MESSAGE, "error");
            console.log(countRequestError);
          }
        }
      }
    }

    if (effectiveTotal > 0) {
      displaySnackMessages(FILE_DOWNLOADING_MESSAGE, "info");

      const body = buildRequestBody(manualBodyData, {
        limit: effectiveTotal,
        page: 1,
      });

      let response = await props.getRecommendedOrderAlertsTableData(body);
      if (response.data.status) {
        let downloadData = agGridRowFormatter(response?.data?.data?.result);
        let formattedColumns = agGridColumnFormatter(
          alertsActionTableTableConfig,
          null,
          null,
          null,
          null,
          null,
          null,
          true
        );
        let csvDwlndData = [];
        downloadData.forEach((data) => {
          if (
            data?.product_details &&
            Array.isArray(data?.product_details) &&
            data?.product_details.length > 0
          ) {
            data.product_details.forEach((productDetail) => {
              // Copy missing fields from `data` to `productDetail`
              Object.keys(data).forEach((key) => {
                if (!productDetail.hasOwnProperty(key)) {
                  productDetail[key] = data[key];
                }
              });

              // Append updated productDetail to csvDwlndData
              csvDwlndData.push(productDetail);
            });
          } else {
            csvDwlndData = [...csvDwlndData, ...data];
          }
        });

        csvDwlndData = csvDwlndData.map((obj) =>
          Object.fromEntries(
            Object.entries(obj).map(([key, value]) => [
              key,
              typeof value === "string"
                ? replaceSpecialCharacter(value)
                : value,
            ])
          )
        );

        setCsvData(cloneDeep(csvDwlndData));
        setCsvHeaders(getHeaderForExcel(cloneDeep(formattedColumns)));
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    } else {
      displaySnackMessages(NO_DATA_FOUND, "info");
    }
  };

  const distributeRoqAcrossChildren = (parentData, colName, total) => {
    const children = Array.isArray(parentData?.product_details)
      ? parentData.product_details
      : [];
    const count = children.length;
    if (!count) return [];
    const numericTotal = Number(total) || 0;
    const base = Math.floor(numericTotal / count);
    const remainder = numericTotal - base * count;
    const shares = children.map((child, index) => {
      const share = base + (index < remainder ? 1 : 0);
      // Keep parent row data in sync so re-expanding children shows the split.
      child[colName] = share;
      return { child, share };
    });

    // Reflect the split on any child rows that are currently expanded/rendered.
    const api = agGridInstance?.current?.api;
    if (api) {
      api.forEachNode((rowNode) => {
        if (rowNode?.level === 0 || !rowNode?.data) return;
        const match = shares.find(
          ({ child }) =>
            child === rowNode.data ||
            (child?.article === rowNode.data?.article &&
              child?.loc_code === rowNode.data?.loc_code &&
              child?.size === rowNode.data?.size)
        );
        if (match) rowNode.setDataValue(colName, match.share);
      });
    }
    return shares;
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
    const colDef = column?.colDef;

    if (
      isChanged &&
      colDef?.column_name &&
      USER_ADJUSTED_ROQ_COLUMNS.includes(colDef.column_name)
    ) {
      const colName = colDef.column_name;
      const rawValue = data?.[colName];
      const numericValue =
        rawValue === "" || rawValue === null || rawValue === undefined
          ? null
          : Number(rawValue);
      const children = Array.isArray(data?.product_details)
        ? data.product_details
        : [];

      if (children.length > 0) {
        const shares = distributeRoqAcrossChildren(data, colName, numericValue);
        setRoqEdits((prev) => {
          const next = { ...prev };
          shares.forEach(({ child, share }) => {
            const key = `${child?.article}|${child?.loc_code}|${child?.size}`;
            next[key] = {
              article: child?.article,
              loc_code: child?.loc_code,
              size: child?.size,
              draft_id: data?.draft_id ?? child?.draft_id ?? null,
              ...next[key],
              [colName]: share,
            };
          });
          return next;
        });
      } else {
        const rowId = data?.unique_row_id ?? data?.id;
        if (rowId !== undefined && rowId !== null) {
          setRoqEdits((prev) => ({
            ...prev,
            [rowId]: {
              article: data?.article,
              loc_code: data?.loc_code,
              size: data?.size,
              draft_id: data?.draft_id ?? null,
              ...prev[rowId],
              [colName]: numericValue,
            },
          }));
        }
      }
    }

    if (
      colDef.column_name === "shipment_mode" &&
      colDef.is_editable &&
      Array.isArray(data?.shipment_modes)
    ) {
      //BASED ON THE SHIPMENT MODES, WE NEED TO UPDATE THE LEAD TIME
      const shipment = data?.shipment_modes?.find(
        (mode) => mode.shipment_mode === data.shipment_mode
      );
      if (shipment) {
        cellData.node.data.lead_time = shipment?.lead_time || 0;
      }
      agGridInstance.current.api.refreshCells({
        force: true,
        suppressFlash: false,
        columns: ["lead_time"],
        rowNodes: [cellData.node],
      });
    }
  };

  const handleDateRangeChange = (dateRange) => {
    setTopRightFiltersState((prev) => ({
      ...prev,
      dateRange: dateRange,
    }));
    setTableDataLoader(true);
    setHideTable(true);
  };

  const handleDropdownChange = (selectedOption) => {
    setTopRightFiltersState((prev) => ({
      ...prev,
      dropdown: selectedOption || null,
    }));
    setTableDataLoader(true);
    setHideTable(true);
  };

  // Initialize dropdown options when alertTopRightOptions change
  useEffect(() => {
    if (props?.alertTopRightOptions?.length > 0) {
      const dropdownConfig = props.alertTopRightOptions.find(
        (opt) => opt.type === "dropdown"
      );
      if (dropdownConfig?.options?.length > 0) {
        const formattedOptions = dropdownConfig.options.map((opt) => ({
          label: opt.label,
          value: opt.value,
        }));
        setDropdownState((prev) => {
          const optionsChanged =
            JSON.stringify(prev.initialOptions) !==
            JSON.stringify(formattedOptions);
          if (optionsChanged) {
            return {
              ...prev,
              currentOptions: formattedOptions,
              initialOptions: formattedOptions,
            };
          }
          return prev;
        });
      }
    }
  }, [props?.alertTopRightOptions]);

  const renderInfoTooltipOption = (option, index) => {
    const title = option.tooltip || option.message || "";
    if (!title) return null;
    return (
      <Tooltip
        key={option.id || `info-tooltip-${index}`}
        orientation={option.orientation || "top"}
        variant={option.variant || "tertiary"}
        title={title}
      >
        <div className={classes.alertInfoTooltipWrap}>
          <div className={classes.alertInfoTooltipIcon}>
            <InfoIcon />
          </div>
        </div>
      </Tooltip>
    );
  };

  const renderTopRightOptionsFromConfig = () => {
    const topRightOptions = props?.alertTopRightOptions || [];
    const sortedOptions = [...topRightOptions]
      .filter((opt) => opt.type !== "info_tooltip")
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    return sortedOptions
      .map((option, index) => {
        if (option.type === "date_range_picker") {
          return (
            <NormalCalendarFiscalMapping
              key={option.id || index}
              label={option.label}
              fiscalCalendarData={fiscalCalendarDetails}
              selectedDate={topRightFiltersState.dateRange}
              onDateChange={handleDateRangeChange}
              displayRow={true}
              showClearDates={true}
              setValueOnBlur={true}
              labelOrientation="left"
            />
          );
        }

        if (option.type === "dropdown") {
          const dropdownOptions =
            option.options?.map((opt) => ({
              label: opt.label,
              value: opt.value,
            })) || [];

          // Use state options if available, otherwise use computed options
          const currentOptions =
            dropdownState.currentOptions.length > 0
              ? dropdownState.currentOptions
              : dropdownOptions;
          const initialOptions =
            dropdownState.initialOptions.length > 0
              ? dropdownState.initialOptions
              : dropdownOptions;

          return (
            <Select
              key={option.id || index}
              id={option.id}
              label={option.label}
              currentOptions={currentOptions}
              setCurrentOptions={(options) =>
                setDropdownState((prev) => ({
                  ...prev,
                  currentOptions: options,
                }))
              }
              initialOptions={initialOptions}
              selectedOptions={topRightFiltersState.dropdown}
              setSelectedOptions={(selected) => {
                setTopRightFiltersState((prev) => ({
                  ...prev,
                  dropdown: selected,
                }));
              }}
              handleChange={handleDropdownChange}
              isOpen={dropdownState.isOpen}
              setIsOpen={(isOpen) =>
                setDropdownState((prev) => ({ ...prev, isOpen }))
              }
              isClearable={true}
              placeholder={option.placeholder || "Select..."}
              isCloseWhenClickOutside={true}
              labelOrientation="left"
            />
          );
        }

        return null;
      })
      .filter(Boolean);
  };

  const getTopRightOptions = () => {
    let options = [];
    const buttonTypes = ["secondary", "primary"];

    if (hasRoqEdits) {
      return [
        <Button
          key="save-roq-edits"
          variant="primary"
          type="default"
          id="saveRoqEditsBtn"
          disabled={isSavingRoq}
          onClick={handleSaveRoqEdits}
        >
          Save
        </Button>,
      ];
    }

    if (selectedRows?.length) {
      const infoTooltipOptions = (props?.alertTopRightOptions || [])
        .filter((opt) => opt.type === "info_tooltip")
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      infoTooltipOptions.forEach((option, idx) => {
        const node = renderInfoTooltipOption(option, idx);
        if (node) options.push(node);
      });
      if (redirectButtons?.length) {
        redirectButtons.forEach((link, index) => {
          const isPoRebalanceButton =
            isPoRebalanceAlert && link?.link === REDIRECT_TO_PO_REBALANCE;
          const isButtonDisabled =
            selectedRows.length === 0 ||
            (isPoRebalanceButton && isPoRebalanceRedirectDisabled);
          const showWeekSpanTooltip =
            isPoRebalanceButton && isPoRebalanceRedirectDisabled;
          const buttonNode = (
            <Button
              variant={link?.type ?? buttonTypes[index]}
              type="default"
              key={index}
              id="productSetAllBtn"
              className={classes.button}
              disabled={isButtonDisabled}
              onClick={() => handleReviewRecommendation(link?.link)}
            >
              {link?.label || OMS_DASHBOARD_ALERTS_REDIRECT_ROUTES[link]}
            </Button>
          );
          if (showWeekSpanTooltip) {
            options.push(
              <Tooltip
                key={index}
                orientation="top"
                variant="tertiary"
                title="The Week-span for the selected Choices is more than 8 Weeks. Please select other choices"
              >
                <span style={{ display: "inline-flex", cursor: "not-allowed" }}>
                  {buttonNode}
                </span>
              </Tooltip>
            );
          } else {
            options.push(buttonNode);
          }
        });
      }
    } else {
      // check if new dropdown options should be shown
      if (
        props?.screenConfig?.showNewAlertTableDropdownOptions &&
        props?.alertTopRightOptions?.length > 0
      ) {
        // render dynamic topRightOptions
        options.push(...renderTopRightOptionsFromConfig());
      } else {
        // existing behavior Switch
        if (!props?.screenConfig?.show_non_review_toggle) {
          options.push(
            <Switch
              id="review-non-reviewed"
              checked={isResolvedSwitchChecked}
              onChange={(event) => onResolvedSwitchChange()}
              leftLabel={"See Non-Reviewed"}
              rightLabel={""}
            />
          );
        }
      }
    }

    if (totalCount > 0) {
      options.push(
        <>
          {downloadExcelLink(
            csvData,
            props?.tableConfigName,
            downloadLink,
            csvHeaders,
            "",
            "",
            true
          )}
        </>
      );
    }
    return options;
  };

  const onDownloadButtonClick = async () => {
    try {
      await downloadCsv();
      if (downloadLink.current?.link) {
        downloadLink.current.link.click();
      }
    } catch (error) {
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  const onResolvedSwitchChange = () => {
    setIsResolvedSwitchChecked(!isResolvedSwitchChecked);
    setTableDataLoader(true);
    setHideTable(true);
  };

  useEffect(() => {
    if (hideTable) {
      setTableDataLoader(false);
      setHideTable(false);
    }
  }, [hideTable]);

  useEffect(() => {
    if (!isPoRebalanceAlert || !agGridInstance.current?.api) return;
    agGridInstance.current.api.refreshServerSideStore({ purge: true });
  }, [poRebalanceIsApprove, isPoRebalanceAlert]);

  const getRowStyleAlertTable = (params) => {
    if (props?.screenConfig?.add_row_color && params?.data?.is_resolved) {
      return { background: "rgb(57 255 20 / 20%)" };
    }
  };

  return (
    <>
      {render && (
        <Loader
          loader={
            props.alertsActionTableConfigLoader ||
            tableDataLoader ||
            isSelectAllRecordsLoading
          }
          minHeight={"188px"}
        >
          {!hideTable && (
            <AgGridComponent
              columns={alertsActionTableTableConfig}
              manualCallBack={(body, pageIndex, params) =>
                manualCallBack(body, pageIndex, params)
              }
              onReviewClick={(tableInfo) => onReviewClick(tableInfo.data)}
              uniqueRowId={"unique_row_id"}
              loadTableInstance={loadAlertsTableInstance}
              onSelectionChanged={onSelectionChanged}
              getRowStyle={(params) => {
                getRowStyleAlertTable(params);
              }}
              totalCount={totalCount}
              cacheBlockSize={10}
              serverSideStoreType="partial"
              rowModelType="serverSide"
              rowSelection={props?.isSingleSelectRow ? "single" : "multiple"}
              onRowSelected
              selectAllHeaderComponent={true}
              hideSelectAllRecords={!props?.isSelectAllRecordsEnabled}
              hideHeaderCheckboxComponent={props?.isSingleSelectRow}
              hideSelectCurrentPageRecords={props?.isSingleSelectRow}
              skipAutoSizeColumn
              hideChildSelection={true}
              showSetAll={false}
              purgeClosedRowNodes={true}
              suppressAggFuncInHeader={true}
              suppressClickEdit={true}
              groupDisplayType={"custom"}
              treeData={true}
              childKey={"product_details"}
              onBlur={onBlur}
              tableHeader={props?.alertName}
              topRightOptions={getTopRightOptions()}
              showDownloadButton={
                props?.showDownloadButton !== undefined
                  ? props?.showDownloadButton
                  : !props?.isSingleSelectRow
              }
              onDownloadButtonClick={onDownloadButtonClick}
              closeButton
              showSkeleton={true}
              handleCloseButtonClick={() => {
                if (typeof props?.setSelectedAlertIndex === "function")
                  props?.setSelectedAlertIndex(-1);
              }}
            />
          )}

          {redirectButtons && (
            <>
              {showApprovalModal &&
                (props?.isCalledFromVendorStore ? (
                  <ApprovalFlowDialogVendorStore
                    setShowApprovalModal={setShowApprovalModal}
                    screenName={ORDER_MANAGEMENT_VENDOR_STORE_FILTER_CONFIG}
                    fiscalCalendarDetails={fiscalCalendarDetails}
                    selectedRows={approvalFlowRows}
                    targetTable={"alerts_action_table"}
                    reloadComponent={refreshTableData}
                  />
                ) : (
                  <ApprovalFlowDialog
                    setShowApprovalModal={setShowApprovalModal}
                    screenName={ORDER_MANAGEMENT_FILTER_CONFIG}
                    fiscalCalendarDetails={fiscalCalendarDetails}
                    selectedRows={approvalFlowRows}
                    targetTable={"alerts_action_table"}
                    reloadComponent={refreshTableData}
                    isExpeditePosRawROQAlert={props?.isExpeditePosRawROQAlert}
                    styleOrderSummaryPayload={approvalFlowPayload}
                  />
                ))}
            </>
          )}

          {showStrategyPanel && (
            <SelectStrategyApprovePanel
              open={showStrategyPanel}
              onClose={closeStrategyPanel}
              onApprove={handleStrategyApprove}
              kpiData={strategyKpiData}
              isLoading={strategyKpiLoading}
            />
          )}

          {openDeepDive && (
            <DeepDiveBottomSheet
              selectedRows={selectedRows}
              onClose={closeDeepDiveBottomSheet}
            />
          )}

          {packConfigState.isOpen && (
            <PackConfigBottomSheet
              openPackConfigDetailSheet={packConfigState.isOpen}
              setOpenPackConfigDetailSheet={handlePackConfigClose}
              l1DisplayName="Master SKU ID"
              activeChildHierarchyKey={packConfigState.selectedArticle}
              screenName={props.tableConfigName}
            />
          )}

          {props?.isExpeditePosRawROQAlert && (
            <RecoveryWindowGraphPopover
              anchorEl={recoveryWindowGraphState.anchorEl}
              rowData={recoveryWindowGraphState.rowData}
              selectedFilters={props.selectedFilters}
              alertTopRightOptions={props.alertTopRightOptions}
              dateRange={topRightFiltersState.dateRange}
              onClose={closeRecoveryWindowGraphPopover}
              displaySnackMessages={displaySnackMessages}
            />
          )}
        </Loader>
      )}

      {isPoRebalanceAlert && poRebalancePopUpOpen && (
        <ReviewRecommendationPopUp
          setShowSetAllModal={(isOpen) => {
            if (!isOpen) {
              closePoRebalanceReviewPopUp();
            }
          }}
          choiceTableColumns={poRebalanceChoiceColumnsForPopUp}
          topContent={null}
          SetAllData={openPoRebalanceReviewRecommendationTableView}
          formData={poRebalanceFormData}
          setFormData={setPoRebalanceFormData}
          flagEdit={poRebalanceFlagEdit}
          setFlagEdit={setPoRebalanceFlagEdit}
          renderReviewRecommendationTable={
            renderPoRebalanceReviewRecommendationTable
          }
          onApprove={onPoRebalanceApprove}
          onSaveDraft={onPoRebalanceSaveDraft}
          isApproveDisabled={isPoRebalanceApproveDisabled}
          isSaveDraftDisabled={isPoRebalanceSaveDraftDisabled}
          isFromSidePanel={false}
          selectedChoice={poRebalanceSelectedChoice}
          selectedRowData={poRebalanceSelectedRecords}
          VIEW_STATUS_FISCAL_WEEK_GROUP={poRebalanceViewStatusFiscalWeekGroup}
          isLoading={poRebalancePopUpInitLoader}
          hideWeekSelector={true}
          selectedWeeksLabel={formatPoRebalanceAlertWeekRange(
            poRebalanceReviewAlertRow
          )}
          selectedChoiceLabel={
            poRebalanceSelectedChoice
              ? `${poRebalanceHierarchyLabel}: ${poRebalanceSelectedChoice}`
              : ""
          }
        />
      )}

      <Prompt
        isOpen={poRebalanceRedirectConfirmOpen}
        variant="info"
        title="Redirect?"
        infoList={[]}
        primaryButtonLabel="Yes, confirm"
        secondaryButtonLabel="Cancel"
        onPrimaryButtonClick={confirmPoRebalanceRedirect}
        onSecondaryButtonClick={cancelPoRebalanceRedirect}
        handleClose={cancelPoRebalanceRedirect}
      >
        <div style={{ textAlign: "center", padding: "0 0.5rem" }}>
          It will take you to the PO Rebalancing Module. Are you sure you want
          to proceed?
        </div>
      </Prompt>
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    alertsActionTableConfigLoader:
      store.omsReducer.omsAlertsActionsService.alertsActionTableConfigLoader,
    selectedFilters: store.omsReducer.orderingDashboardService.selectedFilters,
    orderingDashboardSelectedDcs:
      store.omsReducer.orderingDashboardService.orderingDashboardSelectedDcs,
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "decisionDashboardFilterConfiguration"
      ]?.appliedFilterData?.dependencyData,

    filterDependencyData:
      store.omsReducer.orderingDashboardService.filterDependencyData,
    orderingAccessControl:
      store.omsReducer.orderingCommonService?.orderingAccessControl,
    orderManagementProductDetailsFilters:
      store.omsReducer.orderManagementService
        .orderManagementProductDetailsFilters,

    deepDiveFiltersForVendorStore:
      store.omsReducer?.orderManagementVendorToStoreService?.deepDiveFilters,
    vendorToStoreScreenConfig:
      store.omsReducer.orderingCommonService?.orderingVendorToStoreConfig,
    screenConfig:
      store.omsReducer.orderingCommonService?.orderingScreensConfig
        ?.decision_dashboard,
    poRebalanceScreenConfig:
      store.omsReducer.orderingCommonService?.orderingScreensConfig
        ?.po_rebalance,
    poRebalanceUserAccess:
      store.omsReducer.orderingCommonService.orderingUserAccess?.vendor_dc,
    poRebalanceSubClassTableDataLoader:
      store.omsReducer?.poRebalanceService.poRebalanceSubClassTableDataLoader,
    poRebalanceTableFieldsLoader:
      store.omsReducer?.poRebalanceService.poRebalanceTableFieldsLoader,
  };
};

const mapDispatchToProps = (dispatch, ownProps) => ({
  getAlertsActionTableConfiguration: (payload) =>
    dispatch(getAlertsActionTableConfiguration(payload)),
  setAlertsActionTableConfigLoader: (payload) =>
    dispatch(setAlertsActionTableConfigLoader(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  getRecommendedOrderAlertsTableData: (payload) =>
    dispatch(
      getRecommendedOrderAlertsTableData(payload, ownProps.dashboardApiFlags)
    ),
  getRecommendedOrderAlertsTableCount: (payload) =>
    dispatch(
      getRecommendedOrderAlertsTableCount(payload, ownProps.dashboardApiFlags)
    ),
  updateResolvedData: (payload) =>
    dispatch(updateResolvedData(payload, ownProps.dashboardApiFlags)),
  updateOffcycleExpediteOrdersAlerts: (payload) =>
    dispatch(
      updateOffcycleExpediteOrdersAlerts(payload, ownProps.dashboardApiFlags)
    ),
  fetchExpediteAlertStrategyKpi: (payload) =>
    dispatch(fetchExpediteAlertStrategyKpi(payload)),
  getOmsDeepDiveFilters: () => dispatch(getOmsDeepDiveFilters()),
  setOrderManagementProductDetailsFilters: (payload) =>
    dispatch(setOrderManagementProductDetailsFilters(payload)),
  setSelectedRowsFromOrderDetails: (payload) =>
    dispatch(setSelectedRowsFromOrderDetails(payload)),
  setDeepDiveFiltersPayload: (payload) =>
    dispatch(setDeepDiveFiltersPayload(payload)),
  setDeepDiveFilters: (payload) => dispatch(setDeepDiveFilters(payload)),
  tenantConfigApiCache: (application, queryParam) =>
    dispatch(tenantConfigApiCache(application, queryParam)),
  fetchPORebalanceTableFields: (payload) =>
    dispatch(fetchPORebalanceTableFields(payload)),
  fetchPORebalanceTableData: (payload) =>
    dispatch(fetchPORebalanceTableData(payload)),
  fetchFiscalWeeks: (startDate, endDate) =>
    dispatch(fetchFiscalWeeks(startDate, endDate)),
  setPoRebalanceSubClassTableDataLoader: (payload) =>
    dispatch(setPoRebalanceSubClassTableDataLoader(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(AlertsActionTable);
