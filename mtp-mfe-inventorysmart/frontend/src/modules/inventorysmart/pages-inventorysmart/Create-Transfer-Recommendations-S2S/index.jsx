import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom-v5-compat";
import { connect } from "react-redux";
import { makeStyles } from "@mui/styles";
import {
  Button,
  ButtonGroup,
  EmptyState,
  Prompt,
  Tabs,
  useTranslation,
} from "impact-ui-v3";
import globalStyles from "../../../../core/Styles/globalStyles";
import EyeIcon from "assets/IS_icons/IS_Eye.svg";
import EditIconNew from "assets/ModifyEditNew.svg";
import LeftIcon from "assets/arrowLeft16.svg";
import { CREATE_STORE_TRANSFER } from "../../constants-inventorysmart/routesConstants";
import Loader from "core/Utils/Loader/loader";
import { addSnack } from "core/actions/snackbarActions";
import {
  setKpiLoader,
  setPlanStatusLoader,
  setStoreViewLoader,
  setTransferCode,
  setTransferStatus,
  setPlanStatus,
  setPlanType,
  setEditMode,
  setLockedAllocationCodes,
  resetTransferRecommendationsState,
  getTransferKPI,
  getStatus,
  acquireEditLock,
  releaseEditLock,
  editModeHeartbeat,
  updateReviewStatus,
  triggerRefresh,
} from "../../services-inventorysmart/Create-Transfer-Recommendations-S2S/create-transfer-recommendations-service";
import { RecommendationKPISection } from "../Finalize-Allocation/components/KPI-Card/RecommendationKPISection";
import StoreViewTables from "./components/StoreViewTables";
import ProductViewTable from "./components/ProductViewTable";
import { displaySnackMessages } from "../inventorysmart-utility";
import TransferView from "./components/TransferView/TransferView";
import DateStrips from "./components/DateStrips";
import { setS2SFiltersFromS2S } from "modules/inventorysmart/services-inventorysmart/Order-Batching/order-batching-s2s-services";
import { setBackButtonClickedS2S } from "modules/inventorysmart/services-inventorysmart/View-Past-Allocation/view-past-allocation";
import { REDIRECT_FROM_VIEW_PAST_ALLOCATION } from "modules/inventorysmart/constants-inventorysmart/stringConstants";

const useStyles = makeStyles((theme) => ({
  contentContainer: {
    minHeight: "500px",
    paddingBottom: "150px",
  },
  stickyFooterRight: {
    justifyContent: "space-between",
    gap: "16px",
    padding: "16px 24px",
  },
  headerSection: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
    marginTop: "24px",
  },
  titleText: {
    fontSize: "20px",
    fontWeight: 600,
    color: "#1A1A1A",
  },
  kpiContainer: {
    marginBottom: "24px",
  },
  filterSection: {
    marginBottom: "16px",
  },
  tabPanelContainer: {
    marginTop: "8px",
  },
  tabsContainer: {
    position: "relative",
    "& .MuiTabs-root.ia-styles.ia-tabList": {
      width: "calc(100% - 239px)",
    },
    "& .store-transfer-view-edit-mode": {
      position: "absolute",
      top: "4px",
      right: "0",
    },
  },
}));

const transformKpiData = (apiData) => {
  if (!apiData) return null;

  const data =
    apiData.data || apiData.kpi || (apiData.plan_scope ? apiData : null);

  if (!data) return null;

  const {
    plan_scope,
    sales_impact,
    inventory_level,
    wos_shift,
    size_availability,
  } = data;

  const range = (before, after) => `${before} -> ${after}`;

  return {
    plan_scope,
    sales_impact: {
      sales_lift:
        sales_impact?.sales_lift > 0
          ? "+" + sales_impact?.sales_lift
          : sales_impact?.sales_lift,
      incremental_dollars:
        sales_impact?.incremental_dollars > 0
          ? "+" + sales_impact?.incremental_dollars
          : sales_impact?.incremental_dollars,
      more_details: {
        sales_lift: {
          dest_stores_sales_lift: sales_impact?.dest_stores_sales_lift,
          source_stores_sales_lift: sales_impact?.source_stores_sales_lift,
          top_quartile_sales_lift: sales_impact?.top_quartile_sales_lift,
        },
        incremental_dollars: {
          dest_stores_incremental_dollars:
            sales_impact?.dest_stores_incremental_dollars,
          source_stores_incremental_dollars:
            sales_impact?.source_stores_incremental_dollars,
          top_quartile_incremental_dollars:
            sales_impact?.top_quartile_incremental_dollars,
        },
      },
    },
    inventory_level: {
      stockout: range(
        inventory_level?.stockout?.before?.pct + "%",
        inventory_level?.stockout?.after?.pct + "%"
      ),
      shortfall: range(
        inventory_level?.shortfall?.before?.pct + "%",
        inventory_level?.shortfall?.after?.pct + "%"
      ),
      normal: range(
        inventory_level?.normal?.before?.pct + "%",
        inventory_level?.normal?.after?.pct + "%"
      ),
      excess: range(
        inventory_level?.excess?.before?.pct + "%",
        inventory_level?.excess?.after?.pct + "%"
      ),
      more_details: {
        stockout: inventory_level?.formulae?.stockout,
        shortfall: inventory_level?.formulae?.shortfall,
        normal: inventory_level?.formulae?.normal,
        excess: inventory_level?.formulae?.excess,
      },
    },
    wos_shift: {
      destination: [
        range(wos_shift?.destination?.before, wos_shift?.destination?.after),
        wos_shift?.destination?.wks_change,
      ],
      source: [
        range(wos_shift?.source?.before, wos_shift?.source?.after),
        wos_shift?.source?.wks_change,
      ],
      more_info: `Avg: ${wos_shift?.target?.wks_change}wks`,
    },
    size_availability: {
      size_run: [
        range(
          size_availability?.before_pct + "%",
          size_availability?.after_pct + "%"
        ),
        size_availability?.change_pp,
      ],
      more_details:
        "Complete size run = stores where every size has ≥1 unit on floor.",
    },
  };
};

const CreateTransferRecommendations = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const location = useLocation();
  const navigate = useNavigate();

  const { t } = useTranslation();

  // Extract allocation_code from URL query params
  const searchParams = new URLSearchParams(location.search);
  const redirectFromQuery = searchParams.get("rd");
  const allocationCode = searchParams.get("allocation_code");
  const editModeQuery = searchParams.get("type");

  const [showTable, setShowTable] = useState(false);
  const [transferCreated, setTransferCreated] = useState(false);
  const [activeTab, setActiveTab] = useState("product");
  const [kpiData, setKpiData] = useState(null);
  const [
    orderBatchingAllocationCode,
    setOrderBatchingAllocationCodes,
  ] = useState([]);
  const [kpiTableConfig, setKpiTableConfig] = useState([]);
  const [dateStripData, setDateStripData] = useState({
    createdDate: null,
    purgeDate: null,
  });
  const [selectedArticles, setSelectedArticles] = useState([]);
  const [selectedArticleRows, setSelectedArticleRows] = useState([]);
  const [showMoveConfirm, setShowMoveConfirm] = useState(false);
  const initialLoadDoneRef = useRef(false);
  const lockExpiryTimerRef = useRef(null);
  const lockExpiresAtRef = useRef(null);
  // Allocation code -> lock expiry, for every plan this user currently holds.
  // Locks expire independently, so each plan is tracked on its own.
  /** @type {{ current: Map<string, Date> }} */
  const lockExpiryMapRef = useRef(new Map());
  const editModeRef = useRef(props.editMode);
  // Ensures the auto-acquire triggered by ?type=edit only fires once,
  // even when multiple effect dependencies resolve in the same load cycle.
  const autoEditLockInitiatedRef = useRef(false);

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) {
      displaySnackMessages(errObj?.message, "error", props);
    } else {
      displaySnackMessages(
        "An error occurred. Please try again.",
        "error",
        props
      );
    }
  };

  useEffect(() => {
    if (!allocationCode && !props.isOrderBatching) {
      displaySnackMessages(
        "No allocation code found. Please go back to Step 0.",
        "error",
        props
      );
      return;
    }

    if (
      props.draftFilters === null ||
      (props.draftFilters && !props.draftFilters.length)
    ) {
      return;
    }

    setShowTable(true);

    if (!initialLoadDoneRef.current) {
      fetchPlanStatus();
      initialLoadDoneRef.current = true;
    }

    if (props.planStatus || props.isOrderBatching) {
      fetchKPIData(props.draftFilters);
    }
  }, [allocationCode, props.draftFilters, props.planStatus]);

  useEffect(() => {
    if (props.refreshKey > 0 && (allocationCode || props.isOrderBatching)) {
      fetchKPIData(props.draftFilters);
    }
  }, [props.refreshKey]);

  const fetchPlanStatus = async () => {
    try {
      if (props.isOrderBatching) return;
      if (!allocationCode) {
        displaySnackMessages(
          "Allocation Code missing for plan",
          "error",
          props
        );
        return;
      }

      props.setPlanStatusLoader(true);

      const statusResponse = await props.getStatus(allocationCode);

      if (statusResponse?.data?.status) {
        const status =
          statusResponse.data.data.plan_status === "N/A"
            ? false
            : statusResponse.data.data.plan_status;

        props.setPlanStatus(status);
        props.setPlanType(statusResponse?.data?.data?.plan_type);
        setDateStripData({
          createdDate: statusResponse?.data?.data?.created_date || null,
          purgeDate: statusResponse?.data?.data?.purge_date || null,
        });

        if (!status) {
          displaySnackMessages("Plan doesn't exist", "error", props);
          setShowTable(false);
        }
      }
    } catch (error) {
      handleErrorMessage(error);
      props.setPlanStatus(null);
      props.setPlanType(null);
    } finally {
      props.setPlanStatusLoader(false);
    }
  };

  const fetchKPIData = async (filters = []) => {
    try {
      props.setKpiLoader(true);

      const payload = props.isOrderBatching
        ? {
            screen: "order_batching",
            filters,
            ...(allocationCode ? { allocation_code: allocationCode } : {}),
          }
        : {
            allocation_code: allocationCode,
            filters,
            ...(props.planStatus === "Finalized" &&
            redirectFromQuery === REDIRECT_FROM_VIEW_PAST_ALLOCATION
              ? { plan_status: props.planStatus }
              : {}),
          };

      const response = await props.getTransferKPI(payload);
      if (response?.data?.status && response?.data?.data) {
        const responseData = response.data.data;
        setKpiData(responseData.kpi ? responseData : { data: responseData });
        setOrderBatchingAllocationCodes(
          responseData.allocation_code.split(",")
        );
        if (responseData.table_config) {
          setKpiTableConfig(responseData.table_config);
        }
      }
    } catch (error) {
      handleErrorMessage(error);
    } finally {
      props.setKpiLoader(false);
    }
  };

  const handleCreateTransfer = async (plans) => {
    try {
      const payload = {
        status: props.isOrderBatching ? 3 : 2,
        plans: plans || [
          {
            allocation_code: allocationCode,
            articles: selectedArticles,
          },
        ],
      };
      const response = await props.updateReviewStatus(payload);
      if (response?.data?.status) {
        displaySnackMessages(
          response?.data?.message ||
            t("inventorysmart.selectedArticlesMovedToOrderBatching", {
              module_label: props?.orderBatchingModuleLabel || "Order Batching",
            }),
          "success",
          props
        );
        setSelectedArticles([]);
        setSelectedArticleRows([]);
        if (!props.isOrderBatching) {
          navigate("/inventory-smart/order-batching?tab=store_to_store");
          props.setS2SFiltersFromS2S(
            props.createStoreTransferRecommFilterDependency
          );
        } else {
          props.triggerRefresh();
        }
      } else {
        displaySnackMessages(
          response?.data?.message || "Failed to update review status",
          "error",
          props
        );
      }
    } catch (error) {
      handleErrorMessage(error);
    }
  };

  const handleCreateNewTransfer = () => {
    setShowTable(false);
    setTransferCreated(false);
    props.resetTransferRecommendationsState();
    navigate(`${CREATE_STORE_TRANSFER}?step=0`);
  };

  const handleReturnToDashboard = () => {
    props.resetTransferRecommendationsState();
    navigate("/inventory-smart/decision-dashboard");
  };

  const parseLockExpiresAt = (dateStr) => {
    if (!dateStr) return null;
    // API sends UTC. Preferred format is ISO: "2026-08-27T13:04:47Z"
    // Legacy format is "MM-DD-YYYY HH:mm" (also UTC, without a timezone marker).
    const legacyMatch = dateStr
      .trim()
      .match(/^(\d{2})-(\d{2})-(\d{4})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (legacyMatch) {
      const [, month, day, year, hours, minutes, seconds] = legacyMatch;
      return new Date(
        Date.UTC(
          Number(year),
          Number(month) - 1,
          Number(day),
          Number(hours),
          Number(minutes),
          Number(seconds || 0)
        )
      );
    }
    // Treat a timezone-less ISO string as UTC as well.
    const normalized = /(?:Z|[+-]\d{2}:?\d{2})$/.test(dateStr.trim())
      ? dateStr.trim()
      : `${dateStr.trim().replace(" ", "T")}Z`;
    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  /**
   * Splits the `locks` map returned by acquire/heartbeat into the plans this
   * user holds and the ones that could not be locked. In order batching a
   * single request covers many allocation codes, so a partial success is
   * expected: we edit what we hold and keep the rest read only.
   *
   * @param {Object} locks
   * @returns {{
   *   acquired: { code: string, expiresAt: string }[],
   *   failed: { code: string, message: string }[]
   * }}
   */
  const getLockDetails = (locks = {}) => {
    /** @type {{ code: string, expiresAt: string }[]} */
    const acquired = [];
    /** @type {{ code: string, message: string }[]} */
    const failed = [];
    Object.entries(locks).forEach(([code, info]) => {
      const isAcquired =
        info?.lock_received ?? info?.acquired ?? Boolean(info?.lock_expires_at);
      if (isAcquired) {
        acquired.push({ code, expiresAt: info?.lock_expires_at });
      } else {
        failed.push({ code, message: info?.message });
      }
    });
    return { acquired, failed };
  };

  const clearLockExpiryTimer = () => {
    if (lockExpiryTimerRef.current) {
      clearTimeout(lockExpiryTimerRef.current);
      lockExpiryTimerRef.current = null;
    }
    lockExpiresAtRef.current = null;
  };

  const getLockedPlans = () => Array.from(lockExpiryMapRef.current.keys());

  const resetEditLockState = () => {
    clearLockExpiryTimer();
    lockExpiryMapRef.current = new Map();
    props.setLockedAllocationCodes([]);
    props.setEditMode("view");
  };

  /**
   * Arms the timer for whichever lock expires first. Locks without an expiry
   * are kept until the server tells us otherwise.
   */
  const scheduleNextLockExpiry = () => {
    clearLockExpiryTimer();
    const timestamps = Array.from(lockExpiryMapRef.current.values())
      .filter(Boolean)
      .map((date) => date.getTime());
    if (!timestamps.length) return;
    const nextExpiry = Math.min(...timestamps);
    lockExpiresAtRef.current = new Date(nextExpiry);
    lockExpiryTimerRef.current = setTimeout(
      handleLockExpiry,
      Math.max(nextExpiry - Date.now(), 0)
    );
  };

  /**
   * Drops only the plans whose lock has actually run out. The remaining plans
   * stay editable; we leave edit mode only once every lock has expired.
   */
  const handleLockExpiry = () => {
    // Anything within a second of now is treated as expired so the timer
    // always makes progress
    const cutoff = Date.now() + 1000;
    const expired = [];
    lockExpiryMapRef.current.forEach((expiresAt, code) => {
      if (expiresAt && expiresAt.getTime() <= cutoff) expired.push(code);
    });
    expired.forEach((code) => lockExpiryMapRef.current.delete(code));

    const remaining = getLockedPlans();
    props.setLockedAllocationCodes(remaining);

    if (!remaining.length) {
      clearLockExpiryTimer();
      props.setEditMode("view");
      displaySnackMessages(
        "Edit lock has expired. Switched to View Mode.",
        "warning",
        props
      );
      return;
    }

    if (expired.length) {
      displaySnackMessages(
        `Edit lock expired for ${expired.join(
          ", "
        )}. Those plans are now read only.`,
        "warning",
        props
      );
    }
    scheduleNextLockExpiry();
  };

  /** @param {{ code: string, expiresAt: string }[]} acquired */
  const applyAcquiredLocks = (acquired) => {
    lockExpiryMapRef.current = new Map(
      acquired.map((lock) => [lock.code, parseLockExpiresAt(lock.expiresAt)])
    );
    props.setLockedAllocationCodes(getLockedPlans());
    scheduleNextLockExpiry();
  };

  const getActiveLockPlans = () => {
    const lockedPlans = getLockedPlans();
    return lockedPlans.length
      ? lockedPlans
      : (props.isOrderBatching
          ? orderBatchingAllocationCode
          : [allocationCode]
        ).filter(Boolean);
  };

  const refreshLockExpiry = async () => {
    try {
      const response = await props.editModeHeartbeat({
        plans: getActiveLockPlans(),
      });
      const { acquired } = getLockDetails(response?.data?.data?.locks || {});
      if (acquired.length) {
        applyAcquiredLocks(acquired);
      } else {
        resetEditLockState();
        displaySnackMessages(
          "Edit lock has expired. Switched to View Mode.",
          "warning",
          props
        );
      }
    } catch (error) {
      // Heartbeat failure is non-critical, keep current timer
    }
  };

  useEffect(() => {
    editModeRef.current = props.editMode;
    if (props.editMode !== "edit") {
      clearLockExpiryTimer();
    }
  }, [props.editMode]);

  // Release any lock still held when the user leaves the screen
  useEffect(() => {
    return () => {
      clearLockExpiryTimer();
      const heldPlans = Array.from(lockExpiryMapRef.current.keys());
      if (editModeRef.current === "edit" && heldPlans.length) {
        Promise.resolve(
          props.releaseEditLock({ plans: heldPlans })
        ).catch(() => {});
      }
      lockExpiryMapRef.current = new Map();
      props.setLockedAllocationCodes([]);
      props.setEditMode("view");
    };
  }, []);

  useEffect(() => {
    const handleSaveCompleted = () => {
      if (props.editMode === "edit") {
        refreshLockExpiry();
      }
    };
    window.addEventListener("lock-save-completed", handleSaveCompleted);
    return () =>
      window.removeEventListener("lock-save-completed", handleSaveCompleted);
  }, [props.editMode]);

  const editAccess = props.isOrderBatching
    ? true
    : props.inventorysmartModulesPermission?.[
        "inventorysmart_create_store_transfer"
      ]?.["Create Store Transfer"]?.indexOf("edit") > -1;

  const acquireEditLockForPlans = async () => {
    if (!editAccess) {
      displaySnackMessages("No Edit Access to the User!", "error", props);
      return;
    }
    const requestedPlans = props.isOrderBatching
      ? Array.isArray(orderBatchingAllocationCode) &&
        orderBatchingAllocationCode.length
        ? orderBatchingAllocationCode
        : [allocationCode]
      : [allocationCode];
    try {
      const response = await props.acquireEditLock({
        plans: requestedPlans,
      });
      const locks = response?.data?.data?.locks || {};
      let { acquired, failed } = getLockDetails(locks);
      // Fallback when the API only reports the aggregated flag
      if (!acquired.length && response?.data?.data?.all_acquired) {
        acquired = requestedPlans.map((code) => ({
          code,
          expiresAt: locks[code]?.lock_expires_at,
        }));
        failed = [];
      }

      if (response?.data?.status && acquired.length) {
        applyAcquiredLocks(acquired);
        props.setEditMode("edit");
        if (failed.length) {
          displaySnackMessages(
            `Edit mode acquired for ${acquired.length} of ${
              requestedPlans.length
            } plans. ${failed
              .map(
                (lock) =>
                  lock.message || `${lock.code} is locked by another user.`
              )
              .join(" ")}`,
            "warning",
            props
          );
        } else {
          displaySnackMessages("Edit mode acquired", "success", props);
        }
      } else {
        displaySnackMessages(
          failed[0]?.message || "Unable to acquire edit lock.",
          "error",
          props
        );
      }
    } catch (error) {
      handleErrorMessage(error);
    }
  };

  const onButtonGroupChange = async (event) => {
    if (event.target.value === "edit") {
      await acquireEditLockForPlans();
    } else {
      try {
        await props.releaseEditLock({ plans: getActiveLockPlans() });
      } catch (error) {
        handleErrorMessage(error);
      } finally {
        resetEditLockState();
      }
    }
  };

  // Auto-acquire the edit lock when the screen is opened with ?type=edit
  useEffect(() => {
    if (
      editModeQuery !== "edit" ||
      props.editMode === "edit" ||
      initialLoadDoneRef.current === false ||
      autoEditLockInitiatedRef.current
    ) {
      return;
    }
    if (!allocationCode && !props.isOrderBatching) return;
    autoEditLockInitiatedRef.current = true;
    acquireEditLockForPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editModeQuery, props.planStatus, orderBatchingAllocationCode]);

  const getTabData = () => {
    return [
      {
        label: "Product View",
        value: "product",
      },
      {
        label: "Store View",
        value: "store",
      },
      {
        label: "Transfer View",
        value: "transfer",
      },
    ];
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    // Selection-driven counts/labels only apply on Product View, so drop any
    // stale selection state when navigating away from it.
    if (newValue !== "product") {
      setSelectedArticles([]);
      setSelectedArticleRows([]);
    }
  };

  const handleProductViewSelectionChange = (articles, rows) => {
    setSelectedArticles(articles || []);
    setSelectedArticleRows(rows || []);
  };

  const isProductTab = activeTab === "product";
  const totalSelectedCount = selectedArticles.length;
  const validSelectedRows = selectedArticleRows.filter(
    (row) => Number(row?.transfer_units) > 0
  );
  const validSelectedCount = validSelectedRows.length;
  const zeroTransferSelectedCount = totalSelectedCount - validSelectedCount;
  const hasZeroTransferSelected =
    isProductTab &&
    totalSelectedCount > 0 &&
    validSelectedCount < totalSelectedCount;

  const getMoveToOrderBatchingLabel = () => {
    const moduleLabel = props?.orderBatchingModuleLabel || "Order Batching";
    if (!isProductTab || totalSelectedCount === 0) {
      return t(
        "inventorysmart.transferRecommendationsMoveAllToOrderBatchingLabel",
        { module_label: moduleLabel }
      );
    }
    return t(
      "inventorysmart.transferRecommendationsMoveToOrderBatchingCountLabel",
      {
        zeroTransferSelectedCount,
        totalSelectedCount,
        module_label: moduleLabel,
      }
    );
  };

  const handleMoveToOrderBatchingClick = () => {
    if (hasZeroTransferSelected) {
      setShowMoveConfirm(true);
    } else {
      handleCreateTransfer();
    }
  };

  const handleConfirmMoveProceed = () => {
    setShowMoveConfirm(false);
    const validArticles = validSelectedRows.map((row) => row.article);
    if (validArticles && validArticles.length) {
      handleCreateTransfer([
        {
          allocation_code: allocationCode,
          articles: validArticles,
        },
      ]);
    }
  };

  const moveConfirmTitle = t(
    "inventorysmart.transferRecommendationsMoveConfirmTitle",
    { validSelectedCount, totalSelectedCount }
  );
  const moveConfirmBody = t(
    "inventorysmart.transferRecommendationsMoveConfirmBody",
    {
      zeroTransferSelectedCount,
      validSelectedCount,
      styleHasLabel:
        zeroTransferSelectedCount === 1
          ? t("inventorysmart.transferRecommendationsStyleHasLabel")
          : t("inventorysmart.transferRecommendationsStylesHaveLabel"),
    }
  );

  const renderTabPanels = () => {
    const tabMapper = {
      product: (
        <div>
          <ProductViewTable
            allocationCode={allocationCode}
            transferName={props.transferName || props.allocationName}
            onSelectionChange={handleProductViewSelectionChange}
            isOrderBatching={props.isOrderBatching}
            handleCreateTransfer={handleCreateTransfer}
          />
        </div>
      ),
      store: (
        <div>
          <StoreViewTables
            allocationCode={allocationCode}
            transferName={props.transferName || props.allocationName}
            isOrderBatching={props.isOrderBatching}
          />
        </div>
      ),
      transfer: (
        <div>
          <TransferView
            allocationCode={allocationCode}
            transferName={props.transferName || props.allocationName}
            isOrderBatching={props.isOrderBatching}
          />
        </div>
      ),
    };

    const tabsList = getTabData();
    const tabPanels = tabsList.map((thisTab) => {
      const tabValue = thisTab?.value;
      return (
        <div className={classes.tabPanelContainer} key={tabValue}>
          {tabMapper[tabValue]}
        </div>
      );
    });
    return tabPanels;
  };

  const handleBackClick = () => {
    if (
      props.planStatus === "Finalized" &&
      redirectFromQuery === REDIRECT_FROM_VIEW_PAST_ALLOCATION
    ) {
      props.setBackButtonClickedS2S(true);
      setTimeout(() => {
        navigate("/inventory-smart/view-past-allocations?tab=store_to_store");
      }, 1000);
    } else {
      props.handleCreateNewStoreTransfer();
    }
  };

  const isLoading = props.planStatusLoader || props.storeViewLoader;

  return (
    <div
      className={`${
        props.isOrderBatching
          ? globalClasses.paddingTop_12
          : globalClasses.paddingTop_24
      }`}
    >
      {!transferCreated ? (
        <>
          {!props.isOrderBatching && (
            <DateStrips
              createdDate={dateStripData.createdDate}
              purgeDate={dateStripData.purgeDate}
            />
          )}
          {props.showKpi !== false &&
            ((props.kpiLoader && !kpiData) ||
              (!props.kpiLoader && kpiData)) && (
              <div className={classes.kpiContainer}>
                <Loader loader={props.kpiLoader} minHeight="200px">
                  {kpiData && (
                    <RecommendationKPISection
                      kpiData={transformKpiData(kpiData)}
                      headerTitle={t("inventorysmart.transferRecomm")}
                    />
                  )}
                </Loader>
              </div>
            )}

          <Loader loader={props.planStatusLoader} minHeight="330px">
            {
              //handle other cases of planStatus in future iteration
              (props.planStatus || props.isOrderBatching) && (
                <>
                  <div
                    className={
                      props.planStatus === "Finalized" &&
                      redirectFromQuery === REDIRECT_FROM_VIEW_PAST_ALLOCATION
                        ? ""
                        : classes.tabsContainer
                    }
                  >
                    <Tabs
                      value={activeTab}
                      onChange={handleTabChange}
                      tabNames={getTabData()}
                      tabPanels={renderTabPanels()}
                    />
                    {!(
                      props.planStatus === "Finalized" &&
                      redirectFromQuery === REDIRECT_FROM_VIEW_PAST_ALLOCATION
                    ) && (
                      <div className="store-transfer-view-edit-mode">
                        <ButtonGroup
                          onChange={onButtonGroupChange}
                          selectedOption={props.editMode}
                          options={[
                            {
                              label: t("inventorysmart.viewMode"),
                              value: "view",
                              icon: <EyeIcon />,
                            },
                            {
                              label: t("inventorysmart.editMode"),
                              value: "edit",
                              icon: <EditIconNew />,
                            },
                          ]}
                        />
                      </div>
                    )}
                  </div>

                  {showTable && !props.isOrderBatching && (
                    <div
                      className={`${globalClasses.stickyFooter} ${classes.stickyFooterRight}`}
                    >
                      <Button
                        variant="secondary"
                        onClick={() => handleBackClick()}
                      >
                        <LeftIcon />
                        {props.planStatus === "Finalized" &&
                        redirectFromQuery === REDIRECT_FROM_VIEW_PAST_ALLOCATION
                          ? "Back"
                          : "Back To Product & Set Configuration"}
                      </Button>
                      {!(
                        props.planStatus === "Finalized" &&
                        redirectFromQuery === REDIRECT_FROM_VIEW_PAST_ALLOCATION
                      ) && (
                        <Button
                          variant="primary"
                          onClick={handleMoveToOrderBatchingClick}
                          disabled={isLoading}
                        >
                          {getMoveToOrderBatchingLabel()}
                        </Button>
                      )}
                    </div>
                  )}
                  <Prompt
                    isOpen={showMoveConfirm}
                    variant="warning"
                    title={moveConfirmTitle}
                    children={moveConfirmBody}
                    primaryButtonLabel={t(
                      "inventorysmart.transferRecommendationsYesProceedButton"
                    )}
                    onPrimaryButtonClick={handleConfirmMoveProceed}
                    secondaryButtonLabel={t("inventorysmart.cancel")}
                    onSecondaryButtonClick={() => setShowMoveConfirm(false)}
                    handleClose={() => setShowMoveConfirm(false)}
                  />
                </>
              )
            }
          </Loader>
        </>
      ) : (
        <div
          className={`${globalClasses.marginTop} ${globalClasses.flexRow} ${globalClasses.centerAlign}`}
        >
          <EmptyState
            heading="Store transfer created successfully!"
            description="You will receive a notification when the transfer recommendations are ready."
            secondaryButtonLabel="Return to dashboard"
            onSecondaryButtonClick={handleReturnToDashboard}
            primaryButtonLabel="Create new store transfer"
            onPrimaryButtonClick={handleCreateNewTransfer}
          />
        </div>
      )}
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    transferRecommendationsLoader:
      store?.inventorysmartReducer?.createTransferRecommendationsService
        ?.transferRecommendationsLoader,
    kpiLoader:
      store?.inventorysmartReducer?.createTransferRecommendationsService
        ?.kpiLoader,
    planStatusLoader:
      store?.inventorysmartReducer?.createTransferRecommendationsService
        ?.planStatusLoader,
    storeViewLoader:
      store?.inventorysmartReducer?.createTransferRecommendationsService
        ?.storeViewLoader,
    transferCode:
      store?.inventorysmartReducer?.createTransferRecommendationsService
        ?.transferCode,
    transferStatus:
      store?.inventorysmartReducer?.createTransferRecommendationsService
        ?.transferStatus,
    planStatus:
      store?.inventorysmartReducer?.createTransferRecommendationsService
        ?.planStatus,
    planType:
      store?.inventorysmartReducer?.createTransferRecommendationsService
        ?.planType,
    editMode:
      store?.inventorysmartReducer?.createTransferRecommendationsService
        ?.editMode,
    lockedAllocationCodes:
      store?.inventorysmartReducer?.createTransferRecommendationsService
        ?.lockedAllocationCodes,
    refreshKey:
      store?.inventorysmartReducer?.createTransferRecommendationsService
        ?.refreshKey,
    transferName:
      store?.inventorysmartReducer?.createStoreTransferService?.transferName,
    allocationId:
      store?.inventorysmartReducer?.createStoreTransferService?.allocationId,
    allocationName:
      store?.inventorysmartReducer?.createStoreTransferService?.allocationName,
    inventorysmartModulesPermission:
      store.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
    createStoreTransferRecommFilterDependency:
      store?.inventorysmartReducer?.createStoreTransferService
        ?.createStoreTransferRecommFilterDependency,
    orderBatchingModuleLabel:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.orderBatchingConfig?.module_label,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setKpiLoader: (payload) => dispatch(setKpiLoader(payload)),
  setPlanStatusLoader: (payload) => dispatch(setPlanStatusLoader(payload)),
  setStoreViewLoader: (payload) => dispatch(setStoreViewLoader(payload)),
  getTransferKPI: (payload) => dispatch(getTransferKPI(payload)),
  getStatus: (payload) => dispatch(getStatus(payload)),
  setTransferCode: (payload) => dispatch(setTransferCode(payload)),
  setTransferStatus: (payload) => dispatch(setTransferStatus(payload)),
  setPlanStatus: (payload) => dispatch(setPlanStatus(payload)),
  setPlanType: (payload) => dispatch(setPlanType(payload)),
  setEditMode: (payload) => dispatch(setEditMode(payload)),
  setLockedAllocationCodes: (payload) =>
    dispatch(setLockedAllocationCodes(payload)),
  acquireEditLock: (payload) => dispatch(acquireEditLock(payload)),
  releaseEditLock: (payload) => dispatch(releaseEditLock(payload)),
  editModeHeartbeat: (payload) => dispatch(editModeHeartbeat(payload)),
  updateReviewStatus: (payload) => dispatch(updateReviewStatus(payload)),
  resetTransferRecommendationsState: () =>
    dispatch(resetTransferRecommendationsState()),
  setS2SFiltersFromS2S: (payload) => dispatch(setS2SFiltersFromS2S(payload)),
  setBackButtonClickedS2S: (payload) =>
    dispatch(setBackButtonClickedS2S(payload)),
  triggerRefresh: (payload) => dispatch(triggerRefresh(payload)),
  addSnack: (snack) => dispatch(addSnack(snack)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(CreateTransferRecommendations);
