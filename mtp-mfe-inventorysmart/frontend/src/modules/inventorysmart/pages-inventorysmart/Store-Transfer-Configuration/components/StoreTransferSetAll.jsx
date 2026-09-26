import React, { useState } from "react";
import { makeStyles } from "@mui/styles";
import { Panel, useTranslation } from "impact-ui-v3";
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

function StoreTransferSetAll(props) {
  const { t } = useTranslation();
  const {
    open,
    onClose,
    selectedRows,
    setAllOptions,
    agGridInstance,
    tableName,
    filters,
    setStoreTransferSetAll,
    refreshTable,
    displaySnackMessages: showSnackMessage,
    storeTransferConfig,
  } = props;
  const classes = useStyles();
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const uniqueRowIdentifierKey = props.uniqueRowIdentifierKey;

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
    // Merge new data with existing formData instead of replacing it
    setFormData((prevData) => ({
      ...prevData,
      ...data,
    }));
  };

  const handleSubmit = async () => {
    // Validate that at least one field has been filled
    if (Object.keys(formData).length === 0) {
      showSnackMessage(
        t("inventorysmart.pleaseFillAtLeastOneField"),
        "info",
        props
      );
      return;
    }

    try {
      setIsSubmitting(true);

      // Step 1: Determine if "Select All" is checked in the grid
      const checkConfiguration =
        agGridInstance?.current?.api?.checkConfiguration || [];
      const isAllSelected =
        checkConfiguration?.length > 0 &&
        checkConfiguration?.[checkConfiguration.length - 1]?.checkAll;

      let row_update = [];
      let excluded_rows = [];

      // Step 2: Build row selection arrays based on "Select All" state
      if (isAllSelected) {
        // When "Select All" is checked, send deselected rows as exclusions
        const deselectedNodes = agGridInstance?.current?.api
          ?.getRenderedNodes()
          ?.filter((node) => !node?.selected) || [];
        excluded_rows = deselectedNodes
          .map((node) => node?.data?.[uniqueRowIdentifierKey])
          .filter(Boolean);
        row_update = []; // Empty when applying to all rows
      } else {
        // When "Select All" is not checked, send only selected rows
        row_update = selectedRows
          .map((row) => row?.[uniqueRowIdentifierKey])
          .filter(Boolean);
        excluded_rows = []; // Empty when applying to specific rows
      }

      // Step 3: Build store_transfer attributes array from form data
      const storeTransferAttributes = [];

      if (
        storeTransferConfig?.strategyFields ||
        storeTransferConfig?.thresholdFields
      ) {
        // Combine all field configs (strategy + threshold)
        const allFields = [
          ...(storeTransferConfig?.strategyFields || []),
          ...(storeTransferConfig?.thresholdFields || []),
        ];
        if(storeTransferConfig?.productEligibilityFields) {
          allFields.push(...(storeTransferConfig?.productEligibilityFields || []));
        }
        
        // Map form data to API attributes using config
        Object.entries(formData).forEach(([fieldName, fieldValue]) => {
          if (fieldValue !== undefined && fieldValue !== "") {
            // Find field config by accessor
            const fieldConfig = allFields.find((f) => f?.accessor === fieldName);
            
            if (fieldConfig?.extra) {
              let attributeValue = fieldValue;

              // Convert data type if specified in config
              if (fieldConfig?.extra?.dataType === "number") {
                attributeValue = Number(fieldValue);
              }

              // Push attribute with correct API name and value
              storeTransferAttributes.push({
                attribute_name: fieldConfig?.extra?.attributeName || fieldName,
                attribute_value: attributeValue,
              });
            }
          }
        });
      }

      // Step 4: Build API payload
      const payload = {
        meta: {
          ...tableConfigurationMetaData.meta,
          limit: { limit: 10, page: 1 },
        },
        filters: filters || [],
        excluded_rows, // Rows to exclude when "Select All" is checked
        row_update, // Specific rows to update when "Select All" is not checked
        store_transfer: [storeTransferAttributes], // Attributes to update
        table_name: tableName,
      };

      const response = await setStoreTransferSetAll(payload);

      if (response?.data?.status) {
        showSnackMessage(
          response?.data?.message ||
            t("inventorysmart.storeTransferConfigurationUpdatedSuccessfully"),
          "success",
          props
        );

        // Refresh the table to show updated data
        if (refreshTable) {
          refreshTable();
        }

        // Reset form and close panel
        setFormData({});
        onClose();
      } else {
        showSnackMessage(
          response?.data?.message ||
            t("inventorysmart.failedToUpdateConfiguration"),
          "error",
          props
        );
        setIsSubmitting(false);
        return;
      }
    } catch (error) {
      showSnackMessage(
        error?.message ||
          t("inventorysmart.failedToUpdateStoreTransferConfiguration"),
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
      primaryButtonLabel={t("inventorysmart.apply")}
      secondaryButtonLabel={t("inventorysmart.cancel")}
      size="large"
      title={t("inventorysmart.setAll")}
      open={open}
      width="600"
    >
      <Loader loader={isSubmitting}>
        <div className={classes.container}>
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
            storeTransferConfig.productEligibilityFieldsLabel && (
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

export default StoreTransferSetAll;
