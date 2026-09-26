import React, { Suspense, lazy } from "react";
import { useSelector } from "react-redux";
import { Typography } from "@mui/material";
import LoadingOverlay from "core/Utils/Loader/loader";

// Lazy load components for better performance
const TableConfigurator = lazy(() =>
  import("core/pages/tableConfigurator")
);
const FilterConfigurator = lazy(() =>
  import("core/pages/filterConfigurator")
);

/**
 * Component mapper - Maps component types to their React components
 */
const COMPONENT_MAPPER = {
  table: TableConfigurator,
  filter: FilterConfigurator,
  filterConfigurator: FilterConfigurator,
  tableConfigurator: TableConfigurator,
};

/**
 * DependentComponent - A component that conditionally renders based on reducer state
 * Can render either text or other components (table, filter) based on configuration
 * @param {Object} props
 * @param {string} props.dependent_on - The field name to check in the reducer (e.g., "showGroupUpload")
 * @param {string} props.reducerKey - The reducer key where the dependent field is stored (e.g., "general-configuration-form")
 * @param {string} props.reducerName - The reducer name (default: "configuratorReducer")
 * @param {string} props.text - The text to display when condition is true (used when componentType is not specified)
 * @param {string} props.componentType - The type of component to render (e.g., "table", "filter")
 * @param {Object} props.componentProps - Props to pass to the mapped component (e.g., filterConfigProps, setUpCallbacks, loaderText, title, shownTables)
 * @param {string} props.loaderText - Custom loader text to display (used when componentType is specified)
 * @param {string} props.title - Custom title/heading to display (used when componentType is specified and isDependentComponent is true)
 * @param {Array<string>} props.shownTables - Array of table names to filter and show (used when componentType is "table")
 * @param {Object} props.style - Custom styles for the component
 */
const DependentComponent = (props) => {
  const {
    dependent_on,
    reducerKey,
    reducerName = "configuratorReducer",
    text = "This content is shown when the condition is true",
    componentType,
    componentProps = {},
    loaderText,
    title,
    shownTables = [],
    style = {},
  } = props;

  // Get the reducer state
  const reducerState = useSelector(
    (state) => state[reducerName]?.[reducerKey]
  );

  // Get screenCode from Redux for TableConfigurator/FilterConfigurator
  const screenCode = useSelector(
    (state) => state.configuratorReducer?.screenCode
  );

  // Get the value of the dependent field
  const dependentValue = reducerState?.[dependent_on];

  // Only render if the dependent value is true
  if (!dependentValue) {
    return null;
  }

  // If componentType is specified, render the mapped component
  if (componentType) {
    const ComponentToRender = COMPONENT_MAPPER[componentType.toLowerCase()];

    if (!ComponentToRender) {
      console.warn(
        `DependentComponent: Unknown component type "${componentType}". Available types: ${Object.keys(COMPONENT_MAPPER).join(", ")}`
      );
      return (
        <div style={{ padding: "16px", ...style }}>
          <Typography variant="body2" color="error">
            Unknown component type: {componentType}
          </Typography>
        </div>
      );
    }

    // Enhance componentProps with screenCode/config_id if needed
    const enhancedComponentProps = { ...componentProps };
    
    // Mark that this component is being used as a dependent component
    enhancedComponentProps.isDependentComponent = true;
    
    // Pass loaderText if provided (for TableConfigurator/FilterConfigurator)
    if (loaderText) {
      enhancedComponentProps.loaderText = loaderText;
    }
    
    // Pass title if provided (for TableConfigurator/FilterConfigurator)
    if (title) {
      enhancedComponentProps.title = title;
    }
    
    // Pass shownTables if provided (for TableConfigurator)
    if (shownTables && shownTables.length > 0) {
      enhancedComponentProps.shownTables = shownTables;
    }
    
    // For TableConfigurator and FilterConfigurator, ensure filterConfigProps has config_id
    if (
      (componentType.toLowerCase() === "table" || 
       componentType.toLowerCase() === "filter" ||
       componentType.toLowerCase() === "tableconfigurator" ||
       componentType.toLowerCase() === "filterconfigurator") &&
      screenCode
    ) {
      enhancedComponentProps.filterConfigProps = {
        ...(componentProps.filterConfigProps || {}),
        config_id: screenCode,
        config_type: componentType.toLowerCase() === "table" ? "tableConfig" : "filterConfig",
      };
    }

    return (
      <div style={style}>
        <Suspense
          fallback={
            <LoadingOverlay
              loader={true}
              text={`Loading ${componentType}...`}
              minHeight="400px"
              size="medium"
            />
          }
        >
          <ComponentToRender {...enhancedComponentProps} />
        </Suspense>
      </div>
    );
  }

  // Default: render text
  return (
    <div style={{ padding: "16px", ...style }}>
      <Typography variant="body1">{text}</Typography>
    </div>
  );
};

export default DependentComponent;

