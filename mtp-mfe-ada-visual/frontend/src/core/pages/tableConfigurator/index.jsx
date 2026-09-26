import { useEffect, useState, useCallback } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";
import TableConfigurationForm from "./tableConfigurationForm";
import { Tabs } from "impact-ui-v3";
import { startCase, isEmpty, cloneDeep, lowerCase } from "lodash";
import { getTableConfiguration } from "core/actions/tableConfiguratorActions";
import { saveTableFormConfiguration } from "core/actions/tableConfiguratorActions";
import LoadingOverlay from "core/Utils/Loader/loader";
import {
  registerDependentComponentCallback,
  unregisterDependentComponentCallback,
} from "core/pages/moduleConfiguratorScreen/moduleWorkflowConfig/dependentComponentCallbacks";

const TableConfigurator = (props) => {
  const { 
    filterConfigProps, 
    setUpCallbacks, 
    isDependentComponent = false,
    loaderText = "Loading Table Configurations",
    title = "Column configuration",
    shownTables = []
  } = { ...props };
  const [tabs, setTabs] = useState([]);
  const [activeTab, setActiveTab] = useState();
  const [saveTableCallbacks, setSaveTableCallbacks] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    return () => {
      setSaveTableCallbacks(null);
      // Unregister callback when component unmounts or isDependentComponent changes
      unregisterDependentComponentCallback("tableConfigurator");
    };
  }, [isDependentComponent]);

  useEffect(() => {
    // Only fetch data if we have valid filterConfigProps
    // For dependent components, this will be set by DependentComponent
    // For standalone usage, filterConfigProps MUST have config_type === "tableConfig"
    if (!isDependentComponent) {
      // For standalone usage, we MUST have config_type === "tableConfig"
      if (
        isEmpty(filterConfigProps) ||
        filterConfigProps.config_type !== "tableConfig"
      ) {
        // Don't fetch if we don't have the correct config_type for standalone usage
        return;
      }
    }
    // For dependent components, only fetch if config_id is available
    if (isDependentComponent && !filterConfigProps?.config_id) {
      return; // Wait for DependentComponent to set config_id
    }
    // For dependent components, fetchConfigProps will have config_id set by DependentComponent
    fetchConfiguratorData();
  }, [filterConfigProps?.config_id, filterConfigProps?.config_type, isDependentComponent]);

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  /**
   * @function
   * @description Validate and update table values configured in the form to save it DB
   * If validation fails show user validation error and return validation status to parent
   */
  const saveTableConfigurationChanges = useCallback(async () => {
    if (saveTableCallbacks && !isEmpty(saveTableCallbacks)) {
      try {
        const collectiveData = await Object.keys(saveTableCallbacks).map(
          async (key) => {
            const tabData = await saveTableCallbacks[key]();
            return { data: tabData.data, isValid: tabData.isValid };
          }
        );
        return Promise.all(collectiveData).then(async (resp) => {
          try {
            let isValid = true;
            let tables = [];
            resp.forEach((dimensionData) => {
              isValid = isValid && dimensionData.isValid;
              tables = [...tables, dimensionData.data];
            });
            if (!isValid) {
              return isValid;
            }
            const payload = { tables };
            await saveTableFormConfiguration(payload);
            displaySnackMessages(
              "Table configuration saved successfully",
              "success"
            );
            return true;
          } catch (error) {
            displaySnackMessages("Error saving table configuration", "error");
            return false;
          }
        });
      } catch (error) {
        displaySnackMessages("Error saving table configuration", "error");
        return false;
      }
    } else {
      return false;
    }
  }, [saveTableCallbacks, displaySnackMessages]);

  /**
   * @function
   * @description Handle first load and setup table and  callbacks to parent to ensure smooth transition
   */
  useEffect(() => {
    if (setUpCallbacks) {
      setUpCallbacks({ nextNavFunc: saveTableConfigurationChanges });
    }
    
    // If used as dependent component, register save function in callback registry
    if (isDependentComponent && saveTableCallbacks) {
      registerDependentComponentCallback("tableConfigurator", saveTableConfigurationChanges);
    }
  }, [saveTableCallbacks, isDependentComponent, setUpCallbacks, saveTableConfigurationChanges]);

  /**
   * @function
   * @description Normalize all dimensions in the API response to lowercase
   * This ensures consistent case-insensitive comparisons throughout the application
   */
  const normalizeDimensionsInResponse = (data) => {
    const normalized = cloneDeep(data);

    // Normalize dimensions in table_config.tables[]
    if (normalized?.data?.data?.table_config?.tables) {
      normalized.data.data.table_config.tables.forEach((table) => {
        // Normalize dimensions array
        if (table.dimensions && Array.isArray(table.dimensions)) {
          table.dimensions = table.dimensions.map(dim => lowerCase(dim));
        }

        // Normalize dimensions in mappings[]
        if (table.mappings && Array.isArray(table.mappings)) {
          table.mappings.forEach((mapping) => {
            if (mapping.dimension && typeof mapping.dimension === 'string') {
              mapping.dimension = lowerCase(mapping.dimension);
            }
          });
        }
      });
    }

    // Normalize dimensions in table_group.tables[]
    if (normalized?.data?.data?.table_group?.tables) {
      normalized.data.data.table_group.tables.forEach((table) => {
        // Normalize dimensions in mappings[]
        if (table.mappings && Array.isArray(table.mappings)) {
          table.mappings.forEach((mapping) => {
            if (mapping.dimension && typeof mapping.dimension === 'string') {
              mapping.dimension = lowerCase(mapping.dimension);
            }
            // Normalize dimensions in sub_headers within mappings
            if (mapping.sub_headers && Array.isArray(mapping.sub_headers)) {
              mapping.sub_headers.forEach((subHeader) => {
                if (subHeader.dimension && typeof subHeader.dimension === 'string') {
                  subHeader.dimension = lowerCase(subHeader.dimension);
                }
              });
            }
          });
        }

        // Normalize dimensions in groups[]
        if (table.groups && Array.isArray(table.groups)) {
          table.groups.forEach((group) => {
            // Normalize group dimension if it exists
            if (group.dimension && typeof group.dimension === 'string') {
              group.dimension = lowerCase(group.dimension);
            }

            // Normalize dimensions in group mappings[]
            if (group.mappings && Array.isArray(group.mappings)) {
              group.mappings.forEach((mapping) => {
                if (mapping.dimension && typeof mapping.dimension === 'string') {
                  mapping.dimension = lowerCase(mapping.dimension);
                }
              });
            }
          });
        }
      });
    }

    return normalized;
  };
  /**
   * @function
   * @description Transform mappings with sub_headers into groups.
   * Columns that have sub_headers in the BE response are treated as groups,
   * where the parent column becomes the group entry and sub_headers become its mappings.
   * Columns without sub_headers remain as independent mappings.
   */
  const transformSubHeadersToGroups = (tableConfig) => {
    if (!tableConfig || !tableConfig.mappings) return tableConfig;

    const transformed = cloneDeep(tableConfig);
    const independentMappings = [];
    const groupsFromSubHeaders = [];

    transformed.mappings.forEach((mapping) => {
      if (mapping.sub_headers && mapping.sub_headers.length > 0) {
        groupsFromSubHeaders.push({
          column_name: mapping.column_name,
          label: mapping.label,
          dimension: mapping.dimension,
          order_of_display: mapping.order_of_display,
          mappings: mapping.sub_headers,
        });
      } else {
        independentMappings.push(mapping);
      }
    });

    transformed.mappings = independentMappings;
    transformed.groups = [
      ...(transformed.groups || []),
      ...groupsFromSubHeaders,
    ];

    return transformed;
  };

  /**
   * @function
   * @description Fetch Tabs and Table data configuration
   */
  const fetchConfiguratorData = async () => {
    if (
      !isEmpty(filterConfigProps) &&
      !filterConfigProps.config_id &&
      filterConfigProps.config_type !== "tableConfig"
    ) {
      return;
    }
    setLoading(true);
    try {
      // Use mock data for now, or uncomment API call for production
      // const rawData = TABLE_CONFIGS;
      const rawData = await getTableConfiguration(
        Number(filterConfigProps.config_id)
      );
      
      if (!rawData) {
        throw new Error("No data available");
      }
      
      // Normalize all dimensions in the response before processing
      const data = normalizeDimensionsInResponse(rawData);
      
      // Filter tables based on shownTables only when used as dependent component
      let tablesToShow = data?.data?.data?.table_config?.tables || [];
      if (isDependentComponent && shownTables && shownTables.length > 0) {
        tablesToShow = tablesToShow.filter((table) => 
          shownTables.includes(table.name)
        );
      }
      
      const tabData = tablesToShow.map(
        (tabObject, index) => {
          if (index === 0) {
            setActiveTab(tabObject.tc_code);
          }
          const savedTableConfiguration = data?.data?.data?.table_group.tables.filter(
            (savedConfig) => savedConfig.tc_code === tabObject.tc_code
          );
          // Transform mappings with sub_headers into groups
          const processedConfig = savedTableConfiguration[0]
            ? transformSubHeadersToGroups(savedTableConfiguration[0])
            : {};
          return {
            label: startCase(tabObject.name.replaceAll("_", " ")),
            value: tabObject.tc_code,
            element: (
              <TableConfigurationForm
                tcCode={tabObject.tc_code}
                tName={tabObject.name}
                allMappings={tabObject.mappings}
                dimensions={tabObject.dimensions}
                savedTableConfiguration={processedConfig}
                hideNameField={true}
                columnConfigurationLabel={title}
                getValidationFunc={(validator) => {
                  setSaveTableCallbacks((prevCallbacks) => ({
                    ...prevCallbacks,
                    [tabObject.name]: validator,
                  }));
                }}
              />
            ),
          };
        }
      );
      setTabs(tabData);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      displaySnackMessages("Error fetching Table Configuration", "error");
    }
  };

  // Transform tabs data for impact-ui-v3 Tabs component
  const tabNames = tabs?.map((tab) => ({
    label: tab.label,
    value: tab.value,
  })) || [];

  const tabPanels = tabs?.map((tab) => tab.element) || [];

  const handleTabChange = (event, newValue) => {
    // The onChange handler from impact-ui-v3 receives (event, value)
    // newValue is the tab value (tc_code in this case)
    if (newValue) {
      setActiveTab(newValue);
    }
  };

  // Render content based on whether it's used as dependent component
  const renderContent = () => {
    if (!Boolean(tabs?.length > 0)) {
      return null;
    }

    if (tabs.length === 1) {
      // If there's only one tab, render the form directly without tabs
      return tabs[0].element;
    }

    // If there are multiple tabs, render the Tabs component
    return (
      <Tabs
        tabNames={tabNames}
        tabPanels={tabPanels}
        value={activeTab}
        onChange={handleTabChange}
        remountOnTabChange={false}
      />
    );
  };

  // Early return if we don't have valid filterConfigProps
  // This prevents rendering when the component is mounted but shouldn't be visible
  // Only render if:
  // 1. isDependentComponent is true (will be set by DependentComponent with proper config)
  // 2. OR filterConfigProps has config_type === "tableConfig" (for standalone usage - must match)
  if (!isDependentComponent) {
    // For standalone usage, we MUST have config_type === "tableConfig"
    // Having just config_id is not enough - it could be from any configuration type
    if (
      isEmpty(filterConfigProps) ||
      filterConfigProps.config_type !== "tableConfig"
    ) {
      // Don't render if we don't have the correct config_type for standalone usage
      return null;
    }
  }
  // If isDependentComponent is true, let it render (DependentComponent will handle the conditional rendering)

  // Customize rendering based on isDependentComponent state
  if (isDependentComponent) {
    // Custom rendering for dependent component usage with configurable loader text
    return (
      <LoadingOverlay 
        loader={loading} 
        text={loaderText}
        minHeight="400px"
        size="medium"
      >
        {renderContent()}
      </LoadingOverlay>
    );
  }

  // Default rendering when not used as dependent component
  return (
    <LoadingOverlay 
      loader={loading} 
      text={loaderText}
      minHeight="400px"
      size="medium"
    >
      {renderContent()}
    </LoadingOverlay>
  );
};

TableConfigurator.defaultProps = {
  filterConfigProps: {},
  isDependentComponent: false,
  loaderText: "Loading Table Configurations",
  title: "Column configuration",
  shownTables: [],
};

TableConfigurator.propTypes = {
  filterConfigProps: PropTypes.object,
  setUpCallbacks: PropTypes.func,
  isDependentComponent: PropTypes.bool,
  loaderText: PropTypes.string,
  title: PropTypes.string,
  shownTables: PropTypes.arrayOf(PropTypes.string),
};

const mapStateToProps = (state) => {
  return {};
};

const mapActionToProps = {
  getTableConfiguration,
  saveTableFormConfiguration,
  addSnack,
};

export default connect(mapStateToProps, mapActionToProps)(TableConfigurator);
