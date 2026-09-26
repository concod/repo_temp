import React, { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { Tooltip, useTranslation } from "impact-ui-v3";
import Loader from "core/Utils/Loader/loader";
import useStyles, { KPI_EDGE_BLUR } from "./kpiStyles";
import RecommendationKPICard from "./RecommendationKPICard";

import IconExpand from "assets/impactv3/icon-expand.svg";
import IconCollapse from "assets/impactv3/icon-collapse.svg";
import IconArrowLeft from "assets/impactv3/icon-arrow-left.svg";
import IconArrowRight from "assets/impactv3/icon-arrow-right.svg";

const SCROLL_EPS = 2;
const BASE_VIEWPORT = 1920;
const SCROLLBAR_TRACK_WIDTH = 200;
const MIN_THUMB_WIDTH = 40;

const getEdgeBlurWidth = () =>
  Math.max(
    0,
    Math.round((window.innerWidth / BASE_VIEWPORT) * KPI_EDGE_BLUR.baseWidth)
  );

const RecommendationKPISection = ({
  headerTitle,
  tableConfig,
  tableData,
  loader,
  showExpand,
}) => {
  const classes = useStyles();
  const { t } = useTranslation();
  const stripRef = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [isStripHovered, setIsStripHovered] = useState(false);
  const [scrollState, setScrollState] = useState({
    canLeft: false,
    canRight: false,
    isScrollable: false,
    thumbWidth: MIN_THUMB_WIDTH,
    thumbLeft: 0,
  });
  const [edgeBlurWidth, setEdgeBlurWidth] = useState(KPI_EDGE_BLUR.baseWidth);

  const visibleCards = useMemo(
    () => (tableConfig || []).filter((config) => !config.is_hidden),
    [tableConfig]
  );

  const updateScrollState = () => {
    const container = stripRef.current;
    if (!container) return;
    const { scrollLeft, scrollWidth, clientWidth } = container;
    const maxScrollLeft = scrollWidth - clientWidth;
    const ratio = scrollWidth > 0 ? clientWidth / scrollWidth : 1;
    const thumbWidth = Math.max(SCROLLBAR_TRACK_WIDTH * ratio, MIN_THUMB_WIDTH);
    const scrollRatio = maxScrollLeft > 0 ? scrollLeft / maxScrollLeft : 0;
    setScrollState({
      canLeft: scrollLeft > SCROLL_EPS,
      canRight: scrollLeft < maxScrollLeft - SCROLL_EPS,
      isScrollable: scrollWidth > clientWidth + SCROLL_EPS,
      thumbWidth,
      thumbLeft: scrollRatio * (SCROLLBAR_TRACK_WIDTH - thumbWidth),
    });
  };

  useEffect(() => {
    const updateBlurWidth = () => setEdgeBlurWidth(getEdgeBlurWidth());
    updateBlurWidth();
    window.addEventListener("resize", updateBlurWidth);
    return () => window.removeEventListener("resize", updateBlurWidth);
  }, []);

  useEffect(() => {
    if (expanded) return undefined;
    const el = stripRef.current;
    if (!el) return undefined;
    updateScrollState();
    const handleScroll = () => updateScrollState();
    el.addEventListener("scroll", handleScroll);
    let observer;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => updateScrollState());
      observer.observe(el);
    }
    return () => {
      el.removeEventListener("scroll", handleScroll);
      if (observer) observer.disconnect();
    };
  }, [expanded, visibleCards.length]);

  useEffect(() => {
    if (expanded) return undefined;
    const el = stripRef.current;
    if (!el) return undefined;
    const handleWheel = (event) => {
      const delta =
        Math.abs(event.deltaX) > Math.abs(event.deltaY)
          ? event.deltaX
          : event.deltaY;
      const canScrollRight =
        delta > 0 && el.scrollLeft + el.clientWidth < el.scrollWidth;
      const canScrollLeft = delta < 0 && el.scrollLeft > 0;
      if (
        el.scrollWidth > el.clientWidth &&
        (canScrollRight || canScrollLeft)
      ) {
        event.preventDefault();
        el.scrollLeft += delta;
      }
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [expanded, visibleCards.length]);

  const needsExpand = scrollState.isScrollable || visibleCards.length > 6;
  const shouldShowExpand =
    showExpand === undefined ? needsExpand : Boolean(showExpand);

  const hoverActive = isStripHovered && !expanded;
  const showArrows = hoverActive && scrollState.isScrollable;
  const showLeftArrow = showArrows && scrollState.canLeft;
  const showRightArrow = showArrows && scrollState.canRight;

  const scrollByPage = (direction) => {
    const el = stripRef.current;
    if (!el) return;
    const firstCard = el.querySelector("[data-kpi-card]");
    const step = firstCard
      ? firstCard.offsetWidth + 16
      : Math.max(el.clientWidth * 0.6, 240);
    el.scrollBy({ left: direction * step, behavior: "smooth" });
  };

  const handleToggleExpand = () => {
    setIsStripHovered(false);
    setExpanded((prev) => !prev);
  };

  const handleStripEnter = () => {
    if (!expanded) setIsStripHovered(true);
  };

  const handleStripLeave = () => {
    setIsStripHovered(false);
  };

  const handleThumbPointerDown = (event) => {
    event.preventDefault();
    const el = stripRef.current;
    if (!el) return;
    const startX = event.clientX;
    const startLeft = el.scrollLeft;
    const maxScroll = el.scrollWidth - el.clientWidth;
    const travel = SCROLLBAR_TRACK_WIDTH - scrollState.thumbWidth;
    const onMove = (moveEvent) => {
      if (travel <= 0 || maxScroll <= 0) return;
      el.scrollLeft =
        startLeft + ((moveEvent.clientX - startX) / travel) * maxScroll;
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const renderCards = () =>
    visibleCards.map((config, index) => (
      <RecommendationKPICard
        key={config.column_name || index}
        config={config}
        rowData={tableData}
      />
    ));

  const renderEdgeBlur = (sideClass, visible) => (
    <div
      className={`${classes.edgeBlur} ${sideClass} ${
        visible ? classes.edgeBlurVisible : ""
      }`}
      aria-hidden
    >
      <span className={classes.edgeBlurTint} />
      <span className={`${classes.edgeBlurStop} ${classes.edgeBlurStopSoft}`} />
      <span className={`${classes.edgeBlurStop} ${classes.edgeBlurStopMid}`} />
      <span className={`${classes.edgeBlurStop} ${classes.edgeBlurStopHard}`} />
    </div>
  );

  const showEdgeFade = hoverActive && scrollState.isScrollable;
  const fadeLeft = showEdgeFade && scrollState.canLeft;
  const fadeRight = showEdgeFade && scrollState.canRight;

  const expandLabel = expanded
    ? t("inventorysmart.kpiCollapse")
    : t("inventorysmart.kpiExpand");

  return (
    <Loader loader={Boolean(loader)} minHeight={196}>
      <div
        className={`${classes.section} ${
          expanded ? classes.sectionExpanded : classes.sectionCollapsed
        }`}
        style={{ "--kpi-edge-blur": `${edgeBlurWidth}px` }}
        onMouseEnter={handleStripEnter}
        onMouseLeave={handleStripLeave}
      >
        <div className={classes.header}>
          <div className={classes.headerLeft}>
            <span className={classes.title}>{headerTitle}</span>
          </div>
          {shouldShowExpand && (
            <Tooltip title={expandLabel} orientation="top" variant="tertiary">
              <button
                type="button"
                onClick={handleToggleExpand}
                aria-label={expandLabel}
                className={classes.expandButton}
              >
                {expanded ? (
                  <IconCollapse className={classes.chromeIcon} />
                ) : (
                  <IconExpand className={classes.chromeIcon} />
                )}
              </button>
            </Tooltip>
          )}
        </div>
        {expanded ? (
          <div className={classes.stripExpanded}>{renderCards()}</div>
        ) : (
          <>
            <div className={classes.stripWrap}>
              <div
                ref={stripRef}
                className={`${classes.strip} ${
                  hoverActive ? classes.stripHovered : classes.stripCollapsed
                }`}
              >
                {renderCards()}
              </div>
            </div>
            {renderEdgeBlur(classes.edgeBlurLeft, fadeLeft)}
            {renderEdgeBlur(classes.edgeBlurRight, fadeRight)}
            {scrollState.isScrollable && (
              <div className={classes.customScrollTrack}>
                <div
                  className={classes.customScrollThumb}
                  style={{
                    width: scrollState.thumbWidth,
                    transform: `translateX(${scrollState.thumbLeft}px)`,
                  }}
                  onPointerDown={handleThumbPointerDown}
                />
              </div>
            )}
          </>
        )}
        <button
          type="button"
          onClick={() => scrollByPage(-1)}
          aria-label={t("inventorysmart.finalize.recommendation.scrollLeft")}
          aria-hidden={!showLeftArrow}
          tabIndex={showLeftArrow ? 0 : -1}
          className={`${classes.scrollArrow} ${classes.scrollArrowLeft} ${
            showLeftArrow
              ? classes.scrollArrowVisible
              : classes.scrollArrowHidden
          }`}
        >
          <IconArrowLeft className={classes.chromeIcon} />
        </button>
        <button
          type="button"
          onClick={() => scrollByPage(1)}
          aria-label={t("inventorysmart.finalize.recommendation.scrollRight")}
          aria-hidden={!showRightArrow}
          tabIndex={showRightArrow ? 0 : -1}
          className={`${classes.scrollArrow} ${classes.scrollArrowRight} ${
            showRightArrow
              ? classes.scrollArrowVisible
              : classes.scrollArrowHidden
          }`}
        >
          <IconArrowRight className={classes.chromeIcon} />
        </button>
      </div>
    </Loader>
  );
};

RecommendationKPISection.propTypes = {
  headerTitle: PropTypes.string,
  tableConfig: PropTypes.array,
  tableData: PropTypes.object,
  loader: PropTypes.bool,
  showExpand: PropTypes.bool,
};

RecommendationKPISection.defaultProps = {
  headerTitle: "",
  tableConfig: [],
  tableData: {},
  loader: false,
  showExpand: undefined,
};

export default RecommendationKPISection;
