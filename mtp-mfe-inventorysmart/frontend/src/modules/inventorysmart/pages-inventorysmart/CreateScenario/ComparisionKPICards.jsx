import { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { Typography, Box, Tooltip, Popover, IconButton } from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingFlatIcon from "@mui/icons-material/TrendingFlat";
import CloseIcon from "@mui/icons-material/Close";
import makeStyles from "@mui/styles/makeStyles";
import { getScenarioKpiTiles } from "../../services-inventorysmart/Create-Scenario/store-view-services";
import { buildScenarioSimBody } from "./scenarioCompareUtils";
import { getColumnsAg } from "../../../../core/actions/tableColumnActions";
import Loader from "core/Utils/Loader/loader";
import ISExpand from "assets/IS_icons/IS_expand.svg";
import ISCollapse from "assets/IS_icons/IS_collapse.svg";
import YellowTshirtIcon from "assets/yellow_tshirt.svg";
import StoreNewIcon from "assets/Store_new.svg";
import Oh2Png from "assets/OH2.png";
import StoreBlueIcon from "assets/Store_blue.svg";
import PercentageYellowIcon from "assets/percentage_yellow.svg";
import Piechart2Icon from "assets/piechart_2.svg";
import OrderIcon from "assets/Order.svg";
import StocksIcon from "assets/Stocks.svg";
import Wh3Png from "assets/WH3.png";
import StorePng from "assets/Store.png";
import Wh4Png from "assets/WH4.png";
import ExclamationYellowIcon from "assets/exclamation_yellow.svg";
import MarginIcon from "assets/margin.svg";
import ProductIcon from "assets/product.svg";
import BoxOpenIcon from "assets/boxOpen.svg";
import TrendingUpIconSvg from "assets/trendingUpIcon.svg";
import TrendingDownIconSvg from "assets/trendingDownIcon.svg";
import TrendingEqualIconSvg from "assets/trendingEqualIcon.svg";
import Oh4Icon from "assets/OH4.svg";
import colours from "core/Styles/colours";
import { useTranslation } from "impact-ui-v3";

// PNG assets wrapped as icon components (SVGs are already React components via SVGR)
const Oh2Icon = (props) => <img src={Oh2Png} alt="" {...props} />;
const Wh3Icon = (props) => <img src={Wh3Png} alt="" {...props} />;
const StorePngIcon = (props) => <img src={StorePng} alt="" {...props} />;
const Wh4Icon = (props) => <img src={Wh4Png} alt="" {...props} />;

const KPI_ICON_MAP = {
  "Allocated Style-Colors": YellowTshirtIcon,
  "Allocated Stores": StoreNewIcon,
  "Target Inventory": Oh2Icon,
  "Store OH+OO+IT": StoreBlueIcon,
  "Pre-Allocation In-Stock %": PercentageYellowIcon,
  "Total Need": Piechart2Icon,
  "Total Allocated Quantity": OrderIcon,
  "Post-Allocation In-Stock %": StocksIcon,
  "Allocated Units per Store": Wh3Icon,
  "Average SKU-Store Inventory (Post-allocation)": StorePngIcon,
  "Average Store Inventory (Post-allocation)": Wh4Icon,
  Min: ExclamationYellowIcon,
  Max: MarginIcon,
  WOS: ProductIcon,
  "Target WOS Difference": BoxOpenIcon,
  "Average Store WOS (Post-allocation)": Wh3Icon,
};

const DC_KPI_METRICS = [
  {
    key: "allocated_qty",
    labelKey:
      "inventorysmart.scenarioRecommendation.dcKpi.totalAllocatedQuantity",
    Icon: OrderIcon,
  },
  {
    key: "net_dc_available",
    labelKey: "inventorysmart.scenarioRecommendation.dcKpi.remainingDcAta",
    Icon: Oh4Icon,
  },
];

const DC_METRIC_SIZE_PREFIX = {
  allocated_qty: "allocated_quantity",
  net_dc_available: "net_dc_available",
};

const getDcSizeBreakdowns = (dcData, metricKey, dcName, groupLabel) => {
  if (!dcData || !metricKey || !dcName || !groupLabel) return [];

  const prefix = DC_METRIC_SIZE_PREFIX[metricKey] || metricKey;
  const valueKey = String(groupLabel).toLowerCase();
  const keyPrefix = `${prefix}__${dcName}__`;

  return Object.entries(dcData)
    .filter(([key]) => key !== "dc" && key.startsWith(keyPrefix))
    .map(([key, value]) => ({
      size: key.slice(keyPrefix.length),
      count: value?.[valueKey] ?? "—",
    }))
    .filter(({ size }) => Boolean(size));
};

const useStyles = makeStyles((theme) => ({
  pannelContainer: {
    padding: "16px 12px 12px",
    background: "#fff",
    borderRadius: "8px",
    overflow: "hidden",
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
  },
  panelHeaderContainer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
  },
  summaryHeader: {
    color: "#0D152C",
    fontFamily: "Manrope",
    fontSize: "14px",
    fontStyle: "normal",
    fontWeight: 700,
    lineHeight: "21px",
  },
  panelHeaderTextStyles: {
    fontSize: "14px",
    fontFamily: "Manrope",
    fontWeight: "bold",
  },
  expandButton: {
    border: "1px solid #C3C8D4",
    borderRadius: "8px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "32px",
    height: "32px",
    marginLeft: "auto",
    "&:hover": {
      border: "1px solid #3649c6",
    },
  },
  header: {
    fontSize: "1.25rem",
    fontWeight: 600,
    color: "#1D1D1D",
    marginBottom: "1.5rem",
  },
  kpiCardHeader: {
    display: "flex",
    justifyContent: "flex-start",
  },
  kpiContainer: {
    display: "flex",
    gap: "24px",
    overflowX: "auto",
    cursor: "grab",
    userSelect: "none",
    "&::-webkit-scrollbar": {
      display: "none",
    },
  },
  kpiContainerExpanded: {
    display: "flex",
    flexWrap: "wrap",
    gap: "24px",
    width: "100%",
    alignItems: "stretch",
  },
  // Grid keeps every row’s cards the same width (avoids last-row stretch)
  kpiContainerExpandedNewFlow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))",
    gap: "24px",
    width: "100%",
  },
  kpiCard: {
    minWidth: "251px",
    maxWidth: "251px",
    minHeight: "117px",
    padding: "16px",
    backgroundColor: "#FFFFFF",
    borderRadius: "12px",
    boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
    border: "1px solid #E5E7EB",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: "0px 4px 16px rgba(0, 0, 0, 0.15)",
    },
  },
  kpiTitle: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#1F2B4D",
    marginBottom: "12px",
    display: "-webkit-box",
    "-webkit-line-clamp": 2,
    "-webkit-box-orient": "vertical",
    overflow: "hidden",
    textOverflow: "ellipsis",
    minHeight: "40px",
    lineHeight: "20px",
  },
  valuesContainer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "auto",
  },
  valueSection: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    flex: 1,
  },
  valueLabel: {
    fontSize: "12px",
    fontWeight: 500,
    color: "#60697D",
    marginBottom: "4px",
  },
  valueNumber: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#0D152C",
    lineHeight: "24px",
  },
  divider: {
    width: "1px",
    height: "40px",
    backgroundColor: "#E5E7EB",
    margin: "0 16px",
  },
  iconContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "32px",
    height: "32px",
    borderRadius: "10px",
    marginRight: "8px",
    padding: "4px",
  },
  upTrend: {
    backgroundColor: "#E6F4EA", // Light green
    color: "#219653", // Dark green
  },
  downTrend: {
    backgroundColor: "#FDEEEE", // Light red
    color: "#EB5757", // Dark red
  },
  flatTrend: {
    backgroundColor: "#F3F4F6", // Grey background
    color: "#4F4F4F", // Grey icon
  },
  // New flow styles
  kpiCardNewFlow: {
    flex: "1 1 420px",
    minWidth: "420px",
    padding: "16px 24px",
    backgroundColor: "#FFFFFF",
    borderRadius: "12px",
    boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
    border: "1px solid #E5E7EB",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  kpiCardHeaderNewFlow: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  kpiHeaderIcon: {
    width: "40px",
    height: "40px",
    flexShrink: 0,
    display: "block",
    overflow: "visible",
  },
  kpiTitleNewFlow: {
    color: "#1F2B4D",
    fontFamily: "Manrope",
    fontSize: "16px",
    fontStyle: "normal",
    fontWeight: 600,
    lineHeight: "24px",
  },
  valuesContainerNewFlow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    width: "100%",
  },
  valuePill: {
    display: "flex",
    flex: 1,
    minWidth: 0,
    padding: "4px 8px",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10.814px",
    borderRadius: "8px",
    background: "#F5F6FA",
  },
  trendIconNewFlow: {
    width: "16px",
    height: "16px",
    flexShrink: 0,
  },
  dcKpiSection: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-start",
    gap: "16px",
    marginTop: "16px",
    width: "100%",
  },
  dcKpiCard: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    maxWidth: "100%",
    flex: "0 0 auto",
    padding: "16px 24px",
    backgroundColor: colours.white,
    borderRadius: "12px",
    boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
    border: `1px solid ${colours.separaterColor}`,
    boxSizing: "border-box",
  },
  dcKpiIcon: {
    width: "40px",
    height: "40px",
    flexShrink: 0,
    display: "block",
  },
  dcKpiTitle: {
    color: "#1F2B4D",
    fontFamily: "Manrope",
    fontSize: "16px",
    fontStyle: "normal",
    fontWeight: 600,
    lineHeight: "24px",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  dcKpiDivider: {
    width: 0,
    height: "20px",
    borderLeft: `1.826px solid ${colours.separaterColor}`,
    flexShrink: 0,
  },
  dcKpiGroupBox: {
    display: "flex",
    padding: "4px 6px",
    alignItems: "center",
    gap: "16px",
    borderRadius: "8px",
    background: colours.softLightGrey,
    flexShrink: 0,
  },
  dcKpiGroupLabel: {
    color: "#60697D",
    fontFamily: "Manrope",
    fontSize: "12px",
    fontWeight: 500,
    lineHeight: "16px",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  dcKpiDcList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  dcKpiDcBox: {
    display: "flex",
    width: "192px",
    padding: "4px 8px",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10.814px",
    borderRadius: "8px",
    background: colours.white,
    boxSizing: "border-box",
  },
  dcKpiDcName: {
    color: "#60697D",
    fontFamily: "Manrope",
    fontSize: "12px",
    fontWeight: 500,
    lineHeight: "16px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    minWidth: 0,
  },
  dcKpiDcValue: {
    color: "#0D152C",
    fontFamily: "Manrope",
    fontSize: "14px",
    fontWeight: 700,
    lineHeight: "20px",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  dcKpiDcValueRow: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    flexShrink: 0,
  },
  dcKpiDcExpandBtn: {
    border: "none",
    background: "transparent",
    padding: 0,
    margin: 0,
    cursor: "pointer",
    color: "#60697D",
    fontFamily: "Manrope",
    fontSize: "14px",
    fontWeight: 600,
    lineHeight: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  sizesPopoverPaper: {
    borderRadius: "8px",
    boxShadow: "0px 4px 16px rgba(0, 0, 0, 0.15)",
    border: `1px solid ${colours.separaterColor}`,
    width: "270px",
    maxWidth: "270px",
  },
  sizesPopoverHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    padding: "12px 12px 12px 16px",
  },
  sizesPopoverTitle: {
    color: "#0D152C",
    fontFamily: "Manrope",
    fontSize: "14px",
    fontStyle: "normal",
    fontWeight: 800,
    lineHeight: "21px",
    textTransform: "capitalize",
  },
  sizesPopoverCloseBtn: {
    padding: "4px",
    color: "#60697D",
  },
  sizesPopoverBody: {
    padding: "0 16px 16px",
  },
  sizesPopoverChips: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    maxWidth: "100%",
  },
  sizeChip: {
    display: "flex",
    width: "67px",
    padding: "4px 8px",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "4px",
    borderRadius: "8px",
    border: `0.216px solid ${colours.separaterColor}`,
    background: colours.softLightGrey,
    boxSizing: "border-box",
  },
  sizeChipLabel: {
    color: "#1F2B4D",
    fontFamily: "Manrope",
    fontSize: "14px",
    fontStyle: "normal",
    fontWeight: 500,
    lineHeight: "20px",
    textTransform: "capitalize",
  },
  sizeChipCount: {
    color: "#1F2B4D",
    textAlign: "right",
    fontFamily: "Manrope",
    fontSize: "16px",
    fontStyle: "normal",
    fontWeight: 800,
    lineHeight: "24px",
  },
}));

function ComparisionKPICards(props) {
  const classes = useStyles();
  const { t } = useTranslation();
  const [kpiData, setKpiData] = useState([]);
  const [dcData, setDcData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [sizesPopover, setSizesPopover] = useState({
    anchorEl: null,
    metricKey: null,
    dcName: null,
    groupLabel: null,
  });
  const containerRef = useRef(null);

  const isDown = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  useEffect(() => {
    async function scenarioRecommendationTiles() {
      try {
        props.setSaveDisabled(true);
        setLoading(true);
        const body = buildScenarioSimBody({
          scenarioId: props.scenarioId,
          compareCodes: props.compareCodes,
        });
        let { data } = await props.getScenarioKpiTiles(body);
        if (data && data?.data?.kpi_tiles) {
          setKpiData(data.data.kpi_tiles);
        }
        if (props.scenarioRecommendationNewFlow) {
          setDcData(data?.data?.dc_data || null);
        } else {
          setDcData(null);
        }
      } catch (error) {
        console.error("Error fetching KPI tiles:", error);
      } finally {
        props.setSaveDisabled(false);
        setLoading(false);
      }
    }
    scenarioRecommendationTiles();
  }, []);

  // Horizontal wheel scroll only while collapsed; when expanded, allow normal page scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container || expanded) return;

    const onWheel = (e) => {
      e.preventDefault();
      container.scrollLeft += e.deltaY;
    };

    container.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", onWheel);
    };
  }, [expanded]);

  // Drag Events
  const handleMouseDown = (e) => {
    e.preventDefault();
    isDown.current = true;
    containerRef.current.style.cursor = "grabbing";
    startX.current = e.pageX - containerRef.current.offsetLeft;
    scrollLeft.current = containerRef.current.scrollLeft;

    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("mousemove", handleMouseMove);
  };

  const handleMouseUp = () => {
    isDown.current = false;
    if (containerRef.current) {
      containerRef.current.style.cursor = "grab";
    }
    window.removeEventListener("mouseup", handleMouseUp);
    window.removeEventListener("mousemove", handleMouseMove);
  };

  const handleMouseMove = (e) => {
    if (!isDown.current) return;
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = (x - startX.current) * 1; // scroll speed
    containerRef.current.scrollLeft = scrollLeft.current - walk;
  };

  const getTrendIcon = (original, scenario) => {
    if (scenario > original) {
      return { icon: <TrendingUpIcon />, style: classes.upTrend };
    } else if (scenario < original) {
      return { icon: <TrendingDownIcon />, style: classes.downTrend };
    } else {
      return { icon: <TrendingFlatIcon />, style: classes.flatTrend };
    }
  };

  const getTrendIconNewFlow = (original, scenario) => {
    if (scenario > original) {
      return <TrendingUpIconSvg className={classes.trendIconNewFlow} />;
    }
    if (scenario < original) {
      return <TrendingDownIconSvg className={classes.trendIconNewFlow} />;
    }
    return <TrendingEqualIconSvg className={classes.trendIconNewFlow} />;
  };

  function getKpiCards(kpi, index) {
    const { icon, style } = getTrendIcon(kpi?.original, kpi?.scenario);
    console.log("kpi", icon, style)
    return (
      <div key={index} className={classes.kpiCard}>
        <div className={classes.kpiCardHeader}>
          <div className={`${classes.iconContainer} ${style}`}>{icon}</div>
          <Tooltip title={kpi?.key ?? "NA"}>
            <Typography className={classes.kpiTitle}>
              {kpi?.key ?? "NA"}
            </Typography>
          </Tooltip>
        </div>

        <div className={classes.valuesContainer}>
          <div className={classes.valueSection}>
            <Typography className={classes.valueLabel}>Original</Typography>
            <Typography className={classes.valueNumber}>
              {kpi?.original ?? "NA"}
            </Typography>
          </div>

          <div className={classes.divider} />

          <div className={classes.valueSection}>
            <Typography className={classes.valueLabel}>Scenario</Typography>
            <Typography className={classes.valueNumber}>
              {kpi?.scenario ?? "NA"}
            </Typography>
          </div>
        </div>
      </div>
    );
  }

  // New flow KPI card UI — update this when scenarioRecommendationNewFlow is enabled
  function getKpiCardsNewFlow(kpi, index) {
    const trendIcon = getTrendIconNewFlow(kpi?.original, kpi?.scenario);
    const KpiIcon = KPI_ICON_MAP[kpi?.key] || YellowTshirtIcon;

    return (
      <div key={index} className={classes.kpiCardNewFlow}>
        <div className={classes.kpiCardHeaderNewFlow}>
          <KpiIcon className={classes.kpiHeaderIcon} />
          <Typography className={classes.kpiTitleNewFlow}>
            {kpi?.key ?? "NA"}
          </Typography>
        </div>

        <div className={classes.valuesContainerNewFlow}>
          <div className={classes.valuePill}>
            <Typography className={classes.valueLabel} style={{ marginBottom: 0 }}>
              Original
            </Typography>
            <Typography className={classes.valueNumber}>
              {kpi?.original ?? "NA"}
            </Typography>
          </div>

          {trendIcon}

          <div className={classes.valuePill}>
            <Typography className={classes.valueLabel} style={{ marginBottom: 0 }}>
              Scenario
            </Typography>
            <Typography className={classes.valueNumber}>
              {kpi?.scenario ?? "NA"}
            </Typography>
          </div>
        </div>
      </div>
    );
  }

  const renderKpiCard = (kpi, index) =>
    props.scenarioRecommendationNewFlow
      ? getKpiCardsNewFlow(kpi, index)
      : getKpiCards(kpi, index);

  const renderPanelHeader = () => {
    const showSummary = props.scenarioRecommendationNewFlow;
    const showExpand = kpiData?.length > 5;

    if (!showSummary && !showExpand) return null;

    return (
      <div className={classes.panelHeaderContainer}>
        {showSummary ? (
          <Typography className={classes.summaryHeader}>Summary</Typography>
        ) : (
          <span />
        )}
        {showExpand && (
          <div
            onClick={() => setExpanded(!expanded)}
            className={classes.expandButton}
          >
            {expanded ? <ISCollapse /> : <ISExpand />}
          </div>
        )}
      </div>
    );
  };

  const handleOpenSizesPopover = (
    event,
    { metricKey, dcName, groupLabel }
  ) => {
    event.stopPropagation();
    setSizesPopover({
      anchorEl: event.currentTarget,
      metricKey,
      dcName,
      groupLabel,
    });
  };

  const handleCloseSizesPopover = () => {
    setSizesPopover({
      anchorEl: null,
      metricKey: null,
      dcName: null,
      groupLabel: null,
    });
  };

  const renderDcMetricGroup = (groupLabel, dcNames, valuesByDc, metricKey) => (
    <div className={classes.dcKpiGroupBox}>
      <Typography className={classes.dcKpiGroupLabel}>{groupLabel}</Typography>
      <div className={classes.dcKpiDcList}>
        {dcNames.map((dcName) => (
          <div key={`${groupLabel}-${dcName}`} className={classes.dcKpiDcBox}>
            <Typography className={classes.dcKpiDcName} title={dcName}>
              {dcName}
            </Typography>
            <div className={classes.dcKpiDcValueRow}>
              <Typography className={classes.dcKpiDcValue}>
                {valuesByDc?.[dcName]?.[metricKey] ?? "—"}
              </Typography>
              <button
                type="button"
                className={classes.dcKpiDcExpandBtn}
                aria-label={t(
                  "inventorysmart.scenarioRecommendation.dcKpi.sizes"
                )}
                onClick={(event) =>
                  handleOpenSizesPopover(event, {
                    metricKey,
                    dcName,
                    groupLabel,
                  })
                }
              >
                &gt;
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSizesPopover = () => {
    const sizeBreakdowns = getDcSizeBreakdowns(
      dcData,
      sizesPopover.metricKey,
      sizesPopover.dcName,
      sizesPopover.groupLabel
    );

    return (
      <Popover
        open={Boolean(sizesPopover.anchorEl)}
        anchorEl={sizesPopover.anchorEl}
        onClose={handleCloseSizesPopover}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        classes={{ paper: classes.sizesPopoverPaper }}
      >
        <div className={classes.sizesPopoverHeader}>
          <Typography className={classes.sizesPopoverTitle}>
            {t("inventorysmart.scenarioRecommendation.dcKpi.sizes")}
          </Typography>
          <IconButton
            className={classes.sizesPopoverCloseBtn}
            size="small"
            aria-label="close"
            onClick={handleCloseSizesPopover}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </div>
        <div className={classes.sizesPopoverBody}>
          <div className={classes.sizesPopoverChips}>
            {sizeBreakdowns.map(({ size, count }) => (
              <div key={size} className={classes.sizeChip}>
                <Typography className={classes.sizeChipLabel}>{size}</Typography>
                <Typography className={classes.sizeChipCount}>
                  {count}
                </Typography>
              </div>
            ))}
          </div>
        </div>
      </Popover>
    );
  };

  const sumDcMetricValues = (valuesByDc, metricKey, dcNames) =>
    dcNames.reduce((sum, dcName) => {
      const num = Number(valuesByDc?.[dcName]?.[metricKey]);
      return sum + (Number.isFinite(num) ? num : 0);
    }, 0);

  const renderDcKpiCards = () => {
    const dcBlock = dcData?.dc;
    if (!dcBlock) return null;

    const originalByDc = dcBlock.original || {};
    const scenarioByDc = dcBlock.scenario || {};
    const dcNames = Array.from(
      new Set([
        ...Object.keys(originalByDc),
        ...Object.keys(scenarioByDc),
      ])
    );

    if (!dcNames.length) return null;

    return (
      <div className={classes.dcKpiSection}>
        {DC_KPI_METRICS.map(({ key, labelKey, Icon }) => {
          const originalSum = sumDcMetricValues(originalByDc, key, dcNames);
          const scenarioSum = sumDcMetricValues(scenarioByDc, key, dcNames);
          return (
            <div key={key} className={classes.dcKpiCard}>
              <Icon className={classes.dcKpiIcon} />
              <Typography className={classes.dcKpiTitle}>
                {t(labelKey)}
              </Typography>
              <div className={classes.dcKpiDivider} />
              {renderDcMetricGroup("Original", dcNames, originalByDc, key)}
              {getTrendIconNewFlow(originalSum, scenarioSum)}
              {renderDcMetricGroup("Scenario", dcNames, scenarioByDc, key)}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Loader loader={loading} minHeight={130}>
      <div className={classes.pannelContainer}>
        {renderPanelHeader()}
        <div
          ref={containerRef}
          className={
            expanded
              ? props.scenarioRecommendationNewFlow
                ? classes.kpiContainerExpandedNewFlow
                : classes.kpiContainerExpanded
              : classes.kpiContainer
          }
          onMouseDown={!expanded ? handleMouseDown : undefined}
          style={expanded ? { cursor: "default" } : {}}
        >
          {kpiData.length > 0
            ? kpiData.map((kpi, index) => {
                return renderKpiCard(kpi, index);
              })
            : renderKpiCard(null, 0)}
        </div>
        {expanded &&
          props.scenarioRecommendationNewFlow &&
          renderDcKpiCards()}
        {props.scenarioRecommendationNewFlow && renderSizesPopover()}
      </div>
    </Loader>
  );
}

const mapStateToProps = (state) => ({});

const mapDispatchToProps = (dispatch) => ({
  getColumnsAg: (params) => dispatch(getColumnsAg(params)),
  getScenarioKpiTiles: (payload) => dispatch(getScenarioKpiTiles(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ComparisionKPICards);
