import { getCurrentApplicationDetails } from "../coreComponentScreen/utils";
import { LANGUAGE_TO_LOCALE_MAP } from "../i18n/constants";

export const groupFiltersByTier = (filters = []) => {
  const tierGroups = {};
  filters.forEach((filter) => {
    const tier = filter.tier || 1;
    if (!tierGroups[tier]) tierGroups[tier] = [];
    tierGroups[tier].push(filter);
  });

  return Object.keys(tierGroups)
    .sort((a, b) => Number(a) - Number(b))
    .map((tier) => tierGroups[tier]);
};

export const hasTiers = (filters = []) => {
  return filters.some((filter) => filter.extra?.tier);
};

export const formatCrossDimensionCascadedFilters = (filter) => {
  return {
    check_configuration: [],
    dimension: filter.dimension,
    filter_id: filter.filter_id,
    filter_name: filter.filter_name,
    filter_type: filter.filter_type,
    display_type: filter.display_type,
    is_mandatory: filter.is_mandatory,
  };
};

export const getFilterLabel = (filter) => {
  if (!filter) return "";
  
  const appCode = getCurrentApplicationDetails()?.applicationCode;
  const langCode = localStorage.getItem(`languagePreference_${appCode}`);
  const locale = LANGUAGE_TO_LOCALE_MAP[langCode] || "en-US";

  // Checking for translations in extra.translations
  const translations = filter?.extra?.translations;
  if (translations) {
    if (translations[locale]) {
      return translations[locale];
    }
  }
  // Fallback to original label when translations are not present 
  return filter.label || "";
};
