import { useState } from "react";
import { connect } from "react-redux";
import { Button } from "impact-ui-v3";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import CheckBoxOutlinedIcon from "@mui/icons-material/CheckBoxOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import AdjustOutlinedIcon from "@mui/icons-material/AdjustOutlined";
import EventOutlinedIcon from "@mui/icons-material/EventOutlined";
import { addSnack } from "core/actions/snackbarActions";
import { showSnackMessage } from "core/Utils/utils";
import "./MinConstraintsDirectoryModal.css";

const PLAN_STAT_ICON_MAP = {
  allocation: <CheckBoxOutlinedIcon style={{ fontSize: 13 }} />,
  unmet: <Inventory2OutlinedIcon style={{ fontSize: 13 }} />,
  risk: <AdjustOutlinedIcon style={{ fontSize: 13 }} />,
  fwos: <EventOutlinedIcon style={{ fontSize: 13 }} />,
};

const MCD_VALUE_COLORS = {
  critical: "#E5484D",
  warning: "#8A6D1D",
  success: "#1FA971",
};

const formatSignedUnits = (num) => {
  if (num === null || num === undefined) return "—";
  return `${num > 0 ? "+" : ""}${num.toLocaleString()}`;
};

const formatCount = (num) => (num === null || num === undefined ? "—" : num.toLocaleString());

const formatCurrency = (num) => {
  if (num === null || num === undefined) return "—";
  return `$${num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatWeeks = (num) =>
  num === null || num === undefined ? "—" : `${Number(num).toFixed(2)}W`;

const handleCopyToClipboard = (text, addSnackFn) => {
  navigator.clipboard?.writeText(text);
  showSnackMessage(addSnackFn, "Copied to clipboard", "success");
};

const PlanStat = ({ icon, label, value, variant }) => (
  <div className="mcd-stat">
    <div className="mcd-stat-labelRow">
      {PLAN_STAT_ICON_MAP[icon]}
      <span>{label}</span>
    </div>
    <div
      className="mcd-stat-value"
      style={{ color: variant ? MCD_VALUE_COLORS[variant] : undefined }}
    >
      {value}
    </div>
  </div>
);

const StyleColorRow = ({ styleColor, addSnack }) => {
  const [expanded, setExpanded] = useState(false);
  const nested = styleColor.nestedStyleColors;
  const hasNested = Array.isArray(nested?.items) && nested.items.length > 0;

  return (
    <div className="mcd-styleColorBlock">
      <div
        className="mcd-styleColorRow"
        onClick={() => hasNested && setExpanded((prev) => !prev)}
        style={{ cursor: hasNested ? "pointer" : "default" }}
      >
        <span className="mcd-styleColorRow-chevron">
          {hasNested ? (
            expanded ? (
              <KeyboardArrowUpIcon style={{ fontSize: 18 }} />
            ) : (
              <KeyboardArrowDownIcon style={{ fontSize: 18 }} />
            )
          ) : null}
        </span>
        <span className="mcd-styleColorRow-code">
          {styleColor.styleColorName}
          {styleColor.issue && (
            <div className="mcd-styleColorRow-issue">{styleColor.issue}</div>
          )}
        </span>
        <span className="mcd-styleColorRow-category">{styleColor.categoryTag}</span>
        <span className="mcd-styleColorRow-storesCount">
          {formatCount(styleColor.storeCount)}
        </span>
        <span className="mcd-styleColorRow-units">
          {formatSignedUnits(styleColor.impactUnits)}
        </span>
        <button
          type="button"
          className="mcd-copyBtn"
          aria-label="Copy style color row"
          onClick={(e) => {
            e.stopPropagation();
            handleCopyToClipboard(styleColor.styleColorName, addSnack);
          }}
        >
          <ContentCopyOutlinedIcon style={{ fontSize: 14 }} />
        </button>
      </div>

      {expanded && hasNested && (
        <div className="mcd-storesSection">
          <div className="mcd-metaTextSmall">
            Showing top {nested.shownCount} of {nested.totalCount} Style Colors by impact
          </div>
          <div className="mcd-storesTable">
            <div className="mcd-productsTable-headerRow">
              <span />
              <span>Style Color</span>
              <span>Category</span>
              <span>No Of Stores</span>
              <span>Units</span>
              <span />
            </div>
            {nested.items.map((sc) => (
              <StyleColorRow styleColor={sc} addSnack={addSnack} key={sc.styleColorId} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const PlanRow = ({ plan, addSnack }) => {
  const [expanded, setExpanded] = useState(false);
  const styleColors = plan.styleColors;
  const hasStyleColors = Array.isArray(styleColors?.items) && styleColors.items.length > 0;

  return (
    <div className="mcd-planCard">
      <div className="mcd-planHeader" onClick={() => setExpanded((prev) => !prev)}>
        <div className="mcd-planHeader-left">
          <span className="mcd-planName">{plan.planName}</span>
          {plan.tag && <span className="mcd-urgencyBadge">{plan.tag}</span>}
        </div>
        {expanded ? (
          <KeyboardArrowUpIcon style={{ fontSize: 20, color: "#7A8294" }} />
        ) : (
          <KeyboardArrowDownIcon style={{ fontSize: 20, color: "#7A8294" }} />
        )}
      </div>

      {plan.clusterSummary && <div className="mcd-planSummary">{plan.clusterSummary}</div>}

      <div className="mcd-planStatsRow">
        <PlanStat
          icon="allocation"
          label="Allocation rate"
          value={plan.ratePct !== null && plan.ratePct !== undefined ? `${plan.ratePct}%` : "—"}
          variant={
            plan.ratePct !== null && plan.ratePct !== undefined && plan.ratePct < 60
              ? "critical"
              : undefined
          }
        />
        <PlanStat icon="unmet" label="Unmet units" value={formatCount(plan.unmetUnits)} />
        <PlanStat icon="risk" label="Risk" value={formatCurrency(plan.riskDollars)} />
        <PlanStat
          icon="fwos"
          label="FWOS"
          value={formatWeeks(plan.fwosMinWeeks)}
          variant={
            plan.fwosMinWeeks !== null && plan.fwosMinWeeks !== undefined && plan.fwosMinWeeks < 2
              ? "critical"
              : undefined
          }
        />
      </div>

      {expanded && hasStyleColors && (
        <div className="mcd-planBody">
          <div className="mcd-metaTextSmall">
            Showing top {styleColors.shownCount} of {styleColors.totalCount} Style Colors by impact
          </div>
          <div className="mcd-productsTable">
            <div className="mcd-productsTable-headerRow">
              <span />
              <span>Style Color</span>
              <span>Category</span>
              <span>No Of Stores</span>
              <span>Units</span>
              <span />
            </div>
            {styleColors.items.map((styleColor) => (
              <StyleColorRow styleColor={styleColor} addSnack={addSnack} key={styleColor.styleColorId} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const MinConstraintsDirectorySection = ({
  label = "Affected Plans & Stores",
  metaText,
  plans,
  loading,
  error,
  addSnack,
  onExportAll,
  exportLoading,
}) => (
  <div className="mcd-inlineDirectory">
    <div className="mcd-headerRow">
      <span className="mcd-title">{label}</span>
      {metaText && <span className="mcd-metaText">{metaText}</span>}
      <Button
        variant="secondary"
        size="small"
        className="mcd-exportBtn"
        icon={<FileDownloadOutlinedIcon style={{ fontSize: 16 }} />}
        disabled={exportLoading}
        onClick={(e) => {
          e.stopPropagation();
          onExportAll?.();
        }}
      >
        {exportLoading ? "Exporting..." : "Export"}
      </Button>
    </div>

    {loading ? (
      <div className="mcd-statusText">Loading affected plans...</div>
    ) : error ? (
      <div className="mcd-statusText">Failed to load affected plans.</div>
    ) : Array.isArray(plans) && plans.length > 0 ? (
      <div className="mcd-planList">
        {plans.map((plan) => (
          <PlanRow plan={plan} addSnack={addSnack} key={plan.planId} />
        ))}
      </div>
    ) : (
      <div className="mcd-statusText">No affected plans found.</div>
    )}
  </div>
);

const mapDispatchToProps = (dispatch) => ({
  addSnack: (snack) => dispatch(addSnack(snack)),
});

export default connect(null, mapDispatchToProps)(MinConstraintsDirectorySection);
