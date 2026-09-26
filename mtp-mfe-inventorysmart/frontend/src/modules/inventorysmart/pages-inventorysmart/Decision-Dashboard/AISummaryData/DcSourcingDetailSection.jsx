import { connect } from "react-redux";
import { Button } from "impact-ui-v3";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import WarehouseOutlinedIcon from "@mui/icons-material/WarehouseOutlined";
import TrendingFlatOutlinedIcon from "@mui/icons-material/TrendingFlatOutlined";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import EventOutlinedIcon from "@mui/icons-material/EventOutlined";
import { addSnack } from "core/actions/snackbarActions";
import { showSnackMessage } from "core/Utils/utils";
import "./DcSourcingDetailModal.css";

const DCS_BADGE_VARIANTS = {
  neutral: { bg: "#F2F3F4", color: "#4B5563" },
  critical: { bg: "#FEF4F5", color: "#E5484D" },
  warning: { bg: "#FFF8E1", color: "#8A6D1D" },
  info: { bg: "#EAF1FB", color: "#2B5FAD" },
};

const formatUnits = (num) =>
  num === null || num === undefined ? "—" : num.toLocaleString();

const formatSignedUnits = (num) => {
  if (num === null || num === undefined) return null;
  return `${num > 0 ? "+" : ""}${num.toLocaleString()}`;
};

const formatPct = (num) =>
  num === null || num === undefined ? null : `${Math.round(num)}%`;

const handleCopyToClipboard = (text, addSnackFn) => {
  navigator.clipboard?.writeText(text);
  showSnackMessage(addSnackFn, "Copied to clipboard", "success");
};

const getIssueVariant = (issue) => {
  if (!issue) return "neutral";
  const lower = issue.toLowerCase();
  if (lower.includes("overdrain") || lower.includes("exhaust")) return "critical";
  if (lower.includes("below threshold") || lower.includes("below min")) return "warning";
  return "neutral";
};

const flattenStyleColors = (plans) => {
  if (!Array.isArray(plans)) return [];
  return plans.flatMap((plan) =>
    (plan.styleColors?.items || []).map((styleColor) => ({
      ...styleColor,
      planName: plan.planName,
      planId: plan.planId,
    }))
  );
};

const NetworkStat = ({ label, value }) => (
  <div className="dcs-networkStat">
    <div className="dcs-networkStat-label">{label}</div>
    <div className="dcs-networkStat-value">{value}</div>
  </div>
);

const DcCard = ({ card }) => {
  const hasConsumedPct =
    !card.placeholder && card.consumedPct !== null && card.consumedPct !== undefined;

  let badge = null;
  if (card.placeholder) {
    badge = { label: "Data Pending", variant: "neutral" };
  } else if (hasConsumedPct && card.consumedPct >= 100) {
    badge = { label: "Exhausted", variant: "critical" };
  } else if (card.role === "secondary") {
    badge = { label: "Active Fallback", variant: "info" };
  }
  const badgeVariant = badge ? DCS_BADGE_VARIANTS[badge.variant] : null;

  return (
    <div className="dcs-dcCard">
      <div className="dcs-dcCard-headerRow">
        <span className="dcs-dcCard-role">{card.role}</span>
        {badge && (
          <span
            className="dcs-dcCard-badge"
            style={{ background: badgeVariant.bg, color: badgeVariant.color }}
          >
            {badge.label}
          </span>
        )}
      </div>

      <div className="dcs-dcCard-name">
        {card.dcName || "Unknown DC"}
        {card.dcId ? ` · DC-${card.dcId}` : ""}
      </div>

      {hasConsumedPct ? (
        <>
          <div
            className="dcs-dcCard-bigValue"
            style={{ color: card.consumedPct >= 100 ? "#E5484D" : "#2B5FAD" }}
          >
            {Math.round(card.consumedPct)}%{" "}
            <span className="dcs-dcCard-bigValueLabel">consumed</span>
          </div>
          <div className="dcs-dcCard-progressTrack">
            <div
              className="dcs-dcCard-progressFill"
              style={{
                width: `${Math.min(card.consumedPct, 100)}%`,
                background: card.consumedPct >= 100 ? "#E5484D" : "#5B8DEF",
              }}
            />
          </div>
          <div className="dcs-dcCard-caption">
            {formatUnits(card.allocatedUnits)} Units Allocated
          </div>
        </>
      ) : (
        <>
          <div className="dcs-dcCard-bigValue">
            {formatUnits(card.allocatedUnits)}{" "}
            <span className="dcs-dcCard-bigValueLabel">units allocated</span>
          </div>
          <div className="dcs-dcCard-caption">Consumption % not yet available for this DC</div>
        </>
      )}
    </div>
  );
};

// Two-DC "primary -> fallback -> secondary" layout when exactly 2 DC cards
// come back (matches the design); degrades to a plain wrapping grid of
// cards for any other count instead of assuming a fixed shape.
const MultiDcSourcingFlow = ({ networkSummary, dcCards = [] }) => {
  if (!networkSummary && dcCards.length === 0) return null;
  const fallbackLabel = formatSignedUnits(networkSummary?.fallbackUnits);

  return (
    <div className="dcs-flowPanel">
      <div className="dcs-flowPanel-title">Multi-DC Sourcing Flow</div>

      {networkSummary && (
        <div className="dcs-networkStatsRow">
          <NetworkStat label="DC in Network" value={formatUnits(networkSummary.dcsInNetwork)} />
          <NetworkStat
            label="DCs Exhausted"
            value={
              networkSummary.dcsExhausted !== null && networkSummary.dcsExhausted !== undefined
                ? formatUnits(networkSummary.dcsExhausted)
                : "—"
            }
          />
          <NetworkStat
            label="Network Consumed"
            value={formatPct(networkSummary.networkConsumedPct) || "Pending"}
          />
          <NetworkStat label="Fallback units" value={fallbackLabel || "—"} />
        </div>
      )}

      {dcCards.length === 2 ? (
        <div className="dcs-dcCardsRow">
          <DcCard card={dcCards[0]} />
          <div className="dcs-fallbackArrow">
            <span className="dcs-fallbackArrow-label">Fallback</span>
            <TrendingFlatOutlinedIcon style={{ fontSize: 22, color: "#7A8294" }} />
            {fallbackLabel && <span className="dcs-fallbackArrow-value">{fallbackLabel}</span>}
          </div>
          <DcCard card={dcCards[1]} />
        </div>
      ) : dcCards.length > 0 ? (
        <div className="dcs-dcCardsGrid">
          {dcCards.map((card) => (
            <DcCard card={card} key={card.dcId} />
          ))}
        </div>
      ) : null}
    </div>
  );
};

const DcSourcingStyleColorCard = ({ styleColor, dcById, addSnack }) => {
  const issueVariant = getIssueVariant(styleColor.issue);
  const issueColors = DCS_BADGE_VARIANTS[issueVariant];
  const sourcingDc = styleColor.sourcingDcId ? dcById[styleColor.sourcingDcId] : null;
  const pos = Array.isArray(styleColor.targetDispatchPos) ? styleColor.targetDispatchPos : [];

  return (
    <div className="dcs-styleColorCard">
      <div className="dcs-styleColorCard-headerRow">
        <span className="dcs-styleColorCard-code">{styleColor.styleColorName}</span>
        {styleColor.planName && (
          <span className="dcs-styleColorCard-planRef">Plan: {styleColor.planName}</span>
        )}
        <button
          type="button"
          className="dcs-copyBtn"
          aria-label="Copy style color"
          onClick={(e) => {
            e.stopPropagation();
            handleCopyToClipboard(styleColor.styleColorName, addSnack);
          }}
        >
          <ContentCopyOutlinedIcon style={{ fontSize: 14 }} />
        </button>
      </div>

      {styleColor.issue && (
        <span
          className="dcs-styleColorCard-issueBadge"
          style={{ background: issueColors.bg, color: issueColors.color }}
        >
          {styleColor.issue}
        </span>
      )}

      {sourcingDc && (
        <div className="dcs-styleColorCard-sourcingRow">
          <WarehouseOutlinedIcon style={{ fontSize: 14, color: "#7A8294" }} />
          <span>
            Sourcing DC: {sourcingDc.dcName || `DC-${styleColor.sourcingDcId}`}
            {sourcingDc.role ? ` (${sourcingDc.role})` : ""}
          </span>
        </div>
      )}

      {pos.length > 0 && (
        <div className="dcs-styleColorCard-poSection">
          <div className="dcs-styleColorCard-poLabel">
            <AssignmentOutlinedIcon style={{ fontSize: 13 }} />
            Target Dispatch PO to Expedite
          </div>
          {pos.map((po, index) => (
            <div className="dcs-poRow" key={po.poNumber || po.id || index}>
              <span className="dcs-poRow-number">
                {po.poNumber || po.id || `PO ${index + 1}`}
              </span>
              {(po.eta || po.etaDate) && (
                <span className="dcs-poRow-eta">
                  <EventOutlinedIcon style={{ fontSize: 13 }} /> ETA {po.eta || po.etaDate}
                </span>
              )}
              {po.source && <span className="dcs-poRow-source">{po.source}</span>}
              <button
                type="button"
                className="dcs-copyBtn"
                aria-label="Copy PO"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyToClipboard(po.poNumber || po.id || "", addSnack);
                }}
              >
                <ContentCopyOutlinedIcon style={{ fontSize: 14 }} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const DcSourcingDetailSection = ({
  detail,
  loading,
  error,
  addSnack,
  onExportAll,
  exportLoading,
}) => {
  const directory = detail?.content?.directory;
  const networkSummary = directory?.networkSummary;
  const dcCards = directory?.dcCards || [];
  const summary = detail?.summary;

  const dcById = dcCards.reduce((acc, card) => {
    if (card.dcId) acc[card.dcId] = card;
    return acc;
  }, {});

  const styleColors = flattenStyleColors(directory?.plans?.items);

  return (
    <div className="dcs-inlineSection">
      {loading ? (
        <div className="dcs-statusText">Loading affected style colors...</div>
      ) : error ? (
        <div className="dcs-statusText">Failed to load affected style colors.</div>
      ) : (
        <>
          <MultiDcSourcingFlow networkSummary={networkSummary} dcCards={dcCards} />

          <div className="dcs-sectionHeaderRow">
            <span className="dcs-sectionTitle">
              Affected Style Colors
              {summary?.affectedStyleColors !== undefined
                ? ` (${summary.affectedStyleColors})`
                : ""}
            </span>
            <Button
              variant="secondary"
              size="small"
              className="dcs-exportBtn"
              icon={<FileDownloadOutlinedIcon style={{ fontSize: 16 }} />}
              disabled={exportLoading}
              onClick={(e) => {
                e.stopPropagation();
                onExportAll?.();
              }}
            >
              {exportLoading ? "Exporting..." : "Export All Style Colors"}
            </Button>
          </div>

          {styleColors.length > 0 ? (
            <div className="dcs-styleColorsList">
              {styleColors.map((styleColor) => (
                <DcSourcingStyleColorCard
                  styleColor={styleColor}
                  dcById={dcById}
                  addSnack={addSnack}
                  key={styleColor.styleColorId}
                />
              ))}
            </div>
          ) : (
            <div className="dcs-statusText">No affected style colors found.</div>
          )}
        </>
      )}
    </div>
  );
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (snack) => dispatch(addSnack(snack)),
});

export default connect(null, mapDispatchToProps)(DcSourcingDetailSection);
