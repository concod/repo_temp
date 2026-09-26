import axiosInstance from "../../../../core/Utils/axios";
import { SHIP_ALLOCATION_CALENDAR_LIST } from "../../constants-inventorysmart/apiConstants";

/**
 * Get Ship Allocation Calendar List
 * @param {Object} postBody - Request body with filters, date_range, and meta
 * @returns {Function} Thunk function
 */
export const getShipAllocationCalendarList = (postBody) => async () => {
  return axiosInstance({
    url: SHIP_ALLOCATION_CALENDAR_LIST,
    method: "POST",
    data: postBody,
  });
};
