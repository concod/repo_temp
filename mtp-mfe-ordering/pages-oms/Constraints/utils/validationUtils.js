import { OMS_POSTGRES_INTEGER_MAX } from "modules/oms/constants-oms/stringConstants";

/**
 * Extract field configuration from field data
 * @param {Array} fieldsData - Array of field configurations
 * @param {string} accessor - Field accessor to find
 * @returns {Object} Field configuration object
 */
export const getFieldConfig = (fieldsData, accessor) => {
  return fieldsData.find((f) => f.accessor === accessor) || {};
};

/**
 * Extract validation constants from field configurations
 * @param {Array} fieldsData - Array of field configurations
 * @returns {Object} Validation constants object
 */
export const getValidationConstants = (fieldsData) => {
  const minQtyConfig = getFieldConfig(fieldsData, "min_replenishment_quantity");
  const maxQtyConfig = getFieldConfig(fieldsData, "max_replenishment_quantity");
  const orderMultipleConfig = getFieldConfig(fieldsData, "order_multiple");
  const moqToleranceConfig = getFieldConfig(fieldsData, "moq_tolerance");

  return {
    MIN_QTY_MIN_VALUE: minQtyConfig?.min_value || 0,
    MIN_QTY_MAX_VALUE: minQtyConfig?.max_value || OMS_POSTGRES_INTEGER_MAX,
    MAX_QTY_MIN_VALUE: maxQtyConfig?.min_value || 0,
    MAX_QTY_MAX_VALUE: maxQtyConfig?.max_value || OMS_POSTGRES_INTEGER_MAX,
    ORDER_MULTIPLE_MIN_VALUE: orderMultipleConfig?.min_value || 1,
    ORDER_MULTIPLE_MAX_VALUE:
      orderMultipleConfig?.max_value || OMS_POSTGRES_INTEGER_MAX,
    MOQ_TOLERANCE_MIN_VALUE: moqToleranceConfig?.min_value || 0,
    MOQ_TOLERANCE_MAX_VALUE: moqToleranceConfig?.max_value || 100,
  };
};

/**
 * Check if value is a valid integer
 * @param {*} value - Value to check
 * @returns {boolean} True if valid integer
 */
export const checkInValidInteger = (value) => {
  return isNaN(value) || !Number.isFinite(value) || !Number.isInteger(value);
};

/**
 * Check if value is valid (not empty, null, or undefined)
 * @param {*} value - Value to check
 * @returns {boolean} True if valid
 */
export const checkValidInput = (value) => {
  return value !== "" && value !== undefined && value !== null;
};

/**
 * Validate shipment constraints data
 * @param {Object} data - Data to validate
 * @param {Array} fieldsData - Field configurations
 * @returns {Object} Validation result with isValid and message
 */
export const validateShipmentConstraintsData = (data, fieldsData) => {
  const constants = getValidationConstants(fieldsData);
  const minQtyConfig = getFieldConfig(fieldsData, "min_replenishment_quantity");
  const maxQtyConfig = getFieldConfig(fieldsData, "max_replenishment_quantity");
  const orderMultipleConfig = getFieldConfig(fieldsData, "order_multiple");
  const moqToleranceConfig = getFieldConfig(fieldsData, "moq_tolerance");

  // Required field checks
  if (
    minQtyConfig.required &&
    !checkValidInput(data.min_replenishment_quantity)
  ) {
    return { isValid: false, message: `${minQtyConfig.label} is required` };
  }
  if (
    maxQtyConfig.required &&
    !checkValidInput(data.max_replenishment_quantity)
  ) {
    return { isValid: false, message: `${maxQtyConfig.label} is required` };
  }
  if (orderMultipleConfig.required && !checkValidInput(data.order_multiple)) {
    return {
      isValid: false,
      message: `${orderMultipleConfig.label} is required`,
    };
  }
  if (moqToleranceConfig.required && !checkValidInput(data.moq_tolerance)) {
    return {
      isValid: false,
      message: `${moqToleranceConfig.label} is required`,
    };
  }

  // Integer/number validation
  if (
    data.min_replenishment_quantity !== undefined &&
    checkInValidInteger(data.min_replenishment_quantity)
  ) {
    return {
      isValid: false,
      message: `${minQtyConfig.label} must be a valid integer`,
    };
  }
  if (
    data.max_replenishment_quantity !== undefined &&
    checkInValidInteger(data.max_replenishment_quantity)
  ) {
    return {
      isValid: false,
      message: `${maxQtyConfig.label} must be a valid integer`,
    };
  }
  if (
    data.order_multiple !== undefined &&
    checkInValidInteger(data.order_multiple)
  ) {
    return {
      isValid: false,
      message: `${orderMultipleConfig.label} must be a valid integer`,
    };
  }
  if (
    data.moq_tolerance !== undefined &&
    checkInValidInteger(data.moq_tolerance)
  ) {
    return {
      isValid: false,
      message: `${moqToleranceConfig.label} must be a valid integer`,
    };
  }

  // Min/max value validation
  if (
    data.min_replenishment_quantity !== undefined &&
    data.min_replenishment_quantity < constants.MIN_QTY_MIN_VALUE
  ) {
    return {
      isValid: false,
      message: `${minQtyConfig.label} must be at least ${constants.MIN_QTY_MIN_VALUE}`,
    };
  }
  if (
    data.min_replenishment_quantity !== undefined &&
    data.min_replenishment_quantity > constants.MIN_QTY_MAX_VALUE
  ) {
    return {
      isValid: false,
      message: `${minQtyConfig.label} must be at most ${constants.MIN_QTY_MAX_VALUE}`,
    };
  }
  if (
    data.max_replenishment_quantity !== undefined &&
    data.max_replenishment_quantity < constants.MAX_QTY_MIN_VALUE
  ) {
    return {
      isValid: false,
      message: `${maxQtyConfig.label} must be at least ${constants.MAX_QTY_MIN_VALUE}`,
    };
  }
  if (
    data.max_replenishment_quantity !== undefined &&
    data.max_replenishment_quantity > constants.MAX_QTY_MAX_VALUE
  ) {
    return {
      isValid: false,
      message: `${maxQtyConfig.label} must be at most ${constants.MAX_QTY_MAX_VALUE}`,
    };
  }
  if (
    data.order_multiple !== undefined &&
    data.order_multiple < constants.ORDER_MULTIPLE_MIN_VALUE
  ) {
    return {
      isValid: false,
      message: `${orderMultipleConfig.label} must be at least ${constants.ORDER_MULTIPLE_MIN_VALUE}`,
    };
  }
  if (
    data.order_multiple !== undefined &&
    data.order_multiple > constants.ORDER_MULTIPLE_MAX_VALUE
  ) {
    return {
      isValid: false,
      message: `${orderMultipleConfig.label} must be at most ${constants.ORDER_MULTIPLE_MAX_VALUE}`,
    };
  }
  if (data.moq_tolerance !== undefined) {
    if (data.moq_tolerance < constants.MOQ_TOLERANCE_MIN_VALUE) {
      return {
        isValid: false,
        message: `${moqToleranceConfig.label} must be at least ${constants.MOQ_TOLERANCE_MIN_VALUE}`,
      };
    }
    if (data.moq_tolerance > constants.MOQ_TOLERANCE_MAX_VALUE) {
      return {
        isValid: false,
        message: `${moqToleranceConfig.label} must be at most ${constants.MOQ_TOLERANCE_MAX_VALUE}`,
      };
    }
  }

  // Min ≤ Max validation
  if (
    data.min_replenishment_quantity !== undefined &&
    data.max_replenishment_quantity !== undefined &&
    data.min_replenishment_quantity > data.max_replenishment_quantity
  ) {
    return {
      isValid: false,
      message: `${minQtyConfig.label} cannot be greater than ${maxQtyConfig.label}`,
    };
  }

  return { isValid: true };
};

/**
 * Validate MOQ tolerance with rounding
 * @param {Object} data - Data containing moq_tolerance
 * @param {Array} fieldsData - Field configurations
 * @returns {number} Validated MOQ tolerance value
 */
export const validateUserInputThreshold = (
  data,
  fieldsData,
  displaySnackMessages
) => {
  const constants = getValidationConstants(fieldsData);
  let value = data.moq_tolerance || 0;

  // Round the value first
  value = Math.round(value);

  // Then apply bounds
  if (value < constants.MOQ_TOLERANCE_MIN_VALUE) {
    value = constants.MOQ_TOLERANCE_MIN_VALUE;
    displaySnackMessages(
      "MOQ Tolerance must be at least " + constants.MOQ_TOLERANCE_MIN_VALUE,
      "info"
    );
  }
  if (value > constants.MOQ_TOLERANCE_MAX_VALUE) {
    value = constants.MOQ_TOLERANCE_MAX_VALUE;
    displaySnackMessages(
      "MOQ Tolerance must be at most " + constants.MOQ_TOLERANCE_MAX_VALUE,
      "info"
    );
  }

  return value;
};

/**
 * Validate form data for Set All modal
 * @param {Object} formData - Form data to validate
 * @param {Array} fieldsData - Field configurations
 * @param {Function} displaySnackMessages - Function to display messages
 * @returns {boolean} True if valid
 */
export const validateShipmentConstraintsForm = (
  formData,
  fieldsData,
  displaySnackMessages
) => {
  const constants = getValidationConstants(fieldsData);
  const minQtyConfig = getFieldConfig(fieldsData, "min_replenishment_quantity");
  const maxQtyConfig = getFieldConfig(fieldsData, "max_replenishment_quantity");
  const orderMultipleConfig = getFieldConfig(fieldsData, "order_multiple");
  const moqToleranceConfig = getFieldConfig(fieldsData, "moq_tolerance");

  // Parse values
  const minQty =
    formData.min_replenishment_quantity !== undefined
      ? Number(formData.min_replenishment_quantity)
      : undefined;
  const maxQty =
    formData.max_replenishment_quantity !== undefined
      ? Number(formData.max_replenishment_quantity)
      : undefined;
  const orderMultiple =
    formData.order_multiple !== undefined
      ? Number(formData.order_multiple)
      : undefined;
  const moqTolerance =
    formData.moq_tolerance !== undefined
      ? Number(formData.moq_tolerance)
      : undefined;

  // Required checks
  if (minQtyConfig.required && (minQty === undefined || minQty === null)) {
    displaySnackMessages(minQtyConfig.label + " is required", "info");
    return false;
  }
  if (maxQtyConfig.required && (maxQty === undefined || maxQty === null)) {
    displaySnackMessages(maxQtyConfig.label + " is required", "info");
    return false;
  }
  if (
    orderMultipleConfig.required &&
    (orderMultiple === undefined || orderMultiple === null)
  ) {
    displaySnackMessages(orderMultipleConfig.label + " is required", "info");
    return false;
  }
  if (
    moqToleranceConfig.required &&
    (moqTolerance === undefined || moqTolerance === null)
  ) {
    displaySnackMessages(moqToleranceConfig.label + " is required", "info");
    return false;
  }

  // Integer/number checks
  if (
    orderMultiple !== undefined &&
    (isNaN(orderMultiple) ||
      !Number.isFinite(orderMultiple) ||
      (orderMultipleConfig.value_type === "number" &&
        !Number.isInteger(orderMultiple)))
  ) {
    displaySnackMessages("Order Multiple must be a valid integer", "info");
    return false;
  }
  if (
    minQty !== undefined &&
    (isNaN(minQty) ||
      !Number.isFinite(minQty) ||
      (minQtyConfig.value_type === "number" && !Number.isInteger(minQty)))
  ) {
    displaySnackMessages(
      "Minimum Replenishment Quantity must be a valid integer",
      "info"
    );
    return false;
  }
  if (
    maxQty !== undefined &&
    (isNaN(maxQty) ||
      !Number.isFinite(maxQty) ||
      (maxQtyConfig.value_type === "number" && !Number.isInteger(maxQty)))
  ) {
    displaySnackMessages(
      "Maximum Replenishment Quantity must be a valid integer",
      "info"
    );
    return false;
  }
  if (
    moqTolerance !== undefined &&
    (isNaN(moqTolerance) || !Number.isFinite(moqTolerance))
  ) {
    displaySnackMessages("MOQ Tolerance must be a valid number", "info");
    return false;
  }

  // Min/max value checks
  if (
    orderMultiple !== undefined &&
    orderMultipleConfig.min_value !== undefined &&
    orderMultiple < orderMultipleConfig.min_value
  ) {
    displaySnackMessages(
      "Order Multiple must be at least " + orderMultipleConfig.min_value,
      "info"
    );
    return false;
  }
  if (
    orderMultiple !== undefined &&
    orderMultipleConfig.max_value !== undefined &&
    orderMultiple > orderMultipleConfig.max_value
  ) {
    displaySnackMessages(
      "Order Multiple must be at most " + orderMultipleConfig.max_value,
      "info"
    );
    return false;
  }
  if (
    minQty !== undefined &&
    minQtyConfig.min_value !== undefined &&
    minQty < minQtyConfig.min_value
  ) {
    displaySnackMessages(
      "Minimum Replenishment Quantity must be at least " +
        minQtyConfig.min_value,
      "info"
    );
    return false;
  }
  if (
    minQty !== undefined &&
    minQtyConfig.max_value !== undefined &&
    minQty > minQtyConfig.max_value
  ) {
    displaySnackMessages(
      "Minimum Replenishment Quantity must be at most " +
        minQtyConfig.max_value,
      "info"
    );
    return false;
  }
  if (
    maxQty !== undefined &&
    maxQtyConfig.min_value !== undefined &&
    maxQty < maxQtyConfig.min_value
  ) {
    displaySnackMessages(
      "Maximum Replenishment Quantity must be at least " +
        maxQtyConfig.min_value,
      "info"
    );
    return false;
  }
  if (
    maxQty !== undefined &&
    maxQtyConfig.max_value !== undefined &&
    maxQty > maxQtyConfig.max_value
  ) {
    displaySnackMessages(
      "Maximum Replenishment Quantity must be at most " +
        maxQtyConfig.max_value,
      "info"
    );
    return false;
  }
  if (moqTolerance !== undefined) {
    if (
      moqToleranceConfig.min_value !== undefined &&
      moqTolerance < moqToleranceConfig.min_value
    ) {
      displaySnackMessages(
        "MOQ Tolerance must be at least " + moqToleranceConfig.min_value,
        "info"
      );
      return false;
    }
    if (
      moqToleranceConfig.max_value !== undefined &&
      moqTolerance > moqToleranceConfig.max_value
    ) {
      displaySnackMessages(
        "MOQ Tolerance must be at most " + moqToleranceConfig.max_value,
        "info"
      );
      return false;
    }
  }

  // Min ≤ Max check
  if (minQty !== undefined && maxQty !== undefined && minQty > maxQty) {
    displaySnackMessages(
      "Minimum Replenishment Quantity cannot be greater than Maximum Replenishment Quantity",
      "info"
    );
    return false;
  }

  return true;
};
