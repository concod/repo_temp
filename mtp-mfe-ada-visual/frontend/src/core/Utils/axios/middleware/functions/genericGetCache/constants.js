// Cache configuration constants
export const CACHE_CONFIG = {
  // URLs to include in caching (empty by default - no inclusions)
  // Only URLs listed here will be cached by genericGetCache
  INCLUDED_URLS: [
    'core/applications',
    'core/filter-configuration/screen',
    // 'core/tenant-config',
    'core/timeline/fiscal-calendar-data',
    // 'core/user-role-mgmt/applications',
    'core/user-role-mgmt/filter-conf',
    'master/user-management/app-role-hierarchy',
    'inventory-smart/dashboard/refresh-date',
    'master/user-management/screen-hierarchy?',
    'inventory-smart/constraint/rcl/hierarchy-list',
    'inventory-smart/configuration/rcl/hierarchy-list',
    'inventory-smart/strategy/get-setall-defaults',
    '/module-hierarchy',
  ],
  
  // HTTP methods to cache
  CACHEABLE_METHODS: ['GET'],
  
  // Enable/disable debug logging
  DEBUG_LOGGING: false,
  
  // Special handling for complex endpoints
  SPECIAL_ENDPOINTS: {
    '/core/table-fields': {
      // These are handled by tableColDef middleware
      // due to complex cache invalidation logic
      reason: 'Complex cache invalidation with user preferences',
      handledBy: 'tableColDef middleware'
    },
    '/core/filter/user-preference': {
      // These are handled by filterUserPreference middleware
      // due to smart cache invalidation on updates
      reason: 'Smart cache invalidation on filter preference updates',
      handledBy: 'filterUserPreference middleware'
    }
  }
};
