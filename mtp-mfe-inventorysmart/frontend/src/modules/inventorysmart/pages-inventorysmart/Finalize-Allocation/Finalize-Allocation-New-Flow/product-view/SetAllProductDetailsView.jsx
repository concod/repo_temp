import React, { useState, useEffect } from "react";
import { Panel, Switch, Input } from "impact-ui-v3";
import Loader from "core/Utils/Loader/loader";
import makeStyles from "@mui/styles/makeStyles";

const useStyles = makeStyles((theme) => ({
  contentWrapper: {
    display: "flex",
    flexDirection: "column",
    gap: theme.typography.pxToRem(16),
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
  },
  dcLabel: {
    fontFamily: "Manrope",
    fontWeight: 600,
    fontSize: theme.typography.pxToRem(14),
    lineHeight: theme.typography.pxToRem(21),
    color: "#0d152c",
    marginBottom: theme.typography.pxToRem(6),
  },
  fieldsRow: {
    display: "flex",
    gap: theme.typography.pxToRem(12),
  },
  fieldCard: {
    flex: "1 1 0",
    minWidth: 0,
    display: "flex",
    gap: theme.typography.pxToRem(12),
    alignItems: "flex-end",
    backgroundColor: "#f5f6fa",
    borderRadius: theme.typography.pxToRem(8),
    padding: theme.typography.pxToRem(8),
  },
  fieldColumn: {
    flex: "1 1 0",
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: theme.typography.pxToRem(6),
  },
  fieldLabel: {
    fontFamily: "Manrope",
    fontWeight: 500,
    fontSize: theme.typography.pxToRem(12),
    lineHeight: theme.typography.pxToRem(16),
    color: "#60697d",
  },
  inputWrapper: {
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
  switchGroup: {
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    gap: theme.typography.pxToRem(6),
  },
  percentLabel: {
    fontFamily: "Manrope",
    fontWeight: 500,
    fontSize: theme.typography.pxToRem(14),
    lineHeight: theme.typography.pxToRem(20),
    color: "#60697d",
  },
  divider: {
    height: 1,
    backgroundColor: "#E0E3EB",
    border: "none",
    margin: 0,
  },
}));

/**
 * Set All side-panel for the product-details grain of the new finalize flow.
 * Presentational only: the parent supplies `dcConfigs` (built by
 * `buildProductDetailsSetAllDcConfigs`) and receives a flat
 * `pack_level_updates` array back through `onApply`.
 *
 * @param {Object}   props
 * @param {boolean}  props.open
 * @param {Function} props.onClose
 * @param {Function} props.onApply        - receives Array<{ dc_code, pack_type, is_percentage, value }>
 * @param {Function} props.displaySnack   - (message, variant) => void
 * @param {Array}    props.dcConfigs      - [{ dcLabel, dcCode, fields: [{ key, label, type, maxAbsolute, maxPercentage }] }]
 * @param {boolean}  props.loading        - shows a loader overlay when true
 */
const SetAllProductDetailsView = ({
  open,
  onClose,
  onApply,
  displaySnack,
  dcConfigs = [],
  loading = false,
}) => {
  const classes = useStyles();

  const buildInitialValues = () => {
    const vals = {};
    dcConfigs.forEach((dc) => {
      dc.fields.forEach((f) => {
        vals[f.key] = { value: "", isPercentage: false };
      });
    });
    return vals;
  };

  const [fieldValues, setFieldValues] = useState({});

  useEffect(() => {
    if (open) {
      setFieldValues(buildInitialValues());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleValueChange = (key, rawValue) => {
    const numVal = Number(rawValue);
    if (numVal < 0) {
      displaySnack?.("Value cannot be negative", "warning");
      return;
    }

    const field = dcConfigs
      .flatMap((dc) => dc.fields)
      .find((f) => f.key === key);
    const isPercentage = fieldValues[key]?.isPercentage;
    const max = isPercentage ? field?.maxPercentage : field?.maxAbsolute;

    if (max !== undefined && max !== null && numVal > max) {
      displaySnack?.(
        isPercentage
          ? `Percentage cannot exceed ${max.toFixed(2)}%`
          : `Value cannot exceed ${max}`,
        "warning"
      );
      setFieldValues((prev) => ({
        ...prev,
        [key]: { ...prev[key], value: max },
      }));
      return;
    }

    setFieldValues((prev) => ({
      ...prev,
      [key]: { ...prev[key], value: rawValue },
    }));
  };

  const handlePercentageToggle = (key, checked) => {
    setFieldValues((prev) => ({
      ...prev,
      [key]: { ...prev[key], isPercentage: checked, value: "" },
    }));
  };

  const handleApply = () => {
    const packLevelUpdates = [];

    dcConfigs.forEach((dc) => {
      dc.fields.forEach((field) => {
        const entry = fieldValues[field.key];
        if (!entry || entry.value === "" || entry.value === null) return;

        packLevelUpdates.push({
          dc_code: dc.dcCode,
          pack_type: field.type,
          is_percentage: entry.isPercentage,
          value: Number(entry.value),
        });
      });
    });

    onApply(packLevelUpdates);
  };

  const isApplyDisabled = () => {
    return !Object.values(fieldValues).some(
      (v) => v.value !== "" && v.value !== null && v.value !== undefined
    );
  };

  return (
    <Panel
      open={open}
      onClose={onClose}
      anchor="right"
      title="Set all"
      size="small"
      primaryButtonLabel="Apply"
      primaryButtonProps={{ disabled: isApplyDisabled() || loading }}
      onPrimaryButtonClick={handleApply}
      secondaryButtonLabel="Cancel"
      secondaryButtonProps={{ disabled: loading }}
      onSecondaryButtonClick={onClose}
    >
      <Loader loader={loading}>
        <div className={classes.contentWrapper}>
          <div className={classes.sectionTitle}>Allocated Quantity</div>
          <div className={classes.dcGroupList}>
            {dcConfigs.map((dc, dcIdx) => (
              <React.Fragment key={dc.dcCode}>
                {dcIdx > 0 && <hr className={classes.divider} />}
                <div>
                  <div className={classes.dcLabel}>{dc.dcLabel}</div>
                  <div className={classes.fieldsRow}>
                    {dc.fields.map((field) => (
                      <div key={field.key} className={classes.fieldCard}>
                        <div className={classes.fieldColumn}>
                          <div className={classes.fieldLabel}>
                            {field.label}
                          </div>
                          <div className={classes.inputWrapper}>
                            <Input
                              type="number"
                              placeholder="0"
                              size="large"
                              inputProps={{ style: { minWidth: 0 } }}
                              value={fieldValues[field.key]?.value ?? ""}
                              onChange={(e) =>
                                handleValueChange(field.key, e.target.value)
                              }
                            />
                          </div>
                        </div>
                        <div className={classes.switchGroup}>
                          <Switch
                            value={
                              fieldValues[field.key]?.isPercentage || false
                            }
                            onChange={(e) =>
                              handlePercentageToggle(
                                field.key,
                                e.target.checked
                              )
                            }
                          />
                          <span className={classes.percentLabel}>%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      </Loader>
    </Panel>
  );
};

export default SetAllProductDetailsView;
