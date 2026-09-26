import { Badge} from "impact-ui-v3";

/**
 * Array of light pastel colors with their text colors for good contrast
 * Colors are selected from the design system to be light but still readable
 */
const LIGHT_BADGE_COLORS = [
  { bg: "#F4F1F9", text: "#7552AD" }, // whiteLilac - light purple (for Transaction)
  { bg: "#FFC3D6", text: "#BF6EB6" }, // pink - light pink (purple text)
  { bg: "#FA97B6", text: "#EF767A" }, // sweetPink - light pink
  { bg: "#F0EBEE", text: "#82637B" }, // Eggplant-100 - light purple-grey (for Reporting-Anr)
  { bg: "#F6EDFD", text: "#AE57EA" }, // palePurple - very light purple
  { bg: "#FDF0EC", text: "#E74B1C" }, // provincialPink - light peach
  { bg: "#F6F6F3", text: "#8C6F06" }, // Olive-100 - tan/beige (for Dashboard)
  { bg: "#FACCB8", text: "#F4743B" }, // apriocotPeach - light orange
  { bg: "#AD97CE", text: "#82637B" }, // eastSide - light purple/lavender
  { bg: "#E9F7FC", text: "#1789A5" }, // Cyan-100 - light cyan (for Reporting)
  { bg: "#F6CCCC", text: "#ED9998" }, // lightPink - very light pink
  { bg: "#FD9B70", text: "#ED9C7E" }, // atomicTangerine - light orange/peach
  { bg: "#D9DDE7", text: "#7A8294" }, // lightGreyNew - light grey
  { bg: "#E2E4ED", text: "#60697D" }, // athensGray - neutral grey
];

/**
 * Get a consistent color for a given value
 * Uses a simple hash function to map values to colors
 * @param {string} value - The value to get a color for
 * @returns {Object} Object with bg and text color
 */
export const getColorForValue = (value) => {
  if (!value) return { bg: "#F5F6FA", text: "#60697D" }; // default light gray
  
  // Simple hash function to get consistent color for same value
  let hash = 0;
  const str = String(value).toLowerCase();
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Use absolute value and modulo to get index
  const colorIndex = Math.abs(hash) % LIGHT_BADGE_COLORS.length;
  return LIGHT_BADGE_COLORS[colorIndex];
};

/**
 * Get the cell value from AG Grid params
 * Handles both params.value and params.data[column_name]
 */
const getCellValue = (params) => {
  // Try params.value first (standard AG Grid)
  if (params.value !== undefined && params.value !== null) {
    return params.value;
  }
  // Fallback to params.data[column_name] if value is not available
  if (params.data && params.colDef?.field) {
    return params.data[params.colDef.field];
  }
  return null;
};

const capitalizeFirstLetter = (value) => {
  if (typeof value !== "string" || value.length === 0) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
};

/**
 * Custom Badge component with custom colors
 * Wraps the Badge in a styled container to ensure colors are applied
 */
const ColoredBadge = ({ label, colors, onClick = null }) => {
  return (
    <div
      onClick={onClick || undefined}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "4px 12px",
        borderRadius: "16px",
        backgroundColor: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.bg}`,
        fontSize: "12px",
        fontWeight: 500,
        lineHeight: "16px",
        whiteSpace: "nowrap",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      {label}
    </div>
  );
};

/**
 * Renders data source column value as multiple colorful badges (comma-separated or array)
 * Each data source gets a different color based on its value
 * @param {Object} params - AG Grid cell renderer parameters
 * @returns {JSX.Element|null} Div containing multiple badges or null if no value
 */
export const renderDataSourceBadge = (params) => {
  const value = getCellValue(params);
  if (!value) return null;

  const shouldCapitalize = params?.colDef?.field !== "kpi_list";
  
  // Handle array format
  let dataSources = [];
  if (Array.isArray(value)) {
    dataSources = value.filter(Boolean);
  } else {
    // Handle comma-separated string format
    dataSources = String(value).split(",").map((ds) => ds.trim()).filter(Boolean);
  }
  
  if (dataSources.length === 0) return null;
  
  return (
    <div style={{ 
      display: "flex", 
      gap: "8px", 
      alignItems: "center",
      height: "100%",
      flexWrap: "wrap"
    }}>
      {dataSources.map((dataSource, index) => {
        const colors = getColorForValue(dataSource);
        return <ColoredBadge key={index} label={shouldCapitalize ?  capitalizeFirstLetter(dataSource) : dataSource} colors={colors} />;
      })}
    </div>
  );
};

/**
 * Renders format column value as a colorful badge
 * @param {Object} params - AG Grid cell renderer parameters
 * @returns {JSX.Element|null} Badge component or null if no value
 */
export const renderFormatBadge = (params) => {
  const value = getCellValue(params);
  if (!value) return null;
  
  const colors = getColorForValue(value);
  
  return <ColoredBadge label={capitalizeFirstLetter(value)} colors={colors} />;
};


//  Renders modules column value as multiple colorful badges (comma-separated)
//   Each module gets a different color based on its value
//   Shows only first 3 modules, then a "+X" badge if there are more
//   @param {Object} params - AG Grid cell renderer parameters
//   @returns {JSX.Element|null} Div containing multiple badges or null if no value
 
export const renderModulesBadges = (params) => {
  const value = getCellValue(params);
  
  if (!value) return null;

  const modules = String(value).split(",").map((m) => m.trim()).filter(Boolean);
  
  // Show only first 3 modules
  const maxVisible = 3;
  const visibleModules = modules.slice(0, maxVisible);
  const remainingCount = modules.length - maxVisible;
  
  // Get the callback function from gridOptions
  const onShowAllModules = params?.api?.gridOptionsWrapper?.gridOptions?.onShowAllModules;
  
  const handleShowAllClick = (e) => {
    e.stopPropagation();
    if (onShowAllModules) {
      onShowAllModules(modules);
    }
  };
  
  return (
    <div style={{ 
      display: "flex", 
      gap: "8px", 
      alignItems: "center",
      height: "100%",
      flexWrap: "wrap"
    }}>
      {visibleModules.map((module, index) => {
        const colors = getColorForValue(module);
        return <ColoredBadge key={index} label={module} colors={colors} />;
      })}
      {remainingCount > 0 && (
        <ColoredBadge 
          label={`+${remainingCount}`} 
          colors={{ bg: "#F5F6FA", text: "#60697D" }} 
          onClick={handleShowAllClick}
        />
      )}
    </div>
    );
  };

/**
 * Renders limited badges (for Calculated Fields - shows only 2, then "+X")
 * Shows only first 2 items, then a "+X" badge if there are more
 * @param {Object} params - AG Grid cell renderer parameters
 * @returns {JSX.Element|null} Div containing multiple badges or null if no value
 */
export const renderLimitedBadges = (params) => {
  const value = getCellValue(params);
  
  if (!value) return null;

  const shouldCapitalize = params?.colDef?.field !== "kpi_list";
  
  // Handle array format
  let items = [];
  if (Array.isArray(value)) {
    items = value.filter(Boolean);
  } else {
    // Handle comma-separated string format
    items = String(value).split(",").map((item) => item.trim()).filter(Boolean);
  }
  
  if (items.length === 0) return null;
  
  // Show only first 2 items
  const maxVisible = 2;
  const visibleItems = items.slice(0, maxVisible);
  const remainingCount = items.length - maxVisible;
  
  // Get the callback function from gridOptions
  const onShowAllItems = params?.api?.gridOptionsWrapper?.gridOptions?.onShowAllItems;
  
  const handleShowAllClick = (e) => {
    e.stopPropagation();
    if (onShowAllItems) {
      onShowAllItems(items);
    }
  };
  
  return (
    <div style={{ 
      display: "flex", 
      gap: "8px", 
      alignItems: "center",
      height: "100%",
      flexWrap: "wrap"
    }}>
      {visibleItems.map((item, index) => {
        const colors = getColorForValue(item);
        return (
          <ColoredBadge 
            key={index} 
            label={shouldCapitalize ? capitalizeFirstLetter(item) : item} 
            colors={colors} 
          />
        );
      })}
      {remainingCount > 0 && (
        <ColoredBadge 
          label={`+${remainingCount}`} 
          colors={{ bg: "#F5F6FA", text: "#60697D" }} 
          onClick={handleShowAllClick}
        />
      )}
    </div>
  );
};
