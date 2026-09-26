import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";
import TableConfigurationForm from "./tableConfigurationForm";
import { Tabs } from "impact-ui";
import { startCase, isEmpty } from "lodash";
import { getTableConfiguration } from "core/actions/tableConfiguratorActions";
import { saveTableFormConfiguration } from "core/actions/tableConfiguratorActions";

const TableConfigurator = (props) => {
  const { filterConfigProps, setUpCallbacks } = { ...props };
  const [tabs, setTabs] = useState([]);
  const [activeTab, setActiveTab] = useState();
  const [saveTableCallbacks, setSaveTableCallbacks] = useState(null);

  useEffect(() => {
    return () => {
      setSaveTableCallbacks(null);
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
      setUpCallbacks({ nextNavFunc: saveTableConfigurationChanges });
    }
  }, [saveTableCallbacks]);

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
  const saveTableConfigurationChanges = async () => {
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
              "Table configuration to saved successfully",
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
    try {
      const data = await getTableConfiguration(
        Number(filterConfigProps.config_id)
      );
      const tabData = data?.data?.data?.table_config?.tables.map(
        (tabObject, index) => {
          if (index === 0) {
            setActiveTab(tabObject.tc_code);
          }
          const savedTableConfiguration = data?.data?.data?.table_group.tables.filter(
            (savedConfig) => savedConfig.tc_code === tabObject.tc_code
          );
          return {
            label: startCase(tabObject.name.replaceAll("_", " ")),
            value: tabObject.tc_code,
            element: (
              <TableConfigurationForm
                tcCode={tabObject.tc_code}
                tName={tabObject.name}
                allMappings={tabObject.mappings}
                dimensions={tabObject.dimensions}
                savedTableConfiguration={savedTableConfiguration[0] || []}
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
    } catch (error) {
      displaySnackMessages("Error fetching Table Configuration", "error");
    }
  };

  return (
    <>
      {Boolean(tabs?.length) && (
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={(tabVal) => setActiveTab(tabVal)}
        />
      )}
    </>
  );
};

TableConfigurator.defaultProps = {
  filterConfigProps: {},
};

TableConfigurator.propTypes = {
  filterConfigProps: PropTypes.object,
  setUpCallbacks: PropTypes.func,
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
