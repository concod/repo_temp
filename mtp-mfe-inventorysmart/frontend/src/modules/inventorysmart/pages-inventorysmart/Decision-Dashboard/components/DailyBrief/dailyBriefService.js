import axios from "axios";
import { TENANT, ENV } from "config/api";
import { getDailyBriefUrl } from "modules/inventorysmart/constants-inventorysmart/apiConstants";

/**
 * Daily Brief data source (navbot Cloud Function).
 *
 * NOTE: this is a standalone external endpoint, so we use a bare axios call
 * rather than the shared `core/Utils/axios` instance — we don't want the
 * tenant baseURL, HMAC signing or platform auth headers applied here.
 */

/**
 * Fetches the raw daily-brief payload. Shape matches api-response.md
 * (buckets[], stats, summary, date) consumed by transformDailyBrief.
 * @param {{ filters?: object, buckets?: string[], date?: string | null }} [options]
 */
export const fetchDailyBrief = async ({
  filters = {},
  buckets = ["all"],
  date = null,
} = {}) => {
  const payload = {
    tenant_id: TENANT,
    env: ENV,
    user_code: localStorage.getItem("name"),
    date,
    buckets,
    filters,
  };

  const response = await axios.post(getDailyBriefUrl(), payload, {
    headers: { "Content-Type": "application/json" },
  });
  return response.data;
};
