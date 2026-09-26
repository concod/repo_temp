import { MIDDLEWARE_TYPE } from "../../../justCache/constants";
import { API_METHOD } from "../../constants";
import { generateCachedResponse } from "../../utils";
import { InMemoryCache } from "../../class/inMemoryCache";
import { CACHE_CONFIG } from "./constants";

// Cache for all GET requests
const genericGetCache = new InMemoryCache();

const isGetRequest = (method) => {
  return method.toLowerCase() === API_METHOD.GET;
};

const shouldIncludeInCache = (url) => {
  const isIncluded = CACHE_CONFIG.INCLUDED_URLS.some(includedUrl => {
    return url.includes(includedUrl)
  });
  return isIncluded;
};

const generateCacheKey = (url, params = {}) => {
  // Create a unique cache key based on URL and query parameters
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  
  return sortedParams ? `${url}?${sortedParams}` : url;
};

const genericGetReqHandler = (url, method, request) => {
  if (CACHE_CONFIG.DEBUG_LOGGING) {
    console.log("CACHE-GET",genericGetCache)
  }
  if (!isGetRequest(method)) {
    return;
  }

  // Only cache if URL is included
  if (!shouldIncludeInCache(url)) {
    return;
  }

  const cacheKey = generateCacheKey(url, request.params);
  const cachedData = genericGetCache.get(cacheKey);
  if (cachedData) {
    const cachedResponse = generateCachedResponse(request, cachedData);
    return cachedResponse;
  }
  return null;
};

const genericGetResHandler = (url, method, data, config) => {
  if (!isGetRequest(method)) {
    return;
  }

  // Only cache if URL is included
  if (!shouldIncludeInCache(url)) {
    return;
  }

  const cacheKey = generateCacheKey(url, config.params);
  
  // Store response
  genericGetCache.set(cacheKey, data);
};

export const genericGetCacheMiddleware = (type, meta) => {
  if (type === MIDDLEWARE_TYPE.REQUEST) {
    const request = meta;
    const { url, method } = request;

    // Check cache for GET requests
    const cachedResponse = genericGetReqHandler(url, method, request);
    if (cachedResponse) {
      return cachedResponse;
    }
  }

  if (type === MIDDLEWARE_TYPE.RESPONSE) {
    const response = meta;
    const { config, data } = response;
    const { url, method } = config;

    // Cache GET responses
    genericGetResHandler(url, method, data, config);
  }

  if (type === MIDDLEWARE_TYPE.CLEAR_CACHE) {
    genericGetCache.clear();
  }
};
