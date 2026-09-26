import { useEffect, useState, useCallback, useMemo } from "react";
import AgGrid from "core/Utils/agGrid";
import { connect, useDispatch } from "react-redux";
import { bindActionCreators } from "redux";
import Popover from "@mui/material/Popover";
import { Button, Modal, Input, Tooltip, Switch } from "impact-ui-v3";
import { Box, Typography, Select, MenuItem, Divider } from "@mui/material";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import SettingsIcon from "@mui/icons-material/Settings";
import TableFormRenderer from "./tableFormRenderer";
import { isEmpty, cloneDeep, sortBy } from "lodash";
import { makeStyles } from "@mui/styles";
import globalStyles from "core/Styles/globalStyles";
import { addSnack } from "core/actions/snackbarActions";
import { SEARCHABLE_TYPES } from "./constant";
import { displaySnackMessages } from "core/Utils/utils";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import Sort from "@mui/icons-material/Sort";

const useStyles = makeStyles((theme) => ({
  colSettingsWrapper: {
    minWidth: "15rem",
    background: theme.palette.common.white,
    padding: "1rem",
  },
  colSettingsWrapperExpanded: {
    width: "22rem",
    minWidth: "22rem",
    maxWidth: "22rem",
  },
  colSettingsWrapperDefault: {
    width: "18rem",
    minWidth: "18rem",
    maxWidth: "18rem",
  },
  aliasInputWrapper: {
    width: "100%",
    minWidth: 0,
    "& input": {
      width: "100% !important",
      maxWidth: "100% !important",
      boxSizing: "border-box",
    },
  },
  colSettingsHeaderConatiner: {
    gap: "0.25rem",
  },
  colSettingsHeaderIcon: {
    "&.MuiSvgIcon-fontSizeSmall": {
      fontSize: "1rem",
    },
  },
  menuDivider: {
    borderBottom: `1px solid ${theme.palette.text.disabled}`,
  },
  customHeaderContainer: {
    width: "100%",
    display: "flex",
    justifyContent:
      "space-between" /* This aligns items at the start and end of the container */,
    alignItems: "center" /* This vertically centers the items */,
    cursor: "pointer" /* Add cursor style to indicate interactivity */,
    "&svg": {
      width: "1rem",
      height: "1rem",
    },
  },
  wrappableHeaderCell: {
    whiteSpace: "normal",
  },
  iconDiv: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.375rem",
  },
  // ExtraConfigurationModal specific styles
  modalContainer: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    overflow: "hidden",
  },
  modalHeader: {
    position: "sticky",
    top: 0,
    backgroundColor: theme.palette.background.paper,
    zIndex: 10,
    borderBottom: `1px solid ${theme.palette.divider}`,
    flexShrink: 0,
  },
  modalContent: {
    flex: 1,
    overflowY: "auto",
    padding: "0 0.5rem",
    minHeight: 0, // Important for flex child to allow shrinking
  },
  searchInput: {
    paddingLeft: "2rem",
  },
  noResultsMessage: {
    color: theme.palette.text.secondary,
  },
  infoIconContainer: {
    cursor: "help",
    color: theme.palette.info.main,
  },
  // JSON textarea specific styles
  jsonTextarea: {
    height: "14rem",
    border: `1px solid ${theme.palette.colours.commentPopoverBorder}`,
    borderRadius: "0.25rem",
    fontFamily: "monospace",
    fontSize: "0.875rem",
    resize: "vertical",
    outline: "none",
    "&:focus": {
      borderColor: theme.palette.primary.main,
    },
  },
  errorText: {
    color: theme.palette.error.main,
  },
  // Advanced SQL options container (be_configs) in Extra modal
  advancedSqlContainer: {
    borderRadius: "8px",
    backgroundColor: "#FFF",
    border: "1px solid rgba(0, 0, 0, 0.12)",
    padding: "8px 12px 10px 12px",
    marginBottom: "1rem",
  },
  advancedSqlHeader: {
    marginBottom: "0.5rem",
    fontWeight: 600,
    fontSize: "0.875rem",
  },
  // Tooltip styles
  tooltipContainer: {
    whiteSpace: "pre-line",
    textAlign: "left",
  },
  tooltipTitle: {
    fontWeight: "bold",
    marginBottom: "0.25rem",
  },
  tooltipText: {
    marginBottom: "0.125rem",
  },
}));

/**
 * ExtraConfigurationModal - A dual-mode JSON editor modal for table column configuration
 *
 * This modal provides two ways to edit JSON data:
 * 1. **Key-Value Form Mode** (default): User-friendly form with individual key-value input pairs
 * 2. **Raw JSON Mode**: Direct JSON text editor with syntax formatting
 *
 * Key Features:
 * - Seamless switching between form and raw JSON modes
 * - Real-time search/filter for key-value pairs in form mode
 * - JSON validation and formatting with error handling
 * - Duplicate key detection and validation
 * - Smart value parsing (attempts JSON.parse, falls back to string)
 *
 * @param {Object} props
 * @param {boolean} props.open - Controls modal visibility
 * @param {Function} props.onClose - Callback when modal is closed
 * @param {Function} props.onSave - Callback when JSON data is saved, receives parsed JSON object
 * @param {Object} props.initialData - Initial JSON data to populate the editor (default: {})
 *
 * @returns {JSX.Element} Modal component with JSON editing capabilities
 */
const ExtraConfigurationModal = ({
  open,
  onClose,
  onSave,
  initialData = {},
  /** Keys for which the remove (cross) button is hidden (e.g. be_configs entries) */
  nonRemovableKeys = [],
  /** Optional display labels for be_configs keys (key -> label) in Advanced SQL section */
  beConfigsLabels = {},
  /** Default be_configs entries when user enables Advanced Aliasing (key -> value) */
  defaultBeConfigs = {},
  /** Column name used when building alias from template (e.g. for "AS column_name") */
  columnNameForTemplate = "",
  /** Key under which be_configs entries are nested in extra (for Preview JSON structure) */
  beConfigsKey = "be_configs",
  /** Whether the column is required (disables Advanced Aliasing toggle) */
  isRequired = false,
}) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const dispatch = useDispatch();

  /** Build structured extra from flat object so Preview JSON shows be_configs nested */
  const buildStructuredFromFlat = useCallback(
    (flatObj) => {
      const beConfigsObj = {};
      const other = {};
      Object.entries(flatObj || {}).forEach(([key, value]) => {
        if (nonRemovableKeys.includes(key)) {
          beConfigsObj[key] = value;
        } else {
          other[key] = value;
        }
      });
      const structured = { ...other };
      if (Object.keys(beConfigsObj).length > 0) {
        structured[beConfigsKey] = beConfigsObj;
      }
      return structured;
    },
    [nonRemovableKeys, beConfigsKey]
  );

  /** Flatten structured extra (e.g. from raw JSON) for form key-value pairs */
  const flattenStructured = useCallback(
    (structuredObj) => {
      const nested = structuredObj?.[beConfigsKey];
      if (nested && typeof nested === "object" && !Array.isArray(nested)) {
        const rest = { ...structuredObj };
        delete rest[beConfigsKey];
        return { ...nested, ...rest };
      }
      return structuredObj || {};
    },
    [beConfigsKey]
  );

  // Component state management
  const [keyValuePairs, setKeyValuePairs] = useState([]); // Form mode: array of {key, value} objects
  const [keySearchTerm, setKeySearchTerm] = useState(""); // Search filter for keys in form mode
  const [isPreviewMode, setIsPreviewMode] = useState(false); // Toggle between form/JSON modes
  const [rawJsonText, setRawJsonText] = useState(""); // Raw JSON text for direct editing
  const [jsonError, setJsonError] = useState(""); // Error message for invalid JSON
  /** When true, show Advanced SQL options container; if be_configs present in initialData, default true */
  const [advancedAliasingEnabled, setAdvancedAliasingEnabled] = useState(false);
  /** Local template panel open state - keep Edit modal open when template panel is open */
  const [templatePanelOpen, setTemplatePanelOpen] = useState(false);

  // Initialize component state when modal opens or data changes
  useEffect(() => {
    if (open) {
      // Check if be_configs exist in initialData
      const hasBeConfigs = nonRemovableKeys.some((k) =>
        Object.prototype.hasOwnProperty.call(initialData || {}, k)
      );
      
      // For required columns: keep toggle enabled if be_configs exist, but state cannot be changed
      // For non-required columns: set toggle based on whether be_configs exist
      setAdvancedAliasingEnabled(hasBeConfigs);

      if (Object.keys(initialData || {}).length > 0) {
        // Convert existing JSON object to key-value pairs for form mode (initialData is flat)
        const initialPairs = Object.entries(initialData).map(
          ([key, value]) => ({
            key,
            value: typeof value === "string" ? value : JSON.stringify(value),
          })
        );
        setKeyValuePairs(initialPairs);
        // Preview JSON shows structured extra with be_configs nested
        const structured = buildStructuredFromFlat(initialData);
        setRawJsonText(JSON.stringify(structured, null, 2));
      } else {
        // Initialize with empty state
        setKeyValuePairs([{ key: "", value: "" }]);
        setRawJsonText("{}");
      }
      // Reset modal state
      setKeySearchTerm("");
      setIsPreviewMode(false);
      setJsonError("");
    }
  }, [open, initialData, nonRemovableKeys, isRequired]);

  // Form mode handlers - manage key-value pairs

  /**
   * Updates a specific key or value in the pairs array
   */
  const handlePairChange = (index, field, newValue) => {
    setKeyValuePairs((prevPairs) => {
      const updatedPairs = [...prevPairs];
      updatedPairs[index] = {
        ...updatedPairs[index],
        [field]: newValue,
      };
      return updatedPairs;
    });
  };

  /**
   * Adds a new empty key-value pair to the form
   */
  const handleAddNewPair = () => {
    setKeyValuePairs((prevPairs) => [...prevPairs, { key: "", value: "" }]);
  };

  /**
   * Removes a key-value pair from the form
   */
  const handleRemovePair = (index) => {
    setKeyValuePairs((prevPairs) => prevPairs.filter((_, i) => i !== index));
  };

  /**
   * When user enables Advanced Aliasing: show be_configs container and add default be_configs pairs if not present.
   * Disabled for required columns.
   */
  const handleAdvancedAliasingToggle = (checked) => {
    if (isRequired) {
      displaySnackMessages(
        "Mandatory column's aliases cannot be edited",
        "error",
        dispatch
      );
      return;
    }
    setAdvancedAliasingEnabled(checked);
    if (checked) {
      const existingKeys = new Set(
        keyValuePairs.map((p) => p.key.trim()).filter(Boolean)
      );
      const toAdd = Object.entries(defaultBeConfigs)
        .filter(([k]) => !existingKeys.has(k))
        .map(([key, value]) => ({
          key,
          value: typeof value === "string" ? value : JSON.stringify(value),
        }));
      if (toAdd.length > 0) {
        setKeyValuePairs((prev) => [...prev, ...toAdd]);
      }
    }
  };

  // Data conversion helpers

  /**
   * Converts form key-value pairs to JSON object
   * Attempts to parse values as JSON, falls back to string
   */
  const convertPairsToJson = () => {
    const jsonResult = {};
    keyValuePairs.forEach(({ key, value }) => {
      const trimmedKey = key.trim();
      if (trimmedKey) {
        // Smart value parsing: try JSON first, then keep as string
        try {
          jsonResult[trimmedKey] = JSON.parse(value);
        } catch {
          jsonResult[trimmedKey] = value;
        }
      }
    });
    return jsonResult;
  };

  // Mode switching logic

  /**
   * Handles switching between form mode and raw JSON mode
   * Converts data between formats when switching
   */
  const handlePreviewJsonData = () => {
    if (!isPreviewMode) {
      // Form → JSON: Convert pairs to structured JSON (be_configs nested) for Preview JSON
      const flatObj = convertPairsToJson();
      const structured = buildStructuredFromFlat(flatObj);
      setRawJsonText(JSON.stringify(structured, null, 2));
      setJsonError("");
    } else {
      // JSON → Form: Parse JSON and flatten so key-value pairs include be_configs entries
      try {
        const parsedJson = JSON.parse(rawJsonText);
        // Validate: must be an object (not array or primitive)
        if (
          typeof parsedJson === "object" &&
          parsedJson !== null &&
          !Array.isArray(parsedJson)
        ) {
          const flatObj = flattenStructured(parsedJson);
          const newPairs = Object.entries(flatObj).map(([key, value]) => ({
            key,
            value: typeof value === "string" ? value : JSON.stringify(value),
          }));
          setKeyValuePairs(
            newPairs.length > 0 ? newPairs : [{ key: "", value: "" }]
          );
          setJsonError("");
        } else {
          throw new Error("JSON must be an object");
        }
      } catch (error) {
        // Show error and prevent mode switch
        setJsonError(`Invalid JSON: ${error.message}`);
        displaySnackMessages(
          `Invalid JSON: ${error.message}`,
          "error",
          dispatch
        );
        return;
      }
    }
    setIsPreviewMode(!isPreviewMode);
  };

  // JSON mode handlers

  /**
   * Formats the raw JSON text with proper indentation
   */
  const handleFormatJson = () => {
    try {
      const parsedJson = JSON.parse(rawJsonText);
      setRawJsonText(JSON.stringify(parsedJson, null, 2));
      setJsonError("");
      displaySnackMessages("JSON formatted successfully", "success", dispatch);
    } catch (error) {
      setJsonError(`Invalid JSON: ${error.message}`);
      displaySnackMessages(`Invalid JSON: ${error.message}`, "error", dispatch);
    }
  };

  /**
   * Handles raw JSON text changes and clears previous errors
   */
  const handleRawJsonChange = (event) => {
    setRawJsonText(event.target.value);
    setJsonError(""); // Clear error on new input
  };

  // Save logic - handles both modes

  /**
   * Validates and saves JSON data from either mode
   * Returns boolean indicating success/failure
   */
  const handleSaveJsonData = () => {
    let finalJsonResult = {};

    if (isPreviewMode) {
      // JSON Mode: Validate and parse raw JSON text
      try {
        const parsedJson = JSON.parse(rawJsonText);
        if (
          typeof parsedJson === "object" &&
          parsedJson !== null &&
          !Array.isArray(parsedJson)
        ) {
          finalJsonResult = parsedJson;
        } else {
          throw new Error("JSON must be an object");
        }
      } catch (error) {
        displaySnackMessages(
          `Invalid JSON: ${error.message}`,
          "error",
          dispatch
        );
        return false;
      }
    } else {
      // Form Mode: Validate key-value pairs and convert to JSON
      const seenKeys = new Set();
      const validationErrors = [];
      const skipBeConfigsKeys = !advancedAliasingEnabled;

      keyValuePairs.forEach(({ key, value }, index) => {
        const trimmedKey = key.trim();

        // When Advanced Aliasing is off, omit be_configs keys from saved data
        if (skipBeConfigsKeys && nonRemovableKeys.includes(trimmedKey)) {
          return;
        }

        // Validation checks
        if (!trimmedKey) {
          validationErrors.push(`Row ${index + 1}: Key is empty.`);
        } else if (seenKeys.has(trimmedKey)) {
          validationErrors.push(
            `Row ${index + 1}: Duplicate key "${trimmedKey}".`
          );
        } else if (typeof trimmedKey !== "string") {
          validationErrors.push(
            `Row ${index + 1}: Invalid JSON key "${trimmedKey}".`
          );
        } else {
          seenKeys.add(trimmedKey);
          // Parse value with fallback to string
          try {
            finalJsonResult[trimmedKey] = JSON.parse(value);
          } catch {
            finalJsonResult[trimmedKey] = value;
          }
        }
      });

      // Handle validation errors
      if (validationErrors.length) {
        displaySnackMessages(validationErrors.join("\n"), "error", dispatch);
        return false;
      }
    }

    // Save successful data
    try {
      onSave(finalJsonResult);
      displaySnackMessages("JSON data saved successfully", "success", dispatch);
      return true;
    } catch (error) {
      displaySnackMessages(
        "Error saving JSON data: " + error.message,
        "error",
        dispatch
      );
      return false;
    }
  };

  // Partition: be_configs keys (Advanced SQL) vs other keys (key-value list)
  const beConfigsPairs = useMemo(
    () =>
      keyValuePairs.filter((pair) =>
        nonRemovableKeys.includes(pair.key.trim())
      ),
    [keyValuePairs, nonRemovableKeys]
  );
  const otherPairs = useMemo(
    () =>
      keyValuePairs.filter(
        (pair) => !nonRemovableKeys.includes(pair.key.trim())
      ),
    [keyValuePairs, nonRemovableKeys]
  );

  // Filtered by search (apply to both sections)
  const filteredBeConfigsPairs = useMemo(
    () =>
      beConfigsPairs.filter((pair) =>
        pair.key.toLowerCase().includes(keySearchTerm.toLowerCase())
      ),
    [beConfigsPairs, keySearchTerm]
  );
  const filteredOtherPairs = useMemo(
    () =>
      otherPairs.filter((pair) =>
        pair.key.toLowerCase().includes(keySearchTerm.toLowerCase())
      ),
    [otherPairs, keySearchTerm]
  );

  // Tooltip content for user guidance
  const jsonRulesInfo = (
    <Box className={classes.tooltipContainer}>
      <Typography variant="body2" className={classes.tooltipTitle}>
        JSON Key-Value Rules:
      </Typography>
      <Typography variant="body2" className={classes.tooltipText}>
        • Key must be a unique string
      </Typography>
      <Typography variant="body2" className={classes.tooltipText}>
        • Values can be strings, numbers, objects, arrays, booleans, or null
      </Typography>
    </Box>
  );

  const handleTemplateApply = (expr) => {
    const idx = keyValuePairs.findIndex((p) => p.key.trim() === "sql_alias");
    if (idx >= 0) handlePairChange(idx, "value", expr);
    setTemplatePanelOpen(false);
  };

  return (
    <>
    <Modal
      open={open}
      onClose={onClose}
      title="Extra Configuration"
      primaryButtonLabel="Save"
      secondaryButtonLabel={isPreviewMode ? "Back to Form" : "Preview JSON"}
      onPrimaryButtonClick={handleSaveJsonData}
      onSecondaryButtonClick={handlePreviewJsonData}
    >
      <Box className={classes.modalContainer}>
        {!isPreviewMode ? (
          <>
            {/* KEY-VALUE FORM MODE */}
            <Box
              className={`${classes.modalHeader} ${globalClasses.flexAlignBetweenCenter} ${globalClasses.marginBottom} ${globalClasses.gap} ${globalClasses.paddingVertical}`}
            >
              {/* Search input for filtering keys */}
              <Box
                className={`${globalClasses.positionRelative} ${globalClasses.flexGrow}`}
              >
                <Input
                  type="text"
                  placeholder="Search keys..."
                  focusedText=""
                  value={keySearchTerm}
                  onChange={(e) => setKeySearchTerm(e.target.value)}
                  className={`${classes.searchInput} ${globalClasses.fullWidth}`}
                  leftIcon={
                    <Box className={globalClasses.centerAlign}>
                      <SearchIcon />
                    </Box>
                  }
                  id="search-input"
                />
              </Box>

              {/* Action buttons and help tooltip */}
              <Box className={globalClasses.whiteSpace}>
                <Box
                  className={`${globalClasses.flexRow} ${globalClasses.verticalAlignCenter}`}
                >
                  <Button
                    variant="primary"
                    onClick={handleAddNewPair}
                    icon={<AddIcon />}
                  >
                    Add New Pair
                  </Button>
                </Box>
              </Box>
            </Box>

            {/* Enable Advanced Aliasing toggle - when on, show be_configs container */}
            <Box
              className={`${globalClasses.flexRow} ${globalClasses.layoutAlignSpaceBetween} ${globalClasses.verticalAlignCenter}`}
              sx={{ padding: "0.25rem 0", cursor: isRequired ? "not-allowed" : "default" }}
              onClick={() => {
                if (isRequired) {
                  displaySnackMessages(
                    "Mandatory column's aliases cannot be edited",
                    "error",
                    dispatch
                  );
                }
              }}
            >
              <Typography 
                variant="subtitle2"
                sx={{ fontWeight: 600, fontFamily: "Manrope" }}
              >
                Enable Advanced Aliasing
              </Typography>
              <Switch
                checked={advancedAliasingEnabled}
                onChange={(e) =>
                  handleAdvancedAliasingToggle(e.target.checked)
                }
                disabled={isRequired}
              />
            </Box>
            <Divider sx={{marginBottom:'8px'}}/>

            {/* Advanced SQL options - only when Enable Advanced Aliasing is checked */}
            {advancedAliasingEnabled && beConfigsPairs.length > 0 && (
              <Box
                className={classes.advancedSqlContainer}
              >
                {(() => {
                  // Find sql_alias pair and boolean pairs
                  const sqlAliasPair = filteredBeConfigsPairs.find(
                    (p) => p.key.trim() === "sql_alias"
                  );
                  const groupByPair = filteredBeConfigsPairs.find(
                    (p) => p.key.trim() === "is_in_group_by_clause"
                  );
                  const orderByPair = filteredBeConfigsPairs.find(
                    (p) => p.key.trim() === "is_in_order_by_clause"
                  );
                  
                  const sqlAliasIndex = sqlAliasPair
                    ? keyValuePairs.findIndex((p) => p === sqlAliasPair)
                    : -1;
                  const groupByIndex = groupByPair
                    ? keyValuePairs.findIndex((p) => p === groupByPair)
                    : -1;
                  const orderByIndex = orderByPair
                    ? keyValuePairs.findIndex((p) => p === orderByPair)
                    : -1;
                  
                  const parsedGroup = groupByPair
                    ? (() => {
                        try {
                          return JSON.parse(groupByPair.value);
                        } catch {
                          return false;
                        }
                      })()
                    : false;
                  const parsedOrder = orderByPair
                    ? (() => {
                        try {
                          return JSON.parse(orderByPair.value);
                        } catch {
                          return false;
                        }
                      })()
                    : false;

                  // Render all in one row: Sql Alias label + input + button + Group By switch + Order by switch
                  return (
                    <Box
                      className={`${globalClasses.flexRow}`}
                      sx={{ 
                        gap: "20px", 
                        flexWrap: "wrap",
                        alignItems: "flex-start"
                      }}
                    >
                      {/* Sql Alias section */}
                      {sqlAliasPair && (
                        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0, flex: 1, minWidth: 0 }}>
               
                            <Input
                              type="text"
                              label={beConfigsLabels[sqlAliasPair.key.trim()] || sqlAliasPair.key.trim() || "Key"}
                              placeholder="e.g. ROUND(COALESCE(col, 0), 2) AS col"
                              value={sqlAliasPair.value}
                              onChange={(e) =>
                                handlePairChange(
                                  sqlAliasIndex,
                                  "value",
                                  e.target.value
                                )
                              }
                              disabled={isRequired}
                              onClick={() => {
                                if (isRequired) {
                                  displaySnackMessages(
                                    "Mandatory column's aliases cannot be edited",
                                    "error",
                                    dispatch
                                  );
                                }
                              }}
                              focusedText=""
                              sx={{ marginRight: 0 }}
                            />
                
                          {columnNameForTemplate != null && (
                            <Button
                              variant="text"
                              size="small"
                              disabled={isRequired}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (isRequired) {
                                  displaySnackMessages(
                                    "Mandatory column's aliases cannot be edited",
                                    "error",
                                    dispatch
                                  );
                                  return;
                                }
                                setTemplatePanelOpen(true);
                              }}
                              sx={{ marginTop: "26px", marginLeft: "4px" }}
                            >
                              Build from Template
                            </Button>
                          )}
                        </Box>
                      )}
                      {/* Group By switch */}
                      {groupByPair && (
                        <Box
                          onClick={() => {
                            if (isRequired) {
                              displaySnackMessages(
                                "Mandatory column's aliases cannot be edited",
                                "error",
                                dispatch
                              );
                            }
                          }}
                          sx={{ cursor: isRequired ? "not-allowed" : "default", marginTop: "26px" }}
                        >
                          <Switch
                            checked={parsedGroup === true}
                            onChange={(e) =>
                              handlePairChange(
                                groupByIndex,
                                "value",
                                e.target.checked ? "true" : "false"
                              )
                            }
                            disabled={isRequired}
                            leftLabel={beConfigsLabels[groupByPair.key.trim()] ||
                              groupByPair.key.trim()}
                          />
                        </Box>
                      )}
                      {/* Order by switch */}
                      {orderByPair && (
                        <Box
                          onClick={() => {
                            if (isRequired) {
                              displaySnackMessages(
                                "Mandatory column's aliases cannot be edited",
                                "error",
                                dispatch
                              );
                            }
                          }}
                          sx={{ cursor: isRequired ? "not-allowed" : "default", marginTop: "26px" }}
                        >
                          <Switch
                            checked={parsedOrder === true}
                            onChange={(e) =>
                              handlePairChange(
                                orderByIndex,
                                "value",
                                e.target.checked ? "true" : "false"
                              )
                            }
                            disabled={isRequired}
                            leftLabel={beConfigsLabels[orderByPair.key.trim()] ||
                              orderByPair.key.trim()}
                          />
                        </Box>
                      )}
                    </Box>
                  );
                })()}
                {filteredBeConfigsPairs.length === 0 && keySearchTerm && (
                  <Typography variant="caption" color="textSecondary">
                    No Advanced SQL keys matching "{keySearchTerm}"
                  </Typography>
                )}
              </Box>
            )}

            {/* Key-Value Pairs List (other extra keys only) */}
            {filteredOtherPairs.length > 0 && (
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 600, fontFamily: "Manrope", marginBottom: "0.5rem" }}
              >
                Other configs
              </Typography>
            )}
            <Box className={classes.modalContent}>
              {filteredOtherPairs.map(({ key, value }, index) => {
                const originalIndex = keyValuePairs.findIndex(
                  (p) => p === filteredOtherPairs[index]
                );
                return (
                  <Box
                    key={originalIndex}
                    className={`${globalClasses.flexRow} ${globalClasses.verticalAlignCenter} ${globalClasses.marginBottom} ${globalClasses.gapHalf}`}
                  >
                    <Box
                      className={`${globalClasses.flexRow} ${globalClasses.flex} ${globalClasses.gapHalf}`}
                    >
                      <Input
                        type="text"
                        placeholder="Key"
                        value={key}
                        onChange={(e) =>
                          handlePairChange(originalIndex, "key", e.target.value)
                        }
                        className={globalClasses.flex}
                        focusedText=""
                      />
                      <Input
                        type="text"
                        placeholder="Value"
                        value={value}
                        onChange={(e) =>
                          handlePairChange(
                            originalIndex,
                            "value",
                            e.target.value
                          )
                        }
                        className={globalClasses.flex}
                        focusedText=""
                      />
                    </Box>
                    <Button
                      variant="text"
                      onClick={() => handleRemovePair(originalIndex)}
                      icon={<CloseIcon />}
                      id="remove-pair-button"
                    />
                  </Box>
                );
              })}

              {/* No results message for search */}
              {filteredBeConfigsPairs.length === 0 &&
                filteredOtherPairs.length === 0 &&
                keySearchTerm && (
                  <Box
                    className={`${classes.noResultsMessage} ${globalClasses.paddingVertical} ${globalClasses.alignTextCenter}`}
                  >
                    <Typography variant="body2">
                      No keys matching "{keySearchTerm}"
                    </Typography>
                  </Box>
                )}
            </Box>
          </>
        ) : (
          <>
            {/* RAW JSON EDITOR MODE */}
            <Box
              className={`${classes.modalHeader} ${globalClasses.flexAlignBetweenCenter} ${globalClasses.marginBottom} ${globalClasses.gap} ${globalClasses.paddingVertical}`}
            >
              <Typography variant="h6">Raw JSON Editor</Typography>
              {/* Format button for JSON beautification */}
              <Button
                variant="primary"
                onClick={handleFormatJson}
                icon={<SettingsIcon />}
              >
                Format JSON
              </Button>
            </Box>

            {/* JSON Text Editor */}
            <Box className={classes.modalContent}>
              {/* Error display */}
              {jsonError && (
                <Box className={globalClasses.marginBottom}>
                  <Typography variant="body2" className={classes.errorText}>
                    {jsonError}
                  </Typography>
                </Box>
              )}

              {/* Raw JSON textarea */}
              <textarea
                value={rawJsonText}
                onChange={handleRawJsonChange}
                placeholder="Enter your JSON here..."
                className={`${classes.jsonTextarea} ${globalClasses.fullWidth} ${globalClasses.paddingAround}`}
              />

              {/* User guidance */}
              <Box className={globalClasses.marginTop}>
                <Typography variant="caption" color="textSecondary">
                  Tip: Use the "Format JSON" button to properly format your
                  JSON. Make sure your JSON is a valid object (not an array or
                  primitive value).
                </Typography>
              </Box>
            </Box>
          </>
        )}
      </Box>
    </Modal>
    <AliasTemplatePanel
      open={templatePanelOpen}
      onClose={() => setTemplatePanelOpen(false)}
      onApply={handleTemplateApply}
      columnName={columnNameForTemplate || "column"}
    />
    </>
  );
};
const NUMERIC_FORMATTER_OPTIONS = [
  { value: "", label: "None" },
  { value: "roundOff", label: "Round Off" },
  { value: "roundOfftoTwoDecimals", label: "Round Off To Two Decimal" },
];

const DATE_FORMATTER_OPTIONS = [
  { value: "", label: "None" },
  { value: "DD-MM-YYYY", label: "Date Format (DD-MM-YYYY)" },
  { value: "DD-MM-YYYY, HH:mm:ss", label: "Date Format (DD-MM-YYYY, HH:mm:ss)" },
];

const FORMATTER_OPTIONS = {
  float: NUMERIC_FORMATTER_OPTIONS,
  percentage: NUMERIC_FORMATTER_OPTIONS,
  double: NUMERIC_FORMATTER_OPTIONS,
  date: DATE_FORMATTER_OPTIONS,
  datetime: DATE_FORMATTER_OPTIONS
};

/** Query-related config key; all BE/query fields live under extra.be_configs */
const BE_CONFIGS_KEY = "be_configs";

/** Keys that belong under extra.be_configs when saving from Edit modal; other keys stay at extra top-level */
const BE_CONFIGS_KEYS = ["sql_alias", "is_in_group_by_clause", "is_in_order_by_clause"];

/** Display labels for be_configs keys in the Extra modal Advanced SQL section */
const BE_CONFIGS_LABELS = {
  sql_alias: "Sql Alias",
  is_in_group_by_clause: "Group By",
  is_in_order_by_clause: "Order by",
};

/** Default be_configs when user enables Advanced Aliasing and none exist */
const DEFAULT_BE_CONFIGS = {
  sql_alias: "",
  is_in_group_by_clause: false,
  is_in_order_by_clause: false,
};

/**
 * Get be_configs from extra, migrating legacy top-level sql_alias/advanced_aliasing_enabled if present.
 * @param {Object} extra - column extra object
 * @returns {Object} be_configs object (may be empty)
 */
const getBeConfigs = (extra) => {
  const fromNested = extra?.[BE_CONFIGS_KEY] && typeof extra[BE_CONFIGS_KEY] === "object"
    ? { ...extra[BE_CONFIGS_KEY] }
    : {};
  const legacySqlAlias = extra?.sql_alias;
  const legacyEnabled = extra?.advanced_aliasing_enabled;
  if (legacySqlAlias != null && legacySqlAlias !== "" && fromNested.sql_alias == null) {
    fromNested.sql_alias = legacySqlAlias;
  }
  if (legacyEnabled !== undefined && fromNested.sql_alias == null && legacyEnabled) {
    fromNested.sql_alias = fromNested.sql_alias ?? "";
  }
  return fromNested;
};

const ALIAS_TEMPLATES = [
  {
    id: "cast_int64",
    label: "Cast to Integer (SUM)",
    description: "CAST(COALESCE(SUM(column), 0) as int64) AS column",
    generate: (columnName) =>
      `CAST(COALESCE(SUM(${columnName}), 0) as int64) AS ${columnName}`,
  },
  {
    id: "round_decimals",
    label: "Round to Decimals (SUM)",
    description: "ROUND(COALESCE(SUM(column), 0), N) AS column",
    generate: (columnName, decimals = 2) =>
      `ROUND(COALESCE(SUM(${columnName}), 0), ${decimals}) AS ${columnName}`,
    hasParam: true,
    paramLabel: "Decimal places",
    paramDefault: 2,
  },
];

export const AliasTemplatePanel = ({ open, onClose, onApply, columnName }) => {
  const globalClasses = globalStyles();
  const [selectedTemplate, setSelectedTemplate] = useState(ALIAS_TEMPLATES[0].id);
  const [decimalPlaces, setDecimalPlaces] = useState(2);

  const selectedTemplateConfig = ALIAS_TEMPLATES.find(
    (t) => t.id === selectedTemplate
  );
  const previewExpression =
    selectedTemplateConfig?.hasParam
      ? selectedTemplateConfig.generate(columnName, decimalPlaces)
      : selectedTemplateConfig?.generate(columnName);

  const handleApply = () => {
    const expr =
      selectedTemplateConfig?.hasParam
        ? selectedTemplateConfig.generate(columnName, decimalPlaces)
        : selectedTemplateConfig.generate(columnName);
    onApply(expr);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Build Expression from Template"
      primaryButtonLabel="Apply"
      onPrimaryButtonClick={handleApply}
      secondaryButtonLabel="Cancel"
      onSecondaryButtonClick={onClose}
    >
      <Box className={globalClasses.marginBottom}>
        <Typography variant="body2" color="textSecondary">
          Column: <strong>{columnName}</strong>
        </Typography>
      </Box>
      <Box className={globalClasses.marginBottom}>
        <Typography variant="subtitle2" className={globalClasses.marginBottom}>
          Select template
        </Typography>
        <Select
          value={selectedTemplate}
          onChange={(e) => setSelectedTemplate(e.target.value)}
          size="small"
          fullWidth
          displayEmpty
        >
          {ALIAS_TEMPLATES.map((t) => (
            <MenuItem key={t.id} value={t.id}>
              {t.label}
            </MenuItem>
          ))}
        </Select>
        <Typography variant="caption" color="textSecondary" sx={{ display: "block", mt: 0.5 }}>
          {selectedTemplateConfig?.description}
        </Typography>
      </Box>
      {selectedTemplateConfig?.hasParam && (
        <Box className={globalClasses.marginBottom}>
          <Typography variant="subtitle2" className={globalClasses.marginBottom}>
            {selectedTemplateConfig.paramLabel}
          </Typography>
          <Input
            type="number"
            value={decimalPlaces}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              setDecimalPlaces(isNaN(val) ? 0 : Math.min(10, Math.max(0, val)));
            }}
          />
        </Box>
      )}
      <Box
        className={globalClasses.marginBottom}
        sx={{
          p: 1,
          bgcolor: "action.hover",
          borderRadius: 1,
          fontFamily: "monospace",
          fontSize: "0.8rem",
          wordBreak: "break-all",
        }}
      >
        <Typography variant="caption" color="textSecondary" sx={{ display: "block", mb: 0.5 }}>
          Preview
        </Typography>
        {previewExpression}
      </Box>
    </Modal>
  );
};

const CustomHeader = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const { column, displayName, allMappings = [], tablePayloadConfiguration } = props;
  const [anchorEl, setAnchorEl] = useState(null);
  const [formState, setFormState] = useState(null);
  const [colId, setColId] = useState(null);
  const [disableForm, setDisableForm] = useState(false);
  const [openModal, setOpenModal] = useState(false);

  // Disable advanced aliasing for mandatory columns (uses same source as form: mandatoryColumnNames)
  const colDef = column?.colDef ?? column?.getColDef?.() ?? {};
  const columnName = colDef.column_name ?? colDef.field ?? column?.colId ?? (typeof column?.getColId === "function" ? column.getColId() : "") ?? "";
  const [jsonData, setJsonData] = useState(colDef?.extra || {});

  useEffect(() => {
    initializeConfigurationForm();
  }, [props]);

  useEffect(() => {
    setJsonData(props?.column?.colDef?.extra || {});
  }, [props?.column?.colDef?.extra]);

  /**
   * @function
   * @description Declare and update state with primary values.
   */
  const initializeConfigurationForm = () => {
    const originalColumnName = column?.colDef?.column_name || column?.colId;
    const colConfig = {
      label: column?.colDef?.label || displayName,
      column_name: originalColumnName,
      is_editable: Boolean(column?.colDef?.is_editable),
      is_searchable: Boolean(column?.colDef?.is_searchable),
      is_frozen: Boolean(column?.colDef?.is_frozen),
      is_sortable: Boolean(column?.colDef?.is_sortable),
      order_of_display: column?.colDef?.order_of_display || 0,
      formatter: column?.colDef?.formatter || ""
    };
    setDisableForm(!["product", "store"].includes((column?.colDef?.dimension).toLowerCase()));
    setColId(originalColumnName);
    setFormState(colConfig);
  };

  /**
   * @function
   * @description Handle click operation and assign target to the popup
   * @param {Object} event
   */
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  /**
   * @function
   * @description Update states as the changes are made to form
   * @param {Object} change
   * @param {String} key
   */
  const handelChange = (change, key) => {
    let newFormObj = cloneDeep(formState);
    newFormObj[key] = change[key];
    setFormState(newFormObj);
  };

  /**
   * @function
   * @description Handle save operation and close popup
   */
  const handleSave = () => {
    const newColumnLabel = formState.label?.trim();
    const newColumnName = formState.column_name?.trim();
    // check duplicate label only against user-selected columns currently in the table
    const selectedColumns = [
      ...(tablePayloadConfiguration?.mappings || []),
      ...(tablePayloadConfiguration?.groups || []),
      ...((tablePayloadConfiguration?.groups || []).flatMap((g) => g?.mappings || [])),
    ];

    const isLabelDuplicate = selectedColumns.some(
      (col) =>
        col?.column_name != colId &&
        typeof col?.label === "string" &&
        col.label.trim() === newColumnLabel
    );

    if (isLabelDuplicate) {
      props.addSnack({
        message: `Label shouldn't match other attribute labels.`,
        options: {
          variant: "error",
        },
      });
      return;
    }
    // Validate order_of_display is a valid number
    const orderValue = parseInt(formState.order_of_display);
    if (isNaN(orderValue) || orderValue < 0) {
      props.addSnack({
        message: `Order of display must be a valid positive number.`,
        options: { variant: "error" },
      })
      return;
    }
    const initialOrder = column?.colDef?.order_of_display || 0;
  if (initialOrder !== orderValue && props.handleUniqueOrderOfDisplay) {
    props.handleUniqueOrderOfDisplay(initialOrder, orderValue, colId);
  }

    // Validate Advanced SQL Alias when present in extra.be_configs
    const beConfigs = getBeConfigs(jsonData);
    const trimmedSqlAlias = beConfigs?.sql_alias?.trim();
    if (trimmedSqlAlias) {
      const expectedSuffix = new RegExp(
        `\\s+AS\\s+${newColumnName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`,
        "i"
      );
      if (!expectedSuffix.test(trimmedSqlAlias)) {
        props.addSnack({
          message: `Advanced SQL Alias must end with "AS ${newColumnName}". Example: ROUND(COALESCE(${newColumnName}, 0), 2) AS ${newColumnName}`,
          options: { variant: "error" },
        });
        return;
      }
    }

    props.updateTableConfig({
      ...formState,
      label: newColumnLabel,
      previous_column_name: colId,
      column_name: newColumnName,
      order_of_display: orderValue, // Include this
      formatter: formState.formatter || "", // Include formatter
      extra: jsonData,
    });
    setColId(newColumnName);
    handleClose();
  };

  const open = Boolean(anchorEl);
  const id = open ? "column-settings" : undefined;

  const handleOpenModal = () => {
    setOpenModal(true);
  };

  const handleCloseModal = (event, reason) => {
    if (reason && reason === "backdropClick") return;
    setOpenModal(false);
  };

  const handleSaveJsonData = (data) => {
    // data = flat (from form) or structured (from Preview JSON); partition so be_configs keys stay inside extra.be_configs
    const raw = typeof data === "object" && data !== null ? data : {};
    const newBeConfigs = {};
    const otherExtra = {};
    Object.entries(raw).forEach(([key, value]) => {
      if (key === BE_CONFIGS_KEY && value && typeof value === "object" && !Array.isArray(value)) {
        // Structured: nested be_configs object
        BE_CONFIGS_KEYS.forEach((k) => {
          if (Object.prototype.hasOwnProperty.call(value, k)) {
            newBeConfigs[k] = value[k];
          }
        });
      } else if (BE_CONFIGS_KEYS.includes(key)) {
        newBeConfigs[key] = value;
      } else {
        otherExtra[key] = value;
      }
    });
    const hasBeConfigs = Object.keys(newBeConfigs).length > 0;
    setJsonData((prev) => {
      // Build extra with same structure: be_configs keys only inside extra.be_configs, never at top level
      const next = { ...otherExtra };
      BE_CONFIGS_KEYS.forEach((k) => delete next[k]);
      if (hasBeConfigs) {
        next[BE_CONFIGS_KEY] = newBeConfigs;
      } else {
        delete next[BE_CONFIGS_KEY];
      }
      return next;
    });
    setOpenModal(false);
  };

  return (
    <div className={classes.customHeaderContainer}>
      <span
        className={`ag-header-cell-text ${
          props?.column?.colDef?.wrapText && classes.wrappableHeaderCell
        }`}
      >
        {column?.getColDef()?.headerName}
      </span>

      <div className={classes.iconDiv}>
        {colDef?.is_searchable === true && (
          <SearchIcon fontSize="small" style={{ cursor: 'default' }} />
        )}
        {colDef?.is_sortable === true && (
          <Sort fontSize="small" style={{ cursor: 'default' }} />
        )}
        <MoreVertIcon
          aria-describedby={id}
          variant="contained"
          onClick={handleClick}
        />
        <Popover
          id={id}
          open={open}
          anchorEl={anchorEl}
          onClose={handleClose}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "right",
          }}
          PaperProps={{
            sx: {
              boxShadow: "none",
              borderRadius: "4px",
              border: "1px solid #E0E0E0",
            },
          }}
        >
          <div
            className={`${globalClasses.flexRow} ${globalClasses.flexColumn} ${globalClasses.colSettingsWrapper} ${classes.colSettingsHeaderConatiner} ${globalClasses.paddingAround} ${classes.colSettingsWrapper} ${classes.colSettingsWrapperDefault}`}
          >
            <Typography
              className={`${globalClasses.flexRow} ${classes.colSettingsHeaderConatiner} ${globalClasses.verticalAlignCenter} ${globalClasses.marginBottom}`}
              variant="h6"
            >
              <SettingsIcon
                className={classes.colSettingsHeaderIcon}
                fontSize="small"
              />{" "}
              Column Settings
            </Typography>
            {!isEmpty(formState) &&
              Object.keys(formState)?.map((form, index) => {
                if (form === "formatter" || form === "is_editable") return null;
                const isOrderField = form === "order_of_display";
                return (
                  <>
                    <TableFormRenderer
                      onChange={(change) => handelChange(change, form)}
                      value={formState[form]}
                      formKey={form}
                      disableForm={!isOrderField && disableForm}
                    />
                    {form === "order_of_display" && (() => {
                      const columnType = column?.colDef?.type;
                      const formatterOptions = FORMATTER_OPTIONS[columnType];
                      
                      
                      if (!formatterOptions) return null;
                      
                      return (
                        <>
                          <div className={classes.menuDivider} />
                          <div
                            className={`${globalClasses.flexRow} ${globalClasses.layoutAlignSpaceBetween} ${globalClasses.verticalAlignCenter} ${globalClasses.gap}`}
                          >
                            <Typography variant="h6">Formatter</Typography>
                            <Select
                              value={formState.formatter || ""}
                              onChange={(e) =>
                                handelChange({ formatter: e.target.value }, "formatter")
                              }
                              size="small"
                              disabled={disableForm}
                              displayEmpty
                              sx={{ minWidth: 150 }}
                            >
                              {formatterOptions.map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                  {option.label}
                                </MenuItem>
                              ))}
                            </Select>
                          </div>
                        </>
                      );
                    })()}
                    {Object.keys(formState).length !== index + 1 && (
                      <div className={classes.menuDivider} />
                    )}
                  </>
                );
              })}
            <div className={globalClasses.flexAlignBetweenCenter}>
              <Typography>Extra</Typography>
              <Button variant="text" size="medium" onClick={handleOpenModal}>
                Edit
              </Button>
            </div>
            <div
              className={`${globalClasses.flexRow} ${globalClasses.gap} ${globalClasses.layoutAlignEnd} ${globalClasses.marginTop}`}
            >
              <Button
                variant="url"
                onClick={initializeConfigurationForm}
              >
                Reset
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
              >
                Save
              </Button>
            </div>
          </div>
          <ExtraConfigurationModal
            open={openModal}
            onClose={handleCloseModal}
            onSave={handleSaveJsonData}
            nonRemovableKeys={BE_CONFIGS_KEYS}
            beConfigsKey={BE_CONFIGS_KEY}
            beConfigsLabels={BE_CONFIGS_LABELS}
            defaultBeConfigs={DEFAULT_BE_CONFIGS}
            columnNameForTemplate={formState?.column_name || colId || ""}
            isRequired={Boolean(column?.colDef?.is_required)}
            initialData={(() => {
              const otherExtra = { ...jsonData };
              delete otherExtra[BE_CONFIGS_KEY];
              const beConfigsEntries = jsonData[BE_CONFIGS_KEY] || {};
              return { ...otherExtra, ...beConfigsEntries };
            })()}
          />
        </Popover>
      </div>
    </div>
  );
};

export const PreviewTable = (props) => {
  const { tablePayloadConfiguration, allMappings, mandatoryColumnNames = [] } = { ...props };
  const [updatedConfig, setUpdatedConfig] = useState({});
  const [columns, setColumns] = useState([]);

  useEffect(() => {
    setUpTableColumns();
  }, [tablePayloadConfiguration]);

  /**
   * @function
   * @description Call Parent update function to update the configuration on changes
   */
  useEffect(() => {
    props.updateConfig(updatedConfig);
  }, [updatedConfig]);

  /**
   * @function
   * @desc Update table column data based on user form input
   */
  const setUpTableColumns = () => {
    // Handle empty or undefined config
    if (!tablePayloadConfiguration || (!tablePayloadConfiguration.mappings?.length && !tablePayloadConfiguration.groups?.length)) {
      setColumns([]);
      return;
    }

    const config = cloneDeep(tablePayloadConfiguration);

    const groupedCol = (config?.groups || []).map((group) => ({
      column_name: group.column_name,
      is_deleted: group.is_deleted,
      label: group.label,
      dimension: group.dimension,
      order_of_display: group.order_of_display,
      sub_headers: sortBy(cloneDeep(group?.mappings), ["order_of_display"]),
    }));

    let cols = [...(config?.mappings || []), ...groupedCol];

    cols.sort((a, b) => a.order_of_display - b.order_of_display);
    cols = agGridColumnFormatter(cols);
    setColumns(cols);
  };

  /**
   * @function
   * @description Handle unique display order values when order_of_display changes
   */
  const handleUniqueOrderOfDisplay = (initialValue, value, columnName) => {
    if (initialValue === value) return;
    
    const config = cloneDeep(tablePayloadConfiguration);
    const allItems = [...(config?.mappings || []), ...(config?.groups || [])];
  
    // Find the item that currently has the target position
    const itemAtTargetPosition = allItems.find(
      item => item.order_of_display === value && item.column_name !== columnName
    );
  
    const updatedItems = allItems.map((item) => {
      // Update the edited column with new value
      if (item.column_name === columnName) {
        return { ...item, order_of_display: value };
      }
      
      // Swap: Item that was at target position gets the initial value
      if (itemAtTargetPosition && item.column_name === itemAtTargetPosition.column_name) {
        return { ...item, order_of_display: initialValue };
      }
      
      return item;
    });

    props.updateConfig({
      ...config,
      mappings: updatedItems.filter(item => !config.groups?.some(g => g.column_name === item.column_name)),
      groups: updatedItems.filter(item => config.groups?.some(g => g.column_name === item.column_name)),
    });
  };

  return (
    <div>
      <AgGrid
        tableHeader = "Table Header"
        columns={columns}
        rowdata={[]}
        skipAutoSizeColumn
        sideBar={false}
        pagination={false}
        tableId="configuration-table-preview"
        customHeaderComponent={(tableProps) => (
          <CustomHeader
            {...tableProps}
            allMappings={allMappings}
            tablePayloadConfiguration={tablePayloadConfiguration}
            mandatoryColumnNames={mandatoryColumnNames}
            addSnack={props.addSnack}
            updateTableConfig={(config) => setUpdatedConfig(config)}
            handleUniqueOrderOfDisplay={handleUniqueOrderOfDisplay}
            onOpenTemplatePanel={props.onOpenTemplatePanel}
          />
        )}
      />
    </div>
  );
};

const mapStateToProps = (state) => ({});

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators(
    {
      addSnack,
    },
    dispatch
  );
};

export default connect(mapStateToProps, mapDispatchToProps)(PreviewTable);
