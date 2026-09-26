import React, { useEffect, useState } from "react";
import { Input, Panel, useTranslation } from "impact-ui-v3";
import { useCreateRuleFlowStyles } from "./useCreateRuleFlowStyles";

const EMPTY_SET_ALL_VALUES = {
  lead_time: "",
  min_transfer_quantity: "",
  source_priority: "",
};

const INTEGER_INPUT_PATTERN = /^\d*$/;
const BLOCKED_INTEGER_KEYS = new Set(["-", ".", "e", "E", "+"]);

const hasEnteredValue = (values) =>
  Object.values(values).some((value) => String(value ?? "").trim() !== "");

const SetAllPanel = ({ open, onClose, onApply, isApplying = false }) => {
  const classes = useCreateRuleFlowStyles();
  const { t } = useTranslation();
  const [formValues, setFormValues] = useState(EMPTY_SET_ALL_VALUES);

  useEffect(() => {
    if (open) {
      setFormValues(EMPTY_SET_ALL_VALUES);
    }
  }, [open]);

  const handleIntegerFieldChange = (key, value) => {
    if (!INTEGER_INPUT_PATTERN.test(value)) {
      return;
    }

    setFormValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleCancel = () => {
    if (isApplying) {
      return;
    }
    setFormValues(EMPTY_SET_ALL_VALUES);
    onClose?.();
  };

  const handleApply = async () => {
    if (!hasEnteredValue(formValues) || isApplying) {
      return;
    }
    await onApply?.(formValues);
  };

  const renderField = (key, label) => (
    <div className={classes.setAllField}>
      <Input
        label={label}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        placeholder="Enter"
        value={formValues[key]}
        onChange={(event) => handleIntegerFieldChange(key, event.target.value)}
        onKeyDown={(event) => {
          if (BLOCKED_INTEGER_KEYS.has(event.key)) {
            event.preventDefault();
          }
        }}
        inputProps={{ min: 0, step: 1 }}
        isClearable
      />
    </div>
  );

  return (
    <Panel
      title={t("agGrid.setAll")}
      size="large"
      anchor="right"
      width={600}
      open={open}
      onClose={handleCancel}
      primaryButtonLabel={t("buttons.apply")}
      secondaryButtonLabel={t("buttons.cancel")}
      onPrimaryButtonClick={handleApply}
      onSecondaryButtonClick={handleCancel}
      primaryButtonProps={{
        disabled: !hasEnteredValue(formValues) || isApplying,
      }}
      secondaryButtonProps={{
        disabled: isApplying,
      }}
    >
      <div className={classes.setAllPanelBody}>
        <div className={classes.setAllFieldsRow}>
          {renderField(
            "lead_time",
            t("inventorysmart.dcTransferRule.setAll.leadTime")
          )}
          {renderField(
            "min_transfer_quantity",
            t("inventorysmart.dcTransferRule.setAll.minTransferQuantity")
          )}
        </div>
        {renderField(
          "source_priority",
          t("inventorysmart.dcTransferRule.setAll.sourcePriority")
        )}
      </div>
    </Panel>
  );
};

export default SetAllPanel;
