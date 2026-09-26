/**
 * ATA (Available To Allocate) Exceedance Check - API Services
 */
import axiosInstance from "../../../../core/Utils/axios/index";
import {
  ATA_EXCEEDANCE_CHECK,
  ATA_AUTO_ADJUST,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";

/**
 * POST /session/ata-exceedance-check
 * Checks if there are ATA violations for the given session
 */
export const checkATAExceedance = (postBody) => () => {
  return axiosInstance({
    url: ATA_EXCEEDANCE_CHECK,
    method: "POST",
    data: postBody,
  });
};

/**
 * POST /session/ata-auto-adjust
 * Auto-adjusts allocations to resolve violations
 */
export const autoAdjustATA = (postBody) => () => {
  return axiosInstance({
    url: ATA_AUTO_ADJUST,
    method: "POST",
    data: postBody,
  });
};
