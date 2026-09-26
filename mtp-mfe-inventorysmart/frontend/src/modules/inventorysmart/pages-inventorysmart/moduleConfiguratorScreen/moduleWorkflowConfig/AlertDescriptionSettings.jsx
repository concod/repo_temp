import { useEffect, useState, useCallback } from "react";
import { useDispatch } from "react-redux";
import LoadingOverlay from "core/Utils/Loader/loader";
import { addSnack } from "core/actions/snackbarActions";
import axiosInstance from "core/Utils/axios";
import { WORKFLOW_CONFIG_FETCH, WORKFLOW_CONFIG_UPDATE } from "config/api";
import styles from "../designSystem.module.css";

const DEFAULT_IDENTIFIER = "alerts";
const DEFAULT_ATTRIBUTE_KEY = "generic_alert_mapping";

// Alert tab list uses the same structure as generic_alert_mapping
const ALERT_TAB_LIST_KEY = "alert_tab_list";

const inputStyle = {
  width: "70px",
  padding: "6px 10px",
  borderRadius: "6px",
  border: "1px solid #D9DDE7",
  fontSize: "13px",
  textAlign: "center",
  outline: "none",
};

const checkboxStyle = {
  width: "16px",
  height: "16px",
  cursor: "pointer",
  accentColor: "#3B5CD6",
};

const headerStyle = {
  padding: "12px 16px",
  borderBottom: "2px solid #D9DDE7",
  backgroundColor: "#F8F9FC",
  borderRadius: "8px 8px 0 0",
};

const rowBaseStyle = {
  padding: "14px 16px",
  borderBottom: "1px solid #E8EAF0",
  transition: "background-color 0.15s",
};

const evenRowStyle = { ...rowBaseStyle, backgroundColor: "#FFFFFF" };
const oddRowStyle = { ...rowBaseStyle, backgroundColor: "#F8F9FC" };

const cellStyles = {
  name: { flex: "2", minWidth: "180px", paddingRight: "12px" },
  description: { flex: "3", minWidth: "200px", paddingRight: "16px" },
  input: { width: "100px", textAlign: "center" },
  checkbox: { width: "40px" },
};

const placeholderSpan = <span style={{ color: "#B0B7C3" }}>-</span>;

const HEADER_COLUMNS = [
  { label: "Alert Name", style: { flex: "2", minWidth: "180px" } },
  { label: "Description", style: { flex: "3", minWidth: "200px" } },
  { label: "Percentage (%)", style: { width: "100px", textAlign: "center" }, showForGeneric: true },
  { label: "Weeks", style: { width: "100px", textAlign: "center" }, showForGeneric: true },
];

/**
 * Parses alert descriptions for display.
 * Returns an array of { alertKey, name, description, percentage, weeks } for alerts.
 * - For generic alerts: extracts percentage and weeks from description for editing
 * - For custom alerts: plain text description, no percentage/weeks extraction
 * Handles both standard alert_response structure and custom alert mapping structure.
 */
const parseAlertDescriptions = (config, allowedKeys) => {
  if (!config || typeof config !== "object") return [];

  const editableAlerts = [];

  Object.entries(config).forEach(([alertKey, alertData]) => {
    // If allowedKeys is provided, only include those alerts
    if (allowedKeys && allowedKeys.length > 0 && !allowedKeys.includes(alertKey)) return;

    // Handle standard alert_response structure (generic alerts)
    let desc, name;
    if (alertData?.alert_response?.description) {
      desc = alertData.alert_response.description;
      name = alertData.alert_response.name || alertKey;

      // Extract percentage: matches patterns like ±40%, +/-30%, +-65%
      const percMatch = desc.match(/[±+\-/]*(\d+)%/);
      // Extract weeks: matches patterns like "4 weeks", "past 4 weeks", "next 4 weeks"
      const weeksMatch = desc.match(/(\d+)\s*weeks?/i);

      // Include all generic alerts (for hide/show functionality)
      editableAlerts.push({
        alertKey,
        name,
        description: desc,
        percentage: percMatch ? parseInt(percMatch[1], 10) : null,
        weeks: weeksMatch ? parseInt(weeksMatch[1], 10) : null,
      });
    }
    // Handle custom alert mapping structure (po_description, description, etc.)
    else if (alertData?.po_description) {
      desc = alertData.po_description;
      name = alertData.po_name || alertKey;
      editableAlerts.push({
        alertKey,
        name,
        description: desc,
        percentage: null,
        weeks: null,
      });
    } else if (alertData?.description) {
      desc = alertData.description;
      name = alertData.auto_alloc_alert_label || alertData.name || alertData.po_name || alertKey;
      editableAlerts.push({
        alertKey,
        name,
        description: desc,
        percentage: null,
        weeks: null,
      });
    }
  });

  return editableAlerts;
};

/**
 * Reconstructs the description string with updated percentage and weeks values.
 */
const reconstructDescription = (originalDesc, newPercentage, newWeeks) => {
  let updated = originalDesc;

  if (newPercentage !== null && newPercentage !== undefined) {
    // Replace percentage patterns: ±40%, +/-30%, +-65%, etc.
    updated = updated.replace(/([±+\-/]*)(\d+)(%)/, `$1${newPercentage}$3`);
  }

  if (newWeeks !== null && newWeeks !== undefined) {
    // Replace weeks patterns: "4 weeks", "4 week"
    updated = updated.replace(/(\d+)(\s*weeks?)/i, `${newWeeks}$2`);
  }

  return updated;
};

/**
 * Updates the description in the config based on the alert structure.
 * Handles both standard alert_response structure and custom alert mapping structure.
 */
const updateDescriptionInConfig = (updatedConfig, alertKey, newDescription) => {
  if (updatedConfig[alertKey]?.alert_response?.description) {
    // Standard structure
    updatedConfig[alertKey].alert_response.description = newDescription;
  } else if (updatedConfig[alertKey]?.po_description) {
    // Custom structure with po_description
    updatedConfig[alertKey].po_description = newDescription;
  } else if (updatedConfig[alertKey]?.description) {
    // Custom structure with description
    updatedConfig[alertKey].description = newDescription;
  }
};

const AlertDescriptionSettings = (props) => {
  const [fullConfig, setFullConfig] = useState(null);
  const [editableAlerts, setEditableAlerts] = useState([]);
  const [checkedAlerts, setCheckedAlerts] = useState({});
  const [editedDescriptions, setEditedDescriptions] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useDispatch();

  // Get identifier and attribute_key from props or use defaults
  const IDENTIFIER = props.filterConfigProps?.identifier || DEFAULT_IDENTIFIER;
  const ATTRIBUTE_KEY = props.filterConfigProps?.attribute_key || DEFAULT_ATTRIBUTE_KEY;

  // Determine if this is custom alert mapping (no percentage/weeks editing)
  // alert_tab_list uses the same structure as generic_alert_mapping
  const isCustomAlertMapping = ATTRIBUTE_KEY !== DEFAULT_ATTRIBUTE_KEY && ATTRIBUTE_KEY !== ALERT_TAB_LIST_KEY;

  // Fetch TWC config on mount
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        const resp = await axiosInstance({
          url: WORKFLOW_CONFIG_FETCH,
          method: "POST",
          data: {
            identifier: IDENTIFIER,
            attribute_keys: [ATTRIBUTE_KEY],
            include_config: true,
          },
        });

        const items = resp?.data?.data || [];
        const alertItem = items.find(
          (item) => item.attribute_key === ATTRIBUTE_KEY
        );

        if (alertItem?.config) {
          setFullConfig(alertItem.config);
          const allowedKeys = props.filterConfigProps?.alert_keys || [];
          const parsed = parseAlertDescriptions(alertItem.config, allowedKeys);
          setEditableAlerts(parsed);
          setCheckedAlerts(
            Object.fromEntries(parsed.map((a) => [a.alertKey, true]))
          );
        }
      } catch (error) {
        console.error("Error fetching alert config:", error);
        dispatch(
          addSnack({
            message: "Failed to load alert configuration",
            options: { variant: "error" },
          })
        );
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [props.filterConfigProps?.alert_keys, IDENTIFIER, ATTRIBUTE_KEY, dispatch]);

  // Handle checkbox toggle
  const handleCheckboxToggle = useCallback((alertKey) => {
    setCheckedAlerts((prev) => ({
      ...prev,
      [alertKey]: !prev[alertKey],
    }));
  }, []);

  // Handle description change for custom alerts
  const handleDescriptionChange = useCallback((alertKey, value) => {
    setEditedDescriptions((prev) => ({
      ...prev,
      [alertKey]: value,
    }));
  }, []);

  // Handle input change for percentage or weeks
  const handleValueChange = useCallback((alertKey, field, value) => {
    const numValue = value === "" ? null : parseInt(value, 10);
    setEditableAlerts((prev) =>
      prev.map((alert) =>
        alert.alertKey === alertKey
          ? { ...alert, [field]: numValue }
          : alert
      )
    );
  }, []);

  // Render input field helper
  const renderInput = useCallback((value, min, max, alertKey, field) => {
    if (value === null) return placeholderSpan;
    return (
      <input
        type="number"
        min={min}
        max={max}
        value={value ?? ""}
        onChange={(e) => handleValueChange(alertKey, field, e.target.value)}
        style={inputStyle}
      />
    );
  }, [handleValueChange]);

  // Save function - registered with sticky footer
  const saveAlertDescriptions = useCallback(async () => {
    if (!fullConfig) {
      dispatch(
        addSnack({
          message: "No configuration loaded to save",
          options: { variant: "error" },
        })
      );
      return false;
    }

    try {
      const updatedConfig = structuredClone(fullConfig);

      // Update descriptions and is_active based on checkbox state
      editableAlerts.forEach(({ alertKey, percentage, weeks }) => {
        // For custom alerts, use edited description if provided
        if (isCustomAlertMapping && editedDescriptions[alertKey]) {
          updateDescriptionInConfig(updatedConfig, alertKey, editedDescriptions[alertKey]);
        }
        // For generic alerts, reconstruct description with percentage/weeks
        else {
          // Get original description based on structure
          let originalDesc;
          if (updatedConfig[alertKey]?.alert_response?.description) {
            originalDesc = updatedConfig[alertKey].alert_response.description;
          } else if (updatedConfig[alertKey]?.po_description) {
            originalDesc = updatedConfig[alertKey].po_description;
          } else if (updatedConfig[alertKey]?.description) {
            originalDesc = updatedConfig[alertKey].description;
          }

          if (originalDesc && (percentage !== null || weeks !== null)) {
            const newDesc = reconstructDescription(originalDesc, percentage, weeks);
            updateDescriptionInConfig(updatedConfig, alertKey, newDesc);
          }
        }
        // Set is_active based on checkbox state
        updatedConfig[alertKey].is_active = checkedAlerts[alertKey] !== false;
      });

      // For custom alert mapping, filter config to only include allowed alert keys
      let configToSend = updatedConfig;
      if (isCustomAlertMapping) {
        const allowedKeys = props.filterConfigProps?.alert_keys || [];
        configToSend = {};
        allowedKeys.forEach((key) => {
          if (updatedConfig[key]) {
            configToSend[key] = updatedConfig[key];
          }
        });
      }

      const payload = {
        workflow_configs: [
          {
            attribute_key: ATTRIBUTE_KEY,
            config: configToSend,
          },
        ],
      };

      await axiosInstance({
        url: WORKFLOW_CONFIG_UPDATE,
        method: "POST",
        data: payload,
      });

      // Update local state with new config
      setFullConfig(updatedConfig);

      // Clear edited descriptions after successful save
      setEditedDescriptions({});

      dispatch(
        addSnack({
          message: "Alert descriptions saved successfully",
          options: { variant: "success" },
        })
      );
      return true;
    } catch (error) {
      console.error("Error saving alert descriptions:", error);
      dispatch(
        addSnack({
          message: "Failed to save alert descriptions",
          options: { variant: "error" },
        })
      );
      return false;
    }
  }, [fullConfig, ATTRIBUTE_KEY, editableAlerts, checkedAlerts, editedDescriptions, isCustomAlertMapping, dispatch]);

  // Register save callback with parent
  useEffect(() => {
    if (props.setUpCallbacks) {
      props.setUpCallbacks({ nextNavFunc: saveAlertDescriptions });
    }
  }, [saveAlertDescriptions]);

  return (
    <LoadingOverlay loader={isLoading} spinner>
      <div
        className={`${styles.flex} ${styles.flexCol}`}
        style={{ overflowY: "auto", maxHeight: "100%", padding: "16px 0" }}
      >
        {!isLoading && editableAlerts.length === 0 && (
          <div
            className={`${styles.flex} ${styles.itemsCenter} ${styles.justifyCenter} ${styles.p24}`}
            style={{ color: "#60697D" }}
          >
            <span className={`${styles.text14} ${styles.fontMedium}`}>
              No editable alert descriptions found
            </span>
          </div>
        )}

        {editableAlerts.length > 0 && (
          <div className={`${styles.flex} ${styles.flexCol}`}>
            <div
              className={`${styles.flex} ${styles.itemsCenter}`}
              style={headerStyle}
            >
              <div style={{ width: "40px" }} />
              {HEADER_COLUMNS.map(({ label, style, showForGeneric }) => (
                (!showForGeneric || !isCustomAlertMapping) && (
                  <div key={label} style={style}>
                    <span className={`${styles.text12} ${styles.fontBold}`} style={{ color: "#31416E" }}>
                      {label}
                    </span>
                  </div>
                )
              ))}
            </div>

            {editableAlerts.map((alert, index) => (
              <div
                key={alert.alertKey}
                className={`${styles.flex} ${styles.itemsCenter}`}
                style={index % 2 === 0 ? evenRowStyle : oddRowStyle}
              >
                <div style={cellStyles.checkbox}>
                  <input
                    type="checkbox"
                    checked={checkedAlerts[alert.alertKey] || false}
                    onChange={() => handleCheckboxToggle(alert.alertKey)}
                    style={checkboxStyle}
                  />
                </div>

                <div style={cellStyles.name}>
                  <span className={`${styles.text14} ${styles.fontBold}`} style={{ color: "#1F2B4D" }}>
                    {alert.name}
                  </span>
                </div>

                <div style={cellStyles.description}>
                  {isCustomAlertMapping ? (
                    <textarea
                      value={editedDescriptions[alert.alertKey] || alert.description}
                      onChange={(e) => handleDescriptionChange(alert.alertKey, e.target.value)}
                      style={{
                        width: "100%",
                        minHeight: "40px",
                        padding: "6px 10px",
                        borderRadius: "6px",
                        border: "1px solid #D9DDE7",
                        fontSize: "13px",
                        fontFamily: "inherit",
                        resize: "vertical",
                        outline: "none",
                      }}
                    />
                  ) : (
                    <span className={`${styles.text12} ${styles.fontMedium}`} style={{ color: "#60697D" }}>
                      {alert.description}
                    </span>
                  )}
                </div>

                {!isCustomAlertMapping && (
                  <>
                    <div style={cellStyles.input}>
                      {renderInput(alert.percentage, 1, 100, alert.alertKey, "percentage")}
                    </div>

                    <div style={cellStyles.input}>
                      {renderInput(alert.weeks, 1, 52, alert.alertKey, "weeks")}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </LoadingOverlay>
  );
};

export default AlertDescriptionSettings;
