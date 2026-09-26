import React, { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
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
import { getViewPackConfiguration } from "modules/inventorysmart/services-inventorysmart/Finalize/new-flow-store-view-services";
import { CAPPED_WARNING_MSG } from "../constants/allocationEditConstants";
import { buildPackHelperRows, toPackConfigMap } from "../utils/packHelperUtils";
import { isWeekendDate } from "../utils/storeEditUtils";
import {
  buildStoreProductSetAllMapping,
  buildStoreProductSizeSetAllMapping,
} from "../utils/storeProductEditUtils";
import {
  EDIT_BY_PRODUCT,
  EDIT_BY_SIZE,
  SET_ALL_SIZE_COLLAPSED_COUNT,
} from "./constants";

/** Render pack helper rows as multi-line title (size per pack, units per pack). */
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
    flex: `0 1 calc((100% - ${theme.typography.pxToRem(
      12 * (FIELDS_PER_ROW - 1)
    )}) / ${FIELDS_PER_ROW})`,
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

/** Collect fields that have non-empty values from the field values map. */
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

/** Set All modal for store→product: Edit by Product and Edit by Size tabs with DC-grouped inputs. */
const SetAllStoreProductView = ({
  open,
  onClose,
  onApply,
  displaySnack,
  columns = [],
  dcDict = [],
  originalRows = [],
  selectedRows = [],
  editSchema,
  editByDimension = EDIT_BY_PRODUCT,
  sizeColumns = [],
  sizeRows = [],
  sizeDcDict = [],
  sizeArticleMap = {},
  sizeLoading = false,
  loading = false,
  allocationCode,
  originalAllocationCode,
  planStatus,
  planType,
  selectedArticles = [],
}) => {
  const classes = useStyles();
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [packConfigs, setPackConfigs] = useState([]);
  const packConfigMap = useMemo(() => toPackConfigMap(packConfigs), [packConfigs]);
  const articleListKey = (selectedArticles || []).map(String).join(",");

  useEffect(() => {
    if (!open) {
      setPackConfigs([]);
      return;
    }
    if (!allocationCode || !articleListKey) return;
    dispatch(
      getViewPackConfiguration({
        allocation_code: allocationCode,
        article: articleListKey.split(","),
        ignore_allocation_code: getIgnoreAllocationCode(originalAllocationCode),
        plan_status: planStatus,
        plan_type: planType || "",
      })
    )
      .then((res) => {
        setPackConfigs(res?.data?.data?.pack_configurations || []);
      })
      .catch(() => {
        setPackConfigs([]);
      });
    // Narrow deps: other props are stable or only relevant at open time
  }, [open, articleListKey]);

  const mapping = useMemo(
    () =>
      buildStoreProductSetAllMapping({
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
      buildStoreProductSizeSetAllMapping({
        columns: sizeColumns,
        dcDict: sizeDcDict,
        rows: sizeRows,
        sizeArticleMap,
      }),
    [sizeColumns, sizeDcDict, sizeRows, sizeArticleMap]
  );

  const [activeTab, setActiveTab] = useState(EDIT_BY_PRODUCT);
  const [fieldValues, setFieldValues] = useState({});
  const [shipDate, setShipDate] = useState(null);
  const [sizesExpandedByDc, setSizesExpandedByDc] = useState({});

  useEffect(() => {
    if (!open) {
      setActiveTab(EDIT_BY_PRODUCT);
      return;
    }
    setActiveTab(
      editByDimension === EDIT_BY_SIZE ? EDIT_BY_SIZE : EDIT_BY_PRODUCT
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
  }, [open]);

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
      displaySnack?.(
        t("inventorysmart.finalize.setAll.negativeValue"),
        "warning"
      );
      return;
    }
    setFieldValues((prev) => ({ ...prev, [key]: rawValue }));
  };

  const handleFieldBlur = (key) => {
    const field = (mapping?.dcGroups || [])
      .flatMap((dc) => dc.fields)
      .find((f) => f.key === key);
    if (!field || field.maxAbsolute == null) return;
    const current = fieldValues[key];
    if (current === "" || current === null || current === undefined) return;
    if (Number(current) < 0) {
      setFieldValues((prev) => ({ ...prev, [key]: "0" }));
      displaySnack?.(CAPPED_WARNING_MSG, "warning");
      return;
    }
    if (Number(current) > field.maxAbsolute) {
      setFieldValues((prev) => ({
        ...prev,
        [key]: String(field.maxAbsolute),
      }));
      displaySnack?.(CAPPED_WARNING_MSG, "warning");
    }
  };

  /** Cap size field value at its maxAbsolute and warn on negative/overflow. */
  const handleSizeFieldBlur = (key) => {
    const field = (sizeMapping?.dcGroups || [])
      .flatMap((dc) => [...dc.fields, ...dc.sizeFields])
      .find((f) => f.key === key);
    if (!field || field.maxAbsolute == null) return;
    const current = fieldValues[key];
    if (current === "" || current === null || current === undefined) return;
    if (Number(current) < 0) {
      setFieldValues((prev) => ({ ...prev, [key]: "0" }));
      displaySnack?.(CAPPED_WARNING_MSG, "warning");
      return;
    }
    if (Number(current) > field.maxAbsolute) {
      setFieldValues((prev) => ({ ...prev, [key]: String(field.maxAbsolute) }));
      displaySnack?.(CAPPED_WARNING_MSG, "warning");
    }
  };

  const handleApply = () => {
    const productFilled = collectFilledValues(mapping.dcGroups, fieldValues);
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
      fieldValues: productFilled,
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
                label: t("inventorysmart.finalize.setAll.editByProduct"),
                value: EDIT_BY_PRODUCT,
              },
              {
                label: t("inventorysmart.finalize.setAll.editBySize"),
                value: EDIT_BY_SIZE,
              },
            ]}
          />
          {activeTab === EDIT_BY_PRODUCT && (
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
                                  packConfigMap[String(field.packTypeId)],
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
                                        packConfigMap[String(field.packTypeId)],
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

export default SetAllStoreProductView;
