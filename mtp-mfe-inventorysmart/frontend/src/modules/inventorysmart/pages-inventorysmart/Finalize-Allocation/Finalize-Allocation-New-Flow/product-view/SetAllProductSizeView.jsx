import React, { useEffect, useMemo, useState } from "react";
import {
  ButtonGroup,
  Input,
  Panel,
  Tooltip,
  useTranslation,
} from "impact-ui-v3";
import makeStyles from "@mui/styles/makeStyles";
import Loader from "core/Utils/Loader/loader";
import InfoIcon from "assets/impactv3/info_icon.svg";
import { EDIT_BY_SIZE, EDIT_BY_STORE, PACK_COUNT_SIZE } from "./constants";
import {
  ALLOC_QTY_GROUP,
  REMAINING_DC_ATA_GROUP,
  KNOWN_PACK_SUFFIXES,
} from "../constants/allocationEditConstants";
import { getColumnName, matchDcOption } from "../utils/allocationEditUtils";

const SKIP_PACK_SUFFIXES = ["__packs", "__pack_units", "__total"];
const FIELDS_PER_ROW = 3;

const useStyles = makeStyles((theme) => ({
  contentWrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: theme.typography.pxToRem(16),
  },
  body: {
    display: "flex",
    flexDirection: "column",
    gap: theme.typography.pxToRem(16),
    width: "100%",
    boxSizing: "border-box",
  },
  sectionTitle: {
    width: "100%",
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
    width: "100%",
    padding: theme.typography.pxToRem(8),
    boxSizing: "border-box",
    backgroundColor: "#f5f6fa",
    borderRadius: theme.typography.pxToRem(8),
  },
  fieldColumn: {
    flex: `0 1 calc((100% - ${theme.typography.pxToRem(
      12 * (FIELDS_PER_ROW - 1)
    )}) / ${FIELDS_PER_ROW})`,
    minWidth: theme.typography.pxToRem(150),
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
  divider: {
    height: 1,
    width: "100%",
    margin: 0,
    border: "none",
    backgroundColor: "#e0e3eb",
  },
}));

export const buildProductSizeSetAllMapping = ({
  columns = [],
  dcDict = [],
  originalRows = [],
  selectedRows = [],
  editSchema,
} = {}) => {
  const selectedSizes = new Set(
    (selectedRows || [])
      .map((row) => row?.size)
      .filter((size) => size !== null && size !== undefined)
      .map(String)
  );
  const selectedOriginalRows = (originalRows || []).filter((row) =>
    selectedSizes.has(String(row?.size))
  );
  const packCountSelected = selectedSizes.has(PACK_COUNT_SIZE);
  const packLevelFields = editSchema?.pack_level_fields || [];
  const allowsPackTypeId = Boolean(editSchema?.allows_pack_type_id);
  const allocatedGroup = (columns || []).find(
    (column) => getColumnName(column) === ALLOC_QTY_GROUP
  );

  if (!allocatedGroup?.sub_headers) return { dcGroups: [] };

  const dcGroups = [];

  allocatedGroup.sub_headers.forEach((dcHeader) => {
    if (dcHeader?.is_hidden) return;

    const dcOption = matchDcOption(dcDict, dcHeader);
    const fields = [];

    (dcHeader.sub_headers || []).forEach((leaf) => {
      const columnName = getColumnName(leaf);
      if (!columnName || leaf?.is_hidden) return;
      if (SKIP_PACK_SUFFIXES.some((suffix) => columnName.endsWith(suffix)))
        return;

      const suffix = columnName.split("__").pop();
      const isPackLevel = packLevelFields.some((field) =>
        columnName.endsWith(`__${field}`)
      );
      const isPackTypeId =
        allowsPackTypeId &&
        !KNOWN_PACK_SUFFIXES.some((knownSuffix) =>
          columnName.endsWith(knownSuffix)
        );

      if (!isPackLevel && !isPackTypeId) return;
      if (isPackTypeId && !packCountSelected) return;

      const hasValue = (row) =>
        Object.prototype.hasOwnProperty.call(row, columnName) &&
        row[columnName] !== null &&
        row[columnName] !== undefined;

      const presentRows = selectedOriginalRows.filter((row) => {
        if (isPackTypeId && row?.size !== PACK_COUNT_SIZE) return false;
        if (!isPackTypeId && row?.size === PACK_COUNT_SIZE) return false;
        return hasValue(row);
      });

      if (presentRows.length === 0) return;

      const remainingAtaKey = columnName.replace(
        ALLOC_QTY_GROUP,
        REMAINING_DC_ATA_GROUP
      );
      const availableBySize = presentRows.map(
        (row) =>
          (Number(row[columnName]) || 0) +
          (Number(row[remainingAtaKey]) || 0)
      );

      fields.push({
        key: columnName,
        columnName,
        label: leaf.label || suffix,
        type: isPackTypeId ? "pack_type_id" : suffix,
        packTypeId: isPackTypeId ? suffix : null,
        presentOn: presentRows.map((row) => String(row.size)),
        maxAbsolute: isPackTypeId
          ? availableBySize[0]
          : Math.min(...availableBySize),
        presentInSizes: isPackTypeId
          ? selectedOriginalRows
              .filter((row) => row?.size !== PACK_COUNT_SIZE && hasValue(row))
              .map((row) => String(row.size))
          : presentRows.map((row) => String(row.size)),
      });
    });

    if (fields.length === 0) return;

    dcGroups.push({
      dcCode: String(
        dcOption?.value ?? dcOption?.dc_code ?? dcHeader.label
      ),
      dcLabel: dcHeader.label,
      fields,
    });
  });

  return { dcGroups };
};

const SetAllProductSizeView = ({
  open,
  onClose,
  onApply,
  displaySnack,
  columns = [],
  dcDict = [],
  originalRows = [],
  selectedRows = [],
  editSchema,
  editByDimension = EDIT_BY_SIZE,
  // Store tab data (pre-fetched when panel opens)
  storeMapping,
  storeLoading = false,
}) => {
  const classes = useStyles();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(EDIT_BY_SIZE);
  const [fieldValues, setFieldValues] = useState({});
  const [storeFieldValues, setStoreFieldValues] = useState({});

  const mapping = useMemo(
    () =>
      buildProductSizeSetAllMapping({
        columns,
        dcDict,
        originalRows,
        selectedRows,
        editSchema,
      }),
    [columns, dcDict, originalRows, selectedRows, editSchema]
  );

  const storeDcGroups = useMemo(
    () => storeMapping?.dcGroups || [],
    [storeMapping]
  );

  useEffect(() => {
    if (!open) {
      setActiveTab(EDIT_BY_SIZE);
      return;
    }
    setActiveTab(
      editByDimension === EDIT_BY_STORE ? EDIT_BY_STORE : EDIT_BY_SIZE
    );
    const nextValues = {};
    mapping.dcGroups.forEach((dc) => {
      dc.fields.forEach((field) => {
        nextValues[field.key] = "";
      });
    });
    setFieldValues(nextValues);

    const nextStoreValues = {};
    storeDcGroups.forEach((dc) => {
      dc.fields.forEach((field) => {
        nextStoreValues[field.key] = "";
      });
    });
    setStoreFieldValues(nextStoreValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editByDimension, mapping]);

  // Seed store field keys when async fetch finishes after open
  useEffect(() => {
    if (!open) return;
    setStoreFieldValues((prev) => {
      const next = { ...prev };
      let changed = false;
      storeDcGroups.forEach((dc) => {
        dc.fields.forEach((field) => {
          if (next[field.key] === undefined) {
            next[field.key] = "";
            changed = true;
          }
        });
      });
      return changed ? next : prev;
    });
  }, [open, storeDcGroups]);

  const handleValueChange = (key, rawValue) => {
    if (rawValue !== "" && Number(rawValue) < 0) {
      displaySnack?.(
        t("inventorysmart.finalize.setAll.negativeValue"),
        "warning"
      );
      return;
    }
    setFieldValues((previous) => ({ ...previous, [key]: rawValue }));
  };

  const handleStoreValueChange = (key, rawValue) => {
    if (rawValue !== "" && Number(rawValue) < 0) {
      displaySnack?.(
        t("inventorysmart.finalize.setAll.negativeValue"),
        "warning"
      );
      return;
    }
    setStoreFieldValues((previous) => ({ ...previous, [key]: rawValue }));
  };

  const handleFieldBlur = (field) => {
    const currentValue = fieldValues[field.key];
    if (
      currentValue === "" ||
      currentValue === null ||
      currentValue === undefined ||
      Number(currentValue) <= field.maxAbsolute
    )
      return;

    setFieldValues((previous) => ({
      ...previous,
      [field.key]: String(field.maxAbsolute),
    }));
    displaySnack?.(
      t("inventorysmart.finalize.setAll.cappedWarning"),
      "warning"
    );
  };

  const handleStoreFieldBlur = (field) => {
    const currentValue = storeFieldValues[field.key];
    if (
      currentValue === "" ||
      currentValue === null ||
      currentValue === undefined ||
      Number(currentValue) <= field.maxAbsolute
    )
      return;

    setStoreFieldValues((previous) => ({
      ...previous,
      [field.key]: String(field.maxAbsolute),
    }));
    displaySnack?.(
      t("inventorysmart.finalize.setAll.cappedWarning"),
      "warning"
    );
  };

  const handleApply = () => {
    onApply?.({
      activeTab,
      fieldValues,
      mapping,
      storeFieldValues,
      storeMapping,
    });
  };

  const sizeHasValue = Object.values(fieldValues).some(
    (value) => value !== "" && value !== null && value !== undefined
  );
  const storeHasValue = Object.values(storeFieldValues).some(
    (value) => value !== "" && value !== null && value !== undefined
  );
  const hasValue = activeTab === EDIT_BY_SIZE ? sizeHasValue : storeHasValue;
  const isApplyDisabled = !hasValue || storeLoading;

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
      secondaryButtonProps={{ disabled: storeLoading }}
      onSecondaryButtonClick={onClose}
    >
      <Loader loader={storeLoading}>
      <div className={classes.contentWrapper}>
        <ButtonGroup
          selectedOption={activeTab}
          onChange={(_event, value) => {
            if (value) setActiveTab(value);
          }}
          options={[
            {
              label: t("inventorysmart.finalize.setAll.editBySize"),
              value: EDIT_BY_SIZE,
            },
            {
              label: t("inventorysmart.finalize.setAll.editByStore"),
              value: EDIT_BY_STORE,
            },
          ]}
        />

        {activeTab === EDIT_BY_SIZE && (
          <div className={classes.body}>
            <div className={classes.sectionTitle}>
              {t("inventorysmart.finalize.setAll.allocatedQuantity")}
            </div>
            <div className={classes.dcGroupList}>
              {mapping.dcGroups.map((dc, dcIndex) => (
                <React.Fragment key={dc.dcCode}>
                  {dcIndex > 0 && <hr className={classes.divider} />}
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
                              <Tooltip title={field.packTypeId || field.label}>
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
                              onChange={(event) =>
                                handleValueChange(
                                  field.key,
                                  event.target.value
                                )
                              }
                              onBlur={() => handleFieldBlur(field)}
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

        {activeTab === EDIT_BY_STORE && (
          <div className={classes.body}>
            <div className={classes.sectionTitle}>
              {t("inventorysmart.finalize.setAll.allocatedQuantity")}
            </div>
            <div className={classes.dcGroupList}>
              {storeDcGroups.map((dc, dcIndex) => (
                <React.Fragment key={dc.dcCode}>
                  {dcIndex > 0 && <hr className={classes.divider} />}
                  <div className={classes.dcBlock}>
                    <div className={classes.dcLabel}>{dc.dcLabel}</div>
                    <div className={classes.fieldsCard}>
                      {dc.fields.map((field) => (
                        <div key={field.key} className={classes.fieldColumn}>
                          <span className={classes.fieldLabel}>
                            {field.label}
                          </span>
                          <div className={classes.inputWrapper}>
                            <Input
                              type="number"
                              placeholder="0"
                              size="large"
                              inputProps={{ style: { minWidth: 0 } }}
                              value={storeFieldValues[field.key] ?? ""}
                              onChange={(event) =>
                                handleStoreValueChange(
                                  field.key,
                                  event.target.value
                                )
                              }
                              onBlur={() => handleStoreFieldBlur(field)}
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
      </div>
      </Loader>
    </Panel>
  );
};

export default SetAllProductSizeView;
