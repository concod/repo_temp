import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import { Tag } from "impact-ui";
import { Input, Select as ImpactSelect, Button,Panel } from "impact-ui-v3";
import Select from "core/Utils/select";
import styles from "../moduleConfiguratorScreen/designSystem.module.css";
import {
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import { staticTableForm } from "./constant";
import DragAndDrop from "core/commonComponents/dragDrop";
import { useState, useEffect } from "react";
import {
  cloneDeep,
  lowerCase,
  capitalize,
  uniqueId,
  isEmpty,
  startCase,
} from "lodash";
import { addSnack } from "core/actions/snackbarActions";
import { setEnableTableHeaderEdit } from "./services-table-configurator";
import { hasCaseInsensitiveDuplicates } from "core/Utils/functions/utils";
import GroupedCarousel from "./groupedCarousels";
import PreviewTable, { AliasTemplatePanel } from "./previewTable";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";

// Configurable list of keys to identify mandatory columns/dimensions
// When empty, no mandatory logic is applied
const MANDATORY_KEYS = ['is_required']; // Can be modified to include other keys like ['is_required', 'is_mandatory']

const TableConfigurationForm = (props) => {
  const {
    allMappings,
    tcCode,
    hideNameField = false,
    tName,
    savedTableConfiguration = {},
    dimensions = [],
    columnConfigurationLabel = "Column configuration",
  } = {
    ...props,
  };
  const [currentSourceMappings, setCurrentSourceMappings] = useState([]);
  const [formConfig, setFromConfig] = useState([]);
  const [warningShown, setWarningShown] = useState([]);
  const [formDependency, setFormDependency] = useState({});
  const [sourceAccordions, setSourceAccordions] = useState({});
  const [selectedSources, setSelectedSources] = useState([]);
  const [selectedSourceCheck, setSelectedSourceCheck] = useState([]);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isSelectAll, setIsSelectAll] = useState(false);
  const [selectSourcesOptions, setSelectSourcesOptions] = useState([]);
  const [selectSourcesSelected, setSelectSourcesSelected] = useState([]);
  const [isSelectSourcesOpen, setIsSelectSourcesOpen] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [groupedTags, setGroupedTags] = useState([]);
  const [columnsInReview, setColumnsInReview] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [dragDropTags, setDragDropTags] = useState([]);
  const [groupedColumns, setGroupedColumns] = useState([]);
  const [checkGroupColumns, setCheckedGroupColumns] = useState([]);
  const [currentGroupInEdit, setCurrentGroupInEdit] = useState({});
  const [tablePayloadConfiguration, setTablePayloadConfiguration] = useState(
    {}
  );
  // Added a state variable to track if any edits have been made
  const [isToolEdited, setIsToolEdited] = useState(false);
  
  // State to store mandatory dimensions and columns
  const [mandatoryData, setMandatoryData] = useState({
    mandatoryDimensions: new Set(),
    mandatoryColumns: new Map(),
  });

  // Alias template panel (right-side) - when open, main content shifts left (push effect)
  const [aliasTemplatePanelContext, setAliasTemplatePanelContext] = useState({
    open: false,
    columnName: "",
    onApply: null,
  });

  /**
   * @function
   * @description Find mandatory dimensions and columns based on configurable keys in table_group
   * @param {Array} mandatoryKeys - List of keys to check (e.g., ['is_required'])
   * @returns {Object} { mandatoryDimensions: Set, mandatoryColumns: Map }
   */
  const findMandatoryFromSavedConfig = (mandatoryKeys = []) => {
    const mandatoryDimensions = new Set();
    const mandatoryColumns = new Map(); // column_name -> { dimension, normalizedDimension, isRequired }

    // If no mandatory keys configured, return empty sets
    if (!mandatoryKeys || mandatoryKeys.length === 0) {
      return { mandatoryDimensions, mandatoryColumns };
    }

    if (!savedTableConfiguration || Object.keys(savedTableConfiguration).length === 0) {
      return { mandatoryDimensions, mandatoryColumns };
    }

    // Check individual mappings
    savedTableConfiguration.mappings?.forEach((mapping) => {
      const isRequired = mandatoryKeys.some(key => mapping[key] === true);
      if (isRequired) {
        const normalizedDimension = lowerCase(mapping.dimension || 'custom');
        mandatoryDimensions.add(normalizedDimension);
        mandatoryColumns.set(mapping.column_name, {
          dimension: mapping.dimension,
          normalizedDimension: normalizedDimension,
          isRequired: true
        });
      }
    });

    // Check grouped columns
    savedTableConfiguration.groups?.forEach((group) => {
      group.mappings?.forEach((mapping) => {
        const isRequired = mandatoryKeys.some(key => mapping[key] === true);
        if (isRequired) {
          const normalizedDimension = lowerCase(mapping.dimension || 'custom');
          mandatoryDimensions.add(normalizedDimension);
          mandatoryColumns.set(mapping.column_name, {
            dimension: mapping.dimension,
            normalizedDimension: normalizedDimension,
            isRequired: true
          });
        }
      });
    });

    return { mandatoryDimensions, mandatoryColumns };
  };

  // Compute mandatory data when savedTableConfiguration or MANDATORY_KEYS change
  useEffect(() => {
    const data = findMandatoryFromSavedConfig(MANDATORY_KEYS);
    setMandatoryData(data);
  }, [savedTableConfiguration]);

  useEffect(() => {
    initialSetup();
  }, []);

  useEffect(() => {
    updateGroupedColumns();
  }, [selectedSources]);

  useEffect(() => {
    const allColumns = groupedTags.map((group) => group.value);
    const newColumnsInReview = selectedSourceCheck.filter(
      (group) => !allColumns.includes(group.value)
    );
    setColumnsInReview(newColumnsInReview);
  }, [groupedTags, selectedSourceCheck]);

  useEffect(() => {
    setUpTableConfiguration();
  }, [columnsInReview, groupedColumns]);

  useEffect(() => {
    if (props.getValidationFunc) {
      props.getValidationFunc(saveTableConfigurationChanges);
    }
  }, [tablePayloadConfiguration, warningShown, isToolEdited]);

  useEffect(() => {
    setWarningShown(false);
  }, [tablePayloadConfiguration]);

  // Sync selectSources options and selected values
  useEffect(() => {
    const selectSourcesConfig = formConfig.find(config => config.formAccessor === "selectSources");
    if (selectSourcesConfig) {
      const selectSourcesField = selectSourcesConfig.form.find(field => field.accessor === "selectSources");
      const initialOptions = Array.isArray(selectSourcesField?.options) ? selectSourcesField.options : [];

      // Update options state when initialOptions change
      if (initialOptions.length > 0 && selectSourcesOptions.length === 0) {
        setSelectSourcesOptions(initialOptions);
      }

      // Sync selectedOptions with formDependency
      const currentSelectedValues = formDependency["selectSources"]?.["selectSources"] || [];
      const selected = initialOptions.filter(opt => currentSelectedValues.includes(opt.value));
      setSelectSourcesSelected(selected);
    }
  }, [formConfig, formDependency["selectSources"], selectSourcesOptions.length]);

  /**
   * @function
   * @description Update table payload on every updated call with the configs provided
   * @param {Object} config
   */
  const updateConfig = (config) => {
    // Set the tool edited flag to true when configuration is updated
    setIsToolEdited(true);
    const targetColumnName = config?.previous_column_name || config?.column_name;
    const { previous_column_name, ...configToApply } = config || {};
    
    let updatedTabelConfiguration = isEmpty(config)
      ? cloneDeep(tablePayloadConfiguration)
      : cloneDeep(config);
    let mappings =
      updatedTabelConfiguration?.mappings ||
      cloneDeep(tablePayloadConfiguration?.mappings) ||
      [];
    let groups =
      updatedTabelConfiguration?.groups ||
      cloneDeep(tablePayloadConfiguration?.groups) ||
      [];
    let isLabelDuplicate = false;
    mappings?.forEach((col, index) => {
      if (col.column_name != targetColumnName && col.label == configToApply.label) {
        isLabelDuplicate = true;
      }
      if (col.column_name === targetColumnName) {
        mappings[index] = {
          ...col,
          ...configToApply,
        };
      }
    });
    groups?.forEach((group, groupIndex) => {
      let groupedMappings = groups[groupIndex].mappings;
      group.mappings.forEach((col, colIndex) => {
        if (
          col.column_name != targetColumnName &&
          col.label == configToApply.label
        ) {
          isLabelDuplicate = true;
        }
        if (col.column_name === targetColumnName) {
          groupedMappings[colIndex] = {
            ...col,
            ...configToApply,
          };
        }
      });
    });
    if (isLabelDuplicate) {
      displaySnackMessage(
        `Please select unique label name for ${targetColumnName} column.`,
        "error"
      );
      return;
    }
    const saveTableConfig = {
      ...cloneDeep(tablePayloadConfiguration),
      mappings: mappings,
      groups: groups,
    };
    (mappings?.length || groups?.length) &&
      setTablePayloadConfiguration(saveTableConfig);
  };

  const displaySnackMessage = (message, variant) => {
    props.addSnack({
      message: message,
      options: {
        variant: variant,
      },
    });
  };


  /**
   * @function
   * @description Initial setup on form load
   */
  const initialSetup = () => {
    const formConfiguration = cloneDeep(staticTableForm);
    let sources = {};

    //Deduplicate allMappings by column_name
    const seenColumnNames = new Set();
    const uniqueMappings = allMappings?.filter((mapping) => {
      if (seenColumnNames.has(mapping.column_name)) {
        return false; // Skip duplicate
      }
      seenColumnNames.add(mapping.column_name);
      return true; // Keep only one occurrence
    }) || [];

    const savedLabelByColumnName = new Map();
    savedTableConfiguration?.mappings?.forEach((m) => {
      if (m?.column_name && typeof m?.label === "string") {
        savedLabelByColumnName.set(m.column_name, m.label);
      }
    });
    savedTableConfiguration?.groups?.forEach((g) => {
      g?.mappings?.forEach((m) => {
        if (m?.column_name && typeof m?.label === "string") {
          savedLabelByColumnName.set(m.column_name, m.label);
        }
      });
    });

    const uniqueMappingsWithSavedLabels = uniqueMappings.map((m) => {
      const savedLabel = savedLabelByColumnName.get(m.column_name);
      return savedLabel ? { ...m, label: savedLabel } : m;
    });

    setCurrentSourceMappings(uniqueMappingsWithSavedLabels);
    const groupColumnNames = new Set(
      savedTableConfiguration?.groups?.map((group) => group.column_name)
    );

    uniqueMappingsWithSavedLabels.forEach((mappedOptions) => {
      if (groupColumnNames?.has(mappedOptions.column_name)) {
        return;
      }
      const dimension = lowerCase(
        dimensions.includes(mappedOptions.dimension)
          ? mappedOptions.dimension
          : "custom"
      );

      if (sources[dimension]?.length) {
        sources[dimension].push({
          value: mappedOptions.column_name,
          label: mappedOptions.label,
          dimension: mappedOptions.dimension, // Always use original dimension
        });
      } else {
        sources[dimension] = [
          {
            value: mappedOptions.column_name,
            label: mappedOptions.label,
            dimension: mappedOptions.dimension, // Always use original dimension
          },
        ];
      }
    });

    formConfiguration.forEach((formObj) => {
      if (formObj.formAccessor === "selectSources") {
        formObj.form.forEach((config) => {
          if (config.accessor === "selectSources") {
            // Check if mandatory logic should be applied
            const shouldApplyMandatory = MANDATORY_KEYS && MANDATORY_KEYS.length > 0;
            const { mandatoryDimensions } = mandatoryData;
            
            config.options = dimensions.map((source) => {
              let isDisabled = false;
              
              // Only disable if mandatory keys are configured and dimension has mandatory columns
              if (shouldApplyMandatory) {
                const normalizedSource = lowerCase(source);
                isDisabled = mandatoryDimensions.has(normalizedSource);
              }
              
              return {
                label: capitalize(source),
                value: source,
                isDisabled: isDisabled,
              };
            });
          }
        });
      }
    });
    setSourceAccordions(sources);
    setFromConfig(formConfiguration);
    prepopulateSavedConfiguration();
  };

  /**
   * @function
   * @description Update all states for current table configuration if there are any saved configurations
   */
  const prepopulateSavedConfiguration = () => {
    const dependency = cloneDeep(formDependency);
    const allSources = [];
    const checkedAttributesFromSources = [];
    const savedGroupedColumns = [];
    const clonedConfig = cloneDeep(savedTableConfiguration);
    let allGroupedTags = [];
    clonedConfig.mappings?.forEach((col) => {
      let colDimension = !dimensions.includes(col.dimension)
        ? "custom"
        : col.dimension;
      if (!allSources.includes(colDimension)) {
        allSources.push(colDimension);
      }
      const shouldApplyMandatory = MANDATORY_KEYS && MANDATORY_KEYS.length > 0;
      const isMandatory = shouldApplyMandatory && mandatoryData.mandatoryColumns.has(col.column_name);
      
      checkedAttributesFromSources.push({
        value: col.column_name,
        sourceType: colDimension,
        label: col.label,
        dimension: col.dimension, // Original dimension from saved config
        isMandatory: isMandatory,
      });
    });
    const groupedConfig = clonedConfig.groups?.map((group) => {
      const selectedTags = [];
      group.mappings.forEach((col) => {
        // Normalize dimension for comparison
        const normalizedColDimension = lowerCase(col.dimension);
        let colDimension = !dimensions.includes(normalizedColDimension)
          ? "custom"
          : normalizedColDimension;

        if (!allSources.includes(colDimension)) {
          allSources.push(colDimension);
        }
        // Group children are tracked only via groupedTags/groupedColumns,
        // This prevents them from showing as
        // individual selected items in the source dropdowns.
        // If a child is removed from a group, it becomes available (unselected)
        // in the dropdown for re-selection.
        selectedTags.push({
          value: col.column_name,
          label: col.label,
          type: colDimension,
          variant: "default",
        });
      });
      allGroupedTags = [...allGroupedTags, ...selectedTags];
      savedGroupedColumns.push({
        groupName: group.label,
        groupId: uniqueId(group.label),
        colGroup: selectedTags,
      });

      return {
        column_name: group.column_name,
  label: group.label || group.groupName,
        dimension: group.dimension,
        mappings: group.mappings,
      };
    });
    dependency["nameForm"] = {
      nameForm:
        savedTableConfiguration.table_name ||
        startCase(tName.replaceAll("_", " ")),
    };
    dependency["selectSources"] = {
      selectSources: allSources,
    };

    // Ensure all mappings have is_deleted: false when loading saved configuration
    const mappingsWithFixedDeleted = clonedConfig.mappings?.map((mapping) => ({
      ...mapping,
      is_deleted: false,
    })) || [];
    
    // Ensure all group mappings have is_deleted: false
    const groupsWithFixedDeleted = groupedConfig?.map((group) => ({
      ...group,
      mappings: group.mappings?.map((mapping) => ({
        ...mapping,
        is_deleted: false,
      })) || [],
    })) || [];

    let config = {
      table_name: tName,
      tc_code: tcCode,
      mappings: mappingsWithFixedDeleted,
      groups: groupsWithFixedDeleted,
    };

    setTablePayloadConfiguration(config);
    setGroupedTags(allGroupedTags);
    setGroupedColumns(savedGroupedColumns);
    setSelectedSourceCheck(checkedAttributesFromSources);
    setSelectedSources(allSources);
    setFormDependency(dependency);
  };

  /**
   * @function
   * @description Restore columns from saved configuration when sources are re-selected
   * @param {Array} selectedSources - Currently selected source dimensions
   * @returns {Array} Restored columns for selectedSourceCheck
   */
  const restoreColumnsFromSavedConfig = (selectedSources) => {
    if (!savedTableConfiguration || Object.keys(savedTableConfiguration).length === 0) {
      return [];
    }

    const restoredColumns = [];
    const restoredGroups = [];
    const restoredGroupTags = [];
    const clonedConfig = cloneDeep(savedTableConfiguration);

    // Restore individual mappings that match selected sources
    clonedConfig.mappings?.forEach((col) => {
      const normalizedColDimension = lowerCase(col.dimension);
      const colDimension = !dimensions.includes(normalizedColDimension)
        ? "custom"
        : normalizedColDimension;
      
      if (selectedSources.includes(colDimension)) {
        const shouldApplyMandatory = MANDATORY_KEYS && MANDATORY_KEYS.length > 0;
        const isMandatory = shouldApplyMandatory && mandatoryData.mandatoryColumns.has(col.column_name);
        
        restoredColumns.push({
          value: col.column_name,
          sourceType: colDimension,
          label: col.label,
          dimension: col.dimension,
          isMandatory: isMandatory,
        });
      }
    });

    // Restore grouped columns that match selected sources
    clonedConfig.groups?.forEach((group) => {
      const normalizedGroupDimension = lowerCase(group.dimension || '');
      const groupDimension = !dimensions.includes(normalizedGroupDimension)
        ? "custom"
        : normalizedGroupDimension;
      
      if (selectedSources.includes(groupDimension)) {
        const selectedTags = [];
        group.mappings.forEach((col) => {
          const normalizedColDimension = lowerCase(col.dimension);
          const colDimension = !dimensions.includes(normalizedColDimension)
            ? "custom"
            : normalizedColDimension;
          
          const shouldApplyMandatory = MANDATORY_KEYS && MANDATORY_KEYS.length > 0;
          const isMandatory = shouldApplyMandatory && mandatoryData.mandatoryColumns.has(col.column_name);
          
          // Group children tracked only via groupedTags/groupedColumns,
          // not in restoredColumns (selectedSourceCheck)
          selectedTags.push({
            value: col.column_name,
            label: col.label,
            type: colDimension,
            variant: "default",
            isMandatory: isMandatory,
          });
        });
        
        restoredGroupTags.push(...selectedTags);
        restoredGroups.push({
          groupName: group.label,
          groupId: uniqueId(group.label),
          colGroup: selectedTags,
        });
      }
    });

    // Update states with restored data (side effects)
    setGroupedColumns(restoredGroups);
    setGroupedTags(restoredGroupTags);
    
    // Update table payload configuration
    // Ensure all mappings have is_deleted: false when restoring
    const mappingsWithFixedDeleted = clonedConfig.mappings?.map((mapping) => ({
      ...mapping,
      is_deleted: false,
    })) || [];
    
    const groupedConfig = clonedConfig.groups?.map((group) => {
      return {
        column_name: group.column_name,
    label: group.label || group.groupName,
        dimension: group.dimension,
        mappings: group.mappings?.map((mapping) => ({
          ...mapping,
          is_deleted: false,
        })) || [],
      };
    });

    const config = {
      table_name: tName,
      tc_code: tcCode,
      mappings: mappingsWithFixedDeleted,
      groups: groupedConfig,
    };
    
    setTablePayloadConfiguration(config);
    
    // Return restored columns
    return restoredColumns;
  };

  /**
   * @function
   * @description Fetch table configuration to setup table columns respective dimension
   */
  const setUpTableConfiguration = () => {
    let counter = 0;
    const mappings = [];
    const originalConfig = cloneDeep(tablePayloadConfiguration);

    [...currentSourceMappings].forEach((col) => {
      if (
        columnsInReview?.some(
          (reviewCols) =>
            col.column_name === reviewCols.value &&
            col.dimension === reviewCols.dimension
        )
      ) {
        let filteredOriginal =
          originalConfig?.mappings?.filter(
            (filteredCol) => col.column_name === filteredCol.column_name
          ) || [];
        if (!filteredOriginal.length) {
          filteredOriginal = cloneDeep(col);
        }
        // saved config order -> DB entry order (from allMappings) -> counter
        const orderOfDisplay = filteredOriginal[0]?.order_of_display ?? col.order_of_display ?? counter++;
        // Exclude is_deleted from saved config and explicitly set to false for active mappings
        const { is_deleted, ...savedConfigWithoutDeleted } = filteredOriginal[0] || {};
        mappings.push({
          ...col,
          order_of_display: orderOfDisplay,
          ...savedConfigWithoutDeleted,
          is_deleted: false, // Always false for selected/active mappings
        });
      }
    });

    const groupedCol = groupedColumns.map((group) => {
      const filteredGroup = originalConfig.groups?.filter(
        (prevGroup) => prevGroup.label === group.groupName
      );
      if (
        filteredGroup.length &&
        filteredGroup[0].mappings?.length === group.colGroup.length
      ) {
        // Ensure all mappings in the group have is_deleted: false
        const groupWithFixedDeleted = {
          ...filteredGroup[0],
          mappings: filteredGroup[0].mappings?.map((mapping) => ({
            ...mapping,
            is_deleted: false,
          })) || [],
        };
        return groupWithFixedDeleted;
      }
      const groupedMappings = group.colGroup?.map((col) => col.value);
      const newGroupedColumns = [];
      [...currentSourceMappings].forEach((col) => {
        if (groupedMappings.includes(col.column_name)) {
          // DB entry order (from allMappings) -> counter
          const colOrder = col.order_of_display ?? counter++;
          newGroupedColumns.push({
            ...col,
            order_of_display: colOrder,
            is_frozen: false,
            is_deleted: false, // Always false for active grouped mappings
          });
        }
      });
      // For new groups, use counter as order_of_display
      return {
        column_name: group.groupName.toLowerCase().replace(" ", "_"),
        label: group.groupName,
        dimension: "others",
        order_of_display: counter++,
        mappings: newGroupedColumns,
      };
    });
    let config = {
      table_name: tName,
      tc_code: tcCode,
      mappings: mappings,
      groups: groupedCol,
    };
    // Always update table configuration to reflect current state in preview
    setTablePayloadConfiguration(config);
  };

  /**
   * @function
   * @description Callback function for Validation and other functionalities
   */
  const saveTableConfigurationChanges = async () => {
    const isValid = isValidData();
    isValid && setWarningShown(false);
    
    // Ensure all mappings have is_deleted: false before saving
    const mappingsWithFixedDeleted = tablePayloadConfiguration.mappings?.map((mapping) => ({
      ...mapping,
      is_deleted: false,
    })) || [];
    
    // Ensure all group mappings have is_deleted: false
    const groupsWithFixedDeleted = tablePayloadConfiguration.groups?.map((group) => ({
      ...group,
      mappings: group.mappings?.map((mapping) => ({
        ...mapping,
        is_deleted: false,
      })) || [],
    })) || [];
    
    const payloadData = {
      ...tablePayloadConfiguration,
      mappings: mappingsWithFixedDeleted,
      groups: groupsWithFixedDeleted,
    };
    
    // Only include is_tool_edited flag if it's true
    const data = isToolEdited 
      ? { ...payloadData, is_tool_edited: true }
      : payloadData;
      
    return {
      isValid: isValid,
      data: data,
    };
  };

  /**
   * @function
   * @description
   * @returns {Boolean} Returns true/false depends on the table data
   */
  const isValidData = () => {
    let isValid =
      Boolean(columnsInReview.length) ||
      Boolean(groupedColumns.length) ||
      warningShown;
    // Handle form Validation here
    if (!isValid) {
      displaySnackMessage(
        `No options selected from sources in ${startCase(
          tName.replaceAll("_", " ")
        )} tab. Click Save agiain to proceed.`,
        "warning"
      );
      setWarningShown(true);
    }
    return isValid;
  };

  /**
   * @function
   * @description Handle static form changes on user input
   * @param {Object} deps
   */
  const handleChange = (deps) => {
    const key = Object.keys(deps)[0];
    const newFormDependency = { ...formDependency, [key]: { ...deps } };
    if (deps["selectSources"]) {
      setSelectedSources([...deps["selectSources"]]);
      setSelectedSourceCheck((prevState) =>
        prevState.filter((item) =>
          deps["selectSources"].includes(item.sourceType)
        )
      );
    }
    if (key === "renameHeadersOptionForm") {
      console.log('Dispatching enableHeaderEdit:', deps["renameHeadersOptionForm"]);
      props.setEnableTableHeaderEdit(deps["renameHeadersOptionForm"]);
    }
    setFormDependency(newFormDependency);
  };

  /**
   * @function
   * @description Update Grouped columns and grouped tags if any of the souces are unchecked
   */
  const updateGroupedColumns = () => {
    setGroupedTags((prevState) =>
      prevState.filter((item) => selectedSources.includes(item.type))
    );
    groupedColumns?.length &&
      setGroupedColumns((prevState) =>
        prevState?.reduce((newGroupAcc, group) => {
          const cols = group.colGroup.filter((item) =>
            selectedSources.includes(item.type)
          );
          if (cols.length) {
            return [...newGroupAcc, { ...group, colGroup: cols }];
          }
          return newGroupAcc;
        }, [])
      );
  };

  /**
   * @function
   * @description Show sources tags when sources are selected
   * @param {Array} selectedOptions
   * @param {String} accessor
   * @returns {ReactElement}
   */

  /**
   * @function
   * @description Update tags when cols are selected in souce accordions
   * @param {Boolean} checked
   * @param {String} value
   * @param {String} source
   * @param {String} dimension
   */
  const onSourceSelectionChanges = (checked, value, source, dimension) => {
    const shouldApplyMandatory = MANDATORY_KEYS && MANDATORY_KEYS.length > 0;
    
    // Prevent removal of mandatory columns
    if (!checked && shouldApplyMandatory) {
      const { mandatoryColumns } = mandatoryData;
      if (mandatoryColumns.has(value)) {
        displaySnackMessage(
          "This column is mandatory and cannot be removed",
          "warning"
        );
        return;
      }
    }
    
    setIsToolEdited(true);
    
    if (!checked) {
      setSelectedSourceCheck((prevState) => {
        const normalizedDimension = typeof dimension === "string" ? dimension.toLowerCase() : dimension;
        return prevState.filter(
          (item) =>
            !(
              item.value === value &&
              String(item.dimension || "").toLowerCase() === normalizedDimension &&
              item.sourceType === source
            )
        );
      });
    } else {
      setSelectedSourceCheck((prevState) => {
        // Check if already exists to avoid duplicates
        const alreadyExists = prevState.some(
          (item) => item.value === value && item.dimension === dimension && item.sourceType === source
        );
        if (alreadyExists) {
          return prevState;
        }
        
        const checkedAttr = currentSourceMappings.filter(
          (mapping) =>
            mapping.column_name === value && mapping.dimension === dimension
        );
        const label =
          checkedAttr?.[0]?.label ||
          checkedAttr?.[0]?.column_name.replace("_", " ");
        
        const isMandatory = shouldApplyMandatory && mandatoryData.mandatoryColumns.has(value);
        
        return [
          ...prevState,
          {
            value: value,
            label: label,
            sourceType: source,
            dimension,
            isMandatory: isMandatory,
          },
        ];
      });
    }
  };

  /**
   * @function
   * @description Update state for drag and drop operation
   * Add tags from columnsInReview
   */
  const updateDragDropTags = (
    dragDropColumns = columnsInReview,
    selectedOptions = []
  ) => {
    const shouldApplyMandatory = MANDATORY_KEYS && MANDATORY_KEYS.length > 0;
    const { mandatoryColumns } = mandatoryData;
    
    const dragDropObj = [
      {
        type: "columns",
        label: `Note: You can add new columns by dragging and dropping it from the selected columns`,
        options: dragDropColumns.map((col) => {
          const isMandatory = shouldApplyMandatory && mandatoryColumns.has(col.value);
          return {
            value: col.value,
            label: replaceSpecialCharacter(col.label),
            type: col.sourceType,
            variant: "default",
            isMandatory: isMandatory,
          };
        }),
      },
      {
        type: "selected_columns",
        options: selectedOptions.map((col) => {
          const isMandatory = shouldApplyMandatory && mandatoryColumns.has(col.value);
          return {
            value: col.value,
            label: replaceSpecialCharacter(col.label),
            type: col.sourceType,
            variant: "default",
            isMandatory: isMandatory,
          };
        }),
      },
    ];
    setDragDropTags(dragDropObj);
  };

  /**
   * @function
   * @description Handle states on panel closed
   */
  const handlePanelClose = () => {
    if (!isEmpty(currentGroupInEdit)) {

      setIsToolEdited(true);
      
      setGroupedColumns([...groupedColumns, currentGroupInEdit]);
      setGroupedTags([...groupedTags, ...selectedColumns]);
    }
    setGroupName("");
    setSelectedColumns([]);
    setCurrentGroupInEdit({});
    setIsPanelOpen(false);
  };

  /**
   * @function
   * @description Remove tags with particular col_id if in a particular groupId
   * @param {String} groupId
   * @param {String} col_id
   */
  const moveColumnToReview = (groupId, col_id) => {
    const shouldApplyMandatory = MANDATORY_KEYS && MANDATORY_KEYS.length > 0;
    
    if (shouldApplyMandatory) {
      const { mandatoryColumns } = mandatoryData;
      
      if (mandatoryColumns.has(col_id)) {
        displaySnackMessage(
          "This column is mandatory and cannot be removed from the group",
          "warning"
        );
        return;
      }
    }

    setIsToolEdited(true);
    
    let updatedGroups = [...groupedColumns];
    let hasSingleValue = false;
    updatedGroups.forEach((group) => {
      if (group.groupId === groupId) {
        if (group.colGroup.length === 1) {
          hasSingleValue = groupId;
          deleteGroups(groupId);
          return false;
        }
        group.colGroup = group.colGroup.filter((col) => col.value != col_id);
      }
    });
    if (hasSingleValue) {
      return;
    }
    setGroupedTags((prevState) =>
      prevState.filter((col) => col.value !== col_id)
    );
    setGroupedColumns(updatedGroups);
  };

  /**
   * @function
   * @description Validate and save group once tags are dragged and drop
   */
  const saveNewGroup = () => {

    setIsToolEdited(true);
    
    const groupedColumnLabels = groupedColumns.map((col) => col.groupName);
    if (hasCaseInsensitiveDuplicates([...groupedColumnLabels, groupName])) {
      displaySnackMessage(
        "Duplicate group name. Please use another group name.",
        "error"
      );
      return;
    }
    const newGroup = {
      groupName: groupName,
      groupId: uniqueId(groupName),
      colGroup: selectedColumns,
    };

    setGroupedTags([...groupedTags, ...selectedColumns]);
    setGroupedColumns([...groupedColumns, newGroup]);
    setCurrentGroupInEdit({});
    setSelectedColumns([]);
    setGroupName("");
    setIsPanelOpen(false);
  };

  /**
   * @function
   * @description Delete selected group and update attributes back to review columns
   * @param {String} groupID id assigned to every group
   */
  const deleteGroups = (groupID) => {
    const shouldApplyMandatory = MANDATORY_KEYS && MANDATORY_KEYS.length > 0;
    
    if (shouldApplyMandatory) {
      const { mandatoryColumns } = mandatoryData;
      
      if (groupID) {
        const groupToDelete = groupedColumns.find((group) => group.groupId === groupID);
        if (groupToDelete) {
          const hasMandatoryColumn = groupToDelete.colGroup.some(
            (col) => mandatoryColumns.has(col.value)
          );
          
          if (hasMandatoryColumn) {
            displaySnackMessage(
              "This group contains mandatory columns and cannot be deleted",
              "warning"
            );
            return;
          }
        }
      } else {
        // When deleting multiple groups, check all selected groups
        const selectedGroups = groupedColumns.filter(g => 
          checkGroupColumns.includes(g.groupId)
        );
        const hasAnyMandatory = selectedGroups.some(group =>
          group.colGroup.some(col => mandatoryColumns.has(col.value))
        );
        
        if (hasAnyMandatory) {
          displaySnackMessage(
            "Some selected groups contain mandatory columns and cannot be deleted",
            "warning"
          );
          return;
        }
      }
    }

    setIsToolEdited(true);
    
    let newGroups = [];
    if (groupID) {
      newGroups = [...groupedColumns].filter(
        (group) => !(groupID === group.groupId)
      );
    } else {
      newGroups = [...groupedColumns]?.filter(
        (group) => !checkGroupColumns.includes(group.groupId)
      );
    }
    const colValues = (
      [...groupedColumns]
        ?.filter(
          (group) =>
            checkGroupColumns.includes(group.groupId) ||
            groupID === group.groupId
        )
        .map((group) => group.colGroup) || []
    )
      .flat()
      .map((col) => col.value);
    setGroupedTags((prevState) =>
      prevState.filter((col) => !colValues.includes(col.value))
    );
    setGroupedColumns(newGroups);
    setCheckedGroupColumns([]);
  };

  /**
   * @function
   * @description Hanlde Edit Mode setup for the selected Group (checkGroupColumns)
   */
  const editGroup = () => {

    setIsToolEdited(true);
    
    // Code for edit mode setup
    const groupID = checkGroupColumns[0];
    const groupToEdit = [];
    const selectedOptionValues = [];
    setGroupedColumns((prevState) => {
      return prevState.filter((group) => {
        if (group.groupId === groupID) {
          groupToEdit.push(group);
          return false;
        }
        return true;
      });
    });
    const selectedOptions = [
      ...groupToEdit[0]?.colGroup.map((item) => {
        selectedOptionValues.push(item.value);
        return {
          value: item.value,
          label: item.label,
          sourceType: item.type,
        };
      }),
    ];
    updateDragDropTags(columnsInReview, selectedOptions);
    setSelectedColumns([...groupToEdit[0]?.colGroup]);
    setGroupedTags((prevState) =>
      prevState.filter((tag) => !selectedOptionValues.includes(tag.value))
    );
    setCurrentGroupInEdit(...groupToEdit);
    setGroupName(groupToEdit[0].groupName);
    setCheckedGroupColumns([]);
    setIsPanelOpen(true);
  };

  /**
   * @func
   * @description Render the static form with saved user data and cascaed dependencies
   * @returns {ReactElement} returns form
   */
  const renderForm = () => {
    // Filter out nameForm as it will be rendered independently
    // Also filter out any form configs where the field has isHidden: true
    return formConfig
      .filter((config) => {
        if (config.formAccessor === "nameForm") return false;
        // Check if any field in the form has isHidden: true
        const hasHiddenField = config.form?.some((field) => field.isHidden === true);
        return !hasHiddenField;
      })
      .map((config) => {
        // Special handling for Column Sources to show it in the same row as heading
        if (config.formAccessor === "selectSources") {
          const selectSourcesField = config.form.find(field => field.accessor === "selectSources");
          const initialOptions = Array.isArray(selectSourcesField?.options) ? selectSourcesField.options : [];

          const handleSelectSourcesChange = (selectedOptions) => {
            if (!selectedOptions) {
              return;
            }

            // Update local state
            setSelectSourcesSelected(Array.isArray(selectedOptions) ? selectedOptions : [selectedOptions]);

            const selectedValues = Array.isArray(selectedOptions)
              ? selectedOptions.map(opt => opt?.value).filter(Boolean)
              : selectedOptions?.value ? [selectedOptions.value] : [];

            // Check for deselected mandatory dimensions
            const shouldApplyMandatory = MANDATORY_KEYS && MANDATORY_KEYS.length > 0;
            if (shouldApplyMandatory) {
              const { mandatoryDimensions } = mandatoryData;
              const previousSelectedSources = selectedSources.map(s => lowerCase(s));
              const newSelectedSources = selectedValues.map(s => lowerCase(s));
              
              const deselectedMandatoryDimensions = previousSelectedSources.filter(
                (source) => 
                  mandatoryDimensions.has(source) && 
                  !newSelectedSources.includes(source)
              );

              if (deselectedMandatoryDimensions.length > 0) {
                displaySnackMessage(
                  "Dimension cannot be removed as it has some mandatory columns",
                  "warning"
                );
                // Prevent deselection - keep mandatory dimensions selected
                const finalSelectedValues = [
                  ...newSelectedSources,
                  ...deselectedMandatoryDimensions
                ];
                
                // Update UI to reflect this
                setSelectSourcesSelected(
                  initialOptions.filter(opt => finalSelectedValues.includes(opt.value))
                );
                setSelectedSources(finalSelectedValues);
                
                const newFormDependency = {
                  ...formDependency,
                  selectSources: {
                    selectSources: finalSelectedValues
                  }
                };
                setFormDependency(newFormDependency);
                return;
              }
            }

            // Update formDependency
            const newFormDependency = {
              ...formDependency,
              selectSources: {
                selectSources: selectedValues
              }
            };

            // Update selectedSources state
            setSelectedSources(selectedValues);

            // If selectedSourceCheck is empty and we're selecting sources, restore from saved config
            setSelectedSourceCheck((prevState) => {
              // If we have no previous selections but are selecting sources, restore from saved config
              if (prevState.length === 0 && selectedValues.length > 0 && savedTableConfiguration && Object.keys(savedTableConfiguration).length > 0) {
                return restoreColumnsFromSavedConfig(selectedValues);
              }
              // Otherwise, just filter existing selections
              return (prevState || []).filter((item) =>
                selectedValues.includes(item.sourceType)
              );
            });

            setFormDependency(newFormDependency);
          };

          return (
            <div key={config.formAccessor}>
              <div className={`${styles.flexAlignBetweenCenter}`}>
                <div style={{ flexBasis: '50%' }} className={`${styles.text14} ${styles.fontBold}`}>
                  {columnConfigurationLabel}
                </div>
                <div style={{ flexBasis: '50%' }}>
                  <ImpactSelect
                    label="Current Sources"
                    currentOptions={selectSourcesOptions}
                    setCurrentOptions={setSelectSourcesOptions}
                    initialOptions={initialOptions}
                    selectedOptions={selectSourcesSelected}
                    setSelectedOptions={setSelectSourcesSelected}
                    handleChange={handleSelectSourcesChange}
                    isMulti={true}
                    isSelectAll={isSelectAll}
                    setIsSelectAll={setIsSelectAll}
                    toggleSelectAll={true}
                    isWithSelectAll={true}
                    isWithSearch={selectSourcesField?.isSearchable || false}
                    // isClearable={selectSourcesField?.isClearable || false}
                    placeholder={selectSourcesField?.label || "Select Column Sources"}
                    width={`${200 / 16}rem`}
                    minWidth={`${200 / 16}rem`}
                    height={'2rem'}

                    labelOrientation="left"
                    isOpen={isSelectSourcesOpen}
                    setIsOpen={setIsSelectSourcesOpen}
                    isCloseWhenClickOutside
                  />
          </div>

              </div>

        </div>
      );
        }

        // This should not be reached since all other form configs are filtered out
        // (nameForm is handled separately, renameHeadersOptionForm is hidden)
        return null;
    });
  };

  const handleClearAll = () => {
    setIsToolEdited(true);
    const shouldApplyMandatory = MANDATORY_KEYS && MANDATORY_KEYS.length > 0;
    
    if (shouldApplyMandatory) {
      const { mandatoryColumns } = mandatoryData;
      
      // Keep only mandatory columns in columnsInReview
      setColumnsInReview((prevState) =>
        prevState.filter((col) => mandatoryColumns.has(col.value))
      );
      
      // Keep only mandatory columns in selectedSourceCheck
      const mandatorySelected = selectedSourceCheck.filter(
        (col) => mandatoryColumns.has(col.value)
      );
      setSelectedSourceCheck(mandatorySelected);
      
      if (mandatorySelected.length > 0) {
        displaySnackMessage("Mandatory columns were not removed", "warning");
      }
    } else {
      setColumnsInReview([]);
      setSelectedSourceCheck([]);
    }
  };

  // Get nameForm config for independent rendering
  const nameFormConfig = formConfig.find((config) => config.formAccessor === "nameForm");
  const nameFormField = nameFormConfig?.form?.[0];
  const nameFormValue = formDependency["nameForm"]?.["nameForm"] || "";

  const handleOpenAliasTemplatePanel = ({ columnName, onApply }) => {
    setAliasTemplatePanelContext({ open: true, columnName, onApply });
  };

  const handleCloseAliasTemplatePanel = () => {
    setAliasTemplatePanelContext((prev) => ({ ...prev, open: false }));
  };

  const handleAliasTemplateApply = (expr) => {
    aliasTemplatePanelContext.onApply?.(expr);
    handleCloseAliasTemplatePanel();
  };

  return (
    <div>
      {/* Name of the table - Independent Input */}
      {nameFormField && !hideNameField && (
        <>
          <div style={{ marginBottom: '1rem' }}>
            <Input
              label={nameFormField.label}
              value={nameFormValue}
              disabled={true}
              placeholder={nameFormField.label}
              type="text"
            />
          </div>
        </>
      )}

      <div  className={`${styles.p12} ${styles.lightBlueBg} ${styles.rounded4}`}>
        <div className={styles.flex}>
          {/* Left Column: Column Configuration */}
          <div style={{ flex: '1', minWidth: 0 }}>
      {renderForm()}
      {Boolean(selectedSources.length) && (
              <div className={`${styles.nt20}`}>
                {(() => {
                  // Group sources: Product and Store in first row, others below
                  const productIndex = selectedSources.findIndex(s => lowerCase(s) === 'product');
                  const storeIndex = selectedSources.findIndex(s => lowerCase(s) === 'store');
                  const otherSources = selectedSources.filter((s, i) => i !== productIndex && i !== storeIndex);

                  const renderSourceDropdown = (source) => {
                    // Check if mandatory logic should be applied
                    const shouldApplyMandatory = MANDATORY_KEYS && MANDATORY_KEYS.length > 0;
                    const { mandatoryColumns } = mandatoryData;
                    const normalizedSource = lowerCase(source);

                    // Prepare options for Select component
                    const options = (sourceAccordions[source] || []).map((item) => {
                      let isMandatoryColumn = false;
                      let isDisabled = false;

                      if (shouldApplyMandatory) {
                        const columnInfo = mandatoryColumns.get(item.value);
                        isMandatoryColumn = columnInfo && 
                          lowerCase(columnInfo.normalizedDimension) === normalizedSource;
                        isDisabled = isMandatoryColumn;
                      }

                      return {
                        value: `${item.value}_${item.dimension}_${source}`, // Unique identifier
                        label: replaceSpecialCharacter(item.label),
                        originalValue: item.value,
                        dimension: item.dimension,
                        sourceType: source,
                        isMandatory: isMandatoryColumn,
                        isDisabled: isDisabled,
                      };
                    });

                    // Get mandatory options that must always be selected
                    const mandatoryOptions = shouldApplyMandatory 
                      ? options.filter((opt) => opt.isMandatory)
                      : [];

                    // Get currently selected options for this source
                    const userSelectedOptions = selectedSourceCheck
                      .filter((selectedItem) => selectedItem.sourceType === source)
                      .map((selectedItem) => {
                        const option = options.find(
                          (opt) =>
                            opt.originalValue === selectedItem.value &&
                            opt.dimension === selectedItem.dimension
                        );
                        return option;
                      })
                      .filter(Boolean);

                    // Always include mandatory options in selectedOptions
                    const selectedOptions = shouldApplyMandatory
                      ? [
                          ...mandatoryOptions,
                          ...userSelectedOptions.filter(
                            (userOpt) =>
                              !mandatoryOptions.some(
                                (mandatory) =>
                                  mandatory.originalValue === userOpt.originalValue &&
                                  mandatory.dimension === userOpt.dimension
                              )
                          ),
                        ]
                      : userSelectedOptions;

                    // Handle Select change
                    const handleSelectChange = (selectedOptions) => {
                      setIsToolEdited(true);

                      const selectedOptionsArray = Array.isArray(selectedOptions) ? selectedOptions : [];

                      // Get user-selected non-mandatory options
                      const userSelectedNonMandatory = shouldApplyMandatory
                        ? selectedOptionsArray.filter(
                            (selected) =>
                              !mandatoryOptions.some(
                                (mandatory) =>
                                  mandatory.originalValue === selected.originalValue &&
                                  mandatory.dimension === selected.dimension
                              )
                          )
                        : selectedOptionsArray;

                      // Combine mandatory options (always included) with user selections
                      const finalSelectedOptions = shouldApplyMandatory
                        ? [
                            ...mandatoryOptions, // Always include all mandatory options
                            ...userSelectedNonMandatory, // Include user's non-mandatory selections
                          ]
                        : selectedOptionsArray;

                      // Remove all items for this source first
                      setSelectedSourceCheck((prevState) =>
                        prevState.filter((item) => item.sourceType !== source)
                      );

                      // Add newly selected items (including mandatory ones)
                      if (finalSelectedOptions.length > 0) {
                        const newSelections = finalSelectedOptions.map((option) => {
                          if (option.originalValue && option.dimension) {
                            const checkedAttr = currentSourceMappings.filter(
                              (mapping) =>
                                mapping.column_name === option.originalValue &&
                                mapping.dimension === option.dimension
                            );
                            const label =
                              checkedAttr?.[0]?.label ||
                              checkedAttr?.[0]?.column_name.replace(/_/g, " ");

                            const isMandatory = shouldApplyMandatory && mandatoryColumns.has(option.originalValue);

                            return {
                              value: option.originalValue,
                              label: label,
                              sourceType: source,
                              dimension: option.dimension,
                              isMandatory: isMandatory,
                            };
                          }
                          return null;
                        }).filter(Boolean);

                        setSelectedSourceCheck((prevState) => [
                          ...prevState,
                          ...newSelections,
                        ]);
                      }
                    };

              return (
                      <div key={source} style={{ flex: 1 }}>
                        <Select
                          width={'100%'}
                          minWidth={'100%'}
                    label={capitalize(source)}
                          options={options}
                          isMulti={true}
                          isSearchable={true}
                          value={selectedOptions}
                          onChange={handleSelectChange}
                          placeholder={`Select columns from ${capitalize(source)}`}
                          isClearable={true}
                          isWithSelectAll={true}
                          isOptionDisabled={(option) => option.isDisabled || false}
                        />
                      </div>
                    );
                  };

                            return (
                    <>
                      {/* First row: Product and Store side by side */}
                      {(productIndex !== -1 || storeIndex !== -1) && (
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                          {productIndex !== -1 && renderSourceDropdown(selectedSources[productIndex])}
                          {storeIndex !== -1 && renderSourceDropdown(selectedSources[storeIndex])}
                    </div>
                      )}
                      {/* Other sources (like Custom) below */}
                      {otherSources.map((source) => (
                        <div key={source} style={{ marginBottom: '1rem' }}>
                          {renderSourceDropdown(source)}
                </div>
                      ))}
                    </>
              );
                })()}
          </div>
            )}
          </div>
        <div className={`${styles.mb16} ${styles.ml16} ${styles.mr16} ${styles.dividerVertical} `}></div>

          {/* Right Column: Review Selected Columns */}
          <div style={{ flex: '1', minWidth: 0 }}>
            <div className={`${styles.stack}`}>
            {Boolean(columnsInReview.length) && (
                <div className={`${styles.spaceBetweenFull}`}>
                  <div className={`${styles.fontBold} ${styles.text14}`}>
                  Review Selected Columns
                  </div>
                  <div className= {`${styles.flex} ${styles.gap12}`}>
                    <Button
                      size="medium"
                      variant="tertiary"
                      onClick={handleClearAll}
                    >
                      Clear All
                    </Button>

                    <Button
                      size="medium"
                      variant="secondary"
                      onClick={() => {
                        updateDragDropTags(), setIsPanelOpen(true);
                      }}
                      disabled={!columnsInReview.length}
                    >
                      Create Group
                    </Button>
                  </div>
                </div>
              )}
              <div
                className={`${styles.flex} ${styles.flexWrap} ${styles.gap8} ${styles.mb16}`}
                >
                  {columnsInReview.map((tag) => {
                    const shouldApplyMandatory = MANDATORY_KEYS && MANDATORY_KEYS.length > 0;
                    const isMandatoryColumn = shouldApplyMandatory && mandatoryData.mandatoryColumns.has(tag.value);
                    
                    return (
                      <Tag
                        key={`${tag.value}_${tag.dimension}`}
                        isRemovable={!isMandatoryColumn}
                        onClose={(_event) => {
                          if (!isMandatoryColumn) {
                            onSourceSelectionChanges(
                              false,
                              tag.value,
                              tag.sourceType,
                              tag.dimension
                            );
                          } else {
                            displaySnackMessage(
                              "This column is mandatory and cannot be removed",
                              "warning"
                            );
                          }
                        }}
                      >
                        {replaceSpecialCharacter(tag.label)}
                      </Tag>
                    );
                  })}
                </div>
            {Boolean(groupedColumns.length) && (
              <>
                <div
                    className={`${styles.flex} ${styles.gap8} ${styles.layoutAlignBetweenCenter}`}
                >
                  <Typography variant="h4">Groups</Typography>
                  <div
                      className={`${styles.flex} ${styles.gap8}`}
                  >
                    {Boolean(checkGroupColumns.length) && (
                      <Button
                          variant="tertiary"
                          icon={<DeleteIcon />}
                        onClick={() => deleteGroups()}
                      />
                    )}
                    {checkGroupColumns.length === 1 && (
                      <Button
                          variant="tertiary"
                          icon={<EditIcon />}
                          onClick={() => editGroup()}
                      />
                    )}
                  </div>
                </div>
                {Boolean(groupedColumns.length) &&
                  groupedColumns.map((group) => (
                    <GroupedCarousel
                      key={group.groupId}
                      groupConfig={group}
                      onRemoveColumn={(col_id) =>
                        moveColumnToReview(group.groupId, col_id)
                      }
                      checkedList={checkGroupColumns}
                      handleGroupCheck={(checked, id) => {
                        if (checked) {
                          setCheckedGroupColumns([...checkGroupColumns, id]);
                        } else {
                          setCheckedGroupColumns((prevState) =>
                            prevState.filter((item) => item !== id)
                          );
                        }
                      }}
                    />
                  ))}
              </>
            )}

            </div>
            <div>
              <Panel
                anchor="right"
                size="large"
                onClose={() => handlePanelClose()}
                title="Create Group"
                primaryButtonLabel="Save Group"
                primaryButtonProps={{
                  disabled:
                    !Boolean(selectedColumns.length) ||
                    !Boolean(groupName.replace(" ", "").length),
                }}
                onPrimaryButtonClick={saveNewGroup}
                secondaryButtonLabel="Cancel"
                onSecondaryButtonClick={() => handlePanelClose()}
                 open={isPanelOpen}
                setIsOpen={setIsPanelOpen}
              >
                <DragAndDrop
                  dependency={dragDropTags}
                  handleChange={({
                    allOptions,
                    primaryFileds,
                    _secondaryFields,
                  }) => setSelectedColumns(primaryFileds)}
                />
                {Boolean(selectedColumns.length) && (
                  <Input
                    label="Name of the group"
                    placeholder="Enter group name"
                    helperText="Please enter group name"
                    onChange={(event) => setGroupName(event.target.value)}
                    value={groupName}
                  />
                )}
              </Panel>
            </div>
          </div>
        </div>

        {/* Bottom Section: Preview Table */}
      {(Boolean(columnsInReview.length) || Boolean(groupedColumns.length)) && (
        <div>
          <PreviewTable
            allMappings={currentSourceMappings}
            updateConfig={(config) => updateConfig(config)}
            tablePayloadConfiguration={cloneDeep(tablePayloadConfiguration)}
            mandatoryColumnNames={Array.from(mandatoryData.mandatoryColumns.keys())}
            getValidationFunc={props.getValidationFunc}
            enableHeaderEdit={props.enableHeaderEdit}
            onOpenTemplatePanel={handleOpenAliasTemplatePanel}
          />
        </div>
      )}
      </div>

      {/* Alias Template Modal - Build Expression from Template */}
      <AliasTemplatePanel
        open={aliasTemplatePanelContext.open}
        onClose={handleCloseAliasTemplatePanel}
        onApply={handleAliasTemplateApply}
        columnName={aliasTemplatePanelContext.columnName || "column"}
      />
    </div>
  );
};

TableConfigurationForm.propTypes = {
  // Madatory proptype will be added
};

const mapStateToProps = (state) => {
  return {
    enableHeaderEdit: state.tableConfiguratorReducer?.enableHeaderEdit,
  };
};

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators(
    {
      addSnack,
      setEnableTableHeaderEdit,
    },
    dispatch
  );
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(TableConfigurationForm);
