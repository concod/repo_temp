import React, { useState, useEffect } from "react";
import Form from "core/Utils/form";
import { addSnack } from "core/actions/snackbarActions";
import { connect } from "react-redux";
import isEmpty from "lodash/isEmpty";
import { ERROR_MESSAGE } from "modules/oms/constants-oms/stringConstants";
import moment from "moment";
import { Panel } from "impact-ui-v3";
import { Typography, Box, Divider } from "@mui/material";

const OffCycleOrderSetAllPopUp = (props) => {
  const [formData, setFormData] = useState({});
  const [setAllFields, setSetAllFields] = useState([]);
  const [formResetKey, setFormResetKey] = useState(0);

  // Helper to check if value is empty (null, undefined, or empty string, but not 0)
  const isFieldEmpty = (value) => {
    return value === null || value === undefined || value === "";
  };

  // Helper to clear specific validation errors for a row
  const clearValidationErrorsForFields = (rowId, fieldsToCheck) => {
    if (props.clearValidationErrors) {
      props.clearValidationErrors(rowId, fieldsToCheck);
    }
  };

  // Extract min/max values from tenant config for percentage fields
  const OFF_CYCLE_SETALL_FIELDS = props.OFFCYCLE_SETALL_FIELDS || [];

  const SERVICE_LEVEL_MIN_VALUE =
    OFF_CYCLE_SETALL_FIELDS?.find(
      (data) => data.accessor === "service_level_pct"
    )?.min_value || 0;

  const SERVICE_LEVEL_MAX_VALUE =
    OFF_CYCLE_SETALL_FIELDS?.find(
      (data) => data.accessor === "service_level_pct"
    )?.max_value || 100;

  const SELL_THROUGH_MIN_VALUE =
    OFF_CYCLE_SETALL_FIELDS?.find(
      (data) => data.accessor === "sell_through_pct"
    )?.min_value || 0;

  const SELL_THROUGH_MAX_VALUE =
    OFF_CYCLE_SETALL_FIELDS?.find(
      (data) => data.accessor === "sell_through_pct"
    )?.max_value || 100;

  // Process Set All field configuration from props
  useEffect(() => {
    if (props.OFFCYCLE_SETALL_FIELDS) {
      // Process fields to add date format
      const processedFields = props.OFFCYCLE_SETALL_FIELDS.map((field) => {
        const processedField = { ...field };

        // Add date format to DateTimeField columns
        if (field.field_type === "DateTimeField" && !field.formatter) {
          processedField.formatter = props.dateFormat;
        }

        return processedField;
      });

      setSetAllFields(processedFields);
    }
  }, [props.OFFCYCLE_SETALL_FIELDS, props.dateFormat]);

  const onCancel = () => {
    props.setShowSetAllModal(false);
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const validateFormData = () => {
    const errors = [];

    // If demand period selection is set, validate related fields
    if (formData.demand_period_selection) {
      if (formData.demand_period_selection === "date_range") {
        if (isFieldEmpty(formData.demand_start_date)) {
          errors.push("Demand Start Date is required");
          return errors;
        }
        if (isFieldEmpty(formData.demand_end_date)) {
          errors.push("Demand End Date is required");
          return errors;
        }

        // Validate minimum 7-day difference for date_range mode
        if (formData.demand_start_date && formData.demand_end_date) {
          const startDate = moment(formData.demand_start_date);
          const endDate = moment(formData.demand_end_date);
          const daysDiff = endDate.diff(startDate, "days");

          if (daysDiff < 6) {
            errors.push(
              "The date range is too short. Minimum difference should be at least one week (7 days)."
            );
            return errors;
          }
        }
      }

      if (formData.demand_period_selection === "twos") {
        if (isFieldEmpty(formData.demand_start_date)) {
          errors.push("Demand Start Date is required");
          return errors;
        }

        if (isFieldEmpty(formData.demand_twos)) {
          errors.push("Demand TWOS is required");
          return errors;
        }

        if (formData.demand_twos < 1) {
          errors.push("Demand TWOS must be at least 1");
          return errors;
        }
      }
    }

    // If buffer stock addition method is set, validate the corresponding field
    if (formData.buffer_stock_addition_method) {
      const selectedField = props?.getBufferStockField(
        formData.buffer_stock_addition_method
      );

      if (
        selectedField === "service_level_pct" &&
        isFieldEmpty(formData.service_level_pct)
      ) {
        errors.push("Service Level% is required");
        return errors;
      }
      if (
        selectedField === "safety_stock_units" &&
        isFieldEmpty(formData.safety_stock_units)
      ) {
        errors.push("Safety Stock Units is required");
        return errors;
      }
      if (
        selectedField === "sell_through_pct" &&
        isFieldEmpty(formData.sell_through_pct)
      ) {
        errors.push("Sell Through% is required");
        return errors;
      }
    }

    // If delivery date is set, validate that it's before demand start date
    if (
      formData.delivery_date &&
      formData.demand_start_date &&
      moment(formData.delivery_date).isAfter(moment(formData.demand_start_date))
    ) {
      errors.push("Delivery date has to be earlier than demand start date");
      return errors;
    }

    return errors;
  };

  const onApply = async () => {
    try {
      let l_selectedNodes = props.agGridInstance.api.getSelectedNodes();
      let selections = l_selectedNodes?.filter((val) => val.displayed);

      if (isEmpty(formData)) {
        displaySnackMessages("Nothing changed", "info");
        return;
      }

      if (selections.length === 0) {
        displaySnackMessages("No rows selected", "warning");
        return;
      }

      // Validate form data
      const validationErrors = validateFormData();
      if (validationErrors.length > 0) {
        displaySnackMessages(`${validationErrors.join("\n")}`, "error");
        return;
      }

      // Cap percentage values to min/max before applying
      if (formData.service_level_pct !== undefined) {
        let value = parseFloat(formData.service_level_pct);
        if (isNaN(value)) {
          value = 0;
        }
        if (value < SERVICE_LEVEL_MIN_VALUE) {
          formData.service_level_pct = SERVICE_LEVEL_MIN_VALUE;
        } else if (value > SERVICE_LEVEL_MAX_VALUE) {
          formData.service_level_pct = SERVICE_LEVEL_MAX_VALUE;
        } else {
          // Round to 2 decimal places for percentage values
          formData.service_level_pct = Math.round(value * 100) / 100;
        }
      }

      if (formData.sell_through_pct !== undefined) {
        let value = parseFloat(formData.sell_through_pct);
        if (isNaN(value)) {
          value = 0;
        }
        if (value < SELL_THROUGH_MIN_VALUE) {
          formData.sell_through_pct = SELL_THROUGH_MIN_VALUE;
        } else if (value > SELL_THROUGH_MAX_VALUE) {
          formData.sell_through_pct = SELL_THROUGH_MAX_VALUE;
        } else {
          // Round to 2 decimal places for percentage values
          formData.sell_through_pct = Math.round(value * 100) / 100;
        }
      }

      selections.forEach((row) => {
        const selected = row.data;
        const fieldsToCheckForErrorClearing = [];

        // Apply Demand Period Selection
        if (formData.demand_period_selection) {
          selected.demand_period_selection = formData.demand_period_selection;
          selected.isEdited = true;
          fieldsToCheckForErrorClearing.push("demand_period_selection");

          // Clear start date and TWOS if not being set in this form
          if (!formData.demand_start_date) {
            selected.demand_start_date = null;
          }

          // Always clear end date when switching modes - it will be recalculated or set below
          selected.demand_end_date = null;
        }

        // Apply Demand Start Date
        if (formData.demand_start_date) {
          const startDate = moment(formData.demand_start_date).format(
            props.dateFormat
          );
          selected.demand_start_date = startDate;
          selected.isEdited = true;
          fieldsToCheckForErrorClearing.push("demand_start_date");

          // If in TWOS mode and we have TWOS value, calculate end date
          if (
            selected.demand_period_selection === "twos" &&
            selected.demand_twos
          ) {
            const endDate = moment(startDate)
              .add(selected.demand_twos * 7 - 1, "days")
              .format(props.dateFormat);
            selected.demand_end_date = endDate;
            fieldsToCheckForErrorClearing.push("demand_end_date");
          }

          // If in date_range mode and we have end date, calculate TWOS
          if (
            selected.demand_period_selection === "date_range" &&
            (formData.demand_end_date || selected.demand_end_date)
          ) {
            const endDateToUse =
              formData.demand_end_date || selected.demand_end_date;
            const endDate = moment(endDateToUse);
            const daysDiff = endDate.diff(moment(startDate), "days");
            const calculatedTwos = Math.round((daysDiff + 1) / 7);
            selected.demand_twos = calculatedTwos;
            fieldsToCheckForErrorClearing.push("demand_twos");
          }
        }

        // Apply Demand TWOS
        if (formData.demand_twos) {
          selected.demand_twos = parseInt(formData.demand_twos);
          selected.isEdited = true;
          fieldsToCheckForErrorClearing.push("demand_twos");

          // Recalculate end date if in TWOS mode and we have start date
          if (
            selected.demand_period_selection === "twos" &&
            selected.demand_start_date
          ) {
            const endDate = moment(selected.demand_start_date)
              .add(formData.demand_twos * 7 - 1, "days")
              .format(props.dateFormat);
            selected.demand_end_date = endDate;
            fieldsToCheckForErrorClearing.push("demand_end_date");
          }
        }

        // Apply Demand End Date (only for date_range mode)
        if (
          formData.demand_end_date &&
          selected.demand_period_selection === "date_range"
        ) {
          const endDate = moment(formData.demand_end_date).format(
            props.dateFormat
          );
          selected.demand_end_date = endDate;
          selected.isEdited = true;
          fieldsToCheckForErrorClearing.push("demand_end_date");

          // Calculate TWOS if we have both start and end dates
          if (selected.demand_start_date) {
            const startDate = moment(selected.demand_start_date);
            const endDateMoment = moment(endDate);
            const daysDiff = endDateMoment.diff(startDate, "days");
            const calculatedTwos = Math.round((daysDiff + 1) / 7);
            selected.demand_twos = calculatedTwos;
            fieldsToCheckForErrorClearing.push("demand_twos");
          }
        }

        // Apply Buffer Stock Addition Method
        if (formData.buffer_stock_addition_method) {
          selected.buffer_stock_addition_method =
            formData.buffer_stock_addition_method;
          selected.isEdited = true;
          fieldsToCheckForErrorClearing.push("buffer_stock_addition_method");

          // Clear other buffer stock fields when method changes
          if (formData.buffer_stock_addition_method !== "service_level_pct") {
            // Keep existing value if not changing
          }
          if (formData.buffer_stock_addition_method !== "safety_stock_units") {
            // Keep existing value if not changing
          }
          if (formData.buffer_stock_addition_method !== "sell_through_pct") {
            // Keep existing value if not changing
          }
        }

        // Apply Service Level % (only if Service Level method is selected)
        const selectedBufferField = props?.getBufferStockField(
          selected.buffer_stock_addition_method
        );

        if (
          formData.service_level_pct &&
          selectedBufferField === "service_level_pct"
        ) {
          selected.service_level_pct = parseFloat(formData.service_level_pct);
          selected.isEdited = true;
          fieldsToCheckForErrorClearing.push("service_level_pct");
        }

        // Apply Safety Stock Units (only if Safety Stock Units method is selected)
        if (
          formData.safety_stock_units &&
          selectedBufferField === "safety_stock_units"
        ) {
          selected.safety_stock_units = parseInt(formData.safety_stock_units);
          selected.isEdited = true;
          fieldsToCheckForErrorClearing.push("safety_stock_units");
        }

        // Apply Sell Through % (only if Sell Through method is selected)
        if (
          formData.sell_through_pct &&
          selectedBufferField === "sell_through_pct"
        ) {
          selected.sell_through_pct = parseFloat(formData.sell_through_pct);
          selected.isEdited = true;
          fieldsToCheckForErrorClearing.push("sell_through_pct");
        }

        // Note: Safety Stock (WOS) is never editable, even if selected as the method

        // Apply Shipment Mode
        if (formData.shipment_mode) {
          selected.shipment_mode = formData.shipment_mode;
          selected.isEdited = true;
          fieldsToCheckForErrorClearing.push("shipment_mode");

          // Update lead time and delivery date based on selected shipment mode
          const shipmentModes = props.shipmentModesData[selected.unique_row_id];
          if (shipmentModes) {
            const selectedMode = shipmentModes.find(
              (mode) => mode.shipment_mode === formData.shipment_mode
            );
            if (selectedMode) {
              selected.lead_time = selectedMode.lead_time;
              fieldsToCheckForErrorClearing.push("lead_time");

              const deliveryDate = moment(selected.order_generation_date).add(
                selectedMode.lead_time,
                "days"
              );
              selected.delivery_date = deliveryDate.format(props.dateFormat);
              fieldsToCheckForErrorClearing.push("delivery_date");

              // Check if delivery date is now valid (before demand start date)
              if (
                selected.demand_start_date &&
                deliveryDate.isBefore(moment(selected.demand_start_date), "day")
              ) {
                fieldsToCheckForErrorClearing.push("demand_start_date");
              }
            }
          }
        }

        // Apply Lead Time
        if (formData.lead_time) {
          selected.lead_time = parseInt(formData.lead_time);
          selected.isEdited = true;
          fieldsToCheckForErrorClearing.push("lead_time");

          // Recalculate delivery date
          if (selected.order_generation_date) {
            const deliveryDate = moment(selected.order_generation_date).add(
              formData.lead_time - 1,
              "days"
            );
            selected.delivery_date = deliveryDate.format(props.dateFormat);
            fieldsToCheckForErrorClearing.push("delivery_date");

            // Check if delivery date is now valid (before demand start date)
            if (
              selected.demand_start_date &&
              deliveryDate.isBefore(moment(selected.demand_start_date), "day")
            ) {
              fieldsToCheckForErrorClearing.push("demand_start_date");
            }
          }
        }

        // Apply Delivery Date
        if (formData.delivery_date) {
          const deliveryDate = moment(formData.delivery_date);
          selected.delivery_date = deliveryDate.format(props.dateFormat);
          selected.isEdited = true;
          fieldsToCheckForErrorClearing.push("delivery_date");

          // Recalculate lead time
          if (selected.order_generation_date) {
            const orderDate = moment(selected.order_generation_date);
            const daysDiff = deliveryDate.diff(orderDate, "days");
            selected.lead_time = daysDiff;
            fieldsToCheckForErrorClearing.push("lead_time");
          }

          // Check if delivery date is now valid (before demand start date)
          if (
            selected.demand_start_date &&
            deliveryDate.isBefore(moment(selected.demand_start_date), "day")
          ) {
            fieldsToCheckForErrorClearing.push("demand_start_date");
          }
        }

        // Clear validation errors for fields that were updated
        if (fieldsToCheckForErrorClearing.length > 0) {
          clearValidationErrorsForFields(
            selected.unique_row_id,
            fieldsToCheckForErrorClearing
          );
        }
      });

      displaySnackMessages("Updated successfully", "success");

      // Refresh the grid
      if (props.agGridInstance?.api) {
        props.agGridInstance.api.redrawRows({ rowNodes: selections });
      }

      props.setShowSetAllModal(false);
    } catch (error) {
      console.error("Error in Set All:", error);
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  const handleChange = (data) => {
    // If demand_period_selection is changing, clear related fields
    if (
      Object.keys(data).includes("demand_period_selection") &&
      !data.demand_period_selection
    ) {
      setFormData((prevFormData) => {
        const newFormData = {
          ...prevFormData,
          ...data,
        };
        delete newFormData.demand_period_selection;
        delete newFormData.demand_start_date;
        delete newFormData.demand_end_date;
        delete newFormData.demand_twos;
        return newFormData;
      });
      setFormResetKey(formResetKey + 1);
      return;
    }

    // If buffer_stock_addition_method is changing, clear related fields
    else if (
      Object.keys(data).includes("buffer_stock_addition_method") &&
      !data.buffer_stock_addition_method
    ) {
      setFormData((prevFormData) => {
        const newFormData = {
          ...prevFormData,
          ...data,
        };
        delete newFormData.buffer_stock_addition_method;
        delete newFormData.service_level_pct;
        delete newFormData.safety_stock_units;
        delete newFormData.sell_through_pct;
        return newFormData;
      });
      setFormResetKey(formResetKey + 1);
      return;
    }

    // Handle mutual exclusivity for Delivery Constraints fields
    else if (
      (Object.keys(data).includes("delivery_date") && !data.delivery_date) ||
      (Object.keys(data).includes("lead_time") && !data.lead_time) ||
      (Object.keys(data).includes("shipment_mode") && !data.shipment_mode)
    ) {
      setFormData((prevFormData) => {
        const newFormData = {
          ...prevFormData,
          ...data,
        };
        delete newFormData.delivery_date;
        delete newFormData.lead_time;
        delete newFormData.shipment_mode;
        return newFormData;
      });
      setFormResetKey(formResetKey + 1);
      return;
    } else {
      setFormData((prevFormData) => ({
        ...prevFormData,
        ...data,
      }));
    }
  };

  /**
   * Get fields by section from API response
   * Sections are defined by the 'section' property in field config from API
   */
  const getFieldsBySection = (sectionName) => {
    const fields = setAllFields.filter(
      (field) => field.section === sectionName
    );

    // Apply dynamic disabled/enabled logic based on current form state
    return fields.map((field) => {
      const enhancedField = { ...field };

      // Demand Constraints section logic
      if (sectionName === "demand_constraints") {
        const demandPeriodSelection = formData.demand_period_selection;

        if (field.accessor === "demand_start_date") {
          enhancedField.isDisabled = !demandPeriodSelection;
          enhancedField.disablePast = true;
        }

        if (field.accessor === "demand_end_date") {
          enhancedField.isDisabled =
            !demandPeriodSelection ||
            demandPeriodSelection === "twos" ||
            (demandPeriodSelection === "date_range" &&
              !formData.demand_start_date);
          enhancedField.disablePast = true;
          enhancedField.shouldDisableDate = (day) => {
            if (formData.demand_start_date) {
              return day.isBefore(
                moment(formData.demand_start_date).add(1, "day"),
                "day"
              );
            }
            return day.isBefore(moment(), "day");
          };
        }

        if (field.accessor === "demand_twos") {
          enhancedField.isDisabled = demandPeriodSelection !== "twos";
        }
      }

      // Buffer Stock Constraints section logic
      if (sectionName === "buffer_stock_constraints") {
        const bufferStockMethod = formData.buffer_stock_addition_method;
        const selectedBufferField = props?.getBufferStockField(
          bufferStockMethod
        );

        if (field.accessor === "service_level_pct") {
          enhancedField.isDisabled =
            selectedBufferField !== "service_level_pct";
        }

        if (field.accessor === "safety_stock_units") {
          enhancedField.isDisabled =
            selectedBufferField !== "safety_stock_units";
        }

        if (field.accessor === "sell_through_pct") {
          enhancedField.isDisabled = selectedBufferField !== "sell_through_pct";
        }
      }

      // Delivery Constraints section logic
      if (sectionName === "delivery_constraints") {
        const hasDeliveryDate =
          formData.delivery_date &&
          formData.delivery_date !== null &&
          formData.delivery_date !== "";
        const hasLeadTime =
          formData.lead_time !== null &&
          formData.lead_time !== undefined &&
          formData.lead_time !== "" &&
          !isNaN(Number(formData.lead_time));
        const hasShipmentMode =
          formData.shipment_mode &&
          formData.shipment_mode !== null &&
          formData.shipment_mode !== "";

        if (field.accessor === "shipment_mode") {
          enhancedField.isDisabled = hasDeliveryDate || hasLeadTime;
        }

        if (field.accessor === "lead_time") {
          enhancedField.isDisabled = hasDeliveryDate || hasShipmentMode;
        }

        if (field.accessor === "delivery_date") {
          enhancedField.isDisabled = hasLeadTime || hasShipmentMode;
          enhancedField.disablePast = true;
          enhancedField.shouldDisableDate = (day) => {
            return day.isBefore(moment(), "day");
          };
        }
      }

      return enhancedField;
    });
  };

  return (
    <Panel
      onClose={() => onCancel()}
      aria-labelledby="off-cycle-order-set-all"
      open={true}
      title="Set all"
      width={900}
      primaryButtonLabel="Apply"
      onPrimaryButtonClick={() => {
        onApply();
      }}
      secondaryButtonLabel="Cancel"
      onSecondaryButtonClick={() => {
        onCancel();
      }}
      sx={{ zIndex: 1500 }}
    >
      <div style={{ padding: "16px 0" }}>
        {/* SECTION 1: Demand Constraints */}
        {getFieldsBySection("demand_constraints").length > 0 && (
          <>
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  fontSize: "16px",
                  color: "#333",
                  mb: 2,
                }}
              >
                Demand Constraints
              </Typography>
              <Form
                key={`demand-constraints-${formResetKey}
                  ${formData.demand_period_selection || "none"}
                `}
                maxFieldsInRow={2}
                layout={"vertical"}
                fields={getFieldsBySection("demand_constraints")}
                handleChange={handleChange}
                updateDefaultValue={true}
                defaultValues={formData}
                labelWidthSpan={2}
                fieldTypeWidthSpan={2}
                noPortal={false}
                showClearDates={true}
              />
            </Box>

            <Divider sx={{ my: 3 }} />
          </>
        )}

        {/* SECTION 2: Buffer Stock Constraints */}
        {getFieldsBySection("buffer_stock_constraints").length > 0 && (
          <>
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  fontSize: "16px",
                  color: "#333",
                  mb: 2,
                }}
              >
                Buffer Stock Constraints
              </Typography>
              <Form
                key={`buffer-stock-constraints-${formResetKey}
                  ${formData.buffer_stock_addition_method || "none"}
                `}
                maxFieldsInRow={2}
                layout={"vertical"}
                fields={getFieldsBySection("buffer_stock_constraints")}
                handleChange={handleChange}
                updateDefaultValue={true}
                defaultValues={formData}
                labelWidthSpan={2}
                fieldTypeWidthSpan={2}
                noPortal={false}
                showClearDates={true}
              />
            </Box>

            <Divider sx={{ my: 3 }} />
          </>
        )}

        {/* SECTION 3: Delivery Constraints */}
        {getFieldsBySection("delivery_constraints").length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                fontSize: "16px",
                color: "#333",
                mb: 2,
              }}
            >
              Delivery Constraints
            </Typography>
            <Form
              key={`delivery-constraints-${formResetKey}`}
              maxFieldsInRow={2}
              layout={"vertical"}
              fields={getFieldsBySection("delivery_constraints")}
              handleChange={handleChange}
              updateDefaultValue={true}
              defaultValues={formData}
              labelWidthSpan={2}
              fieldTypeWidthSpan={2}
              noPortal={false}
              showClearDates={true}
            />
          </Box>
        )}
      </div>
    </Panel>
  );
};

const mapStateToProps = (store) => {
  return {};
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(OffCycleOrderSetAllPopUp);
