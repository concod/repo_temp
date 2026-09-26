import React, { useEffect, useState } from "react";
import { Panel, Loader } from "impact-ui-v3";
import Radio from "@mui/material/Radio";
import Typography from "@mui/material/Typography";
import makeStyles from "@mui/styles/makeStyles";
import ThumbUpAltOutlinedIcon from "@mui/icons-material/ThumbUpAltOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";

const STRATEGY_CARDS = [
  {
    value: "default_lead_time",
    kpiKey: "default_lead_time",
    title: "Default Lead Time",
    recommended: true,
    disabled: false,
    accentColor: "#3BB273",
    trackColor: "#F5C6C6",
  },
  {
    value: "fast_shipment",
    kpiKey: "faster_shipment",
    title: "Fast Shipment",
    recommended: false,
    disabled: true,
    accentColor: "#3BB273",
    trackColor: "#F5C6C6",
  },
  {
    value: "custom_scenario",
    kpiKey: "custom_scenario",
    title: "Custom Scenario",
    recommended: false,
    disabled: true,
    accentColor: "#3BB273",
    trackColor: "#F5C6C6",
  },
];

const DEFAULT_STRATEGY = STRATEGY_CARDS[0].value;

// impact-ui-v3 brand primary (same indigo as the Approve button). The MUI
// `theme.palette.primary.main` resolves to a navy tone here, so pin the brand
// color explicitly for the selected border, "Recommended" label, and radio.
const BRAND_PRIMARY = "#4259ee";

const useStyles = makeStyles((theme) => ({
  subHeading: {
    ...theme.typography.body2,
    color: theme.palette.text.secondary,
    marginBottom: 16,
  },
  cardsWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  card: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    padding: 16,
    border: "1px solid #E0E0E0",
    borderRadius: 8,
    cursor: "pointer",
    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
  },
  cardSelected: {
    borderColor: BRAND_PRIMARY,
    boxShadow: `0 0 0 1px ${BRAND_PRIMARY}`,
    background: "#F5F6FF",
  },
  cardDisabled: {
    cursor: "default",
  },
  headerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  // Partial grey separator: starts under the title (indented past the radio) and
  // stops within the card padding — it does not run edge-to-edge (matches Figma).
  headerDivider: {
    height: 1,
    background: "#E0E0E0",
    marginLeft: 28,
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  radio: {
    padding: 0,
    "&.MuiRadio-root.Mui-checked": {
      color: BRAND_PRIMARY,
    },
  },
  title: {
    ...theme.typography.subtitle1,
    fontWeight: 600,
    color: "#0D152C",
  },
  recommended: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    color: BRAND_PRIMARY,
  },
  recommendedIcon: {
    fontSize: 16,
  },
  recommendedText: {
    ...theme.typography.caption,
    fontWeight: 600,
    color: BRAND_PRIMARY,
  },
  contentRow: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    paddingLeft: 4,
  },
  netGainText: {
    display: "flex",
    flexDirection: "column",
  },
  netGainLabel: {
    ...theme.typography.caption,
    color: theme.palette.text.secondary,
  },
  netGainValue: {
    ...theme.typography.h4,
    fontWeight: 700,
    color: "#0D152C",
    whiteSpace: "nowrap",
  },
  divider: {
    width: 1,
    alignSelf: "stretch",
    minHeight: 40,
    background: "#E0E0E0",
    margin: "0 4px",
  },
  metricsCol: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  metricRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    whiteSpace: "nowrap",
  },
  metricIcon: {
    fontSize: 16,
    color: theme.palette.text.secondary,
  },
  metricLabel: {
    ...theme.typography.caption,
    color: theme.palette.text.secondary,
  },
  metricValue: {
    ...theme.typography.body2,
    fontWeight: 600,
    color: "#0D152C",
  },
}));

/** Abbreviate a number to a short currency string ($, $K, $M, $B). */
const formatCurrencyShort = (n) => {
  const num = Number(n);
  if (n === null || n === undefined || Number.isNaN(num)) return "--";
  const abs = Math.abs(num);
  const sign = num < 0 ? "-" : "";
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}$${Math.round(abs / 1e3)}K`;
  return `${sign}$${Math.round(abs)}`;
};

/** Net Gain headline value keeps a space after the currency symbol ($ 643K). */
const formatNetGain = (n) => formatCurrencyShort(n).replace("$", "$ ");

/** Prefix positive currency values with "+" (e.g. +$701K). */
const formatSignedCurrencyShort = (n) => {
  const num = Number(n);
  if (n === null || n === undefined || Number.isNaN(num)) return "--";
  return num > 0 ? `+${formatCurrencyShort(num)}` : formatCurrencyShort(num);
};

/** Percentage share for the donut: net gain as a share of lost-sales savings. */
const calculateProgress = (netGain, total) => {
  const gain = Number(netGain);
  const tot = Number(total);
  if (Number.isNaN(gain) || Number.isNaN(tot) || tot === 0) return 0;
  return Math.min(100, Math.max(0, Math.round((gain / tot) * 100)));
};

/** SVG donut with an accent arc + track and a centered percentage label. */
const StrategyDonut = ({ percent, accentColor, trackColor }) => {
  const size = 56;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const safePercent = Math.min(100, Math.max(0, percent));
  const offset = circumference * (1 - safePercent / 100);

  return (
    <div
      style={{ position: "relative", width: size, height: size, flexShrink: 0 }}
      role="img"
      aria-label={`${safePercent}% net gain`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={stroke}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={accentColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 700,
          color: "#0D152C",
        }}
      >
        {`${safePercent}%`}
      </div>
    </div>
  );
};

/** Skeleton card component for loading state */
const SkeletonCard = () => {
  const classes = useStyles();

  return (
    <div className={classes.card}>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "120px",
        }}
      >
        <Loader progress="100%" showSkeleton size="large" text="" />
      </div>
    </div>
  );
};

/**
 * SelectStrategyApprovePanel
 *
 * Side panel opened from the Expedite Order alert's "Select Strategy & Approve"
 * button. Displays strategy cards derived from the expedite deep-dive KPI
 * response and, on Approve, hands control back to the parent to run the
 * standard approval flow.
 *
 * KPI response shape (per card `kpiKey`):
 *   { revenue: { total, value }, units: { total, value } }
 * Card fields are derived from `revenue`:
 *   - Net Gain           = revenue.total - revenue.value
 *   - Lost Sales Savings = revenue.total
 *   - Transportation     = revenue.value
 */
const SelectStrategyApprovePanel = ({
  open,
  onClose,
  onApprove,
  kpiData,
  isLoading,
}) => {
  const classes = useStyles();
  const [selectedStrategy, setSelectedStrategy] = useState(DEFAULT_STRATEGY);

  // Reset to the default (recommended) strategy each time the panel opens.
  useEffect(() => {
    if (open) setSelectedStrategy(DEFAULT_STRATEGY);
  }, [open]);

  const renderCard = (card) => {
    const block = kpiData?.cards?.[card.kpiKey];
    if (!block) return null;

    const lostSalesSavings = Number(block?.total);
    const lostSalesValue = Number(block?.value);
    const transportation = Number(block?.transportation_cost);
    const netGain = Number(block?.net_gain);

    const isSelected = selectedStrategy === card.value;

    const handleSelect = () => {
      if (card.disabled) return;
      setSelectedStrategy(card.value);
    };

    return (
      <div
        key={card.value}
        className={`${classes.card} ${isSelected ? classes.cardSelected : ""} ${
          card.disabled ? classes.cardDisabled : ""
        }`}
        onClick={handleSelect}
      >
        <div className={classes.headerRow}>
          <div className={classes.headerLeft}>
            <Radio
              className={classes.radio}
              checked={isSelected}
              disabled={card.disabled}
              onChange={handleSelect}
              color="primary"
              size="small"
              inputProps={{ "aria-label": card.title }}
            />
            <Typography component="span" className={classes.title}>
              {card.title}
            </Typography>
          </div>
          {card.recommended && (
            <span className={classes.recommended}>
              <ThumbUpAltOutlinedIcon className={classes.recommendedIcon} />
              <Typography component="span" className={classes.recommendedText}>
                Recommended
              </Typography>
            </span>
          )}
        </div>

        <div className={classes.headerDivider} />

        <div className={classes.contentRow}>
          <StrategyDonut
            percent={calculateProgress(lostSalesValue, lostSalesSavings)}
            accentColor={card.accentColor}
            trackColor={card.trackColor}
          />

          <div className={classes.netGainText}>
            <Typography component="span" className={classes.netGainLabel}>
              Net Gain
            </Typography>
            <Typography component="span" className={classes.netGainValue}>
              {formatNetGain(netGain)}
            </Typography>
          </div>

          <div className={classes.divider} />

          <div className={classes.metricsCol}>
            <div className={classes.metricRow}>
              <CheckCircleOutlineIcon className={classes.metricIcon} />
              <Typography component="span" className={classes.metricLabel}>
                Lost Sales Saving:
              </Typography>
              <Typography component="span" className={classes.metricValue}>
                {formatSignedCurrencyShort(lostSalesValue)}
              </Typography>
            </div>
            <div className={classes.metricRow}>
              <LocalShippingOutlinedIcon className={classes.metricIcon} />
              <Typography component="span" className={classes.metricLabel}>
                Transportation:
              </Typography>
              <Typography component="span" className={classes.metricValue}>
                {formatSignedCurrencyShort(transportation)}
              </Typography>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Panel
      open={open}
      onClose={onClose}
      title="Approve Recommendation"
      width={560}
      primaryButtonLabel="Approve"
      onPrimaryButtonClick={() => onApprove(selectedStrategy)}
      secondaryButtonLabel="Cancel"
      onSecondaryButtonClick={onClose}
      primaryButtonProps={{ disabled: isLoading }}
    >
      <Typography className={classes.subHeading}>
        Select a strategy to continue
      </Typography>

      <div className={classes.cardsWrap}>
        {isLoading
          ? STRATEGY_CARDS.map((card) => <SkeletonCard key={card.value} />)
          : STRATEGY_CARDS.map(renderCard)}
      </div>
    </Panel>
  );
};

export default SelectStrategyApprovePanel;
