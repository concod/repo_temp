// Filter User Preference middleware configuration
export const FILTER_PREF_CONFIG = {
  // URLs that should be cached (GET requests)
  CACHEABLE_URLS: [
    'core/filter/user-preference',
  ],
  
  // URLs that trigger cache invalidation
  INVALIDATION_URLS: [
    'core/filter/screen/update-user-preference',
    'core/filter/screen/save-user-preference',
    'core/filter/screen/delete-user-preference'
  ],
  
  // HTTP methods that trigger invalidation
  INVALIDATION_METHODS: ['PUT', 'POST', 'DELETE'],
  
  // Enable/disable debug logging
  DEBUG_LOGGING: false
};
