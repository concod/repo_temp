import { TABLE_COL_DEF, GENERIC_GET_CACHE, FILTER_USER_PREFERENCE, GENERIC_POST_CACHE } from "./constants/middlewareNames";
import { tableColDefMiddleware } from "./functions/tableColDef";
import { genericGetCacheMiddleware } from "./functions/genericGetCache";
import { filterUserPreferenceMiddleware } from "./functions/filterUserPreference";
import { genericPostCacheMiddleware } from "./functions/genericPostCache";

export const middlewareMap = {
  [TABLE_COL_DEF]: tableColDefMiddleware,
  [FILTER_USER_PREFERENCE]: filterUserPreferenceMiddleware,
  [GENERIC_GET_CACHE]: genericGetCacheMiddleware,
  [GENERIC_POST_CACHE]: genericPostCacheMiddleware,
};
