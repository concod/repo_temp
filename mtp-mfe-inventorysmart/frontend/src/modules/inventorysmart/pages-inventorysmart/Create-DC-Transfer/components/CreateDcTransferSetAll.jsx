import React, { useState } from "react";
import { Input, Panel, useTranslation } from "impact-ui-v3";
import Loader from "core/Utils/Loader/loader";
import Form from "core/Utils/form";
import globalStyles from "core/Styles/globalStyles";

const INTEGER_INPUT_PATTERN = /^\d*$/;
const BLOCKED_INTEGER_KEYS = new Set(["-", ".", "e", "E", "+"]);

const hasEnteredValue = (formData) =>
  Object.values(formData).some(
    (value) =>
      value !== undefined &&
      value !== null &&
      String(value).trim() !== "" &&
      !(Array.isArray(value) && value.length === 0)
  );

const CreateDcTransferSetAll = (props) => {
  const { t } = useTranslation();
  const globalClasses = globalStyles();
  const {
    open,
    onClose,
    ruleOptions,
    applyDCTransferConfigurationSetAll,
    displaySnackMessages,
    buildPayload,
    refreshTable,
  } = props;
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const ruleField = {
    label: t("inventorysmart.dcTransfer.setAll.transferRule"),
    accessor: "rule_id",
    field_type: "list",
    options: ruleOptions || [],
    isSearchable: true,
  };

  const handleChange = (data) => {
    setFormData((prevData) => ({
      ...prevData,
      ...data,
    }));
  };

  const handleIntegerFieldChange = (accessor, value) => {
    if (!INTEGER_INPUT_PATTERN.test(value)) {
      return;
    }
    setFormData((prevData) => ({
      ...prevData,
      [accessor]: value,
    }));
  };

  const handleCancel = () => {
    if (isSubmitting) {
      return;
    }
    setFormData({});
    onClose?.();
  };

  const handleSubmit = async () => {
    if (!hasEnteredValue(formData)) {
      displaySnackMessages(
        t("inventorysmart.pleaseFillAtLeastOneField"),
        "info",
        props
      );
      return;
    }

    const payload = buildPayload(formData);
    if (!payload?.update_attributes?.length) {
      displaySnackMessages(
        t("inventorysmart.pleaseFillAtLeastOneField"),
        "info",
        props
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await applyDCTransferConfigurationSetAll(payload);

      if (response?.data?.status) {
        displaySnackMessages(
          response?.data?.message || "DC configurations updated successfully",
          "success",
          props
        );
        setFormData({});
        onClose?.();
        refreshTable?.();
      } else {
        displaySnackMessages(
          response?.data?.message || t("inventorysmart.failedToUpdateConfiguration"),
          "error",
          props
        );
      }
    } catch (error) {
      const errObj = error?.response?.data;
      displaySnackMessages(
        errObj?.show_message
          ? errObj?.message
          : t("inventorysmart.failedToUpdateConfiguration"),
        "error",
        props
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldClassName = `${globalClasses.flex} ${globalClasses.fullWidth}`;

  const renderIntegerField = (accessor, label, placeholder) => (
    <div className={fieldClassName}>
      <Input
        label={label}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        placeholder={placeholder}
        value={formData[accessor] ?? ""}
        onChange={(event) =>
          handleIntegerFieldChange(accessor, event.target.value)
        }
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
      anchor="right"
      onClose={handleCancel}
      onPrimaryButtonClick={handleSubmit}
      onSecondaryButtonClick={handleCancel}
      primaryButtonLabel={t("inventorysmart.apply")}
      secondaryButtonLabel={t("inventorysmart.cancel")}
      size="large"
      title={t("inventorysmart.setAll")}
      open={open}
      width="600"
      primaryButtonProps={{
        disabled: !hasEnteredValue(formData) || isSubmitting,
      }}
      secondaryButtonProps={{
        disabled: isSubmitting,
      }}
    >
      <Loader loader={isSubmitting}>
        <div
          className={`${globalClasses.flexRow} ${globalClasses.gap_16} ${globalClasses.fullWidth} ${globalClasses.marginBottom_16}`}
        >
          <div className={fieldClassName}>
            <Form
              maxFieldsInRow={1}
              handleChange={handleChange}
              fields={[ruleField]}
              updateDefaultValue={true}
              defaultValues={{}}
              withPortal={true}
              spacing={3}
            />
          </div>
          {renderIntegerField(
            "source_dc_inventory_threshold",
            t("inventorysmart.dcTransfer.setAll.sourceDcInventoryThreshold"),
            t("inventorysmart.dcTransfer.setAll.enterUnits")
          )}
        </div>
        {renderIntegerField(
          "destination_dc_po_window",
          t("inventorysmart.dcTransfer.setAll.destinationDcPoWindow"),
          t("inventorysmart.dcTransfer.setAll.enterWeeks")
        )}
      </Loader>
    </Panel>
  );
};

export default CreateDcTransferSetAll;
