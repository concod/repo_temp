import { getFilterOptions } from "../../../services/chatbot-services";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";

// Cache to store filter values by unique key
const filterValuesCache = new Map();

/**
 * Generate a unique cache key for a filter configuration
 * @param {Object} filterConfig - The selected filter configuration
 * @param {Array} existingFilters - Array of existing filter selections
 * @returns {string} Cache key
 */
const getCacheKey = (filterConfig, existingFilters = []) => {
  if (!filterConfig) return null;
  
  const attributeName =
    filterConfig.column_name ||
    filterConfig.attribute_name ||
    filterConfig.name;
  const dimension = filterConfig.dimension || "product";
  
  // Include existing filters in cache key for cascading scenarios
  if (existingFilters.length > 0) {
    const filtersKey = existingFilters
      .map((f) => `${f.attribute_name || f.filter_id}_${f.values?.join(",") || ""}`)
      .join("|");
    return `${attributeName}_${dimension}_${filtersKey}`;
  }
  
  return `${attributeName}_${dimension}`;
};

/**
 * Build payload for filter options API
 * @param {Object} filterConfig - The selected filter configuration
 * @param {Array} existingFilters - Array of existing filter selections from editor
 * @param {Array} filterOptions - All available filter options (to get full filter config)
 * @returns {Object} API payload
 */
export const buildFilterOptionsPayload = (filterConfig, existingFilters = [], filterOptions = []) => {
  if (!filterConfig) return null;

  // Build filters array from existing mentions
  const filtersArray = existingFilters.map((mention) => {
    // Find the full filter config from filterOptions
    const fullFilterConfig = filterOptions.find(
      (f) => 
        (f.label || f.name) === mention.filterName ||
        f.column_name === mention.attributeName ||
        f.attribute_name === mention.attributeName ||
        f.name === mention.attributeName
    );

    // Get attribute name
    const attributeName = 
      fullFilterConfig?.column_name ||
      fullFilterConfig?.attribute_name ||
      fullFilterConfig?.name ||
      mention.attributeName;

    return {
      filter_name: mention.filterName,
      filter_id: attributeName,
      filter_type: "cascaded",
      dimension: fullFilterConfig?.dimension || "product",
      display_type: fullFilterConfig?.display_type || "dropdown",
      check_configuration: mention.checkAll ? [{ checkAll: true, meta: {} }] : [],
      is_mandatory: fullFilterConfig?.is_mandatory || false,
      extra: {},
      values: mention.checkAll ? [] : (mention.values || []),
      attribute_name: attributeName,
      operator: "in",
      display_order: fullFilterConfig?.display_order || 0,
    };
  });

  return {
    attributes: [
      {
        attribute_name:
          filterConfig.column_name ||
          filterConfig.attribute_name ||
          filterConfig.name,
        dimension: filterConfig.dimension || "product",
        filter_type: "cascaded",
      },
    ],
    filter_type: "cascaded",
    filters: filtersArray,
    is_urm_filter: true,
    screen_name: "Chatbot",
    application_code: 1,
  };
};

/**
 * Fetch filter values from API (with caching)
 * @param {Object} filterConfig - The selected filter configuration
 * @param {Array} existingFilters - Array of existing filter selections from editor
 * @param {Array} filterOptions - All available filter options (to get full filter config)
 * @returns {Promise<Array>} Array of filter values
 */
export const fetchFilterValues = async (filterConfig, existingFilters = [], filterOptions = []) => {
  try {
    // Generate cache key (including existing filters for cascading scenarios)
    const cacheKey = getCacheKey(filterConfig, existingFilters);
    
    // Check if values are cached
    if (cacheKey && filterValuesCache.has(cacheKey)) {
      return filterValuesCache.get(cacheKey);
    }
    
    // If not cached, fetch from API
    const payload = buildFilterOptionsPayload(filterConfig, existingFilters, filterOptions);
    if (!payload) return [];

    const response = await getFilterOptions(payload)();
    
    if (response?.data?.status && response?.data?.data) {
      const attributeName =
        filterConfig.column_name ||
        filterConfig.attribute_name ||
        filterConfig.name;
      const values = response.data.data[attributeName];
      
      if (Array.isArray(values)) {
        const formattedValues = values.map((value) => {
          const stringValue = String(value);
          return {
            // Show decoded label to the user, but keep the original
            // encoded value (with __ia_char) for backend requests.
            label: replaceSpecialCharacter(stringValue),
            value: stringValue,
          };
        });
        
        // Store in cache
        if (cacheKey) {
          filterValuesCache.set(cacheKey, formattedValues);
        }
        
        return formattedValues;
      }
    }
    
    return [];
  } catch (error) {
    console.error("Error fetching filter values:", error);
    return [];
  }
};

/**
 * Clear the filter values cache
 * Useful for testing or when you want to force fresh data
 */
export const clearFilterValuesCache = () => {
  const cacheSizeBefore = filterValuesCache.size;
  filterValuesCache.clear();
};

/**
 * Get cache size (for debugging)
 * @returns {number} Number of cached filter values
 */
export const getCacheSize = () => {
  return filterValuesCache.size;
};

