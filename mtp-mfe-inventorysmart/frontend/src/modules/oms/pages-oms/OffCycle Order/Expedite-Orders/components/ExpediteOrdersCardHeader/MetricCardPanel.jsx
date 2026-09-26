import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useSelector } from "react-redux";
import { makeStyles } from "@mui/styles";
import { Loader } from "impact-ui-v3";
import MetricCard from "./MetricCard";
import {
  LoadingActionCard,
  CompletedActionCard,
  MetricCardSkeleton,
} from "./StatusActionCards";
import ActionCard from "./ActionCard";
import { formatCurrency, calculateProgressSegments } from "./utils";
import PaperPlaneImage from "assets/oms/BluePaperPlane.png";
import YellowBoltImage from "assets/oms/YellowBolt.png";
import PurplePlusImage from "assets/oms/PurplePlus.png";
import GreenDoubleArrowRightImage from "assets/oms/GreenDoubleArrowRight.png";
import AIIcon from "assets/oms/AI_Icon.svg";
import BlueThumbupIcon from "assets/oms/BlueThumbup.svg";
import CheckTickcircleIcon from "assets/oms/CheckTickcircle.svg";
import TruckSvgIcon from "assets/oms/truck.svg";
import FlightTakeoff from "assets/oms/FlightTakeoff.svg";
import InfoIcon from "assets/Info.svg";

const useStyles = makeStyles((theme) => ({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    width: "100%",
  },
  cardsRow: {
    display: "flex",
    width: "100%",
    gap: 12,
    alignItems: "stretch",
    minWidth: 0,
    [theme.breakpoints.down("md")]: {
      flexWrap: "wrap",
    },
  },
  showingDataLabel: {
    fontSize: 16,
    fontWeight: 800,
    lineHeight: "20px",
  },
  cardSlot: {
    flex: "1 1 0",
    minWidth: 0,
    display: "flex",
    alignSelf: "stretch",
  },
  connectorCardSlot: {
    position: "relative",
  },
  betweenCardsPlus: {
    position: "absolute",
    left: -6,
    top: "50%",
    transform: "translate(-50%, -50%)",
    width: 28,
    height: 28,
    borderRadius: "50%",
    background: "#EEF2FB",
    border: `1px solid ${theme.palette.divider}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#60697D",
    zIndex: 1,
    boxSizing: "border-box",
    "& svg": {
      width: 12,
      height: 12,
      display: "block",
    },
    [theme.breakpoints.down("md")]: {
      display: "none",
    },
  },
  metricCard: {
    width: "100%",
  },
  metricCardTrigger: {
    width: "100%",
    display: "flex",
    alignSelf: "stretch",
    cursor: "pointer",
  },
  metricCardSelected: {
    borderRadius: 12,
    border: "1px solid var(--Colors-Primary-Border-Default, #4259EE)",
    background:
      "linear-gradient(110deg, var(--Colors-Primary-Surface-Subtle, #ECEEFD) 0%, #FFF 48.77%)",
    boxShadow: "0 0 18px 5px rgba(0, 0, 0, 0.06)",
  },
  paperPlaneIconWrapper: {
    width: 28,
    height: 28,
    boxSizing: "border-box",
    borderRadius: 8,
    background: "linear-gradient(153deg, #EBF8FF 16.67%, #C9EEFF 100%)",
  },
  boltIconWrapper: {
    width: 28,
    height: 28,
    boxSizing: "border-box",
    borderRadius: 8,
    background: "linear-gradient(153deg, #FFFFEB 16.67%, #FFE5C9 100%)",
  },
  scenarioIconBox: {
    background: "#F7E9FF",
    color: "#B84BFF",
  },
  expediteIconBox: {
    background: "#E8F8EE",
    color: "#3BB273",
  },
}));

const AssetImageIcon = ({ src, alt, size }) => (
  <img
    src={src}
    alt={alt}
    style={{
      width: size,
      height: size,
      display: "block",
      objectFit: "contain",
    }}
  />
);

const PaperPlaneIcon = () => (
  <AssetImageIcon src={PaperPlaneImage} alt="Paper plane" size={18} />
);

const BoltIcon = () => (
  <AssetImageIcon src={YellowBoltImage} alt="Bolt" size={18} />
);

const ScenarioPlusIcon = () => (
  <AssetImageIcon src={PurplePlusImage} alt="Plus" size={18} />
);

const CheckIcon = () => (
  <AssetImageIcon
    src={GreenDoubleArrowRightImage}
    alt="Double arrow"
    size={18}
  />
);

const SparklesIcon = () => <AIIcon />;

const ThumbsUpIcon = () => <BlueThumbupIcon />;

const CircleCheckIcon = () => <CheckTickcircleIcon />;

const TruckIcon = () => <TruckSvgIcon />;

const FlightIcon = () => <FlightTakeoff />;

const FooterInfoIcon = () => <InfoIcon />;

const PlusIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12 5V19"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M5 12H19"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const METRIC_CARDS_CONFIG = [
  {
    key: "default_lead_time",
    title: "Default Lead Time",
    icon: PaperPlaneIcon,
    iconWrapperClass: "paperPlaneIconWrapper",
    secondaryMetrics: [
      {
        icon: CircleCheckIcon,
        label: "Lost Sales Saving",
        valueKey: "value",
      },
      {
        icon: TruckIcon,
        label: "Transportation",
        valueKey: "transportation_cost",
      },
    ],
  },
  {
    key: "faster_shipment",
    title: "Faster Shipment",
    icon: BoltIcon,
    iconWrapperClass: "boltIconWrapper",
    secondaryMetrics: [
      {
        icon: CircleCheckIcon,
        label: "Lost Sales Saving",
        valueKey: "value",
      },
      {
        icon: TruckIcon,
        label: "Transportation",
        valueKey: "transportation_cost",
        suffix: FlightIcon,
      },
    ],
  },
  {
    key: "custom_scenario",
    title: "Custom Scenario",
    icon: BoltIcon,
    iconWrapperClass: "boltIconWrapper",
    secondaryMetrics: [
      {
        icon: CircleCheckIcon,
        label: "Lost Sales Saving",
        valueKey: "value",
      },
      {
        icon: TruckIcon,
        label: "Transportation",
        valueKey: "transportation_cost",
        suffix: FlightIcon,
      },
    ],
  },
];

/**
 * @param {Object} props
 * @param {Function} [props.onCreateScenario]
 * @param {Function} [props.onExpediteOrders]
 * @param {boolean} [props.showActionCards]
 * @param {boolean} [props.showOffCycleOptimization]
 * @param {boolean} [props.showOffCycleCompleted]
 * @param {string} [props.selectedMetricCard]
 * @param {Function} [props.onMetricCardChange]
 */
const MetricCardPanel = ({
  onCreateScenario,
  onExpediteOrders,
  showActionCards = true,
  showOffCycleOptimization,
  showOffCycleCompleted,
  selectedMetricCard = "default_lead_time",
  onMetricCardChange,
}) => {
  const classes = useStyles();
  const handleActionClick = () => {};

  const beforeKpi = useSelector(
    (state) => state?.omsReducer?.expediteOrdersService?.beforeKpi
  );
  const afterKpi = useSelector(
    (state) => state?.omsReducer?.expediteOrdersService?.afterKpi
  );
  const expediteFlowStep = useSelector(
    (state) => state?.omsReducer?.expediteOrdersService?.expediteFlowStep
  );
  const recoveryWindowKpi = useSelector(
    (state) => state?.omsReducer?.expediteOrdersService?.recoveryWindowKpi
  );
  const recoveryWindowChartRow = useSelector(
    (state) => state?.omsReducer?.expediteOrdersService?.recoveryWindowChartRow
  );
  const isBeforeKpiLoading = useSelector(
    (state) => state?.omsReducer?.expediteOrdersService?.isBeforeKpiLoading
  );
  const isAfterKpiLoading = useSelector(
    (state) => state?.omsReducer?.expediteOrdersService?.isAfterKpiLoading
  );
  const isRecoveryWindowKpiLoading = useSelector(
    (state) =>
      state?.omsReducer?.expediteOrdersService?.isRecoveryWindowKpiLoading
  );

  const isRecoveryWindowView = Boolean(recoveryWindowChartRow);

  const activeKpiBlock =
    expediteFlowStep === 2
      ? afterKpi
      : isRecoveryWindowView
      ? recoveryWindowKpi
      : beforeKpi;

  const isLoadingState =
    expediteFlowStep === 2
      ? isAfterKpiLoading
      : isRecoveryWindowView
      ? isRecoveryWindowKpiLoading
      : isBeforeKpiLoading;

  const kpiData = activeKpiBlock?.data || {};
  const cardsData = kpiData?.cards || {};

  // Show loading if actively loading OR if no data exists yet
  const isLoading = isLoadingState || !activeKpiBlock;

  const shouldShowScenarioActionCards =
    !isLoading && showActionCards && !cardsData["custom_scenario"];
  const shouldShowCreateScenarioCard =
    shouldShowScenarioActionCards &&
    !showOffCycleOptimization &&
    !showOffCycleCompleted;
  const shouldShowLoadingScenarioCard =
    shouldShowScenarioActionCards &&
    showOffCycleOptimization &&
    !showOffCycleCompleted;
  const shouldShowCompletedScenarioCard =
    shouldShowScenarioActionCards && showOffCycleCompleted;

  const handleMetricCardKeyDown = (event, metricCardKey) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onMetricCardChange?.(metricCardKey);
    }
  };

  const selectedCardConfig = METRIC_CARDS_CONFIG.find(
    (config) => config.key === selectedMetricCard
  );

  let selectedCardTitle = "Default Lead Time";
  if (selectedMetricCard === "loading_scenario") {
    selectedCardTitle = "Create Your Own Scenario";
  } else if (selectedMetricCard === "custom_scenario") {
    selectedCardTitle = "Custom Scenario";
  } else {
    selectedCardTitle = selectedCardConfig?.title || "Default Lead Time";
  }

  useEffect(() => {
    if (showOffCycleOptimization) {
      onMetricCardChange?.("loading_scenario");
    }
  }, [showOffCycleOptimization, onMetricCardChange]);

  return (
    <div className={classes.container}>
      <div className={classes.cardsRow}>
        {isLoading ? (
          <>
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </>
        ) : (
          METRIC_CARDS_CONFIG.map((cardConfig) => {
            const cardData = cardsData?.[cardConfig.key];
            const IconComponent = cardConfig.icon;

            return (
              cardData && (
                <div key={cardConfig.key} className={classes.cardSlot}>
                  <div
                    className={classes.metricCardTrigger}
                    onClick={() => onMetricCardChange?.(cardConfig.key)}
                    onKeyDown={(event) =>
                      handleMetricCardKeyDown(event, cardConfig.key)
                    }
                    role="button"
                    tabIndex={0}
                  >
                    <MetricCard
                      className={`${classes.metricCard} ${
                        selectedMetricCard === cardConfig.key
                          ? classes.metricCardSelected
                          : ""
                      }`}
                      iconWrapperClassName={
                        classes[cardConfig.iconWrapperClass] || ""
                      }
                      icon={<IconComponent />}
                      title={cardConfig.title}
                      badgeIcon={<SparklesIcon />}
                      actionIcon={
                        selectedMetricCard === cardConfig.key ? (
                          <ThumbsUpIcon />
                        ) : null
                      }
                      onActionClick={handleActionClick}
                      primaryMetric={{
                        label: "Net Gain",
                        value: formatCurrency(cardData?.net_gain || 0, false),
                      }}
                      secondaryMetrics={cardConfig.secondaryMetrics.map(
                        (metric) => {
                          const MetricIcon = metric.icon;
                          const SuffixIcon = metric.suffix;
                          return {
                            icon: <MetricIcon />,
                            label: metric.label,
                            value: formatCurrency(
                              cardData?.[metric.valueKey] || 0
                            ),
                            ...(SuffixIcon && { suffix: <SuffixIcon /> }),
                          };
                        }
                      )}
                      progressSegments={calculateProgressSegments(cardData)}
                    />
                  </div>
                </div>
              )
            );
          })
        )}
        {shouldShowCreateScenarioCard && (
          <div className={classes.cardSlot}>
            <ActionCard
              icon={<ScenarioPlusIcon />}
              iconClassName={classes.scenarioIconBox}
              title="Create Your Own Scenario"
              description="Not Satisfied With Options? Create A Scenario Of Your Own To Compare"
              footer={{ icon: <PlusIcon />, label: "Create A Scenario" }}
              onFooterClick={onCreateScenario}
              footerType="button"
            />
          </div>
        )}
        {shouldShowLoadingScenarioCard && (
          <div className={classes.cardSlot}>
            <LoadingActionCard
              title="Create Your Own Scenario"
              description="Not Satisfied With Options? Create A Scenario Of Your Own To Compare"
              isSelected={selectedMetricCard === "loading_scenario"}
              onClick={() => onMetricCardChange?.("loading_scenario")}
            />
          </div>
        )}
        {shouldShowCompletedScenarioCard && (
          <div className={classes.cardSlot}>
            <CompletedActionCard
              title="Custom Scenario"
              completionMessage="Optimization Complete"
              isSelected={selectedMetricCard === "completed_scenario"}
              onClick={() => onMetricCardChange?.("completed_scenario")}
            />
          </div>
        )}

        {!isLoading && showActionCards && (
          <div className={`${classes.cardSlot} ${classes.connectorCardSlot}`}>
            <div className={classes.betweenCardsPlus} aria-hidden>
              <PlusIcon />
            </div>

            <ActionCard
              icon={<CheckIcon />}
              iconClassName={classes.expediteIconBox}
              title="Expedite"
              description="You Can Expedite The Upcoming Orders Along With New Purchase Orders Or Independently"
              footer={{
                icon: <FooterInfoIcon />,
                label: "Metrics will be displayed once you pull any POs",
              }}
              onFooterClick={onExpediteOrders}
              isFooterMuted
            />
          </div>
        )}
      </div>
      <div className={classes.showingDataLabel}>
        Showing Data For: {selectedCardTitle}
      </div>
    </div>
  );
};

MetricCardPanel.propTypes = {
  onCreateScenario: PropTypes.func,
  onExpediteOrders: PropTypes.func,
  showActionCards: PropTypes.bool,
  showOffCycleOptimization: PropTypes.bool,
  showOffCycleCompleted: PropTypes.bool,
  selectedMetricCard: PropTypes.string,
  onMetricCardChange: PropTypes.func,
};

export default MetricCardPanel;
