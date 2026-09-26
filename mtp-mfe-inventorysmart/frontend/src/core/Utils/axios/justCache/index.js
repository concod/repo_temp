import { JustCache } from "./class/justCache";

export { MIDDLEWARE_TYPE } from "./constants";

export const getJustCacheInstance = (middlewareMap) => {
  return new JustCache(middlewareMap);
};
