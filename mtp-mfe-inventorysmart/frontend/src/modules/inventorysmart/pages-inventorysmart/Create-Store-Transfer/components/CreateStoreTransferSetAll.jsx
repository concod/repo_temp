import React, { useState } from "react";
import { makeStyles } from "@mui/styles";
import { Panel } from "impact-ui-v3";
import Loader from "core/Utils/Loader/loader";
import Form from "core/Utils/form";
import { tableConfigurationMetaData } from "../../../constants-inventorysmart/stringConstants";

const useStyles = makeStyles(() => ({
  container: {
    padding: "24px",
  },
  section: {
    marginBottom: "32px",
  },
  lastSection: {
    marginBottom: "16px",
    paddingTop: "12px",
  },
  sectionTitle: {
    fontWeight: "bold",
    marginBottom: "16px",
  },
  divider: {
    border: "none",
    borderTop: "1px solid #E0E0E0",
    margin: "0",
  },
}));

function CreateStoreTransferSetAll(props) {
  const {
    open,
    onClose,
    selectedRows,
    setAllOptions,
    agGridInstance,
    tableName,
    filters,
    setCreateStoreTransferSetAll,
    refreshTable,
    displaySnackMessages: showSnackMessage,
    storeTransferConfig,
    uniqueRowIdentifier,
  } = props;
  const classes = useStyles();
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const buildFieldsFromConfig = (fieldsConfig, formFieldOptions) => {
    if (!fieldsConfig) return [];
    return fieldsConfig.map((field) => {
      if (field?.field_type === "dropdown" && formFieldOptions) {
        const optionsKey = formFieldOptions?.[field?.accessor];
        return {
          ...field,
          options: setAllOptions?.[optionsKey] || [],
        };
      }
      return field;
    });
  };

  const strategyFields = storeTransferConfig?.strategyFields
    ? buildFieldsFromConfig(
        storeTransferConfig?.strategyFields,
        storeTransferConfig?.formFieldOptions
      )
    : [];

  const thresholdFields = storeTransferConfig?.thresholdFields || [];
  const productEligibilityFields = storeTransferConfig?.productEligibilityFields || [];

  const handleChange = (data) => {
    setFormData((prevData) => ({
      ...prevData,
      ...data,
    }));
  };

  const handleSubmit = async () => {
    if (Object.keys(formData).length === 0) {
      showSnackMessage("Please fill at least one field", "info", props);
      return;
    }

    try {
      setIsSubmitting(true);

      // Determine if "Select All" is checked
      const checkConfiguration =
        agGridInstance?.current?.api?.checkConfiguration || [];
      const isAllSelected =
        checkConfiguration?.length > 0 &&
        checkConfiguration?.[checkConfiguration.length - 1]?.checkAll;

      let row_update = [];
      let excluded_rows = [];

      if (isAllSelected) {
        const deselectedNodes =
          agGridInstance?.current?.api
            ?.getRenderedNodes()
            ?.filter((node) => !node?.selected) || [];
        excluded_rows = deselectedNodes
          .map((node) => node?.data?.[uniqueRowIdentifier])
          .filter(Boolean);
        row_update = [];
      } else {
        row_update = selectedRows
          .map((row) => row?.[uniqueRowIdentifier])
          .filter(Boolean);
        excluded_rows = [];
      }

      // Build store_transfer attributes array
      const storeTransferAttributes = [];

      if (
        storeTransferConfig?.strategyFields ||
        storeTransferConfig?.thresholdFields
      ) {
        const allFields = [
          ...(storeTransferConfig?.strategyFields || []),
          ...(storeTransferConfig?.thresholdFields || []),
        ];
          if(storeTransferConfig?.productEligibilityFields) {
          allFields.push(...(storeTransferConfig?.productEligibilityFields || []));
        }

        Object.entries(formData).forEach(([fieldName, fieldValue]) => {
          if (fieldValue != null && fieldValue !== "") {
            const fieldConfig = allFields.find(
              (f) => f?.accessor === fieldName
            );

            if (fieldConfig?.extra) {
              let attributeValue = fieldValue;

              if (fieldConfig?.extra?.dataType === "number") {
                attributeValue = Number(fieldValue);
              }

              storeTransferAttributes.push({
                attribute_name: fieldConfig?.extra?.attributeName || fieldName,
                attribute_value: attributeValue,
              });
            }
          }
        });
      }

      const payload = {
        meta: {
          ...tableConfigurationMetaData.meta,
          limit: { limit: 10, page: 1 },
        },
        filters: filters || [],
        excluded_rows,
        row_update,
        store_transfer: [storeTransferAttributes],
        table_name: tableName,
      };

      const response = await setCreateStoreTransferSetAll(payload);

      if (response?.data?.status) {
        showSnackMessage(
          response?.data?.message || "Configuration updated successfully",
          "success",
          props
        );

        if (refreshTable) {
          refreshTable();
        }

        setFormData({});
        onClose();
      }
    } catch (error) {
      showSnackMessage(
        error?.message || "Failed to update configuration",
        "error",
        props
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormData({});
    onClose();
  };

  return (
    <Panel
      anchor="right"
      onClose={handleCancel}
      onPrimaryButtonClick={handleSubmit}
      onSecondaryButtonClick={handleCancel}
      primaryButtonLabel="Apply"
      secondaryButtonLabel="Cancel"
      size="large"
      title="Set all"
      open={open}
      width="600"
    >
      <Loader loader={isSubmitting}>
        <div>
          <div className={classes.section}>
            <h3 className={classes.sectionTitle}>{storeTransferConfig.strategyFieldsLabel ? storeTransferConfig.strategyFieldsLabel : "Strategy"}</h3>
            <Form
              maxFieldsInRow={2}
              handleChange={handleChange}
              fields={strategyFields}
              updateDefaultValue={true}
              defaultValues={{}}
              withPortal={true}
              spacing={3}
            />
          </div>
          <hr className={classes.divider} />
          <div className={classes.lastSection}>
            <h3 className={classes.sectionTitle}>{storeTransferConfig.thresholdFieldsLabel ? storeTransferConfig.thresholdFieldsLabel : "Threshold"}</h3>
            <Form
              maxFieldsInRow={2}
              handleChange={handleChange}
              fields={thresholdFields}
              updateDefaultValue={true}
              defaultValues={{}}
              withPortal={true}
              spacing={3}
            />
          </div>
          {
            storeTransferConfig.productEligibilityFieldsLabel && !props.isStoreToStore && (
              <>
                <hr className={classes.divider} />
                <div className={classes.lastSection}>
                  <h3 className={classes.sectionTitle}>{storeTransferConfig.productEligibilityFieldsLabel}</h3>
                  <Form
                    maxFieldsInRow={2}
                    handleChange={handleChange}
                    fields={productEligibilityFields}
                    updateDefaultValue={true}
                    defaultValues={{}}
                    withPortal={true}
                    spacing={3}
                  />
                </div>
              </>
            )
          }
        </div>
      </Loader>
    </Panel>
  );
}

export default CreateStoreTransferSetAll;
