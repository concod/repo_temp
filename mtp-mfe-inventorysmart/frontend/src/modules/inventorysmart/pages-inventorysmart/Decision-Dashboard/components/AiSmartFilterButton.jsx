import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import "./aiSmartFilterButton.css";
import AiIcon from "../../../../../assets/IS_icons/IS_AI.svg";
import { Button, TextArea, Chips, Tooltip, Toast } from "impact-ui-v3";
import SendIcon from "@mui/icons-material/Send";
import CloseIcon from "@mui/icons-material/Close";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { fetchFilterPlansData } from "modules/inventorysmart/services-inventorysmart/Decision-Dashboard/store-inventory-services";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";

const DEFAULT_SUGGESTIONS = [
  "Show clearance items",
  "Core assortment",
  "New arrivals",
  "No factory",
];

const MODE = {
  ICON: "icon",
  PILL: "pill",
  PANEL: "panel",
};

const getColumnLabel = (col) =>
  col?.headerName || col?.label || col?.display || col?.column_name || col?.field || col?.name || "";

const getColumnKey = (col) =>
  col?.field || col?.column_name || col?.name || getColumnLabel(col);

const normalizeLabel = (value) =>
  (value || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

// Some grid columns carry a compound, slash-joined label such as
// "PO/ASN Number" (i.e. "PO Number" and "ASN Number" merged into a single
// column). The cloud function only ever returns one half of that compound
// name (e.g. "PO Number"), so a plain label match would never line up with
// the grid column. This expands "PO/ASN Number" into ["PO Number", "ASN
// Number"] (keeping any other words in place) so either half can match.
const expandLabelVariants = (label) => {
  const str = (label || "").toString();
  if (!str.includes("/")) return [str];
  const words = str.split(" ");
  const slashIndex = words.findIndex((word) => word.includes("/"));
  if (slashIndex === -1) return [str];
  const parts = words[slashIndex].split("/").filter(Boolean);
  if (parts.length < 2) return [str];
  return parts.map((part) => {
    const variantWords = [...words];
    variantWords[slashIndex] = part;
    return variantWords.join(" ");
  });
};


const AiSmartFilterButton = ({
  suggestions,
  columns = [],
  filters = [],
  allocationCode,
  onApplyFilter,
  onFilterApplied,
  onResetFilter,
  placeholder = "Ask AI to filter",
  screenName,
  tableId,
  hideSuggestions = false,
  isStoreCapacityTable = false,
  onClearColumnFilter,
  onAppliedFilterChange,
  onAppliedFilterCleared
}) => {
  const classes = useStyles();
  const isProdCloudFunction = useSelector(
    (state) =>
      state?.inventorysmartReducer?.inventorySmartDashboardService
        ?.isProdCloudFunction || false
  );
  const [mode, setMode] = useState(MODE.ICON);
  const [queryText, setQueryText] = useState("");
  const [selectedColumnHint, setSelectedColumnHint] = useState(null);
  const [isApplying, setIsApplying] = useState(false);
  const [appliedColumn, setAppliedColumn] = useState(null);
  const [toast, setToast] = useState({
    open: false,
    message: "",
    variant: "success",
  });
  const containerRef = useRef(null);

  useEffect(() => {
    if (mode !== MODE.PANEL) return;
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setMode(queryText.trim() ? MODE.PILL : MODE.ICON);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mode, queryText]);

  const columnSuggestions = useMemo(() => {
    if (!Array.isArray(columns) || columns.length === 0) return null;
    const seen = new Set();
    const options = [];
    for (const col of columns) {
      const label = getColumnLabel(col);
      const key = getColumnKey(col);
      if (!label || seen.has(label)) continue;
      seen.add(label);
      options.push({ label, key });
      if (options.length === 4) break;
    }
    return options.length ? options : null;
  }, [columns]);

  const suggestionItems = suggestions?.length
    ? suggestions.map((label) => ({ label, key: null }))
    : columnSuggestions || DEFAULT_SUGGESTIONS.map((label) => ({ label, key: null }));

  const handleSuggestionClick = (item) => {
    setQueryText(`Filter by ${item.label}`);
    setSelectedColumnHint(item.key || item.label);
  };

  const showToast = (message, variant) => {
    setToast({ open: true, message, variant });
  };

  const resolveGridFieldName = (apiColumn) => {
    if (!Array.isArray(columns) || columns.length === 0) {
      return apiColumn?.name;
    }
    const targets = [normalizeLabel(apiColumn?.display), normalizeLabel(apiColumn?.name)];
    const matched = columns.find((col) => {
      const variants = expandLabelVariants(getColumnLabel(col));
      return variants.some((variant) => targets.includes(normalizeLabel(variant)));
    });
    return matched ? getColumnKey(matched) : apiColumn?.name;
  };

  const handleApplyFilter = async () => {
    if (!queryText.trim() || isApplying) return;
    setIsApplying(true);

    try {
      const formattedFilters = (filters || [])
        .filter(
          (f) =>
            f.dimension !== "store" &&
            Array.isArray(f.values) &&
            f.values.length > 0
        )
        .map(({ filter_id, values }) => ({ filter_id, values }));

      const body = {
        task: queryText.trim(),
        screen_name: screenName,
        table_id: tableId,
        filters: formattedFilters,
      };
      if (allocationCode) {
        body.allocation_code = [allocationCode];
      }
      const data = await fetchFilterPlansData(body, isProdCloudFunction);
      
      if (isStoreCapacityTable) {
        onFilterApplied?.(data?.result_rows || []);
        setAppliedColumn("store-capacity");
        showToast("Data filtered successfully", "success");

        onApplyFilter?.(queryText.trim());
        setMode(MODE.PILL);
        return;
      }

      if (data?.result_rows?.length > 0 && data?.columns?.length > 0) {
        // Prefer the column matching the clicked suggestion (if any),
        // otherwise default to the first column returned by the API.
        const matchedColumn =
          data.columns.find(
            (col) =>
              col.name === selectedColumnHint || col.display === selectedColumnHint
          ) || data.columns[0];

        const values = data.result_rows
          .map((row) => row[matchedColumn.name])
          .filter((val) => val !== undefined && val !== null);

        if (values.length > 0) {
          const gridFieldName = resolveGridFieldName(matchedColumn);
          onFilterApplied?.(gridFieldName, values);
          setAppliedColumn(gridFieldName);
          // Report the applied_filter reference chip(s) + the resolved
          // column/values so the parent can render/re-apply them.
          onAppliedFilterChange?.({
            appliedFilter: data?.applied_filter || {},
            task: queryText.trim(),
            columnName: gridFieldName,
            values,
          });
          showToast("Data filtered successfully", "success");
          // A reference chip now represents this filter, so clear the input.
          setQueryText("");
          setSelectedColumnHint(null);
        } else {
          showToast("No matching values found for this query.", "warning");
        }
      } else {
        showToast("No data found for this query.", "error");
      }

      onApplyFilter?.(queryText.trim());
      setMode(MODE.PILL);
    } catch (error) {
      console.error("AI Smart Filter apply failed:", error);
      showToast("Something went wrong. Please try again.", "error");
    } finally {
      setIsApplying(false);
    }
  };

  const closePanel = () => {
    setMode(queryText.trim() ? MODE.PILL : MODE.ICON);
  };

  const handleClearQuery = () => {
  setQueryText("");
  setSelectedColumnHint(null);

  if (isStoreCapacityTable) {
    // Clear Style Color ID / article filter
    onClearColumnFilter?.("article", []);

    // Restore original article-store-level table data
    onResetFilter?.();

    setAppliedColumn(null);
    showToast("Filter reset", "success");
    return;
  }

  if (appliedColumn) {
    onFilterApplied?.(appliedColumn, []);
    setAppliedColumn(null);
    showToast("Filter reset", "success");
  }
    // Remove all applied_filter reference chips on clear.
    onAppliedFilterCleared?.();
};

  return (
    <div className="ai-smart-filter" ref={containerRef}>
      {mode === MODE.ICON && (
        <div className={classes.inventoryDetailsBtnContainer}>
          <Tooltip title="" variant="secondary">
            <div
              className="inventory-details-btn"
              onClick={() => setMode(MODE.PILL)}
              role="button"
            >
              <AiIcon />
              AI Smart Filter
            </div>
          </Tooltip>
        </div>
      )}

      {(mode === MODE.PILL || mode === MODE.PANEL) && (
        <div
          className="ai-smart-filter__pill"
          // When expanding into the full panel, the pill itself isn't shown,
          // but the panel below is `position: absolute`, so it doesn't
          // contribute to `.ai-smart-filter`'s own box size. If the pill
          // were unmounted instead (as it was previously, via a separate
          // `mode === MODE.PILL` conditional), the container would collapse
          // to ~0 size and shift position within the toolbar row, causing
          // the panel (`top: calc(100% + 8px); right: 0;`) to render
          // detached from where the pill visually was. Keeping the pill
          // mounted-but-invisible preserves the container's box so the
          // panel opens directly below the pill's former location.
          style={mode === MODE.PANEL ? { visibility: "hidden" } : undefined}
        >
          <Button
            variant="tertiary"
            size="small"
            icon={<ChevronLeftIcon fontSize="small" />}
            aria-label="Collapse AI Smart Filter"
            onClick={() => setMode(MODE.ICON)}
            className="ai-smart-filter__chevron"
          />
          <span className="ai-smart-filter__pill-icon">
            <AiIcon />
          </span>
          <input
            type="text"
            className="ai-smart-filter__pill-input"
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleApplyFilter();
              }
            }}
            placeholder={placeholder}
          />
          <Button
            variant="tertiary"
            size="small"
            icon={<KeyboardArrowDownIcon fontSize="small" />}
            aria-label="Expand AI Smart Filter"
            onClick={() => setMode(MODE.PANEL)}
            className="ai-smart-filter__chevron"
          />
        </div>
      )}

      {mode === MODE.PANEL && (
        <div className="ai-smart-filter__panel">
          <div className="ai-smart-filter__panel-header">
            <span className="ai-smart-filter__panel-icon">
              <AiIcon />
            </span>
            <div className="ai-smart-filter__panel-titles">
              <div className="ai-smart-filter__panel-title">AI Smart Filter</div>
              <div className="ai-smart-filter__panel-subtitle">{placeholder}</div>
            </div>
            <Button
              variant="tertiary"
              size="small"
              icon={<CloseIcon fontSize="small" />}
              aria-label="Close AI Smart Filter"
              onClick={closePanel}
              className="ai-smart-filter__close"
            />
          </div>

          <TextArea
            className="ai-smart-filter__textarea"
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleApplyFilter();
              }
            }}
            placeholder={placeholder}
            width="100%"
            height="64px"
          />

          {!hideSuggestions && (
            <>
              <div className="ai-smart-filter__suggestions-label">
                <AiIcon /> TRY THESE
              </div>
              <div className="ai-smart-filter__suggestions">
                {suggestionItems.map((item) => (
                  <Chips
                    key={item.label}
                    label={item.label}
                    onClick={() => handleSuggestionClick(item)}
                    className="ai-smart-filter__suggestion-chip"
                  />
                ))}
              </div>
            </>
          )}

          <div className="ai-smart-filter__footer">
            <Button
              variant="tertiary"
              onClick={handleClearQuery}
              disabled={isApplying || (!queryText.trim() && !appliedColumn)}
              className="ai-smart-filter__clear-btn"
            >
              Clear
            </Button>
            <Button
              variant="primary"
              icon={<SendIcon fontSize="small" />}
              onClick={handleApplyFilter}
              disabled={!queryText.trim() || isApplying}
              loading={isApplying}
              className="ai-smart-filter__apply-btn"
            >
              Apply Filter
            </Button>
          </div>
        </div>
      )}

      <Toast
        isOpen={toast.open}
        message={toast.message}
        variant={toast.variant}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        autoHideDuration={3000}
        position="top-right"
      />
    </div>
  );
};

export default AiSmartFilterButton;
