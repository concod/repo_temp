import { MIDDLEWARE_TYPE } from "../../../justCache/constants";
import { generateCachedResponse } from "../../utils";
import { InMemoryCache } from "../../class/inMemoryCache";
import { FILTER_PREF_CONFIG } from "./constants";

// Cache for filter user preferences
const filterUserPreferenceCache = new InMemoryCache();
// Helper function to check if URL is a filter user preference GET request
const isFilterUserPreferenceGet = (url, method) => {
  const isMethodMatch = method.toLowerCase() === 'get';
  const isUrlMatch = FILTER_PREF_CONFIG.CACHEABLE_URLS.some(cacheableUrl => 
    url.includes(cacheableUrl)
  );
  
  return isMethodMatch && isUrlMatch;
};

// Helper function to check if URL is a filter user preference update/delete request
const isFilterUserPreferenceMutation = (url, method) => {
  const isMethodMatch = FILTER_PREF_CONFIG.INVALIDATION_METHODS.includes(method.toUpperCase());
  const isUrlMatch = FILTER_PREF_CONFIG.INVALIDATION_URLS.some(invalidationUrl => 
    url.includes(invalidationUrl)
  );
  
  return isMethodMatch && isUrlMatch;
};

// Generate cache key for filter user preferences
const generateFilterPrefCacheKey = (url, params = {}) => {
  // Create a unique cache key based on URL and query parameters
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  
  return sortedParams ? `${url}?${sortedParams}` : url;
};

// Handle filter user preference GET requests - return cached data if available
const filterUserPrefReqHandler = (url, method, request) => {
  if (FILTER_PREF_CONFIG.DEBUG_LOGGING) {
    console.log("CACHE-FILTER-USER-PREFEREFCE",filterUserPreferenceCache);
  }
  if (!isFilterUserPreferenceGet(url, method)) {
    return;
  }

  const cacheKey = generateFilterPrefCacheKey(url, request.params);
  const cachedData = filterUserPreferenceCache.get(cacheKey);

  if (cachedData) {
    const cachedResponse = generateCachedResponse(request, cachedData);
    return cachedResponse;
  }
  return null;
};

// Handle filter user preference update/delete requests - invalidate related caches
const filterUserPrefInvalidationHandler = (url, method, meta) => {
  if (!isFilterUserPreferenceMutation(url, method)) {
    return;
  }
  // Invalidate all filter user preference caches since they're all related
  // This ensures data consistency across all filter preference endpoints
  filterUserPreferenceCache.clear();
};

// Handle filter user preference responses - cache successful GET responses
const filterUserPrefResHandler = (url, method, data, config) => {
  if (!isFilterUserPreferenceGet(url, method)) {
    return;
  }

  const cacheKey = generateFilterPrefCacheKey(url, config.params);
  
  // Store response
  filterUserPreferenceCache.set(cacheKey, data);
};

export const filterUserPreferenceMiddleware = (type, meta) => {
  if (type === MIDDLEWARE_TYPE.REQUEST) {
    const request = meta;
    const { url, method } = request;

    // Check cache for GET requests
    const cachedResponse = filterUserPrefReqHandler(url, method, request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Handle cache invalidation for update/delete requests
    filterUserPrefInvalidationHandler(url, method, meta);
  }

  if (type === MIDDLEWARE_TYPE.RESPONSE) {
    const response = meta;
    const { config, data } = response;
    const { url, method } = config;

    // Cache GET responses
    filterUserPrefResHandler(url, method, data, config);
  }
  
  if (type === MIDDLEWARE_TYPE.CLEAR_CACHE) {
    filterUserPreferenceCache.clear();
  }
};
