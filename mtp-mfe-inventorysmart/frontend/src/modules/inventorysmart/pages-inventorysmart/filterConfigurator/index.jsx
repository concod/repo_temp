import { useEffect, useState, useCallback } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { capitalize, isEmpty } from "lodash";
import { Tabs } from "impact-ui-v3";
import {
  getFilterConfiguration,
  saveFilterConfig,
} from "core/actions/filterAction";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { addSnack } from "core/actions/snackbarActions";
import ConfigurationTable from "./configurationTable";
import { GLOBAL_ATTRIBUTE_LEVELS_MAPPING } from "./filterConfigurator-constants";
import LoadingOverlay from "core/Utils/Loader/loader";

/**
 * Wrapper component to render dimension tabs for a filter within a top-level filter tab
 */
const FilterDimensionTabsWrapper = ({ dimensionTabs }) => {
  const [activeDimensionTab, setActiveDimensionTab] = useState(
    dimensionTabs?.[0]?.value
  );

  useEffect(() => {
    if (dimensionTabs?.[0]?.value && !activeDimensionTab) {
      setActiveDimensionTab(dimensionTabs[0].value);
    }
  }, [dimensionTabs]);

  if (!dimensionTabs?.length) return null;
  if (dimensionTabs.length === 1) return dimensionTabs[0].element;

  const tabNames = dimensionTabs.map((tab) => ({
    label: tab.label,
    value: tab.value,
  }));
  const tabPanels = dimensionTabs.map((tab) => tab.element);

  return (
    <Tabs
      tabNames={tabNames}
      tabPanels={tabPanels}
      value={activeDimensionTab || tabNames[0]?.value}
      onChange={(_, newValue) => setActiveDimensionTab(newValue)}
      remountOnTabChange={false}
    />
  );
};

/**
 * Normalizes API response to always return an array of filter configs.
 * Supports both: data.data as object (single filter) or array (multiple filters)
 */
const normalizeToFilterArray = (rawData) => {
  const data = rawData?.data?.data;
  if (!data) return [];
  return Array.isArray(data) ? data : [data];
};

const FilterConfigurator = (props) => {
  const { filterConfigProps, setUpCallbacks } = { ...props };
  const [filterTabs, setFilterTabs] = useState([]);
  const [activeFilterTab, setActiveFilterTab] = useState();
  const [saveFilterCallbacks, setSaveFilterCallbacks] = useState({});
  const [tableConfiguration, setTableConfiguration] = useState([]);
  const [globalSavedFiltersByFilter, setGlobalSavedFiltersByFilter] = useState(
    {}
  );
  const [fcCodeByFilter, setFcCodeByFilter] = useState({});
  const [fetchedFilters, setFetchedFilters] = useState([]);
  const [loading, setLoading] = useState(false);
  const isGlobalAttributeLevel = GLOBAL_ATTRIBUTE_LEVELS_MAPPING.includes(
    (filterConfigProps?.title || "").trim()
  );

  useEffect(() => {
    return () => {
      setSaveFilterCallbacks({});
      setFcCodeByFilter({});
    };
  }, []);

  useEffect(() => {
    fetchConfiguratorData();
  }, [props.filterConfigProps]);

  /**
   * @function
   * @description Updates the Filter Tabs data when fetched from the API or any value is updated.
   */
  useEffect(() => {
    if (fetchedFilters.length > 0 && tableConfiguration.length > 0) {
      const updatedFilterTabs = configureFilterTabData();
      setFilterTabs(updatedFilterTabs);

      if (!activeFilterTab && updatedFilterTabs.length > 0) {
        setActiveFilterTab(updatedFilterTabs[0].value);
      }
    }
  }, [fetchedFilters, tableConfiguration, globalSavedFiltersByFilter]);

  useEffect(() => {
    if (setUpCallbacks) {
      setUpCallbacks({ nextNavFunc: saveFilterConfigurationChanges });
    }
  }, [saveFilterCallbacks]);

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const prepareFilterConfPayload = (tableData) => {
    const accessorList = tableConfiguration.map((config) => config.column_name);
    return tableData.map((data) => {
      const rowObject = {};
      accessorList.forEach((col) => {
        rowObject[col] = data[col];
      });
      return rowObject;
    });
  };

  const handleAddNewRow = useCallback((filterKey, updatedRows, newRow) => {
    setGlobalSavedFiltersByFilter((prev) => ({
      ...prev,
      [filterKey]: [...updatedRows, newRow],
    }));
  }, []);

  const handleDeleteRows = useCallback((filterKey, rowsToDelete) => {
    setGlobalSavedFiltersByFilter((prev) => {
      const currentFilters = prev[filterKey] || [];
      const updated = currentFilters
        .filter(
          (row) =>
            !rowsToDelete.some(
              (delRow) => delRow.display_order === row.display_order
            )
        )
        .map((updatedFil, index) => ({
          ...updatedFil,
          display_order: index + 1,
        }));
      return { ...prev, [filterKey]: updated };
    });
  }, []);

  const handleDisplayOrderChange = useCallback(
    (filterKey, initialValue, value) => {
      if (initialValue === value) return;
      const min = Math.min(initialValue, value);
      const max = Math.max(initialValue, value);

      setGlobalSavedFiltersByFilter((prev) => {
        const currentFilters = prev[filterKey] || [];
        const updated = currentFilters.map((row) => {
          if (row.display_order === initialValue)
            return { ...row, display_order: value };
          if (
            value > initialValue &&
            row.display_order > min &&
            row.display_order <= max
          ) {
            return { ...row, display_order: row.display_order - 1 };
          }
          if (
            value < initialValue &&
            row.display_order >= min &&
            row.display_order < max
          ) {
            return { ...row, display_order: row.display_order + 1 };
          }
          return row;
        });
        return { ...prev, [filterKey]: updated };
      });
    },
    []
  );

  /**
   * @function
   * @description Generates dimension tabs for a single filter (same as original configureTabData)
   */
  const configureDimensionTabs = (filterData, filterKey) => {
    const globalSavedFilters =
      globalSavedFiltersByFilter[filterKey] || [];
    const fcCode = filterData?.saved_filters?.fc_code;

    setFcCodeByFilter((prev) => ({ ...prev, [filterKey]: fcCode }));

    return (filterData?.dimensions || []).map((dimensionObject) => {
      const tabDimension = Object.keys(dimensionObject)[0];
      const subDimensions =
        dimensionObject[tabDimension][0]?.sub_dimension || [];
      const filterOptions = (
        filterData?.dimension_filter_mapping?.filters || []
      ).filter(
        (filterOption) =>
          filterOption.dimension === tabDimension && filterOption.label !== ""
      );
      const savedFilters = globalSavedFilters.filter(
        (filterOption) =>
          filterOption.dimension === tabDimension && !filterOption.is_deleted
      );

      const callbackKey = `${filterKey}__${tabDimension}`;

      return {
        label: capitalize(tabDimension),
        value: callbackKey,
        element: (
          <ConfigurationTable
            key={callbackKey}
            dimension={tabDimension}
            subDimension={subDimensions}
            filterOptions={filterOptions}
            savedFilters={savedFilters}
            tableColumnConfig={tableConfiguration}
            globalSavedFilters={
              isGlobalAttributeLevel ? globalSavedFilters : []
            }
            handleAddNewRow={(updatedRows, newRow) =>
              handleAddNewRow(filterKey, updatedRows, newRow)
            }
            handleDeleteRows={(rowsToDelete) =>
              handleDeleteRows(filterKey, rowsToDelete)
            }
            handleDisplayOrderChange={(initialValue, value) =>
              handleDisplayOrderChange(filterKey, initialValue, value)
            }
            getValidationFunc={(validator) => {
              setSaveFilterCallbacks((prevCallbacks) => ({
                ...prevCallbacks,
                [callbackKey]: validator,
              }));
            }}
          />
        ),
      };
    });
  };

  /**
   * @function
   * @description Generates top-level filter tabs. Each filter tab contains dimension tabs.
   */
  const configureFilterTabData = () => {
    return fetchedFilters.map((filterData, index) => {
      const filterKey =
        filterData?.saved_filters?.name || `filter_${index}`;
      const dimensionTabs = configureDimensionTabs(filterData, filterKey);

      return {
        label: filterData?.saved_filters?.name || `Filter ${index + 1}`,
        value: filterKey,
        element: (
          <FilterDimensionTabsWrapper
            key={filterKey}
            dimensionTabs={dimensionTabs}
          />
        ),
      };
    });
  };

  const saveFilterConfigurationChanges = async () => {
    const callbackKeys = Object.keys(saveFilterCallbacks);
    if (callbackKeys.length === 0) return false;

    try {
      const results = await Promise.all(
        callbackKeys.map(async (key) => {
          const tabData = await saveFilterCallbacks[key]();
          const filterKey = key.split("__")[0];
          return {
            filterKey,
            data: tabData.data,
            isValid: tabData.isValid,
            is_tool_edited: tabData.is_tool_edited || false,
          };
        })
      );

      const isValid = results.every((r) => r.isValid);
      if (!isValid) return false;

      const dataByFilter = {};
      results.forEach(({ filterKey, data, is_tool_edited }) => {
        if (!dataByFilter[filterKey]) {
          dataByFilter[filterKey] = { data: [], anyTabEdited: false };
        }
        dataByFilter[filterKey].data = [
          ...dataByFilter[filterKey].data,
          ...data,
        ];
        dataByFilter[filterKey].anyTabEdited =
          dataByFilter[filterKey].anyTabEdited || is_tool_edited;
      });

      for (const filterKey of Object.keys(dataByFilter)) {
        const fcCode = fcCodeByFilter[filterKey];
        if (fcCode != null) {
          const payload = prepareFilterConfPayload(dataByFilter[filterKey].data);
          await props.saveFilterConfig(Number(fcCode), {
            elements: payload,
            is_tool_edited: dataByFilter[filterKey].anyTabEdited,
          });
        }
      }

      displaySnackMessages("Configuration saved successfully", "success");
      return true;
    } catch (error) {
      displaySnackMessages("Failed to add Configuration", "error");
      return false;
    }
  };

  const fetchConfiguratorData = async () => {
    if (
      !isEmpty(filterConfigProps) &&
      !filterConfigProps.config_id &&
      filterConfigProps.config_type !== "filterConfig"
    ) {
      return;
    }
    setLoading(true);
    try {
      // Use mock data for development, or API for production
      // const data = FILTER_DATA;
      const data = await getFilterConfiguration(
        Number(filterConfigProps.config_id)
      );
      const tableColumnConfig = await props.getColumnsAg(
        "table_name=filter_config_create_update_table"
      );
      setTableConfiguration(tableColumnConfig);

      const filtersArray = normalizeToFilterArray(data);
      setFetchedFilters(filtersArray);

      const initialSavedFilters = {};
      filtersArray.forEach((filterData, index) => {
        const filterKey =
          filterData?.saved_filters?.name || `filter_${index}`;
        const uniqueKeys = new Set(
          filterData?.dimensions?.flatMap((item) => Object.keys(item)) || []
        );
        const mappings =
          filterData?.saved_filters?.mappings?.filter(
            (filterOption) =>
              uniqueKeys.has(filterOption.dimension) && !filterOption.is_deleted
          ) || [];
        initialSavedFilters[filterKey] = mappings;
      });
      setGlobalSavedFiltersByFilter(initialSavedFilters);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      props.addSnack({
        message: "Error fetching Filter Configuration",
        options: {
          variant: "error",
        },
      });
    }
  };

  const filterTabNames = filterTabs?.map((tab) => ({
    label: tab.label,
    value: tab.value,
  })) || [];
  const filterTabPanels = filterTabs?.map((tab) => tab.element) || [];

  const handleFilterTabChange = (event, newValue) => {
    if (newValue) {
      setActiveFilterTab(newValue);
    }
  };

  const renderContent = () => {
    if (!filterTabs?.length) return null;
    if (filterTabs.length === 1) return filterTabs[0].element;

    return (
      <Tabs
        tabNames={filterTabNames}
        tabPanels={filterTabPanels}
        value={activeFilterTab}
        onChange={handleFilterTabChange}
        remountOnTabChange={false}
      />
    );
  };

  return (
    <LoadingOverlay
      loader={loading}
      text="Loading Filter Configurations"
      minHeight="400px"
      size="medium"
    >
      {renderContent()}
    </LoadingOverlay>
  );
};

FilterConfigurator.defaultProps = {
  filterConfigProps: {},
};

FilterConfigurator.propTypes = {
  filterConfigProps: PropTypes.object,
  setUpCallbacks: PropTypes.func,
};

const mapStateToProps = (state) => ({});

const mapActionToProps = {
  getFilterConfiguration,
  saveFilterConfig,
  getColumnsAg,
  addSnack,
};

export default connect(mapStateToProps, mapActionToProps)(FilterConfigurator);
