import React, { useMemo } from "react";
import { useSelector } from "react-redux";
import { Loader } from "impact-ui-v3";
import LoadingOverlay from "core/Utils/Loader/loader";
import LostSalesKpiCard from "./LostSalesKpiCard.jsx";
import { useExpediteOrdersCardsStyles } from "./styles.js";
import { getKPIIconComponent } from "modules/oms/utils-oms/kpiIconUtils.js";
import ExpediteOrdersCtaCard from "./ExpediteOrdersCtaCard.jsx";
import GeneratedOrdersCarousel from "./GeneratedOrdersCarousel.jsx";
import { EXPEDITE_LOST_SALES_KPI_CARDS } from "../constants";
import MetricCardPanel from "./ExpediteOrdersCardHeader/MetricCardPanel.jsx";
import MetricCard from "./MetricCard.jsx";

const CENTER_LOADER_STYLES = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
};

/** Format a raw number into display string, optionally as currency. */
const formatValue = (n, isCurrency) => {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "--";
  // n will always be an integer, hence no need to format it.
  const formattedValue = Number(n);
  return isCurrency ? `$${formattedValue}` : String(formattedValue);
};

const formatTotalValue = (n, isCurrency) =>
  `/ ${formatValue(n, isCurrency)} total`;

/**
 * Share of reference total (0–100) for the bar fill.
 * KPI `value` is the metric amount (e.g. avoided); `total` is the denominator
 * shown as “/ X total”. Use value/total — not (total−value)/total, which would
 * treat a small achieved value as “almost 100% done” and overfill the bar.
 */
const calculateProgress = (value, total) => {
  const val = Number(value);
  const tot = Number(total);
  if (Number.isNaN(val) || Number.isNaN(tot) || tot === 0) return 0;
  return Math.min(100, Math.max(0, Math.round((val / tot) * 100)));
};

/**
 * Derives metric card values from a session KPI response block.
 * kpiBlock shape: { data: { lost_sales: { value, total }, revenue: { value, total } } }
 */
const mergeKpiIntoCards = (baseCards, kpiBlock) => {
  if (!kpiBlock || !Array.isArray(baseCards)) return baseCards || [];
  const data = kpiBlock?.data || kpiBlock || {};
  return baseCards.map((card) => {
    const cardData = data?.[card.key];
    if (!cardData) return card;
    return {
      ...card,
      value: formatValue(cardData.value, card.isCurrency),
      total: formatTotalValue(cardData.total, card.isCurrency),
      progress: calculateProgress(cardData.value, cardData.total),
    };
  });
};

/**
 * HeaderKPIPanel
 *
 * Shows before-state KPIs (step 1) or after-state KPIs (step 2) sourced from
 * the session-based Redux state, plus a "Create Off Cycle" CTA card.
 *
 * Props:
 *   onCreateOffCycle — called when the user clicks "Create Off Cycle" button.
 */
const HeaderKPIPanel = ({
  onCreateOffCycle,
  onExpediteOrders,
  orders,
  onEdit,
  onDelete,
  isSimulating,
  showCtaCard = true,
  ctaTitle,
  createOffCycleLabel,
  showOffCycleOptimization,
  selectedMetricCard,
  onMetricCardChange,
}) => {
  const classes = useExpediteOrdersCardsStyles();

  const metricCardConfig = useSelector(
    (state) =>
      state?.omsReducer?.expediteOrdersService?.expediteOrdersConfig
        ?.expedite_orders?.lost_sales_kpi
  );
  const isLoadingSession = useSelector(
    (state) => state?.omsReducer?.expediteOrdersService?.isLoadingSession
  );
  const expediteFlowStep = useSelector(
    (state) => state?.omsReducer?.expediteOrdersService?.expediteFlowStep
  );

  const beforeKpi = useSelector(
    (state) => state?.omsReducer?.expediteOrdersService?.beforeKpi
  );
  const afterKpi = useSelector(
    (state) => state?.omsReducer?.expediteOrdersService?.afterKpi
  );
  const isBeforeKpiLoading = useSelector(
    (state) => state?.omsReducer?.expediteOrdersService?.isBeforeKpiLoading
  );
  const isAfterKpiLoading = useSelector(
    (state) => state?.omsReducer?.expediteOrdersService?.isAfterKpiLoading
  );

  const recoveryWindowChartRow = useSelector(
    (state) => state?.omsReducer?.expediteOrdersService?.recoveryWindowChartRow
  );
  const recoveryWindowKpi = useSelector(
    (state) => state?.omsReducer?.expediteOrdersService?.recoveryWindowKpi
  );
  const isRecoveryWindowKpiLoading = useSelector(
    (state) =>
      state?.omsReducer?.expediteOrdersService?.isRecoveryWindowKpiLoading
  );
  const isRecoveryWindowView = Boolean(recoveryWindowChartRow);

  const showExpediteCtaView = useSelector(
    (state) => state?.omsReducer?.expediteOrdersService?.showExpediteCtaView
  );

  // Select the right KPI block depending on which step we're in. Step 1 uses
  // the row-scoped KPI when "View Graph" is active.
  const activeKpiBlock =
    expediteFlowStep === 2
      ? afterKpi
      : isRecoveryWindowView
      ? recoveryWindowKpi
      : beforeKpi;

  const metricCards = useMemo(() => {
    if (!metricCardConfig) return [];

    const cardInfo =
      expediteFlowStep === 1
        ? metricCardConfig.lost_sales_metric_cards_before
        : metricCardConfig.lost_sales_metric_cards_after;

    return mergeKpiIntoCards(cardInfo, activeKpiBlock);
  }, [metricCardConfig, activeKpiBlock, expediteFlowStep]);

  const step1KpiSource = isRecoveryWindowView ? recoveryWindowKpi : beforeKpi;
  const lostSalesKpiBlock = step1KpiSource?.data || step1KpiSource || {};

  const isLoadingKpiBlock =
    expediteFlowStep === 2
      ? isAfterKpiLoading
      : (isRecoveryWindowView && isRecoveryWindowKpiLoading) ||
        isBeforeKpiLoading;

  const isLoading =
    expediteFlowStep === 1
      ? isLoadingSession || isLoadingKpiBlock
      : isLoadingSession || !metricCardConfig || isLoadingKpiBlock;

  if (isLoading && showExpediteCtaView) {
    return (
      <div className={`${classes.cardsContainer} ${classes.responsiveWrap}`}>
        <LoadingOverlay
          loader
          size="medium"
          text="Loading KPIs"
          minHeight="120px"
          wrapperPosition="relative"
          centerLoaderStyles={CENTER_LOADER_STYLES}
        >
          <div style={{ width: "100%" }} />
        </LoadingOverlay>
      </div>
    );
  }

  if (expediteFlowStep === 1 && showExpediteCtaView) {
    return (
      <div className={classes.kpiPanelStepOne}>
        <div className={`${classes.cardsContainer} ${classes.responsiveWrap}`}>
          {EXPEDITE_LOST_SALES_KPI_CARDS.map((card) => (
            <LostSalesKpiCard
              key={card.key}
              title={card.title}
              iconType={card.iconType}
              accentColor={card.accentColor}
              trackColor={card.trackColor}
              metrics={card.metrics}
              data={lostSalesKpiBlock?.[card.key]}
            />
          ))}
          {showCtaCard && (
            <ExpediteOrdersCtaCard
              onCreateOffCycle={onCreateOffCycle}
              onExpediteOrders={onExpediteOrders}
              title={ctaTitle}
              createOffCycleLabel={createOffCycleLabel}
            />
          )}
        </div>
      </div>
    );
  }

  if (!showExpediteCtaView) {
    return (
      <div className={classes.kpiPanelStepOne}>
        <MetricCardPanel
          onCreateScenario={onCreateOffCycle}
          onExpediteOrders={onExpediteOrders}
          showOffCycleOptimization={showOffCycleOptimization}
          selectedMetricCard={selectedMetricCard}
          onMetricCardChange={onMetricCardChange}
        />
      </div>
    );
  }

  // ── Step 2: legacy layout (KPI metric cards left + separator + carousel right)
  return (
    <div className={`${classes.cardsContainer} ${classes.responsiveWrap}`}>
      <div className={classes.kpiSectionColumn}>
        <div className={classes.kpiSection}>
          {metricCards.map((card, index) => (
            <MetricCard
              key={card.title}
              {...card}
              icon={getKPIIconComponent(card.icon, index)}
            />
          ))}
        </div>
      </div>

      <div className={classes.cardsSeparator} />

      <div className={classes.rightSection}>
        {orders.length > 0 && !isSimulating ? (
          <GeneratedOrdersCarousel
            orders={orders}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ) : isSimulating ? (
          <LoadingOverlay
            loader
            size="medium"
            text="Generating recommendations…"
            minHeight="100px"
            wrapperPosition="relative"
          >
            <div style={{ width: "100%", minHeight: 80 }} />
          </LoadingOverlay>
        ) : null}
      </div>
    </div>
  );
};

export default HeaderKPIPanel;
