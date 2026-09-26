import React, { useEffect, useState, useCallback, useRef } from "react";
import { useDispatch, useSelector, useStore } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom-v5-compat";
import Typography from "@mui/material/Typography";
import moment from "moment";
import { isEmpty } from "lodash";
import { Prompt, ButtonGroup, Loader } from "impact-ui-v3";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import globalStyles from "core/Styles/globalStyles";
import LoadingOverlay from "core/Utils/Loader/loader";
import { DECISION_DASHBOARD } from "modules/oms/constants-oms/routeConstants.js";
import { ORDER_MANAGEMENT_FILTER_CONFIG } from "modules/oms/constants-oms/apiConstants";
import { ERROR_MESSAGE } from "modules/oms/constants-oms/stringConstants";
import { useExpediteOrdersCardsStyles } from "./components/styles.js";
import HeaderKPIPanel from "./components/HeaderKPIPanel";
import ExpediteOrdersDeepDiveSection from "./components/Deep-Dive/DeepDiveSection";
import ExpediteOrdersDeepDiveFilterScope from "./components/Deep-Dive/ExpediteOrdersDeepDiveFilterScope";
import SimulateBottomSheet from "./components/SimulateBottomSheet";
import CreateOffCycleBottomSheet from "./components/CreateOffCycleBottomSheet";
import OffCycleOrderOptimizationScreen from "modules/oms/pages-oms/Create-New-Order/components/OffCycleOrder/ OffcycleOrder-Optimization-Screen/index.js";
import ExpediteOrdersBottomNav from "./components/ExpediteOrdersBottomNav";
import ApprovalFlowDialog from "modules/oms/pages-oms/Order-Management/components/Approval-Flow-Dialog/ApprovalFlowDialog";
import SelectStrategyApprovePanel from "modules/oms/pages-oms/Decision-Dashboard/Ordering-Alerts/components/SelectStrategyApprovePanel";
import {
  getExpediteOrdersConfig,
  setExpediteOrdersConfig,
  bootstrapExpediteSession,
  setGeneratedOrders,
  setExpediteFlowStep,
  setRevisionId,
  setAfterKpi,
  setAfterChart,
  resetExpediteSessionState,
  fetchExpediteAlertStrategyKpi,
  fetchExpediteChart,
  fetchExpediteOrdersAlertsTableData,
  buildExpediteSessionStartPayloadFromState,
  startExpediteSession,
} from "modules/oms/services-oms/Decision-Dashboard/expedite-order-service";
import { expediteOrdersService } from "modules/oms/services-oms/Decision-Dashboard/expedite-order-service";
import { getOmsCoreFiscalCalendar } from "modules/oms/services-oms/common/common-services";
import {
  getOmsDeepDiveFilters,
  setOrderManagementProductDetailsFilters,
} from "modules/oms/services-oms/Order-Management/order-management-service";
import {
  getExpediteAlertOrderPlacementDateRange,
  setExpediteApprovalFlowFiltersInStorage,
  buildExpediteApprovalFlowRows,
  storeExpediteAlertPayload,
  storeExpediteOffCycleArticleLocPayload,
} from "modules/oms/pages-oms/Decision-Dashboard/Ordering-Alerts/utils/helper";
import { getOffCycleDraftArticleLoc } from "modules/oms/services-oms/Create-New-Order/off-cycle-order-service";
import {
  EXPEDITE_LS_KEYS,
  EXPEDITE_PAGE_TITLE,
  EXPEDITE_PAGE_TITLE_AFTER,
  EXPEDITE_CTA_TITLE,
  EXPEDITE_CTA_TITLE_AFTER,
  EXPEDITE_CREATE_OFF_CYCLE_LABEL,
  EXPEDITE_CREATE_OFF_CYCLE_LABEL_AFTER,
  clearExpediteLocalStorage,
  getExpediteActiveArticles,
} from "./constants";
import { displaySnackMessages } from "core/Utils/utils.js";

const BREADCRUMBS = [
  { label: "Home", to: "/home" },
  { label: "Decision Dashboard", to: DECISION_DASHBOARD },
  { label: "Expedite Orders", id: 2 },
];

/** Notification-mode Before/After button group options (beside the title). */
const NOTIFICATION_VIEW_OPTIONS = [
  { label: "Before", value: "before" },
  { label: "After", value: "after" },
];

function OffCycleOrderExpediteOrders() {
  const globalClasses = globalStyles();
  const classes = useExpediteOrdersCardsStyles();
  const dispatch = useDispatch();
  const store = useStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Notification (draft-launch) mode: opened from View Drafts / a notification
  // as `expedite-orders?draft_id=...&tab=before`. In this mode we seed the
  // expedite localStorage payload from the draft's article/loc set and render
  // an inline Before/After button group beside the page title. Both views use
  // the same component; they differ only by payload (`type` + `draft_id`) and a
  // few UI adjustments (title, Override card visibility, button labels).
  const draftUrlParams = new URLSearchParams(location.search);
  const draftIdFromUrl = draftUrlParams.get("draft_id");
  const isDraftMode = Boolean(draftIdFromUrl);
  // Initial view is driven by the `tab` query param (`before` | `after`), so the
  // landing view can be changed just by changing the navigation URL.
  const [notificationView, setNotificationView] = useState(
    draftUrlParams.get("tab") === "after" ? "after" : "before"
  );
  /** Skips the toggle-reload effect on first render (mount bootstrap handles it). */
  const isFirstNotificationRender = useRef(true);
  const [isDraftHydrating, setIsDraftHydrating] = useState(isDraftMode);
  const [draftError, setDraftError] = useState(null);

  const [selectedView, setSelectedView] = useState("before");
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);
  const [bottomSheetMode, setBottomSheetMode] = useState(null);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [editCardIndex, setEditCardIndex] = useState(null);
  const [showOffCycleOptimization, setShowOffCycleOptimization] = useState(
    false
  );
  const [offCycleCalculationData, setOffCycleCalculationData] = useState(null);
  /** Index of generated order pending delete confirmation (single card). */
  const [deleteOrderIndex, setDeleteOrderIndex] = useState(null);
  /** Leave expedite / dashboard — Figma 3080:74792; `showFinalize` only on step 2. */
  const [leavePrompt, setLeavePrompt] = useState(null);
  /** Step 2 bottom-nav Cancel — discard all simulations (same outcome as clearing orders). */
  const [bulkDiscardOpen, setBulkDiscardOpen] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalFlowRows, setApprovalFlowRows] = useState([]);
  const [approvalFlowPayload, setApprovalFlowPayload] = useState({});
  const [fiscalCalendarDetails, setFiscalCalendarDetails] = useState([]);
  const [isOpeningApprovalFlow, setIsOpeningApprovalFlow] = useState(false);

  const [showStrategyPanel, setShowStrategyPanel] = useState(false);
  const [strategyKpiData, setStrategyKpiData] = useState(null);
  const [strategyKpiLoading, setStrategyKpiLoading] = useState(false);
  const strategyRowsRef = useRef([]);

  const [selectedMetricCard, setSelectedMetricCard] = useState(
    "default_lead_time"
  );
  const selectedMetricCardRef = useRef("default_lead_time");

  const approvalSucceededRef = useRef(false);
  const scrollContentRef = useRef(null);

  const orderManagementProductDetailsFilters = useSelector(
    (state) =>
      state?.omsReducer?.orderManagementService
        ?.orderManagementProductDetailsFilters
  );

  const sessionId = useSelector(
    (state) => state?.omsReducer?.expediteOrdersService?.sessionId
  );
  const isLoadingSession = useSelector(
    (state) => state?.omsReducer?.expediteOrdersService?.isLoadingSession
  );
  const isSimulating = useSelector(
    (state) => state?.omsReducer?.expediteOrdersService?.isSimulating
  );
  const sessionError = useSelector(
    (state) => state?.omsReducer?.expediteOrdersService?.sessionError
  );
  const expediteFlowStep = useSelector(
    (state) => state?.omsReducer?.expediteOrdersService?.expediteFlowStep
  );
  const generatedOrders = useSelector(
    (state) => state?.omsReducer?.expediteOrdersService?.generatedOrders
  );
  const baseExpeditePayload = useSelector(
    (state) => state?.omsReducer?.expediteOrdersService?.baseExpeditePayload
  );

  /** After removing all simulations: clear LS, after-state, step 1, close sheet. */
  const clearAfterSimulationStateToStep1 = useCallback(() => {
    setShowBottomSheet(false);
    setBottomSheetMode(null);
    setEditCardIndex(null);
    localStorage.removeItem(EXPEDITE_LS_KEYS.GENERATED_ORDERS);
    localStorage.removeItem(EXPEDITE_LS_KEYS.BOTTOM_SHEET_DATA);
    localStorage.removeItem(EXPEDITE_LS_KEYS.REVISION_ID);
    dispatch(setRevisionId(null));
    dispatch(setAfterKpi(null));
    dispatch(setAfterChart(null));
    dispatch(setExpediteFlowStep(1));
  }, [dispatch]);

  /** Deep-dive: step 1 = Before; step 2 = After first (post-simulation / restore). */
  useEffect(() => {
    if (expediteFlowStep === 1) {
      setSelectedView("before");
    } else if (expediteFlowStep === 2) {
      setSelectedView("after");
    }
  }, [expediteFlowStep]);

  // ─── Config ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const config = await dispatch(getExpediteOrdersConfig());
        dispatch(setExpediteOrdersConfig(config || {}));
      } catch {
        dispatch(setExpediteOrdersConfig({}));
      } finally {
        setIsConfigLoaded(true);
      }
    };
    fetchConfig();
  }, []);

  // ─── Fiscal calendar (Approval Flow pane) ─────────────────────────────────
  useEffect(() => {
    const loadFiscalCalendar = async () => {
      try {
        const startYear = moment().year();
        const endYear = moment().year() + 2;
        const response = await getOmsCoreFiscalCalendar(
          `?start_fiscal_year=${startYear}&end_fiscal_year=${endYear}`
        );
        moment.updateLocale("en", {
          week: {
            dow: response?.data?.data?.week_start_day || 0,
          },
        });
        setFiscalCalendarDetails(response?.data?.data?.data || []);
      } catch (error) {
        console.error(error);
      }
    };
    loadFiscalCalendar();
  }, []);

  // ─── Product-details filter config (Approval Flow preselection) ───────────
  useEffect(() => {
    const ensureProductDetailsFilters = async () => {
      if (orderManagementProductDetailsFilters?.length > 0) return;
      try {
        const response = await dispatch(getOmsDeepDiveFilters());
        const productDetailsFilters = [];
        if (response?.data?.data?.length > 0) {
          productDetailsFilters.push(response.data.data[0]);
        }
        dispatch(
          setOrderManagementProductDetailsFilters(productDetailsFilters)
        );
      } catch (error) {
        console.error(error);
      }
    };
    ensureProductDetailsFilters();
  }, [dispatch, orderManagementProductDetailsFilters]);

  // ─── Draft hydration (View Drafts → Expedite) ────────────────────────────
  // Fetch the draft's {article, loc_code} set and write the same localStorage
  // payload the Decision-Dashboard flow produces, so the session bootstrap
  // below runs unchanged.
  useEffect(() => {
    if (!isDraftMode) return undefined;
    let cancelled = false;

    const hydrateFromDraft = async () => {
      try {
        clearExpediteLocalStorage();
        const response = await dispatch(
          getOffCycleDraftArticleLoc({ draft_id: draftIdFromUrl })
        );
        const rows = response?.data?.data || [];
        const seen = new Set();
        const orders = [];
        rows.forEach((row) => {
          const article = row?.article;
          const loc_code = row?.loc_code;
          if (!article || !loc_code) return;
          const key = `${article}|${loc_code}`;
          if (seen.has(key)) return;
          seen.add(key);
          orders.push({ article, loc_code });
        });

        if (!orders.length) {
          if (!cancelled) {
            setDraftError("No articles found for this draft.");
            setIsDraftHydrating(false);
          }
          return;
        }

        const articles = [...new Set(orders.map((order) => order.article))];
        storeExpediteAlertPayload(articles, [], null);
        storeExpediteOffCycleArticleLocPayload(orders, [], null);

        if (!cancelled) setIsDraftHydrating(false);
      } catch (error) {
        console.error("Error hydrating expedite draft:", error);
        if (!cancelled) {
          setDraftError("Unable to load draft details. Please try again.");
          setIsDraftHydrating(false);
        }
      }
    };

    hydrateFromDraft();
    return () => {
      cancelled = true;
    };
  }, [isDraftMode, draftIdFromUrl, dispatch]);

  // ─── Session Bootstrap ──────────────────────────────────────────────────────
  useEffect(() => {
    // In draft mode wait until the draft payload has been written to LS.
    if (isDraftMode && isDraftHydrating) return;

    const alertPayloadRaw = localStorage.getItem(
      EXPEDITE_LS_KEYS.ALERT_PAYLOAD
    );
    if (!alertPayloadRaw) {
      displaySnackMessages(
        "No alert selection found. Please go to Decision Dashboard and select alerts.",
        "error",
        dispatch
      );
      return;
    }

    let alertPayload;
    try {
      alertPayload = JSON.parse(alertPayloadRaw);
    } catch {
      clearExpediteLocalStorage();
      displaySnackMessages(
        "Invalid alert selection. Please go to Decision Dashboard and select alerts.",
        "error",
        dispatch
      );
      return;
    }

    if (!alertPayload?.choiceDcCombinations?.length) {
      clearExpediteLocalStorage();
      displaySnackMessages(
        "Invalid alert selection.Please go to Decision Dashboard and select alerts.",
        "error",
        dispatch
      );
      return;
    }

    const storedSessionId = localStorage.getItem(EXPEDITE_LS_KEYS.SESSION_ID);
    const storedGeneratedOrders = localStorage.getItem(
      EXPEDITE_LS_KEYS.GENERATED_ORDERS
    );

    /** Step 2 needs a revision_id to refetch after-KPI/charts after refresh; LS only holds in-memory Redux otherwise. */
    let rehydrateAfterStateRevisionId = null;

    if (storedGeneratedOrders) {
      try {
        const parsedOrders = JSON.parse(storedGeneratedOrders);
        if (Array.isArray(parsedOrders) && parsedOrders.length > 0) {
          const lastCardRevision =
            parsedOrders[parsedOrders.length - 1]?.revisionId;
          rehydrateAfterStateRevisionId =
            lastCardRevision ||
            localStorage.getItem(EXPEDITE_LS_KEYS.REVISION_ID);

          if (rehydrateAfterStateRevisionId) {
            dispatch(setGeneratedOrders(parsedOrders));
            dispatch(setExpediteFlowStep(2));
          } else {
            localStorage.removeItem(EXPEDITE_LS_KEYS.GENERATED_ORDERS);
          }
        }
      } catch (error) {
        console.error("Error parsing generated orders:", error);
      }
    }

    dispatch(
      bootstrapExpediteSession({
        alertPayload,
        storedSessionId: storedSessionId || null,
        rehydrateAfterStateRevisionId,
        notificationType: isDraftMode ? notificationView : undefined,
        draftId: draftIdFromUrl,
      })
    );
    // notificationView is intentionally read at mount only; subsequent toggles
    // are handled by the dedicated reload effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, navigate, isDraftMode, isDraftHydrating]);

  // ─── Notification Before/After toggle reload ──────────────────────────────
  // When the user flips the Before/After button group, discard any step-2
  // simulation state and re-bootstrap with the new `type` so KPI/chart/
  // constraints reload for the selected view ("modules load on selection").
  useEffect(() => {
    if (!isDraftMode) return;
    if (isFirstNotificationRender.current) {
      isFirstNotificationRender.current = false;
      return;
    }

    dispatch(setGeneratedOrders([]));
    localStorage.removeItem(EXPEDITE_LS_KEYS.GENERATED_ORDERS);
    localStorage.removeItem(EXPEDITE_LS_KEYS.BOTTOM_SHEET_DATA);
    localStorage.removeItem(EXPEDITE_LS_KEYS.REVISION_ID);
    dispatch(setRevisionId(null));
    dispatch(setAfterKpi(null));
    dispatch(setAfterChart(null));
    dispatch(setExpediteFlowStep(1));

    const alertPayloadRaw = localStorage.getItem(
      EXPEDITE_LS_KEYS.ALERT_PAYLOAD
    );
    if (!alertPayloadRaw) return;
    let alertPayload;
    try {
      alertPayload = JSON.parse(alertPayloadRaw);
    } catch {
      return;
    }

    dispatch(
      bootstrapExpediteSession({
        alertPayload,
        storedSessionId:
          localStorage.getItem(EXPEDITE_LS_KEYS.SESSION_ID) || null,
        rehydrateAfterStateRevisionId: null,
        notificationType: notificationView,
        draftId: draftIdFromUrl,
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notificationView]);

  // ─── Session error recovery ──────────────────────────────────────────────
  useEffect(() => {
    if (!sessionError) return;
    const alertPayloadRaw = localStorage.getItem(
      EXPEDITE_LS_KEYS.ALERT_PAYLOAD
    );
    if (alertPayloadRaw) {
      displaySnackMessages(
        "Unable to initialise session. Please retry from the Decision Dashboard.",
        "error",
        dispatch
      );
      clearExpediteLocalStorage();
      dispatch(resetExpediteSessionState());
    }
  }, [sessionError]);

  // ─── Persist generated orders ────────────────────────────────────────────
  useEffect(() => {
    if (generatedOrders.length > 0) {
      localStorage.setItem(
        EXPEDITE_LS_KEYS.GENERATED_ORDERS,
        JSON.stringify(generatedOrders)
      );
    }
  }, [generatedOrders]);

  // ─── Reload data (except HeaderKPI) when metric card changes ──────────────
  const isFirstMetricCardRender = useRef(true);
  const prevSelectedMetricCard = useRef(selectedMetricCard);

  useEffect(() => {
    // Skip reload on initial mount
    if (isFirstMetricCardRender.current) {
      isFirstMetricCardRender.current = false;
      prevSelectedMetricCard.current = selectedMetricCard;
      selectedMetricCardRef.current = selectedMetricCard;
      return;
    }

    // Skip if session not ready
    if (!sessionId || !isConfigLoaded) {
      return;
    }

    // Skip if selectedMetricCard hasn't actually changed
    if (prevSelectedMetricCard.current === selectedMetricCard) {
      return;
    }

    prevSelectedMetricCard.current = selectedMetricCard;

    // Get the current metric card value from ref (ensures latest value)
    const currentMetricCard = selectedMetricCardRef.current;

    // Store the selected metric card in localStorage
    localStorage.setItem(
      EXPEDITE_LS_KEYS.SELECTED_METRIC_CARD,
      currentMetricCard
    );

    // Reload chart and deep dive data without reloading KPI panel
    const reloadDeepDiveData = async () => {
      // Build payload from Redux state (same structure as refetchExpediteSessionOnFilterApply)
      const sessionStartPayload = buildExpediteSessionStartPayloadFromState(
        store.getState
      );

      if (!sessionStartPayload) return;

      // Add chart_scenario to the session start payload (use ref value for latest)
      const sessionStartWithScenario = {
        ...sessionStartPayload,
        chart_scenario: currentMetricCard,
      };

      // Set the selected chart scenario in Redux (required for fetchExpediteChart)
      dispatch(
        expediteOrdersService.actions.setSelectedChartScenario(
          currentMetricCard
        )
      );

      // Set loading states
      dispatch(expediteOrdersService.actions.setIsBeforeChartLoading(true));
      dispatch(expediteOrdersService.actions.setDeepDiveTableLoader(true));

      try {
        // Start new session with the selected scenario
        const startRes = await dispatch(
          startExpediteSession(sessionStartWithScenario)
        );
        const newSessionId = startRes?.data?.data?.session_id;

        let currentSessionId = sessionId;
        if (newSessionId) {
          currentSessionId = newSessionId;
          dispatch(expediteOrdersService.actions.setSessionId(newSessionId));
          localStorage.setItem(EXPEDITE_LS_KEYS.SESSION_ID, newSessionId);
        }

        // Prepare payload for chart and table reload
        const dataPayload = {
          ...sessionStartWithScenario,
          session_id: currentSessionId,
          is_simulated: false,
        };

        // Reload only chart and table data, NOT KPI
        const [chartRes, tableRes] = await Promise.all([
          dispatch(fetchExpediteChart(dataPayload)),
          dispatch(fetchExpediteOrdersAlertsTableData(dataPayload)),
        ]);

        // Update chart data in Redux
        if (chartRes?.data?.data) {
          const chartEnvelope = chartRes.data.data;
          dispatch(expediteOrdersService.actions.setBeforeChart(chartEnvelope));
        }
      } catch (error) {
        console.error("Error reloading deep dive data:", error);
      } finally {
        // Clear loading states
        dispatch(expediteOrdersService.actions.setIsBeforeChartLoading(false));
        dispatch(expediteOrdersService.actions.setDeepDiveTableLoader(false));
      }
    };

    reloadDeepDiveData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMetricCard]);

  // ─── Handlers ────────────────────────────────────────────────────────────
  const handleOpenOffCycleSheet = useCallback(() => {
    setEditCardIndex(null);
    setBottomSheetMode("offCycle");
    setShowBottomSheet(true);
  }, []);

  const handleOpenSimulateSheet = useCallback((cardIndex = null) => {
    setEditCardIndex(cardIndex);
    setBottomSheetMode("simulate");
    setShowBottomSheet(true);
  }, []);

  const handleCloseBottomSheet = useCallback(() => {
    setShowBottomSheet(false);
    setBottomSheetMode(null);
    setEditCardIndex(null);
  }, []);

  const handleOffCycleDraftCreated = useCallback((calculationData) => {
    setOffCycleCalculationData(calculationData);
    setShowOffCycleOptimization(true);
    setShowBottomSheet(false);
    setBottomSheetMode(null);
  }, []);

  const handleMetricCardChange = useCallback(
    /** @param {string} metricCardKey */
    (metricCardKey) => {
      selectedMetricCardRef.current = metricCardKey;
      setSelectedMetricCard(metricCardKey);
    },
    []
  );

  const leaveToDashboard = useCallback(() => {
    clearExpediteLocalStorage();
    dispatch(resetExpediteSessionState());
    navigate(DECISION_DASHBOARD);
  }, [dispatch, navigate]);

  const applyDeleteGeneratedOrder = useCallback(
    (cardIndex) => {
      const updated = generatedOrders.filter((_, i) => i !== cardIndex);
      dispatch(setGeneratedOrders(updated));
      localStorage.removeItem(EXPEDITE_LS_KEYS.BOTTOM_SHEET_DATA);
      setShowBottomSheet(false);
      setBottomSheetMode(null);
      setEditCardIndex(null);

      if (updated.length === 0) {
        clearAfterSimulationStateToStep1();
      } else {
        localStorage.setItem(
          EXPEDITE_LS_KEYS.GENERATED_ORDERS,
          JSON.stringify(updated)
        );
      }
    },
    [dispatch, generatedOrders, clearAfterSimulationStateToStep1]
  );

  const discardAllSimulationsFromStep2 = useCallback(() => {
    dispatch(setGeneratedOrders([]));
    clearAfterSimulationStateToStep1();
  }, [dispatch, clearAfterSimulationStateToStep1]);

  const openLeavePromptFromBack = useCallback(() => {
    setLeavePrompt({ showFinalize: expediteFlowStep === 2 });
  }, [expediteFlowStep]);

  const openLeavePromptFromCancelStep1 = useCallback(() => {
    setLeavePrompt({ showFinalize: false });
  }, []);

  const buildStrategyKpiPayload = useCallback((articles) => {
    const alertPayloadRaw = localStorage.getItem(
      EXPEDITE_LS_KEYS.ALERT_PAYLOAD
    );
    let selectedFilters = [];
    if (alertPayloadRaw) {
      try {
        const alertPayload = JSON.parse(alertPayloadRaw);
        selectedFilters = alertPayload.filters || [];
      } catch (e) {
        console.error(e);
      }
    }

    return {
      choiceDcCombinations: articles,
      filters: selectedFilters,
      dateFilter: [
        {
          attribute_name: "order_placement_recom_date",
          start_date: null,
          end_date: null,
        },
        { attribute_name: "not_before_date", start_date: null, end_date: null },
      ],
      dashboardFilters: selectedFilters || null,
    };
  }, []);

  const openStrategyPanel = useCallback(
    async (articles, columnName) => {
      strategyRowsRef.current = buildExpediteApprovalFlowRows(
        articles,
        columnName
      );
      setStrategyKpiData(null);
      setShowStrategyPanel(true);
      setStrategyKpiLoading(true);
      try {
        const kpiBlock = await dispatch(
          fetchExpediteAlertStrategyKpi(buildStrategyKpiPayload(articles))
        );
        if (kpiBlock) {
          setStrategyKpiData(kpiBlock);
        } else {
          displaySnackMessages(ERROR_MESSAGE, "error", dispatch);
        }
      } catch (error) {
        console.error(error);
        displaySnackMessages(ERROR_MESSAGE, "error", dispatch);
      } finally {
        setStrategyKpiLoading(false);
      }
    },
    [dispatch, buildStrategyKpiPayload]
  );

  const closeStrategyPanel = useCallback(() => {
    setShowStrategyPanel(false);
    setStrategyKpiData(null);
    setStrategyKpiLoading(false);
  }, []);

  const handleStrategyApprove = useCallback(() => {
    const rowsForApproval = strategyRowsRef.current;
    setShowStrategyPanel(false);
    if (rowsForApproval?.length) {
      const alertPayloadRaw = localStorage.getItem(
        EXPEDITE_LS_KEYS.ALERT_PAYLOAD
      );
      if (alertPayloadRaw) {
        try {
          const alertPayload = JSON.parse(alertPayloadRaw);
          setExpediteApprovalFlowFiltersInStorage(alertPayload);
        } catch (e) {
          console.error(e);
        }
      }
      setApprovalFlowRows(rowsForApproval);
      setApprovalFlowPayload({
        recommendedOrderPlacementDateRange: getExpediteAlertOrderPlacementDateRange(),
      });
      setShowApprovalModal(true);
    }
  }, []);

  const handleOpenApprovalFlow = useCallback(async () => {
    const alertPayloadRaw = localStorage.getItem(
      EXPEDITE_LS_KEYS.ALERT_PAYLOAD
    );
    if (!alertPayloadRaw) {
      displaySnackMessages(
        "No alert selection found. Please go to Decision Dashboard and select alerts.",
        "error",
        dispatch
      );
      return;
    }

    let alertPayload;
    try {
      alertPayload = JSON.parse(alertPayloadRaw);
    } catch {
      displaySnackMessages("Invalid alert selection.", "error", dispatch);
      return;
    }

    setIsOpeningApprovalFlow(true);
    try {
      let productDetailsFilters = orderManagementProductDetailsFilters;
      if (!productDetailsFilters?.length) {
        const response = await dispatch(getOmsDeepDiveFilters());
        productDetailsFilters = [];
        if (response?.data?.data?.length > 0) {
          productDetailsFilters.push(response.data.data[0]);
        }
        dispatch(
          setOrderManagementProductDetailsFilters(productDetailsFilters)
        );
      }

      if (!productDetailsFilters?.length) {
        displaySnackMessages(ERROR_MESSAGE, "error", dispatch);
        return;
      }

      const articles = getExpediteActiveArticles(
        alertPayload.choiceDcCombinations,
        generatedOrders
      );
      if (!articles.length) {
        displaySnackMessages(
          "No articles available for approval.",
          "error",
          dispatch
        );
        return;
      }

      const columnName = productDetailsFilters[0]?.column_name || "article";
      // Open strategy panel instead of directly launching approval flow
      await openStrategyPanel(articles, columnName);
    } catch (error) {
      console.error(error);
      displaySnackMessages(ERROR_MESSAGE, "error", dispatch);
    } finally {
      setIsOpeningApprovalFlow(false);
    }
  }, [
    dispatch,
    generatedOrders,
    orderManagementProductDetailsFilters,
    openStrategyPanel,
  ]);

  const handleApprovalSuccess = useCallback(() => {
    approvalSucceededRef.current = true;
  }, []);

  const reloadExpediteScreen = useCallback(() => {
    const alertPayloadRaw = localStorage.getItem(
      EXPEDITE_LS_KEYS.ALERT_PAYLOAD
    );
    if (!alertPayloadRaw) return;

    let alertPayload;
    try {
      alertPayload = JSON.parse(alertPayloadRaw);
    } catch {
      return;
    }

    const storedSessionId =
      localStorage.getItem(EXPEDITE_LS_KEYS.SESSION_ID) || sessionId;

    let rehydrateAfterStateRevisionId = null;
    if (generatedOrders?.length > 0) {
      rehydrateAfterStateRevisionId =
        generatedOrders[generatedOrders.length - 1]?.revisionId ||
        localStorage.getItem(EXPEDITE_LS_KEYS.REVISION_ID);
    }

    dispatch(
      bootstrapExpediteSession({
        alertPayload,
        storedSessionId,
        rehydrateAfterStateRevisionId,
        notificationType: isDraftMode ? notificationView : undefined,
        draftId: draftIdFromUrl,
      })
    );
  }, [
    dispatch,
    generatedOrders,
    sessionId,
    isDraftMode,
    notificationView,
    draftIdFromUrl,
  ]);

  const handleApprovalFlowReload = useCallback(
    (shouldReload) => {
      if (!shouldReload || !approvalSucceededRef.current) return;
      approvalSucceededRef.current = false;
      reloadExpediteScreen();
    },
    [reloadExpediteScreen]
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  if (!isConfigLoaded) {
    return (
      <div className={globalClasses.paddingAround}>
        <LoadingOverlay
          loader
          size="medium"
          text="Loading"
          minHeight="200px"
          wrapperPosition="relative"
        >
          <div style={{ width: "100%" }} />
        </LoadingOverlay>
      </div>
    );
  }

  if (isDraftMode && isDraftHydrating) {
    return (
      <div className={globalClasses.paddingAround}>
        <LoadingOverlay
          loader
          size="medium"
          text="Loading draft…"
          minHeight="200px"
          wrapperPosition="relative"
        >
          <div style={{ width: "100%" }} />
        </LoadingOverlay>
      </div>
    );
  }

  if (isDraftMode && draftError) {
    return (
      <div className={globalClasses.paddingAround}>
        <Typography
          variant="body2"
          align="center"
          sx={{ color: "#60697D", fontWeight: 500, padding: "24px" }}
        >
          {draftError}
        </Typography>
      </div>
    );
  }

  // ── Notification (Before/After) derived view config ───────────────────────
  // `isAfter`     → "after" view selected in notification mode.
  // Before view (notification) is read-only: no Override card, no actions.
  // Legacy mode (no draft_id) keeps the default title/card/labels.
  const isAfter = isDraftMode && notificationView === "after";
  const isBeforeReadOnly = isDraftMode && !isAfter;
  const pageTitle = isAfter ? EXPEDITE_PAGE_TITLE_AFTER : EXPEDITE_PAGE_TITLE;
  const ctaTitle = isAfter ? EXPEDITE_CTA_TITLE_AFTER : EXPEDITE_CTA_TITLE;
  const createOffCycleLabel = isAfter
    ? EXPEDITE_CREATE_OFF_CYCLE_LABEL_AFTER
    : EXPEDITE_CREATE_OFF_CYCLE_LABEL;
  // Override card is hidden in the read-only Before view; shown in legacy + After.
  const showCtaCard = !isDraftMode || isAfter;
  const selectedStylesCount = Array.isArray(baseExpeditePayload?.data)
    ? baseExpeditePayload.data.length
    : 0;
  const notificationSubtitle = isDraftMode
    ? `${selectedStylesCount} Style${
        selectedStylesCount !== 1 ? "s" : ""
      } Selected`
    : null;
  const beforeAfterControl = isDraftMode ? (
    <ButtonGroup
      options={NOTIFICATION_VIEW_OPTIONS}
      selectedOption={notificationView}
      onChange={(_event, value) => {
        // impact-ui-v3 ButtonGroup forwards MUI ToggleButton onClick(event, value);
        // the selected value is the second arg and null on a no-op click.
        if (value != null) setNotificationView(value);
      }}
    />
  ) : null;

  return (
    <div className={classes.expeditePageRoot}>
      <div className={classes.expeditePageColumn}>
        <ExpediteOrdersDeepDiveFilterScope
          breadcrumb={<HeaderBreadCrumbs options={BREADCRUMBS} />}
          scrollContentRef={scrollContentRef}
          sessionBased
          showPageLevelFilters={expediteFlowStep === 1 && !isSimulating}
          pageTitle={pageTitle}
          subtitle={notificationSubtitle}
          beforeAfterControl={beforeAfterControl}
          showCtaCard={showCtaCard}
          ctaTitle={ctaTitle}
          createOffCycleLabel={createOffCycleLabel}
          onCreateOffCycle={handleOpenOffCycleSheet}
          onExpediteOrders={() => handleOpenSimulateSheet(null)}
        >
          <HeaderKPIPanel
            onCreateOffCycle={handleOpenOffCycleSheet}
            onExpediteOrders={() => handleOpenSimulateSheet(null)}
            orders={generatedOrders}
            onEdit={handleOpenSimulateSheet}
            onDelete={(cardIndex) => setDeleteOrderIndex(cardIndex)}
            isSimulating={isSimulating}
            showCtaCard={showCtaCard}
            ctaTitle={ctaTitle}
            createOffCycleLabel={createOffCycleLabel}
            showOffCycleOptimization={showOffCycleOptimization}
            selectedMetricCard={selectedMetricCard}
            onMetricCardChange={handleMetricCardChange}
          />

          {isSimulating && (
            <LoadingOverlay
              loader
              size="medium"
              text="Generating recommendations…"
              minHeight="300px"
              wrapperPosition="relative"
            >
              <div style={{ width: "100%", minHeight: 300 }} />
            </LoadingOverlay>
          )}

          {selectedMetricCard !== "loading_scenario" && (
            <>
              {!isSimulating && (isLoadingSession || !sessionId) && (
                <LoadingOverlay
                  loader
                  size="medium"
                  text="Loading session..."
                  minHeight="300px"
                  wrapperPosition="relative"
                >
                  <div style={{ width: "100%", minHeight: 300 }} />
                </LoadingOverlay>
              )}

              {sessionId && (
                <ExpediteOrdersDeepDiveSection
                  selectedDeepDiveOption={selectedView}
                  onDeepDiveOptionChange={(value) => setSelectedView(value)}
                  showDeepDiveControls={expediteFlowStep === 2 && !isSimulating}
                  showAlertsDetailsTable={expediteFlowStep === 1}
                  sessionBased
                  selectedMetricCard={selectedMetricCard}
                />
              )}
            </>
          )}

          {selectedMetricCard === "loading_scenario" && (
            <div className={classes.expeditePageRoot}>
              <OffCycleOrderOptimizationScreen
                view_type="expedite_off_cycle"
                optimizationDetails={offCycleCalculationData}
                showPrimaryButton={false}
                onPrimaryButtonClick={() => {
                  setShowOffCycleOptimization(false);
                  setOffCycleCalculationData(null);
                  navigate(DECISION_DASHBOARD);
                }}
                value={[
                  offCycleCalculationData?.sku,
                  offCycleCalculationData?.dc,
                  offCycleCalculationData?.vendor,
                  offCycleCalculationData?.data_points,
                ]}
              />
            </div>
          )}
        </ExpediteOrdersDeepDiveFilterScope>

        <ExpediteOrdersBottomNav
          expediteFlowStep={expediteFlowStep}
          isSimulating={isSimulating}
          isApproveLoading={isOpeningApprovalFlow}
          onBackToDashboard={openLeavePromptFromBack}
          onCancel={
            expediteFlowStep === 2
              ? () => setBulkDiscardOpen(true)
              : openLeavePromptFromCancelStep1
          }
          onApprove={handleOpenApprovalFlow}
          hideActions={isBeforeReadOnly}
        />
      </div>

      {showBottomSheet && bottomSheetMode === "simulate" && (
        <SimulateBottomSheet
          open={showBottomSheet}
          onClose={handleCloseBottomSheet}
          editCardIndex={editCardIndex}
        />
      )}

      {showBottomSheet && bottomSheetMode === "offCycle" && (
        <CreateOffCycleBottomSheet
          open={showBottomSheet}
          onClose={handleCloseBottomSheet}
          onDraftCreated={handleOffCycleDraftCreated}
          setSelectedMetricCard={setSelectedMetricCard}
        />
      )}

      {showStrategyPanel && (
        <SelectStrategyApprovePanel
          open={showStrategyPanel}
          onClose={closeStrategyPanel}
          onApprove={handleStrategyApprove}
          kpiData={strategyKpiData}
          isLoading={isEmpty(strategyKpiData)}
        />
      )}

      {showApprovalModal && (
        <ApprovalFlowDialog
          setShowApprovalModal={setShowApprovalModal}
          screenName={ORDER_MANAGEMENT_FILTER_CONFIG}
          fiscalCalendarDetails={fiscalCalendarDetails}
          selectedRows={approvalFlowRows}
          targetTable="alerts_action_table"
          reloadComponent={handleApprovalFlowReload}
          onApprovalSuccess={handleApprovalSuccess}
          isExpeditePosRawROQAlert
          styleOrderSummaryPayload={approvalFlowPayload}
        />
      )}

      <Prompt
        isOpen={deleteOrderIndex !== null}
        variant="error"
        title="Delete, Are you sure?"
        primaryButtonLabel="Yes,Delete"
        secondaryButtonLabel="Cancel"
        handleClose={() => setDeleteOrderIndex(null)}
        onSecondaryButtonClick={() => setDeleteOrderIndex(null)}
        onPrimaryButtonClick={() => {
          if (deleteOrderIndex !== null) {
            applyDeleteGeneratedOrder(deleteOrderIndex);
          }
          setDeleteOrderIndex(null);
        }}
      >
        <Typography
          variant="body2"
          align="center"
          sx={{
            color: "#60697D",
            fontWeight: 500,
            fontSize: 12,
            lineHeight: "16px",
          }}
        >
          If you delete this simulation, it will be permanently removed. You'll
          need to generate a new one if required later.
        </Typography>
      </Prompt>

      <Prompt
        isOpen={leavePrompt != null}
        variant="warning"
        title="Action Required"
        primaryButtonLabel={leavePrompt?.showFinalize ? "Finalize" : undefined}
        secondaryButtonLabel="Leave screen"
        handleClose={() => setLeavePrompt(null)}
        onSecondaryButtonClick={() => {
          leaveToDashboard();
          setLeavePrompt(null);
        }}
        onPrimaryButtonClick={
          leavePrompt?.showFinalize
            ? () => {
                displaySnackMessages(
                  "Finalize is not yet available for expedite orders.",
                  "info",
                  dispatch
                );
                setLeavePrompt(null);
              }
            : undefined
        }
      >
        <Typography
          variant="body2"
          align="center"
          sx={{
            color: "#60697D",
            fontWeight: 500,
            fontSize: 12,
            lineHeight: "16px",
          }}
        >
          Your current changes are not saved. Save your current changes before
          leaving the screen.
        </Typography>
      </Prompt>

      <Prompt
        isOpen={bulkDiscardOpen}
        variant="error"
        title="Discard simulations?"
        primaryButtonLabel="Yes, discard"
        secondaryButtonLabel="Cancel"
        handleClose={() => setBulkDiscardOpen(false)}
        onSecondaryButtonClick={() => setBulkDiscardOpen(false)}
        onPrimaryButtonClick={() => {
          discardAllSimulationsFromStep2();
          setBulkDiscardOpen(false);
        }}
      >
        <Typography
          variant="body2"
          align="center"
          sx={{
            color: "#60697D",
            fontWeight: 500,
            fontSize: 12,
            lineHeight: "16px",
          }}
        >
          All generated simulations will be removed and you will return to
          previous screen.
        </Typography>
      </Prompt>
    </div>
  );
}

export default OffCycleOrderExpediteOrders;
