import moment from "moment";

import { formatStringDate } from "core/Utils/functions/utils";

export const DATE_VALIDATION_ERROR = "Start date is later than end date";
export const SAME_SKU_MAPPING_ERROR = "One of the old SKUs is same as the new SKU";

export const SNACK_MSG_VARIANTS = {
  ERROR: "error",
};

export const DEFAULT_END_DATE = formatStringDate(
  moment("31 Dec 2050"),
  false,
  true
);

export const displaySnackMessages = (addSnack = () => {}, message, variant) => {
  addSnack({
    message,
    options: {
      variant,
    },
  });
};
