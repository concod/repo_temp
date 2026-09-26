import moment from "moment";

import { MAPPING_EDIT } from "../config/constants";

export const getPriority = (givenPriority, defaultPriority) => {
  return typeof givenPriority === "number" && givenPriority > 0
    ? givenPriority
    : defaultPriority;
};

export const checkForFutureStartDates = (
  selectedProductMappings,
  displaySnackMessages
) => {
  let startDatePassedFlag = false;

  for (const selectedMapping of selectedProductMappings) {
    // Check if start date of the mapping is in the future

    const endOfToday = moment().endOf("day");
    const isStartDateInFuture = moment(selectedMapping.start_date).isAfter(
      endOfToday
    );

    if (!isStartDateInFuture) {
      startDatePassedFlag = true;
      break;
    }
  }

  if (startDatePassedFlag) {
    displaySnackMessages(MAPPING_EDIT.START_DATE_PASSED, "error");
  }

  return !startDatePassedFlag;
};
