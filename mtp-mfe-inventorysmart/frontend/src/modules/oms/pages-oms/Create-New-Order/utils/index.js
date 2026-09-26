import moment from "moment";
import { getTenantTimeZoneDetails } from "core/commonComponents/coreComponentScreen/utils";
import {
  TENANT_DATE_FORMAT,
  ORDER_PLACEMENT_DATE_COLUMN,
  INVALID_DATE,
  NOT_BEFORE_AFTER_DATE_COLUMN,
  EXPECTED_RECEIPT_DATE_COLUMN,
  EXPECTED_RECEIPT_DATE_COLUMN_STORE,
} from "modules/oms/constants-oms/stringConstants";

export const validateDateRangePicker = (order) => {
  let isValueValid = true;
  let columnValue = order?.[NOT_BEFORE_AFTER_DATE_COLUMN];

  const { tenantDateFormat } = getTenantTimeZoneDetails();
  const DATE_FORMAT = tenantDateFormat || TENANT_DATE_FORMAT;

  let notBeforeDate = moment(columnValue.fiscalInfoStartDate).format(
    DATE_FORMAT
  );

  let notAfterDate = moment(columnValue.fiscalInfoEndDate).format(DATE_FORMAT);

  let orderPlacementDate = moment(order?.[ORDER_PLACEMENT_DATE_COLUMN]).format(
    DATE_FORMAT
  );

  //Valid [Not Before Date] Value must be between than [Order Placement Date] and [Not After Date]
  //Valid [Not After Date] Value must be greater than [Not Before Date] and [Order Placement Date]

  if (notBeforeDate !== INVALID_DATE && notAfterDate !== INVALID_DATE) {
    if (
      moment(notBeforeDate, DATE_FORMAT).isAfter(
        moment(orderPlacementDate, DATE_FORMAT)
      ) &&
      moment(notAfterDate, DATE_FORMAT).isAfter(
        moment(orderPlacementDate, DATE_FORMAT)
      )
    ) {
      isValueValid = true;
    } else {
      isValueValid = false;
    }
  } else {
    isValueValid = false;
  }

  return isValueValid;
};

export const validateDate = (order) => {
  let isValueValid = true;
  let columnValue = order?.[EXPECTED_RECEIPT_DATE_COLUMN];

  const { tenantDateFormat } = getTenantTimeZoneDetails();
  const DATE_FORMAT = tenantDateFormat || TENANT_DATE_FORMAT;

  let selectedDate = moment(columnValue, DATE_FORMAT).format(DATE_FORMAT);

  let orderPlacementDate = moment(order?.[ORDER_PLACEMENT_DATE_COLUMN]).format(
    DATE_FORMAT
  );

  //Valid [Not Before Date] Value must be between than [Order Placement Date] and [Not After Date]
  //Valid [Not After Date] Value must be greater than [Not Before Date] and [Order Placement Date]

  if (selectedDate !== INVALID_DATE) {
    if (
      moment(selectedDate, DATE_FORMAT).isAfter(
        moment(orderPlacementDate, DATE_FORMAT)
      )
    ) {
      isValueValid = true;
    } else {
      isValueValid = false;
    }
  } else {
    isValueValid = false;
  }

  return isValueValid;
};

export const validateDateForStore = (order) => {
  let isValueValid = true;
  let columnValue = order?.[EXPECTED_RECEIPT_DATE_COLUMN_STORE];

  const { tenantDateFormat } = getTenantTimeZoneDetails();
  const DATE_FORMAT = tenantDateFormat || TENANT_DATE_FORMAT;

  let selectedDate = moment(columnValue, DATE_FORMAT).format(DATE_FORMAT);

  let orderPlacementDate = moment(order?.[ORDER_PLACEMENT_DATE_COLUMN]).format(
    DATE_FORMAT
  );

  //Valid [Not Before Date] Value must be between than [Order Placement Date] and [Not After Date]
  //Valid [Not After Date] Value must be greater than [Not Before Date] and [Order Placement Date]

  if (selectedDate !== INVALID_DATE) {
    if (
      moment(selectedDate, DATE_FORMAT).isAfter(
        moment(orderPlacementDate, DATE_FORMAT)
      )
    ) {
      isValueValid = true;
    } else {
      isValueValid = false;
    }
  } else {
    isValueValid = false;
  }

  return isValueValid;
};

export function getFinalCheckedRecords(all_records, user_actions) {
  try {
    const checkedSet = new Set();

    for (const action of user_actions) {
      if (action.checkAll && Array.isArray(all_records)) {
        all_records.forEach((row) => checkedSet.add(row?.unique_row_id));
      }

      if (Array.isArray(action.checkedRows)) {
        action.checkedRows.forEach((unique_row_id) =>
          checkedSet.add(unique_row_id)
        );
      }

      if (Array.isArray(action.unCheckedRows)) {
        action.unCheckedRows.forEach((unique_row_id) =>
          checkedSet.delete(unique_row_id)
        );
      }
    }

    return Array.from(checkedSet);
  } catch (error) {
    console.log("Error in getFinalCheckedRecords", error);
    return [];
  }
}
