import { timeWindowSelections, filterOptions, rollingPeriodMaxCaps } from "./constants";
import moment from "moment";

/**
 * Maps API operator symbols to the UI-friendly symbols used in the formula canvas.
 */
export const mapApiOperatorToUiOperator = (op) => {
  if (!op) return op;
  if (op === "*") return "×";
  if (op === "-") return "−";
  return op;
};

export const toTitleCase = (val) => {
  if (!val) return "";
  const s = val.toString();
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const normalizeUnitToken = (val) => {
  if (!val) return "";
  const normalized = val.toString().trim().toLowerCase();
  // Normalize pluralization for matching (day/days, week/weeks, etc.)
  return normalized.endsWith("s") ? normalized.slice(0, -1) : normalized;
};

/**
 * Maps API rolling unit values to the UI option value for the Rolling Periods unit selector.
 *
 * @param {*} unit API unit value (commonly "day(s)", "week(s)", etc.).
 * @returns {string} UI unit option value (e.g. "Days") or a best-effort title-cased fallback.
 */
const mapApiRollingUnitToUi = (unit) => {
  if (!unit) return "";

  const rollingConfig = timeWindowSelections?.find((t) => t?.value === "rolling");
  const rollingOptions = rollingConfig?.options || [];
  const normalizedApi = normalizeUnitToken(unit);

  const match = rollingOptions.find((opt) => normalizeUnitToken(opt?.value) === normalizedApi);
  // For Rolling Periods select, we store the option.value (e.g. "Days")
  return match?.value || toTitleCase(unit);
};

/**
 * Maps API location filter values to the UI option value.
 * Falls back to the first configured location option (or "Store") if no match.
 *
 * @param {*} locationType API location type (e.g. "Store", "Region").
 * @returns {string} UI location filter value.
 */
const mapApiLocationToUi = (locationType) => {
  const defaultValue = filterOptions?.locationFilterOptions?.[0]?.value || "Store";
  if (!locationType) return defaultValue;

  const normalized = locationType.toString().trim().toLowerCase();
  const match = (filterOptions?.locationFilterOptions || []).find(
    (opt) => (opt?.value || "")?.toString?.().trim().toLowerCase() === normalized
  );

  return match?.value || defaultValue;
};

/**
 * Maps an API time window object to the UI state shape used by the KPI configurator.
 * @param {*} timeWindow API time window object.
 * @returns {{
 *  timeWindow: string,
 *  rollingPeriods: string,
 *  numericInput: (string|null),
 *  selectedUnit: (string|null),
 *  unit: string,
 *  unitLabel: string,
 *  startDate: (string|null),
 *  endDate: (string|null),
 *  useLatestAvailableDate: boolean
 * }} UI-compatible time window state.
 */
const mapApiTimeWindowToUi = (timeWindow) => {
  if (!timeWindow || typeof timeWindow !== "object") {
    return {
      timeWindow: "Dynamic",
      rollingPeriods: "rolling",
      numericInput: null,
      selectedUnit: null,
      unit: "",
      unitLabel: "",
      startDate: null,
      endDate: null,
      useLatestAvailableDate: false
    };
  }

  const type = (timeWindow.type || "")?.toString?.().toLowerCase();

  if (type === "static") {
    return {
      timeWindow: "Static",
      rollingPeriods: "rolling",
      numericInput: "",
      selectedUnit: "",
      unit: "",
      unitLabel: "",
      startDate: timeWindow.start_date || "",
      endDate: timeWindow.end_date || "",
      useLatestAvailableDate: !timeWindow.end_date
    };
  }

  if (type === "rolling") {
    return {
      timeWindow: "Dynamic",
      rollingPeriods: "rolling",
      numericInput: timeWindow.value !== null && timeWindow.value !== undefined ? `${timeWindow.value}` : "",
      selectedUnit: mapApiRollingUnitToUi(timeWindow.unit),
      unit: "",
      unitLabel: "",
      startDate: null,
      endDate: null,
      useLatestAvailableDate: false
    };
  }

  const unitValue = (timeWindow.unit || "")?.toString?.().trim();
  const typeValue = type;

  const typeConfig = timeWindowSelections?.find((t) => t?.value === typeValue);
  const unitOption = typeConfig?.options?.find((opt) => opt?.value === unitValue);
  const unitLabel = unitOption?.label || "";

  return {
    timeWindow: "Dynamic",
    rollingPeriods: typeValue || "rolling",
    numericInput: "",
    selectedUnit: "",
    unit: unitValue,
    unitLabel,
    startDate: null,
    endDate: null,
    useLatestAvailableDate: false
  };
};

/**
 * Converts API formula components to the UI formula component array.
 *
 * Notes:
 * - Components are sorted by `ord` to preserve the server-defined ordering.
 * - IDs are generated client-side for rendering and editing purposes.
 * - Field metadata is resolved using the provided `fields` list (source + label/name).
 *
 * @param {*} apiComponents API formula components array.
 * @param {Array} fields Available fields metadata array used to resolve labels/types.
 * @returns {Array} UI formula components.
 */
export const mapApiFormulaComponentsToUi = (apiComponents, fields = []) => {
  if (!Array.isArray(apiComponents)) return [];

  const ordered = [...apiComponents].sort((a, b) => (a?.ord || 0) - (b?.ord || 0));

  return ordered
    .map((item) => {
      if (!item) return null;

      if (item.component_type === "operator") {
        return {
          id: Date.now() + Math.random(),
          type: "operator",
          value: mapApiOperatorToUiOperator(item.literal_value)
        };
      }

      if (item.component_type === "literal" || item.component_type === "constant") {
        return {
          id: Date.now() + Math.random(),
          type: "constant",
          value: item.literal_value?.toString?.() ?? ""
        };
      }

      if (item.component_type === "parenthesis_open" || item.component_type === "parenthesis_close") {
        return {
          id: Date.now() + Math.random(),
          type: "parenthesis",
          value: item.component_type === "parenthesis_open" ? "(" : ")"
        };
      }

      if (item.component_type === "function") {
        const dataSourceValue = (item.data_source || "")?.toString?.().toLowerCase();

        const matchingField = fields
          ?.filter((f) => (f?.source || "")?.toString?.().toLowerCase() === dataSourceValue)
          ?.find((f) => f?.field_label === item.field_label || f?.field_name === item.field_label);

        const fieldObj = matchingField
          ? { label: matchingField.field_label, value: matchingField.field_name, dataType: matchingField.data_type }
          : { label: item.field_label || "", value: item.field_label || "" };

        const dataSourceObj = dataSourceValue
          ? { label: dataSourceValue.charAt(0).toUpperCase() + dataSourceValue.slice(1), value: dataSourceValue }
          : null;

        const functionParams = item.function_params || {};
        const locationFilter = mapApiLocationToUi(functionParams.location_type);
        const timeWindowUi = mapApiTimeWindowToUi(functionParams.time_window);

        return {
          id: Date.now() + Math.random(),
          type: "component",
          dataSource: dataSourceObj,
          field: fieldObj,
          function: item.function_name ? { label: item.function_name, value: item.function_name } : "",
          locationFilter,
          selectedLocations: [locationFilter],
          timeWindow: timeWindowUi.timeWindow,
          rollingPeriods: timeWindowUi.rollingPeriods,
          numericInput: timeWindowUi.numericInput,
          selectedUnit: timeWindowUi.selectedUnit,
          unit: timeWindowUi.unit,
          unitLabel: timeWindowUi.unitLabel,
          startDate: timeWindowUi.startDate,
          endDate: timeWindowUi.endDate,
          useLatestAvailableDate: timeWindowUi.useLatestAvailableDate
        };
      }

      return null;
    })
    .filter(Boolean);
};

/**
 * Derives a module -> componentIds mapping from KPI details.
 *
 * Supports multiple API shapes:
 * - `details.module_components` as an object map of { [moduleId]: componentId[] }
 * - `details.module_mapping` as an array of { module_id, components: [{ component_id }] }
 * - Legacy `details.modules` as comma-separated module ids, expanded using `moduleList`
 *
 * @param {*} details KPI details payload.
 * @param {Array} moduleList Module list with nested components used for legacy expansion.
 * @returns {Record<string, Array>} Mapping of module id to component ids.
 */
export const deriveModuleMappingFromDetails = (details, moduleList) => {
  if (!details) return {};
  if (
    details.module_components &&
    typeof details.module_components === "object" &&
    !Array.isArray(details.module_components)
  ) {
    const result = {};
    Object.entries(details.module_components).forEach(([moduleId, componentIds]) => {
      if (!moduleId) return;
      const normalizedModuleId = moduleId?.toString?.();
      if (!normalizedModuleId) return;

      const normalizedComponentIds = (Array.isArray(componentIds) ? componentIds : [])
        .filter((x) => x !== null && x !== undefined);

      result[normalizedModuleId] = normalizedComponentIds;
    });
    return result;
  }

  if (Array.isArray(details.module_mapping)) {
    const result = {};
    details.module_mapping.forEach((m) => {
      const moduleId = m?.module_id?.toString?.();
      if (!moduleId) return;
      const componentIds = (m?.components || [])
        .map((c) => c?.component_id)
        .filter((x) => x !== null && x !== undefined);
      result[moduleId] = componentIds;
    });
    return result;
  }

  const modulesValue = details.modules;
  if (!modulesValue || !moduleList?.length) return {};

  const moduleIds = modulesValue
    .toString()
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const result = {};
  moduleIds.forEach((id) => {
    const moduleObj = moduleList.find((m) => m?.module_id?.toString?.() === id);
    const componentIds = (moduleObj?.components || [])
      .map((c) => c?.component_id)
      .filter((x) => x !== null && x !== undefined);
    result[id] = componentIds;
  });
  return result;
};

// Generate time window text for formula display
const generateTimeWindowText = (component) => {
  if (component.timeWindow === "Dynamic") {
    const rollingType = component.rollingPeriods;

    if (rollingType === "rolling") {
      if (component.numericInput && component.selectedUnit) {
        return `${component.numericInput} ${component.selectedUnit}`;
      }
      return "";
    }

    // For all other rolling types (To-Date, Latest Anchor, Relative), use the unitLabel for display
    return component.unitLabel || "";
  }

  return component.timeWindow || "";
};

// Generate formula display string
export const generateFormulaDisplay = (formulaComponents) => {
  return formulaComponents.map(comp => {
    if (comp.type === 'component') {
      const timeWindow = generateTimeWindowText(comp);
      const location = comp.locationFilter || "";
      return `${comp.function?.label}([${comp.field?.label}], ${timeWindow}, ${location})`;
    } else if (comp.type === 'operator') {
      return ` ${comp.value} `;
    } else if (comp.type === 'parenthesis') {
      return comp.value;
    } else if (comp.type === 'constant') {
      return comp.value;
    }
    return '';
  }).join('');
};

// Build formula_components array for API
export const buildFormulaComponents = (formulaComponents) => {
  return formulaComponents.map((comp, index) => {
    const baseComponent = {
      ord: index + 1
    };

    if (comp.type === 'parenthesis') {
      return {
        ...baseComponent,
        component_type: comp.value === '(' ? 'parenthesis_open' : 'parenthesis_close'
      };
    }

    if (comp.type === 'operator') {
      return {
        ...baseComponent,
        component_type: 'operator',
        literal_value: comp.value
      };
    }

    if (comp.type === 'constant') {
      return {
        ...baseComponent,
        component_type: 'constant',
        literal_value: comp.value
      };
    }

    if (comp.type === 'component') {
      const functionParams = {
        location_type: comp.locationFilter?.toLowerCase() || ""
      };

      // Build time_window object based on timeWindow type
      if (comp.timeWindow === "Dynamic") {
        const rollingType = comp.rollingPeriods;

        if (rollingType === "rolling") {
          functionParams.time_window = {
            type: "rolling",
            value: parseInt(comp.numericInput) || 0,
            unit: comp.selectedUnit?.toLowerCase() || ""
          };
          
          // Add direction field if Next toggle is enabled
          if (comp.enableNextToggle) {
            functionParams.time_window.direction = "next";
          }
        } else {
          // For To-Date, Latest Anchor, and Relative Periods
          // rollingType already contains the API-compatible type value
          functionParams.time_window = {
            type: rollingType,
            unit: comp.unit || ""
          };
        }
      } else {
        // Static time window
        functionParams.time_window = {
          type: "static",
          start_date: moment(comp.startDate).format("YYYY-MM-DD") || "",
        };
        if (comp.endDate) {
          functionParams.time_window.end_date = moment(comp.endDate).format("YYYY-MM-DD") || "";
        }
      }

      return {
        ...baseComponent,
        component_type: 'function',
        function_name: comp.function?.label || "",
        field_label: comp.field?.label || comp.field || "",
        data_source: comp.dataSource?.value.toLowerCase() || "",
        function_params: functionParams
      };
    }

    return baseComponent;
  });
};

//Parding the formula expression in the edit flow
export const parseFormulaExpression = (expression, fieldsMap) => {
  if (!expression || typeof expression !== 'string') return [];

  const tokens = expression
    .replace(/\(/g, ' ( ')
    .replace(/\)/g, ' ) ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return tokens.map((token) => {
    if (token === '(' || token === ')') {
      return { type: 'parenthesis', value: token };
    }
    if (['+', '-', '*', '/', '×', '−'].includes(token)) {
      const normalized = token === '×' ? '*' : token === '−' ? '-' : token;
      return { type: 'operator', value: normalized };
    }
    if (!Number.isNaN(Number(token))) {
      return { type: 'constant', value: token };
    }

    // Expression from backend uses field_value (not label). Try to map back to label.
    const mappedLabel = Object.keys(fieldsMap || {}).find((label) => fieldsMap[label] === token);
    return { type: 'field', value: mappedLabel || token };
  });
};


//Normalizing the date value to pre select the date in the date picker
export const normalizeDateValue = (value) => {
  if (value === null || value === undefined || value === "") return null;
  if (moment.isMoment(value)) return value;
  if (value instanceof Date) {
    const parsed = moment(value);
    return parsed.isValid() ? parsed : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    // Prefer strict parsing for API dates like "YYYY-MM-DD".
    const parsed = /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
      ? moment(trimmed, "YYYY-MM-DD", true)
      : moment(trimmed);

    return parsed.isValid() ? parsed : null;
  }

  const parsed = moment(value);
  return parsed.isValid() ? parsed : null;
};

/**
 * Reconstructs fiscal date range object from saved dates by finding matching fiscal calendar entries
 * @returns - Fiscal date range object with fiscalInfoStartDate and fiscalInfoEndDate, or null if not found
 */
export const reconstructFiscalDateRange = (startDate, endDate, fiscalCalendarData) => {
  if (!startDate || !endDate || !fiscalCalendarData?.length) {
    return null;
  }

  const startDateStr = moment(startDate).format("YYYY-MM-DD");
  const endDateStr = moment(endDate).format("YYYY-MM-DD");
  
  // Find matching fiscal calendar entries
  let fiscalInfoStartDate = null;
  let fiscalInfoEndDate = null;
  
  fiscalCalendarData.forEach((fiscalDate) => {
    const weekStartDate = moment(fiscalDate.calendar_week_start_date).format("YYYY-MM-DD");
    const weekEndDate = moment(fiscalDate.fiscal_week_end_date).format("YYYY-MM-DD");
    
    // Match start date with calendar_week_start_date
    if (weekStartDate === startDateStr) {
      fiscalInfoStartDate = {
        ...fiscalDate,
        actualSelectedDate: moment(startDate).format("DD-MM-YYYY")
      };
    }
    
    // Match end date with fiscal_week_end_date
    if (weekEndDate === endDateStr) {
      fiscalInfoEndDate = {
        ...fiscalDate,
        actualSelectedDate: moment(endDate).format("DD-MM-YYYY")
      };
    }
  });
  
  if (fiscalInfoStartDate && fiscalInfoEndDate) {
    return {
      fiscalInfoStartDate,
      fiscalInfoEndDate
    };
  }
  
  return null;
};

// Get max cap for a given data source, unit, and direction (last/next)
 
export const getMaxCapForRollingPeriod = (dataSource, unit, isNext = false) => {
  if (!dataSource || !unit) return null;

  const sourceValue = dataSource.value?.toLowerCase();
  
  if (sourceValue === 'transaction') {
    return rollingPeriodMaxCaps.transaction[unit] || null;
  } else if (sourceValue === 'forecast') {
    const direction = isNext ? 'next' : 'last';
    return rollingPeriodMaxCaps.forecast[direction][unit] || null;
  }
  return null;
};

/*
 * Get filtered unit options based on numeric input (Rule 1: Number → Unit)
 * Filters out units where the numeric value exceeds the max cap
 */
export const getFilteredUnitOptions = (options, numericValue, selectedDataSource, enableNextToggle) => {
  if (!numericValue || numericValue.trim() === '' || !selectedDataSource) {
    return options;
  }
  
  const num = parseInt(numericValue, 10);
  if (isNaN(num)) return options;
  
  return options.filter(option => {
    const maxCap = getMaxCapForRollingPeriod(selectedDataSource, option.value, enableNextToggle);
    return maxCap === null || num <= maxCap;
  });
};

/**
 * Validate and cap numeric input based on selected unit (Rule 2: Unit → Number)
 * Returns the capped value if it exceeds the max cap
 */
export const validateAndCapNumericInput = (value, unit, selectedDataSource, enableNextToggle) => {
  if (!value || value.trim() === '' || !unit || !selectedDataSource) {
    return value;
  }
  
  const num = parseInt(value, 10);
  if (isNaN(num)) return value;
  
  const maxCap = getMaxCapForRollingPeriod(selectedDataSource, unit, enableNextToggle);
  if (maxCap !== null && num > maxCap) {
    return maxCap.toString();
  }
  
  return value;
};