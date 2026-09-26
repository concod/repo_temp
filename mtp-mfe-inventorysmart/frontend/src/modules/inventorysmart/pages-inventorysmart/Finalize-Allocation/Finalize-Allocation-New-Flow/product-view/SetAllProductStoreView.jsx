import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Panel,
  Input,
  ButtonGroup,
  Tooltip,
  useTranslation,
} from "impact-ui-v3";
import makeStyles from "@mui/styles/makeStyles";
import DatePickerWrapper from "core/commonComponents/filters/DatePicker/DatePicker";
import Loader from "core/Utils/Loader/loader";
import InfoIcon from "assets/impactv3/info_icon.svg";
import IconArrowRight from "assets/impactv3/icon-arrow-right.svg";
import { getIgnoreAllocationCode } from "../../../Create-Allocation/helperFunctions";
import {
  getViewPackConfiguration,
  setPackConfigurations,
} from "modules/inventorysmart/services-inventorysmart/Finalize/new-flow-store-view-services";
import {
  EDIT_BY_STORE,
  EDIT_BY_SIZE,
  PACK_COUNT_SIZE,
  SET_ALL_SIZE_COLLAPSED_COUNT,
} from "./constants";
import {
  ALLOC_QTY_GROUP,
  KNOWN_PACK_SUFFIXES,
  REMAINING_DC_ATA_GROUP,
} from "../constants/allocationEditConstants";
import { getColumnName, matchDcOption } from "../utils/allocationEditUtils";
import { buildPackHelperRows } from "../utils/packHelperUtils";
import { isWeekendDate } from "../utils/storeEditUtils";

const renderPackHelperTitle = (packConfig, fallback, className) => {
  const rows = buildPackHelperRows(packConfig);
  if (!rows) return fallback;
  return (
    <span className={className}>
      {rows.map((row, idx) => (
        <span key={idx}>{row}</span>
      ))}
    </span>
  );
};
const SKIP_PACK_SUFFIXES = ["__packs", "__pack_units", "__total"];
const SKIP_SIZE_PACK_SUFFIXES = [
  "__eaches",
  "__packs",
  "__pack_units",
  "__total",
];
const FIELDS_PER_ROW = 3;

const useStyles = makeStyles((theme) => ({
  contentWrapper: {
    display: "flex",
    flexDirection: "column",
    gap: theme.typography.pxToRem(16),
    alignItems: "center",
  },
  body: {
    display: "flex",
    flexDirection: "column",
    gap: theme.typography.pxToRem(24),
    width: "100%",
    padding: `0 ${theme.typography.pxToRem(16)}`,
    boxSizing: "border-box",
  },
  shipDateField: {
    width: theme.typography.pxToRem(282),
    "& .impact-datepicker-main-container": {
      width: "100%",
    },
    "& .datePicker-input-container": {
      width: "100%",
    },
  },
  divider: {
    height: 1,
    width: "100%",
    backgroundColor: "#E0E3EB",
    border: "none",
    margin: 0,
  },
  sectionTitle: {
    fontFamily: "Manrope",
    fontWeight: 700,
    fontSize: theme.typography.pxToRem(14),
    lineHeight: theme.typography.pxToRem(21),
    color: "#0d152c",
  },
  dcGroupList: {
    display: "flex",
    flexDirection: "column",
    gap: theme.typography.pxToRem(24),
    overflowY: "auto",
    overflowX: "hidden",
    padding: theme.typography.pxToRem(2),
    width: "100%",
  },
  dcBlock: {
    display: "flex",
    flexDirection: "column",
    gap: theme.typography.pxToRem(6),
    width: "100%",
  },
  dcLabel: {
    fontFamily: "Manrope",
    fontWeight: 600,
    fontSize: theme.typography.pxToRem(14),
    lineHeight: theme.typography.pxToRem(21),
    color: "#0d152c",
    textTransform: "capitalize",
  },
  fieldsCard: {
    display: "flex",
    flexWrap: "wrap",
    gap: theme.typography.pxToRem(12),
    alignItems: "flex-start",
    backgroundColor: "#f5f6fa",
    borderRadius: theme.typography.pxToRem(8),
    padding: theme.typography.pxToRem(8),
    width: "100%",
    boxSizing: "border-box",
  },
  fieldColumn: {
    flex: `0 1 calc((100% - ${theme.typography.pxToRem(12 * (FIELDS_PER_ROW - 1))}) / ${FIELDS_PER_ROW})`,
    minWidth: theme.typography.pxToRem(130),
    display: "flex",
    flexDirection: "column",
    gap: theme.typography.pxToRem(6),
  },
  labelRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: theme.typography.pxToRem(6),
  },
  fieldLabel: {
    fontFamily: "Manrope",
    fontWeight: 500,
    fontSize: theme.typography.pxToRem(12),
    lineHeight: theme.typography.pxToRem(16),
    color: "#60697d",
    textTransform: "capitalize",
  },
  infoIcon: {
    width: 16,
    height: 16,
    display: "flex",
    flexShrink: 0,
    "& svg": {
      width: 16,
      height: 16,
      display: "block",
    },
  },
  packTooltipTitle: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    whiteSpace: "nowrap",
    lineHeight: 1.5,
    textAlign: "left",
  },
  inputWrapper: {
    width: "100%",
    "& .impact_inputbox_container": {
      width: "100%",
    },
    "& .MuiInputBase-root": {
      width: "100%",
    },
    "& .MuiInputBase-root input.MuiInputBase-input": {
      minWidth: "0 !important",
    },
  },
  sizeDcContent: {
    display: "flex",
    flexDirection: "column",
    gap: theme.typography.pxToRem(10),
    width: "100%",
  },
  sizeBody: {
    display: "flex",
    flexDirection: "column",
    gap: theme.typography.pxToRem(16),
    width: "100%",
    boxSizing: "border-box",
  },
  packFieldsRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: theme.typography.pxToRem(10),
    alignItems: "flex-start",
    width: "100%",
  },
  sizesBox: {
    display: "flex",
    flexDirection: "column",
    gap: theme.typography.pxToRem(24),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5f6fa",
    borderRadius: theme.typography.pxToRem(8),
    padding: theme.typography.pxToRem(16),
    width: "100%",
    boxSizing: "border-box",
  },
  sizeGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    columnGap: theme.typography.pxToRem(16),
    rowGap: theme.typography.pxToRem(24),
    width: "100%",
  },
  viewAllButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: theme.typography.pxToRem(2),
    padding: 0,
    border: "none",
    background: "none",
    cursor: "pointer",
    fontFamily: "Manrope",
    fontWeight: 500,
    fontSize: theme.typography.pxToRem(14),
    lineHeight: theme.typography.pxToRem(20),
    color: "#4259ee",
    textTransform: "capitalize",
  },
  viewAllIcon: {
    width: 16,
    height: 16,
    display: "flex",
    flexShrink: 0,
    "& svg": {
      width: 16,
      height: 16,
      display: "block",
    },
  },
  viewAllIconDown: {
    transform: "rotate(90deg)",
  },
  viewAllIconUp: {
    transform: "rotate(-90deg)",
  },
}));

const traverseColumnTree = (items, visitFn) => {
  (items || []).forEach((item) => {
    visitFn(item);
    if (item?.sub_headers?.length) traverseColumnTree(item.sub_headers, visitFn);
    if (item?.children?.length) traverseColumnTree(item.children, visitFn);
  });
};

const findShipDateColumn = (columns, otherColumns) => {
  if (!otherColumns || otherColumns.length === 0) return null;
  const otherSet = new Set(otherColumns);
  let found = null;
  traverseColumnTree(columns, (item) => {
    if (found) return;
    const name = getColumnName(item);
    if (!otherSet.has(name)) return;
    if (item.type === "date" || item.type === "datetime") {
      found = {
        column_name: name,
        label: item.label || name,
        type: item.type,
      };
    }
  });
  if (found) return found;

  // Schema listed the column but type was stripped by the formatter.
  traverseColumnTree(columns, (item) => {
    if (found) return;
    const name = getColumnName(item);
    if (!otherSet.has(name)) return;
    found = {
      column_name: name,
      label: item.label || name,
      type: item.type || "date",
    };
  });
  return found;
};

/**
 * Union of eaches + pack-type-id leaves under allocated_quantity, keyed for
 * later verification. Display comes from table config + editSchema; presentOn
 * records which selected original rows actually have the key.
 */
export const buildStoreSetAllMapping = ({
  columns = [],
  dcDict = [],
  originalRows = [],
  selectedRows = [],
  editSchema,
} = {}) => {
  const selectedCodes = (selectedRows || [])
    .map((row) => row?.store_code)
    .filter((code) => code !== undefined && code !== null);
  const selectedOrigRows = (originalRows || []).filter((row) =>
    selectedCodes.includes(row?.store_code)
  );

  const shipDateColumn = findShipDateColumn(
    columns,
    editSchema?.other_columns
  );

  const allocGroup = (columns || []).find(
    (c) => getColumnName(c) === ALLOC_QTY_GROUP
  );
  if (!allocGroup?.sub_headers) {
    return { shipDateColumn, dcGroups: [] };
  }

  const packLevelFields = editSchema?.pack_level_fields || [];
  const allowsPackTypeId = Boolean(editSchema?.allows_pack_type_id);

  const dcGroups = [];

  allocGroup.sub_headers.forEach((dcHeader) => {
    const dcOption = matchDcOption(dcDict, dcHeader);
    const fields = [];

    (dcHeader.sub_headers || []).forEach((leaf) => {
      const colName = getColumnName(leaf);
      if (!colName) return;
      if (SKIP_PACK_SUFFIXES.some((s) => colName.endsWith(s))) return;

      const isPackLevel = packLevelFields.some((f) =>
        colName.endsWith(`__${f}`)
      );
      const isPackTypeId =
        allowsPackTypeId &&
        !KNOWN_PACK_SUFFIXES.some((s) => colName.endsWith(s));

      if (!isPackLevel && !isPackTypeId) return;

      const suffix = colName.split("__").pop();
      const presentRows = selectedOrigRows.filter((row) =>
        Object.prototype.hasOwnProperty.call(row, colName) &&
        row[colName] !== null &&
        row[colName] !== undefined
      );
      const presentOn = presentRows.map((row) => row.store_code);

      // Skip fields not present in any selected store — they'd be silently dropped from the payload
      if (presentOn.length === 0) return;

      // maxAbsolute: floor((sum_alloc + max_remaining) / count)
      let maxAbsolute = null;
      if (presentRows.length > 0) {
        const ataKey = colName.replace(ALLOC_QTY_GROUP, REMAINING_DC_ATA_GROUP);
        const sumAlloc = presentRows.reduce(
          (acc, row) => acc + (Number(row[colName]) || 0),
          0
        );
        const maxRemaining = Math.max(
          ...presentRows.map((row) => Number(row[ataKey]) || 0)
        );
        maxAbsolute = Math.floor(
          (sumAlloc + maxRemaining) / presentRows.length
        );
      }

      fields.push({
        key: colName,
        label: leaf.label || suffix,
        type: isPackTypeId ? "pack_type_id" : suffix,
        packTypeId: isPackTypeId ? suffix : null,
        presentOn,
        maxAbsolute,
      });
    });

    if (fields.length === 0) return;

    dcGroups.push({
      dcLabel: dcHeader.label,
      dcCode: dcOption?.value || dcOption?.dc_code || dcHeader.label,
      fields,
    });
  });

  return { shipDateColumn, dcGroups };
};

/**
 * Build DC-specific pack IDs and sizes by checking which allocated_quantity
 * columns are present and non-null in the aggregated size rows.
 *
 * maxAbsolute uses size_store_map to divide capacity across editable
 * store-size splits:
 *   floor((alloc + remaining) / stores.length)
 *
 * - Pack type ID: alloc+remaining from Pack Count row; stores from
 *   size_store_map[dcLabel][packTypeId]
 * - Eaches: alloc+remaining from that size row; stores from
 *   size_store_map[dcLabel][size]
 */
export const buildSizeSetAllMapping = ({
  columns = [],
  dcDict = [],
  rows = [],
  sizeStoreMap = {},
} = {}) => {
  const allocGroup = (columns || []).find(
    (c) => getColumnName(c) === ALLOC_QTY_GROUP
  );
  if (!allocGroup?.sub_headers) {
    return { dcGroups: [] };
  }

  const packCountRow = (rows || []).find((r) => r?.size === PACK_COUNT_SIZE);
  const sizeOnlyRows = (rows || []).filter(
    (r) => r?.size != null && r?.size !== PACK_COUNT_SIZE
  );

  const getStores = (dcLabel, mapKey) => {
    const list = sizeStoreMap?.[dcLabel]?.[mapKey];
    return Array.isArray(list) ? list.map(String) : [];
  };

  const dcGroups = [];

  allocGroup.sub_headers.forEach((dcHeader) => {
    const dcOption = matchDcOption(dcDict, dcHeader);
    const dcCode = dcOption?.value || dcOption?.dc_code || dcHeader.label;
    const dcLabel = dcHeader.label;

    // ── Pack type ID fields (presence verified against Pack Count row) ──
    const fields = [];
    (dcHeader.sub_headers || []).forEach((leaf) => {
      const colName = getColumnName(leaf);
      if (!colName) return;
      if (SKIP_SIZE_PACK_SUFFIXES.some((s) => colName.endsWith(s))) return;

      const suffix = colName.split("__").pop();
      const ataKey = colName.replace(ALLOC_QTY_GROUP, REMAINING_DC_ATA_GROUP);

      if (
        !packCountRow ||
        !Object.prototype.hasOwnProperty.call(packCountRow, colName) ||
        packCountRow[colName] === null ||
        packCountRow[colName] === undefined
      )
        return;

      const stores = getStores(dcLabel, suffix);
      if (stores.length === 0) return;

      const totalAvailable =
        (Number(packCountRow[colName]) || 0) +
        (Number(packCountRow[ataKey]) || 0);
      const maxAbsolute = Math.floor(totalAvailable / stores.length);

      fields.push({
        key: colName,
        label: leaf.label || suffix,
        type: "pack_type_id",
        packTypeId: suffix,
        stores,
        maxAbsolute,
      });
    });

    // ── Eaches fields: one entry per size row with a UNIQUE key per size ──
    const eachesCol = `${ALLOC_QTY_GROUP}__${dcLabel}__eaches`;
    const ataEachesCol = eachesCol.replace(
      ALLOC_QTY_GROUP,
      REMAINING_DC_ATA_GROUP
    );

    const sizeFields = [];
    sizeOnlyRows.forEach((r) => {
      if (
        !Object.prototype.hasOwnProperty.call(r, eachesCol) ||
        r[eachesCol] === null ||
        r[eachesCol] === undefined
      )
        return;

      const size = String(r.size);
      const stores = getStores(dcLabel, size);
      if (stores.length === 0) return;

      const totalAvailable =
        (Number(r[eachesCol]) || 0) + (Number(r[ataEachesCol]) || 0);
      const maxAbsolute = Math.floor(totalAvailable / stores.length);

      sizeFields.push({
        key: `${eachesCol}__${size}`,
        colName: eachesCol,
        label: size,
        size,
        type: "eaches",
        stores,
        maxAbsolute,
      });
    });

    if (fields.length === 0 && sizeFields.length === 0) return;

    dcGroups.push({ dcLabel, dcCode, fields, sizeFields });
  });

  return { dcGroups };
};

const collectFilledValues = (groups, fieldValues, fieldKey = "fields") => {
  const filled = {};
  (groups || []).forEach((dc) => {
    (dc[fieldKey] || []).forEach((field) => {
      const value = fieldValues[field.key];
      if (value === "" || value === null || value === undefined) return;
      filled[field.key] = value;
    });
  });
  return filled;
};

const SetAllProductStoreView = ({
  open,
  onClose,
  onApply,
  displaySnack,
  columns = [],
  dcDict = [],
  originalRows = [],
  selectedRows = [],
  editSchema,
  editByDimension = EDIT_BY_STORE,
  sizeColumns = [],
  sizeRows = [],
  sizeDcDict = [],
  sizeStoreMap = {},
  sizeLoading = false,
  loading = false,
  // API params needed to fetch pack config when not yet in Redux
  allocationCode,
  originalAllocationCode,
  planStatus,
  planType,
  selectedArticle,
  displayArticle,
}) => {
  const classes = useStyles();
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const packConfigurations = useSelector(
    (store) =>
      store.inventorysmartReducer?.inventorySmartNewFlowStoreViewService
        ?.packConfigurations
  );
  const packConfigMap = useMemo(
    () =>
      packConfigurations
        ? Object.fromEntries(packConfigurations.map((c) => [c.pack_type_id, c]))
        : {},
    [packConfigurations]
  );

  // Fetch pack configurations when the modal opens if not already in Redux
  useEffect(() => {
    if (!open || packConfigurations !== null || !allocationCode) return;
    const payload = {
      allocation_code: allocationCode,
      article: selectedArticle || displayArticle,
      ignore_allocation_code: getIgnoreAllocationCode(originalAllocationCode),
      plan_status: planStatus,
      plan_type: planType || "",
    };
    dispatch(getViewPackConfiguration(payload))
      .then((res) => {
        const configs = res?.data?.data?.pack_configurations || [];
        dispatch(setPackConfigurations(configs));
      })
      .catch(() => {
        // non-fatal: tooltips fall back to pack type ID text
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const mapping = useMemo(
    () =>
      buildStoreSetAllMapping({
        columns,
        dcDict,
        originalRows,
        selectedRows,
        editSchema,
      }),
    [columns, dcDict, originalRows, selectedRows, editSchema]
  );

  const sizeMapping = useMemo(
    () =>
      buildSizeSetAllMapping({
        columns: sizeColumns,
        dcDict: sizeDcDict,
        rows: sizeRows,
        sizeStoreMap,
      }),
    [sizeColumns, sizeDcDict, sizeRows, sizeStoreMap]
  );

  const [activeTab, setActiveTab] = useState(EDIT_BY_STORE);
  const [fieldValues, setFieldValues] = useState({});
  const [shipDate, setShipDate] = useState(null);
  const [sizesExpandedByDc, setSizesExpandedByDc] = useState({});

  useEffect(() => {
    if (!open) {
      setActiveTab(EDIT_BY_STORE);
      return;
    }
    setActiveTab(
      editByDimension === EDIT_BY_SIZE ? EDIT_BY_SIZE : EDIT_BY_STORE
    );
    setShipDate(null);
    setSizesExpandedByDc({});
    const vals = {};
    mapping.dcGroups.forEach((dc) => {
      dc.fields.forEach((f) => {
        vals[f.key] = "";
      });
    });
    sizeMapping.dcGroups.forEach((dc) => {
      dc.fields.forEach((f) => {
        vals[f.key] = "";
      });
      dc.sizeFields.forEach((f) => {
        vals[f.key] = "";
      });
    });
    setFieldValues(vals);
    // Reset only when the panel opens — mapping is rebuilt from original refs
    // at that moment. Including mapping would wipe in-progress edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Size fetch finishes after open. Seed missing keys without wiping typed values.
  useEffect(() => {
    if (!open) return;
    setFieldValues((prev) => {
      const next = { ...prev };
      let changed = false;
      sizeMapping.dcGroups.forEach((dc) => {
        dc.fields.concat(dc.sizeFields).forEach((f) => {
          if (next[f.key] === undefined) {
            next[f.key] = "";
            changed = true;
          }
        });
      });
      return changed ? next : prev;
    });
  }, [open, sizeMapping]);

  const handleValueChange = (key, rawValue) => {
    if (rawValue !== "" && Number(rawValue) < 0) {
      displaySnack?.(t("inventorysmart.finalize.setAll.negativeValue"), "warning");
      return;
    }
    setFieldValues((prev) => ({ ...prev, [key]: rawValue }));
  };

  // Cap value at maxAbsolute on blur and show a single warning if capped
  const handleFieldBlur = (key) => {
    const field = (mapping?.dcGroups || [])
      .flatMap((dc) => dc.fields)
      .find((f) => f.key === key);
    if (!field || field.maxAbsolute == null) return;
    const current = fieldValues[key];
    if (current === "" || current === null || current === undefined) return;
    if (Number(current) > field.maxAbsolute) {
      setFieldValues((prev) => ({
        ...prev,
        [key]: String(field.maxAbsolute),
      }));
      displaySnack?.(
        t("inventorysmart.finalize.setAll.cappedWarning"),
        "warning"
      );
    }
  };

  // Same cap-on-blur for size tab inputs.
  // Pack type ID fields: single maxAbsolute from Pack Count row.
  // Eaches fields: each size now has its own unique key and maxAbsolute.
  const handleSizeFieldBlur = (key) => {
    const field = (sizeMapping?.dcGroups || [])
      .flatMap((dc) => [...dc.fields, ...dc.sizeFields])
      .find((f) => f.key === key);
    if (!field || field.maxAbsolute == null) return;
    const current = fieldValues[key];
    if (current === "" || current === null || current === undefined) return;
    if (Number(current) > field.maxAbsolute) {
      setFieldValues((prev) => ({ ...prev, [key]: String(field.maxAbsolute) }));
      displaySnack?.(
        t("inventorysmart.finalize.setAll.cappedWarning"),
        "warning"
      );
    }
  };

  const handleApply = () => {
    const storeFilled = collectFilledValues(mapping.dcGroups, fieldValues);
    const sizePackFilled = collectFilledValues(
      sizeMapping.dcGroups,
      fieldValues
    );
    const sizeFilled = collectFilledValues(
      sizeMapping.dcGroups,
      fieldValues,
      "sizeFields"
    );
    onApply?.({
      shipDate,
      fieldValues: storeFilled,
      mapping,
      sizeFieldValues: { ...sizePackFilled, ...sizeFilled },
      sizeMapping,
      activeTab,
    });
  };

  const hasFieldValue = Object.values(fieldValues).some(
    (v) => v !== "" && v !== null && v !== undefined
  );
  const isApplyDisabled =
    (!shipDate && !hasFieldValue) ||
    loading ||
    (activeTab === EDIT_BY_SIZE && sizeLoading);

  return (
    <Panel
      open={open}
      onClose={onClose}
      anchor="right"
      title={t("inventorysmart.finalize.setAll.title")}
      width={593}
      primaryButtonLabel={t("inventorysmart.apply")}
      primaryButtonProps={{ disabled: isApplyDisabled }}
      onPrimaryButtonClick={handleApply}
      secondaryButtonLabel={t("inventorysmart.cancel")}
      secondaryButtonProps={{ disabled: loading || sizeLoading }}
      onSecondaryButtonClick={onClose}
    >
      <Loader loader={loading || sizeLoading}>
      <div className={classes.contentWrapper}>
        <ButtonGroup
          selectedOption={activeTab}
          onChange={(_e, val) => {
            if (val) setActiveTab(val);
          }}
          options={[
            {
              label: t("inventorysmart.finalize.setAll.editByStore"),
              value: EDIT_BY_STORE,
            },
            {
              label: t("inventorysmart.finalize.setAll.editBySize"),
              value: EDIT_BY_SIZE,
            },
          ]}
        />
        {activeTab === EDIT_BY_STORE && (
          <div className={classes.body}>
            {mapping.shipDateColumn && (
              <div className={classes.shipDateField}>
                <DatePickerWrapper
                  label={
                    mapping.shipDateColumn.label ||
                    t("inventorysmart.finalize.setAll.shipDate")
                  }
                  placeholder={t("inventorysmart.finalize.setAll.select")}
                  selectedDate={shipDate}
                  disablePast
                  withPortal
                  labelOrientation="top"
                  isOutsideRange={isWeekendDate}
                  onPrimaryButtonClick={(date) => setShipDate(date || null)}
                />
              </div>
            )}
            {mapping.shipDateColumn && <hr className={classes.divider} />}
            <div className={classes.sectionTitle}>
              {t("inventorysmart.finalize.setAll.allocatedQuantity")}
            </div>
            <div className={classes.dcGroupList}>
              {mapping.dcGroups.map((dc, dcIdx) => (
                <React.Fragment key={dc.dcCode}>
                  {dcIdx > 0 && <hr className={classes.divider} />}
                  <div className={classes.dcBlock}>
                    <div className={classes.dcLabel}>{dc.dcLabel}</div>
                    <div className={classes.fieldsCard}>
                      {dc.fields.map((field) => (
                        <div key={field.key} className={classes.fieldColumn}>
                          <div className={classes.labelRow}>
                            <span className={classes.fieldLabel}>
                              {field.label}
                            </span>
                            {field.type === "pack_type_id" && (
                              <Tooltip
                                title={renderPackHelperTitle(
                                  packConfigMap[field.packTypeId],
                                  field.packTypeId || field.label,
                                  classes.packTooltipTitle
                                )}
                                variant="tertiary"
                              >
                                <span className={classes.infoIcon}>
                                  <InfoIcon />
                                </span>
                              </Tooltip>
                            )}
                          </div>
                          <div className={classes.inputWrapper}>
                            <Input
                              type="number"
                              placeholder="0"
                              size="large"
                              inputProps={{ style: { minWidth: 0 } }}
                              value={fieldValues[field.key] ?? ""}
                              onChange={(e) =>
                                handleValueChange(field.key, e.target.value)
                              }
                              onBlur={() => handleFieldBlur(field.key)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        )}
        {activeTab === EDIT_BY_SIZE && (
          <div className={classes.sizeBody}>
              <div className={classes.sectionTitle}>
                {t("inventorysmart.finalize.setAll.allocatedQuantity")}
              </div>
              <div className={classes.dcGroupList}>
                {sizeMapping.dcGroups.map((dc, dcIdx) => {
                  const isExpanded = Boolean(sizesExpandedByDc[dc.dcCode]);
                  const visibleSizes = isExpanded
                    ? dc.sizeFields
                    : dc.sizeFields.slice(0, SET_ALL_SIZE_COLLAPSED_COUNT);
                  const showToggle =
                    dc.sizeFields.length > SET_ALL_SIZE_COLLAPSED_COUNT;

                  return (
                    <React.Fragment key={dc.dcCode}>
                      {dcIdx > 0 && <hr className={classes.divider} />}
                      <div className={classes.dcBlock}>
                        <div className={classes.dcLabel}>{dc.dcLabel}</div>
                        <div className={classes.sizeDcContent}>
                        {dc.fields.length > 0 && (
                          <div className={classes.packFieldsRow}>
                            {dc.fields.map((field) => (
                              <div
                                key={field.key}
                                className={classes.fieldColumn}
                              >
                                <div className={classes.labelRow}>
                                  <span className={classes.fieldLabel}>
                                    {field.label}
                                  </span>
                                  <Tooltip
                                    title={renderPackHelperTitle(
                                      packConfigMap[field.packTypeId],
                                      field.packTypeId || field.label,
                                      classes.packTooltipTitle
                                    )}
                                    variant="tertiary"
                                  >
                                    <span className={classes.infoIcon}>
                                      <InfoIcon />
                                    </span>
                                  </Tooltip>
                                </div>
                                <div className={classes.inputWrapper}>
                                  <Input
                                    type="number"
                                    placeholder="0"
                                    size="large"
                                    inputProps={{ style: { minWidth: 0 } }}
                                    value={fieldValues[field.key] ?? ""}
                                    onChange={(e) =>
                                      handleValueChange(
                                        field.key,
                                        e.target.value
                                      )
                                    }
                                    onBlur={() =>
                                      handleSizeFieldBlur(field.key)
                                    }
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {dc.sizeFields.length > 0 && (
                          <div className={classes.sizesBox}>
                            <div className={classes.sizeGrid}>
                              {visibleSizes.map((field) => (
                                <div
                                  key={field.key}
                                  className={classes.fieldColumn}
                                >
                                  <div className={classes.labelRow}>
                                    <span className={classes.fieldLabel}>
                                      {field.label}
                                    </span>
                                  </div>
                                  <div className={classes.inputWrapper}>
                                    <Input
                                      type="number"
                                      placeholder="0"
                                      size="large"
                                      inputProps={{ style: { minWidth: 0 } }}
                                      value={fieldValues[field.key] ?? ""}
                                      onChange={(e) =>
                                        handleValueChange(
                                          field.key,
                                          e.target.value
                                        )
                                      }
                                      onBlur={() =>
                                        handleSizeFieldBlur(field.key)
                                      }
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                            {showToggle && (
                              <button
                                type="button"
                                className={classes.viewAllButton}
                                onClick={() =>
                                  setSizesExpandedByDc((prev) => ({
                                    ...prev,
                                    [dc.dcCode]: !prev[dc.dcCode],
                                  }))
                                }
                              >
                                <span>
                                  {isExpanded
                                    ? t(
                                        "inventorysmart.finalize.setAll.viewLess"
                                      )
                                    : t(
                                        "inventorysmart.finalize.setAll.viewAll"
                                      )}
                                </span>
                                <span
                                  className={`${classes.viewAllIcon} ${
                                    isExpanded
                                      ? classes.viewAllIconUp
                                      : classes.viewAllIconDown
                                  }`}
                                >
                                  <IconArrowRight />
                                </span>
                              </button>
                            )}
                          </div>
                        )}
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
        )}
      </div>
      </Loader>
    </Panel>
  );
};

export default SetAllProductStoreView;
