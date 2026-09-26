import { MIDDLEWARE_TYPE } from "../../../justCache/constants";
import { generateCachedResponse } from "../../utils";
import { InMemoryCache } from "../../class/inMemoryCache";
import { GENERIC_POST_CACHE_CONFIG } from "./constants";

// Cache for POST API responses
const genericPostCache = new InMemoryCache();

// Check if URL should be cached
const shouldCacheUrl = (url) => {
  return GENERIC_POST_CACHE_CONFIG.CACHEABLE_URLS.some(cacheableUrl => url.includes(cacheableUrl));
};

// Generate cache key for POST requests (URL + payload)
const generatePostCacheKey = (url, payload) => {
  if (!payload || Object.keys(payload).length === 0) {
    return url;
  }
  
  let payloadStr;
  if (typeof payload === 'string') {
    // If it's already a string, use it directly
    payloadStr = payload;
  } else {
    // If it's an object, stringify it
    payloadStr = JSON.stringify(payload);
  }
  
  return `${url}:${payloadStr}`;
};

// Handle POST request caching
const postApiReqHandler = (url, method, request) => {

  if (GENERIC_POST_CACHE_CONFIG.DEBUG_LOGGING) {
    console.log("CACHE-POST",genericPostCache)
  }
  if(method !== 'post') {
    return null;
  }
  // Only cache if URL is in config
  if (!shouldCacheUrl(url)) {
    return null;
  }
  const cacheKey = generatePostCacheKey(url, request.data);
  const cachedData = genericPostCache.get(cacheKey);
  if (cachedData) {
    return generateCachedResponse(request, cachedData);
  }
  return null;
};

// Handle POST response caching
const postApiResHandler = (url, method, data, config) => {
  // Only cache if URL is in config
  if (!shouldCacheUrl(url)) {
    return;
  }

  const requestPayload = config.data || {};
  const cacheKey = generatePostCacheKey(url, requestPayload);
  genericPostCache.set(cacheKey, data);
};

export const genericPostCacheMiddleware = (type, meta) => {
  if (type === MIDDLEWARE_TYPE.REQUEST) {
    const request = meta;
    const { url, method } = request;
    if (method === 'get') {
      return;
    }
    // Check cache for POST requests
    const cachedResponse = postApiReqHandler(url, method, request);
    if (cachedResponse) {
      return cachedResponse;
    }
  }

  if (type === MIDDLEWARE_TYPE.RESPONSE) {
    const response = meta;
    const { config, data } = response;
    const { url, method } = config;

    // Cache POST responses
    postApiResHandler(url, method, data, config);
  }

  if (type === MIDDLEWARE_TYPE.CLEAR_CACHE) {
    genericPostCache.clear();
  }
};
