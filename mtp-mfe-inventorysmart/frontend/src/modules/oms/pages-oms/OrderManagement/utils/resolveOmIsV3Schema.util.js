import {
  ORDER_MANAGEMENT_V3_FILTER_CONFIG,
  ORDER_MANAGEMENT_V4_FILTER_CONFIG,
} from "modules/oms/constants-oms/apiConstants";
import {
  ORDER_MANAGEMENT_V3,
  ORDER_MANAGEMENT_V4,
} from "modules/oms/constants-oms/routeConstants";

/**
 * Body `is_v3` for CH schema selection:
 * - OM V3 route / V3 screen name → true
 * - OM V4 route / V4 screen name → false
 *
 * Prefer explicit screenViewName or pathname; fall back to sourcePath (handoff).
 */
export function resolveOmIsV3Schema({
  pathname,
  sourcePath,
  screenViewName,
} = {}) {
  if (screenViewName === ORDER_MANAGEMENT_V3_FILTER_CONFIG) {
    return true;
  }
  if (screenViewName === ORDER_MANAGEMENT_V4_FILTER_CONFIG) {
    return false;
  }

  const path = pathname || sourcePath || "";
  if (typeof path === "string" && path.startsWith(ORDER_MANAGEMENT_V3)) {
    return true;
  }
  if (typeof path === "string" && path.startsWith(ORDER_MANAGEMENT_V4)) {
    return false;
  }

  // Default to V4 schema when ambiguous (matches Product Details empty-handoff redirect).
  return false;
}

/** Filter-config screen name for useScreenId from schema flag / route. */
export function resolveOmFilterConfigScreenName({
  pathname,
  sourcePath,
  isV3Schema,
} = {}) {
  if (typeof isV3Schema === "boolean") {
    return isV3Schema
      ? ORDER_MANAGEMENT_V3_FILTER_CONFIG
      : ORDER_MANAGEMENT_V4_FILTER_CONFIG;
  }
  return resolveOmIsV3Schema({ pathname, sourcePath })
    ? ORDER_MANAGEMENT_V3_FILTER_CONFIG
    : ORDER_MANAGEMENT_V4_FILTER_CONFIG;
}
