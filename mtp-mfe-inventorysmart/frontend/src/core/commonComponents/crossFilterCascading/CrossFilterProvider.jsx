import { useMemo } from "react";
import CrossFilterContext from "./CrossFilterContext";
import useCrossFilterCascading from "./useCrossFilterCascading";

/**
 * Provider component that wraps a group of select components to enable
 * cross-filter cascading between them.
 *
 * @param {Object} props
 * @param {Array} props.filters - Array of filter configs (ordered by hierarchy)
 * @param {Function} props.fetchOptionsFn - Async function to fetch options for a filter
 * @param {Object} props.initialSelections - Optional preloaded selections { paramName: values[] }
 * @param {boolean} props.fetchOnMount - Whether to fetch initial options on mount (default: true)
 * @param {Function} props.onSelectionChange - Optional callback on any filter change
 * @param {React.ReactNode} props.children - Child components (selects) that will consume the context
 */
const CrossFilterProvider = ({
  filters,
  fetchOptionsFn,
  initialSelections = {},
  fetchOnMount = true,
  onSelectionChange = null,
  children,
}) => {
  const cascadingState = useCrossFilterCascading({
    filters,
    fetchOptionsFn,
    initialSelections,
    fetchOnMount,
    onSelectionChange,
  });

  const contextValue = useMemo(
    () => ({
      ...cascadingState,
      isEnabled: true,
    }),
    [cascadingState]
  );

  return (
    <CrossFilterContext.Provider value={contextValue}>
      {children}
    </CrossFilterContext.Provider>
  );
};

export default CrossFilterProvider;
