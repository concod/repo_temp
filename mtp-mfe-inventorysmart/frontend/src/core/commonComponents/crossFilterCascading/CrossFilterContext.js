import { createContext, useContext } from "react";

/**
 * Context for cross-filter cascading.
 * Provides cascading state and actions to child select components.
 *
 * Shape:
 * {
 *   optionsMap: { paramName: Array<{label, value}> },
 *   loadingMap: { paramName: boolean },
 *   selectionsMap: { paramName: value[] },
 *   onFilterChange: (paramName, selectedValues) => void,
 *   resetAll: () => void,
 *   resetFilter: (paramName) => void,
 *   fetchOptions: (paramName) => void,
 *   getParamName: (filterConfig) => string,
 *   isEnabled: boolean,  // flag to know if cascading is active
 * }
 */
const CrossFilterContext = createContext(null);

/**
 * Hook to consume cross-filter cascading context.
 * Returns null if not inside a CrossFilterProvider (graceful fallback).
 */
export const useCrossFilterContext = () => {
  return useContext(CrossFilterContext);
};

export default CrossFilterContext;
