import { Button } from "impact-ui-v3";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import TrendingDownOutlinedIcon from "@mui/icons-material/TrendingDownOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import AdjustOutlinedIcon from "@mui/icons-material/AdjustOutlined";
import "./ConstraintAccordionCard.css";

export const CONSTRAINT_BADGE_VARIANTS = {
  neutral: { bg: "#F2F3F4", color: "#4B5563" },
  critical: { bg: "#FEF4F5", color: "#E5484D" },
  warning: { bg: "#FFF8E1", color: "#8A6D1D" },
};

const buildConstraintHeader = ({
  icon = <FlagOutlinedIcon style={{ fontSize: 18, color: "#E5484D" }} />,
  iconBg = "#FDEEF0",
  title,
  badges = [],
  preview,
}) => (
  <div className="constraint-header-left">
    <span className="constraint-iconBox" style={{ background: iconBg }}>
      {icon}
    </span>
    <div className="constraint-header-main">
      <div className="constraint-title">{title}</div>
      {badges.length > 0 && (
        <div className="constraint-badgeRow">
          {badges.map((badge, index) => {
            const variant =
              CONSTRAINT_BADGE_VARIANTS[badge.variant] ||
              CONSTRAINT_BADGE_VARIANTS.neutral;
            return (
              <span
                className="constraint-badge"
                key={badge.key || index}
                style={{ background: variant.bg, color: variant.color }}
              >
                {badge.label}
              </span>
            );
          })}
        </div>
      )}

      {preview && (
        <div className="constraint-preview">
          {preview.whatBullet && (
            <div className="constraint-preview-what">
              <span className="constraint-bulletLabel">
                {preview.whatBullet.label || "What"}:{" "}
              </span>
              {preview.whatBullet.text}
            </div>
          )}
          {preview.impactText && (
            <div className="constraint-preview-impact">
              <AdjustOutlinedIcon style={{ fontSize: 13 }} />
              <span>{preview.impactText}</span>
            </div>
          )}
        </div>
      )}
    </div>
  </div>
);

const ConstraintStatBox = ({ icon, iconBg = "#EAF1FB", title, info, value, valueColor = "#1F2B4D", caption, stats }) => (
  <div className="constraint-statBox">
    <div className="constraint-statBox-header">
      {icon && (
        <span className="constraint-statBox-iconBox" style={{ background: iconBg }}>
          {icon}
        </span>
      )}
      <span className="constraint-statBox-title">{title}</span>
      {info && (
        <InfoOutlinedIcon className="constraint-statBox-info" style={{ fontSize: 14 }} />
      )}
    </div>

    {stats && stats.length > 0 ? (
      <div className="constraint-statBox-multi">
        {stats.map((stat, index) => (
          <div className="constraint-statBox-multiItem" key={stat.key || index}>
            <div
              className="constraint-statBox-value"
              style={{ color: stat.color || valueColor }}
            >
              {stat.value}
            </div>
            <div className="constraint-statBox-caption">{stat.label}</div>
          </div>
        ))}
      </div>
    ) : (
      <div className="constraint-statBox-single">
        <div className="constraint-statBox-value" style={{ color: valueColor }}>
          {value}
        </div>
        <div className="constraint-statBox-caption">{caption}</div>
      </div>
    )}
  </div>
);

const ConstraintBullet = ({ bullet }) => (
  <li className="constraint-bulletItem">
    {bullet.label && (
      <span className="constraint-bulletLabel">{bullet.label}: </span>
    )}
    {bullet.text}
    {bullet.boldSuffix && <strong>{bullet.boldSuffix}</strong>}

    {bullet.statBoxes?.length > 0 && (
      <div className="constraint-statBoxRow">
        {bullet.statBoxes.map((statBox, index) => (
          <ConstraintStatBox key={statBox.key || index} {...statBox} />
        ))}
      </div>
    )}

    {bullet.subBullets?.length > 0 && (
      <ul className="constraint-subBulletList">
        {bullet.subBullets.map((line, index) => (
          <li className="constraint-subBulletItem" key={index}>
            <span className="constraint-subBulletArrow">→</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
    )}

    {bullet.subList?.length > 0 && (
      <ol className="constraint-subList">
        {bullet.subList.map((line, index) => (
          <li className="constraint-subListItem" key={index}>
            {line}
          </li>
        ))}
      </ol>
    )}
  </li>
);

const buildConstraintContent = ({
  macroImpactLabel = "Macro Impact:",
  macroImpact,
  bullets = [],
  lostSales,
  footerActions,
  directorySlot,
  comingSoonText = "Detailed breakdown for this insight is coming soon.",
}) => {
  const hasContent =
    macroImpact || bullets.length > 0 || lostSales || footerActions || directorySlot;

  if (!hasContent) {
    return (
      <div className="constraint-body" onClick={(e) => e.stopPropagation()}>
        <div className="constraint-comingSoon">{comingSoonText}</div>
      </div>
    );
  }

  return (
  <div className="constraint-body" onClick={(e) => e.stopPropagation()}>
    {macroImpact && (
      <div className="constraint-macroImpact">
        <div>
          <span className="constraint-macroImpact-label">
            {macroImpactLabel}{" "}
          </span>
          <span className="constraint-macroImpact-text">{macroImpact}</span>
        </div>
      </div>
    )}

    {bullets.length > 0 && (
      <ul className="constraint-bulletList">
        {bullets.map((bullet, index) => (
          <ConstraintBullet bullet={bullet} key={bullet.key || index} />
        ))}
      </ul>
    )}

    {lostSales && (
      <div className="constraint-lostSales">
        <div>
          <div className="constraint-lostSales-titleRow">
            <TrendingDownOutlinedIcon style={{ fontSize: 16, color: "#E5484D" }} />
            <span className="constraint-lostSales-title">
              {lostSales.title}
            </span>
          </div>
          <div className="constraint-lostSales-desc">
            {lostSales.description}
          </div>
        </div>
        <div className="constraint-lostSales-right">
          <div className="constraint-lostSales-amount">{lostSales.amount}</div>
          <div className="constraint-lostSales-amountCaption">
            {lostSales.amountCaption}
          </div>
        </div>
      </div>
    )}

    {footerActions && (
      <div className="constraint-footerRow">
        {footerActions.viewLabel && (
          <button
            type="button"
            className="constraint-viewLink"
            onClick={footerActions.onView}
          >
            {footerActions.viewLabel}
            <ChevronRightIcon style={{ fontSize: 16 }} />
          </button>
        )}
        {footerActions.exportLabel && (
          <Button
            variant="secondary"
            size="small"
            className="constraint-exportBtn"
            icon={<FileDownloadOutlinedIcon style={{ fontSize: 16 }} />}
            disabled={footerActions.exporting}
            onClick={footerActions.onExport}
          >
            {footerActions.exporting ? "Exporting..." : footerActions.exportLabel}
          </Button>
        )}
      </div>
    )}

    {directorySlot}
  </div>
  );
};

export const buildConstraintAccordionItem = (insight, index = 0) => ({
  id: insight.key || index,
  value: insight.key || `insight_${index}`,
  header: buildConstraintHeader(insight),
  content: buildConstraintContent(insight),
});

export default buildConstraintAccordionItem;
