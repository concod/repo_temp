// Configuration for generic POST cache middleware
export const GENERIC_POST_CACHE_CONFIG = {
  // Default TTL for cached responses (5 minutes)
  DEFAULT_TTL: 5 * 60 * 1000,
  
  // URLs that should be cached
  CACHEABLE_URLS: [
    'core/user-role-mgmt/screens',
    '/module-hierarchy',
    '/urm-filters'
    // Add more URLs here as needed
  ],
  // Enable debug logging
  DEBUG_LOGGING: false
};
