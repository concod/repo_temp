import { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import { AccordionModern } from "impact-ui-v3";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import WarehouseOutlinedIcon from "@mui/icons-material/WarehouseOutlined";
import ExtensionOutlinedIcon from "@mui/icons-material/ExtensionOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import SwapHorizOutlinedIcon from "@mui/icons-material/SwapHorizOutlined";
import { buildConstraintAccordionItem } from "./ConstraintAccordionCard";
import AffectedStoresSection from "./AffectedStoresSection";
import MinConstraintsDirectorySection from "./MinConstraintsDirectorySection";
import DcSourcingDetailSection from "./DcSourcingDetailSection";
import PackConfigDetailSection from "./PackConfigDetailSection";
import {
  getDiagnosticInsights,
  getInsightDetail,
} from "modules/inventorysmart/services-inventorysmart/Decision-Dashboard/decision-dashboard-services";
import { addSnack } from "core/actions/snackbarActions";
import { showSnackMessage } from "core/Utils/utils";
import { downloadExcelLink } from "core/Utils/csv-download/index";
import {
  flattenPlanStyleColors,
  PLAN_STYLE_COLOR_CSV_HEADERS,
  flattenDcSourcingStyleColors,
  DC_SOURCING_CSV_HEADERS,
  flattenPackIssues,
  PACK_ISSUE_CSV_HEADERS,
  flattenStoreCapacityRows,
  CAPACITY_BREACH_CSV_HEADERS,
  STORE_INVENTORY_HEALTH_CSV_HEADERS,
} from "./exportUtils";
import "./AISummaryCard.css";
import "./InsightsSmartActionsSection.css";

const useCsvExport = ({
  getInsightDetail: fetchDetail,
  type,
  buildParams,
  flatten,
  buildHeaders,
  buildFilename,
  addSnack,
  filters,
}) => {
  const linkRef = useRef(null);
  const [csvMeta, setCsvMeta] = useState({ rows: [], headers: [], filename: type });
  const [exporting, setExporting] = useState(false);

  const triggerExport = () => {
    if (exporting) return;
    setExporting(true);
    const params = { ...(buildParams ? buildParams() : {}), download: true };
    fetchDetail(type, params, filters)
      .then((response) => {
        const rows = flatten(response?.data, params) || [];
        setCsvMeta({
          rows,
          headers: buildHeaders(params),
          filename: buildFilename(params),
        });
        
        setTimeout(() => linkRef.current?.link?.click(), 0);
      })
      .catch((err) => {
        console.error(`Failed to export ${type} data`, err);
        showSnackMessage(addSnack, "Failed to export data", "error");
      })
      .finally(() => setExporting(false));
  };

  const csvLinkNode =
    csvMeta.rows.length > 0
      ? downloadExcelLink(csvMeta.rows, csvMeta.filename, linkRef, csvMeta.headers)
      : null;

  return { exporting, triggerExport, csvLinkNode };
};

const STORE_CAPACITY_INSIGHT_KEY = "store_capacity";

const MIN_CONSTRAINTS_INSIGHT_KEY = "min_constraints";

const DC_SOURCING_INSIGHT_KEY = "dc_sourcing";

const PACK_ROUNDING_INSIGHT_KEY = "pack_rounding";

const MAX_CAP_INSIGHT_KEY = "max_cap";
const SIZE_CURVE_INSIGHT_KEY = "size_curve";

const INSIGHT_ICON_MAP = {
  min_constraints: FlagOutlinedIcon,
  dc_sourcing: WarehouseOutlinedIcon,
  store_capacity: WarehouseOutlinedIcon,
  max_cap: LockOutlinedIcon,
  size_curve: SwapHorizOutlinedIcon,
  pack_rounding: ExtensionOutlinedIcon,
};

// --- API -> insight-card mapping helpers -----------------------------------

const toTitleCase = (str) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : str;

const UNIT_NOUN_ACRONYMS = new Set(["DC"]);
const toTitleCaseWords = (str) => {
  if (!str) return str;
  return str
    .toLowerCase()
    .split(" ")
    .map((word) =>
      word
        .split("-")
        .map((part) => {
          const upper = part.toUpperCase();
          return UNIT_NOUN_ACRONYMS.has(upper)
            ? upper
            : part.charAt(0).toUpperCase() + part.slice(1);
        })
        .join("-")
    )
    .join(" ");
};

const formatNumber = (num) =>
  num === null || num === undefined ? null : num.toLocaleString();

const formatCurrency = (num) => {
  if (num === null || num === undefined || Number.isNaN(num)) return null;
  return `~$${num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};
const getInsightTheme = (card) => {
  const isCritical = (card.severityLabel || card.severity || "")
    .toString()
    .toUpperCase()
    .includes("CRITICAL");
  return isCritical
    ? { iconBg: "#FDEEF0", iconColor: "#E5484D", showPreview: false }
    : { iconBg: "#FDF3DC", iconColor: "#8A6D1D", showPreview: true };
};

const buildBadges = (card) => {
  const badges = [];
  if (card.pctOfPlans !== null && card.pctOfPlans !== undefined) {
    badges.push({
      key: "pct",
      label: `${Math.round(card.pctOfPlans)}% of plans`,
      variant: "neutral",
    });
  }
  if (card.severityLabel) {
    const isCritical = card.severityLabel.toUpperCase().includes("CRITICAL");
    badges.push({
      key: "severity",
      label: toTitleCase(card.severityLabel),
      variant: isCritical ? "critical" : "warning",
    });
  }
  return badges;
};

const buildMacroImpact = (card) => {
  const parts = [];
  if (card.popoverLabel) parts.push(card.popoverLabel);
  if (card.planCount !== null && card.planCount !== undefined) {
    parts.push(`${formatNumber(card.planCount)} Plans Affected`);
  }
  if (card.skuStoreCount !== null && card.skuStoreCount !== undefined) {
    parts.push(`${formatNumber(card.skuStoreCount)} Product-Store Combinations`);
  }
  if (card.unitImpact !== null && card.unitImpact !== undefined) {
    const noun = card.unitNoun ? toTitleCaseWords(card.unitNoun) : "Units";
    const directionLabel =
      card.unitDirection === "over"
        ? "Over-Allocated"
        : card.unitDirection === "under"
        ? "Under-Allocated"
        : "";
    parts.push(
      `${formatNumber(Math.round(card.unitImpact))} ${noun}${
        directionLabel ? ` ${directionLabel}` : ""
      }`
    );
  }
  return parts.length > 0 ? parts.join(" | ") : undefined;
};

const buildBullets = (card) => {
  const bullets = [];
  if (card.what) bullets.push({ key: "what", label: "What", text: card.what });
  if (card.why) bullets.push({ key: "why", label: "Why", text: card.why });
  if (card.nextStep)
    bullets.push({ key: "next_step", label: "Next step", text: card.nextStep });
  return bullets;
};

const buildLostSales = (card) => {
  const hasRevenue =
    card.revenueImpact !== null && card.revenueImpact !== undefined;
  const planCount = card.planCount ?? 0;
  const skuStoreCount = card.skuStoreCount ?? 0;

  return {
    title: "Lost Sales If Not Realised",
    description: `${formatNumber(planCount)} Plan${
      planCount === 1 ? "" : "s"
    } Affected · ${formatNumber(
      skuStoreCount
    )} SKU-Store Combinations At Risk If Left Unresolved.`,
    amount: hasRevenue
      ? formatCurrency(card.revenueImpact)
      : card.impactLabel || "Impact Pending",
    amountCaption: hasRevenue
      ? card.impactLabel || "Revenue At Risk"
      : "Estimated Impact",
  };
};

const buildFooterActions = (card) => {
  if (card.insightType === STORE_CAPACITY_INSIGHT_KEY) {
    return {
      viewLabel: "View Affected Stores",
      exportLabel: "Export All Stores",
      onView: () => {},
      onExport: () => {},
    };
  }
  return {
    viewLabel: "View Affected Style-Colors",
    exportLabel: "Export All Style Colors",
    onView: () => {},
    onExport: () => {},
  };
};

const buildPreview = (card) => {
  if (!card.what) return null;
  return {
    impactText: card.impactLabel || undefined,
  };
};

const mapDiagnosticCardToInsight = (card, index) => {
  if (!card) return null;

  const theme = getInsightTheme(card);
  const IconComponent = INSIGHT_ICON_MAP[card.insightType] || FlagOutlinedIcon;
  const preview = theme.showPreview ? buildPreview(card) : undefined;

  const bullets = buildBullets(card);

  return {
    key: card.insightType || card.popoverId || `insight_${index}`,
    icon: <IconComponent style={{ fontSize: 18, color: theme.iconColor }} />,
    iconBg: theme.iconBg,
    title: card.title || card.popoverLabel || "Insight",
    badges: buildBadges(card),
    preview,
    macroImpact: buildMacroImpact(card),
    bullets,
    lostSales: buildLostSales(card),
    footerActions: buildFooterActions(card),
    defaultExpanded: false,
  };
};

const buildInsightsFromApi = (data) => {
  if (!data || !Array.isArray(data.cards) || data.cards.length === 0) {
    return null;
  }
  return data.cards.map(mapDiagnosticCardToInsight).filter(Boolean);
};

const InsightsSmartActionsSection = ({
  insights,
  filters,
  getDiagnosticInsights,
  getInsightDetail,
  addSnack,
  onLoadingChange,
}) => {
  const [apiInsights, setApiInsights] = useState(null);
  const [loading, setLoading] = useState(!insights);


  useEffect(() => {
    onLoadingChange?.(loading);
  }, [loading, onLoadingChange]);

  useEffect(() => {

    if (insights) return undefined;

    let isMounted = true;
    setLoading(true);

    getDiagnosticInsights(filters)
      .then((response) => {
        if (!isMounted) return;
        setApiInsights(buildInsightsFromApi(response?.data));
      })
      .catch((err) => {
        console.error("Failed to fetch diagnostic insights", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [insights, filters, getDiagnosticInsights]);

  const resolvedInsights = insights || apiInsights;

  const [expanded, setExpanded] = useState([]);
  useEffect(() => {
    if (!resolvedInsights) return;
    setExpanded(
      resolvedInsights
        .filter((insight) => insight.defaultExpanded)
        .map((insight, index) => insight.key || `insight_${index}`)
    );
 
  }, [resolvedInsights]);

  const [storeCapacityDirectoryOpen, setStoreCapacityDirectoryOpen] = useState(false);
  const [storeCapacityActiveTab, setStoreCapacityActiveTab] = useState("capacityBreach");
  const [storeCapacityTabState, setStoreCapacityTabState] = useState({
    capacityBreach: { data: null, loading: false, error: false },
    storeInventoryHealth: { data: null, loading: false, error: false },
  });

  const fetchStoreCapacityTabIfNeeded = (tabKey) => {
    const current = storeCapacityTabState[tabKey];
    if (!current || current.data || current.loading) return;

    setStoreCapacityTabState((prev) => ({
      ...prev,
      [tabKey]: { ...prev[tabKey], loading: true, error: false },
    }));

    getInsightDetail(STORE_CAPACITY_INSIGHT_KEY, { tab: tabKey }, filters)
      .then((response) => {
        setStoreCapacityTabState((prev) => ({
          ...prev,
          [tabKey]: { data: response?.data || null, loading: false, error: false },
        }));
      })
      .catch((err) => {
        console.error(`Failed to fetch store capacity (${tabKey}) detail`, err);
        setStoreCapacityTabState((prev) => ({
          ...prev,
          [tabKey]: { ...prev[tabKey], loading: false, error: true },
        }));
      });
  };

  const handleToggleStoreCapacityDirectory = () => {
    setExpanded((prev) =>
      prev.includes(STORE_CAPACITY_INSIGHT_KEY) ? prev : [...prev, STORE_CAPACITY_INSIGHT_KEY]
    );

    setStoreCapacityDirectoryOpen((prevOpen) => {
      const nextOpen = !prevOpen;
      if (nextOpen) fetchStoreCapacityTabIfNeeded(storeCapacityActiveTab);
      return nextOpen;
    });
  };

  const handleSelectStoreCapacityTab = (tabKey) => {
    setStoreCapacityActiveTab(tabKey);
    fetchStoreCapacityTabIfNeeded(tabKey);
  };

  const [minConstraintsDirectoryOpen, setMinConstraintsDirectoryOpen] = useState(false);
  const [minConstraintsDetail, setMinConstraintsDetail] = useState(null);
  const [minConstraintsDetailLoading, setMinConstraintsDetailLoading] = useState(false);
  const [minConstraintsDetailError, setMinConstraintsDetailError] = useState(false);

  const handleToggleMinConstraintsDirectory = () => {
    setExpanded((prev) =>
      prev.includes(MIN_CONSTRAINTS_INSIGHT_KEY)
        ? prev
        : [...prev, MIN_CONSTRAINTS_INSIGHT_KEY]
    );

    setMinConstraintsDirectoryOpen((prevOpen) => {
      const nextOpen = !prevOpen;
      if (nextOpen && !minConstraintsDetail && !minConstraintsDetailLoading) {
        setMinConstraintsDetailLoading(true);
        setMinConstraintsDetailError(false);
        getInsightDetail(MIN_CONSTRAINTS_INSIGHT_KEY, undefined, filters)
          .then((response) => {
            setMinConstraintsDetail(response?.data || null);
          })
          .catch((err) => {
            console.error("Failed to fetch min-constraints detail", err);
            setMinConstraintsDetailError(true);
          })
          .finally(() => {
            setMinConstraintsDetailLoading(false);
          });
      }
      return nextOpen;
    });
  };

  
  const [maxCapDirectoryOpen, setMaxCapDirectoryOpen] = useState(false);
  const [maxCapDetail, setMaxCapDetail] = useState(null);
  const [maxCapDetailLoading, setMaxCapDetailLoading] = useState(false);
  const [maxCapDetailError, setMaxCapDetailError] = useState(false);

  const handleToggleMaxCapDirectory = () => {
    setExpanded((prev) =>
      prev.includes(MAX_CAP_INSIGHT_KEY) ? prev : [...prev, MAX_CAP_INSIGHT_KEY]
    );

    setMaxCapDirectoryOpen((prevOpen) => {
      const nextOpen = !prevOpen;
      if (nextOpen && !maxCapDetail && !maxCapDetailLoading) {
        setMaxCapDetailLoading(true);
        setMaxCapDetailError(false);
        getInsightDetail(MAX_CAP_INSIGHT_KEY, undefined, filters)
          .then((response) => {
            setMaxCapDetail(response?.data || null);
          })
          .catch((err) => {
            console.error("Failed to fetch max-cap detail", err);
            setMaxCapDetailError(true);
          })
          .finally(() => {
            setMaxCapDetailLoading(false);
          });
      }
      return nextOpen;
    });
  };

  
  const [sizeCurveDirectoryOpen, setSizeCurveDirectoryOpen] = useState(false);
  const [sizeCurveDetail, setSizeCurveDetail] = useState(null);
  const [sizeCurveDetailLoading, setSizeCurveDetailLoading] = useState(false);
  const [sizeCurveDetailError, setSizeCurveDetailError] = useState(false);

  const handleToggleSizeCurveDirectory = () => {
    setExpanded((prev) =>
      prev.includes(SIZE_CURVE_INSIGHT_KEY) ? prev : [...prev, SIZE_CURVE_INSIGHT_KEY]
    );

    setSizeCurveDirectoryOpen((prevOpen) => {
      const nextOpen = !prevOpen;
      if (nextOpen && !sizeCurveDetail && !sizeCurveDetailLoading) {
        setSizeCurveDetailLoading(true);
        setSizeCurveDetailError(false);
        getInsightDetail(SIZE_CURVE_INSIGHT_KEY, undefined, filters)
          .then((response) => {
            setSizeCurveDetail(response?.data || null);
          })
          .catch((err) => {
            console.error("Failed to fetch size-curve detail", err);
            setSizeCurveDetailError(true);
          })
          .finally(() => {
            setSizeCurveDetailLoading(false);
          });
      }
      return nextOpen;
    });
  };

 
  const [dcSourcingDirectoryOpen, setDcSourcingDirectoryOpen] = useState(false);
  const [dcSourcingDetail, setDcSourcingDetail] = useState(null);
  const [dcSourcingDetailLoading, setDcSourcingDetailLoading] = useState(false);
  const [dcSourcingDetailError, setDcSourcingDetailError] = useState(false);

  const handleToggleDcSourcingDirectory = () => {
    setExpanded((prev) =>
      prev.includes(DC_SOURCING_INSIGHT_KEY) ? prev : [...prev, DC_SOURCING_INSIGHT_KEY]
    );

    setDcSourcingDirectoryOpen((prevOpen) => {
      const nextOpen = !prevOpen;
      if (nextOpen && !dcSourcingDetail && !dcSourcingDetailLoading) {
        setDcSourcingDetailLoading(true);
        setDcSourcingDetailError(false);
        getInsightDetail(DC_SOURCING_INSIGHT_KEY, undefined, filters)
          .then((response) => {
            setDcSourcingDetail(response?.data || null);
          })
          .catch((err) => {
            console.error("Failed to fetch DC sourcing detail", err);
            setDcSourcingDetailError(true);
          })
          .finally(() => {
            setDcSourcingDetailLoading(false);
          });
      }
      return nextOpen;
    });
  };

  const [packConfigDirectoryOpen, setPackConfigDirectoryOpen] = useState(false);
  const [packConfigDetail, setPackConfigDetail] = useState(null);
  const [packConfigDetailLoading, setPackConfigDetailLoading] = useState(false);
  const [packConfigDetailError, setPackConfigDetailError] = useState(false);

  const handleTogglePackConfigDirectory = () => {
    setExpanded((prev) =>
      prev.includes(PACK_ROUNDING_INSIGHT_KEY) ? prev : [...prev, PACK_ROUNDING_INSIGHT_KEY]
    );

    setPackConfigDirectoryOpen((prevOpen) => {
      const nextOpen = !prevOpen;
      if (nextOpen && !packConfigDetail && !packConfigDetailLoading) {
        setPackConfigDetailLoading(true);
        setPackConfigDetailError(false);
        getInsightDetail(PACK_ROUNDING_INSIGHT_KEY, undefined, filters)
          .then((response) => {
            setPackConfigDetail(response?.data || null);
          })
          .catch((err) => {
            console.error("Failed to fetch pack config detail", err);
            setPackConfigDetailError(true);
          })
          .finally(() => {
            setPackConfigDetailLoading(false);
          });
      }
      return nextOpen;
    });
  };

  const minConstraintsExport = useCsvExport({
    getInsightDetail,
    type: MIN_CONSTRAINTS_INSIGHT_KEY,
    flatten: flattenPlanStyleColors,
    buildHeaders: () => PLAN_STYLE_COLOR_CSV_HEADERS,
    buildFilename: () => "min-constraints-affected-plans",
    addSnack,
    filters,
  });
  const maxCapExport = useCsvExport({
    getInsightDetail,
    type: MAX_CAP_INSIGHT_KEY,
    flatten: flattenPlanStyleColors,
    buildHeaders: () => PLAN_STYLE_COLOR_CSV_HEADERS,
    buildFilename: () => "max-cap-affected-plans",
    addSnack,
    filters,
  });
  const sizeCurveExport = useCsvExport({
    getInsightDetail,
    type: SIZE_CURVE_INSIGHT_KEY,
    flatten: flattenPlanStyleColors,
    buildHeaders: () => PLAN_STYLE_COLOR_CSV_HEADERS,
    buildFilename: () => "size-curve-affected-plans",
    addSnack,
    filters,
  });
  const dcSourcingExport = useCsvExport({
    getInsightDetail,
    type: DC_SOURCING_INSIGHT_KEY,
    flatten: flattenDcSourcingStyleColors,
    buildHeaders: () => DC_SOURCING_CSV_HEADERS,
    buildFilename: () => "dc-sourcing-affected-style-colors",
    addSnack,
    filters,
  });
  const packConfigExport = useCsvExport({
    getInsightDetail,
    type: PACK_ROUNDING_INSIGHT_KEY,
    flatten: flattenPackIssues,
    buildHeaders: () => PACK_ISSUE_CSV_HEADERS,
    buildFilename: () => "pack-config-affected-style-colors",
    addSnack,
    filters,
  });
  const storeCapacityExport = useCsvExport({
    getInsightDetail,
    type: STORE_CAPACITY_INSIGHT_KEY,
    buildParams: () => ({ tab: storeCapacityActiveTab }),
    flatten: (data, params) => flattenStoreCapacityRows(data, params.tab),
    buildHeaders: (params) =>
      params.tab === "storeInventoryHealth"
        ? STORE_INVENTORY_HEALTH_CSV_HEADERS
        : CAPACITY_BREACH_CSV_HEADERS,
    buildFilename: (params) => `affected-stores-${params.tab}`,
    addSnack,
    filters,
  });

  if (!resolvedInsights) {
    return (
      <div className="insights-section">
        <div className="ais-headerRow">
          <div className="ais-lineLeft"></div>
          <span className="insights-divider-text">
            Insights &amp; Smart Actions
          </span>
          <div className="ais-lineRight"></div>
        </div>
        <div className="insights-cardList insights-accordion-shell">
          <div className="constraint-comingSoon">
            {loading ? "Loading insights..." : "No insights available."}
          </div>
        </div>
      </div>
    );
  }

  const insightsWithHandlers = resolvedInsights.map((insight) => {
    if (!insight.footerActions) return insight;

    if (insight.key === STORE_CAPACITY_INSIGHT_KEY) {
      const capacityBreach = storeCapacityTabState.capacityBreach;
      const storeInventoryHealth = storeCapacityTabState.storeInventoryHealth;
      const capacityBreachTab = capacityBreach.data?.content?.tabs?.find(
        (tab) => tab.key === "capacityBreach"
      );
      const storeInventoryHealthTab = storeInventoryHealth.data?.content?.tabs?.find(
        (tab) => tab.key === "storeInventoryHealth"
      );

      return {
        ...insight,
        footerActions: {
          ...insight.footerActions,
          viewLabel: storeCapacityDirectoryOpen
            ? "Hide Affected Stores"
            : insight.footerActions.viewLabel,
          onView: handleToggleStoreCapacityDirectory,
          onExport: storeCapacityExport.triggerExport,
          exporting: storeCapacityExport.exporting,
        },
        directorySlot: storeCapacityDirectoryOpen ? (
          <>
            <AffectedStoresSection
              activeTab={storeCapacityActiveTab}
              onTabChange={handleSelectStoreCapacityTab}
              capacityBreachTab={capacityBreachTab}
              capacityBreachLoading={capacityBreach.loading}
              capacityBreachError={capacityBreach.error}
              storeInventoryHealthTab={storeInventoryHealthTab}
              storeInventoryHealthLoading={storeInventoryHealth.loading}
              storeInventoryHealthError={storeInventoryHealth.error}
              onExportAll={storeCapacityExport.triggerExport}
              exportLoading={storeCapacityExport.exporting}
            />
            {storeCapacityExport.csvLinkNode}
          </>
        ) : undefined,
      };
    }

    if (insight.key === DC_SOURCING_INSIGHT_KEY) {
      return {
        ...insight,
        footerActions: {
          ...insight.footerActions,
          viewLabel: dcSourcingDirectoryOpen
            ? "Hide Affected Style-Colors"
            : insight.footerActions.viewLabel,
          onView: handleToggleDcSourcingDirectory,
          onExport: dcSourcingExport.triggerExport,
          exporting: dcSourcingExport.exporting,
        },
        directorySlot: dcSourcingDirectoryOpen ? (
          <>
            <DcSourcingDetailSection
              detail={dcSourcingDetail}
              loading={dcSourcingDetailLoading}
              error={dcSourcingDetailError}
              onExportAll={dcSourcingExport.triggerExport}
              exportLoading={dcSourcingExport.exporting}
            />
            {dcSourcingExport.csvLinkNode}
          </>
        ) : undefined,
      };
    }

    if (insight.key === PACK_ROUNDING_INSIGHT_KEY) {
      return {
        ...insight,
        footerActions: {
          ...insight.footerActions,
          viewLabel: packConfigDirectoryOpen
            ? "Hide Affected Style-Colors"
            : insight.footerActions.viewLabel,
          onView: handleTogglePackConfigDirectory,
          onExport: packConfigExport.triggerExport,
          exporting: packConfigExport.exporting,
        },
        directorySlot: packConfigDirectoryOpen ? (
          <>
            <PackConfigDetailSection
              detail={packConfigDetail}
              loading={packConfigDetailLoading}
              error={packConfigDetailError}
              onExportAll={packConfigExport.triggerExport}
              exportLoading={packConfigExport.exporting}
            />
            {packConfigExport.csvLinkNode}
          </>
        ) : undefined,
      };
    }

    if (insight.key === MIN_CONSTRAINTS_INSIGHT_KEY) {
      const directoryData = minConstraintsDetail?.content?.directory;
      const plansMeta = directoryData?.plans;

      return {
        ...insight,
        footerActions: {
          ...insight.footerActions,
          viewLabel: minConstraintsDirectoryOpen
            ? "Hide Affected Style-Colors"
            : insight.footerActions.viewLabel,
          onView: handleToggleMinConstraintsDirectory,
          onExport: minConstraintsExport.triggerExport,
          exporting: minConstraintsExport.exporting,
        },
        directorySlot: minConstraintsDirectoryOpen ? (
          <>
            <MinConstraintsDirectorySection
              label={directoryData?.label}
              metaText={
                plansMeta
                  ? `Showing top ${plansMeta.shownCount} of ${plansMeta.totalCount} Plans by impact`
                  : undefined
              }
              plans={plansMeta?.items}
              loading={minConstraintsDetailLoading}
              error={minConstraintsDetailError}
              onExportAll={minConstraintsExport.triggerExport}
              exportLoading={minConstraintsExport.exporting}
            />
            {minConstraintsExport.csvLinkNode}
          </>
        ) : undefined,
      };
    }

    if (insight.key === MAX_CAP_INSIGHT_KEY) {
      const directoryData = maxCapDetail?.content?.directory;
      const plansMeta = directoryData?.plans;

      return {
        ...insight,
        footerActions: {
          ...insight.footerActions,
          viewLabel: maxCapDirectoryOpen
            ? "Hide Affected Style-Colors"
            : insight.footerActions.viewLabel,
          onView: handleToggleMaxCapDirectory,
          onExport: maxCapExport.triggerExport,
          exporting: maxCapExport.exporting,
        },
        directorySlot: maxCapDirectoryOpen ? (
          <>
            <MinConstraintsDirectorySection
              label={directoryData?.label}
              metaText={
                plansMeta
                  ? `Showing top ${plansMeta.shownCount} of ${plansMeta.totalCount} Plans by impact`
                  : undefined
              }
              plans={plansMeta?.items}
              loading={maxCapDetailLoading}
              error={maxCapDetailError}
              onExportAll={maxCapExport.triggerExport}
              exportLoading={maxCapExport.exporting}
            />
            {maxCapExport.csvLinkNode}
          </>
        ) : undefined,
      };
    }

    if (insight.key === SIZE_CURVE_INSIGHT_KEY) {
      const directoryData = sizeCurveDetail?.content?.directory;
      const plansMeta = directoryData?.plans;

      return {
        ...insight,
        footerActions: {
          ...insight.footerActions,
          viewLabel: sizeCurveDirectoryOpen
            ? "Hide Affected Style-Colors"
            : insight.footerActions.viewLabel,
          onView: handleToggleSizeCurveDirectory,
          onExport: sizeCurveExport.triggerExport,
          exporting: sizeCurveExport.exporting,
        },
        directorySlot: sizeCurveDirectoryOpen ? (
          <>
            <MinConstraintsDirectorySection
              label={directoryData?.label}
              metaText={
                plansMeta
                  ? `Showing top ${plansMeta.shownCount} of ${plansMeta.totalCount} Plans by impact`
                  : undefined
              }
              plans={plansMeta?.items}
              loading={sizeCurveDetailLoading}
              error={sizeCurveDetailError}
              onExportAll={sizeCurveExport.triggerExport}
              exportLoading={sizeCurveExport.exporting}
            />
            {sizeCurveExport.csvLinkNode}
          </>
        ) : undefined,
      };
    }

    return insight;
  });

  const accordionData = insightsWithHandlers.map((insight, index) =>
    buildConstraintAccordionItem(insight, index)
  );

  return (
    <div className="insights-section">
      <div className="ais-headerRow">
        <div className="ais-lineLeft"></div>
        <span className="insights-divider-text">
          Insights &amp; Smart Actions
        </span>
        <div className="ais-lineRight"></div>
      </div>

      <div className="insights-cardList insights-accordion-shell">
        <AccordionModern
          data={accordionData}
          isMultiExpanded={true}
          expanded={expanded}
          onChange={(activeAccordion) => {
            const isCurrentlyExpanded = expanded.includes(activeAccordion);
            const newExpanded = isCurrentlyExpanded
              ? expanded.filter((val) => val !== activeAccordion)
              : [...expanded, activeAccordion];

            setExpanded(newExpanded);
          }}
          setExpanded={(activeAccordion) => {
            if (Array.isArray(activeAccordion)) {
              setExpanded(activeAccordion);
            }
          }}
        />
      </div>
    </div>
  );
};

const mapDispatchToProps = (dispatch) => ({
  getDiagnosticInsights: (filters) => dispatch(getDiagnosticInsights(filters)),
  getInsightDetail: (type, params, filters) =>
    dispatch(getInsightDetail(type, params, filters)),
  addSnack: (snack) => dispatch(addSnack(snack)),
});

export default connect(null, mapDispatchToProps)(InsightsSmartActionsSection);
