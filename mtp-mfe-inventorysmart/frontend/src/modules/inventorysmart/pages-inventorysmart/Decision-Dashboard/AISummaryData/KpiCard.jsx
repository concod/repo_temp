import { connect } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";
import { showSnackMessage } from "core/Utils/utils";
import "./KpiCard.css";

const CopyIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
  >
    <path
      d="M10 13.3333H3.33333V4.66668C3.33333 4.30001 3.03333 4.00001 2.66667 4.00001C2.3 4.00001 2 4.30001 2 4.66668V13.3333C2 14.0667 2.6 14.6667 3.33333 14.6667H10C10.3667 14.6667 10.6667 14.3667 10.6667 14C10.6667 13.6333 10.3667 13.3333 10 13.3333ZM13.3333 10.6667V2.66668C13.3333 1.93334 12.7333 1.33334 12 1.33334H6C5.26667 1.33334 4.66667 1.93334 4.66667 2.66668V10.6667C4.66667 11.4 5.26667 12 6 12H12C12.7333 12 13.3333 11.4 13.3333 10.6667ZM12 10.6667H6V2.66668H12V10.6667Z"
      fill="#60697D"
    />
  </svg>
);

const StyleColorsIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="none"
  >
    <path
      d="M10.7 7.125L7.125 10.7C7.025 10.8 6.9125 10.875 6.7875 10.925C6.6625 10.975 6.5375 11 6.4125 11C6.2875 11 6.1625 10.975 6.0375 10.925C5.9125 10.875 5.8 10.8 5.7 10.7L1.2875 6.2875C1.19583 6.19583 1.125 6.08958 1.075 5.96875C1.025 5.84792 1 5.72083 1 5.5875V2C1 1.725 1.09792 1.48958 1.29375 1.29375C1.48958 1.09792 1.725 1 2 1H5.5875C5.72083 1 5.85 1.02708 5.975 1.08125C6.1 1.13542 6.20833 1.20833 6.3 1.3L10.7 5.7125C10.8 5.8125 10.8729 5.925 10.9187 6.05C10.9646 6.175 10.9875 6.3 10.9875 6.425C10.9875 6.55 10.9646 6.67292 10.9187 6.79375C10.8729 6.91458 10.8 7.025 10.7 7.125ZM6.4125 10L9.9875 6.425L5.575 2H2V5.575L6.4125 10ZM3.25 4C3.45833 4 3.63542 3.92708 3.78125 3.78125C3.92708 3.63542 4 3.45833 4 3.25C4 3.04167 3.92708 2.86458 3.78125 2.71875C3.63542 2.57292 3.45833 2.5 3.25 2.5C3.04167 2.5 2.86458 2.57292 2.71875 2.71875C2.57292 2.86458 2.5 3.04167 2.5 3.25C2.5 3.45833 2.57292 3.63542 2.71875 3.78125C2.86458 3.92708 3.04167 4 3.25 4Z"
      fill="#60697D"
    />
  </svg>
);

const StoresIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="none"
  >
    <path
      d="M10.5125 5.525V9.5C10.5125 9.775 10.4146 10.0104 10.2187 10.2063C10.0229 10.4021 9.78748 10.5 9.51248 10.5H2.51248C2.23748 10.5 2.00207 10.4021 1.80623 10.2063C1.6104 10.0104 1.51248 9.775 1.51248 9.5V5.525C1.32082 5.35 1.1729 5.125 1.06873 4.85C0.964566 4.575 0.962483 4.275 1.06248 3.95L1.58748 2.25C1.65415 2.03333 1.7729 1.85417 1.94373 1.7125C2.11457 1.57083 2.31248 1.5 2.53748 1.5H9.48748C9.71248 1.5 9.90832 1.56875 10.075 1.70625C10.2416 1.84375 10.3625 2.025 10.4375 2.25L10.9625 3.95C11.0625 4.275 11.0604 4.57083 10.9562 4.8375C10.8521 5.10417 10.7042 5.33333 10.5125 5.525ZM7.11248 5C7.33748 5 7.50832 4.92292 7.62498 4.76875C7.74165 4.61458 7.78748 4.44167 7.76248 4.25L7.48748 2.5H6.51248V4.35C6.51248 4.525 6.57082 4.67708 6.68748 4.80625C6.80415 4.93542 6.94582 5 7.11248 5ZM4.86248 5C5.05415 5 5.2104 4.93542 5.33123 4.80625C5.45207 4.67708 5.51248 4.525 5.51248 4.35V2.5H4.53748L4.26248 4.25C4.22915 4.45 4.2729 4.625 4.39373 4.775C4.51457 4.925 4.67082 5 4.86248 5ZM2.63748 5C2.78748 5 2.91873 4.94583 3.03123 4.8375C3.14373 4.72917 3.21248 4.59167 3.23748 4.425L3.51248 2.5H2.53748L2.03748 4.175C1.98748 4.34167 2.01457 4.52083 2.11873 4.7125C2.2229 4.90417 2.39582 5 2.63748 5ZM9.38748 5C9.62915 5 9.80415 4.90417 9.91248 4.7125C10.0208 4.52083 10.0458 4.34167 9.98748 4.175L9.46248 2.5H8.51248L8.78748 4.425C8.81248 4.59167 8.88123 4.72917 8.99373 4.8375C9.10623 4.94583 9.23748 5 9.38748 5ZM2.51248 9.5H9.51248V5.975C9.47082 5.99167 9.44373 6 9.43123 6H9.38748C9.16248 6 8.96457 5.9625 8.79373 5.8875C8.6229 5.8125 8.45415 5.69167 8.28748 5.525C8.13748 5.675 7.96665 5.79167 7.77498 5.875C7.58332 5.95833 7.37915 6 7.16248 6C6.93748 6 6.72707 5.95833 6.53123 5.875C6.3354 5.79167 6.16248 5.675 6.01248 5.525C5.87082 5.675 5.70623 5.79167 5.51873 5.875C5.33123 5.95833 5.12915 6 4.91248 6C4.67082 6 4.45207 5.95833 4.25623 5.875C4.0604 5.79167 3.88748 5.675 3.73748 5.525C3.56248 5.7 3.38957 5.82292 3.21873 5.89375C3.0479 5.96458 2.85415 6 2.63748 6H2.58123C2.5604 6 2.53748 5.99167 2.51248 5.975V9.5Z"
      fill="#60697D"
    />
  </svg>
);

export const KPI_STATUS_COLORS = {
  info: "#4259EE",
  success: "#1FC16B",
  warning: "#F2AA1D",
};

const SCOPE_TAG_COLORS = {
  "IN SCOPE": { bg: "#EEF1FE", color: "#4259EE" },
  CLEAN: { bg: "#EAFBF3", color: "#1FC16B" },
  IMPACTED: { bg: "#FFF6E5", color: "#B5790A" },
};
const DEFAULT_SCOPE_TAG_COLOR = { bg: "#F2F3F4", color: "#4B5563" };

const KpiStatusDot = ({ color }) => (
  <span
    className="kpi-card-dot"
    style={{ background: color, boxShadow: `0 0 4px ${color}` }}
  />
);

const handleCopyStat = (copyList, value) => {
  if (copyList && copyList.length > 0) {
    navigator.clipboard?.writeText(copyList.join(", "));
    return;
  }
  if (!value && value !== 0) return;
  navigator.clipboard?.writeText(String(value));
};

const KpiCard = ({
  title,
  value,
  caption,
  statusColor = KPI_STATUS_COLORS.info,
  stats = [],
  scopeTag,
  copyList,
  addSnack,
}) => {
  const scopeTagColor = SCOPE_TAG_COLORS[scopeTag] || DEFAULT_SCOPE_TAG_COLOR;

  const handleCopyClick = () => {
    handleCopyStat(copyList, value);
    showSnackMessage(addSnack, "Copied to clipboard", "success");
  };

  return (
    <div className="kpi-card">
      <div className="kpi-card-headerRow">
        <div className="kpi-card-titleRow">
          <KpiStatusDot color={statusColor} />
          <span className="kpi-card-title">{title}</span>
          {scopeTag && (
            <span
              className="kpi-card-scopeTag"
              style={{ background: scopeTagColor.bg, color: scopeTagColor.color }}
            >
              {scopeTag}
            </span>
          )}
        </div>
        <button
          type="button"
          className="kpi-card-copyBtn"
          onClick={handleCopyClick}
          title="Copy"
        >
          <CopyIcon />
        </button>
      </div>

      <div className="kpi-card-value">{value}</div>
      <div className="kpi-card-caption">{caption}</div>

      {stats.length > 0 && (
        <div className="kpi-card-statsRow">
          {stats.map((stat, index) => (
            <div className="kpi-stat-chip" key={stat.key || index}>
              <span className="kpi-stat-left">
                {stat.icon === "stores" ? <StoresIcon /> : <StyleColorsIcon />}
                <span className="kpi-stat-label">{stat.label}</span>
              </span>
              <span className="kpi-stat-value">{stat.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (snack) => dispatch(addSnack(snack)),
});

export default connect(null, mapDispatchToProps)(KpiCard);
