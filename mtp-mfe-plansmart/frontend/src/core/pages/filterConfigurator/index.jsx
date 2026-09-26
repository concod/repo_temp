import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { capitalize, isEmpty } from "lodash";
import { Tabs } from "impact-ui";
import { getFilterConfiguration, saveFilterConfig } from "core/actions/filterAction";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { addSnack } from "core/actions/snackbarActions";
import ConfigurationTable from "./configurationTable";

const FilterConfigurator = (props) => {
  const { filterConfigProps, setUpCallbacks } = { ...props };
  const [tabs, setTabs] = useState([]);
  const [fcCode, setFcCode] = useState(null);
  const [activeTab, setActiveTab] = useState();
  const [saveFilterCallbacks, setSaveFilterCallbacks] = useState(null);
  const [tableConfiguration, setTableConfiguration] = useState([]);

  useEffect(() => {
    return () => {
      setSaveFilterCallbacks(null);
      setFcCode(null);
    };
  }, []);

  useEffect(() => {
    fetchConfiguratorData();
  }, [props.filterConfigProps]);

  /**
   * @function
   * @description Handle first load and setup table and  callbacks to parent to ensure smooth transition
   */
  useEffect(() => {
    if (setUpCallbacks) {
      setUpCallbacks({ nextNavFunc: saveFilterConfigurationChanges });
    }
  }, [saveFilterCallbacks]);

  /**
   * @function
   * @description Prepare the filter payload from given table data
   * @param {Object} tableData
   * @returns {Object} Structure payload data returned as required
   */
  const prepareFilterConfPayload = (tableData) => {
    const accessorList = tableConfiguration.map((config) => config.column_name);
    const payload = tableData.map((data) => {
      const rowObject = {};
      accessorList.forEach((col) => {
        rowObject[col] = data[col];
      });
      return rowObject;
    });
    return payload;
  };

  /**
   * @function
   * @description Validate and update filter values configured in the table to save it DB
   * If validation fails show user validation error and return validation status to parent
   */
  const saveFilterConfigurationChanges = async () => {
    if (saveFilterCallbacks) {
      try {
        const data = await Object.keys(saveFilterCallbacks).map(async (key) => {
          const tabData = await saveFilterCallbacks[key]();
          return { data: tabData.data, isValid: tabData.isValid };
        });
        Promise.all(data).then(async (resp) => {
          let isValid = true;
          let data = [];
          resp.forEach((dimensionData) => {
            isValid = isValid && dimensionData.isValid;
            data = [...data, ...dimensionData.data];
          });
          if (!isValid) {
            return isValid;
          }
          const payload = prepareFilterConfPayload(data);
          await props.saveFilterConfig(Number(fcCode), {
            elements: payload,
          });
          props.addSnack({
            message: "Configuration saved successfully",
            options: {
              variant: "success",
            },
          });
          return true;
        });
      } catch (error) {
        props.addSnack({
          message: "Failed to add Configuration",
          options: {
            variant: "error",
          },
        });
      }
    } else {
      return false;
    }
  };

  /**
   * @function
   * @description Fetch Tabs and Table data configuration
   */
  const fetchConfiguratorData = async () => {
    if (
      !isEmpty(filterConfigProps) &&
      !filterConfigProps.config_id &&
      filterConfigProps.config_type !== "filterConfig"
    ) {
      return;
    }
    try {
      const data = await getFilterConfiguration(
        Number(filterConfigProps.config_id)
      );
      let tableColumnConfig = await props.getColumnsAg(
        "table_name=filter_config_create_update_table"
      );
      setTableConfiguration(tableColumnConfig);
      const tabData = data?.data?.data?.dimensions.map(
        (dimensionObject, index) => {
          const tabDimension = Object.keys(dimensionObject)[0];
          const subDimensions =
            dimensionObject[tabDimension][0]?.sub_dimension || [];
          const filterOptions = data?.data?.data?.dimension_filter_mapping.filters.filter(
            (filterOption) =>
              filterOption.dimension === tabDimension &&
              filterOption.label != ""
          );
          const savedFilters = data?.data?.data?.saved_filters?.mappings?.filter(
            (filterOption) =>
              filterOption.dimension === tabDimension &&
              !filterOption.is_deleted
          );
          setFcCode(data?.data?.data?.saved_filters?.fc_code);
          if (index === 0) {
            setActiveTab(tabDimension);
          }

          return {
            label: capitalize(tabDimension),
            value: tabDimension,
            element: (
              <ConfigurationTable
                dimension={tabDimension}
                subDimension={subDimensions}
                filterOptions={filterOptions}
                savedFilters={savedFilters}
                tableColumnConfig={tableColumnConfig}
                getValidationFunc={(validator) => {
                  setSaveFilterCallbacks((prevCallbacks) => ({
                    ...prevCallbacks,
                    [tabDimension]: validator,
                  }));
                }}
              />
            ),
          };
        }
      );
      setTabs(tabData);
    } catch (error) {
      props.addSnack({
        message: "Error fetching Filter Configuration",
        options: {
          variant: "error",
        },
      });
    }
  };

  return (
    <>
      {Boolean(tabs.length) && (
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={(tabVal) => setActiveTab(tabVal)}
        />
      )}
    </>
  );
};

FilterConfigurator.defaultProps = {
  filterConfigProps: {},
};

FilterConfigurator.propTypes = {
  filterConfigProps: PropTypes.object,
  setUpCallbacks: PropTypes.func,
};

const mapStateToProps = (state) => {
  return {};
};

const mapActionToProps = {
  getFilterConfiguration,
  saveFilterConfig,
  getColumnsAg,
  addSnack,
};

export default connect(mapStateToProps, mapActionToProps)(FilterConfigurator);
