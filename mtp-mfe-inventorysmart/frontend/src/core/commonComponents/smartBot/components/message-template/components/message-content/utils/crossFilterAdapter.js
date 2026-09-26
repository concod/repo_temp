import { getFilterOptions } from "core/commonComponents/smartBot/services/chatbot-services";
import { replaceSpecialCharacter, replaceSpecialCharToCharCode } from "core/Utils/functions/utils";

/**
 * Adapter function that bridges the generic useCrossFilterCascading hook
 * with the existing cross-filter API used by the chatbot.
 *
 * This is the `fetchOptionsFn` passed to the CrossFilterProvider.
 *
 * @param {Object} filterConfig - The filter config for which to fetch options
 * @param {Array} existingSelections - Upstream filter selections
 *   Each item: { filterName, attributeName, values, checkAll }
 * @param {Array} allFilters - Full array of all filter configs
 * @param {Object|null} preSelectedFilters - Optional pre-selected filters from init response
 *   Format: { param_name: { values: [...], label, dimension, is_mandatory } }
 * @returns {Promise<Array<{label, value}>>} - Formatted options
 */
export const fetchCrossFilterOptions = async (filterConfig, existingSelections = [], allFilters = [], preSelectedFilters = null) => {
  try {
    const attributeName =
      filterConfig.column_name ||
      filterConfig.attribute_name ||
      filterConfig.param_name ||
      filterConfig.paramName;

    if (!attributeName) return [];

    const dimension = filterConfig.dimension || "product";

    // Build filters array from existing selections (upstream filters with values)
    const filtersArray = existingSelections.map((selection) => {
      // Find full config for this upstream filter
      const fullConfig = allFilters.find(
        (f) =>
          (f.column_name || f.attribute_name || f.param_name || f.paramName) === selection.attributeName
      );

      const selAttrName =
        fullConfig?.column_name ||
        fullConfig?.attribute_name ||
        fullConfig?.param_name ||
        fullConfig?.paramName ||
        selection.attributeName;

      return {
        filter_name: selection.filterName || selAttrName,
        filter_id: selAttrName,
        filter_type: "cascaded",
        dimension: fullConfig?.dimension || dimension,
        display_type: fullConfig?.display_type || "dropdown",
        check_configuration: selection.checkAll ? [{ checkAll: true, meta: {} }] : [],
        is_mandatory: fullConfig?.is_mandatory || fullConfig?.isRequired || false,
        extra: {},
        values: selection.checkAll ? [] : (selection.values || []),
        attribute_name: selAttrName,
        operator: "in",
        display_order: fullConfig?.display_order || fullConfig?.ordering || 0,
      };
    });

    // Build pre-selected filter entries from init response (if provided)
    // These are always included in the payload alongside user selections
    const preSelectedEntries = [];
    if (preSelectedFilters && typeof preSelectedFilters === "object") {
      Object.entries(preSelectedFilters).forEach(([key, config]) => {
        // Skip if this filter is the one we're fetching options for
        if (key === attributeName) return;
        // Skip if user has already selected values for this filter (user selection takes precedence)
        const userAlreadySelected = filtersArray.some(
          (f) => f.attribute_name === key || f.filter_id === key
        );
        if (userAlreadySelected) return;

        const values = Array.isArray(config.values) ? config.values : [];
        if (values.length === 0) return;

        preSelectedEntries.push({
          filter_name: config.label || key,
          filter_id: key,
          filter_type: "cascaded",
          dimension: config.dimension || dimension,
          display_type: "dropdown",
          check_configuration: [],
          is_mandatory: config.is_mandatory || false,
          extra: {},
          values: values.map((v) => replaceSpecialCharToCharCode(String(v))),
          attribute_name: key,
          operator: "in",
          display_order: 0,
        });
      });
    }

    // Merge: pre-selected filters first, then user selections
    const combinedFilters = [...preSelectedEntries, ...filtersArray];

    const payload = {
      attributes: [
        {
          attribute_name: attributeName,
          dimension: dimension,
          filter_type: "cascaded",
        },
      ],
      filter_type: "cascaded",
      filters: combinedFilters,
      is_urm_filter: true,
      screen_name: "Chatbot",
      application_code: 1,
    };

    console.log("[crossFilterAdapter] Fetching options for:", attributeName, "payload:", JSON.stringify(payload, null, 2));
    const response = await getFilterOptions(payload)();
    console.log("[crossFilterAdapter] Response for:", attributeName, "data:", response?.data?.data);

    if (response?.data?.status && response?.data?.data) {
      const responseData = response.data.data;
      const primaryValues = responseData[attributeName];

      // Format the primary filter's options
      let primaryOptions = Array.isArray(primaryValues)
        ? primaryValues.map((value) => {
            const stringValue = String(value);
            return {
              label: replaceSpecialCharacter(stringValue),
              value: stringValue,
            };
          })
        : [];

      // Check if the response contains options for other filters (multi-key response)
      const extraOptionsMap = {};
      Object.keys(responseData).forEach((key) => {
        if (key !== attributeName && Array.isArray(responseData[key])) {
          extraOptionsMap[key] = responseData[key].map((value) => {
            const stringValue = String(value);
            return {
              label: replaceSpecialCharacter(stringValue),
              value: stringValue,
            };
          });
        }
      });

      // If primary options are empty but response has data under other keys,
      // include ALL response keys in extraOptionsMap so the hook can distribute
      // them to matching filters by column_name/attribute_name lookup.
      if (primaryOptions.length === 0 && Object.keys(extraOptionsMap).length > 0) {
        // Also check if any response key matches the paramName directly
        // (e.g., paramName is "brand" but column_name sent was different)
        const altKey = Object.keys(responseData).find((key) => {
          return Array.isArray(responseData[key]) && (
            key === attributeName ||
            key.toLowerCase() === attributeName.toLowerCase()
          );
        });
        if (altKey) {
          primaryOptions = responseData[altKey].map((value) => {
            const stringValue = String(value);
            return {
              label: replaceSpecialCharacter(stringValue),
              value: stringValue,
            };
          });
          delete extraOptionsMap[altKey];
        }
      }

      // Return enriched result with extra options if available
      if (Object.keys(extraOptionsMap).length > 0) {
        primaryOptions.__extraOptionsMap = extraOptionsMap;
      }

      return primaryOptions;
    }

    return [];
  } catch (error) {
    console.error("[crossFilterAdapter] Error fetching options:", error);
    return [];
  }
};
