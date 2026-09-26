import { ButtonGroup, Button } from "impact-ui-v3";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import "./AffectedStoresModal.css";

export const AFFECTED_STORE_BADGE_VARIANTS = {
  neutral: { bg: "#F2F3F4", color: "#4B5563" },
  critical: { bg: "#FEF4F5", color: "#E5484D" },
  warning: { bg: "#FFF8E1", color: "#8A6D1D" },
  success: { bg: "#F0FBF6", color: "#1FA971" },
};

const STATUS_PILL_VARIANTS = {
  critical: { bg: "#E5484D", color: "#fff" },
  warning: { bg: "#F2C94C", color: "#5C4813" },
  success: { bg: "#1FC16B", color: "#fff" },
  neutral: { bg: "#9CA3AF", color: "#fff" },
};

// Tab keys/labels match the real API's content.tabs[].key/label exactly.
const STORE_CAPACITY_TABS = [
  { key: "capacityBreach", label: "Capacity Breach" },
  { key: "storeInventoryHealth", label: "Store Inventory Health" },
];

// Same two tabs, reshaped for impact-ui-v3's ButtonGroup `options` prop
// (label/value pairs) - rendered as a centered toggle-button pair instead of
// an underlined Tabs strip.
const STORE_CAPACITY_TAB_OPTIONS = STORE_CAPACITY_TABS.map((tab) => ({
  label: tab.label,
  value: tab.key,
}));

// filterChips.key -> badge variant (used for both tabs' chip rows and for
// keyword-matching a row's free-form storeStatus/statusBadge string).
const CHIP_VARIANT_MAP = {
  overCapacity: "critical",
  nearCapacity: "warning",
  withinLimit: "success",
  broadUnderstock: "critical",
  broadOverstock: "warning",
  imbalanced: "warning",
};

const getStatusVariant = (status) => {
  const s = (status || "").toString().toLowerCase();
  if (s.includes("over") && s.includes("capacity")) return "critical";
  if (s.includes("near")) return "warning";
  if (s.includes("within")) return "success";
  if (s.includes("understock")) return "critical";
  if (s.includes("overstock")) return "warning";
  if (s.includes("imbalance")) return "warning";
  return "neutral";
};

const formatUnits = (num) =>
  num === null || num === undefined ? "—" : num.toLocaleString();

const formatPct = (num) =>
  num === null || num === undefined ? "—" : `${Number(num).toFixed(1)}%`;

const formatCurrency = (num) =>
  num === null || num === undefined
    ? "—"
    : `$${num.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

const formatFwos = (weeks) =>
  weeks === null || weeks === undefined ? "—" : `${Number(weeks).toFixed(0)} FWOS`;

const Stat = ({ icon, label, value, valueColor }) => (
  <div>
    <div className="affected-store-stat-labelRow">
      {icon}
      <span>{label}</span>
    </div>
    <div className="affected-store-stat-value" style={{ color: valueColor }}>
      {value}
    </div>
  </div>
);

const SummaryChipsRow = ({ chips, metaText, exportLabel, onExportAll, exportLoading }) => (
  <div className="affected-stores-summaryRow">
    {chips.map((chip) => {
      const variant =
        AFFECTED_STORE_BADGE_VARIANTS[CHIP_VARIANT_MAP[chip.key]] ||
        AFFECTED_STORE_BADGE_VARIANTS.neutral;
      return (
        <span
          className="affected-stores-summaryChip"
          key={chip.key}
          style={{ background: variant.bg, color: variant.color }}
        >
          {chip.label}
          {chip.count !== null && chip.count !== undefined && (
            <span className="affected-stores-summaryChip-value">{chip.count}</span>
          )}
        </span>
      );
    })}
    {metaText && <span className="affected-stores-metaText">{metaText}</span>}
    <Button
      variant="secondary"
      size="small"
      className="affected-stores-exportBtn"
      icon={<FileDownloadOutlinedIcon style={{ fontSize: 16 }} />}
      disabled={exportLoading}
      onClick={(e) => {
        e.stopPropagation();
        onExportAll?.();
      }}
    >
      {exportLoading ? "Exporting..." : exportLabel}
    </Button>
  </div>
);

const CapacityBreachStoreCard = ({ row }) => {
  const hasCapFill =
    row.capacityUnits !== null &&
    row.capacityUnits !== undefined &&
    row.allocatedUnits !== null &&
    row.allocatedUnits !== undefined;
  const hasBreachPct = row.breachPct !== null && row.breachPct !== undefined;
  const barSegments = [
    { key: "on_hand", label: "On hand", value: row.onHandUnits, color: "#5AD8C1" },
    { key: "on_order", label: "On Order", value: row.onOrderUnits, color: "#5B8DEF" },
    { key: "in_transit", label: "In Transit", value: row.inTransitUnits, color: "#B7A8E8" },
    {
      key: "new_allocation",
      label: "New Allocation",
      value: row.newAllocationUnits,
      color: "#F3A683",
    },
  ];
  const hasBar = barSegments.every(
    (segment) => segment.value !== null && segment.value !== undefined
  );
  const barTotal = hasBar
    ? barSegments.reduce((sum, segment) => sum + segment.value, 0) || 1
    : 1;
  const statusVariant = STATUS_PILL_VARIANTS[getStatusVariant(row.storeStatus)];

  return (
    <div className="affected-store-card">
      <div className="affected-store-headerRow">
        <span className="affected-store-code">{row.storeName || row.storeId}</span>
        <span className="affected-store-fwos">{formatFwos(row.fwosWeeks)}</span>
        {row.storeStatus && (
          <span
            className="affected-store-statusBadge"
            style={{ background: statusVariant.bg, color: statusVariant.color }}
          >
            {row.storeStatus}
          </span>
        )}
      </div>
      {row.planId && <div className="affected-store-subtitle">Plan: {row.planId}</div>}

      <div className="affected-store-body">
        <div className="affected-store-statsRow">
          {hasCapFill && (
            <Stat
              icon={<StorefrontOutlinedIcon style={{ fontSize: 13 }} />}
              label="Fill"
              value={formatUnits(row.allocatedUnits)}
            />
          )}
          {hasCapFill && (
            <Stat
              icon={<Inventory2OutlinedIcon style={{ fontSize: 13 }} />}
              label="Cap"
              value={formatUnits(row.capacityUnits)}
            />
          )}
          {hasBreachPct && (
            <Stat label="Breach" value={formatPct(row.breachPct)} valueColor="#E5484D" />
          )}
          <Stat label="Unmet units" value={formatUnits(row.unmetUnits)} />
          <Stat
            label="Revenue at risk"
            value={formatCurrency(row.revenueAtRisk)}
            valueColor="#E5484D"
          />
        </div>

        {hasBar && (
          <div className="affected-store-barSection">
            <div className="affected-store-bar">
              {barSegments.map((segment) => (
                <span
                  className="affected-store-barSegment"
                  key={segment.key}
                  style={{
                    width: `${(segment.value / barTotal) * 100}%`,
                    background: segment.color,
                  }}
                />
              ))}
            </div>
            <div className="affected-store-legend">
              {barSegments.map((segment) => (
                <span className="affected-store-legendItem" key={segment.key}>
                  <span
                    className="affected-store-legendDot"
                    style={{ background: segment.color }}
                  />
                  {segment.label}{" "}
                  <span className="affected-store-legendValue">
                    {segment.value.toLocaleString()}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const StoreInventoryHealthCard = ({ row }) => {
  const hasAnyMetric =
    (row.styleColorsTotal !== null && row.styleColorsTotal !== undefined) ||
    (row.understockedCount !== null && row.understockedCount !== undefined) ||
    (row.healthyCount !== null && row.healthyCount !== undefined) ||
    (row.overstockedCount !== null && row.overstockedCount !== undefined);
  const statusVariant = STATUS_PILL_VARIANTS[getStatusVariant(row.statusBadge)];

  return (
    <div className="affected-store-card">
      <div className="affected-store-headerRow">
        <span className="affected-store-code">{row.storeName || row.storeId}</span>
        {row.statusBadge && (
          <span
            className="affected-store-statusBadge"
            style={{ background: statusVariant.bg, color: statusVariant.color }}
          >
            {row.statusBadge}
          </span>
        )}
      </div>
      {row.planId && <div className="affected-store-subtitle">Plan: {row.planId}</div>}

      {hasAnyMetric ? (
        <div className="affected-store-statsRow" style={{ marginTop: 12 }}>
          {row.styleColorsTotal !== null && row.styleColorsTotal !== undefined && (
            <Stat label="Style Colors" value={formatUnits(row.styleColorsTotal)} />
          )}
          {row.understockedCount !== null && row.understockedCount !== undefined && (
            <Stat
              label="Understocked"
              value={`${formatUnits(row.understockedCount)}${
                row.understockedPct !== null && row.understockedPct !== undefined
                  ? ` (${formatPct(row.understockedPct)})`
                  : ""
              }`}
              valueColor="#E5484D"
            />
          )}
          {row.healthyCount !== null && row.healthyCount !== undefined && (
            <Stat
              label="Healthy"
              value={`${formatUnits(row.healthyCount)}${
                row.healthyPct !== null && row.healthyPct !== undefined
                  ? ` (${formatPct(row.healthyPct)})`
                  : ""
              }`}
              valueColor="#1FA971"
            />
          )}
          {row.overstockedCount !== null && row.overstockedCount !== undefined && (
            <Stat
              label="Overstocked"
              value={`${formatUnits(row.overstockedCount)}${
                row.overstockedPct !== null && row.overstockedPct !== undefined
                  ? ` (${formatPct(row.overstockedPct)})`
                  : ""
              }`}
              valueColor="#8A6D1D"
            />
          )}
        </div>
      ) : (
        <div className="affected-store-subtitle" style={{ marginTop: 8 }}>
          Inventory health metrics not yet available for this store.
        </div>
      )}

      {row.aiInsightText && (
        <div className="affected-store-fwosBox-desc" style={{ marginTop: 8 }}>
          {row.aiInsightText}
        </div>
      )}
    </div>
  );
};

// One tab's body - chip row (if any) + meta text + export button, then
// either a loading/error/empty status or the row list.
const TabPanel = ({ tabData, loading, error, RowComponent, onExportAll, exportLoading }) => {
  const rowsMeta = tabData?.rows;
  const items = Array.isArray(rowsMeta?.items) ? rowsMeta.items : [];
  const chips = tabData?.filterChips || [];

  return (
    <>
      {chips.length > 0 && (
        <SummaryChipsRow
          chips={chips}
          metaText={
            rowsMeta
              ? `Showing ${rowsMeta.shownCount} of ${rowsMeta.totalCount} Stores by impact`
              : undefined
          }
          exportLabel="Export All Stores"
          onExportAll={onExportAll}
          exportLoading={exportLoading}
        />
      )}

      {loading ? (
        <div className="affected-stores-placeholder">Loading affected stores...</div>
      ) : error ? (
        <div className="affected-stores-placeholder">Failed to load affected stores.</div>
      ) : items.length > 0 ? (
        <div className="affected-stores-list">
          {items.map((row) => (
            <RowComponent row={row} key={row.storeId} />
          ))}
        </div>
      ) : (
        <div className="affected-stores-placeholder">No affected stores found.</div>
      )}
    </>
  );
};

const AffectedStoresSection = ({
  activeTab,
  onTabChange,
  capacityBreachTab,
  capacityBreachLoading,
  capacityBreachError,
  storeInventoryHealthTab,
  storeInventoryHealthLoading,
  storeInventoryHealthError,
  onExportAll,
  exportLoading,
}) => (
  <div className="affected-stores-inlineSection">
    <div className="affected-stores-tabsWrap">
      <ButtonGroup
        options={STORE_CAPACITY_TAB_OPTIONS}
        selectedOption={activeTab}
        onChange={(event, value) => {
          if (value != null) onTabChange(value);
        }}
      />
    </div>

    {activeTab === "storeInventoryHealth" ? (
      <TabPanel
        tabData={storeInventoryHealthTab}
        loading={storeInventoryHealthLoading}
        error={storeInventoryHealthError}
        RowComponent={StoreInventoryHealthCard}
        onExportAll={onExportAll}
        exportLoading={exportLoading}
      />
    ) : (
      <TabPanel
        tabData={capacityBreachTab}
        loading={capacityBreachLoading}
        error={capacityBreachError}
        RowComponent={CapacityBreachStoreCard}
        onExportAll={onExportAll}
        exportLoading={exportLoading}
      />
    )}
  </div>
);

export default AffectedStoresSection;
